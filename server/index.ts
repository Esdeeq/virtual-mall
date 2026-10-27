/**
 * VirtualMall Agent API — Express + Circle Gateway Nanopayments (x402)
 *
 * Exposes the marketplace catalog as a paid HTTP API that any AI agent
 * (Claude, GPT, custom agent) can call with a USDC micropayment.
 *
 * Endpoints:
 *   GET  /api/catalog          — full store + product catalog   ($0.001 USDC/call)
 *   POST /api/search           — NLP product search             ($0.001 USDC/call)
 *   GET  /api/stores           — store list only                ($0.001 USDC/call)
 *   GET  /api/stores/:id       — single store + products        ($0.001 USDC/call)
 *   GET  /health               — free health check
 *
 * Payment: Circle Gateway Nanopayments via @circle-fin/x402-batching.
 * Agents pay $0.001 USDC per call. No API key needed — just pay the 402.
 *
 * Usage by an external AI agent:
 *   1. Send the request normally — server returns HTTP 402 with payment details.
 *   2. Agent reads the 402 `accepts[]` array for chain + address + amount.
 *   3. Agent sends a Circle Gateway authorization header.
 *   4. Retry the request with the `X-Payment` header — server returns 200 + JSON.
 *
 * Local dev: bun run server
 * The Vite frontend proxies /api/* to this server in vite.config.ts.
 */

import express from 'express';
import cors from 'cors';
import { createGatewayMiddleware } from '@circle-fin/x402-batching/server';
import { agentPay, getAgentWalletInfo } from './agent-pay';
import {
  initiateUserControlledWalletsClient,
  Blockchain,
} from '@circle-fin/user-controlled-wallets';

// ---------------------------------------------------------------------------
// Inline catalog (mirrors src/data/marketplace.ts without browser imports)
// ---------------------------------------------------------------------------

const STORES = [
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
      { id: 'po-4', name: 'Dune (Collector\'s Edition)', price: 4.50, category: 'books', inStock: 7, tags: ['sci-fi','classic','collector'] },
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

// ---------------------------------------------------------------------------
// Search helper
// ---------------------------------------------------------------------------

function searchCatalog(query: string, maxPrice?: number, category?: string) {
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

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
app.use(cors());
app.use(express.json());

// Gateway middleware — reads SELLER_ADDRESS from env
const SELLER_ADDRESS = process.env.SELLER_ADDRESS ?? process.env.VITE_MERCHANT_ADDRESS ?? '0x0000000000000000000000000000000000000000';
const gateway = createGatewayMiddleware({ sellerAddress: SELLER_ADDRESS });

const PRICE = '$0.001'; // per-call price

// Free health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'VirtualMall Agent API',
    version: '1.0.0',
    stores: STORES.length,
    products: STORES.reduce((n, s) => n + s.products.length, 0),
    pricing: { perCall: PRICE, currency: 'USDC', protocol: 'x402 / Circle Gateway Nanopayments' },
    endpoints: [
      { method: 'GET', path: '/api/catalog', description: 'Full store + product catalog', price: PRICE },
      { method: 'POST', path: '/api/search', description: 'NLP product search', price: PRICE },
      { method: 'GET', path: '/api/stores', description: 'Store list', price: PRICE },
      { method: 'GET', path: '/api/stores/:id', description: 'Single store + products', price: PRICE },
    ],
  });
});

// Full catalog
app.get('/api/catalog', gateway.require(PRICE), (_req, res) => {
  res.json({
    stores: STORES,
    meta: {
      totalStores: STORES.length,
      totalProducts: STORES.reduce((n, s) => n + s.products.length, 0),
      currency: 'USDC',
      network: 'Arc Testnet',
    },
  });
});

// Store list
app.get('/api/stores', gateway.require(PRICE), (_req, res) => {
  res.json(STORES.map(s => ({
    id: s.id, name: s.name, tagline: s.tagline, category: s.category,
    rating: s.rating, productCount: s.products.length,
    address: s.address, pickupHours: s.pickupHours,
  })));
});

// Single store
app.get('/api/stores/:id', gateway.require(PRICE), (req, res) => {
  const store = STORES.find(s => s.id === req.params.id);
  if (!store) { res.status(404).json({ error: 'Store not found' }); return; }
  res.json(store);
});

// NLP search
app.post('/api/search', gateway.require(PRICE), (req, res) => {
  const { query = '', maxPrice, category } = req.body as {
    query?: string; maxPrice?: number; category?: string;
  };
  if (!query && !category) {
    res.status(400).json({ error: 'Provide query or category' });
    return;
  }
  const results = searchCatalog(query, maxPrice, category);
  res.json({
    query, filters: { maxPrice, category },
    count: results.length,
    results,
  });
});

