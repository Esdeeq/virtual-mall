import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initiateUserControlledWalletsClient, Blockchain } from '@circle-fin/user-controlled-wallets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  try {
    const { userToken } = req.body as { userToken: string };
    if (!userToken) { res.status(400).json({ ok: false, error: 'userToken required' }); return; }
    const client = initiateUserControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY ?? '' });
    const resp = await client.createUserPinWithWallets({
      userToken,
      blockchains: [process.env.VITE_ARC_MAINNET === 'true' ? Blockchain.Arc : Blockchain.ArcTestnet],
      accountType: 'SCA',
    });
    res.json({ ok: true, challengeId: resp.data?.challengeId });
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code === 155106) { res.json({ ok: true, alreadyInitialized: true }); return; }
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err), code });
  }
}
