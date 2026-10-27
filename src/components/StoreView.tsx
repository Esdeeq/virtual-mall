import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, Star, MapPin, Clock, ShoppingCart, ChevronRight,
  Package, Plus, ArrowUpRight,
} from 'lucide-react';
import type { Store, Product } from '../data/marketplace';
import { CATEGORY_LABELS } from '../data/marketplace';
import type { CartItem } from '../types';
import { TokenUSDC } from '@web3icons/react';

interface StoreViewProps {
  store: Store;
  cart: CartItem[];
  soldQty: Record<string, number>;
  onBack: () => void;
  onProductClick: (product: Product, store: Store) => void;
  onAddToCart: (product: Product, store: Store) => void;
}

export function StoreView({ store, cart, soldQty, onBack, onProductClick, onAddToCart }: StoreViewProps) {
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 180);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>

      {/* ── Sticky mini-header (appears on scroll) ── */}
      <AnimatePresence>
        {scrolled && (
          <motion.div
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -48, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-40 left-0 right-0"
            style={{
              top: '60px',
              background: 'var(--surface)',
              backdropFilter: 'blur(28px) saturate(180%)',
              WebkitBackdropFilter: 'blur(28px) saturate(180%)',
              borderBottom: `2px solid ${store.color}`,
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-2.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: 'var(--subtle)' }}
                >
                  <ArrowLeft size={12} />
                  Mall
                </button>
                <span style={{ color: 'var(--border-strong)', fontSize: '0.65rem' }}>›</span>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: store.color, boxShadow: `0 0 6px ${store.color}` }}
                  />
                  <span className="editorial font-bold text-sm" style={{ color: 'var(--ink)' }}>
                    {store.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star size={11} fill={store.color} stroke="none" />
                  <span className="mono text-xs font-bold" style={{ color: 'var(--ink)' }}>{store.rating}</span>
                </div>
                {cartCount > 0 && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold animate-pop-in"
                    style={{ background: `${store.color}20`, color: store.color }}
                  >
                    <ShoppingCart size={11} />
                    {cartCount} in cart
                  </div>
                )}
              </div>
            </div>
            {/* Store-colored progress line */}
            <div
              style={{
                position: 'absolute', bottom: 0, left: 0,
                height: '2px',
                width: `${Math.min(100, (cartCount / store.products.length) * 100)}%`,
                background: `linear-gradient(90deg, ${store.gradientFrom}, ${store.gradientTo})`,
                transition: 'width 0.4s ease',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Store header ── */}
      <div className="relative overflow-hidden" style={{ paddingTop: '60px', borderBottom: '1px solid var(--border)' }}>
        {/* Full-canvas gradient wash */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(115deg, transparent 30%, ${store.gradientFrom}20 65%, ${store.gradientTo}14 100%)`,
          }}
        />
        {/* Ambient bloom — top right */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-20%', right: '-8%',
            width: '520px', height: '520px', borderRadius: '50%',
            background: `radial-gradient(circle, ${store.color}25 0%, transparent 70%)`,
            filter: 'blur(110px)',
          }}
        />
        {/* Store gradient strip below navbar */}
        <div
          className="absolute left-0 right-0"
          style={{
            top: '60px',
            height: '3px',
            background: `linear-gradient(90deg, ${store.gradientFrom}, ${store.gradientTo}, transparent)`,
          }}
        />

        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-10 pb-12 relative z-10">
          {/* Back */}
          <motion.button
            onClick={onBack}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ x: -3 }}
            className="inline-flex items-center gap-1.5 mb-8 text-xs font-semibold"
            style={{
              color: 'var(--subtle)',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
            }}
          >
            <ArrowLeft size={12} />
            Mall
          </motion.button>

          {/* Header row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07, duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-end justify-between gap-8 flex-wrap"
          >
            {/* Left */}
            <div>
              <p
                className="text-xs font-bold mb-3"
                style={{
                  color: store.color,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {CATEGORY_LABELS[store.category]}
              </p>
              <h1
                className="editorial font-bold"
                style={{
                  color: 'var(--ink)',
                  fontSize: 'clamp(2.2rem, 5vw, 4rem)',
                  lineHeight: 1.0,
                  marginBottom: '0.75rem',
                }}
              >
                {store.name}
              </h1>
              <p
                style={{ color: 'var(--muted)', maxWidth: '440px', lineHeight: 1.6, fontSize: '1rem' }}
              >
                {store.tagline}
              </p>
            </div>

            {/* Right — meta card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col gap-3 p-5 rounded-2xl"
              style={{
                background: 'var(--surface-strong)',
                border: `1px solid ${store.color}30`,
                boxShadow: `var(--card-shadow), 0 0 0 1px ${store.color}10`,
                minWidth: '210px',
              }}
            >
              <div className="flex items-center gap-2">
                <Star size={14} fill={store.color} stroke="none" />
                <span className="font-bold mono tabular-nums" style={{ color: 'var(--ink)', fontSize: '0.92rem' }}>
                  {store.rating}
                </span>
                <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                  ({store.reviewCount.toLocaleString()} reviews)
                </span>
              </div>
              <div
                style={{ height: '1px', background: 'var(--border)' }}
              />
              <div className="flex items-start gap-2">
                <MapPin size={12} style={{ color: 'var(--subtle)', marginTop: '1px', flexShrink: 0 }} />
                <span className="text-xs leading-snug" style={{ color: 'var(--muted)' }}>
                  {store.address}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={12} style={{ color: 'var(--subtle)', flexShrink: 0 }} />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {store.pickupHours}
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Product grid ── */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Section header */}
        <div className="flex items-end justify-between mb-7">
          <div>
            <h2
              className="display font-bold"
              style={{ color: 'var(--ink)', letterSpacing: '-0.03em', fontSize: '1.25rem' }}
            >
              Products
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>
              {store.products.length} items available
            </p>
          </div>
          <AnimatePresence>
            {cartCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  background: `${store.color}15`,
                  color: store.color,
                  border: `1px solid ${store.color}33`,
                }}
              >
                <ShoppingCart size={12} />
                {cartCount} in cart
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--border)', marginBottom: '1.5rem' }} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {store.products.map((product, i) => {
              const effectiveStock = Math.max(0, product.inStock - (soldQty[product.id] ?? 0));
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  store={store}
                  index={i}
                  inCart={cart.some(ci => ci.product.id === product.id)}
                  effectiveStock={effectiveStock}
                  onClick={() => onProductClick(product, store)}
                  onAddToCart={() => onAddToCart(product, store)}
                />
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Pickup strip ── */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl"
          style={{
            background: 'var(--surface-strong)',
            border: `1px solid ${store.color}30`,
            boxShadow: 'var(--card-shadow)',
          }}
        >
          {/* Color accent icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${store.color}18`, border: `1px solid ${store.color}30` }}
          >
            <Package size={18} style={{ color: store.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              In-store pickup available
            </p>
            <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--muted)' }}>
              {store.address} · {store.pickupHours}
            </p>
          </div>
          <div
            className="flex items-center gap-1 text-xs font-semibold flex-shrink-0"
            style={{ color: store.color }}
          >
            Show receipt in-store
            <ChevronRight size={12} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Product Card ──────────────────────────────────────────────────────────────
interface ProductCardProps {
  product: Product;
  store: Store;
  index: number;
  inCart: boolean;
  effectiveStock: number;
  onClick: () => void;
  onAddToCart: (e: React.MouseEvent) => void;
}

function ProductCard({ product, store, index, inCart, effectiveStock, onClick, onAddToCart }: ProductCardProps) {
  const [hovered, setHovered] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(e);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      className="flex flex-col rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: 'var(--surface-strong)',
        border: `1px solid ${hovered ? store.color + '55' : 'var(--border)'}`,
        boxShadow: hovered ? `var(--card-shadow-hover), 0 0 0 1px ${store.color}15` : 'var(--card-shadow)',
        transition: 'border-color 0.22s ease, box-shadow 0.22s ease',
      }}
    >
      {/* Image */}
      <div
        className="relative flex-shrink-0 overflow-hidden"
        style={{ height: '192px', background: 'var(--surface-muted)' }}
      >
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
          style={{
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
            transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
        {/* Hover scrim */}
        <div
          className="absolute inset-0 flex items-end justify-end p-3"
          style={{
            background: `linear-gradient(160deg, transparent 40%, ${store.color}cc 120%)`,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.28s ease',
          }}
        >
          <ArrowUpRight size={18} color="white" />
        </div>
        {/* Stock badge */}
        {effectiveStock <= 5 && effectiveStock > 0 && (
          <div
            className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg text-xs font-semibold animate-badge-pulse"
            style={{ background: 'var(--danger)', color: 'white', fontSize: '0.62rem' }}
          >
            Only {effectiveStock} left!
          </div>
        )}
        {effectiveStock === 0 && (
          <div
            className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(0,0,0,0.65)', color: 'white', fontSize: '0.62rem' }}
          >
            Sold out
          </div>
        )}
        {inCart && (
          <div
            className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: store.color }}
          >
            In cart
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4">
        {/* Tags */}
        <div className="flex gap-1 flex-wrap mb-2">
          {product.tags.slice(0, 2).map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md text-xs font-medium"
              style={{
                background: `${store.color}12`,
                color: store.color,
                border: `1px solid ${store.color}20`,
                letterSpacing: '0.02em',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Name */}
        <h3
          className="font-semibold text-sm leading-snug mb-1.5 flex-1"
          style={{ color: 'var(--ink)' }}
        >
          {product.name}
        </h3>

        {/* Description */}
        <p
          className="text-xs leading-relaxed mb-3"
          style={{
            color: 'var(--muted)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.description}
        </p>

        {/* Stock bar */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: 'var(--subtle)', fontSize: '0.65rem' }}>Stock</span>
            <span className="mono text-xs font-semibold" style={{ color: effectiveStock <= 5 ? 'var(--danger)' : 'var(--subtle)', fontSize: '0.65rem' }}>
              {effectiveStock}
            </span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: '3px', background: 'var(--border)' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, (effectiveStock / 50) * 100)}%`,
                background: effectiveStock <= 5
                  ? 'var(--danger)'
                  : `linear-gradient(90deg, ${store.gradientFrom}, ${store.gradientTo})`,
                borderRadius: '9999px',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>

        {/* Price + Add */}
        <div
          className="flex items-center justify-between pt-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-1.5">
            <TokenUSDC variant="branded" size={14} />
            <span
              className="display font-bold tabular-nums"
              style={{ color: 'var(--ink)', fontSize: '0.9375rem', letterSpacing: '-0.02em' }}
            >
              {product.price.toFixed(2)}
            </span>
          </div>

          <motion.button
            whileHover={{ scale: effectiveStock > 0 ? 1.05 : 1 }}
            whileTap={{ scale: effectiveStock > 0 ? 0.95 : 1 }}
            onClick={effectiveStock > 0 ? handleAdd : undefined}
            disabled={effectiveStock === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{
              background: effectiveStock === 0
                ? 'var(--surface-muted)'
                : `linear-gradient(135deg, ${store.gradientFrom}, ${store.gradientTo})`,
              color: effectiveStock === 0 ? 'var(--subtle)' : 'white',
              boxShadow: effectiveStock > 0 ? `0 2px 8px ${store.color}44` : 'none',
              cursor: effectiveStock === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Plus size={11} />
            {effectiveStock === 0 ? 'Sold out' : inCart ? 'More' : 'Add'}
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
