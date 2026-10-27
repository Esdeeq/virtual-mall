/**
 * PaymentMethodModal
 * Lets the buyer choose HOW to pay:
 *  1. Pay with USDC from connected wallet (browser sign)
 *  2. Pay from Agent Wallet (server-side, silent — no wallet popup)
 *  3. Swap any crypto → USDC via Circle App Kit
 *  4. Buy USDC with fiat (directs to testnet faucet / mainnet info)
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, ArrowLeftRight, CreditCard, CheckCircle2, ChevronRight, Bot, Loader2, AlertCircle } from 'lucide-react';
import { TokenUSDC } from '@web3icons/react';
import { useAccount, useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';
import { getUsdc } from '@/onchain-facts';
import { Amount, usdcDecimalsFor } from '@/onchain-money';
import { SwapToUSDC } from './SwapToUSDC';

import { ARC_CHAIN_ID } from '../chain-config';

type Tab = 'usdc' | 'agent' | 'swap' | 'fiat';

interface AgentWalletInfo {
  address: string;
  usdcBalance: string;
  chain: string;
}

interface Props {
  open: boolean;
  total: number;          // cart total in USDC
  onClose: () => void;
  onProceed: (agentTxHash?: string) => void;  // proceed to checkout; agentTxHash set when agent paid
}

export function PaymentMethodModal({ open, total, onClose, onProceed }: Props) {
  const [tab, setTab] = useState<Tab>('usdc');
  const { address } = useAccount();

  // Agent wallet state
  const [agentInfo, setAgentInfo] = useState<AgentWalletInfo | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentPayLoading, setAgentPayLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  // Fetch agent wallet info when tab opens or modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch('/api/agent/wallet')
      .then(r => r.json())
      .then((d: { ok: boolean; address?: string; usdcBalance?: string; chain?: string; error?: string }) => {
        if (cancelled) return;
        setAgentLoading(false);
        if (d.ok && d.address) {
          setAgentInfo({ address: d.address, usdcBalance: d.usdcBalance ?? '0', chain: d.chain ?? 'Arc Testnet' });
        } else {
          setAgentInfo(null);
        }
      })
      .catch(() => { if (!cancelled) { setAgentLoading(false); setAgentInfo(null); } });
    return () => { cancelled = true; };
  }, [open]);

  const agentBalance = agentInfo ? parseFloat(agentInfo.usdcBalance) : 0;
  const agentHasFunds = agentBalance >= total;

  const handleAgentPay = async () => {
    setAgentPayLoading(true);
    setAgentError(null);
    try {
      const r = await fetch('/api/agent/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total }),
      });
      const d = await r.json() as { ok: boolean; txHash?: string; error?: string };
      if (d.ok && d.txHash) {
        onProceed(d.txHash);
      } else {
        setAgentError(d.error ?? 'Payment failed');
      }
    } catch {
      setAgentError('Server unavailable. Start the server with: bun run server');
    } finally {
      setAgentPayLoading(false);
    }
  };

  const usdcFact = getUsdc(ARC_CHAIN_ID);
  const { data: balanceRaw } = useReadContract({
    address: usdcFact?.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && !!usdcFact },
  });
  const balance = balanceRaw != null
    ? Number(Amount.fromRaw(balanceRaw, usdcDecimalsFor(ARC_CHAIN_ID)).toFixed(2))
    : null;
  const hasSufficientBalance = balance !== null && balance >= total;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'usdc',  label: 'My Wallet', icon: <Wallet size={14} /> },
    { id: 'agent', label: 'Agent',     icon: <Bot size={14} /> },
    { id: 'swap',  label: 'Swap',      icon: <ArrowLeftRight size={14} /> },
    { id: 'fiat',  label: 'Card',      icon: <CreditCard size={14} /> },
  ];

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="payment-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="relative w-full max-w-md rounded-3xl overflow-hidden flex flex-col"
            style={{
              background: 'var(--surface-strong)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--card-shadow-lift)',
              maxHeight: '92dvh',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top gradient accent */}
            <div
              className="h-1 flex-shrink-0"
              style={{ background: 'linear-gradient(90deg,#1d4ed8,#2563eb,#0ea5e9)' }}
            />

            {/* Header */}
            <div className="flex items-start justify-between p-5 pb-3 flex-shrink-0">
              <div>
                <h2 className="display font-bold text-base" style={{ color: 'var(--ink)' }}>
                  Choose payment method
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  Order total: <strong className="font-bold" style={{ color: 'var(--ink)' }}>{total.toFixed(2)} USDC</strong>
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
              >
                <X size={14} style={{ color: 'var(--subtle)' }} />
              </button>
            </div>

            {/* Tab strip */}
            <div className="px-5 flex gap-1.5 flex-shrink-0">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: tab === t.id ? 'var(--accent)' : 'var(--surface-muted)',
                    color: tab === t.id ? 'var(--bg)' : 'var(--muted)',
                    border: `1px solid ${tab === t.id ? 'transparent' : 'var(--border)'}`,
                  }}
                >
                  <span style={{ opacity: tab === t.id ? 1 : 0.7 }}>{t.icon}</span>
                  <span style={{ fontSize: '0.65rem', letterSpacing: '0.01em' }}>{t.label}</span>
                </button>
              ))}
            </div>
            <p className="px-5 pt-2 text-xs" style={{ color: 'var(--subtle)' }}>
              {tab === 'usdc' && 'Pay directly from your connected wallet — requires wallet confirmation.'}
              {tab === 'agent' && 'Pay silently from the agent wallet — no wallet popup.'}
              {tab === 'swap' && 'Swap another token to USDC first, then proceed.'}
              {tab === 'fiat' && 'Buy USDC with a card or bank transfer.'}
            </p>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5 pt-4">
              <AnimatePresence mode="wait">
                {tab === 'usdc' && (
                  <motion.div
                    key="usdc"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-4"
                  >
                    {/* Balance display */}
                    <div
                      className="flex items-center justify-between p-4 rounded-2xl"
                      style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <Wallet size={16} style={{ color: 'var(--subtle)' }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Wallet USDC balance</p>
                          <p className="text-xs" style={{ color: 'var(--subtle)' }}>On testnet</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TokenUSDC variant="branded" size={16} />
                        <span className="display font-bold tabular-nums" style={{ color: 'var(--ink)', fontSize: '1.1rem' }}>
                          {balance !== null ? balance.toFixed(2) : address ? '...' : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    {address && (
                      hasSufficientBalance ? (
                        <div
                          className="flex items-center gap-2 p-3 rounded-xl"
                          style={{ background: 'rgba(15,107,56,0.08)', border: '1px solid rgba(15,107,56,0.20)' }}
                        >
                          <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                          <p className="text-xs font-medium" style={{ color: 'var(--success)' }}>
                            Sufficient balance — ready to checkout
                          </p>
                        </div>
                      ) : (
                        <div
                          className="flex flex-col gap-1 p-3 rounded-xl"
                          style={{ background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.18)' }}
                        >
                          <p className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>
                            Balance too low by {balance !== null ? (total - balance).toFixed(2) : '?'} USDC
                          </p>
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>
                            Use the Swap or Buy with Card tabs to top up, or get free testnet USDC from the sidebar button.
                          </p>
                        </div>
                      )
                    )}

                    {!address && (
                      <p className="text-xs text-center py-2" style={{ color: 'var(--subtle)' }}>
                        Connect your wallet to see your balance
                      </p>
                    )}

                    {/* Proceed CTA */}
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onProceed()}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white"
                      style={{
                        background: hasSufficientBalance
                          ? 'linear-gradient(135deg,#1d4ed8,#0ea5e9)'
                          : 'var(--surface-muted)',
                        color: hasSufficientBalance ? 'white' : 'var(--subtle)',
                        cursor: hasSufficientBalance ? 'pointer' : 'default',
                      }}
                    >
                      Proceed to checkout
                      <ChevronRight size={14} />
                    </motion.button>
                  </motion.div>
                )}

                {tab === 'agent' && (
                  <motion.div
                    key="agent"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-4"
                  >
                    {/* Agent wallet balance card */}
                    <div
                      className="flex items-center justify-between p-4 rounded-2xl"
                      style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <Bot size={16} style={{ color: 'var(--subtle)' }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Mall Agent Wallet</p>
                          <p className="text-xs font-mono truncate max-w-[140px]" style={{ color: 'var(--subtle)' }}>
                            {agentLoading ? 'Loading…' : agentInfo ? `${agentInfo.address.slice(0, 8)}…${agentInfo.address.slice(-6)}` : 'Unavailable'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TokenUSDC variant="branded" size={16} />
                        <span className="display font-bold tabular-nums" style={{ color: 'var(--ink)', fontSize: '1.1rem' }}>
                          {agentLoading ? '…' : agentInfo ? parseFloat(agentInfo.usdcBalance).toFixed(2) : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    {!agentLoading && agentInfo && (
                      agentHasFunds ? (
                        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(15,107,56,0.08)', border: '1px solid rgba(15,107,56,0.20)' }}>
                          <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                          <p className="text-xs font-medium" style={{ color: 'var(--success)' }}>Agent wallet has sufficient funds — payment will go through silently.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 p-3 rounded-xl" style={{ background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.18)' }}>
                          <p className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>
                            Agent wallet needs {(total - agentBalance).toFixed(2)} more USDC
                          </p>
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>
                            Fund address: <span className="font-mono">{agentInfo.address.slice(0, 12)}…</span>
                          </p>
                        </div>
                      )
                    )}

                    {!agentLoading && !agentInfo && (
                      <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.18)' }}>
                        <AlertCircle size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                        <p className="text-xs" style={{ color: 'var(--danger)' }}>
                          Agent server not running. Start it with: <code className="font-mono">bun run server</code>
                        </p>
                      </div>
                    )}

                    {agentError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.18)' }}>
                        <AlertCircle size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                        <p className="text-xs" style={{ color: 'var(--danger)' }}>{agentError}</p>
                      </div>
                    )}

                    {/* Pay silently button */}
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { void handleAgentPay(); }}
                      disabled={agentPayLoading || !agentInfo || !agentHasFunds}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white"
                      style={{
                        background: agentInfo && agentHasFunds
                          ? 'linear-gradient(135deg,#7c3aed,#6366f1)'
                          : 'var(--surface-muted)',
                        color: agentInfo && agentHasFunds ? 'white' : 'var(--subtle)',
                        opacity: agentPayLoading ? 0.7 : 1,
                        cursor: agentInfo && agentHasFunds && !agentPayLoading ? 'pointer' : 'default',
                      }}
                    >
                      {agentPayLoading
                        ? <><Loader2 size={15} className="animate-spin" /> Processing…</>
                        : <><Bot size={15} /> Pay {total.toFixed(2)} USDC silently</>
                      }
                    </motion.button>
                  </motion.div>
                )}

                {tab === 'swap' && (
                  <motion.div
                    key="swap"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SwapToUSDC
                      onSwapComplete={() => {
                        // After swap, jump to USDC tab to show new balance + proceed
                        setTimeout(() => setTab('usdc'), 1200);
                      }}
                    />
                    <p className="text-xs mt-4 text-center leading-relaxed" style={{ color: 'var(--subtle)' }}>
                      Swaps are routed through the LiFi aggregator via Circle App Kit.<br />
                      You are subject to LiFi's terms of service.
                    </p>
                  </motion.div>
                )}

                {tab === 'fiat' && (
                  <motion.div
                    key="fiat"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-4"
                  >
                    {/* Fiat options */}
                    <div className="flex flex-col gap-2">
                      {[
                        { icon: '💳', label: 'Debit / Credit Card', detail: 'Visa, Mastercard, Amex' },
                        { icon: '', label: 'Apple Pay', detail: 'One-tap checkout' },
                        { icon: '🤖', label: 'Google Pay', detail: 'One-tap checkout' },
                        { icon: '🏦', label: 'Bank Transfer', detail: 'ACH, SEPA, wire' },
                      ].map(opt => (
                        <div
                          key={opt.label}
                          className="flex items-center gap-3 p-3.5 rounded-xl"
                          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                        >
                          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{opt.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{opt.label}</p>
                            <p className="text-xs" style={{ color: 'var(--subtle)' }}>{opt.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Testnet note */}
                    <div
                      className="rounded-xl p-4 flex flex-col gap-2"
                      style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)' }}
                    >
                      <p className="text-xs font-bold" style={{ color: '#2563eb' }}>
                        You're on testnet
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                        Fiat onramp is available on mainnet via Circle's onramp widget (card, Apple Pay, Google Pay, bank transfer). On testnet, use the free <strong>Get test USDC</strong> button in the Arc Studio sidebar instead.
                      </p>
                      <a
                        href="https://faucet.circle.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold underline"
                        style={{ color: '#2563eb' }}
                      >
                        Open Circle Faucet ↗
                      </a>
                    </div>

                    {/* CTA after getting USDC */}
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setTab('usdc')}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
                      style={{
                        background: 'var(--surface-muted)',
                        color: 'var(--muted)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      I've topped up — check my balance
                      <ChevronRight size={14} />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
