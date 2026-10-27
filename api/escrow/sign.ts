import type { VercelRequest, VercelResponse } from '@vercel/node';
import { keccak256, encodePacked, toHex, encodeAbiParameters, parseAbiParameters } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  try {
    const rawKey = process.env.AGENT_PRIVATE_KEY ?? '';
    if (!rawKey) { res.status(503).json({ ok: false, error: 'AGENT_PRIVATE_KEY not set' }); return; }
    const escrowAddr = process.env.VITE_ESCROW_ADDRESS ?? '';
    if (!escrowAddr) { res.status(503).json({ ok: false, error: 'VITE_ESCROW_ADDRESS not set' }); return; }

    const key = rawKey.startsWith('0x') ? rawKey as `0x${string}` : `0x${rawKey}` as `0x${string}`;
    const account = privateKeyToAccount(key);

    const { orderId, buyer, amount } = req.body as { orderId: string; buyer: string; amount: string };
    if (!orderId || !buyer || !amount) { res.status(400).json({ ok: false, error: 'orderId, buyer, amount required' }); return; }

    const IS_MAINNET = process.env.VITE_ARC_MAINNET === 'true';
    const CHAIN_ID = BigInt(IS_MAINNET ? 5042 : 5042002);
    const ESCROW_ADDRESS = escrowAddr as `0x${string}`;

    const enc = (s: string) => toHex(new TextEncoder().encode(s));
    const DOMAIN_TYPEHASH = keccak256(enc('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'));
    const ORDER_AUTH_TYPEHASH = keccak256(enc('OrderAuth(bytes32 orderId,address buyer,uint256 amount)'));

    const domainSeparator = keccak256(encodeAbiParameters(
      parseAbiParameters('bytes32,bytes32,bytes32,uint256,address'),
      [DOMAIN_TYPEHASH, keccak256(enc('MallEscrow')), keccak256(enc('1')), CHAIN_ID, ESCROW_ADDRESS]
    ));
    const structHash = keccak256(encodeAbiParameters(
      parseAbiParameters('bytes32,bytes32,address,uint256'),
      [ORDER_AUTH_TYPEHASH, orderId as `0x${string}`, buyer as `0x${string}`, BigInt(amount)]
    ));
    const digest = keccak256(encodePacked(['string', 'bytes32', 'bytes32'], ['\x19\x01', domainSeparator, structHash]));
    const signature = await account.sign({ hash: digest });
    res.json({ ok: true, signature });
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
