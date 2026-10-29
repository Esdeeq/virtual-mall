/**
 * UserWalletContext — persists Circle user-controlled wallet session.
 * Stores userToken, encryptionKey, wallet address, and USDC balance.
 * Session is stored in localStorage (acceptable for testnet/demo).
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';
import { IS_MAINNET } from '../chain-config';

// Circle blockchain string for the active network
const ACTIVE_BLOCKCHAIN = IS_MAINNET ? 'ARC' : 'ARC-TESTNET';

const CIRCLE_APP_ID = import.meta.env.VITE_CIRCLE_APP_ID as string;

export interface CircleWallet {
  id: string;
  address: string;
  blockchain: string;
  accountType: string;
}

interface UserWalletState {
  /** Circle userId (email used as ID) */
  userId: string | null;
  userToken: string | null;
  encryptionKey: string | null;
  wallet: CircleWallet | null;
  usdcBalance: string;
  isLoading: boolean;
  sdk: W3SSdk | null;
  sdkReady: boolean;
  signIn: (userId: string) => Promise<{ challengeId?: string; alreadyInitialized?: boolean }>;
  executeChallenge: (challengeId: string) => Promise<void>;
  loadWallet: (tokOverride?: string) => Promise<boolean | undefined>;
  signOut: () => void;
}

export const UserWalletContext = createContext<UserWalletState | null>(null);

