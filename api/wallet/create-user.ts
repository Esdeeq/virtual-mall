import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initiateUserControlledWalletsClient } from '@circle-fin/user-controlled-wallets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  try {
    const { userId } = req.body as { userId: string };
    if (!userId || userId.length < 5) { res.status(400).json({ ok: false, error: 'userId must be ≥ 5 chars' }); return; }
    const client = initiateUserControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY ?? '' });
    await client.createUser({ userId });
    res.json({ ok: true });
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code === 155101) { res.json({ ok: true, alreadyExists: true }); return; }
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err), code });
  }
}