// ---------------------------------------------------------------------------
// Agent wallet endpoints (no x402 gate — internal use by the frontend)
// ---------------------------------------------------------------------------

// GET /api/agent/wallet — returns agent wallet address + USDC balance
app.get('/api/agent/wallet', async (_req, res) => {
  try {
    const info = await getAgentWalletInfo();
    res.json({ ok: true, ...info });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Return 503 if credentials not set (config issue, not a 500)
    const code = msg.includes('must be set') ? 503 : 500;
    res.status(code).json({ ok: false, error: msg });
  }
});

// POST /api/agent/pay  { amount: number }  — agent pays merchant from its wallet
app.post('/api/agent/pay', express.json(), async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ ok: false, error: 'amount must be a positive number (USDC)' });
      return;
    }
    const result = await agentPay(amount);
    res.json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = msg.includes('Insufficient') ? 402 : msg.includes('must be set') ? 503 : 500;
    res.status(code).json({ ok: false, error: msg });
  }
});

// ---------------------------------------------------------------------------
// Escrow signature endpoint — signs OrderAuth for MallEscrow.deposit()
// ---------------------------------------------------------------------------
// POST /api/escrow/sign  { orderId: hex, buyer: address, amount: string }
// Returns an EIP-712 merchant signature the buyer passes to deposit().
// The AGENT_PRIVATE_KEY acts as the merchant signer.
app.post('/api/escrow/sign', express.json(), async (req, res) => {
  try {
    const { privateKeyToAccount } = await import('viem/accounts');
    const { keccak256, encodePacked, toHex, encodeAbiParameters, parseAbiParameters } = await import('viem');

    const rawKey = process.env.AGENT_PRIVATE_KEY ?? '';
    if (!rawKey) { res.status(503).json({ ok: false, error: 'AGENT_PRIVATE_KEY not set' }); return; }
    const escrowAddr = process.env.VITE_ESCROW_ADDRESS ?? '';
    if (!escrowAddr) { res.status(503).json({ ok: false, error: 'VITE_ESCROW_ADDRESS not set' }); return; }

    const key = rawKey.startsWith('0x') ? rawKey as `0x${string}` : `0x${rawKey}` as `0x${string}`;
    const account = privateKeyToAccount(key);

    const { orderId, buyer, amount } = req.body as { orderId: string; buyer: string; amount: string; };
    if (!orderId || !buyer || !amount) { res.status(400).json({ ok: false, error: 'orderId, buyer, amount required' }); return; }

    const CHAIN_ID = 5042002n;
    const ESCROW_ADDRESS = escrowAddr as `0x${string}`;

    const enc = (s: string) => toHex(new TextEncoder().encode(s));
    const DOMAIN_TYPEHASH = keccak256(enc('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'));
    const ORDER_AUTH_TYPEHASH = keccak256(enc('OrderAuth(bytes32 orderId,address buyer,uint256 amount)'));

    const domainSeparator = keccak256(encodeAbiParameters(
      parseAbiParameters('bytes32,bytes32,bytes32,uint256,address'),
      [DOMAIN_TYPEHASH, keccak256(enc('MallEscrow')), keccak256(enc('1')), CHAIN_ID, ESCROW_ADDRESS]
    ));

    const structHash = keccak256(encodeAbiParameters(
      parseAbiParameters('bytes32,bytes32,address,uint256'),
      [ORDER_AUTH_TYPEHASH, orderId as `0x${string}`, buyer as `0x${string}`, BigInt(amount)]
    ));

    const digest = keccak256(encodePacked(['string','bytes32','bytes32'], ['\x19\x01', domainSeparator, structHash]));
    const signature = await account.sign({ hash: digest });
    res.json({ ok: true, signature });
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ---------------------------------------------------------------------------
// User-Controlled Wallet routes (PIN auth — no SMTP needed)
// ---------------------------------------------------------------------------

const circleWalletClient = initiateUserControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY ?? '',
});

// POST /api/wallet/create-user  { userId: string }
app.post('/api/wallet/create-user', express.json(), async (req, res) => {
  try {
    const { userId } = req.body as { userId: string };
    if (!userId || userId.length < 5) { res.status(400).json({ ok: false, error: 'userId must be ≥ 5 chars' }); return; }
    await circleWalletClient.createUser({ userId });
    res.json({ ok: true });
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    // 155101 = user already exists — not a real error, let frontend continue
    if (code === 155101) { res.json({ ok: true, alreadyExists: true }); return; }
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err), code });
  }
});

