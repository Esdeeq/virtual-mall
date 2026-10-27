import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initiateUserControlledWalletsClient } from '@circle-fin/user-controlled-wallets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  try {
    const { userToken } = req.body as { userToken: string };
    if (!userToken) { res.status(400).json({ ok: false, error: 'userToken required' }); return; }
    const client = initiateUserControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY ?? '' });
    const resp = await client.listWallets({ userToken });
    res.json({ ok: true, wallets: resp.data?.wallets ?? [] });
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
