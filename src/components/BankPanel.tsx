import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Wallet, TrendingUp, Zap, Info } from 'lucide-react';
import { TokenUSDC } from '@web3icons/react';
import { useAccount, useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';
import { ConnectKitButton } from 'connectkit';
import { getUsdc } from '@/onchain-facts';
import { Amount, usdcDecimalsFor } from '@/onchain-money';

import { ARC_CHAIN_ID, IS_MAINNET } from '../chain-config';

interface BankPanelProps {
  open: boolean;
  onClose: () => void;
}

export function BankPanel({ open, onClose }: BankPanelProps) {
  const { address } = useAccount();
  const usdcFact = getUsdc(ARC_CHAIN_ID);

  const { data: balanceRaw, isLoading } = useReadContract({
    address: usdcFact?.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && !!usdcFact, refetchInterval: 6000 },
  });

  const balanceFormatted = balanceRaw != null
    ? Amount.fromRaw(balanceRaw, usdcDecimalsFor(ARC_CHAIN_ID)).toFixed(2)
    : '0.00';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bank-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />

          <motion.div
            key="bank-panel"
            initial={{ opacity: 0, x: '-100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '-100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="fixed inset-y-0 left-0 z-50 w-full sm:max-w-sm overflow-y-auto"
            style={{
              background: 'var(--surface-strong)',
              borderRight: '1px solid var(--border)',
              backdropFilter: 'blur(24px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Accent strip */}
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #6366f1, #22c55e)' }} />

            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(99,102,241,0.15)' }}
                  >
                    <Wallet size={20} style={{ color: '#6366f1' }} />
                  </div>
                  <div>
                    <h2 className="display font-bold text-lg" style={{ color: 'var(--ink)' }}>Mall Bank</h2>
                    <p className="text-xs" style={{ color: 'var(--subtle)' }}>Arc Testnet USDC</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--surface-muted)', color: 'var(--ink)' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Connect wallet prompt */}
              {!address && (
                <div className="mb-6 text-center">
                  <div
                    className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'rgba(99,102,241,0.1)' }}
                  >
                    <Wallet size={28} style={{ color: '#6366f1' }} />
                  </div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>Connect to view balance</p>
                  <p className="text-sm mb-4" style={{ color: 'var(--subtle)' }}>
                    Connect your wallet to see your USDC balance.
                  </p>
                  <ConnectKitButton label="Connect Wallet" />
                </div>
              )}

              {/* Balance card */}
              {address && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl p-6 mb-6"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(34,197,94,0.12))',
                    border: '1px solid rgba(99,102,241,0.25)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={14} style={{ color: 'var(--success)' }} />
                    <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>
                      Available Balance
                    </span>
                  </div>
                  <div className="flex items-end gap-2 mb-1">
                    <TokenUSDC variant="branded" size={28} />
                    {isLoading ? (
                      <div className="h-10 w-28 rounded-xl shimmer-bg" />
                    ) : (
                      <span className="display text-4xl font-bold mono tabular-nums" style={{ color: 'var(--ink)' }}>
                        {balanceFormatted}
                      </span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--subtle)' }}>USDC · {IS_MAINNET ? 'Arc Mainnet' : 'Arc Testnet'}</p>
                  <button
                    className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink-secondary)', cursor: 'pointer' }}
                    onClick={() => {
                      void (window as unknown as { ethereum?: { request: (a: unknown) => Promise<unknown> } }).ethereum?.request({
                        method: 'wallet_watchAsset',
                        params: { type: 'ERC20', options: { address: usdcFact?.address, symbol: 'USDC', decimals: 6, name: 'USD Coin' } },
                      });
                    }}
                  >
                    + Add USDC to MetaMask (fixes display)
                  </button>
                </motion.div>
              )}

              {/* How to get USDC */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                  <Zap size={16} style={{ color: '#f59e0b' }} />
                  {IS_MAINNET ? 'Get USDC' : 'Get Testnet USDC'}
                </h3>
                <div className="space-y-3">
                  {!IS_MAINNET && (
                  <div
                    className="p-4 rounded-2xl"
                    style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                  >
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>
                      Arc Studio Faucet (Recommended)
                    </p>
                    <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                      Use the "Get test USDC" button in the Arc Studio sidebar. Connect your wallet and request free testnet USDC instantly.
                    </p>
                    <div
                      className="flex items-start gap-2 p-2.5 rounded-xl text-xs"
                      style={{ background: 'rgba(99,102,241,0.1)' }}
                    >
                      <Info size={12} style={{ color: '#6366f1', marginTop: '1px', flexShrink: 0 }} />
                      <span style={{ color: '#6366f1' }}>
                        Click "Get test USDC" in the left sidebar of Arc Studio. After connecting your wallet you'll receive free USDC for testing.
                      </span>
                    </div>
                  </div>
                  )}

                  <div
                    className="p-4 rounded-2xl"
                    style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                  >
                    {IS_MAINNET ? (
                      <>
                        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>Bridge or buy USDC</p>
                        <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                          Bridge USDC from another chain via CCTP, or buy directly with a card at Circle's onramp.
                        </p>
                        <a href="https://bridge.arc.io" target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg"
                          style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', textDecoration: 'none', border: '1px solid rgba(99,102,241,0.25)' }}>
                          Bridge to Arc ↗
                        </a>
                      </>
                    ) : (
                    <>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>
                      Circle Faucet
                    </p>
                    <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                      Visit the Circle developer faucet to get free testnet USDC.
                    </p>
                    <a
                      href="https://faucet.circle.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #22c55e)' }}
                    >
                      Open Faucet
                      <ExternalLink size={12} />
                    </a>
                    </>
                    )}
                  </div>
                </div>
              </div>

              {/* About Arc USDC */}
              <div
                className="p-4 rounded-2xl"
                style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
              >
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                  About Arc USDC
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                  On Arc, USDC is the native gas token — you pay for transactions directly in USDC with no ETH needed.
                  This means stable, predictable fees and a single token for everything in the mall.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
