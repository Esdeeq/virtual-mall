import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, ExternalLink, Package, Truck, Store, Bot, CheckCircle2, Clock } from 'lucide-react';
import CopyField from './CopyField';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { TokenUSDC } from '@web3icons/react';
import type { Order } from '../types';
import type { AgentOrder } from './AgentShopper';
import { buildTxExplorerUrl } from '@/onchain-facts';

import { ARC_CHAIN_ID } from '../chain-config';
const ESCROW_ADDRESS = (import.meta.env.VITE_ESCROW_ADDRESS ?? '') as `0x${string}`;

const ESCROW_ABI = [
  { name: 'confirmReceipt', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'orderId', type: 'bytes32' }], outputs: [] },
] as const;

/* ── Unified display shape ── */
interface DisplayOrder {
  id: string;
  source: 'manual' | 'agent';
  productName: string;
  storeName: string;
  price: number;
  txHash: string;
  txUrl: string;
  timestamp: string; // ISO
  deliveryName: string;
  deliveryAddress: string;
  fulfillment: 'delivery' | 'pickup';
  status: 'receipt_confirmed' | 'escrow_pending' | 'paid' | 'direct';
  escrowOrderId?: string;
  imageUrl?: string;
}

/* ── Loaders ── */
function loadManualOrders(): Order[] {
  try { return JSON.parse(localStorage.getItem('vm_orders') ?? '[]') as Order[]; } catch { return []; }
}
function loadAgentOrders(): AgentOrder[] {
  try { const s = localStorage.getItem('vm_agent_orders'); return s ? (JSON.parse(s) as AgentOrder[]) : []; } catch { return []; }
}
function saveManualOrders(orders: Order[]) {
  try { localStorage.setItem('vm_orders', JSON.stringify(orders)); } catch { /* */ }
}

/* ── Converters ── */
function toDisplay(o: Order): DisplayOrder {
  const item = o.items?.[0];
  const rawStatus = o.status ?? 'paid';
  const status: DisplayOrder['status'] =
    rawStatus === 'escrow_pending' ? 'escrow_pending'
    : rawStatus === 'receipt_confirmed' ? 'receipt_confirmed'
    : 'paid';
  return {
    id: o.id,
    source: 'manual',
    productName: item?.product?.name ?? 'Order',
    storeName: item?.store?.name ?? '',
    price: o.total ?? 0,
    txHash: o.txHash ?? '',
    txUrl: o.txExplorerUrl ?? (o.txHash ? buildTxExplorerUrl(ARC_CHAIN_ID, o.txHash) : ''),
    timestamp: new Date(o.timestamp).toISOString(),
    deliveryName: '',
    deliveryAddress: o.deliveryAddress ?? '',
    fulfillment: o.fulfillment ?? 'delivery',
    status,
    escrowOrderId: o.escrowOrderId,
    imageUrl: item?.product?.imageUrl,
  };
}
function agentToDisplay(o: AgentOrder): DisplayOrder {
  return {
    id: o.id,
    source: 'agent',
    productName: o.productName,
    storeName: o.storeName,
    price: o.price,
    txHash: o.txHash,
    txUrl: o.explorerUrl,
    timestamp: o.paidAt,
    deliveryName: o.deliveryName,
    deliveryAddress: o.deliveryAddress,
    fulfillment: 'delivery',
    status: 'paid',
  };
}