// POST /api/wallet/get-token  { userId: string }
app.post('/api/wallet/get-token', express.json(), async (req, res) => {
  try {
    const { userId } = req.body as { userId: string };
    if (!userId) { res.status(400).json({ ok: false, error: 'userId required' }); return; }
    const resp = await circleWalletClient.createUserToken({ userId });
    const { userToken, encryptionKey } = resp.data!;
    res.json({ ok: true, userToken, encryptionKey });
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/wallet/initialize  { userToken: string }
// Returns { challengeId } for new users, or { alreadyInitialized: true } for existing ones.
app.post('/api/wallet/initialize', express.json(), async (req, res) => {
  try {
    const { userToken } = req.body as { userToken: string };
    if (!userToken) { res.status(400).json({ ok: false, error: 'userToken required' }); return; }
    const resp = await circleWalletClient.createUserPinWithWallets({
      userToken,
      blockchains: [Blockchain.ArcTestnet],
      accountType: 'SCA',
    });
    res.json({ ok: true, challengeId: resp.data?.challengeId });
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code === 155106) { res.json({ ok: true, alreadyInitialized: true }); return; }
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err), code });
  }
});

// POST /api/wallet/list  { userToken: string }
app.post('/api/wallet/list', express.json(), async (req, res) => {
  try {
    const { userToken } = req.body as { userToken: string };
    if (!userToken) { res.status(400).json({ ok: false, error: 'userToken required' }); return; }
    const resp = await circleWalletClient.listWallets({ userToken });
    res.json({ ok: true, wallets: resp.data?.wallets ?? [] });
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/wallet/send  { userToken, walletId, destinationAddress, amount (USDC string) }
app.post('/api/wallet/send', express.json(), async (req, res) => {
  try {
    const { userToken, walletId, destinationAddress, amount } = req.body as {
      userToken: string; walletId: string; destinationAddress: string; amount: string;
    };
    if (!userToken || !walletId || !destinationAddress || !amount) {
      res.status(400).json({ ok: false, error: 'userToken, walletId, destinationAddress, amount required' });
      return;
    }
    // Fetch the wallet's token balances to get the USDC token ID dynamically
    const balResp = await circleWalletClient.getWalletTokenBalance({ walletId, userToken });
    const tokenBalances = balResp.data?.tokenBalances ?? [];
    // Prefer the native USDC token (isNative: true) on Arc — the SCA wallet uses it for transfers
    const nativeUsdc = tokenBalances.find((t: { token?: { symbol?: string; id?: string; isNative?: boolean } }) =>
      t.token?.symbol === 'USDC' && t.token?.isNative === true
    );
    const erc20Usdc = tokenBalances.find((t: { token?: { symbol?: string; id?: string; isNative?: boolean } }) =>
      t.token?.symbol === 'USDC' && t.token?.isNative === false
    );
    const usdcEntry = nativeUsdc ?? erc20Usdc;
    const tokenId = usdcEntry?.token?.id as string | undefined;
    if (!tokenId) {
      res.status(400).json({ ok: false, error: 'USDC token not found in wallet. Fund the wallet first.' });
      return;
    }
    const resp = await circleWalletClient.createTransaction({
      userToken,
      walletId,
      amounts: [amount],
      destinationAddress,
      tokenId,
      fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
    });
    // createTransaction for user-controlled wallets returns challengeId in resp.data.challengeId
    const challengeId = (resp.data as unknown as Record<string, string | null | undefined>)?.challengeId
      ?? (resp.data?.transaction as unknown as Record<string, string | null | undefined> | null | undefined)?.id
      ?? null;
    const txHash = (resp.data?.transaction as unknown as Record<string, string | null | undefined> | null | undefined)?.txHash ?? null;
    res.json({ ok: true, challengeId, txHash });
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/wallet/balance  { userToken: string, walletId: string }
app.post('/api/wallet/balance', express.json(), async (req, res) => {
  try {
    const { userToken, walletId } = req.body as { userToken: string; walletId: string };
    if (!userToken || !walletId) { res.status(400).json({ ok: false, error: 'userToken and walletId required' }); return; }
    const resp = await circleWalletClient.getWalletTokenBalance({ walletId, userToken });
    res.json({ ok: true, tokenBalances: resp.data?.tokenBalances ?? [] });
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`VirtualMall Agent API running on :${PORT}`);
  console.log(`  Health:  http://localhost:${PORT}/health`);
  console.log(`  Catalog: http://localhost:${PORT}/api/catalog  (${PRICE} USDC/call)`);
  console.log(`  Search:  POST http://localhost:${PORT}/api/search  (${PRICE} USDC/call)`);
  console.log(`  Seller:  ${SELLER_ADDRESS}`);
});
