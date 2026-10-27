/**
 * FloatingTokens — ambient background layer of crypto + fiat icons
 * Slightly visible, slowly drifting, non-interactive.
 */
import { motion } from 'framer-motion';
import {
  TokenUSDC, TokenUSDT, TokenDAI, TokenEURC,
  TokenBNB, TokenARB, TokenAVAX,
  NetworkEthereum, NetworkBitcoin, NetworkSolana,
  TokenMATIC,
} from '@web3icons/react';

/* ── Render helper so we don't fight the lib's prop types ── */
type RenderFn = (size: number) => React.ReactNode;

/* Fiat glyph */
function FiatGlyph({ symbol, color, size }: { symbol: string; color: string; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `${Math.max(2, Math.round(size * 0.06))}px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Syne, sans-serif',
        fontWeight: 800,
        fontSize: size * 0.44,
        color,
        lineHeight: 1,
      }}
    >
      {symbol}
    </div>
  );
}

type TokenDef = {
  id: string;
  render: RenderFn;
  color: string;
  size: number;
  top: string;
  left: string;
  rotate: number;
  delay: number;
  duration: number;
  yRange: number;
  xRange: number;
};

const TOKENS: TokenDef[] = [
  { id: 'usdc-1',  render: s => <TokenUSDC size={s} variant="branded" />,       color: '#2775CA', size: 96,  top: '8%',   left: '4%',   rotate: -12, delay: 0,    duration: 14, yRange: 18, xRange: 8  },
  { id: 'usdc-2',  render: s => <TokenUSDC size={s} variant="branded" />,       color: '#2775CA', size: 64,  top: '62%',  left: '88%',  rotate: 8,   delay: 3.5,  duration: 17, yRange: 14, xRange: 6  },
  { id: 'eth-1',   render: s => <NetworkEthereum size={s} variant="branded" />, color: '#627EEA', size: 80,  top: '22%',  left: '92%',  rotate: 15,  delay: 1.2,  duration: 16, yRange: 20, xRange: 7  },
  { id: 'eth-2',   render: s => <NetworkEthereum size={s} variant="branded" />, color: '#627EEA', size: 48,  top: '75%',  left: '12%',  rotate: -8,  delay: 6,    duration: 18, yRange: 12, xRange: 5  },
  { id: 'btc-1',   render: s => <NetworkBitcoin size={s} variant="branded" />,  color: '#F7931A', size: 72,  top: '50%',  left: '2%',   rotate: 20,  delay: 0.8,  duration: 20, yRange: 16, xRange: 6  },
  { id: 'btc-2',   render: s => <NetworkBitcoin size={s} variant="branded" />,  color: '#F7931A', size: 44,  top: '10%',  left: '55%',  rotate: -5,  delay: 4.5,  duration: 15, yRange: 10, xRange: 4  },
  { id: 'usdt-1',  render: s => <TokenUSDT size={s} variant="branded" />,       color: '#26A17B', size: 60,  top: '38%',  left: '95%',  rotate: -18, delay: 2,    duration: 19, yRange: 14, xRange: 5  },
  { id: 'dai-1',   render: s => <TokenDAI size={s} variant="branded" />,        color: '#F5AC37', size: 56,  top: '80%',  left: '48%',  rotate: 10,  delay: 3,    duration: 13, yRange: 12, xRange: 8  },
  { id: 'eurc-1',  render: s => <TokenEURC size={s} variant="branded" />,       color: '#1A44C2', size: 52,  top: '15%',  left: '78%',  rotate: -22, delay: 1.6,  duration: 21, yRange: 18, xRange: 6  },
  { id: 'sol-1',   render: s => <NetworkSolana size={s} variant="branded" />,   color: '#9945FF', size: 64,  top: '65%',  left: '72%',  rotate: 12,  delay: 5,    duration: 17, yRange: 16, xRange: 7  },
  { id: 'avax-1',  render: s => <TokenAVAX size={s} variant="branded" />,       color: '#E84142', size: 54,  top: '88%',  left: '25%',  rotate: -14, delay: 2.4,  duration: 22, yRange: 10, xRange: 5  },
  { id: 'matic-1', render: s => <TokenMATIC size={s} variant="branded" />,      color: '#8247E5', size: 50,  top: '30%',  left: '18%',  rotate: 6,   delay: 7,    duration: 16, yRange: 14, xRange: 6  },
  { id: 'arb-1',   render: s => <TokenARB size={s} variant="branded" />,        color: '#28A0F0', size: 46,  top: '55%',  left: '58%',  rotate: -10, delay: 0.5,  duration: 18, yRange: 12, xRange: 5  },
  { id: 'bnb-1',   render: s => <TokenBNB size={s} variant="branded" />,        color: '#F3BA2F', size: 58,  top: '42%',  left: '35%',  rotate: 18,  delay: 4,    duration: 20, yRange: 16, xRange: 7  },
];

type FiatDef = {
  id: string; symbol: string; color: string; size: number;
  top: string; left: string; rotate: number;
  delay: number; duration: number; yRange: number; xRange: number;
};

const FIAT: FiatDef[] = [
  { id: 'eur', symbol: '€',  color: '#1A44C2', size: 72,  top: '6%',   left: '35%', rotate: -8,  delay: 1,   duration: 19, yRange: 14, xRange: 6 },
  { id: 'gbp', symbol: '£',  color: '#B8860B', size: 60,  top: '72%',  left: '82%', rotate: 12,  delay: 3.2, duration: 16, yRange: 12, xRange: 5 },
  { id: 'jpy', symbol: '¥',  color: '#BC002D', size: 68,  top: '20%',  left: '48%', rotate: -16, delay: 5.5, duration: 22, yRange: 18, xRange: 8 },
  { id: 'ngn', symbol: '₦',  color: '#008751', size: 56,  top: '82%',  left: '65%', rotate: 7,   delay: 2.8, duration: 18, yRange: 10, xRange: 4 },
  { id: 'inr', symbol: '₹',  color: '#FF9933', size: 64,  top: '48%',  left: '78%', rotate: -5,  delay: 6.2, duration: 15, yRange: 16, xRange: 7 },
  { id: 'cny', symbol: '¥',  color: '#DE2910', size: 50,  top: '90%',  left: '8%',  rotate: 20,  delay: 1.8, duration: 21, yRange: 12, xRange: 5 },
  { id: 'chf', symbol: '₣',  color: '#FF0000', size: 52,  top: '35%',  left: '64%', rotate: -12, delay: 4.8, duration: 17, yRange: 14, xRange: 6 },
  { id: 'brl', symbol: 'R$', color: '#009c3b', size: 44,  top: '58%',  left: '22%', rotate: 9,   delay: 3.6, duration: 23, yRange: 10, xRange: 4 },
];

export function FloatingTokens() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {TOKENS.map(t => (
        <motion.div
          key={t.id}
          style={{
            position: 'absolute',
            top: t.top,
            left: t.left,
            opacity: 0,
            rotate: t.rotate,
            filter: `drop-shadow(0 0 14px ${t.color}66)`,
          }}
          animate={{
            opacity: [0, 0.12, 0.15, 0.10, 0.12],
            y: [0, -t.yRange, 0, t.yRange * 0.4, 0],
            x: [0, t.xRange * 0.5, t.xRange, 0, -t.xRange * 0.3, 0],
            rotate: [t.rotate, t.rotate + 6, t.rotate - 4, t.rotate + 2, t.rotate],
          }}
          transition={{ duration: t.duration, delay: t.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          {t.render(t.size)}
        </motion.div>
      ))}

      {FIAT.map(f => (
        <motion.div
          key={f.id}
          style={{
            position: 'absolute',
            top: f.top,
            left: f.left,
            opacity: 0,
            rotate: f.rotate,
            filter: `drop-shadow(0 0 10px ${f.color}55)`,
          }}
          animate={{
            opacity: [0, 0.11, 0.13, 0.09, 0.11],
            y: [0, -f.yRange, 0, f.yRange * 0.4, 0],
            x: [0, f.xRange * 0.5, f.xRange, 0, -f.xRange * 0.3, 0],
            rotate: [f.rotate, f.rotate + 5, f.rotate - 3, f.rotate + 1, f.rotate],
          }}
          transition={{ duration: f.duration, delay: f.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <FiatGlyph symbol={f.symbol} color={f.color} size={f.size} />
        </motion.div>
      ))}
    </div>
  );
}