/* ── Order card ── */
function OrderCard({ order, onReleased }: { order: DisplayOrder; onReleased: (id: string) => void }) {
  const { writeContract, data: confirmHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: confirmHash });
  const [localDone, setLocalDone] = useState(false);

  const isEscrow = order.status === 'escrow_pending' && !!order.escrowOrderId && !!ESCROW_ADDRESS;
  const date = new Date(order.timestamp);
  const isConfirmed = order.status === 'receipt_confirmed' || localDone || isSuccess;
  const canConfirm = !isConfirmed;

  const handleConfirm = () => {
    if (isEscrow && order.escrowOrderId) {
      writeContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'confirmReceipt',
        args: [order.escrowOrderId as `0x${string}`],
        chainId: ARC_CHAIN_ID,
        // On success wagmi updates isSuccess; we also mark locally
      }, {
        onSuccess: () => { setLocalDone(true); onReleased(order.id); },
      });
    } else {
      setLocalDone(true);
      onReleased(order.id);
    }
  };



  const statusColor = isConfirmed ? '#10b981' : isEscrow ? '#f59e0b' : '#6366f1';
  const statusLabel = isConfirmed ? 'Confirmed' : isEscrow ? 'In Escrow' : order.status === 'paid' ? 'Paid' : 'Processing';

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface-strong)', border: `1px solid var(--border)` }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3">
        {order.imageUrl
          ? <img src={order.imageUrl} alt={order.productName} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
          : <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--surface)' }}>
              {order.source === 'agent' ? <Bot size={18} style={{ color: statusColor }} />
                : order.fulfillment === 'pickup' ? <Store size={18} style={{ color: statusColor }} />
                : <Truck size={18} style={{ color: statusColor }} />}
            </div>
        }
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: 'var(--ink)' }}>{order.productName}</p>
          <p className="text-xs truncate" style={{ color: 'var(--subtle)' }}>
            {order.storeName}
            {order.source === 'agent' && <span className="ml-1 opacity-60">· Agent</span>}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${statusColor}20`, color: statusColor }}>
              {statusLabel}
            </span>
            <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
              <Clock size={9} className="inline mr-0.5" />
              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' '}
              {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {order.txHash && (
              <span className="inline-flex items-center gap-1">
                <a href={order.txUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-mono"
                  style={{ color: '#0891b2' }}>
                  <ExternalLink size={9} />
                  {order.txHash.slice(0, 8)}…
                </a>
                <CopyField value={order.txHash} />
              </span>
            )}
          </div>
        </div>
        {/* Price + confirm button column */}
        <div className="flex flex-col items-end gap-2 ml-2 flex-shrink-0">
          <div className="flex items-center gap-1">
            <TokenUSDC size={13} variant="branded" />
            <span className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{order.price.toFixed(2)}</span>
          </div>
          {canConfirm ? (
            <button
              onClick={handleConfirm}
              disabled={isPending || isConfirming}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all disabled:opacity-60 whitespace-nowrap"
              style={{ background: '#10b981', color: '#fff', minWidth: 120 }}>
              {isPending || isConfirming
                ? <><Loader2 size={12} className="animate-spin" /> {isConfirming ? 'On-chain…' : 'Signing…'}</>
                : <><CheckCircle2 size={12} /> Confirm order received</>}
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl font-medium"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
              <CheckCircle2 size={12} /> Confirmed
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Page ── */
export default function OrdersPage({ onBack }: { onBack: () => void }) {
  const [manualOrders, setManualOrders] = useState<Order[]>(() => loadManualOrders());
  const [agentOrdersState, setAgentOrdersState] = useState<AgentOrder[]>(() => loadAgentOrders());

  const handleReleased = useCallback((id: string) => {
    // Try manual orders first
    setManualOrders(prev => {
      const updated = prev.map(o => o.id === id ? { ...o, status: 'receipt_confirmed' as const } : o);
      saveManualOrders(updated);
      return updated;
    });
    // Also mark agent orders
    setAgentOrdersState(prev => {
      const updated = prev.map(o => o.id === id ? { ...o, received: true } : o);
      try { localStorage.setItem('vm_agent_orders', JSON.stringify(updated)); } catch { /* */ }
      return updated;
    });
  }, []);

  // Merge and sort newest first
  const all: DisplayOrder[] = [
    ...manualOrders.map(toDisplay),
    ...agentOrdersState.map(agentToDisplay),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Poll for new orders
  useEffect(() => {
    const interval = setInterval(() => {
      setManualOrders(loadManualOrders());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="min-h-screen pb-20" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={17} style={{ color: 'var(--ink)' }} />
        </button>
        <div>
          <h1 className="font-bold text-lg" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--ink)' }}>My Orders</h1>
          <p className="text-xs" style={{ color: 'var(--ink-secondary)' }}>{all.length} order{all.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">

        {all.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 opacity-50">
            <Package size={36} style={{ color: 'var(--ink-secondary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--ink-secondary)' }}>No orders yet</p>
            <p className="text-xs text-center" style={{ color: 'var(--ink-tertiary)' }}>Your purchases will appear here</p>
          </div>
        )}

        <AnimatePresence>
          {all.map(o => (
            <OrderCard key={o.id} order={o} onReleased={handleReleased} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
