/**
 * Digital Assets marketplace data
 * Categories: names (.arc / .usdc), gold, silver, nft
 */

export type DigitalCategory = 'names' | 'gold' | 'silver' | 'nft';

export interface DigitalAsset {
  id: string;
  name: string;
  description: string;
  price: number;           // USDC
  category: DigitalCategory;
  imageUrl: string;
  badge?: string;
  badgeColor?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'legendary';
  supply?: number;
  tags: string[];
  meta?: Record<string, string>;
}

export const DIGITAL_CATEGORY_LABELS: Record<DigitalCategory, string> = {
  names:  'Digital Names',
  gold:   'Digital Gold',
  silver: 'Digital Silver',
  nft:    'NFT Art',
};

export const DIGITAL_CATEGORY_ICONS: Record<DigitalCategory, string> = {
  names:  '◈',
  gold:   '◆',
  silver: '◇',
  nft:    '✦',
};

export const DIGITAL_CATEGORY_COLORS: Record<DigitalCategory, { from: string; to: string; accent: string }> = {
  names:  { from: '#6366f1', to: '#8b5cf6', accent: '#6366f1' },
  gold:   { from: '#d97706', to: '#f59e0b', accent: '#f59e0b' },
  silver: { from: '#64748b', to: '#94a3b8', accent: '#94a3b8' },
  nft:    { from: '#ec4899', to: '#a855f7', accent: '#ec4899' },
};

// Generate a styled SVG card for a digital name
function nameCard(label: string, ext: '.arc' | '.usdc'): string {
  const isArc = ext === '.arc';
  const bg1   = isArc ? '%236366f1' : '%230ea5e9';
  const bg2   = isArc ? '%238b5cf6' : '%236366f1';
  const glow  = isArc ? '%23a78bfa' : '%2338bdf8';
  const stem  = encodeURIComponent(label);
  const suffix = encodeURIComponent(ext);
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='${bg1}'/%3E%3Cstop offset='1' stop-color='${bg2}'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' rx='24' fill='url(%23g)'/%3E%3Crect x='20' y='20' width='360' height='360' rx='16' fill='none' stroke='${glow}' stroke-width='1.5' stroke-dasharray='8 6' opacity='.4'/%3E%3Ccircle cx='200' cy='148' r='48' fill='none' stroke='${glow}' stroke-width='2' opacity='.35'/%3E%3Ccircle cx='200' cy='148' r='28' fill='%23ffffff' opacity='.12'/%3E%3Ctext x='200' y='155' font-family='monospace' font-size='22' font-weight='700' fill='%23ffffff' text-anchor='middle' opacity='.9'%3E◈%3C/text%3E%3Ctext x='200' y='240' font-family='monospace' font-size='32' font-weight='800' fill='%23ffffff' text-anchor='middle' letter-spacing='-1'%3E${stem}%3C/text%3E%3Ctext x='200' y='278' font-family='monospace' font-size='24' font-weight='600' fill='${glow}' text-anchor='middle'%3E${suffix}%3C/text%3E%3Crect x='100' y='310' width='200' height='2' rx='1' fill='%23ffffff' opacity='.15'/%3E%3Ctext x='200' y='348' font-family='sans-serif' font-size='13' fill='%23ffffff' text-anchor='middle' opacity='.5'%3EDigital Name · VirtualMall%3C/text%3E%3C/svg%3E`;
}

