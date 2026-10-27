import { motion } from 'framer-motion';
import { Star, ArrowUpRight } from 'lucide-react';
import { STORES } from '../data/marketplace';
import type { Store } from '../data/marketplace';

interface FeaturedSpotlightProps {
  onEnterStore: (store: Store) => void;
}

// Pick the top 3 by rating
const FEATURED = [...STORES].sort((a, b) => b.rating - a.rating).slice(0, 3);

export function FeaturedSpotlight({ onEnterStore }: FeaturedSpotlightProps) {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-10 pb-2">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span
            className="w-1 h-5 rounded-full flex-shrink-0"
            style={{ background: 'var(--accent)' }}
          />
          <span
            className="editorial text-sm font-bold"
            style={{ color: 'var(--ink)', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.75rem' }}
          >
            Featured Stores
          </span>
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--subtle)' }}>
          Highest rated this week
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FEATURED.map((store, i) => (
          <FeaturedCard key={store.id} store={store} rank={i + 1} onEnter={onEnterStore} />
        ))}
      </div>
    </section>
  );
}

function FeaturedCard({ store, rank, onEnter }: { store: Store; rank: number; onEnter: (s: Store) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onEnter(store)}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden rounded-2xl cursor-pointer flex items-center gap-4 p-4"
      style={{
        background: 'var(--surface-strong)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Rank number */}
      <span
        className="editorial absolute top-3 right-4"
        style={{ fontSize: '3.5rem', fontWeight: 900, color: store.color, opacity: 0.07, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}
      >
        {rank}
      </span>

      {/* Product image */}
      <div
        className="flex-shrink-0 rounded-xl overflow-hidden"
        style={{ width: 68, height: 68 }}
      >
        <img
          src={store.products[0]?.imageUrl}
          alt={store.name}
          className="w-full h-full object-cover"
          style={{ transition: 'transform 0.4s ease' }}
        />
      </div>

      {/* Info */}
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: store.color, boxShadow: `0 0 6px ${store.color}` }}
          />
          <span
            className="editorial font-bold text-sm truncate"
            style={{ color: 'var(--ink)' }}
          >
            {store.name}
          </span>
        </div>
        <p className="text-xs truncate mb-2" style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>
          {store.tagline}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star size={9} fill={store.color} stroke="none" />
            <span className="mono text-xs font-bold" style={{ color: store.color }}>{store.rating}</span>
          </div>
          <span style={{ color: 'var(--border-strong)', fontSize: '0.6rem' }}>·</span>
          <span className="text-xs" style={{ color: 'var(--subtle)' }}>{store.products.length} items</span>
        </div>
      </div>

      <ArrowUpRight size={14} style={{ color: 'var(--subtle)', flexShrink: 0 }} />

      {/* Gradient wash */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl opacity-0 group-hover:opacity-100"
        style={{
          background: `linear-gradient(135deg, ${store.gradientFrom}0a 0%, ${store.gradientTo}08 100%)`,
          transition: 'opacity 0.3s',
        }}
      />
    </motion.div>
  );
}
