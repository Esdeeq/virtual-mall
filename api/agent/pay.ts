import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createWalletClient, createPublicClient, http, erc20Abi, parseUnits } from 'viem';
import type { Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { requireChain, getUsdc } from '../../src/onchain-facts';

const IS_MAINNET = process.env.VITE_ARC_MAINNET === 'true';
const CHAIN_ID = IS_MAINNET ? 5042 : 5042002;

function getRpcUrl(): string {
  const base = process.env.RPC_PROXY_BASE_URL;
  const token = process.env.RPC_PROXY_TOKEN;
  const chains = process.env.RPC_PROXY_CHAINS ?? '';
  if (base && token && chains.includes(String(CHAIN_ID))) {
    return `${base}/api/rpc/${CHAIN_ID}?_rpc_token=${token}`;
  }
  return requireChain(CHAIN_ID).rpcUrls[0];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  try {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ ok: false, error: 'amount must be a positive number (USDC)' }); return;
    }
    const rawKey = process.env.AGENT_PRIVATE_KEY ?? '';
    if (!rawKey) { res.status(503).json({ ok: false, error: 'AGENT_PRIVATE_KEY not set' }); return; }
    const seller = process.env.SELLER_ADDRESS ?? process.env.VITE_MERCHANT_ADDRESS ?? '';
    if (!seller) { res.status(503).json({ ok: false, error: 'SELLER_ADDRESS not set' }); return; }

    const key = rawKey.startsWith('0x') ? rawKey as `0x${string}` : `0x${rawKey}` as `0x${string}`;
    const account = privateKeyToAccount(key);
    const chainMeta = requireChain(CHAIN_ID);
    const usdcFact = getUsdc(CHAIN_ID);
    if (!usdcFact) { res.status(500).json({ ok: false, error: 'USDC not found for chain' }); return; }

    const rpcUrl = getRpcUrl();
    const chain: Chain = chainMeta as unknown as Chain;
    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
    const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

    const rawBal = await publicClient.readContract({
      address: usdcFact.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    });
    const amountRaw = parseUnits(String(amount), usdcFact.decimals);
    if (rawBal < amountRaw) {
      res.status(402).json({ ok: false, error: `Insufficient agent wallet balance (${(Number(rawBal) / 10 ** usdcFact.decimals).toFixed(2)} USDC)` }); return;
    }

    const hash = await walletClient.writeContract({
      address: usdcFact.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [seller as `0x${string}`, amountRaw],
      chain,
    });
    res.json({ ok: true, txHash: hash });
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
