import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { CheckCircle, ExternalLink, Download, X, Truck, Store, Clock, Hash, MapPin, Package, ShieldCheck, Loader2 } from 'lucide-react';
import { TokenUSDC } from '@web3icons/react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import type { Order } from '../types';
import { buildTxExplorerUrl } from '@/onchain-facts';

import { ARC_CHAIN_ID } from '../chain-config';
const ESCROW_ADDRESS = (import.meta.env.VITE_ESCROW_ADDRESS ?? '') as `0x${string}`;

const ESCROW_ABI = [
  {
    name: 'confirmReceipt',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'orderId', type: 'bytes32' }],
    outputs: [],
  },
] as const;

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
  onContinueShopping: () => void;
}

export function ReceiptModal({ order, onClose, onContinueShopping }: ReceiptModalProps) {
  const { writeContract, data: confirmHash, isPending: isConfirmPending } = useWriteContract();
  const { isLoading: isConfirmConfirming, isSuccess: isConfirmSuccess } = useWaitForTransactionReceipt({ hash: confirmHash });
  const [confirmError, setConfirmError] = useState<string | null>(null);

  if (!order) return null;

  const txUrl = order.txExplorerUrl ?? (order.txHash ? buildTxExplorerUrl(ARC_CHAIN_ID, order.txHash) : null);
  const date = new Date(order.timestamp);
  const stores = [...new Map(order.items.map(i => [i.store.id, i.store])).values()];
  const isPickup = order.fulfillment === 'pickup';
  const isEscrow = order.status === 'escrow_pending' && !!order.escrowOrderId && ESCROW_ADDRESS;

  const handleConfirmReceipt = () => {
    if (!order.escrowOrderId) return;
    setConfirmError(null);
    try {
      writeContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'confirmReceipt',
        args: [order.escrowOrderId as `0x${string}`],
        chainId: ARC_CHAIN_ID,
      });
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : 'Transaction failed');
    }
  };

  const handleSave = () => {
    const lines = [
      `VirtualMall — ${isPickup ? 'IN-STORE COLLECTION RECEIPT' : 'DELIVERY RECEIPT'}`,
      '─'.repeat(40),
      `Order ID : ${order.id}`,
      `Date     : ${date.toLocaleString()}`,
      `Total    : ${order.total.toFixed(2)} USDC`,
      `Method   : ${isPickup ? 'In-Store Pickup' : 'Delivery'}`,
      ...(order.deliveryAddress ? [`Address  : ${order.deliveryAddress}`] : []),
      ...(order.txHash ? [`Tx Hash  : ${order.txHash}`] : []),
      '─'.repeat(40),
      'ITEMS:',
      ...order.items.map(i => `  ${i.product.name} ×${i.quantity}  —  ${(i.product.price * i.quantity).toFixed(2)} USDC  [${i.store.name}]`),
      '─'.repeat(40),
      ...(isPickup ? [
        'COLLECTION INSTRUCTIONS:',
        'Show this receipt at the store counter.',
        `Your order ID  ${order.id}  is your proof of purchase.`,
        '',
        ...stores.flatMap(s => [
          `Store : ${s.name}`,
          `Addr  : ${s.address}`,
          `Hours : ${s.pickupHours}`,
          '',
        ]),
      ] : []),
      'Thank you for shopping at VirtualMall.',
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${order.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {order && (
        <>
          <motion.div
            key="receipt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}
            onClick={onClose}
          />

          <motion.div
            key="receipt-modal"
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto rounded-3xl overflow-hidden"
            style={{
              background: 'var(--surface-strong)',
              border: '1px solid var(--border)',
              backdropFilter: 'blur(24px)',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Success header */}
            <div
              className="relative overflow-hidden p-6 text-center flex-shrink-0"
              style={{ background: isPickup
                ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))'
                : 'linear-gradient(135deg, rgba(26,128,71,0.15), rgba(34,197,94,0.1))'
              }}
            >
              <div className="absolute top-0 left-0 w-24 h-24 rounded-full pointer-events-none"
                style={{ background: isPickup ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.2)', filter: 'blur(20px)', transform: 'translate(-30%,-30%)' }} />
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none"
                style={{ background: isPickup ? 'rgba(139,92,246,0.2)' : 'rgba(236,72,153,0.2)', filter: 'blur(20px)', transform: 'translate(30%,-30%)' }} />

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: isPickup ? 'rgba(99,102,241,0.15)' : 'rgba(26,128,71,0.15)' }}
              >
                {isPickup
                  ? <Store size={32} style={{ color: '#6366f1' }} />
                  : <CheckCircle size={32} style={{ color: 'var(--success)' }} />
                }
              </motion.div>

              <h2 className="display text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
                {isPickup ? 'Ready for Pickup!' : 'Order Confirmed!'}
              </h2>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {isPickup
                  ? 'Show this receipt at any participating store'
                  : 'Your payment was processed successfully'}
              </p>

              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'var(--surface)', color: 'var(--ink)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Zigzag receipt edge */}
            <div className="h-3 w-full flex-shrink-0" style={{
              background: 'var(--surface-strong)',
              clipPath: 'polygon(0% 0%, 2.5% 100%, 5% 0%, 7.5% 100%, 10% 0%, 12.5% 100%, 15% 0%, 17.5% 100%, 20% 0%, 22.5% 100%, 25% 0%, 27.5% 100%, 30% 0%, 32.5% 100%, 35% 0%, 37.5% 100%, 40% 0%, 42.5% 100%, 45% 0%, 47.5% 100%, 50% 0%, 52.5% 100%, 55% 0%, 57.5% 100%, 60% 0%, 62.5% 100%, 65% 0%, 67.5% 100%, 70% 0%, 72.5% 100%, 75% 0%, 77.5% 100%, 80% 0%, 82.5% 100%, 85% 0%, 87.5% 100%, 90% 0%, 92.5% 100%, 95% 0%, 97.5% 100%, 100% 0%)',
              marginTop: '-1px',
            }} />

            <div className="overflow-y-auto px-6 pb-4 flex-1">

              {/* ── In-store collection card ── */}
              {isPickup && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mb-5 rounded-2xl overflow-hidden"
                  style={{ border: '2px solid #6366f1' }}
                >
                  {/* Card header */}
                  <div className="px-4 py-3 flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    <Package size={16} style={{ color: '#fff' }} />
                    <span className="text-sm font-bold" style={{ color: '#fff', letterSpacing: '0.04em' }}>
                      COLLECTION PASS
                    </span>
                  </div>

                  <div className="p-4" style={{ background: 'rgba(99,102,241,0.06)' }}>
                    {/* Big order ID — this is what the buyer shows at the counter */}
                    <div className="text-center mb-3">
                      <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--subtle)', letterSpacing: '0.1em' }}>
                        Present this at the store counter
                      </p>
                      <div
                        className="inline-block px-6 py-3 rounded-2xl"
                        style={{
                          background: 'var(--surface-strong)',
                          border: '1.5px dashed #6366f1',
                        }}
                      >
                        <span
                          className="mono font-bold"
                          style={{ color: '#6366f1', fontSize: '1.5rem', letterSpacing: '0.12em' }}
                        >
                          {order.id}
                        </span>
                      </div>
                      <p className="text-xs mt-1.5" style={{ color: 'var(--subtle)' }}>
                        Your proof of purchase
                      </p>
                    </div>

                    {/* Items summary */}
                    <div className="text-xs space-y-1 mb-3 pt-2" style={{ borderTop: '1px dashed var(--border)' }}>
                      {order.items.map(item => (
                        <div key={item.product.id} className="flex justify-between">
                          <span style={{ color: 'var(--ink)' }}>{item.product.name} <span style={{ color: 'var(--subtle)' }}>×{item.quantity}</span></span>
                          <span className="mono" style={{ color: 'var(--muted)' }}>{(item.product.price * item.quantity).toFixed(2)} USDC</span>
                        </div>
                      ))}
                    </div>

                    {/* Store locations */}
                    <div className="space-y-2 pt-2" style={{ borderTop: '1px dashed var(--border)' }}>
                      {stores.map(store => (
                        <div key={store.id} className="flex items-start gap-2">
                          <MapPin size={12} style={{ color: '#6366f1', flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>
                              {store.icon} {store.name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--subtle)' }}>{store.address}</p>
                            <p className="text-xs" style={{ color: 'var(--subtle)' }}>{store.pickupHours}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Receipt meta */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--subtle)' }}>Order ID</span>
                  <span className="mono font-bold" style={{ color: 'var(--ink)' }}>{order.id}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--subtle)' }}>
                    <Clock size={12} /> Date
                  </span>
                  <span style={{ color: 'var(--ink)' }}>
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' '}at{' '}
                    {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--subtle)' }}>
                    {isPickup ? <Store size={12} /> : <Truck size={12} />}
                    Fulfillment
                  </span>
                  <span
                    className="font-semibold text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: isPickup ? 'rgba(99,102,241,0.12)' : 'rgba(26,128,71,0.12)',
                      color: isPickup ? '#6366f1' : 'var(--success)',
                    }}
                  >
                    {isPickup ? 'In-Store Pickup' : 'Delivery'}
                  </span>
                </div>
                {order.deliveryAddress && (
                  <div className="flex items-start justify-between text-sm gap-4">
                    <span style={{ color: 'var(--subtle)', flexShrink: 0 }}>Ship to</span>
                    <span className="text-right" style={{ color: 'var(--ink)' }}>{order.deliveryAddress}</span>
                  </div>
                )}
                {order.txHash && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--subtle)' }}>
                      <Hash size={12} /> Tx Hash
                    </span>
                    <a
                      href={txUrl ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono text-xs flex items-center gap-1"
                      style={{ color: 'var(--accent)' }}
                    >
                      {order.txHash.slice(0, 8)}...{order.txHash.slice(-6)}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>

              {/* Dashed divider */}
              <div className="my-4 h-px" style={{
                background: 'repeating-linear-gradient(90deg, var(--border) 0, var(--border) 6px, transparent 6px, transparent 12px)',
              }} />

              {/* Items */}
              <div className="space-y-2 mb-4">
                {order.items.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium" style={{ color: 'var(--ink)' }}>{item.product.name}</span>
                      <span style={{ color: 'var(--subtle)' }}> ×{item.quantity}</span>
                      <p className="text-xs" style={{ color: 'var(--subtle)' }}>{item.store.name}</p>
                    </div>
                    <span className="mono font-medium" style={{ color: 'var(--ink)' }}>
                      {(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div
                className="flex items-center justify-between p-3 rounded-2xl"
                style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
              >
                <span className="font-bold" style={{ color: 'var(--ink)' }}>Total Paid</span>
                <div className="flex items-center gap-1.5">
                  <TokenUSDC variant="branded" size={16} />
                  <span className="display font-bold text-lg mono tabular-nums" style={{ color: 'var(--ink)' }}>
                    {order.total.toFixed(2)}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>USDC</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 pt-3 space-y-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>

              {/* Escrow banner + confirm button */}
              {isEscrow && !isConfirmSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-2xl text-sm"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b' }}
                >
                  <p className="font-semibold mb-0.5" style={{ color: '#f59e0b' }}>Funds held in escrow</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    Your USDC is locked on-chain. Once you receive your items, tap below to release payment to the merchant.
                  </p>
                </motion.div>
              )}
              {isEscrow && isConfirmSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-2xl flex items-center gap-2 text-sm"
                  style={{ background: 'rgba(26,128,71,0.1)', border: '1px solid var(--success)' }}
                >
                  <ShieldCheck size={16} style={{ color: 'var(--success)' }} />
                  <span style={{ color: 'var(--success)' }}>Receipt confirmed — payment released to merchant.</span>
                </motion.div>
              )}
              {confirmError && (
                <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{confirmError}</p>
              )}
              {isEscrow && !isConfirmSuccess && (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirmReceipt}
                  disabled={isConfirmPending || isConfirmConfirming}
                  className="w-full py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                    opacity: (isConfirmPending || isConfirmConfirming) ? 0.7 : 1,
                  }}
                >
                  {isConfirmPending ? (
                    <><Loader2 size={15} className="animate-spin" /> Confirm in wallet…</>
                  ) : isConfirmConfirming ? (
                    <><Loader2 size={15} className="animate-spin" /> Releasing payment…</>
                  ) : (
                    <><ShieldCheck size={15} /> I received my items — Release Payment</>
                  )}
                </motion.button>
              )}

              <button
                onClick={handleSave}
                className="w-full py-2.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2"
                style={{
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                }}
              >
                <Download size={14} />
                {isPickup ? 'Download Collection Pass' : 'Save Receipt'}
              </button>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={onContinueShopping}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}
              >
                Continue Shopping
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