export function UserWalletProvider({ children }: { children: ReactNode }) {
  const sdkRef = useRef<W3SSdk | null>(null);
  const [sdkInstance, setSdkInstance] = useState<W3SSdk | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem('vm_userId'));
  const [userToken, setUserToken] = useState<string | null>(() => localStorage.getItem('vm_userToken'));
  const [encryptionKey, setEncKey] = useState<string | null>(() => localStorage.getItem('vm_encryptionKey'));
  const [wallet, setWallet] = useState<CircleWallet | null>(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('vm_wallet') ?? 'null') as CircleWallet | null;
      // Discard cached wallet if it's on the wrong network (e.g. testnet wallet cached while app is now mainnet)
      if (cached && cached.blockchain !== ACTIVE_BLOCKCHAIN) {
        localStorage.removeItem('vm_wallet');
        return null;
      }
      return cached;
    } catch { return null; }
  });
  const [usdcBalance, setUsdcBalance] = useState('0.00');
  const [isLoading, setIsLoading] = useState(false);

  // Init SDK once
  useEffect(() => {
    if (!CIRCLE_APP_ID || CIRCLE_APP_ID === 'your_app_id_here') return;
    const sdk = new W3SSdk({ appSettings: { appId: CIRCLE_APP_ID } });
    sdkRef.current = sdk;
    setSdkInstance(sdk);
    sdk.getDeviceId().then(id => {
      localStorage.setItem('vm_deviceId', id);
      setSdkReady(true);
    }).catch(() => setSdkReady(true));
  }, []);

  // Refresh userToken from server and persist it
  const refreshToken = useCallback(async (uid: string): Promise<string | null> => {
    try {
      const resp = await fetch('/api/wallet/get-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      });
      const data = await resp.json() as { ok: boolean; userToken?: string; encryptionKey?: string };
      if (data.ok && data.userToken) {
        setUserToken(data.userToken);
        if (data.encryptionKey) setEncKey(data.encryptionKey);
        localStorage.setItem('vm_userToken', data.userToken);
        if (data.encryptionKey) localStorage.setItem('vm_encryptionKey', data.encryptionKey);
        return data.userToken;
      }
    } catch { /* silent */ }
    return null;
  }, []);

  // Load balance when wallet is known — auto-refreshes token if expired
  const loadBalance = useCallback(async (wId: string, tok: string) => {
    try {
      const resp = await fetch('/api/wallet/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: wId, userToken: tok }),
      });
      const data = await resp.json() as { ok: boolean; error?: string; tokenBalances?: { amount: string; token: { symbol: string; blockchain?: string; isNative?: boolean } }[] };
      if (!data.ok && data.error?.includes('expired') && userId) {
        // Token expired — refresh and retry once
        const newTok = await refreshToken(userId);
        if (newTok) { await loadBalance(wId, newTok); return; }
      }
      if (data.ok && data.tokenBalances) {
        // Pick USDC on the active blockchain — prefer native token (gas = USDC on Arc)
        const usdc = data.tokenBalances.find(b =>
          b.token.symbol === 'USDC' &&
          (b.token.blockchain === ACTIVE_BLOCKCHAIN || !b.token.blockchain)
          && b.token.isNative === true
        ) ?? data.tokenBalances.find(b =>
          b.token.symbol === 'USDC' &&
          (b.token.blockchain === ACTIVE_BLOCKCHAIN || !b.token.blockchain)
        ) ?? data.tokenBalances.find(b => b.token.symbol === 'USDC');
        setUsdcBalance(usdc ? parseFloat(usdc.amount).toFixed(2) : '0.00');
      }
    } catch { /* silent */ }
  }, [userId, refreshToken]);

  const loadWallet = useCallback(async (tokOverride?: string) => {
    const tok = tokOverride ?? userToken;
    if (!tok) return;
    try {
      const resp = await fetch('/api/wallet/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userToken: tok }),
      });
      const data = await resp.json() as { ok: boolean; error?: string; wallets?: CircleWallet[] };
      if (!data.ok && data.error?.includes('expired') && userId) {
        const newTok = await refreshToken(userId);
        if (newTok) { await loadWallet(newTok); return; }
      }
      if (data.ok) {
        const wallets = data.wallets ?? [];
        // Prefer wallet on active blockchain; if none exists, it will be created via initialize
        const w = wallets.find((wl: CircleWallet) => wl.blockchain === ACTIVE_BLOCKCHAIN)
          ?? (wallets.length ? wallets[0] : null);
        if (w) {
          setWallet(w);
          localStorage.setItem('vm_wallet', JSON.stringify(w));
          void loadBalance(w.id, tok);
        }
        // Return whether we found a mainnet wallet so caller can create one if needed
        return wallets.some((wl: CircleWallet) => wl.blockchain === ACTIVE_BLOCKCHAIN);
      }
    } catch { /* silent */ }
  }, [userToken, userId, loadBalance, refreshToken]);

  // Auto-load wallet on mount + poll every 30s to keep balance fresh
  useEffect(() => {
    if (!userToken) return;
    if (!wallet) { void loadWallet(); return; }
    void loadBalance(wallet.id, userToken);
    const interval = setInterval(() => { void loadBalance(wallet.id, userToken); }, 30_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userToken, wallet?.id]);

  /** Step 1+2: createUser + createUserToken */
  const signIn = useCallback(async (uid: string): Promise<{ challengeId?: string; alreadyInitialized?: boolean }> => {
    setIsLoading(true);
    try {
      // Create user (idempotent — 155101 = already exists)
      await fetch('/api/wallet/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      });

      // Get session token
      const tokenResp = await fetch('/api/wallet/get-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      });
      const tokenData = await tokenResp.json() as { ok: boolean; userToken: string; encryptionKey: string };
      if (!tokenData.ok) throw new Error('Failed to get user token');

      const tok = tokenData.userToken;
      const enc = tokenData.encryptionKey;
      setUserId(uid);
      setUserToken(tok);
      setEncKey(enc);
      localStorage.setItem('vm_userId', uid);
      localStorage.setItem('vm_userToken', tok);
      localStorage.setItem('vm_encryptionKey', enc);

      // Initialize user (get challengeId) — 155106 = already initialized
      const initResp = await fetch('/api/wallet/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userToken: tok }),
      });
      const initData = await initResp.json() as { ok: boolean; challengeId?: string; alreadyInitialized?: boolean };

      if (initData.alreadyInitialized) {
        // Existing user — load wallets and check if they have one on the active blockchain
        const hasActiveWallet = await loadWallet(tok);
        if (!hasActiveWallet) {
          // User exists but has no wallet on this network (e.g. testnet user signing into mainnet)
          // Re-initialize to create a wallet on the active blockchain
          const reInitResp = await fetch('/api/wallet/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: tok }),
          });
          const reInitData = await reInitResp.json() as { ok: boolean; challengeId?: string; alreadyInitialized?: boolean };
          if (reInitData.challengeId) return { challengeId: reInitData.challengeId };
        }
        return { alreadyInitialized: true };
      }
      return { challengeId: initData.challengeId };
    } finally {
      setIsLoading(false);
    }
  }, [loadWallet]);

  /** Step 3: Execute PIN setup challenge */
  const executeChallenge = useCallback(async (challengeId: string) => {
    const sdk = sdkRef.current;
    if (!sdk || !userToken || !encryptionKey) throw new Error('SDK not ready');
    sdk.setAuthentication({ userToken, encryptionKey });
    await new Promise<void>((resolve, reject) => {
      sdk.execute(challengeId, (err) => {
        if (err) { reject(err instanceof Error ? err : new Error(String(err))); return; }
        resolve();
      });
    });
    // Give Circle a moment to index the new wallet
    await new Promise(r => setTimeout(r, 1500));
    await loadWallet();
  }, [userToken, encryptionKey, loadWallet]);

  const signOut = useCallback(() => {
    setUserId(null); setUserToken(null); setEncKey(null); setWallet(null); setUsdcBalance('0.00');
    ['vm_userId', 'vm_userToken', 'vm_encryptionKey', 'vm_wallet'].forEach(k => localStorage.removeItem(k));
  }, []);

  return (
    <UserWalletContext.Provider value={{
      userId, userToken, encryptionKey, wallet, usdcBalance, isLoading,
      sdk: sdkInstance, sdkReady,
      signIn, executeChallenge, loadWallet, signOut,
    }}>
      {children}
    </UserWalletContext.Provider>
  );
}

export function useUserWallet() {
  const ctx = useContext(UserWalletContext);
  if (!ctx) throw new Error('useUserWallet must be used inside UserWalletProvider');
  return ctx;
}
