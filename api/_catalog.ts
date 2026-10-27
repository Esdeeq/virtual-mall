// Shared catalog data for Vercel API functions
export const STORES = [
  {
    id: 'tech-haven', name: 'Tech Haven',
    tagline: 'Cutting-edge gadgets for modern living',
    category: 'electronics', rating: 4.8, reviewCount: 1240,
    address: '42 Silicon Ave, Tech District, CA 94025',
    pickupHours: 'Mon-Sat 9AM–8PM, Sun 11AM–6PM',
    products: [
      { id: 'th-1', name: 'UltraBook Pro 15', price: 12.50, category: 'electronics', inStock: 8, tags: ['laptop','oled','pro'] },
      { id: 'th-2', name: 'PixelBuds Pro', price: 3.25, category: 'electronics', inStock: 24, tags: ['audio','wireless','anc'] },
      { id: 'th-3', name: 'SmartWatch X7', price: 5.00, category: 'electronics', inStock: 15, tags: ['wearable','health','watch'] },
      { id: 'th-4', name: 'NanoCamera 4K', price: 8.75, category: 'electronics', inStock: 6, tags: ['camera','4k','compact'] },
    ],
  },
  {
    id: 'studio-style', name: 'Studio Style',
    tagline: 'Wearable art for the bold and the brave',
    category: 'fashion', rating: 4.6, reviewCount: 873,
    address: '88 Fashion Blvd, Midtown, NY 10036',
    pickupHours: 'Mon-Fri 10AM–9PM, Sat-Sun 11AM–7PM',
    products: [
      { id: 'ss-1', name: 'Signature Bomber Jacket', price: 9.50, category: 'fashion', inStock: 5, tags: ['jacket','bomber','unisex'] },
      { id: 'ss-2', name: 'Canvas Tote Bag', price: 2.50, category: 'fashion', inStock: 40, tags: ['bag','canvas','everyday'] },
      { id: 'ss-3', name: 'Limited Streetwear Tee', price: 4.00, category: 'fashion', inStock: 12, tags: ['tshirt','streetwear','limited'] },
      { id: 'ss-4', name: 'Monochrome Sneakers', price: 7.25, category: 'fashion', inStock: 9, tags: ['sneakers','mono','kicks'] },
    ],
  },
  {
    id: 'verde-market', name: 'Verde Market',
    tagline: 'From the earth to your table',
    category: 'food', rating: 4.9, reviewCount: 2100,
    address: '12 Grove Street, Farmers Market, Portland OR 97201',
    pickupHours: 'Daily 7AM–8PM',
    products: [
      { id: 'vm-1', name: 'Single-Origin Coffee Beans', price: 2.20, category: 'food', inStock: 60, tags: ['coffee','organic','single-origin'] },
      { id: 'vm-2', name: 'Artisan Dark Chocolate Box', price: 3.50, category: 'food', inStock: 30, tags: ['chocolate','dark','artisan'] },
      { id: 'vm-3', name: 'Cold-Pressed Juice Bundle', price: 4.80, category: 'food', inStock: 18, tags: ['juice','cold-pressed','healthy'] },
      { id: 'vm-4', name: 'Wildflower Honey 500g', price: 5.60, category: 'food', inStock: 25, tags: ['honey','wildflower','raw'] },
    ],
  },
  {
    id: 'page-one', name: 'Page One',
    tagline: 'Stories worth carrying',
    category: 'books', rating: 4.7, reviewCount: 540,
    address: '7 Library Lane, Booktown, MA 02108',
    pickupHours: 'Mon-Sun 9AM–9PM',
    products: [
      { id: 'po-1', name: 'The Midnight Library', price: 1.80, category: 'books', inStock: 22, tags: ['fiction','bestseller','feel-good'] },
      { id: 'po-2', name: 'Atomic Habits', price: 1.60, category: 'books', inStock: 35, tags: ['self-help','habits','productivity'] },
      { id: 'po-3', name: 'Sapiens', price: 2.00, category: 'books', inStock: 18, tags: ['history','non-fiction','humanity'] },
      { id: 'po-4', name: "Dune (Collector's Edition)", price: 4.50, category: 'books', inStock: 7, tags: ['sci-fi','classic','collector'] },
    ],
  },
  {
    id: 'peak-performance', name: 'Peak Performance',
    tagline: 'Gear up. Show up. Level up.',
    category: 'sports', rating: 4.5, reviewCount: 680,
    address: '99 Stadium Rd, Athletic Quarter, Chicago IL 60601',
    pickupHours: 'Mon-Fri 6AM–10PM, Sat-Sun 7AM–9PM',
    products: [
      { id: 'pp-1', name: 'Pro Yoga Mat', price: 3.80, category: 'sports', inStock: 20, tags: ['yoga','mat','non-slip'] },
      { id: 'pp-2', name: 'Resistance Band Set', price: 2.40, category: 'sports', inStock: 45, tags: ['resistance','bands','home-gym'] },
      { id: 'pp-3', name: 'Trail Running Shoes', price: 11.00, category: 'sports', inStock: 10, tags: ['running','trail','shoes'] },
      { id: 'pp-4', name: 'Smart Water Bottle', price: 4.20, category: 'sports', inStock: 28, tags: ['hydration','smart','bottle'] },
    ],
  },
  {
    id: 'casa-luxe', name: 'Casa Luxe',
    tagline: 'Thoughtful objects for beautiful homes',
    category: 'home', rating: 4.8, reviewCount: 540,
    address: '25 Design District Blvd, Miami, FL 33132',
    pickupHours: 'Tue-Sun 10AM–7PM',
    products: [
      { id: 'cl-1', name: 'Sculptural Lamp Set', price: 7.00, category: 'home', inStock: 5, tags: ['lamp','ceramic','set'] },
      { id: 'cl-2', name: 'Merino Throw Blanket', price: 4.80, category: 'home', inStock: 18, tags: ['blanket','merino','cozy'] },
      { id: 'cl-3', name: 'Walnut Serving Board', price: 2.25, category: 'home', inStock: 10, tags: ['kitchen','walnut','board'] },
      { id: 'cl-4', name: 'Linen Duvet Cover', price: 5.60, category: 'home', inStock: 12, tags: ['bedding','linen','bedroom'] },
    ],
  },
  {
    id: 'bloom-co', name: 'Bloom & Co',
    tagline: 'Fresh flowers, delivered with love',
    category: 'flowers', rating: 4.9, reviewCount: 730,
    address: '14 Petal Street, Garden District, Portland OR 97201',
    pickupHours: 'Mon-Sat 8AM–7PM, Sun 9AM–4PM',
    products: [
      { id: 'bl-1', name: 'Garden Rose Bouquet', price: 4.50, category: 'flowers', inStock: 20, tags: ['roses','bouquet','romantic','gift'] },
      { id: 'bl-2', name: 'Succulent Trio', price: 2.80, category: 'flowers', inStock: 35, tags: ['succulent','plants','indoor'] },
      { id: 'bl-3', name: 'Orchid Statement Pot', price: 6.00, category: 'flowers', inStock: 12, tags: ['orchid','potted','elegant'] },
      { id: 'bl-4', name: 'Dried Wildflower Crown', price: 3.20, category: 'flowers', inStock: 18, tags: ['dried','wildflower','bohemian'] },
    ],
  },
  {
    id: 'butcher-block', name: 'The Butcher Block',
    tagline: 'Artisan meats & charcuterie',
    category: 'meat', rating: 4.7, reviewCount: 415,
    address: '9 Abattoir Lane, Meatpacking District, NY 10014',
    pickupHours: 'Tue-Sat 9AM–6PM, Sun 10AM–3PM',
    products: [
      { id: 'bb-1', name: 'Wagyu Ribeye 300g', price: 14.00, category: 'meat', inStock: 8, tags: ['wagyu','beef','premium','steak'] },
      { id: 'bb-2', name: 'Artisan Charcuterie Board', price: 8.50, category: 'meat', inStock: 15, tags: ['charcuterie','cured','board'] },
      { id: 'bb-3', name: 'Heritage Pork Belly', price: 5.80, category: 'meat', inStock: 20, tags: ['pork','belly','heritage'] },
      { id: 'bb-4', name: 'Smoked Sausage Pack', price: 3.90, category: 'meat', inStock: 30, tags: ['sausage','smoked','chorizo'] },
    ],
  },
  {
    id: 'pixel-playground', name: 'Pixel Playground',
    tagline: 'Games, toys & creative kits for all ages',
    category: 'toys', rating: 4.6, reviewCount: 880,
    address: '77 Arcade Avenue, Entertainment District, LA 90028',
    pickupHours: 'Mon-Sun 10AM–9PM',
    products: [
      { id: 'px-1', name: 'Pro Gaming Controller', price: 5.50, category: 'toys', inStock: 22, tags: ['gaming','controller','wireless','esports'] },
      { id: 'px-2', name: 'Strategy Board Game Set', price: 3.80, category: 'toys', inStock: 14, tags: ['board game','strategy','family'] },
      { id: 'px-3', name: 'Robotics Starter Kit', price: 7.20, category: 'toys', inStock: 10, tags: ['robotics','stem','coding','educational'] },
      { id: 'px-4', name: 'Retro Arcade Stick', price: 4.60, category: 'toys', inStock: 17, tags: ['arcade','joystick','retro','usb'] },
    ],
  },
];

export function searchCatalog(query: string, maxPrice?: number, category?: string) {
  const q = query.toLowerCase();
  const results: Array<{ store: string; storeId: string; product: typeof STORES[0]['products'][0]; score: number }> = [];
  for (const store of STORES) {
    if (category && store.category !== category) continue;
    for (const product of store.products) {
      if (maxPrice && product.price > maxPrice) continue;
      let score = 0;
      const searchable = `${product.name} ${product.tags.join(' ')} ${store.name}`.toLowerCase();
      const words = q.split(/\s+/).filter(w => w.length > 2);
      for (const w of words) if (searchable.includes(w)) score += 15;
      if (category && product.category === category) score += 20;
      if (score > 0 || q.trim() === '') results.push({ store: store.name, storeId: store.id, product, score });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 8);
}
