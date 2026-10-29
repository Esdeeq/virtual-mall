/**
 * SignInModal — Circle user-controlled wallet sign-in with PIN.
 * Email acts as the userId. On first sign-in, Circle opens its hosted
 * PIN setup UI. Returning users just enter their email to restore their wallet.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Loader2, CheckCircle, Wallet, AlertCircle, ShieldCheck, LogOut } from 'lucide-react';
import { TokenUSDC } from '@web3icons/react';
import { useUserWallet } from '../context/UserWalletContext';

interface SignInModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'email' | 'pin_setup' | 'done' | 'error';

const CIRCLE_APP_ID = import.meta.env.VITE_CIRCLE_APP_ID as string;
const APP_ID_SET = CIRCLE_APP_ID && CIRCLE_APP_ID !== 'your_app_id_here';

export function SignInModal({ open, onClose }: SignInModalProps) {
  const { signIn, executeChallenge, signOut, wallet, usdcBalance, isLoading, sdkReady, userId } = useUserWallet();

  const [email, setEmail] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null); // null = unknown, true = new, false = returning

  // Derive current step from state — no useEffect needed
  const step: Step = (() => {
    if (wallet) return 'done';
    if (challengeId) return 'pin_setup';
    if (error && !challengeId) return 'error';
    return 'email';
  })();

  const handleSignIn = async () => {
    if (!email || email.length < 5) { setError('Enter a valid email address'); return; }
    setError(null);
    try {
      const result = await signIn(email);
      if (result.alreadyInitialized) {
        setIsNewUser(false);
        // wallet loaded via context — derived step becomes 'done'
      } else if (result.challengeId) {
        setIsNewUser(true);
        setChallengeId(result.challengeId); // derived step becomes 'pin_setup'
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Try again.');
    }
  };

  const handleExecuteChallenge = async () => {
    if (!challengeId) return;
    setExecuting(true);
    setError(null);
    try {
      await executeChallenge(challengeId);
      setChallengeId(null); // wallet now loaded — derived step becomes 'done'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PIN setup failed. Try again.');
      // derived step becomes 'error' (error set, no challengeId cleared yet — clear it so error shows)
      setChallengeId(null);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed z-50 left-1/2 top-1/2"
            style={{ transform: 'translate(-50%, -50%)', width: '90vw', maxWidth: 420 }}
          >
            <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

              {/* Header */}
              <div className="relative px-6 pt-6 pb-5 text-center" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  <Wallet size={26} style={{ color: '#fff' }} />
                </div>
                <h2 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>
                  {step === 'done' ? 'Agent Wallet' : step === 'pin_setup' ? (isNewUser ? 'Create Account' : 'New Device Setup') : 'Sign In'}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  {step === 'done'
                    ? 'Your wallet is active'
                    : step === 'pin_setup'
                      ? (isNewUser ? 'Set a PIN to secure your new wallet' : 'Authorize this device with your PIN')
                      : 'Enter your email — new users get a wallet, returning users restore theirs'}
                </p>
                <button onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
                  <X size={14} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* App ID not configured */}
                {!APP_ID_SET && (
                  <div className="p-4 rounded-2xl flex gap-3"
                    style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b' }}>
                    <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>Setup required</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        Add <span className="mono">VITE_CIRCLE_APP_ID</span> to <span className="mono">.env</span>.
                        Get it from console.circle.com → Wallets → User Controlled → Configurator.
                      </p>
                    </div>
                  </div>
                )}

                {/* Email step */}
                {step === 'email' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && void handleSignIn()}
                        className="w-full pl-9 pr-4 py-3 rounded-2xl text-sm outline-none"
                        style={{
                          background: 'var(--surface-muted)',
                          border: '1.5px solid var(--border)',
                          color: 'var(--ink)',
                        }}
                        disabled={!APP_ID_SET || !sdkReady}
                      />
                    </div>

                    {error && (
                      <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--error, #ef4444)' }}>
                        <AlertCircle size={12} /> {error}
                      </p>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => void handleSignIn()}
                      disabled={!APP_ID_SET || !sdkReady || isLoading || !email}
                      className="w-full py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', opacity: (!APP_ID_SET || !sdkReady || isLoading || !email) ? 0.5 : 1 }}
                    >
                      {isLoading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : 'Continue'}
                    </motion.button>

                    <p className="text-xs text-center" style={{ color: 'var(--subtle)' }}>
                      New users will set a PIN to protect their wallet.
                      Returning users restore their existing wallet instantly.
                    </p>
                  </div>
                )}

                {/* PIN setup step */}
                {step === 'pin_setup' && (
                  <div className="space-y-4 text-center">
                    <div className="p-4 rounded-2xl" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                      <ShieldCheck size={32} className="mx-auto mb-2" style={{ color: '#6366f1' }} />
                      <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Set your wallet PIN</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                        {isNewUser
                          ? "Click below to open Circle's secure PIN setup. You'll create a 6-digit PIN and answer security questions — only you can ever access your wallet."
                          : "This email already has a wallet. Click below to authorize this device — you'll enter your existing PIN to restore access."}
                      </p>
                    </div>

                    {error && (
                      <p className="text-xs flex items-center justify-center gap-1.5" style={{ color: 'var(--error, #ef4444)' }}>
                        <AlertCircle size={12} /> {error}
                      </p>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => void handleExecuteChallenge()}
                      disabled={executing}
                      className="w-full py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', opacity: executing ? 0.6 : 1 }}
                    >
                      {executing
                        ? <><Loader2 size={16} className="animate-spin" /> Opening PIN setup…</>
                        : isNewUser ? 'Set up PIN & Create Wallet' : 'Authorize This Device'}
                    </motion.button>
                  </div>
                )}

                {/* Done / wallet view */}
                {step === 'done' && wallet && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle size={16} style={{ color: 'var(--success,#22c55e)' }} />
                        <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Wallet active</span>
                        <span className="text-xs px-2 py-0.5 rounded-full ml-auto"
                          style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--success,#22c55e)' }}>
                          {wallet.accountType}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--subtle)' }}>Account</span>
                          <span className="mono font-medium" style={{ color: 'var(--ink)' }}>
                            {userId}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--subtle)' }}>Address</span>
                          <span className="mono" style={{ color: 'var(--muted)' }}>
                            {wallet.address.slice(0, 10)}…{wallet.address.slice(-6)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1" style={{ borderTop: '1px dashed var(--border)' }}>
                          <span style={{ color: 'var(--subtle)' }}>USDC Balance</span>
                          <div className="flex items-center gap-1.5">
                            <TokenUSDC variant="branded" size={14} />
                            <span className="mono font-bold" style={{ color: 'var(--ink)' }}>{usdcBalance}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-center" style={{ color: 'var(--subtle)' }}>
                      This wallet is attached to <span className="font-semibold">{userId}</span>.
                      Sign in with the same email on any device to restore it.
                    </p>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={onClose}
                      className="w-full py-3 rounded-2xl text-sm font-bold"
                      style={{ background: 'var(--surface-strong)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                    >
                      Done
                    </motion.button>

                    <button
                      onClick={() => { signOut(); setEmail(''); setError(null); setChallengeId(null); setIsNewUser(null); }}
                      className="w-full py-2 rounded-2xl text-xs flex items-center justify-center gap-1.5"
                      style={{ color: 'var(--muted)', background: 'transparent' }}
                    >
                      <LogOut size={12} /> Use a different account
                    </button>
                  </div>
                )}

                {/* Error recovery */}
                {step === 'error' && (
                  <div className="space-y-3 text-center">
                    <p className="text-sm" style={{ color: 'var(--error,#ef4444)' }}>{error}</p>
                    <button onClick={() => { setError(null); setChallengeId(null); }}
                      className="text-sm underline" style={{ color: 'var(--accent)' }}>
                      Try again
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
