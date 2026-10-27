import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createPublicClient, http, erc20Abi } from 'viem';
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
  // Fall back to public endpoint read from onchain-facts registry
  const chainMeta = requireChain(CHAIN_ID);
  return chainMeta.rpcUrls[0];
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const rawKey = process.env.AGENT_PRIVATE_KEY ?? '';
    if (!rawKey) { res.status(503).json({ ok: false, error: 'AGENT_PRIVATE_KEY not set' }); return; }
    const key = rawKey.startsWith('0x') ? rawKey as `0x${string}` : `0x${rawKey}` as `0x${string}`;
    const account = privateKeyToAccount(key);

    const chainMeta = requireChain(CHAIN_ID);
    const usdcFact = getUsdc(CHAIN_ID);
    if (!usdcFact) { res.status(500).json({ ok: false, error: 'USDC not found for chain' }); return; }

    const rpcUrl = getRpcUrl();
    const chain: Chain = chainMeta as unknown as Chain;
    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
    const raw = await publicClient.readContract({
      address: usdcFact.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    });
    const balance = (Number(raw) / 1_000_000).toFixed(2);
    res.json({ ok: true, address: account.address, usdcBalance: balance });
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
