/**
 * AgentShopper — AI shopping agent with Chat / Profile / Wallet tabs.
 * Logic is unchanged; this file is a full UI redesign for the chat section.
 */
import { useState, useRef, useCallback, useEffect, useContext } from 'react';
import { UserWalletContext } from '../context/UserWalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, ShoppingCart, X, Loader, User, Wallet, Clock,
  AlertCircle, Check, CheckCircle, ShoppingBag, ArrowRight, Zap, RefreshCw,
} from 'lucide-react';
import CopyField from './CopyField';
import AgentAPIPage from './AgentAPIPage';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { erc20Abi } from 'viem';
import { STORES } from '../data/marketplace';
import { getUsdc, buildTxExplorerUrl } from '../onchain-facts';
import { parseAmount, formatUsdc } from '../onchain-money';
import { useAgentWallet } from '../hooks/useAgentWallet';
import type { Product, Store } from '../data/marketplace';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DeliveryProfile {
  fullName: string; email: string; street: string;
  city: string; state: string; zip: string; country: string;
}

interface AgentResult { product: Product; store: Store; score: number; reason: string; }

export interface AgentOrder {
  id: string;
  productName: string;
  storeName: string;
  price: number;
  txHash: string;
  explorerUrl: string;
  deliveryName: string;
  deliveryAddress: string;
  paidAt: string;
  confirmed?: boolean;
}

const ORDERS_KEY = 'vm_agent_orders';
function loadAgentOrders(): AgentOrder[] {
  try { const s = localStorage.getItem(ORDERS_KEY); return s ? (JSON.parse(s) as AgentOrder[]) : []; } catch { return []; }
}
function saveAgentOrder(order: AgentOrder) {
  const orders = loadAgentOrders();
  orders.unshift(order);
  try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders.slice(0, 50))); } catch { /* */ }
}

type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'results'; results: AgentResult[] }
  | { type: 'thinking'; steps: string[] }
  | { type: 'order_success'; order: AgentOrder };

interface Message { id: string; role: 'user' | 'agent'; content: MessageContent; timestamp: Date; }

interface AgentShopperProps {
  isOpen: boolean; onClose: () => void;
  onAddToCart: (p: Product, s: Store) => void;
  onEnterStore: (s: Store) => void;
  onCheckout: (p: Product, s: Store, profile: DeliveryProfile) => void;
}

type Tab = 'chat' | 'profile' | 'wallet' | 'orders' | 'api';

// ─── Constants ───────────────────────────────────────────────────────────────

import { ARC_CHAIN_ID } from '../chain-config';
const PROFILE_KEY = 'vm_agent_profile';

const SUGGESTIONS = [
  'Headphones under $5',
  'Best laptops',
  'Cheapest food items',
  'Home decor ideas',
  'Gift under $10',
];

// ─── NLP ─────────────────────────────────────────────────────────────────────