export const DIGITAL_ASSETS: DigitalAsset[] = [

  /* ── Digital Names — .arc (receives any token on Arc) ── */
  {
    id: 'dn-arc-1',
    name: 'wallet.arc',
    description: 'Premium .arc name — resolves to your Arc wallet and accepts any token native to the Arc blockchain. One address, every asset.',
    price: 49.00,
    category: 'names',
    imageUrl: nameCard('wallet', '.arc'),
    badge: 'Premium',
    badgeColor: '#6366f1',
    rarity: 'rare',
    supply: 1,
    tags: ['.arc', 'identity', 'arc-chain'],
    meta: { Extension: '.arc', Chain: 'Arc', Receives: 'Any token on Arc', Expires: 'Never' },
  },
  {
    id: 'dn-arc-2',
    name: 'shop.arc',
    description: 'Merchant-grade .arc name. Let customers pay you in USDC, wrapped ETH, or any Arc-native asset — all routed to one place.',
    price: 65.00,
    category: 'names',
    imageUrl: nameCard('shop', '.arc'),
    badge: 'Merchant',
    badgeColor: '#22c55e',
    rarity: 'rare',
    supply: 1,
    tags: ['.arc', 'merchant', 'payments'],
    meta: { Extension: '.arc', Chain: 'Arc', Receives: 'Any Arc token', Use: 'Merchant payments' },
  },
  {
    id: 'dn-arc-3',
    name: 'satoshi.arc',
    description: 'Iconic .arc handle. Ultra-short, globally recognisable. Receives USDC, wrapped BTC, stablecoins — anything on Arc.',
    price: 250.00,
    category: 'names',
    imageUrl: nameCard('satoshi', '.arc'),
    badge: 'Legendary',
    badgeColor: '#f59e0b',
    rarity: 'legendary',
    supply: 1,
    tags: ['.arc', 'premium', 'iconic'],
    meta: { Extension: '.arc', Chain: 'Arc', Receives: 'Any Arc token', Status: 'Ultra-premium' },
  },

  /* ── Digital Names — .usdc (receives tokens from any blockchain) ── */
  {
    id: 'dn-usdc-1',
    name: 'pay.usdc',
    description: 'Your universal payment address. .usdc names bridge across 10+ blockchains — send from Ethereum, Base, Solana, Polygon, and more, all land here.',
    price: 35.00,
    category: 'names',
    imageUrl: nameCard('pay', '.usdc'),
    badge: 'Multi-chain',
    badgeColor: '#0ea5e9',
    rarity: 'uncommon',
    supply: 1,
    tags: ['.usdc', 'multichain', 'payments'],
    meta: { Extension: '.usdc', Receives: 'Tokens from any blockchain', Protocol: 'CCTP + Gateway', Chains: 'ETH · Base · SOL · Polygon · Avalanche +5' },
  },
  {
    id: 'dn-usdc-2',
    name: 'treasury.usdc',
    description: 'Enterprise .usdc name designed for treasury management. Accept USDC, USDT, EURC from any chain into a single unified balance.',
    price: 120.00,
    category: 'names',
    imageUrl: nameCard('treasury', '.usdc'),
    badge: 'Enterprise',
    badgeColor: '#6366f1',
    rarity: 'rare',
    supply: 1,
    tags: ['.usdc', 'treasury', 'enterprise'],
    meta: { Extension: '.usdc', Receives: 'USDC · USDT · EURC from any chain', Protocol: 'Circle CCTP', Use: 'Treasury / DAO' },
  },
  {
    id: 'dn-usdc-3',
    name: 'creator.usdc',
    description: 'Creator economy .usdc address. Fans and clients send tips or payments from any chain — you receive unified USDC instantly.',
    price: 28.00,
    category: 'names',
    imageUrl: nameCard('creator', '.usdc'),
    badge: 'Creator',
    badgeColor: '#ec4899',
    rarity: 'uncommon',
    supply: 1,
    tags: ['.usdc', 'creator', 'tips'],
    meta: { Extension: '.usdc', Receives: 'Any cross-chain stablecoin', Protocol: 'Circle Gateway', Use: 'Creator / freelancer' },
  },

  /* ── Digital Gold ── */
  {
    id: 'dg-1',
    name: '1 oz Digital Gold',
    description: 'Tokenized 1 troy ounce of LBMA-certified gold bullion. Each token fully backed and redeemable.',
    price: 1985.00,
    category: 'gold',
    imageUrl: 'https://images.unsplash.com/photo-1762463176350-baed663b310c?w=400&q=80',
    badge: '99.99% Pure',
    badgeColor: '#d97706',
    rarity: 'rare',
    tags: ['gold', '1oz', 'bullion'],
    meta: { Purity: '99.99%', Backing: 'Physical vault', Standard: 'LBMA' },
  },
  {
    id: 'dg-2',
    name: '10g Digital Gold',
    description: '10 gram tokenized gold bar. Fractionalized ownership of vault-held PAMP Suisse bars.',
    price: 638.00,
    category: 'gold',
    imageUrl: 'https://images.unsplash.com/photo-1633484188188-3d985053a572?w=400&q=80',
    badge: 'Popular',
    badgeColor: '#f59e0b',
    rarity: 'uncommon',
    tags: ['gold', '10g', 'fractional'],
    meta: { Weight: '10g', Purity: '99.9%', Brand: 'PAMP Suisse' },
  },
  {
    id: 'dg-3',
    name: 'Micro Gold (0.1g)',
    description: 'Fractional gold entry point — own a slice of real gold for under $10. Perfect for DCA.',
    price: 6.38,
    category: 'gold',
    imageUrl: 'https://images.unsplash.com/photo-1643253213326-2adba9080310?w=400&q=80',
    badge: 'Entry',
    badgeColor: '#22c55e',
    rarity: 'common',
    tags: ['gold', 'micro', 'dca'],
    meta: { Weight: '0.1g', Type: 'Fractional token' },
  },
  {
    id: 'dg-4',
    name: 'Gold Yield Token',
    description: 'Gold-backed token that earns 3.2% APY via vault lending to jewellers. Hold gold, earn yield.',
    price: 200.00,
    category: 'gold',
    imageUrl: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&q=80',
    badge: '3.2% APY',
    badgeColor: '#d97706',
    rarity: 'rare',
    tags: ['gold', 'yield', 'defi'],
    meta: { APY: '3.2%', Lock: 'None', Backing: '1:1 gold' },
  },

  /* ── Digital Silver ── */
  {
    id: 'ds-1',
    name: '1 oz Digital Silver',
    description: 'Tokenized 1 troy ounce of .999 fine silver. Fully backed by segregated vaulted silver.',
    price: 29.50,
    category: 'silver',
    imageUrl: 'https://images.unsplash.com/photo-1707783764111-502472d31ace?w=400&q=80',
    badge: '.999 Fine',
    badgeColor: '#64748b',
    rarity: 'common',
    tags: ['silver', '1oz', 'bullion'],
    meta: { Purity: '.999', Weight: '1 troy oz', Vault: 'Segregated' },
  },
  {
    id: 'ds-2',
    name: '100g Digital Silver',
    description: '100g tokenized silver bar equivalent. Portfolio-grade silver exposure with instant liquidity.',
    price: 94.00,
    category: 'silver',
    imageUrl: 'https://images.unsplash.com/photo-1707783764102-02a6a002f5c8?w=400&q=80',
    badge: 'Best Value',
    badgeColor: '#0ea5e9',
    rarity: 'uncommon',
    tags: ['silver', '100g', 'bar'],
    meta: { Weight: '100g', Purity: '.999', Liquidity: 'Instant' },
  },
  {
    id: 'ds-3',
    name: 'Micro Silver (10g)',
    description: '10g fractional silver token. Entry-level precious metals exposure, redeemable anytime.',
    price: 9.40,
    category: 'silver',
    imageUrl: 'https://images.unsplash.com/photo-1720637595085-cd0b84ed67ad?w=400&q=80',
    badge: 'Starter',
    badgeColor: '#94a3b8',
    rarity: 'common',
    tags: ['silver', '10g', 'entry'],
    meta: { Weight: '10g', Purity: '.999', Type: 'Fractional' },
  },
  {
    id: 'ds-4',
    name: 'Silver Streaming Token',
    description: 'Exposure to future silver mine output. Earn a stream of silver tokens as mines produce.',
    price: 50.00,
    category: 'silver',
    imageUrl: 'https://images.unsplash.com/photo-1641324114778-3234111fe705?w=400&q=80',
    badge: 'Streaming',
    badgeColor: '#8b5cf6',
    rarity: 'rare',
    tags: ['silver', 'streaming', 'defi'],
    meta: { Type: 'Streaming', Source: 'Mine-backed', Yield: 'Variable' },
  },

  /* ── NFT Art ── */
  {
    id: 'nft-1',
    name: 'Neon City #044',
    description: 'Generative cyberpunk cityscape. 1 of 1000 in the Neon City series. Fully on-chain metadata.',
    price: 0.80,
    category: 'nft',
    // Neon city lights at night
    imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&q=80',
    badge: 'Generative',
    badgeColor: '#a855f7',
    rarity: 'uncommon',
    supply: 956,
    tags: ['generative', 'cyberpunk', 'onchain'],
    meta: { Series: 'Neon City', Edition: '#044/1000', Chain: 'Base' },
  },
  {
    id: 'nft-2',
    name: 'Abstract Flux #7',
    description: 'Hand-painted digital canvas by multidisciplinary artist Kaori M. Certificate of authenticity included.',
    price: 4.50,
    category: 'nft',
    // Abstract colorful art / painting
    imageUrl: 'https://images.unsplash.com/photo-1567359781514-3b964e2b04d6?w=400&q=80',
    badge: '1 of 1',
    badgeColor: '#ec4899',
    rarity: 'legendary',
    supply: 1,
    tags: ['1of1', 'painting', 'digital art'],
    meta: { Artist: 'Kaori M.', Cert: 'Included', Chain: 'Ethereum' },
  },
  {
    id: 'nft-3',
    name: 'Mall Walker PFP',
    description: 'VirtualMall exclusive PFP — a pixel-art shopper with unique outfit traits. Unlocks store discounts.',
    price: 1.20,
    category: 'nft',
    // Colourful pixel / pop-art character style
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
    badge: 'Exclusive',
    badgeColor: '#22c55e',
    rarity: 'rare',
    supply: 412,
    tags: ['pfp', 'pixel', 'exclusive'],
    meta: { Perks: 'Store discounts', Traits: '200+ combos', Chain: 'Base' },
  },
  {
    id: 'nft-4',
    name: 'Sound Wave #19',
    description: 'Tokenized music NFT — a 3-minute ambient track with visual waveform. Stream and own.',
    price: 0.50,
    category: 'nft',
    // Audio / sound wave visualization
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
    badge: 'Music',
    badgeColor: '#f59e0b',
    rarity: 'uncommon',
    supply: 300,
    tags: ['music', 'audio', 'nft'],
    meta: { Format: 'Audio + Visual', Duration: '3 min', Royalty: '10% to artist' },
  },
  {
    id: 'nft-5',
    name: 'Onchain Portrait #3',
    description: 'Fully on-chain SVG portrait. Zero external dependencies — lives forever on the blockchain.',
    price: 2.00,
    category: 'nft',
    // Portrait illustration / artwork
    imageUrl: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=400&q=80',
    badge: '100% Onchain',
    badgeColor: '#0ea5e9',
    rarity: 'rare',
    supply: 150,
    tags: ['svg', 'onchain', 'portrait'],
    meta: { Storage: '100% onchain SVG', Chain: 'Ethereum', Token: 'ERC-721' },
  },
];

export function getAssetsByCategory(cat: DigitalCategory): DigitalAsset[] {
  return DIGITAL_ASSETS.filter(a => a.category === cat);
}
