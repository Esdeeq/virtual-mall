import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Star, Package, Tag } from 'lucide-react';
import { TokenUSDC } from '@web3icons/react';
import type { Product, Store } from '../data/marketplace';
import type { CartItem } from '../types';

interface ProductModalProps {
  product: Product | null;
  store: Store | null;
  cart: CartItem[];
  onClose: () => void;
  onAddToCart: (product: Product, store: Store) => void;
  onBuyNow: (product: Product, store: Store) => void;
}

export function ProductModal({ product, store, cart, onClose, onAddToCart, onBuyNow }: ProductModalProps) {
  const open = !!product && !!store;
  const inCart = product ? cart.some(ci => ci.product.id === product.id) : false;
  const cartQty = product ? cart.find(ci => ci.product.id === product.id)?.quantity ?? 0 : 0;

  return (
    <AnimatePresence>
      {open && product && store && (
        <>
          {/* Backdrop */}
          <motion.div
            key="product-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="product-modal"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed inset-x-4 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 rounded-t-3xl sm:rounded-3xl overflow-hidden w-full sm:max-w-xl"
            style={{
              background: 'var(--surface-strong)',
              border: '1px solid var(--border)',
              backdropFilter: 'blur(24px)',
              maxHeight: '90vh',
            }}
          >
            {/* Accent top strip */}
            <div
              className="h-1"
              style={{ background: `linear-gradient(90deg, ${store.gradientFrom}, ${store.gradientTo})` }}
            />

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 4px)' }}>
              {/* Product image */}
              <div className="relative aspect-video overflow-hidden" style={{ background: 'var(--surface-muted)' }}>
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(to top, ${store.gradientFrom}44, transparent)` }}
                />
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}
                >
                  <X size={18} />
                </button>
                {/* Store badge */}
                <div
                  className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}
                >
                  <span className="text-lg">{store.icon}</span>
                  <span className="text-sm font-medium text-white">{store.name}</span>
                </div>
              </div>

              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                      {product.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Star size={14} fill={store.color} stroke="none" />
                      <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{store.rating}</span>
                      <span className="text-sm" style={{ color: 'var(--muted)' }}>· {store.reviewCount.toLocaleString()} reviews</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <TokenUSDC variant="branded" size={20} />
                      <span className="display text-3xl font-bold mono tabular-nums" style={{ color: 'var(--ink)' }}>
                        {product.price.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>Pay with USDC</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--muted)' }}>
                  {product.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-5">
                  <Tag size={14} style={{ color: 'var(--subtle)', marginTop: '2px' }} />
                  {product.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: `${store.color}18`, color: store.color }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Stock + pickup */}
                <div
                  className="flex items-center gap-3 p-3 rounded-2xl mb-6"
                  style={{ background: 'var(--surface-muted)' }}
                >
                  <Package size={16} style={{ color: store.color }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                      {product.inStock} units in stock
                    </p>
                    <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                      Pickup available at {store.address}
                    </p>
                  </div>
                  {product.inStock <= 5 && (
                    <span className="text-xs font-medium" style={{ color: 'var(--danger)' }}>
                      Almost gone!
                    </span>
                  )}
                </div>

                {/* CTA row */}
                <div className="flex gap-3">
                  <button
                    onClick={() => onAddToCart(product, store)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
                    style={{
                      background: 'var(--surface-muted)',
                      color: 'var(--ink)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <ShoppingCart size={16} />
                    {inCart ? `Add more (${cartQty} in cart)` : 'Add to Cart'}
                  </button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onBuyNow(product, store)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${store.gradientFrom}, ${store.gradientTo})`,
                      boxShadow: `0 4px 20px ${store.color}44`,
                    }}
                  >
                    <TokenUSDC variant="mono" size={16} />
                    Buy Now
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
