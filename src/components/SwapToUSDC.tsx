/**
 * SwapToUSDC — swap any supported token to USDC on the connected wallet's chain.
 * Uses Circle App Kit (keyless, browser-safe, no kit key needed).
 * Routed through LiFi aggregator — user is informed before execution.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppKit, SwapChain, type SwapEstimate } from '@circle-fin/app-kit';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import type { EIP1193Provider } from 'viem';
import { useAccount, useChainId } from 'wagmi';
import {
  ArrowRight, RefreshCw, AlertTriangle, CheckCircle2,
  ChevronDown, Zap, Info,
} from 'lucide-react';
import { TokenUSDC } from '@web3icons/react';

/* ── App Kit (singleton, keyless) ── */
const kit = new AppKit();

/* ── Supported source tokens ── */
const TOKENS = [
  { symbol: 'USDT',   name: 'Tether USD',         icon: '🔵' },
  { symbol: 'EURC',   name: 'Euro Coin',           icon: '🇪🇺' },
  { symbol: 'DAI',    name: 'Dai Stablecoin',      icon: '🟡' },
  { symbol: 'USDE',   name: 'USDe',                icon: '🔷' },
  { symbol: 'PYUSD',  name: 'PayPal USD',          icon: '🔹' },
  { symbol: 'WETH',   name: 'Wrapped Ether',       icon: '⬡' },
  { symbol: 'WBTC',   name: 'Wrapped Bitcoin',     icon: '🟠' },
  { symbol: 'WAVAX',  name: 'Wrapped AVAX',        icon: '🔺' },
  { symbol: 'WPOL',   name: 'Wrapped POL',         icon: '🟣' },
  { symbol: 'NATIVE', name: 'Native Gas Token',    icon: '⛽' },
] as const;

/* ── Chain names the SDK uses (matches wagmi chainIds to SDK Blockchain values) ── */
const CHAIN_NAMES: Record<number, SwapChain> = {
  1:        SwapChain.Ethereum,
  8453:     SwapChain.Base,
  42161:    SwapChain.Arbitrum,
  10:       SwapChain.Optimism,
  137:      SwapChain.Polygon,
  43114:    SwapChain.Avalanche,
  1329:     SwapChain.Sei,
  146:      SwapChain.Sonic,
  57073:    SwapChain.Ink,
  130:      SwapChain.Unichain,
};

type SwapStatus = 'idle' | 'estimating' | 'estimated' | 'swapping' | 'done' | 'error';

interface Props {
  onSwapComplete?: (usdcAmount: string) => void;
}