// ─── Natural language phrase patterns → intent/category ─────────────────────
const PHRASE_PATTERNS: Array<{ pattern: RegExp; category?: string; intent?: string; }> = [
  // reading / books — must come before generic "health" patterns
  { pattern: /\b(read|reading|something to read|a book|books?|novel|fiction|nonfiction|story|stories|literature|thriller|author|page|chapter|hardcover|paperback)\b/, category: 'books' },
  // cozy / home
  { pattern: /\b(cozy|cosy|warm up|home decor|decor|decoration|interior|living room|bedroom|kitchen|furniture|lamp|blanket|throw|duvet|linen|cushion|pillow|board|serving)\b/, category: 'home' },
  // food / drinks — check before sports so "healthy food" → food
  { pattern: /\b(eat|drink|food|snack|coffee|espresso|tea|juice|honey|baking|sourdough|organic|nutrition|grocery|groceries|artisan|meal|breakfast|lunch|dinner)\b/, category: 'food' },
  // fitness / sports
  { pattern: /\b(gym|workout|exercise|fitness|sport|sports|training|running|yoga|athletic|hiking|backpack|helmet|cycling|diving|fins|mat)\b/, category: 'sports' },
  // fashion / clothing
  { pattern: /\b(wear|outfit|clothes|clothing|fashion|style|dress|shirt|jacket|shoes|sneakers|bag|tote|accessory|accessories|bomber|linen set|set)\b/, category: 'fashion' },
  // electronics / tech
  { pattern: /\b(tech|electronics?|gadget|device|laptop|computer|phone|smartwatch|watch|camera|headphone|earbud|earphone|wireless|bluetooth|streaming|webcam)\b/, category: 'electronics' },
  // flowers / plants
  { pattern: /\b(flower|flowers|bouquet|rose|roses|orchid|succulent|plant|plants|dried|floral|bloom|petal|tulip|lily|lavender)\b/, category: 'flowers' },
  // meat / butcher / deli
  { pattern: /\b(meat|steak|beef|pork|chicken|sausage|charcuterie|deli|butcher|wagyu|salami|chorizo|cured|bbq|grill|ribeye)\b/, category: 'meat' },
  // toys / games
  { pattern: /\b(toy|toys|game|games|gaming|controller|board game|puzzle|lego|robot|robotics|arcade|joystick|console|kids|children|stem|educational|play)\b/, category: 'toys' },
  // gift intent
  { pattern: /\b(gift|present|birthday|anniversary|surprise|someone special|my (mum|mom|dad|friend|partner|wife|husband|sister|brother|colleague|boss))\b/, intent: 'gift' },
  // cheapest intent
  { pattern: /\b(cheap|cheapest|budget|affordable|inexpensive|bargain|deal|value|low cost|lowest price|on a budget|tight budget)\b/, intent: 'cheapest' },
  // best rated
  { pattern: /\b(best|top|highest rated|most popular|recommended|premium|quality|well reviewed|highly rated)\b/, intent: 'best_rated' },
  // browse all
  { pattern: /\b(everything|all|browse|explore|show me everything|what('?s| is) (available|in stock|there)|show all|see all)\b/, intent: 'browse' },
];

const SYNONYMS: Record<string, string[]> = {
  headphone: ['headphone', 'earphone', 'earbud', 'earbuds', 'headphones', 'headset', 'audio', 'wireless audio'],
  headphones: ['headphone', 'earphone', 'earbud', 'earbuds', 'headphones', 'headset', 'audio'],
  earbuds: ['earbud', 'earbuds', 'headphone', 'earphone', 'wireless', 'anc'],
  laptop: ['laptop', 'ultrabook', 'notebook', 'computer', 'macbook', 'pc', 'ultrabook pro'],
  computer: ['laptop', 'ultrabook', 'notebook', 'computer', 'pc'],
  watch: ['watch', 'smartwatch', 'wearable', 'fitness tracker', 'smart watch'],
  smartwatch: ['smartwatch', 'smart watch', 'watch', 'wearable'],
  phone: ['phone', 'smartphone', 'mobile', 'iphone', 'android'],
  camera: ['camera', 'webcam', 'lens', 'photo', 'streaming'],
  webcam: ['webcam', 'camera', '4k', 'streaming'],
  jacket: ['jacket', 'coat', 'bomber', 'outerwear', 'hoodie'],
  shirt: ['shirt', 'linen', 'casual', 'top', 'tee', 'blouse'],
  shoes: ['shoes', 'sneakers', 'sneaker', 'footwear', 'kicks', 'trainers'],
  sneakers: ['sneakers', 'sneaker', 'shoes', 'retro', 'footwear'],
  bag: ['bag', 'tote', 'backpack', 'purse', 'handbag'],
  tote: ['tote', 'bag', 'handbag', 'carry'],
  coffee: ['coffee', 'espresso', 'brew', 'roast', 'arabica'],
  chocolate: ['chocolate', 'cacao', 'dark chocolate', 'artisan'],
  tea: ['tea', 'matcha', 'herbal', 'green tea'],
  food: ['food', 'snack', 'coffee', 'chocolate', 'tea', 'artisan'],
  book: ['book', 'novel', 'hardcover', 'paperback', 'read', 'fiction', 'nonfiction', 'thriller'],
  yoga: ['yoga', 'mat', 'fitness', 'exercise', 'stretch'],
  mat: ['mat', 'yoga', 'exercise', 'fitness'],
  gym: ['gym', 'fitness', 'exercise', 'training', 'workout'],
  bottle: ['bottle', 'water', 'hydration', 'flask', 'insulated'],
  lamp: ['lamp', 'light', 'lighting', 'sculptural', 'table lamp'],
  blanket: ['blanket', 'throw', 'merino', 'wool', 'cozy'],
  pillow: ['pillow', 'cushion', 'linen', 'duvet'],
  duvet: ['duvet', 'linen', 'pillow', 'bedding', 'cover'],
  serving: ['serving', 'board', 'walnut', 'kitchen', 'charcuterie'],
  board: ['board', 'serving', 'walnut', 'kitchen'],
  decor: ['decor', 'lamp', 'blanket', 'throw', 'home', 'sculptural'],
  home: ['home', 'decor', 'lamp', 'blanket', 'duvet', 'board'],
};

function expandKeywords(keywords: string[]): string[] {
  const expanded = new Set<string>();
  for (const kw of keywords) {
    expanded.add(kw);
    const syns = SYNONYMS[kw];
    if (syns) syns.forEach(s => expanded.add(s));
    // also add plural/singular variants
    if (kw.endsWith('s') && kw.length > 3) expanded.add(kw.slice(0, -1));
    else expanded.add(kw + 's');
  }
  return [...expanded];
}

function parseQuery(raw: string) {
  const q = raw.toLowerCase();
  // Price extraction — handles digits AND word-form amounts
  const WORD_AMOUNTS: Record<string,number> = {
    'a dollar':1,'one dollar':1,'a buck':1,'two dollars':2,'five dollars':5,
    'ten dollars':10,'twenty dollars':20,'half a dollar':0.5,'fifty cents':0.5,
  };
  let wordAmount: number | null = null;
  for (const [phrase, val] of Object.entries(WORD_AMOUNTS)) { if (q.includes(phrase)) { wordAmount = val; break; } }
  const underMatch = q.match(/(?:under|below|less than|cheaper than|beneath|<)\s+\$?([\d.]+)/);
  const aboveMatch = q.match(/(?:above|over|at least|more than|>)\s+\$?([\d.]+)/);
  const aroundMatch = q.match(/(?:around|about|approximately|~)\s+\$?([\d.]+)/);
  // "below/under a dollar" — digit-less price phrase
  const belowWordMatch = wordAmount !== null && q.match(/\b(?:under|below|less than|cheaper than|beneath)\b/);
  const maxPrice = belowWordMatch ? wordAmount
    : underMatch ? parseFloat(underMatch[1])
    : wordAmount !== null && !aboveMatch ? wordAmount   // bare "a dollar" with no direction = max
    : aroundMatch ? parseFloat(aroundMatch[1]) * 1.25 : null;
  const minPrice = aboveMatch ? parseFloat(aboveMatch[1]) : aroundMatch ? parseFloat(aroundMatch[1]) * 0.75 : null;
  const catMap: Record<string, string> = {
    laptop: 'electronics', computer: 'electronics', phone: 'electronics',
    headphone: 'electronics', earbud: 'electronics', earbuds: 'electronics', headphones: 'electronics',
    watch: 'electronics', smartwatch: 'electronics', gadget: 'electronics', tech: 'electronics',
    camera: 'electronics', webcam: 'electronics', electronics: 'electronics',
    shirt: 'fashion', jacket: 'fashion', sneaker: 'fashion', sneakers: 'fashion',
    shoe: 'fashion', shoes: 'fashion', dress: 'fashion', clothes: 'fashion', clothing: 'fashion',
    tote: 'fashion', bag: 'fashion', fashion: 'fashion',
    food: 'food', coffee: 'food', tea: 'food', chocolate: 'food', snack: 'food',
    book: 'books', novel: 'books', read: 'books', reading: 'books', books: 'books',
    sport: 'sports', yoga: 'sports', gym: 'sports', fitness: 'sports', mat: 'sports',
    bottle: 'sports', exercise: 'sports', sports: 'sports',
    home: 'home', decor: 'home', lamp: 'home', blanket: 'home', duvet: 'home',
    pillow: 'home', board: 'home', kitchen: 'home', serving: 'home',
    flower: 'flowers', flowers: 'flowers', bouquet: 'flowers', rose: 'flowers',
    orchid: 'flowers', succulent: 'flowers', plant: 'flowers', floral: 'flowers',
    meat: 'meat', steak: 'meat', beef: 'meat', pork: 'meat', sausage: 'meat',
    charcuterie: 'meat', butcher: 'meat', wagyu: 'meat', chorizo: 'meat',
    toy: 'toys', toys: 'toys', game: 'toys', games: 'toys', gaming: 'toys',
    controller: 'toys', puzzle: 'toys', robot: 'toys', robotics: 'toys',
    arcade: 'toys', joystick: 'toys', stem: 'toys',
  };
  // 1. Run phrase patterns first (highest priority, catches natural language)
  let category: string | null = null;
  let intent = 'search';
  let browseAll = false;
  for (const { pattern, category: pc, intent: pi } of PHRASE_PATTERNS) {
    if (pattern.test(q)) {
      if (pc && !category) category = pc;
      if (pi === 'browse') { browseAll = true; }
      else if (pi && intent === 'search') { intent = pi; }
    }
  }
  // 2. Fall back to catMap word-matching for any unrecognised category words
  if (!category) {
    for (const [kw, cat] of Object.entries(catMap)) { if (q.includes(kw)) { category = cat; break; } }
  }
  const buyIntent = /\b(buy|order|purchase|get|checkout|yes|proceed|confirm|do it|let'?s go)\b/.test(q);
  const pickIndex = q.match(/\b(first|1st|top one|that one|this one)\b/) ? 0
    : q.match(/\b(second|2nd)\b/) ? 1 : q.match(/\b(third|3rd)\b/) ? 2 : null;
  const stop = new Set([
    // articles / conjunctions / prepositions
    'a','an','the','and','or','for','me','i','want','need','find','get','buy','show',
    'something','anything','everything','please','looking','with','that','have','in',
    'on','at','is','to','of','my','some','any','all','just','really','very',
    // price / quantity words that aren't product keywords
    'under','below','above','over','around','about','less','more','than','cheaper',
    'cheap','budget','affordable','expensive','price','priced','cost','costs','dollar',
    'dollars','buck','bucks','cent','cents','usd','usdc','worth',
    // generic product words
    'item','items','thing','things','stuff','product','products','good','goods',
    'something','buy','order','purchase','get',
    // intent words already handled
    'best','top','cheapest','gift','present',
  ]);
  const rawKeywords = raw.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !stop.has(w) && !/^\d+$/.test(w));
  const keywords = expandKeywords(rawKeywords);
  return { keywords, rawKeywords, maxPrice, minPrice, category, intent, buyIntent, pickIndex, browseAll };
}

function searchCatalog(query: ReturnType<typeof parseQuery>, browseAll = false): AgentResult[] {
  const results: AgentResult[] = [];
  for (const store of STORES) {
    for (const product of store.products) {
      if (product.inStock === 0) continue;

      // Browse-all: return everything sorted by store rating
      if (browseAll) {
        if (query.maxPrice !== null && product.price > query.maxPrice) continue;
        if (query.minPrice !== null && product.price < query.minPrice) continue;
        results.push({ product, store, score: store.rating * 10, reason: 'in stock' });
        continue;
      }

      // Hard price filters
      if (query.maxPrice !== null && product.price > query.maxPrice) continue;
      if (query.minPrice !== null && product.price < query.minPrice) continue;

      let score = 0;
      const reasons: string[] = [];

      // Category match — hard filter when category is explicit
      if (query.category) {
        if (product.category !== query.category) continue; // hard exclude
        score += 40;
        reasons.push(query.category);
      }

      // Full-text search across name, description, tags, store name
      const searchable = `${product.name} ${product.description} ${product.tags.join(' ')} ${store.name} ${product.category}`.toLowerCase();
      let kwHits = 0;
      const matchedTerms: string[] = [];
      for (const kw of query.keywords) {
        if (searchable.includes(kw)) {
          kwHits++;
          // Name match is worth more than tag/description match
          const nameMatch = product.name.toLowerCase().includes(kw);
          score += nameMatch ? 25 : 15;
          const raw = query.rawKeywords.find(r => kw === r || SYNONYMS[r]?.includes(kw));
          if (raw && !matchedTerms.includes(raw)) matchedTerms.push(raw);
        }
      }
      if (kwHits > 0) reasons.push(matchedTerms.length ? matchedTerms.join(', ') : `${kwHits} keyword${kwHits > 1 ? 's' : ''} matched`);

      // Intent bonuses
      if (query.intent === 'cheapest') score += Math.max(0, (15 - product.price) * 2);
      if (query.intent === 'best_rated') score += store.rating * 5;
      if (query.intent === 'gift') { if (product.price >= 3 && product.price <= 15) score += 12; }

      // Badges
      if (product.inStock <= 3) reasons.push('low stock');
      if (product.price < 3) reasons.push('great value');

      // Baseline: price/category filter with no remaining keywords
      const noKeywords = query.keywords.length === 0;
      if (noKeywords) score = Math.max(score, 10 + store.rating * 2);

      // Only include if net positive score
      if (score > 0) {
        results.push({ product, store, score, reason: reasons.join(' · ') || 'in stock' });
      }
    }
  }

  // Cap: show more when a specific category/price is active
  const cap = (query.category || query.maxPrice !== null || query.minPrice !== null) ? 12 : 6;
  return results.sort((a, b) => b.score - a.score).slice(0, cap);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResultCard({ result, onAddToCart, onViewStore, onBuy, index }: {
  result: AgentResult; onAddToCart: (p: Product, s: Store) => void;
  onViewStore: (s: Store) => void; onBuy: (p: Product, s: Store) => void; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ position: 'relative', height: 100, overflow: 'hidden' }}>
        <img src={result.product.imageUrl} alt={result.product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, ${result.store.gradientFrom}dd 0%, transparent 55%)`,
        }} />
        <div style={{
          position: 'absolute', top: 7, left: 7,
          background: result.store.color, borderRadius: 5, padding: '2px 7px',
          fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.58rem', fontWeight: 700, color: '#fff',
        }}>
          {result.store.name}
        </div>
      </div>
      <div style={{ padding: '9px 10px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.76rem',
          color: 'var(--ink)', lineHeight: 1.2,
        }}>
          {result.product.name}
        </div>
        {result.reason && (
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.62rem',
            color: 'var(--ink-muted)', lineHeight: 1.3,
          }}>
            {result.reason}
          </div>
        )}
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.88rem',
          color: result.store.color, marginTop: 2,
        }}>
          ${result.product.price.toFixed(2)}
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
          <button onClick={() => onBuy(result.product, result.store)} style={{
            flex: 1, background: result.store.color, color: '#fff', border: 'none',
            borderRadius: 8, padding: '5px 0',
            fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.65rem', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
          }}>
            <ShoppingBag size={10} /> Buy
          </button>
          <button onClick={() => onAddToCart(result.product, result.store)} style={{
            flex: 1, background: 'var(--surface)', color: 'var(--ink-secondary)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '5px 0',
            fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.65rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
          }}>
            <ShoppingCart size={10} /> Cart
          </button>
          <button onClick={() => onViewStore(result.store)} style={{
            background: 'var(--surface)', color: 'var(--ink-secondary)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '5px 7px', cursor: 'pointer',
          }}>
            <ArrowRight size={11} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}


function ProfileTab({ profile, onChange, onSave, saved }: {
  profile: DeliveryProfile;
  onChange: (field: keyof DeliveryProfile, value: string) => void;
  onSave: () => void; saved: boolean;
}) {
  const fields: { key: keyof DeliveryProfile; label: string; placeholder: string; type?: string }[] = [
    { key: 'fullName', label: 'Full Name', placeholder: 'Jane Smith' },
    { key: 'email', label: 'Email', placeholder: 'jane@example.com', type: 'email' },
    { key: 'street', label: 'Street Address', placeholder: '42 Main Street' },
    { key: 'city', label: 'City', placeholder: 'New York' },
    { key: 'state', label: 'State / Province', placeholder: 'NY' },
    { key: 'zip', label: 'ZIP / Postal Code', placeholder: '10001' },
    { key: 'country', label: 'Country', placeholder: 'United States' },
  ];

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 9,
    padding: '8px 11px', fontFamily: 'Plus Jakarta Sans, sans-serif',
    fontSize: '0.78rem', color: 'var(--ink)', outline: 'none',
  };

  return (
    <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.88rem',
        color: 'var(--ink)', marginBottom: 2,
      }}>
        Delivery Profile
      </div>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.7rem',
        color: 'var(--ink-secondary)', marginBottom: 4,
      }}>
        Saved once. The agent uses this to place orders on your behalf.
      </div>
      {fields.map(f => (
        <div key={f.key}>
          <label style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.67rem',
            fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4,
          }}>
            {f.label}
          </label>
          <input
            type={f.type ?? 'text'}
            value={profile[f.key]}
            onChange={e => onChange(f.key, e.target.value)}
            placeholder={f.placeholder}
            style={inp}
          />
        </div>
      ))}
      <motion.button
        whileTap={{ scale: 0.97 }} onClick={onSave}
        style={{
          marginTop: 4, padding: '10px 0', border: 'none',
          borderRadius: 10, cursor: 'pointer', fontWeight: 700,
          fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.8rem',
          background: saved ? '#22c55e' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff', transition: 'background 0.3s',
        }}
      >
        {saved ? '✓ Saved!' : 'Save Profile'}
      </motion.button>
    </div>
  );
}

function WalletCardRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>{value}</div>
    </div>
  );
}

const ESCROW_ABI_CONFIRM = [{ name: 'confirmReceipt', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'orderId', type: 'bytes32' }], outputs: [] }] as const;
const ESCROW_ADDR = (import.meta.env.VITE_ESCROW_ADDRESS ?? '') as `0x${string}`;

function EscrowOrderRow({ order, onConfirmed }: { order: import('../types').Order; onConfirmed: (id: string) => void }) {
  const { writeContract, data: confirmHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: confirmHash });

  useEffect(() => { if (isSuccess) onConfirmed(order.id); }, [isSuccess, order.id, onConfirmed]);

  const handleConfirm = () => {
    if (!order.escrowOrderId || !ESCROW_ADDR) return;
    writeContract({ address: ESCROW_ADDR, abi: ESCROW_ABI_CONFIRM, functionName: 'confirmReceipt', args: [order.escrowOrderId as `0x${string}`], chainId: ARC_CHAIN_ID });
  };

  return (
    <div style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: 14, padding: '13px 15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.78rem', color: 'var(--ink)' }}>
          {order.items?.[0]?.product?.name ?? 'Order'}
        </div>
        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.67rem', fontWeight: 600, background: 'rgba(251,191,36,0.18)', color: '#b45309', borderRadius: 6, padding: '2px 7px' }}>Awaiting confirmation</span>
      </div>
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.64rem', color: 'var(--ink-tertiary)', marginBottom: 10 }}>
        {new Date(order.timestamp).toLocaleString()} · ${order.total?.toFixed(2) ?? '—'}
      </div>
      <button
        onClick={handleConfirm}
        disabled={isPending || isConfirming || !ESCROW_ADDR}
        style={{
          width: '100%', padding: '9px 0', borderRadius: 9, border: 'none', cursor: isPending || isConfirming ? 'not-allowed' : 'pointer',
          background: isPending || isConfirming ? 'rgba(251,191,36,0.3)' : 'linear-gradient(135deg,#f59e0b,#d97706)',
          color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.75rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        {isPending ? 'Signing…' : isConfirming ? 'Confirming…' : '✓ I received my order — Release Payment'}
      </button>
      {confirmHash && (
        <a href={buildTxExplorerUrl(ARC_CHAIN_ID, confirmHash)} target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', marginTop: 6, fontFamily: 'monospace', fontSize: '0.62rem', color: '#0891b2', textDecoration: 'none' }}>
          {confirmHash.slice(0, 12)}…{confirmHash.slice(-6)} ↗
        </a>
      )}
    </div>
  );
}

function AgentOrderRow({ order, onConfirmed }: { order: AgentOrder; onConfirmed: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = () => {
    setConfirming(true);
    // Small delay for UX feedback before removing from pending
    setTimeout(() => { onConfirmed(order.id); }, 600);
  };

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${order.confirmed ? 'var(--border)' : 'rgba(180,83,9,0.25)'}`, borderRadius: 14, padding: '13px 15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.78rem', color: 'var(--ink)' }}>{order.productName}</div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.67rem', color: 'var(--ink-secondary)', marginTop: 1 }}>{order.storeName}</div>
        </div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.82rem', color: '#059669' }}>${order.price.toFixed(2)}</div>
      </div>
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.64rem', color: 'var(--ink-tertiary)', marginBottom: 8 }}>
        {new Date(order.paidAt).toLocaleString()} · to {order.deliveryName}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <a href={order.explorerUrl} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 7, padding: '4px 9px', textDecoration: 'none', fontFamily: 'monospace', fontSize: '0.63rem', color: '#0891b2' }}>
          {order.txHash.slice(0, 10)}…{order.txHash.slice(-6)} ↗
        </a>
        {!order.confirmed && (
          <button
            onClick={handleConfirm}
            disabled={confirming}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: confirming ? 'rgba(5,150,105,0.12)' : 'rgba(5,150,105,0.08)',
              border: '1px solid rgba(5,150,105,0.3)',
              borderRadius: 7, padding: '4px 10px',
              fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: '0.63rem',
              color: '#059669', cursor: confirming ? 'default' : 'pointer',
            }}
          >
            {confirming ? '✓ Confirmed' : '✓ Confirm order received'}
          </button>
        )}
        {order.confirmed && (
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.63rem', color: '#059669', fontWeight: 600 }}>
            ✓ Received
          </span>
        )}
      </div>
    </div>
  );
}

