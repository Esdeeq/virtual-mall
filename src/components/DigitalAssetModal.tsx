import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, CheckCircle, ExternalLink, Copy, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { TokenUSDC } from '@web3icons/react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { erc20Abi } from 'viem';
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts';
import { parseAmount } from '@/onchain-money';
import { DIGITAL_CATEGORY_COLORS, DIGITAL_CATEGORY_LABELS } from '../data/digitalAssets';
import type { DigitalAsset } from '../data/digitalAssets';

const ARC_CHAIN_ID = 5042002;
const MERCHANT_ADDRESS = '0x5B12Ce46C7194aD57d143bC22847224047b1Ef42' as `0x${string}`;

function makeAssetKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 20 }, (_, i) =>
    i > 0 && i % 4 === 0 ? '-' + chars[Math.floor(Math.random() * chars.length)] : chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

interface Props {
  asset: DigitalAsset | null;
  onClose: () => void;
}

type Step = 'preview' | 'paying' | 'confirming' | 'done' | 'error';

export function DigitalAssetModal({ asset, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [assetKey] = useState(makeAssetKey);
  const prevAssetId = useRef<string | null>(null);

  const { address, chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const usdcFact = getUsdc(ARC_CHAIN_ID);
  const {
    writeContract, data: hash,
    isPending, isError, error, reset,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const isWrongChain = !!chainId && chainId !== ARC_CHAIN_ID;

  // Derive step from wagmi state
  const step: Step = isSuccess ? 'done'
    : isError ? 'error'
    : isConfirming ? 'confirming'
    : isPending ? 'paying'
    : 'preview';

  // Reset wagmi state when a new asset is opened
  useEffect(() => {
    if (asset && asset.id !== prevAssetId.current) {
      prevAssetId.current = asset.id;
      reset();
    }
  }, [asset, reset]);

  const handleBuy = () => {
    if (!address || !usdcFact || !asset) return;
    if (isWrongChain) { switchChain({ chainId: ARC_CHAIN_ID }); return; }
    const amount = parseAmount(ARC_CHAIN_ID, asset.price.toFixed(6));
    writeContract({
      address: usdcFact.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [MERCHANT_ADDRESS, amount.raw],
      chainId: ARC_CHAIN_ID,
    });
  };

  const handleCopy = () => {
    const el = document.createElement('textarea'); el.value = assetKey; el.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;'; document.body.appendChild(el); el.focus(); el.select(); try { document.execCommand('copy'); } catch { /* silent */ } document.body.removeChild(el);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const txUrl = hash ? buildTxExplorerUrl(ARC_CHAIN_ID, hash) : null;

  if (!asset) return null;
  const colors = DIGITAL_CATEGORY_COLORS[asset.category];

  return (
    <AnimatePresence>
      <motion.div
        key="da-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(12px)' }}
        onClick={onClose}
      />

      <motion.div
        key="da-modal"
        initial={{ opacity: 0, scale: 0.88, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="fixed z-50 inset-x-4 max-w-md mx-auto rounded-3xl overflow-hidden"
        style={{
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'var(--surface-strong)',
          border: '1px solid var(--border)',
          boxShadow: `0 32px 80px -12px rgba(0,0,0,0.45), 0 0 0 1px ${colors.accent}22`,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top gradient strip */}
        <div
          style={{
            height: '4px',
            background: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
          }}
        />

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            width: '32px', height: '32px', borderRadius: '50%',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--muted)', zIndex: 2,
          }}
        >
          <X size={15} />
        </button>

        <AnimatePresence mode="wait">
          {/* ── PREVIEW step ── */}
          {step === 'preview' && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Image */}
              <div style={{ height: '200px', position: 'relative', overflow: 'hidden' }}>
                <img
                  src={asset.imageUrl}
                  alt={asset.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(to top, ${colors.from}cc 0%, transparent 55%)`,
                  }}
                />
                {/* Badge */}
                {asset.badge && (
                  <div
                    style={{
                      position: 'absolute', top: '14px', left: '14px',
                      background: asset.badgeColor ?? colors.accent,
                      color: '#fff',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      padding: '3px 10px',
                      borderRadius: '999px',
                    }}
                  >
                    {asset.badge}
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute', bottom: '14px', left: '16px',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    opacity: 0.85,
                  }}
                >
                  {DIGITAL_CATEGORY_LABELS[asset.category]}
                </div>
              </div>

              <div style={{ padding: '20px 22px 24px' }}>
                <h2
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    color: 'var(--ink)',
                    fontFamily: 'Syne, sans-serif',
                    marginBottom: '8px',
                    lineHeight: 1.2,
                  }}
                >
                  {asset.name}
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '16px' }}>
                  {asset.description}
                </p>

                {/* Meta table */}
                {asset.meta && (
                  <div
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      marginBottom: '16px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px 16px',
                    }}
                  >
                    {Object.entries(asset.meta).map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--ink)', fontWeight: 600, marginTop: '2px' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Instant delivery badge */}
                <div
                  className="flex items-center gap-2 mb-5"
                  style={{
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                  }}
                >
                  <Zap size={13} style={{ color: '#22c55e' }} />
                  <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 700 }}>
                    Instant delivery to your wallet
                  </span>
                </div>

                {/* Price + buy */}
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--ink)', fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>
                      {asset.price.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <TokenUSDC size={14} variant="branded" />
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>USDC</span>
                    </div>
                  </div>

                  {!address ? (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 600 }}>Connect wallet to buy</div>
                  ) : isSwitching ? (
                    <div className="flex items-center gap-2" style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                      <Loader2 size={14} className="animate-spin" /> Switching chain...
                    </div>
                  ) : (
                    <motion.button
                      onClick={handleBuy}
                      style={{
                        background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '14px',
                        padding: '12px 24px',
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: `0 6px 20px ${colors.accent}66`,
                      }}
                      whileHover={{ scale: 1.04, boxShadow: `0 8px 28px ${colors.accent}88` }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {isWrongChain ? 'Switch Network' : 'Buy Now'}
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PAYING / CONFIRMING steps ── */}
          {(step === 'paying' || step === 'confirming') && (
            <motion.div
              key="paying"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ padding: '48px 28px', textAlign: 'center' }}
            >
              <div style={{ position: 'relative', width: '72px', height: '72px', margin: '0 auto 20px' }}>
                <div
                  style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors.from}22, ${colors.to}22)`,
                    border: `2px solid ${colors.accent}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Loader2 size={28} style={{ color: colors.accent, animation: 'spin 1s linear infinite' }} />
                </div>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink)', fontFamily: 'Syne, sans-serif', marginBottom: '8px' }}>
                {step === 'paying' ? 'Confirm in wallet' : 'Processing on-chain'}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                {step === 'paying'
                  ? 'Check your wallet app to approve the transaction.'
                  : `Sending ${asset.price.toFixed(2)} USDC — usually takes a few seconds.`}
              </p>
            </motion.div>
          )}

          {/* ── DONE step ── */}
          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              style={{ padding: '36px 24px 28px' }}
            >
              {/* Success ring */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.1 }}
                  style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: 'rgba(34,197,94,0.12)',
                    border: '2px solid rgba(34,197,94,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <CheckCircle size={30} style={{ color: '#22c55e' }} />
                </motion.div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--ink)', fontFamily: 'Syne, sans-serif', marginBottom: '4px' }}>
                  Asset delivered!
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                  {asset.name} is now in your wallet.
                </p>
              </div>

              {/* Asset key */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  marginBottom: '14px',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Asset Access Key
                </div>
                <div className="flex items-center justify-between gap-2">
                  <code
                    style={{
                      fontSize: '0.8125rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: colors.accent,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {assetKey}
                  </code>
                  <motion.button
                    onClick={handleCopy}
                    style={{
                      background: 'var(--surface-strong)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    whileTap={{ scale: 0.94 }}
                  >
                    <Copy size={11} />
                    {copied ? 'Copied!' : 'Copy'}
                  </motion.button>
                </div>
              </div>

              {/* Security note */}
              <div
                className="flex items-start gap-2 mb-14px"
                style={{
                  background: 'rgba(99,102,241,0.07)',
                  border: '1px solid rgba(99,102,241,0.15)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  marginBottom: '16px',
                }}
              >
                <ShieldCheck size={13} style={{ color: '#6366f1', marginTop: '1px', flexShrink: 0 }} />
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.55 }}>
                  Save this key. It proves ownership of your digital asset and can be used to
                  transfer or redeem it at any time.
                </p>
              </div>

              {/* Tx link + close */}
              <div className="flex items-center gap-2">
                {txUrl && (
                  <a
                    href={txUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 flex-1"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--muted)',
                      textDecoration: 'none',
                      justifyContent: 'center',
                    }}
                  >
                    <ExternalLink size={13} />
                    View on Explorer
                  </a>
                )}
                <motion.button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Done
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── ERROR step ── */}
          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ padding: '48px 28px', textAlign: 'center' }}
            >
              <AlertCircle size={36} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
                Transaction failed
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '20px' }}>
                {(error as { message?: string })?.message?.includes('User rejected')
                  ? 'You cancelled the transaction.'
                  : 'Something went wrong. Please try again.'}
              </p>
              <motion.button
                onClick={() => { reset(); }}
                style={{
                  background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 24px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
                whileTap={{ scale: 0.97 }}
              >
                Try Again
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
