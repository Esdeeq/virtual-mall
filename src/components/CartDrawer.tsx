import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { TokenUSDC } from '@web3icons/react';
import type { CartItem } from '../types';

interface CartDrawerProps {
  open: boolean;
  cart: CartItem[];
  onClose: () => void;
  onUpdateQty: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
}

export function CartDrawer({ open, cart, onClose, onUpdateQty, onRemove, onCheckout }: CartDrawerProps) {
  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          <motion.div
            key="cart-drawer"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            className="fixed right-0 top-0 bottom-0 z-40 w-full sm:max-w-sm flex flex-col"
            style={{
              background: 'var(--surface-strong)',
              borderLeft: '1px solid var(--border)',
              backdropFilter: 'blur(24px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top accent */}
            <div className="h-1 flex-shrink-0" style={{ background: 'linear-gradient(90deg, #6366f1, #ec4899, #f97316)' }} />

            {/* Header */}
            <div className="flex items-center justify-between p-6 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>Your Cart</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
                  {itemCount} item{itemCount !== 1 ? 's' : ''} · {cart.length > 0 ? `${[...new Set(cart.map(i => i.store.id))].length} store${[...new Set(cart.map(i => i.store.id))].length !== 1 ? 's' : ''}` : 'empty'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'var(--surface-muted)', color: 'var(--ink)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div
                    className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                    style={{ background: 'var(--surface-muted)' }}
                  >
                    <ShoppingBag size={28} style={{ color: 'var(--subtle)' }} />
                  </div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>Your cart is empty</p>
                  <p className="text-sm" style={{ color: 'var(--subtle)' }}>
                    Explore the mall and add products to your cart.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-4 px-5 py-2 rounded-2xl text-sm font-medium"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    Explore stores
                  </button>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {cart.map(item => (
                    <motion.div
                      key={item.product.id}
                      initial={{ opacity: 0, x: 20, scale: 0.96 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 40, scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="flex items-center gap-3 p-3 rounded-2xl"
                      style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                    >
                      {/* Image */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
                          {item.product.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--subtle)' }}>{item.store.name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <TokenUSDC variant="branded" size={12} />
                          <span className="text-sm font-bold mono tabular-nums" style={{ color: 'var(--ink)' }}>
                            {(item.product.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => onRemove(item.product.id)}
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ color: 'var(--subtle)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                        <div
                          className="flex items-center gap-1 rounded-xl px-1.5 py-1"
                          style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}
                        >
                          <button
                            onClick={() => onUpdateQty(item.product.id, -1)}
                            className="w-5 h-5 flex items-center justify-center"
                            style={{ color: 'var(--ink)' }}
                          >
                            <Minus size={10} />
                          </button>
                          <span className="text-xs font-bold w-4 text-center mono" style={{ color: 'var(--ink)' }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQty(item.product.id, 1)}
                            className="w-5 h-5 flex items-center justify-center"
                            style={{ color: 'var(--ink)' }}
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-6 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
                {/* Total */}
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold" style={{ color: 'var(--ink)' }}>Total</span>
                  <div className="flex items-center gap-1.5">
                    <TokenUSDC variant="branded" size={18} />
                    <span className="display text-2xl font-bold mono tabular-nums" style={{ color: 'var(--ink)' }}>
                      {total.toFixed(2)}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>USDC</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onCheckout}
                  className="w-full py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                    boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                  }}
                >
                  <TokenUSDC variant="mono" size={18} />
                  Checkout · {total.toFixed(2)} USDC
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
