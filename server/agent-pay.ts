/**
 * Agent Pay — viem-based silent USDC payments from a server-side EOA wallet.
 *
 * The agent wallet is a regular EOA. Its private key lives in .env as
 * AGENT_PRIVATE_KEY (64-char hex, with or without 0x prefix).
 *
 * On first run with no key set, one is generated in-memory and printed to
 * the console — copy it into .env, restart the server, and fund the
 * printed address with USDC on Arc Testnet.
 *
 * Required .env values (already provisioned):
 *   RPC_PROXY_BASE_URL, RPC_PROXY_TOKEN, RPC_PROXY_CHAINS — provisioned by Arc Studio
 *   VITE_MERCHANT_ADDRESS — merchant wallet (set earlier this session)
 *
 * Optional .env value:
 *   AGENT_PRIVATE_KEY — 64-char hex; auto-generated on first run if absent
 */

import {
  createWalletClient, createPublicClient, http,
  parseUnits, encodeFunctionData, formatUnits,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getUsdc, requireChain } from '../src/onchain-facts';

const ARC_CHAIN_ID = 5042002;

// Minimal ERC-20 ABI for transfer + balanceOf
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/** Build the RPC URL for Arc Testnet via the provisioned proxy. */
function buildRpcUrl(): string {
  const base = process.env.RPC_PROXY_BASE_URL;
  const token = process.env.RPC_PROXY_TOKEN;
  const covered = (process.env.RPC_PROXY_CHAINS ?? '').split(',').map(s => s.trim());

  if (base && token && covered.includes(String(ARC_CHAIN_ID))) {
    return `${base}/api/rpc/${ARC_CHAIN_ID}?_rpc_token=${token}`;
  }

  // Fall back to the public Arc Testnet RPC
  const chainMeta = requireChain(ARC_CHAIN_ID);
  // rpcUrls may be { default: { http: string[] } } or a plain string[]
  const rpcUrls = chainMeta.rpcUrls as unknown;
  if (Array.isArray(rpcUrls) && rpcUrls.length > 0) return rpcUrls[0] as string;
  const nested = (rpcUrls as { default?: { http?: string[] } })?.default?.http;
  if (nested && nested.length > 0) return nested[0];
  throw new Error(`No RPC URL available for chain ${ARC_CHAIN_ID}`);
}

function getMerchantAddress(): `0x${string}` {
  const addr = process.env.VITE_MERCHANT_ADDRESS;
  if (!addr) throw new Error('VITE_MERCHANT_ADDRESS is not set in .env');
  return addr as `0x${string}`;
}

function getPrivateKey(): `0x${string}` {
  let key = process.env.AGENT_PRIVATE_KEY ?? '';
  if (!key.startsWith('0x')) key = `0x${key}`;

  if (key.length < 66) {
    // Auto-generate an in-memory key and instruct the user to persist it
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    key = `0x${hex}`;
    console.warn('\n====================================================');
    console.warn('AGENT_PRIVATE_KEY not set — generated in-memory only:');
    console.warn(`  AGENT_PRIVATE_KEY=${hex}`);
    console.warn('Add this line to .env and restart the server to persist.');
    console.warn('Then fund the agent wallet address (shown on /api/agent/wallet)');
    console.warn('with USDC on Arc Testnet so the agent can pay autonomously.');
    console.warn('====================================================\n');
  }

  return key as `0x${string}`;
}

function buildClients() {
  const rpcUrl = buildRpcUrl();
  const chainMeta = requireChain(ARC_CHAIN_ID);

  // viem chain object built from registry — no literals
  const chain = {
    id: chainMeta.id,
    name: chainMeta.name,
    nativeCurrency: chainMeta.nativeCurrency,
    rpcUrls: { default: { http: [rpcUrl] } },
  } as const;

  const account = privateKeyToAccount(getPrivateKey());

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  return { account, walletClient, publicClient };
}

export async function getAgentWalletInfo(): Promise<{
  address: string; usdcBalance: string; chain: string;
}> {
  const { account, publicClient } = buildClients();
  const usdc = getUsdc(ARC_CHAIN_ID);
  if (!usdc) throw new Error('USDC config not found for Arc Testnet');

  let usdcBalance = '0';
  try {
    const raw = await publicClient.readContract({
      address: usdc.address as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });
    usdcBalance = formatUnits(raw as bigint, usdc.decimals);
  } catch {
    // RPC unreachable — return 0 and let the caller handle it
  }

  return { address: account.address, usdcBalance, chain: 'Arc Testnet' };
}

export async function agentPay(amountUsdc: number): Promise<{
  txHash: string; walletAddress: string; amount: number;
}> {
  const { account, walletClient, publicClient } = buildClients();
  const usdc = getUsdc(ARC_CHAIN_ID);
  if (!usdc) throw new Error('USDC config not found for Arc Testnet');

  // Balance check before sending
  const rawBalance = await publicClient.readContract({
    address: usdc.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });
  const available = parseFloat(formatUnits(rawBalance as bigint, usdc.decimals));
  if (available < amountUsdc) {
    throw new Error(
      `Agent wallet balance too low: ${available.toFixed(2)} USDC available, ` +
      `${amountUsdc.toFixed(2)} USDC needed. Fund ${account.address} on Arc Testnet.`
    );
  }

  // Encode and send the ERC-20 transfer
  const amount = parseUnits(amountUsdc.toFixed(usdc.decimals), usdc.decimals);
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [getMerchantAddress(), amount],
  });

  const txHash = await walletClient.sendTransaction({
    to: usdc.address as `0x${string}`,
    data,
  });

  // Wait for on-chain confirmation
  await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });

  return { txHash, walletAddress: account.address, amount: amountUsdc };
}
