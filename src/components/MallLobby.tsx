import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Star, Search, MapPin, ChevronRight, Zap, ShoppingBag } from 'lucide-react';
import { STORES, CATEGORY_LABELS } from '../data/marketplace';
import type { Store } from '../data/marketplace';
import { ParallaxTilt } from './ParallaxTilt';
import { ScrollReveal } from './ScrollReveal';
import { AnimatedHeadline } from './AnimatedHeadline';
import { LiveClock } from './LiveClock';
import { FeaturedSpotlight } from './FeaturedSpotlight';
import { FloatingTokens } from './FloatingTokens';

interface MallLobbyProps {
  onEnterStore: (store: Store) => void;
  onDigitalMarket: () => void;
  onAgentOpen: () => void;
}

const CATEGORY_FILTERS = ['all', 'electronics', 'fashion', 'food', 'books', 'sports', 'home'] as const;
type FilterValue = (typeof CATEGORY_FILTERS)[number];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

export function MallLobby({ onEnterStore, onDigitalMarket, onAgentOpen }: MallLobbyProps) {
  const [filter, setFilter]   = useState<FilterValue>('all');
  const [search, setSearch]   = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = STORES.filter(s => {
    const matchFilter = filter === 'all' || s.category === filter;
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.tagline.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg)' }}>

      {/* ── Hero ── */}
      <section style={{ paddingTop: '60px', position: 'relative' }}>
        <FloatingTokens />
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-14 pb-12" style={{ position: 'relative', zIndex: 1 }}>
          <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-end">

            {/* Left — animated headline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatedHeadline />

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.72, duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  color: 'var(--muted)',
                  fontSize: '1.0625rem',
                  lineHeight: 1.7,
                  maxWidth: '480px',
                  fontWeight: 500,
                }}
              >
                Real stores. Real products. Pay with anything — we handle the rest.
              </motion.p>
            </motion.div>

            {/* Right — live clock + stats */}
            <motion.div
              initial={{ opacity: 0, x: 24, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.22, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:flex flex-col gap-5 p-6 rounded-3xl"
              style={{
                background: 'var(--surface-strong)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--card-shadow-hover)',
                minWidth: '280px',
              }}
            >
              <LiveClock />

              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--border)' }} />

              {/* Stats 2×2 */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { n: '6',     label: 'Live stores',       icon: <ShoppingBag size={12} /> },
                  { n: '24+',   label: 'Unique products',  icon: <Zap size={12} /> },
                  { n: '< 3s',  label: 'Avg. checkout',   icon: null },
                  { n: '$0',    label: 'Hidden fees. Ever.',icon: null },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="flex flex-col p-3 rounded-xl"
                    style={{ background: 'var(--surface-muted)' }}
                  >
                    <span className="editorial mb-0.5" style={{ color: 'var(--ink)', fontSize: '1.35rem' }}>
                      {stat.n}
                    </span>
                    <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--subtle)' }}>
                      {stat.icon}
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--muted)' }}>
                Every purchase is on-chain, permanent, and yours. Pick it up in person or have it land at your door. 🛍️
              </p>
            </motion.div>

          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--border-strong) 20%, var(--border-strong) 80%, transparent)',
          opacity: 0.4,
        }} />
      </section>

      {/* ── Featured Spotlight ── */}
      <FeaturedSpotlight onEnterStore={onEnterStore} />

      {/* ── Digital Market CTA banner ── */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-8">
        <motion.button
          onClick={onDigitalMarket}
          className="w-full text-left rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
            border: '1px solid rgba(99,102,241,0.35)',
            boxShadow: '0 8px 32px rgba(99,102,241,0.18)',
          }}
          whileHover={{ scale: 1.008, boxShadow: '0 12px 48px rgba(99,102,241,0.32)' }}
          whileTap={{ scale: 0.998 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        >
          {/* Ambient glow orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div style={{ position: 'absolute', top: '-20%', right: '10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 70%)' }} />
            <div style={{ position: 'absolute', bottom: '-30%', right: '35%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)' }} />
            <div style={{ position: 'absolute', top: '10%', left: '30%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)' }} />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 px-8 py-7">
            {/* Left */}
            <div className="flex items-start gap-5">
              {/* Icon cluster */}
              <div className="flex-shrink-0 grid grid-cols-2 gap-1" style={{ width: 56, height: 56 }}>
                {['🪙','🖼️','⚡','🏷️'].map((e, i) => (
                  <div key={i} className="flex items-center justify-center rounded-lg text-base"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {e}
                  </div>
                ))}
              </div>
              {/* Text */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="display font-bold" style={{ color: '#fff', fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
                    Digital Market
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(99,102,241,0.3)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)', letterSpacing: '0.06em' }}>
                    NEW
                  </span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.5, maxWidth: 480 }}>
                  Buy digital names, tokenized gold and silver, and rare NFT art.
                  Instant delivery — yours the moment payment confirms.
                </p>
                {/* Pill tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {['Digital Names', 'Digital Gold', 'Digital Silver', 'NFT Art'].map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right CTA */}
            <motion.div
              className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                letterSpacing: '-0.01em',
              }}
              whileHover={{ scale: 1.04 }}
            >
              Explore <span style={{ opacity: 0.7 }}>→</span>
            </motion.div>
          </div>
        </motion.button>
      </div>

      {/* ── AI Agent card ── */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-5">
        <motion.button
          onClick={onAgentOpen}
          className="w-full text-left rounded-2xl overflow-hidden relative"
          style={{
            background: '#0a0a0f',
            border: '1px solid rgba(99,102,241,0.22)',
            minHeight: 160,
          }}
          whileHover={{ boxShadow: '0 0 0 1px rgba(99,102,241,0.45), 0 20px 60px rgba(99,102,241,0.18)' }}
          whileTap={{ scale: 0.998 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        >
          {/* Photo — right side, fades out to the left */}
          <div className="absolute inset-0 pointer-events-none">
            <img
              src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=80"
              alt=""
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center right',
                opacity: 0.28,
              }}
            />
            {/* Fade the image out on the left so text stays readable */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, #0a0a0f 38%, rgba(10,10,15,0.72) 62%, rgba(10,10,15,0.1) 100%)',
            }} />
          </div>

          {/* Content */}
          <div className="relative z-10 flex items-center justify-between gap-8 px-8 py-7">
            <div>
              {/* Live badge */}
              <div className="flex items-center gap-2 mb-3">
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }}
                />
                <span style={{ color: '#4ade80', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em' }}>
                  AI AGENT · LIVE
                </span>
              </div>

              {/* Headline */}
              <h3 className="display font-bold" style={{
                color: '#f1f5f9', fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '0.6rem',
              }}>
                Shop smarter.<br />Let the agent find it.
              </h3>

              {/* Sub */}
              <p style={{ color: 'rgba(148,163,184,0.75)', fontSize: '0.875rem', lineHeight: 1.6, maxWidth: 380 }}>
                Tell it what you need — it browses every store, checks stock, and surfaces the best options for you.
              </p>
            </div>

            {/* CTA */}
            <motion.div
              className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                boxShadow: '0 4px 24px rgba(99,102,241,0.4)',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
              whileHover={{ scale: 1.04, boxShadow: '0 6px 32px rgba(99,102,241,0.6)' }}
            >
              Chat now →
            </motion.div>
          </div>
        </motion.button>
      </div>

      {/* ── Section divider ── */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-8 pb-0">
        <div style={{ height: '1px', background: 'var(--border)', opacity: 0.6 }} />
      </div>

      {/* ── Search + Filter bar ── */}
      <section className="relative z-10">
        <div style={{ background: 'var(--surface-strong)', borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-3 flex flex-wrap items-center gap-2.5">

            {/* Search */}
            <div className="relative" style={{ minWidth: '200px', flex: '1 1 200px', maxWidth: '320px' }}>
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--subtle)' }} />
              <input
                type="text"
                placeholder="Search stores..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  background: 'var(--surface-strong)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--border-strong)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            <div style={{ width: '1px', height: '20px', background: 'var(--border-strong)', opacity: 0.4 }} />

            {/* Category pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORY_FILTERS.map(cat => {
                const active = filter === cat;
                return (
                  <motion.button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    whileTap={{ scale: 0.95 }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={{
                      background: active ? 'var(--accent)' : 'transparent',
                      color: active ? 'var(--bg)' : 'var(--muted)',
                      letterSpacing: '0.01em',
                      transition: 'all 0.16s ease',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-muted)'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
                  </motion.button>
                );
              })}
            </div>

            <span className="text-xs ml-auto" style={{ color: 'var(--subtle)' }}>
              {filtered.length} {filtered.length === 1 ? 'store' : 'stores'}
            </span>
          </div>
        </div>
      </section>

      {/* ── Store grid ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-10 pb-20">
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {filtered.map((store, idx) => (
                <motion.div key={store.id} variants={item} layout>
                  <ScrollReveal delay={idx * 0.04} direction="up">
                    <ParallaxTilt maxTilt={6} scale={1.015} glare glareColor="rgba(255,255,255,0.12)">
                      <StoreCard
                        store={store}
                        isHovered={hoveredId === store.id}
                        onHover={setHoveredId}
                        onEnter={onEnterStore}
                      />
                    </ParallaxTilt>
                  </ScrollReveal>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-28"
            >
              <p className="editorial text-2xl mb-2" style={{ color: 'var(--ink)' }}>Nothing here... yet 👀</p>
              <p className="text-sm font-medium" style={{ color: 'var(--subtle)' }}>
                Try a different search or flip the category filter
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── Ticker ── */}
      <div className="relative z-10 overflow-hidden py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div
          className="flex gap-14 whitespace-nowrap"
          style={{ animation: 'ticker-scroll 40s linear infinite', width: 'max-content' }}
        >
          {[...STORES, ...STORES, ...STORES, ...STORES].map((s, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--subtle)' }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              {s.name}
              <span className="opacity-40">·</span>
              <span style={{ opacity: 0.6 }}>{CATEGORY_LABELS[s.category]}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Store Card ──────────────────────────────────────────────────────────────────
interface StoreCardProps {
  store: Store;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onEnter: (store: Store) => void;
}

function StoreCard({ store, isHovered, onHover, onEnter }: StoreCardProps) {
  // Deterministic open/closed based on store index (all open during day hours conceptually)
  const isOpen = true;
  const productCount = store.products.length;
  const minPrice = Math.min(...store.products.map(p => p.price));

  return (
    <article
      onMouseEnter={() => onHover(store.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onEnter(store)}
      className="group relative flex flex-col overflow-hidden rounded-2xl cursor-pointer"
      style={{
        background: 'var(--surface-strong)',
        border: `1px solid ${isHovered ? store.color + '55' : 'var(--border)'}`,
        boxShadow: isHovered
          ? `var(--card-shadow-hover), 0 0 0 1px ${store.color}22`
          : 'var(--card-shadow)',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      {/* Animated gradient top bar */}
      <div
        style={{
          height: '3px',
          background: `linear-gradient(90deg, ${store.gradientFrom}, ${store.gradientTo})`,
          backgroundSize: '200% 100%',
          animation: isHovered ? 'shimmer-bar 1.4s linear infinite' : 'none',
          flexShrink: 0,
        }}
      />

      {/* Product image triptych */}
      <div className="relative flex overflow-hidden flex-shrink-0" style={{ height: '160px', background: 'var(--surface-muted)' }}>
        {store.products.slice(0, 3).map((p, pi) => (
          <div
            key={p.id}
            className="flex-1 overflow-hidden relative"
            style={{ borderRight: pi < 2 ? '1px solid var(--border)' : undefined }}
          >
            <img
              src={p.imageUrl}
              alt={p.name}
              className="w-full h-full object-cover"
              style={{
                transform: isHovered ? 'scale(1.1)' : 'scale(1.0)',
                transition: `transform 0.65s cubic-bezier(0.22, 1, 0.36, 1) ${pi * 0.05}s`,
              }}
            />
          </div>
        ))}

        {/* Open/closed badge */}
        <div
          className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{
            background: isOpen ? 'rgba(15,107,56,0.88)' : 'rgba(150,60,60,0.88)',
            color: '#fff',
            backdropFilter: 'blur(8px)',
            fontSize: '0.62rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          <span
            className="w-1 h-1 rounded-full"
            style={{ background: isOpen ? '#4ade80' : '#f87171', boxShadow: isOpen ? '0 0 4px #4ade80' : 'none' }}
          />
          {isOpen ? 'Open' : 'Closed'}
        </div>

        {/* Product count badge */}
        <div
          className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            backdropFilter: 'blur(8px)',
            fontSize: '0.62rem',
          }}
        >
          {productCount} items
        </div>

        {/* Bottom gradient fade */}
        <div
          className="absolute inset-x-0 bottom-0 h-8 pointer-events-none"
          style={{ background: 'linear-gradient(to top, var(--surface-strong), transparent)' }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">

        {/* Identity row */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
              style={{ background: store.color, boxShadow: `0 0 8px ${store.color}bb` }}
            />
            <div className="min-w-0">
              <h3 className="editorial font-bold text-base" style={{ color: 'var(--ink)', lineHeight: 1.1 }}>
                {store.name}
              </h3>
              <span className="text-xs font-medium"
                style={{ color: 'var(--subtle)', letterSpacing: '0.07em', textTransform: 'uppercase', fontSize: '0.63rem' }}>
                {CATEGORY_LABELS[store.category]}
              </span>
            </div>
          </div>

          {/* Rating chip */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0"
            style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
          >
            <Star size={9} fill={store.color} stroke="none" />
            <span className="mono tabular-nums font-semibold" style={{ color: 'var(--ink)', fontSize: '0.7rem' }}>
              {store.rating}
            </span>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-sm leading-snug mb-3 flex-1" style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
          {store.tagline}
        </p>

        {/* Price from */}
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--subtle)' }}>
          From{' '}
          <span className="mono" style={{ color: store.color }}>
            {minPrice.toFixed(2)} USDC
          </span>
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1" style={{ color: 'var(--subtle)' }}>
            <MapPin size={10} />
            <span className="truncate" style={{ fontSize: '0.68rem', maxWidth: '140px' }}>
              {store.address.split(',').slice(1, 2).join('').trim()}
            </span>
          </div>

          {/* CTA */}
          <div
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{
              background: isHovered
                ? `linear-gradient(135deg, ${store.gradientFrom}, ${store.gradientTo})`
                : 'var(--surface-muted)',
              color: isHovered ? '#ffffff' : 'var(--ink-2)',
              border: `1px solid ${isHovered ? 'transparent' : 'var(--border)'}`,
              transition: 'all 0.22s ease',
              boxShadow: isHovered ? `0 4px 18px ${store.color}55` : 'none',
            }}
          >
            Browse
            <ChevronRight size={11} />
          </div>
        </div>
      </div>

      {/* Hover glow overlay */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background: `radial-gradient(ellipse at 70% 0%, ${store.color}10 0%, transparent 65%)`,
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />
    </article>
  );
}
