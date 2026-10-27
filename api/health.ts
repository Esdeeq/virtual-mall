import type { VercelRequest, VercelResponse } from '@vercel/node';
import { STORES } from './_catalog';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({
    status: 'ok',
    service: 'VirtualMall Agent API',
    version: '1.0.0',
    stores: STORES.length,
    products: STORES.reduce((n, s) => n + s.products.length, 0),
    pricing: { perCall: '$0.001', currency: 'USDC', protocol: 'x402 / Circle Gateway Nanopayments' },
    endpoints: [
      { method: 'GET', path: '/api/catalog', description: 'Full store + product catalog', price: '$0.001' },
      { method: 'POST', path: '/api/search', description: 'NLP product search', price: '$0.001' },
      { method: 'GET', path: '/api/stores', description: 'Store list', price: '$0.001' },
    ],
  });
}
