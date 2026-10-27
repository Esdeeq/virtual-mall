import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { X, Truck, Store, CheckCircle, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { TokenUSDC } from '@web3icons/react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { erc20Abi, keccak256, encodePacked, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts';
import { parseAmount } from '@/onchain-money';
import type { CartItem, Order } from '../types';

const ESCROW_ADDRESS = (import.meta.env.VITE_ESCROW_ADDRESS ?? '') as `0x${string}`;

// Minimal ABI for MallEscrow — only the deposit function
const ESCROW_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'orderId', type: 'bytes32' },
      { name: 'amount',  type: 'uint256' },
      { name: 'sig',     type: 'bytes'   },
    ],
    outputs: [],
  },
] as const;

import { ARC_CHAIN_ID } from '../chain-config';

// Merchant treasury address (testnet demo — receives USDC payments)
const MERCHANT_ADDRESS = '0xEA1d5555d707086622181Ac64c43DB6860868f0E' as `0x${string}`;

interface CheckoutModalProps {
  open: boolean;
  cart: CartItem[];
  agentTxHash?: string;   // pre-paid by agent wallet — skip wagmi signing
  onClose: () => void;
  onOrderComplete: (order: Order) => void;
}

type FulfillmentMode = 'delivery' | 'pickup';

function parseOnchainError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? '';
  if (msg.includes('user rejected') || msg.includes('denied')) return 'Transaction cancelled.';
  if (msg.includes('insufficient') || msg.includes('exceeds balance')) return 'Insufficient USDC balance. Get more from the bank.';
  if (msg.includes('reverted')) return 'Transaction reverted. Please try again.';
  if (msg.includes('network') || msg.includes('timeout')) return 'Network error. Check your connection.';
  return 'Something went wrong. Please try again.';
}

