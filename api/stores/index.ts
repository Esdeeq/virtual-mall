import type { VercelRequest, VercelResponse } from '@vercel/node';
import { STORES } from '../_catalog';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json(STORES.map(s => ({
    id: s.id, name: s.name, tagline: s.tagline, category: s.category,
    rating: s.rating, productCount: s.products.length,
    address: s.address, pickupHours: s.pickupHours,
  })));
}
