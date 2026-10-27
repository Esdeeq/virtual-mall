import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Zap, Search, ShieldCheck, Clock, Sparkles } from 'lucide-react';
import {
  DIGITAL_ASSETS, DIGITAL_CATEGORY_LABELS, DIGITAL_CATEGORY_ICONS,
  DIGITAL_CATEGORY_COLORS,
} from '../data/digitalAssets';
import type { DigitalAsset, DigitalCategory } from '../data/digitalAssets';
import { DigitalAssetModal } from './DigitalAssetModal';
import { FloatingTokens } from './FloatingTokens';

const CATEGORIES: DigitalCategory[] = ['names', 'gold', 'silver', 'nft'];

const RARITY_COLOR: Record<string, string> = {
  common:    'var(--muted)',
  uncommon:  '#22c55e',
  rare:      '#6366f1',
  legendary: '#f59e0b',
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

interface Props {
  onBack: () => void;
}

export function DigitalAssetMarket({ onBack }: Props) {
  const [activeCategory, setActiveCategory] = useState<DigitalCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<DigitalAsset | null>(null);

  const filtered = DIGITAL_ASSETS.filter(a => {
    const matchCat = activeCategory === 'all' || a.category === activeCategory;
    const matchSearch = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some(t => t.includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg)', paddingTop: '60px' }}>

      {/* ── Hero banner ── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <FloatingTokens />

        {/* Gradient wash */}
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 0,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(236,72,153,0.06) 50%, rgba(245,158,11,0.06) 100%)',
          }}
        />

        <div
          className="max-w-7xl mx-auto px-6 lg:px-10 pt-12 pb-14"
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Back button */}
          <motion.button
            onClick={onBack}
            className="flex items-center gap-2 mb-8"
            style={{
              color: 'var(--muted)',
              fontSize: '0.8125rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            whileHover={{ x: -3, color: 'var(--ink)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <ArrowLeft size={15} />
            Back to Mall
          </motion.button>

          <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-end">
            {/* Left — headline */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2.5 mb-6"
              >
                <span
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: 'rgba(99,102,241,0.12)',
                    color: '#6366f1',
                    border: '1px solid rgba(99,102,241,0.2)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  <Zap size={11} />
                  Digital Market
                </span>
              </motion.div>

              <motion.h1
                className="editorial"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)',
                  lineHeight: 0.96,
                  color: 'var(--ink)',
                  marginBottom: '1.25rem',
                  maxWidth: '640px',
                }}
              >
                Own the future.
                <br />
                <span style={{ color: 'var(--muted)' }}>Digital assets,</span>
                <br />
                instantly yours.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.4 }}
                style={{ color: 'var(--muted)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '460px', fontWeight: 500 }}
              >
                Buy digital names, tokenized gold and silver, and rare NFTs.
                Pay with USDC, any crypto, or your local currency.
                Assets delivered to your wallet instantly.
              </motion.p>
            </div>

            {/* Right — stats pills */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.18, duration: 0.45 }}
              className="hidden lg:flex flex-col gap-3"
            >
              {[
                { icon: <ShieldCheck size={16} />, label: 'Fully backed assets',    color: '#22c55e' },
                { icon: <Clock size={16} />,       label: 'Instant wallet delivery', color: '#6366f1' },
                { icon: <Sparkles size={16} />,    label: `${DIGITAL_ASSETS.length} assets listed`,  color: '#f59e0b' },
              ].map(s => (
                <div
                  key={s.label}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{
                    background: 'var(--surface-strong)',
                    border: '1px solid var(--border)',
                    minWidth: '240px',
                  }}
                >
                  <span style={{ color: s.color }}>{s.icon}</span>
                  <span style={{ color: 'var(--ink)', fontSize: '0.875rem', fontWeight: 600 }}>{s.label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div style={{ height: '1px', background: 'var(--border)' }} />

      {/* ── Filter bar ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search
              size={14}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search assets..."
              style={{
                width: '100%',
                paddingLeft: '36px',
                paddingRight: '12px',
                paddingTop: '8px',
                paddingBottom: '8px',
                borderRadius: '999px',
                border: '1px solid var(--border)',
                background: 'var(--surface-strong)',
                color: 'var(--ink)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Category filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', ...CATEGORIES] as const).map(cat => {
              const isActive = activeCategory === cat;
              const colors = cat !== 'all' ? DIGITAL_CATEGORY_COLORS[cat] : null;
              return (
                <motion.button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
                  style={{
                    background: isActive
                      ? (colors ? `linear-gradient(135deg, ${colors.from}, ${colors.to})` : 'var(--accent)')
                      : 'transparent',
                    color: isActive ? '#fff' : 'var(--muted)',
                    border: isActive ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                  }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  {cat !== 'all' && <span style={{ fontSize: '0.8em' }}>{DIGITAL_CATEGORY_ICONS[cat]}</span>}
                  {cat === 'all' ? 'All Assets' : DIGITAL_CATEGORY_LABELS[cat]}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Asset grid ── */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeCategory}-${search}`}
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-5"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            {filtered.length === 0 ? (
              <motion.div
                variants={cardItem}
                className="col-span-full text-center py-20"
                style={{ color: 'var(--muted)' }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                <p style={{ fontWeight: 600, fontSize: '1rem' }}>No assets found</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.4rem' }}>Try a different category or search term</p>
              </motion.div>
            ) : (
              filtered.map(asset => <AssetCard key={asset.id} asset={asset} onSelect={setSelectedAsset} />)
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Purchase modal ── */}
      <DigitalAssetModal
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
      />
    </div>
  );
}

/* ── Asset card ── */
function AssetCard({ asset, onSelect }: { asset: DigitalAsset; onSelect: (a: DigitalAsset) => void }) {
  const colors = DIGITAL_CATEGORY_COLORS[asset.category];
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      variants={cardItem}
      onClick={() => onSelect(asset)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface-strong)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: hovered
          ? `0 20px 60px -12px ${colors.accent}44, 0 8px 24px -6px rgba(0,0,0,0.18)`
          : 'var(--card-shadow)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
        <img
          src={asset.imageUrl}
          alt={asset.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
            transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1)',
          }}
        />

        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to top, ${colors.from}cc 0%, transparent 60%)`,
            opacity: hovered ? 1 : 0.6,
            transition: 'opacity 0.3s ease',
          }}
        />

        {/* Category icon top-left */}
        <div
          style={{
            position: 'absolute', top: '12px', left: '12px',
            width: '32px', height: '32px', borderRadius: '8px',
            background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px',
            boxShadow: `0 4px 12px ${colors.accent}66`,
          }}
        >
          {DIGITAL_CATEGORY_ICONS[asset.category]}
        </div>

        {/* Badge */}
        {asset.badge && (
          <div
            style={{
              position: 'absolute', top: '12px', right: '12px',
              background: asset.badgeColor ?? colors.accent,
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: '999px',
              boxShadow: `0 2px 8px ${asset.badgeColor ?? colors.accent}88`,
            }}
          >
            {asset.badge}
          </div>
        )}

        {/* Supply indicator */}
        {asset.supply != null && (
          <div
            style={{
              position: 'absolute', bottom: '10px', right: '12px',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            {asset.supply} left
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '16px' }}>
        {/* Rarity + category */}
        <div className="flex items-center gap-2 mb-2">
          {asset.rarity && (
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: RARITY_COLOR[asset.rarity] ?? 'var(--muted)',
              }}
            >
              ● {asset.rarity}
            </span>
          )}
          <span style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            {DIGITAL_CATEGORY_LABELS[asset.category]}
          </span>
        </div>

        <h3
          style={{
            fontSize: '1.0625rem',
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: '6px',
            fontFamily: 'Syne, sans-serif',
            lineHeight: 1.25,
          }}
        >
          {asset.name}
        </h3>

        <p
          style={{
            fontSize: '0.8125rem',
            color: 'var(--muted)',
            lineHeight: 1.55,
            marginBottom: '14px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
            overflow: 'hidden',
          }}
        >
          {asset.description}
        </p>

        {/* Meta pills */}
        {asset.meta && (
          <div className="flex flex-wrap gap-1.5 mb-14px" style={{ marginBottom: '14px' }}>
            {Object.entries(asset.meta).slice(0, 2).map(([k, v]) => (
              <span
                key={k}
                style={{
                  fontSize: '0.68rem',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '2px 7px',
                  color: 'var(--muted)',
                  fontWeight: 600,
                }}
              >
                {k}: {v}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between" style={{ marginTop: '12px' }}>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink)', fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>
              {asset.price.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600 }}>USDC</div>
          </div>

          <motion.button
            onClick={e => { e.stopPropagation(); onSelect(asset); }}
            style={{
              background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 18px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: `0 4px 14px ${colors.accent}55`,
            }}
            whileHover={{ scale: 1.04, boxShadow: `0 6px 20px ${colors.accent}77` }}
            whileTap={{ scale: 0.96 }}
          >
            Buy Now
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