export function SwapToUSDC({ onSwapComplete }: Props) {
  const { connector, address } = useAccount();
  const chainId = useChainId();

  const [tokenIn, setTokenIn]       = useState<string>('USDT');
  const [amountIn, setAmountIn]     = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [status, setStatus]         = useState<SwapStatus>('idle');
  const [estimate, setEstimate]     = useState<SwapEstimate | null>(null);
  const [result, setResult]         = useState<{ amountOut: string; txHash: string; explorerUrl: string } | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const chainName: SwapChain | null = CHAIN_NAMES[chainId] ?? null;

  const getAdapter = useCallback(async () => {
    if (!connector) throw new Error('No wallet connected');
    const provider = (await connector.getProvider()) as EIP1193Provider;
    return createViemAdapterFromProvider({ provider });
  }, [connector]);

  const handleEstimate = useCallback(async () => {
    if (!chainName) {
      setError(`Chain ID ${chainId} is not supported for swaps. Switch to Ethereum, Base, Arbitrum, Polygon, Optimism, Avalanche, or Solana.`);
      setStatus('error');
      return;
    }
    if (!amountIn || isNaN(Number(amountIn)) || Number(amountIn) <= 0) {
      setError('Enter a valid amount.');
      setStatus('error');
      return;
    }
    try {
      setStatus('estimating');
      setError(null);
      const adapter = await getAdapter();
      const est = await kit.estimateSwap({
        from: { adapter, chain: chainName },
        tokenIn,
        tokenOut: 'USDC',
        amountIn,
        config: { slippageBps: 150 },
      });
      setEstimate(est);
      setStatus('estimated');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Estimation failed');
      setStatus('error');
    }
  }, [
	chainName,
	chainId,
	amountIn,
	tokenIn,
	getAdapter
]);

  const handleSwap = useCallback(async () => {
    if (!estimate || !chainName) return;
    try {
      setStatus('swapping');
      setError(null);
      const adapter = await getAdapter();
      const res = await kit.swap({
        from: { adapter, chain: chainName },
        tokenIn,
        tokenOut: 'USDC',
        amountIn,
        config: { slippageBps: 150 },
      });
      setResult({
        amountOut: res.amountOut ?? estimate.estimatedOutput.amount,
        txHash: res.txHash ?? '',
        explorerUrl: res.explorerUrl ?? '',
      });
      setStatus('done');
      onSwapComplete?.(res.amountOut ?? estimate.estimatedOutput.amount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Swap failed');
      setStatus('error');
    }
  }, [estimate, chainName, getAdapter, tokenIn, amountIn, onSwapComplete]);

  const reset = () => {
    setStatus('idle');
    setEstimate(null);
    setResult(null);
    setError(null);
  };

  const selectedToken = TOKENS.find(t => t.symbol === tokenIn);

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.22)' }}
        >
          <Zap size={15} style={{ color: '#2563eb' }} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Swap to USDC</p>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>Any token → USDC via Circle App Kit</p>
        </div>
      </div>

      {/* Not connected */}
      {!address && (
        <div className="rounded-xl p-4 text-sm font-medium text-center"
          style={{ background: 'var(--surface-muted)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
          Connect your wallet to swap tokens
        </div>
      )}

      {/* Unsupported chain warning */}
      {address && !chainName && (
        <div className="flex flex-col gap-3 rounded-xl p-4"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} style={{ color: '#f59e0b', marginTop: 1, flexShrink: 0 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
                Swap not available on this network
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                To swap tokens to USDC, switch your wallet to one of these supported networks:
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['Ethereum', 'Base', 'Arbitrum', 'Polygon', 'Optimism', 'Avalanche', 'Sei', 'Sonic', 'Ink', 'Unichain'].map(chain => (
              <span key={chain} className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: 'var(--surface-muted)', color: 'var(--ink)', border: '1px solid var(--border)' }}>
                {chain}
              </span>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
            Already on a supported chain? You can pay directly with USDC on Arc using the first tab.
          </p>
        </div>
      )}

      {address && chainName && status !== 'done' && (
        <>
          {/* Token + Amount row */}
          <div className="flex gap-2">
            {/* Token picker */}
            <div className="relative">
              <button
                onClick={() => setShowPicker(p => !p)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: 'var(--surface-strong)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                  minWidth: '110px',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{selectedToken?.icon}</span>
                {tokenIn}
                <ChevronDown size={12} style={{ color: 'var(--subtle)', marginLeft: 'auto' }} />
              </button>
              <AnimatePresence>
                {showPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden"
                    style={{
                      background: 'var(--surface-strong)',
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--card-shadow-lift)',
                      width: '200px',
                    }}
                  >
                    {TOKENS.map(t => (
                      <button
                        key={t.symbol}
                        onClick={() => { setTokenIn(t.symbol); setShowPicker(false); reset(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left"
                        style={{
                          background: t.symbol === tokenIn ? 'var(--surface-muted)' : 'transparent',
                          color: 'var(--ink)',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-muted)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = t.symbol === tokenIn ? 'var(--surface-muted)' : 'transparent'; }}
                      >
                        <span style={{ fontSize: '1rem' }}>{t.icon}</span>
                        <span>
                          <span className="font-semibold">{t.symbol}</span>
                          <span className="text-xs ml-1.5" style={{ color: 'var(--subtle)' }}>{t.name}</span>
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Amount input */}
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={amountIn}
              onChange={e => { setAmountIn(e.target.value); reset(); }}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold outline-none"
              style={{
                background: 'var(--surface-strong)',
                border: '1px solid var(--border)',
                color: 'var(--ink)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--border-strong)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Arrow + output */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <ArrowRight size={14} style={{ color: 'var(--subtle)', flexShrink: 0 }} />
            <div className="flex items-center gap-1.5">
              <TokenUSDC variant="branded" size={16} />
              <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>USDC</span>
            </div>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {/* Estimate card */}
          <AnimatePresence>
            {status === 'estimated' && estimate && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl p-3 flex flex-col gap-1.5"
                style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
              >
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--subtle)' }}>Estimated output</span>
                  <span className="font-bold" style={{ color: 'var(--ink)' }}>
                    ≈ {estimate.estimatedOutput.amount} USDC
                  </span>
                </div>
                {estimate.fees?.map((f, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span style={{ color: 'var(--subtle)' }}>Fee ({f.type})</span>
                    <span style={{ color: 'var(--muted)' }}>{f.amount} {f.token}</span>
                  </div>
                ))}
                <div className="flex items-start gap-1.5 mt-1 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <Info size={11} style={{ color: 'var(--subtle)', marginTop: 1, flexShrink: 0 }} />
                  <p className="text-xs" style={{ color: 'var(--subtle)', lineHeight: 1.5 }}>
                    Routed via LiFi aggregator · 1.5% max slippage · Rates change until confirmed
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl p-3"
              style={{ background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.18)' }}>
              <AlertTriangle size={13} style={{ color: 'var(--danger)', marginTop: 1, flexShrink: 0 }} />
              <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex gap-2">
            {status !== 'estimated' && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => void handleEstimate()}
                disabled={!amountIn || status === 'estimating'}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{
                  background: !amountIn ? 'var(--surface-muted)' : 'linear-gradient(135deg,#1d4ed8,#0ea5e9)',
                  color: !amountIn ? 'var(--subtle)' : 'white',
                  cursor: !amountIn ? 'not-allowed' : 'pointer',
                }}
              >
                {status === 'estimating'
                  ? <><RefreshCw size={13} className="animate-spin" /> Getting quote...</>
                  : 'Get Quote'}
              </motion.button>
            )}
            {status === 'estimated' && (
              <>
                <button
                  onClick={reset}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--surface-muted)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                  Edit
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => void handleSwap()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)' }}
                >
                  {status === ('swapping' as SwapStatus)
                    ? <><RefreshCw size={13} className="animate-spin" /> Swapping...</>
                    : <>Swap {amountIn} {tokenIn} → USDC</>}
                </motion.button>
              </>
            )}
          </div>
        </>
      )}

      {/* Done state */}
      {status === 'done' && result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3 py-4 text-center"
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(15,107,56,0.12)', border: '1px solid rgba(15,107,56,0.25)' }}
          >
            <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Swap complete!</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              You received ≈ <strong>{result.amountOut} USDC</strong>
            </p>
          </div>
          {result.explorerUrl && (
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold underline"
              style={{ color: '#2563eb' }}
            >
              View on explorer ↗
            </a>
          )}
          <button
            onClick={reset}
            className="text-xs font-semibold px-4 py-2 rounded-xl"
            style={{ background: 'var(--surface-muted)', color: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            Swap again
          </button>
        </motion.div>
      )}
    </div>
  );
}
