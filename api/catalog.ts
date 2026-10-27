import type { VercelRequest, VercelResponse } from '@vercel/node';
import { STORES } from './_catalog';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({
    stores: STORES,
    meta: {
      totalStores: STORES.length,
      totalProducts: STORES.reduce((n, s) => n + s.products.length, 0),
      currency: 'USDC',
      network: process.env.VITE_ARC_MAINNET === 'true' ? 'Arc Mainnet' : 'Arc Testnet',
    },
  });
}
