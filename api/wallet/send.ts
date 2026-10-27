import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initiateUserControlledWalletsClient } from '@circle-fin/user-controlled-wallets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  try {
    const { userToken, walletId, destinationAddress, amount } = req.body as {
      userToken: string; walletId: string; destinationAddress: string; amount: string;
    };
    if (!userToken || !walletId || !destinationAddress || !amount) {
      res.status(400).json({ ok: false, error: 'userToken, walletId, destinationAddress, amount required' }); return;
    }
    const client = initiateUserControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY ?? '' });
    const balResp = await client.getWalletTokenBalance({ walletId, userToken });
    const tokenBalances = balResp.data?.tokenBalances ?? [];
    const nativeUsdc = tokenBalances.find((t: { token?: { symbol?: string; id?: string; isNative?: boolean } }) =>
      t.token?.symbol === 'USDC' && t.token?.isNative === true
    );
    const erc20Usdc = tokenBalances.find((t: { token?: { symbol?: string; id?: string; isNative?: boolean } }) =>
      t.token?.symbol === 'USDC' && t.token?.isNative === false
    );
    const tokenId = (nativeUsdc ?? erc20Usdc)?.token?.id as string | undefined;
    if (!tokenId) { res.status(400).json({ ok: false, error: 'USDC token not found in wallet. Fund the wallet first.' }); return; }
    const resp = await client.createTransaction({
      userToken, walletId, amounts: [amount], destinationAddress, tokenId,
      fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
    });
    const challengeId = (resp.data as unknown as Record<string, string | null | undefined>)?.challengeId
      ?? (resp.data?.transaction as unknown as Record<string, string | null | undefined> | null | undefined)?.id
      ?? null;
    const txHash = (resp.data?.transaction as unknown as Record<string, string | null | undefined> | null | undefined)?.txHash ?? null;
    res.json({ ok: true, challengeId, txHash });
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
