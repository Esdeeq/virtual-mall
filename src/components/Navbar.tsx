import { ConnectKitButton } from 'connectkit';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Sun, Moon, Sunset, Zap, ChevronDown, Wallet, ClipboardList, UserCircle2 } from 'lucide-react';
import { useState } from 'react';
import type { Theme } from '../types';
import type { CartItem } from '../types';
import { useUserWallet } from '../context/UserWalletContext';
import { TokenUSDC } from '@web3icons/react';
import { useAccount, useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';
import { getUsdc } from '@/onchain-facts';
import { Amount, usdcDecimalsFor } from '@/onchain-money';

const ARC_CHAIN_ID = 5042002;

const THEMES: { id: Theme; label: string; icon: React.ReactNode }[] = [
  { id: 'light',  label: 'Light',  icon: <Sun  size={13} /> },
  { id: 'dark',   label: 'Dark',   icon: <Moon size={13} /> },
  { id: 'sunset', label: 'Sunset', icon: <Sunset size={13} /> },
  { id: 'neon',   label: 'Neon',   icon: <Zap  size={13} /> },
];

interface NavbarProps {
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  cart: CartItem[];
  onCartOpen: () => void;
  onBankOpen: () => void;
  onLogoClick: () => void;

  onOrdersClick?: () => void;
  onSignInClick?: () => void;
}

export function Navbar({ theme, onThemeChange, cart, onCartOpen, onBankOpen, onLogoClick, onOrdersClick, onSignInClick }: NavbarProps) {
  const { wallet, userId, signOut } = useUserWallet();
  const [showThemePicker, setShowThemePicker] = useState(false);
  const { address } = useAccount();

  const usdcFact = getUsdc(ARC_CHAIN_ID);
  const { data: balanceRaw } = useReadContract({
    address: usdcFact?.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && !!usdcFact },
  });

  const balanceFormatted =
    balanceRaw != null
      ? Amount.fromRaw(balanceRaw, usdcDecimalsFor(ARC_CHAIN_ID)).toFixed(2)
      : null;

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const currentTheme = THEMES.find(t => t.id === theme);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'var(--surface)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderBottom: '1px solid var(--border)',
      }}
    >


      <div className="max-w-7xl mx-auto px-5 h-15 flex items-center justify-between gap-3" style={{ height: '60px' }}>

        {/* Wordmark */}
        <motion.button
          onClick={onLogoClick}
          className="flex items-center gap-2.5 group"
          style={{ outline: 'none' }}
          whileHover="hover"
          initial="rest"
        >
          {/* SVG logo mark — storefront arch / VM monogram */}
          <motion.div
            variants={{ rest: { scale: 1, rotate: 0 }, hover: { scale: 1.06, rotate: -2 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="flex-shrink-0"
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="vm-grad-a" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#1d4ed8" />
                  <stop offset="50%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
                <linearGradient id="vm-grad-b" x1="36" y1="0" x2="0" y2="36" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <clipPath id="vm-clip">
                  <rect width="36" height="36" rx="10" />
                </clipPath>
              </defs>

              {/* Background tile */}
              <rect width="36" height="36" rx="10" fill="url(#vm-grad-a)" />

              {/* Subtle inner glow ring */}
              <rect x="1" y="1" width="34" height="34" rx="9.5"
                fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

              {/* Storefront arch — the "M" silhouette forms the mall facade */}
              {/* Two pillars */}
              <rect x="6" y="17" width="4" height="12" rx="1.5" fill="rgba(255,255,255,0.90)" />
              <rect x="26" y="17" width="4" height="12" rx="1.5" fill="rgba(255,255,255,0.90)" />

              {/* Arch crown — a smooth bezier arch spanning the top */}
              <path
                d="M6 19 C6 11 30 11 30 19"
                stroke="rgba(255,255,255,0.90)"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />

              {/* Centre door — negative-space rectangle */}
              <rect x="14.5" y="21" width="7" height="8" rx="3.5" fill="rgba(255,255,255,0.28)" />

              {/* "V" chevron above the arch — the V in VM */}
              <path
                d="M12 9 L18 15.5 L24 9"
                stroke="white"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </motion.div>

          {/* Text lockup */}
          <div className="hidden sm:flex flex-col leading-none">
            <motion.span
              className="display font-bold"
              style={{
                color: 'var(--ink)',
                letterSpacing: '-0.045em',
                lineHeight: 1,
                fontSize: '1.0625rem',
              }}
              variants={{ rest: {}, hover: {} }}
            >
              Virtual
              <span style={{ color: 'var(--accent)' }}>Mall</span>
            </motion.span>
          </div>
        </motion.button>



        {/* Right rail */}
        <div className="flex items-center gap-2">

          {/* Balance pill — connected only */}
          <AnimatePresence>
            {address && balanceFormatted !== null && (
              <motion.button
                key="balance"
                onClick={onBankOpen}
                initial={{ opacity: 0, scale: 0.85, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{
                  background: 'var(--surface-strong)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                  boxShadow: 'var(--card-shadow)',
                }}
              >
                <TokenUSDC variant="branded" size={15} />
                <span className="mono tabular-nums" style={{ fontSize: '0.8rem' }}>
                  {balanceFormatted}
                </span>
                <span style={{ color: 'var(--subtle)', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                  USDC
                </span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Get USDC — disconnected */}
          {!address && (
            <button
              onClick={onBankOpen}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: 'var(--surface-strong)',
                border: '1px solid var(--border)',
                color: 'var(--ink)',
              }}
            >
              <Wallet size={13} />
              Get USDC
            </button>
          )}

          {/* My Orders link */}
          {onOrdersClick && (
            <button
              onClick={onOrdersClick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: 'var(--surface-strong)',
                border: '1px solid var(--border)',
                color: 'var(--ink)',
              }}
            >
              <ClipboardList size={13} className="text-emerald-500" />
              My Orders
            </button>
          )}



          {/* Sign in / wallet badge */}
          {wallet ? (
            <button
              onClick={onSignInClick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid #6366f1', color: '#6366f1' }}
            >
              <UserCircle2 size={13} />
              {userId?.split('@')[0] ?? 'Wallet'}
              <button onClick={e => { e.stopPropagation(); signOut(); }}
                className="ml-1 opacity-60 hover:opacity-100 text-xs" title="Sign out">✕</button>
            </button>
          ) : (
            <button
              onClick={onSignInClick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', color: 'var(--ink)' }}
            >
              <UserCircle2 size={13} />
              Sign In
            </button>
          )}

          {/* Theme picker */}
          <div className="relative">
            <button
              onClick={() => setShowThemePicker(v => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm"
              style={{
                background: 'var(--surface-strong)',
                border: '1px solid var(--border)',
                color: 'var(--ink)',
              }}
            >
              {currentTheme?.icon}
              <ChevronDown
                size={11}
                style={{
                  color: 'var(--subtle)',
                  transform: showThemePicker ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>

            <AnimatePresence>
              {showThemePicker && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                  className="absolute right-0 top-11 rounded-xl overflow-hidden z-50"
                  style={{
                    background: 'var(--surface-strong)',
                    border: '1px solid var(--border)',
                    minWidth: '130px',
                    backdropFilter: 'blur(28px)',
                    boxShadow: 'var(--card-shadow-hover)',
                  }}
                >
                  {THEMES.map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => { onThemeChange(t.id); setShowThemePicker(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium transition-colors"
                      style={{
                        color: theme === t.id ? 'var(--accent)' : 'var(--ink-2)',
                        background: theme === t.id ? 'var(--surface-muted)' : 'transparent',
                        borderBottom: i < THEMES.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                      {theme === t.id && (
                        <span className="ml-auto" style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Cart */}
          <motion.button
            onClick={onCartOpen}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg"
            style={{
              background: 'var(--surface-strong)',
              border: '1px solid var(--border)',
              color: 'var(--ink)',
            }}
          >
            <ShoppingBag size={16} />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--bg)',
                    fontSize: '0.6rem',
                  }}
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Wallet */}
          <ConnectKitButton />
        </div>
      </div>
    </nav>
  );
}
