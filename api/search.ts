import type { VercelRequest, VercelResponse } from '@vercel/node';
import { searchCatalog } from './_catalog';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const { query = '', maxPrice, category } = req.body as { query?: string; maxPrice?: number; category?: string };
  if (!query && !category) { res.status(400).json({ error: 'Provide query or category' }); return; }
  const results = searchCatalog(query, maxPrice, category);
  res.json({ query, filters: { maxPrice, category }, count: results.length, results });
}