function OrdersTab() {
  const [agentOrders, setAgentOrders] = useState<AgentOrder[]>(() => loadAgentOrders());
  const [escrowOrders, setEscrowOrders] = useState<import('../types').Order[]>(() => {
    try { return (JSON.parse(localStorage.getItem('vm_orders') ?? '[]') as unknown as import('../types').Order[]).filter(o => o.status === 'escrow_pending'); }
    catch { return []; }
  });

  // Confirm escrow order on-chain, then update vm_orders
  const handleConfirmed = (id: string) => {
    setEscrowOrders(prev => prev.filter(o => o.id !== id));
    try {
      const all = JSON.parse(localStorage.getItem('vm_orders') ?? '[]') as unknown as import('../types').Order[];
      localStorage.setItem('vm_orders', JSON.stringify(all.map(o => o.id === id ? { ...o, status: 'confirmed' } : o)));
    } catch { /* ignore */ }
  };

  // Locally confirm an agent order (no on-chain step needed — direct transfer)
  const handleAgentConfirmed = (id: string) => {
    setAgentOrders(prev => {
      const updated = prev.map(o => o.id === id ? { ...o, confirmed: true } : o);
      try { localStorage.setItem(ORDERS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  };

  const pendingAgentOrders = agentOrders.filter(o => !o.confirmed);
  const confirmedAgentOrders = agentOrders.filter(o => o.confirmed);
  const total = agentOrders.length + escrowOrders.length;

  if (total === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, paddingTop: 48, opacity: 0.6 }}>
        <Clock size={28} color="var(--ink-secondary)" />
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.78rem', color: 'var(--ink-secondary)' }}>No orders yet</div>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.68rem', color: 'var(--ink-tertiary)', textAlign: 'center', maxWidth: 200 }}>
          Your purchases will appear here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {escrowOrders.length > 0 && (
        <>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Awaiting your confirmation
          </div>
          {escrowOrders.map(o => <EscrowOrderRow key={o.id} order={o} onConfirmed={handleConfirmed} />)}
          {agentOrders.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />}
        </>
      )}
      {pendingAgentOrders.length > 0 && (
        <>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Awaiting your confirmation
          </div>
          {pendingAgentOrders.map(order => (
            <AgentOrderRow key={order.id} order={order} onConfirmed={handleAgentConfirmed} />
          ))}
          {confirmedAgentOrders.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />}
        </>
      )}
      {confirmedAgentOrders.length > 0 && (
        <>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Received
          </div>
          {confirmedAgentOrders.map(order => (
            <AgentOrderRow key={order.id} order={order} onConfirmed={handleAgentConfirmed} />
          ))}
        </>
      )}
    </div>
  );
}

