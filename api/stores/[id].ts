import type { VercelRequest, VercelResponse } from '@vercel/node';
import { STORES } from '../_catalog';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const store = STORES.find(s => s.id === req.query.id);
  if (!store) { res.status(404).json({ error: 'Store not found' }); return; }
  res.json(store);
}