interface DeliveryFields {
  fullName: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const EMPTY_DELIVERY: DeliveryFields = { fullName: '', email: '', street: '', city: '', state: '', zip: '', country: '' };

export function CheckoutModal({ open, cart, agentTxHash, onClose, onOrderComplete }: CheckoutModalProps) {
  const [fulfillment, setFulfillment] = useState<FulfillmentMode>('delivery');
  const [delivery, setDelivery] = useState<DeliveryFields>(EMPTY_DELIVERY);
  const [fieldErrors, setFieldErrors] = useState<Partial<DeliveryFields>>({});

  // When the modal opens, pre-fill from agent profile (sessionStorage) or saved profile (localStorage)
  useEffect(() => {
    if (!open) return;
    try {
      const agentRaw = sessionStorage.getItem('agent_delivery_profile');
      if (agentRaw) {
        sessionStorage.removeItem('agent_delivery_profile');
        setDelivery(JSON.parse(agentRaw) as DeliveryFields);
        return;
      }
    } catch { /* ignore */ }
    try {
      const savedRaw = localStorage.getItem('vm_agent_profile');
      if (savedRaw) setDelivery(JSON.parse(savedRaw) as DeliveryFields);
    } catch { /* ignore */ }
  }, [open]);

  // keep a serialised string for the Order type
  const deliveryAddress = `${delivery.fullName}, ${delivery.street}, ${delivery.city}, ${delivery.state} ${delivery.zip}, ${delivery.country} — ${delivery.email}`;

  const { address, chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const usdcFact = getUsdc(ARC_CHAIN_ID);

  // Separate hooks for approve and deposit so their hashes never collide
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending, isError: isApproveError, error: approveError, reset: resetApprove } = useWriteContract();
  const { writeContract: writeDeposit, data: depositHash, isPending: isDepositPending, isError: isDepositError, error: depositError, reset: resetDeposit } = useWriteContract();
  // Direct transfer (no escrow)
  const { writeContract: writeTransfer, data: transferHash, isPending: isTransferPending, isError: isTransferError, error: transferError, reset: resetTransfer } = useWriteContract();

  // Unified pending/error/hash for the UI — whichever step is active
  const [escrowStep, setEscrowStep] = useState<0 | 1 | 2 | 3>(0);
  const hash = escrowStep === 3 ? depositHash : escrowStep === 0 ? transferHash : approveHash;
  const isPending = isApprovePending || isDepositPending || isTransferPending;
  const isError = isApproveError || isDepositError || isTransferError;
  const error = approveError ?? depositError ?? transferError;
  const reset = () => { resetApprove(); resetDeposit(); resetTransfer(); setEscrowStep(0); };

  const { isLoading: isApprovingConfirming, isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isDepositConfirming, isSuccess: depositConfirmed } = useWaitForTransactionReceipt({ hash: depositHash });
  const { isLoading: isTransferConfirming, isSuccess: transferConfirmed } = useWaitForTransactionReceipt({ hash: transferHash });
  const isConfirming = isApprovingConfirming || isDepositConfirming || isTransferConfirming;
  const isSuccess = escrowStep === 3 ? depositConfirmed : escrowStep === 0 ? transferConfirmed : false;

  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const isWrongChain = !!chainId && chainId !== ARC_CHAIN_ID;

  const [escrowOrderId, setEscrowOrderId] = useState<Hex | null>(null);
  const [escrowSig, setEscrowSig] = useState<Hex | null>(null);
  const [_escrowError, setEscrowError] = useState<string | null>(null);

  // When approve confirms, call deposit
  useEffect(() => {
    if (!approveConfirmed || escrowStep !== 1 || !escrowOrderId || !escrowSig || !usdcFact) return;
    firedRef.current = false; // reset so deposit completion can fire onOrderComplete
    setEscrowStep(3);
    const parsedAmount = parseAmount(ARC_CHAIN_ID, total.toFixed(6));
    writeDeposit({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'deposit',
      args: [escrowOrderId, parsedAmount.raw, escrowSig],
      chainId: ARC_CHAIN_ID,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveConfirmed]);

  const validateDelivery = (): boolean => {
    if (fulfillment !== 'delivery') return true;
    const errs: Partial<DeliveryFields> = {};
    if (!delivery.fullName.trim()) errs.fullName = 'Required';
    if (!delivery.email.trim() || !/\S+@\S+\.\S+/.test(delivery.email)) errs.email = 'Valid email required';
    if (!delivery.street.trim()) errs.street = 'Required';
    if (!delivery.city.trim()) errs.city = 'Required';
    if (!delivery.state.trim()) errs.state = 'Required';
    if (!delivery.zip.trim()) errs.zip = 'Required';
    if (!delivery.country.trim()) errs.country = 'Required';
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return false; }
    setFieldErrors({});
    return true;
  };

  const handlePay = async () => {
    if (!address) return;
    if (!validateDelivery()) return;
    if (isWrongChain) { switchChain({ chainId: ARC_CHAIN_ID }); return; }
    if (!usdcFact) return;

    setEscrowError(null);

    // If escrow is configured, use approve + deposit flow
    if (ESCROW_ADDRESS && ESCROW_ADDRESS !== '0x') {
      try {
        // Generate a unique orderId from order details
        const orderIdRaw = keccak256(encodePacked(
          ['address', 'uint256', 'uint256'],
          [address, BigInt(Math.floor(total * 1e6)), BigInt(Date.now())]
        ));
        setEscrowOrderId(orderIdRaw);

        const parsedAmount = parseAmount(ARC_CHAIN_ID, total.toFixed(6));

        // Sign locally with the escrow signer key (VITE_ESCROW_SIGNER_KEY)
        const signerKey = import.meta.env.VITE_ESCROW_SIGNER_KEY as `0x${string}` | undefined;
        let signature: Hex | null = null;
        if (signerKey) {
          const signerAccount = privateKeyToAccount(signerKey);
          signature = await signerAccount.signTypedData({
            domain: {
              name: 'MallEscrow',
              version: '1',
              chainId: ARC_CHAIN_ID,
              verifyingContract: ESCROW_ADDRESS,
            },
            types: { OrderAuth: [
              { name: 'orderId', type: 'bytes32' },
              { name: 'buyer',   type: 'address' },
              { name: 'amount',  type: 'uint256' },
            ]},
            primaryType: 'OrderAuth',
            message: { orderId: orderIdRaw, buyer: address, amount: parsedAmount.raw },
          });
        }
        if (!signature) {
          // Signer key not configured — fall back to direct transfer
          writeTransfer({
            address: usdcFact.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [MERCHANT_ADDRESS, parsedAmount.raw],
            chainId: ARC_CHAIN_ID,
          });
          return;
        }
        setEscrowSig(signature);
        setEscrowStep(1);

        // Step 1: approve escrow to spend USDC
        writeApprove({
          address: usdcFact.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [ESCROW_ADDRESS, parsedAmount.raw],
          chainId: ARC_CHAIN_ID,
        });
      } catch {
        // Network error — fall back to direct transfer
        const parsedAmount = parseAmount(ARC_CHAIN_ID, total.toFixed(6));
        writeTransfer({
          address: usdcFact.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [MERCHANT_ADDRESS, parsedAmount.raw],
          chainId: ARC_CHAIN_ID,
        });
      }
      return;
    }

    // No escrow — direct transfer
    const parsedAmount = parseAmount(ARC_CHAIN_ID, total.toFixed(6));
    writeTransfer({
      address: usdcFact.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [MERCHANT_ADDRESS, parsedAmount.raw],
      chainId: ARC_CHAIN_ID,
    });
  };

  // Fired refs — declared before the reset effect that references them
  const firedRef = useRef(false);
  // Auto-complete when agent pre-paid (no wagmi signing needed)
  const agentFiredRef = useRef(false);
  useEffect(() => {
    if (open && agentTxHash && !agentFiredRef.current) {
      agentFiredRef.current = true;
      const order: Order = {
        id: `VM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        items: cart,
        total,
        timestamp: Date.now(),
        fulfillment,
        deliveryAddress: fulfillment === 'delivery' ? deliveryAddress : undefined,
        txHash: agentTxHash,
        status: 'confirmed',
      };
      const t = setTimeout(() => onOrderComplete(order), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agentTxHash]);

  // Reset fired flags when modal closes
  useEffect(() => {
    if (!open) {
      agentFiredRef.current = false;
      firedRef.current = false;
      setEscrowStep(0);
      setEscrowOrderId(null);
      setEscrowSig(null);
    }
  }, [open]);

  // Fire onOrderComplete exactly once when the deposit or direct transfer confirms
  useEffect(() => {
    if (depositConfirmed && depositHash && !firedRef.current) {
      firedRef.current = true;
      const order: Order = {
        id: `VM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        items: cart,
        total,
        timestamp: Date.now(),
        fulfillment,
        deliveryAddress: fulfillment === 'delivery' ? deliveryAddress : undefined,
        txHash: depositHash,
        status: 'escrow_pending',
        escrowOrderId: escrowOrderId ?? undefined,
      };
      const t = setTimeout(() => onOrderComplete(order), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositConfirmed, depositHash]);

  useEffect(() => {
    if (transferConfirmed && transferHash && !firedRef.current) {
      firedRef.current = true;
      const order: Order = {
        id: `VM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        items: cart,
        total,
        timestamp: Date.now(),
        fulfillment,
        deliveryAddress: fulfillment === 'delivery' ? deliveryAddress : undefined,
        txHash: transferHash,
        status: 'confirmed',
      };
      const t = setTimeout(() => onOrderComplete(order), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferConfirmed, transferHash]);

  const txUrl = hash ? buildTxExplorerUrl(ARC_CHAIN_ID, hash) : null;
  const stores = [...new Map(cart.map(i => [i.store.id, i.store])).values()];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="checkout-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />

          <motion.div
            key="checkout-modal"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md overflow-y-auto"
            style={{
              background: 'var(--surface-strong)',
              borderLeft: '1px solid var(--border)',
              backdropFilter: 'blur(24px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header accent */}
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #6366f1, #ec4899, #f97316)' }} />

            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>Checkout</h2>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                    {cart.length} item{cart.length !== 1 ? 's' : ''} from {stores.length} store{stores.length !== 1 ? 's' : ''}
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
              <div className="space-y-3 mb-6">
                {cart.map(item => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-3 p-3 rounded-2xl"
                    style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
                        {item.product.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                        {item.store.name} · qty {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <TokenUSDC variant="branded" size={14} />
                      <span className="text-sm font-bold mono" style={{ color: 'var(--ink)' }}>
                        {(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div
                className="flex items-center justify-between p-4 rounded-2xl mb-6"
                style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
              >
                <span className="font-medium" style={{ color: 'var(--ink)' }}>Total</span>
                <div className="flex items-center gap-1.5">
                  <TokenUSDC variant="branded" size={18} />
                  <span className="display text-xl font-bold mono tabular-nums" style={{ color: 'var(--ink)' }}>
                    {total.toFixed(2)}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>USDC</span>
                </div>
              </div>

              {/* Fulfillment toggle */}
              <div className="mb-6">
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>
                  How do you want your items?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(['delivery', 'pickup'] as FulfillmentMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setFulfillment(mode)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all"
                      style={{
                        background: fulfillment === mode ? 'var(--accent)' : 'var(--surface-muted)',
                        border: `2px solid ${fulfillment === mode ? 'var(--accent)' : 'var(--border)'}`,
                        color: fulfillment === mode ? 'white' : 'var(--ink)',
                        transform: fulfillment === mode ? 'scale(1.02)' : 'scale(1)',
                      }}
                    >
                      {mode === 'delivery' ? <Truck size={22} /> : <Store size={22} />}
                      <span className="text-sm font-semibold capitalize">{mode}</span>
                      <span className="text-xs opacity-70">
                        {mode === 'delivery' ? 'Ship to address' : 'Show receipt in-store'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery address — structured form */}
              <AnimatePresence>
                {fulfillment === 'delivery' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-6"
                  >
                    <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Delivery Details</p>
                    <div className="flex flex-col gap-2.5">
                      {/* Full Name */}
                      <div>
                        <input
                          type="text" placeholder="Full Name"
                          value={delivery.fullName}
                          onChange={e => setDelivery(d => ({ ...d, fullName: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: 'var(--surface-muted)', border: `1px solid ${fieldErrors.fullName ? 'var(--danger)' : 'var(--border)'}`, color: 'var(--ink)' }}
                        />
                        {fieldErrors.fullName && <p className="text-xs mt-0.5" style={{ color: 'var(--danger)' }}>{fieldErrors.fullName}</p>}
                      </div>
                      {/* Email */}
                      <div>
                        <input
                          type="email" placeholder="Email Address"
                          value={delivery.email}
                          onChange={e => setDelivery(d => ({ ...d, email: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: 'var(--surface-muted)', border: `1px solid ${fieldErrors.email ? 'var(--danger)' : 'var(--border)'}`, color: 'var(--ink)' }}
                        />
                        {fieldErrors.email && <p className="text-xs mt-0.5" style={{ color: 'var(--danger)' }}>{fieldErrors.email}</p>}
                      </div>
                      {/* Street */}
                      <div>
                        <input
                          type="text" placeholder="Street Address"
                          value={delivery.street}
                          onChange={e => setDelivery(d => ({ ...d, street: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: 'var(--surface-muted)', border: `1px solid ${fieldErrors.street ? 'var(--danger)' : 'var(--border)'}`, color: 'var(--ink)' }}
                        />
                        {fieldErrors.street && <p className="text-xs mt-0.5" style={{ color: 'var(--danger)' }}>{fieldErrors.street}</p>}
                      </div>
                      {/* City + State */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="text" placeholder="City"
                            value={delivery.city}
                            onChange={e => setDelivery(d => ({ ...d, city: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                            style={{ background: 'var(--surface-muted)', border: `1px solid ${fieldErrors.city ? 'var(--danger)' : 'var(--border)'}`, color: 'var(--ink)' }}
                          />
                          {fieldErrors.city && <p className="text-xs mt-0.5" style={{ color: 'var(--danger)' }}>{fieldErrors.city}</p>}
                        </div>
                        <div>
                          <input
                            type="text" placeholder="State / Province"
                            value={delivery.state}
                            onChange={e => setDelivery(d => ({ ...d, state: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                            style={{ background: 'var(--surface-muted)', border: `1px solid ${fieldErrors.state ? 'var(--danger)' : 'var(--border)'}`, color: 'var(--ink)' }}
                          />
                          {fieldErrors.state && <p className="text-xs mt-0.5" style={{ color: 'var(--danger)' }}>{fieldErrors.state}</p>}
                        </div>
                      </div>
                      {/* ZIP + Country */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="text" placeholder="ZIP / Postal Code"
                            value={delivery.zip}
                            onChange={e => setDelivery(d => ({ ...d, zip: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                            style={{ background: 'var(--surface-muted)', border: `1px solid ${fieldErrors.zip ? 'var(--danger)' : 'var(--border)'}`, color: 'var(--ink)' }}
                          />
                          {fieldErrors.zip && <p className="text-xs mt-0.5" style={{ color: 'var(--danger)' }}>{fieldErrors.zip}</p>}
                        </div>
                        <div>
                          <input
                            type="text" placeholder="Country"
                            value={delivery.country}
                            onChange={e => setDelivery(d => ({ ...d, country: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                            style={{ background: 'var(--surface-muted)', border: `1px solid ${fieldErrors.country ? 'var(--danger)' : 'var(--border)'}`, color: 'var(--ink)' }}
                          />
                          {fieldErrors.country && <p className="text-xs mt-0.5" style={{ color: 'var(--danger)' }}>{fieldErrors.country}</p>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pickup info */}
              <AnimatePresence>
                {fulfillment === 'pickup' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-6"
                  >
                    <div
                      className="p-4 rounded-2xl"
                      style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                    >
                      {stores.map(store => (
                        <div key={store.id} className="mb-3 last:mb-0">
                          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                            {store.icon} {store.name}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
                            {store.address}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                            {store.pickupHours}
                          </p>
                        </div>
                      ))}
                      <p className="text-xs mt-2 pt-2" style={{ color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
                        Present your receipt at the store counter to collect your items.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Wallet not connected */}
              {!address && (
                <div
                  className="flex items-center gap-3 p-4 rounded-2xl mb-4"
                  style={{ background: 'rgba(186,43,76,0.1)', border: '1px solid var(--danger)' }}
                >
                  <AlertCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                  <p className="text-sm" style={{ color: 'var(--danger)' }}>
                    Connect your wallet to pay with USDC
                  </p>
                </div>
              )}

              {/* Wrong chain */}
              {isWrongChain && address && (
                <div
                  className="flex items-center gap-3 p-4 rounded-2xl mb-4"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b' }}
                >
                  <AlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <p className="text-sm" style={{ color: '#f59e0b' }}>
                    Switch to the correct network to pay with USDC
                  </p>
                </div>
              )}

              {/* Error state */}
              {isError && (
                <div
                  className="flex items-center gap-3 p-4 rounded-2xl mb-4"
                  style={{ background: 'rgba(186,43,76,0.1)', border: '1px solid var(--danger)' }}
                >
                  <AlertCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                  <div className="flex-1">
                    <p className="text-sm" style={{ color: 'var(--danger)' }}>{parseOnchainError(error)}</p>
                    <button onClick={reset} className="text-xs mt-1 underline" style={{ color: 'var(--muted)' }}>
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {/* Confirming state */}
              {(isPending || isConfirming) && (
                <div
                  className="flex items-center gap-3 p-4 rounded-2xl mb-4"
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid #6366f1' }}
                >
                  <Loader2 size={18} className="animate-spin" style={{ color: '#6366f1' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#6366f1' }}>
                      {isPending && escrowStep === 1 ? 'Step 1/2 — Approve USDC in wallet...' :
                       isPending && escrowStep === 3 ? 'Step 2/2 — Confirm deposit in wallet...' :
                       isPending ? 'Confirm in wallet...' :
                       isApprovingConfirming ? 'Step 1/2 — Approving USDC...' :
                       isDepositConfirming ? 'Step 2/2 — Depositing to escrow...' :
                       'Confirming on-chain...'}
                    </p>
                    {hash && (
                      <a
                        href={txUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs flex items-center gap-1 mt-0.5"
                        style={{ color: 'var(--subtle)' }}
                      >
                        View transaction <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Success banner */}
              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 rounded-2xl mb-4"
                  style={{ background: 'rgba(26,128,71,0.1)', border: '1px solid var(--success)' }}
                >
                  <CheckCircle size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--success)' }}>
                      Payment confirmed!
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>Generating your receipt...</p>
                  </div>
                </motion.div>
              )}

              {/* Agent pre-paid — show processing state, no Pay button */}
              {agentTxHash ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid #7c3aed' }}
                >
                  <Loader2 size={18} className="animate-spin" style={{ color: '#7c3aed' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#7c3aed' }}>
                      Agent wallet paid — generating receipt…
                    </p>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--subtle)' }}>
                      {agentTxHash.slice(0, 24)}…
                    </p>
                  </div>
                </motion.div>
              ) : (
                <>
                  {/* Pay button */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { void handlePay(); }}
                    disabled={!address || isPending || isConfirming || isSuccess || isSwitching}
                    className="w-full py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2 transition-opacity"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                      boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                      opacity: (!address || isPending || isConfirming || isSuccess) ? 0.6 : 1,
                    }}
                  >
                    {isSwitching ? (
                      <><Loader2 size={18} className="animate-spin" /> Switching network...</>
                    ) : isWrongChain && address ? (
                      'Switch Network'
                    ) : isPending ? (
                      <><Loader2 size={18} className="animate-spin" /> Confirm in wallet...</>
                    ) : isConfirming ? (
                      <><Loader2 size={18} className="animate-spin" /> Confirming...</>
                    ) : isSuccess ? (
                      <><CheckCircle size={18} /> Paid!</>
                    ) : (
                      <>
                        <TokenUSDC variant="mono" size={18} />
                        Pay {total.toFixed(2)} USDC
                      </>
                    )}
                  </motion.button>

                  <p className="text-center text-xs mt-3" style={{ color: 'var(--subtle)' }}>
                    Secured on-chain · Instant USDC settlement
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