function WalletTab({ agentWallet }: { agentWallet: ReturnType<typeof useAgentWallet> }) {
  const { address, isConnected } = useAccount();
  const circleCtxForSend = useContext(UserWalletContext);
  const circleWallet = circleCtxForSend?.wallet ?? null;
  const usdcFact = getUsdc(ARC_CHAIN_ID);
  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: usdcFact?.address as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!usdcFact, refetchInterval: 15_000 },
  });
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [fundAmount, setFundAmount] = useState('10');
  const [sendMode, setSendMode] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sendAmt, setSendAmt] = useState('');
  const [sendStatus, setSendStatus] = useState<'idle'|'sending'|'done'|'error'>('idle');
  const [sendTxHash, setSendTxHash] = useState('');
  const [sendError, setSendError] = useState('');
  const [backedUp, setBackedUp] = useState(() => localStorage.getItem('vm_agent_backed_up') === '1');
  const [importMode, setImportMode] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [importError, setImportError] = useState('');

  const handleExportKey = () => { setKeyRevealed(r => !r); };

  const handleSendFromAgent = async () => {
    const to = sendTo.trim();
    const amt = parseFloat(sendAmt);
    if (!/^0x[0-9a-fA-F]{40}$/.test(to)) { setSendError('Invalid address — must be 42 chars (0x + 40 hex)'); return; }
    if (!amt || amt <= 0) { setSendError('Enter a valid amount'); return; }
    setSendStatus('sending'); setSendError('');
    try {
      const result = await agentWallet.sendUsdc(to as `0x${string}`, amt);
      // Circle user-controlled wallets return a challengeId (UUID), not a 0x tx hash
      if (result && !result.startsWith('0x')) {
        // Execute the PIN challenge via the context so the user confirms with their PIN
        if (circleCtxForSend?.executeChallenge) {
          await circleCtxForSend.executeChallenge(result);
        }
        setSendTxHash(result);
      } else {
        setSendTxHash(result);
      }
      setSendStatus('done');
      setTimeout(() => void agentWallet.refreshBalance(), 4000);
    } catch (e) {
      setSendError(e instanceof Error ? e.message.slice(0, 80) : 'Send failed');
      setSendStatus('error');
    }
  };

  const handleImport = () => {
    setImportError('');
    const raw = importKey.trim().replace(/^0x/, '');
    if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
      setImportError('Invalid key — must be 64 hex characters.');
      return;
    }
    try {
      localStorage.setItem('vm_agent_pk', btoa(String.fromCharCode(...Array.from({ length: raw.length / 2 }, (_, i) => parseInt(raw.slice(i * 2, i * 2 + 2), 16) ^ 0x5a))));
      localStorage.setItem('vm_agent_backed_up', '1');
      window.location.reload();
    } catch {
      setImportError('Failed to import key.');
    }
  };

  // Fund agent wallet via USDC transfer from connected wallet
  const { writeContract: fundWrite, data: fundTxHash, isPending: fundPending, error: fundError } = useWriteContract();
  const { isLoading: fundConfirming, isSuccess: fundConfirmed } = useWaitForTransactionReceipt({ hash: fundTxHash });

  useEffect(() => {
    if (fundConfirmed) {
      void refetchBalance();
      void agentWallet.refreshBalance();
      setTimeout(() => { void agentWallet.refreshBalance(); void refetchBalance(); }, 5000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundConfirmed]);

  const fundSuccess = fundConfirmed;

  const handleFund = () => {
    if (!usdcFact) return;
    const amt = parseFloat(fundAmount);
    if (isNaN(amt) || amt <= 0) return;
    const raw = parseAmount(ARC_CHAIN_ID, String(amt));
    fundWrite({
      address: usdcFact.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [agentWallet.address, raw.raw],
      chainId: ARC_CHAIN_ID,
    });
  };

  const usdcVal = rawBalance != null ? parseFloat(formatUsdc(rawBalance)) : null;
  const canAutoPay = parseFloat(agentWallet.usdcBalance) > 0;

  return (
    <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Wallet card */}
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.78rem', color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Your Wallet
      </div>

      {!isConnected ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 12, padding: '24px 16px', textAlign: 'center',
          background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Wallet size={22} color="#6366f1" />
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>
            No wallet connected
          </div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.72rem', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
            Connect a wallet from the top-right corner to enable autonomous purchases. The agent will use your connected wallet to pay directly — no extra steps.
          </div>
        </div>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: 16, padding: '18px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -24, right: -24, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'absolute', bottom: -14, left: -14, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.65)', marginBottom: 6, letterSpacing: '0.1em' }}>
            AGENT WALLET · ARC TESTNET
          </div>
          <div style={{ marginBottom: 14 }}>
            <CopyField value={address!} label="ADDRESS" />
          </div>
          <WalletCardRow label="USDC BALANCE" value={usdcVal != null ? `${usdcVal.toFixed(2)} USDC` : 'Loading…'} />
          <button
            onClick={() => {
              void (window as unknown as { ethereum?: { request: (a: unknown) => Promise<unknown> } }).ethereum?.request({
                method: 'wallet_watchAsset',
                params: { type: 'ERC20', options: { address: usdcFact?.address, symbol: 'USDC', decimals: 6, name: 'USD Coin' } },
              });
            }}
            style={{
              marginTop: 8, padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.12)', color: 'white', cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.7rem', fontWeight: 600,
            }}
          >
            + Add USDC to MetaMask
          </button>
          {usdcVal === 0 && (
            <div style={{
              marginTop: 10, padding: '7px 11px',
              background: 'rgba(255,255,255,0.14)', borderRadius: 8,
              fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.67rem', color: 'rgba(255,255,255,0.9)',
            }}>
              Get test USDC from the "Get test USDC" button in the sidebar to enable autonomous purchases.
            </div>
          )}
        </div>
      )}

      {/* Browser agent wallet card */}
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.78rem', color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Agent Wallet
      </div>
      <div style={{
        background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
        borderRadius: 16, padding: '18px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -24, right: -24, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.65)', marginBottom: 6, letterSpacing: '0.1em' }}>
          YOUR AGENT · ARC TESTNET · {agentWallet.isLoading ? 'Loading…' : 'Ready'}
        </div>
        {/* Backup warning — only show for local key, not Circle wallet */}
        {!circleWallet && !backedUp && (
          <div style={{
            marginBottom: 12, padding: '8px 11px', borderRadius: 8,
            background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.4)',
            fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.66rem', color: 'rgba(255,230,100,0.95)', lineHeight: 1.5,
          }}>
            ⚠️ Back up your private key below before adding funds. Clearing browser data without a backup means permanent loss.
          </div>
        )}
        {!circleWallet && backedUp && (
          <div style={{
            marginBottom: 12, padding: '6px 10px', borderRadius: 8,
            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
            fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.66rem', color: 'rgba(100,255,180,0.9)',
          }}>
            ✓ Private key backed up — your wallet is recoverable.
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <CopyField value={agentWallet.isLoading ? '…' : agentWallet.address} label="ADDRESS" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <WalletCardRow label="USDC BALANCE" value={`$${parseFloat(agentWallet.usdcBalance).toFixed(2)} USDC`} />
          <button onClick={() => { void agentWallet.refreshBalance(); }} title="Refresh balance"
            style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Fund from connected wallet */}
        {isConnected && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="number" min="1" step="1" value={fundAmount}
                onChange={e => setFundAmount(e.target.value)}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)',
                  borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: '0.8rem',
                  fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, outline: 'none', minWidth: 0,
                }}
                placeholder="Amount (USDC)"
              />
              <button onClick={handleFund} disabled={fundPending || fundConfirming}
                style={{
                  background: fundSuccess ? 'rgba(16,185,129,0.9)' : 'rgba(255,255,255,0.22)',
                  border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                  color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 5,
                  opacity: fundPending || fundConfirming ? 0.7 : 1,
                }}>
                {fundSuccess ? <><Check size={11} /> Funded!</> :
                 fundConfirming ? <><Loader size={11} className="animate-spin" /> Confirming…</> :
                 fundPending ? <><Loader size={11} className="animate-spin" /> Sign…</> :
                 <>Fund wallet</>}
              </button>
            </div>
            {fundError && <div style={{ fontSize: '0.65rem', color: 'rgba(255,180,180,0.9)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{fundError.message.slice(0, 80)}</div>}
            {fundTxHash && !fundSuccess && (
              <a href={buildTxExplorerUrl(ARC_CHAIN_ID, fundTxHash)} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace' }}>
                {fundTxHash.slice(0, 14)}… ↗
              </a>
            )}
          </div>
        )}
        {!isConnected && (
          <div style={{ marginTop: 10, padding: '7px 11px', background: 'rgba(255,255,255,0.14)', borderRadius: 8, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.67rem', color: 'rgba(255,255,255,0.9)' }}>
            Connect your wallet to fund this agent wallet directly.
          </div>
        )}

        {/* Send from agent wallet */}
        <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 12 }}>
          <button onClick={() => { setSendMode(m => !m); setSendStatus('idle'); setSendError(''); setSendTxHash(''); }}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#fff',
              fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.7rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center',
            }}>
            {sendMode ? 'Cancel' : '↗ Send USDC from agent wallet'}
          </button>
          {sendMode && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <input value={sendTo} onChange={e => setSendTo(e.target.value)} placeholder="Recipient address (0x…)"
                style={{
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8,
                  padding: '7px 10px', color: '#fff', fontSize: '0.72rem',
                  fontFamily: 'monospace', outline: 'none', width: '100%', boxSizing: 'border-box',
                }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" min="0.01" step="0.01" value={sendAmt} onChange={e => setSendAmt(e.target.value)}
                  placeholder="Amount (USDC)"
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)',
                    borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: '0.8rem',
                    fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, outline: 'none', minWidth: 0,
                  }} />
                <button onClick={() => { void handleSendFromAgent(); }} disabled={sendStatus === 'sending'}
                  style={{
                    background: sendStatus === 'done' ? 'rgba(16,185,129,0.9)' : 'rgba(255,255,255,0.22)',
                    border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                    color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 5,
                    opacity: sendStatus === 'sending' ? 0.7 : 1,
                  }}>
                  {sendStatus === 'done' ? <><Check size={11} /> Sent!</> :
                   sendStatus === 'sending' ? <><Loader size={11} className="animate-spin" /> Sending…</> :
                   <>Send</>}
                </button>
              </div>
              {sendError && <div style={{ fontSize: '0.65rem', color: 'rgba(255,180,180,0.9)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{sendError}</div>}
              {sendStatus === 'done' && sendTxHash && (
                <a href={buildTxExplorerUrl(ARC_CHAIN_ID, sendTxHash)} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.63rem', color: 'rgba(180,255,200,0.9)', fontFamily: 'monospace' }}>
                  {sendTxHash.slice(0, 16)}… ↗ View on explorer
                </a>
              )}
            </div>
          )}
        </div>

        {/* Backup / export key — only for local key wallet, not Circle wallet */}
        {!circleWallet && <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <button onClick={handleExportKey} style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#fff',
            fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.7rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center',
          }}>
            {keyRevealed ? <><Check size={12} /> Hide private key</> : <>🔑 Backup private key</>}
          </button>
          {keyRevealed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <CopyField value={agentWallet.exportKey()} label="PRIVATE KEY" onCopy={() => { localStorage.setItem('vm_agent_backed_up', '1'); setBackedUp(true); }} />
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.61rem', color: 'rgba(255,220,100,0.9)', lineHeight: 1.4 }}>
                ⚠️ Import into MetaMask via Add Account → Import Account to recover this wallet on any device.
              </div>
            </div>
          )}
          {/* Import existing key */}
          <button onClick={() => { setImportMode(m => !m); setImportError(''); }}
            style={{
              marginTop: 4, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 8, padding: '5px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.75)',
              fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.67rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 5, width: '100%', justifyContent: 'center',
            }}>
            {importMode ? 'Cancel import' : '↩ Restore existing wallet'}
          </button>
          {importMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              <input
                type="password" value={importKey} onChange={e => setImportKey(e.target.value)}
                placeholder="Paste your 64-char private key (no 0x)"
                style={{
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8,
                  padding: '7px 10px', color: '#fff', fontSize: '0.72rem',
                  fontFamily: 'monospace', outline: 'none', width: '100%', boxSizing: 'border-box',
                }}
              />
              {importError && <div style={{ fontSize: '0.63rem', color: 'rgba(255,150,150,0.9)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{importError}</div>}
              <button onClick={handleImport} style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 8,
                padding: '7px 0', cursor: 'pointer', color: '#fff',
                fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.72rem', fontWeight: 700,
              }}>
                Import & reload
              </button>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'Plus Jakarta Sans, sans-serif', lineHeight: 1.4 }}>
                This replaces the current agent wallet. The page will reload.
              </div>
            </div>
          )}
        </div>}
      </div>

      {/* How autonomous payments work */}
      <div style={{
        background: 'var(--surface)', borderRadius: 12, padding: '13px 14px',
        border: '1px solid var(--border)',
      }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.73rem', color: 'var(--ink)', marginBottom: 8 }}>
          How autonomous payments work
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { n: '1', text: 'Save your delivery details in the Profile tab' },
            { n: '2', text: 'Fund your agent wallet from the Wallet tab (no MetaMask popup needed)' },
            { n: '3', text: 'Tell the agent what you want to buy' },
            { n: '4', text: 'The agent searches and opens checkout — pre-filled and ready to pay' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: '#6366f1',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.6rem', color: '#fff',
              }}>{s.n}</div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.7rem', color: 'var(--ink-secondary)', lineHeight: 1.45 }}>
                {s.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Capability list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {[
          { icon: '🤖', title: 'Autonomous checkout', desc: 'Opens pre-filled checkout instantly', active: canAutoPay },
          { icon: '🔍', title: 'Natural language search', desc: 'Any phrase, any category', active: true },
          { icon: '📦', title: 'Profile pre-fill', desc: 'Saved delivery details', active: true },
          { icon: '🏷️', title: 'Price filtering', desc: 'Budget-aware search', active: true },
        ].map(cap => (
          <div key={cap.title} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            background: 'var(--surface)', borderRadius: 10, padding: '8px 11px',
            border: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: '0.95rem' }}>{cap.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: '0.72rem', color: 'var(--ink)' }}>{cap.title}</div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.63rem', color: 'var(--ink-secondary)' }}>{cap.desc}</div>
            </div>
            <CheckCircle size={13} color={cap.active ? '#22c55e' : 'var(--border)'} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AgentShopper({ isOpen, onClose, onAddToCart, onEnterStore, onCheckout }: AgentShopperProps) {
  const agentWallet = useAgentWallet();
  const [tab, setTab] = useState<Tab>('chat');
  const [messages, setMessages] = useState<Message[]>(() => [{
    id: 'welcome', role: 'agent', timestamp: new Date(),
    content: { type: 'text', text: "Hey! I'm your shopping agent. Tell me what you're looking for — budget, category, or anything — and I'll search the entire mall." },
  }]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [lastResults, setLastResults] = useState<AgentResult[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<DeliveryProfile>(() => {
    try { const s = localStorage.getItem(PROFILE_KEY); if (s) return JSON.parse(s) as DeliveryProfile; } catch { /* */ }
    return { fullName: '', email: '', street: '', city: '', state: '', zip: '', country: '' };
  });
  const [profileSaved, setProfileSaved] = useState(false);

  const handleSaveProfile = () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const profileComplete = !!(profile.fullName && profile.email && profile.street && profile.city && profile.country);

  const addMessage = useCallback((role: Message['role'], content: MessageContent) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, role, content, timestamp: new Date() }]);
  }, []);

  const handleBuy = useCallback((product: Product, store: Store) => {
    if (!profileComplete) {
      addMessage('agent', { type: 'text', text: "I need your delivery details first. Head to the **Profile** tab and fill in your address." });
      setTab('profile');
      return;
    }

    // Use in-browser agent wallet — fully silent, no wallet popup
    const agentBal = parseFloat(agentWallet.usdcBalance);
    if (agentBal < product.price) {
      addMessage('agent', {
        type: 'text',
        text: `Your agent wallet only has $${agentBal.toFixed(2)} USDC — not enough for **${product.name}** ($${product.price.toFixed(2)}). Go to the Wallet tab to fund it, then try again.`,
      });
      setTab('wallet');
      return;
    }

    addMessage('agent', { type: 'text', text: `Paying for **${product.name}** — $${product.price.toFixed(2)} USDC from your agent wallet…` });

    const MERCHANT = (import.meta.env.VITE_MERCHANT_ADDRESS ?? '0xEA1d5555d707086622181Ac64c43DB6860868f0E') as `0x${string}`;

    agentWallet.sendUsdc(MERCHANT, product.price)
      .then((txHash) => {
        const order: AgentOrder = {
          id: txHash,
          productName: product.name,
          storeName: store.name,
          price: product.price,
          txHash,
          explorerUrl: buildTxExplorerUrl(ARC_CHAIN_ID, txHash),
          deliveryName: profile.fullName || 'you',
          deliveryAddress: [profile.street, profile.city, profile.country].filter(Boolean).join(', '),
          paidAt: new Date().toISOString(),
        };
        saveAgentOrder(order);
        addMessage('agent', { type: 'order_success', order });
      })
      .catch(() => {
        addMessage('agent', {
          type: 'text',
          text: `Opening checkout for **${product.name}** — $${product.price.toFixed(2)} USDC. Your saved details are pre-filled.`,
        });
        setTimeout(() => { onCheckout(product, store, profile); }, 600);
      });
  }, [profileComplete, profile, addMessage, onCheckout, agentWallet]);

  const handleSend = useCallback(async () => {
    const raw = input.trim();
    if (!raw || isThinking) return;
    setInput('');
    addMessage('user', { type: 'text', text: raw });
    setIsThinking(true);
    const query = parseQuery(raw);

    // If user explicitly picks an item from last results to buy
    if (query.buyIntent && lastResults.length > 0) {
      const idx = query.pickIndex ?? 0;
      const target = lastResults[idx] ?? lastResults[0];
      setIsThinking(false);
      handleBuy(target.product, target.store);
      return;
    }

    // Use browseAll from phrase pattern detection
    const isBrowse = query.browseAll || /\b(everything|all|browse|show all|anything)\b/.test(raw.toLowerCase());

    await new Promise(r => setTimeout(r, 400));
    const steps = [
      `Scanning ${STORES.length} stores · ${STORES.reduce((n, s) => n + s.products.length, 0)} products`,
      query.maxPrice ? `Budget cap: $${query.maxPrice.toFixed(2)} USDC` : null,
      query.category ? `Category: ${query.category}` : null,
      query.rawKeywords.length > 0 ? `Keywords: ${query.rawKeywords.slice(0, 3).join(', ')}` : null,
    ].filter(Boolean) as string[];
    addMessage('agent', { type: 'thinking', steps });

    await new Promise(r => setTimeout(r, 600 + steps.length * 150));
    const results = searchCatalog(query, isBrowse);
    setLastResults(results);
    setIsThinking(false);

    if (results.length === 0) {
      // Fallback: if category was set, show all items in that category; else browse all
      const fallbackQuery = query.category
        ? { ...query, keywords: [], rawKeywords: [] }  // same category, no keyword filter
        : query;
      const fallback = searchCatalog(fallbackQuery, !query.category);
      if (fallback.length > 0) {
        const msg = query.category
          ? `No exact match, but here's everything we have in **${query.category}**:`
          : "I didn't find an exact match, but here's what we have in stock:";
        addMessage('agent', { type: 'text', text: msg });
        addMessage('agent', { type: 'results', results: fallback.slice(0, 6) });
      } else {
        addMessage('agent', { type: 'text', text: "Nothing in stock matches that right now. Try a different category or raise your budget." });
      }
      setIsThinking(false);
      return;
    }

    // Show results then wait for the user to click Buy on a card
    addMessage('agent', { type: 'results', results });

    const best = results[0];
    if (results.length === 1) {
      addMessage('agent', {
        type: 'text',
        text: `Found **${best.product.name}** from ${best.store.name} — $${best.product.price.toFixed(2)} USDC. Click **Buy** to confirm.`,
      });
    } else {
      addMessage('agent', {
        type: 'text',
        text: `Found ${results.length} matches. Top pick: **${best.product.name}** — $${best.product.price.toFixed(2)} USDC. Click **Buy** on any item to confirm.`,
      });
    }
  }, [input, isThinking, lastResults, addMessage, handleBuy]);

  // ─── Styles ──────────────────────────────────────────────────────────────

  const tabBtn = (t: Tab): React.CSSProperties => ({
    flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
    borderRadius: 8, transition: 'all 0.18s',
    background: tab === t ? '#6366f1' : 'transparent',
    color: tab === t ? '#fff' : 'var(--ink-muted)',
    fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.7rem', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="ab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', zIndex: 1100 }}
          />
          <motion.div
            key="ap"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 38 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '100vw',
              background: 'var(--bg)', borderLeft: '1px solid var(--border)',
              boxShadow: '-12px 0 60px rgba(0,0,0,0.22)',
              zIndex: 1101, display: 'flex', flexDirection: 'column',
            }}
          >
            {/* ── Header ───────────────────────────────────────────────── */}
            <div style={{
              padding: '14px 16px 12px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 11,
            }}>
              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px rgba(99,102,241,0.4)',
              }}>
                <Bot size={18} color="#fff" />
              </div>

              {/* Title */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.92rem', color: 'var(--ink)' }}>
                  Shopping Agent
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}
                  />
                  <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.63rem', color: '#22c55e', fontWeight: 600 }}>
                    Online · {STORES.length} stores indexed
                  </span>
                </div>
              </div>

              {/* Close */}
              <button onClick={onClose} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '6px 7px', cursor: 'pointer', color: 'var(--ink-secondary)',
                display: 'flex', alignItems: 'center',
              }}>
                <X size={15} />
              </button>
            </div>

            {/* ── Tabs ─────────────────────────────────────────────────── */}
            <div style={{
              padding: '6px 10px', display: 'flex', gap: 3,
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface)',
            }}>
              <button style={tabBtn('chat')} onClick={() => setTab('chat')}>
                <Bot size={12} /> Chat
              </button>
              <button style={tabBtn('profile')} onClick={() => setTab('profile')}>
                <User size={12} /> Profile
                {!profileComplete && <AlertCircle size={10} color="#f59e0b" />}
              </button>
              <button style={tabBtn('wallet')} onClick={() => setTab('wallet')}>
                <Wallet size={12} /> Wallet
              </button>
              <button style={tabBtn('orders')} onClick={() => setTab('orders')}>
                <Clock size={12} /> Orders
              </button>
              <button style={tabBtn('api')} onClick={() => setTab('api')}>
                <Zap size={12} /> API
              </button>
            </div>

            {/* ── Tab content ──────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
              {tab === 'profile' && (
                <motion.div key="pt" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }} style={{ flex: 1, overflow: 'hidden' }}>
                  <ProfileTab profile={profile} onChange={(f, v) => setProfile(p => ({ ...p, [f]: v }))}
                    onSave={handleSaveProfile} saved={profileSaved} />
                </motion.div>
              )}

              {tab === 'wallet' && (
                <motion.div key="wt" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }} style={{ flex: 1, overflow: 'hidden' }}>
                  <WalletTab agentWallet={agentWallet} />
                </motion.div>
              )}

              {tab === 'orders' && (
                <motion.div key="ot" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }} style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
                  <OrdersTab />
                </motion.div>
              )}

              {tab === 'api' && (
                <motion.div key="at" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }} style={{ flex: 1, overflowY: 'auto' }}>
                  <AgentAPIPage embedded />
                </motion.div>
              )}

              {tab === 'chat' && (
                <motion.div key="ct" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                  {/* Messages scroll area */}
                  <div style={{
                    flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}>

                    {/* Quick suggestions */}
                    {messages.length === 1 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 4 }}>
                        {SUGGESTIONS.map(s => (
                          <motion.button
                            key={s} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => setInput(s)}
                            style={{
                              background: 'var(--surface)', border: '1px solid var(--border)',
                              borderRadius: 18, padding: '5px 12px',
                              fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.67rem',
                              color: 'var(--ink-secondary)', cursor: 'pointer',
                            }}>
                            {s}
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {/* Message list */}
                    {messages.map(msg => (
                      <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 6,
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>

                        {/* User bubble */}
                        {msg.role === 'user' && msg.content.type === 'text' && (
                          <div style={{
                            background: '#6366f1', color: '#fff',
                            borderRadius: '16px 16px 4px 16px',
                            padding: '9px 14px', maxWidth: '80%',
                            fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.78rem', lineHeight: 1.5,
                          }}>
                            {msg.content.text}
                          </div>
                        )}

                        {/* Agent text bubble */}
                        {msg.role === 'agent' && msg.content.type === 'text' && (
                          <div style={{
                            background: 'var(--card)', border: '1px solid var(--border)',
                            borderRadius: '4px 16px 16px 16px',
                            padding: '9px 14px', maxWidth: '86%',
                            fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.78rem',
                            color: 'var(--ink)', lineHeight: 1.55,
                          }}>
                            {msg.content.text.split('**').map((part, i) =>
                              i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
                            )}
                          </div>
                        )}

                        {/* Thinking block */}
                        {msg.content.type === 'thinking' && (
                          <div style={{
                            background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)',
                            borderRadius: 10, padding: '8px 12px',
                            display: 'flex', flexDirection: 'column', gap: 5, maxWidth: '90%',
                          }}>
                            {msg.content.steps.map((step, i) => (
                              <motion.div key={i}
                                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                                  fontSize: '0.67rem', color: '#6366f1',
                                }}>
                                <Loader size={9} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                                {step}
                              </motion.div>
                            ))}
                          </div>
                        )}

                        {/* Result cards grid */}
                        {msg.content.type === 'results' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
                            {msg.content.results.map((r, i) => (
                              <ResultCard key={r.product.id} result={r} index={i}
                                onAddToCart={onAddToCart}
                                onViewStore={s => { onEnterStore(s); onClose(); }}
                                onBuy={handleBuy}
                              />
                            ))}
                          </div>
                        )}
                        {msg.content.type === 'order_success' && (
                          <div style={{
                            background: 'linear-gradient(135deg, #065f46 0%, #0f766e 100%)',
                            borderRadius: 14, padding: '14px 16px', width: '100%',
                            border: '1px solid rgba(52,211,153,0.3)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                              <CheckCircle size={16} color="#34d399" />
                              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.82rem', color: '#fff' }}>Payment Successful</span>
                            </div>
                            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>
                              <strong>{msg.content.order.productName}</strong> · ${msg.content.order.price.toFixed(2)} USDC
                            </div>
                            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
                              Delivering to {msg.content.order.deliveryName} · {msg.content.order.deliveryAddress}
                            </div>
                            <a href={msg.content.order.explorerUrl} target="_blank" rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)',
                                borderRadius: 8, padding: '5px 10px', textDecoration: 'none',
                                fontFamily: 'monospace', fontSize: '0.65rem', color: '#6ee7b7',
                              }}>
                              {msg.content.order.txHash.slice(0, 12)}…{msg.content.order.txHash.slice(-6)} ↗
                            </a>
                            <button onClick={() => setTab('orders')} style={{
                              marginLeft: 8, background: 'rgba(255,255,255,0.12)', border: 'none',
                              borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                              fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.68rem',
                              fontWeight: 600, color: '#fff',
                            }}>View orders</button>
                          </div>
                        )}


                      </div>
                    ))}

                    {/* Typing indicator */}
                    {isThinking && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 }}>
                        {[0, 1, 2].map(i => (
                          <motion.div key={i}
                            animate={{ y: [0, -4, 0] }}
                            transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.12 }}
                            style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', opacity: 0.7 }}
                          />
                        ))}
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* ── Input bar ──────────────────────────────────────── */}
                  <div style={{
                    padding: '10px 12px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex', gap: 8, alignItems: 'center',
                    background: 'var(--surface)',
                  }}>
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && void handleSend()}
                      placeholder="Ask me anything…"
                      style={{
                        flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 22, padding: '9px 16px',
                        fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.78rem',
                        color: 'var(--ink)', outline: 'none',
                      }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={() => void handleSend()}
                      disabled={!input.trim() || isThinking}
                      style={{
                        width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
                        background: input.trim() && !isThinking ? '#6366f1' : 'var(--border)',
                        cursor: input.trim() && !isThinking ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s',
                        boxShadow: input.trim() && !isThinking ? '0 0 14px rgba(99,102,241,0.4)' : 'none',
                      }}
                    >
                      <Send size={14} color={input.trim() && !isThinking ? '#fff' : 'var(--ink-muted)'} />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
