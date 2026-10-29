/**
 * useAgentWallet — per-user in-browser agent wallet.
 *
 * On first call, generates a random EOA private key, stores it encrypted
 * (XOR + base64) in localStorage under "vm_agent_pk", and returns a viem
 * WalletClient. Subsequent calls restore the same key, so the wallet address
 * is stable across page reloads for the same browser.
 *
 * The user can export the private key at any time to back it up or import
 * it into MetaMask. If they clear localStorage the key is lost — treat it
 * like a hot wallet (fund only what you're willing to lose).
 */
import { useState, useEffect, useRef, useContext } from 'react';
import { createWalletClient, http, createPublicClient, isAddress } from 'viem';
import type { Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { erc20Abi } from 'viem';
import { requireChain, getUsdc } from '../onchain-facts';
import { parseAmount, formatUsdc } from '../onchain-money';
import { UserWalletContext } from '../context/UserWalletContext';

import { ARC_CHAIN_ID } from '../chain-config';
const STORAGE_KEY = 'vm_agent_pk';
const MASK = 0x5a; // simple XOR obfuscation — not cryptographic, just avoids plain-text key in storage

function obfuscate(hex: string): string {
  // Remove 0x prefix, XOR each byte, base64-encode
  const raw = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(raw.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(raw.slice(i * 2, i * 2 + 2), 16) ^ MASK;
  return btoa(String.fromCharCode(...bytes));
}

function deobfuscate(b64: string): `0x${string}` {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) ^ MASK;
  return ('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

function generatePrivateKey(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return ('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

function loadOrCreateKey(): `0x${string}` {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return deobfuscate(stored);
  } catch { /* ignore */ }
  const key = generatePrivateKey();
  try { localStorage.setItem(STORAGE_KEY, obfuscate(key)); } catch { /* ignore */ }
  return key;
}

export interface AgentWallet {
  address: `0x${string}`;
  privateKey: `0x${string}`;
  usdcBalance: string;        // formatted USDC, e.g. "12.50"
  isLoading: boolean;
  /** Send USDC from agent wallet to `to` address */
  sendUsdc: (to: `0x${string}`, amountUsdc: number) => Promise<`0x${string}`>;
  /** Refresh the balance from RPC */
  refreshBalance: () => Promise<void>;
  /** Export the raw hex private key for backup */
  exportKey: () => `0x${string}`;
}

export function useAgentWallet(): AgentWallet {
  const chainMeta = requireChain(ARC_CHAIN_ID);
  const viemChain = chainMeta as unknown as Chain;
  const usdcFact = getUsdc(ARC_CHAIN_ID);
  const rpcUrlList = chainMeta.rpcUrls;
  const rpcUrl = rpcUrlList[0] ?? (ARC_CHAIN_ID === 5042 ? 'https://rpc.mainnet.arc.io' : 'https://rpc.testnet.arc.io');

  // Circle user-controlled wallet (if signed in)
  const circleCtx = useContext(UserWalletContext);
  const circleWallet = circleCtx?.wallet ?? null;
  const circleUserToken = circleCtx?.userToken ?? null;

  // Local EOA fallback
  const pkRef = useRef<`0x${string}` | null>(null);
  const [localAddress, setLocalAddress] = useState<`0x${string}`>('0x0000000000000000000000000000000000000000');
  const [usdcBalance, setUsdcBalance] = useState('0.00');
  const [isLoading, setIsLoading] = useState(true);

  // Active address — Circle wallet takes priority
  const address: `0x${string}` = circleWallet
    ? circleWallet.address as `0x${string}`
    : localAddress;

  // Initialise local EOA on mount
  useEffect(() => {
    const pk = loadOrCreateKey();
    pkRef.current = pk;
    const account = privateKeyToAccount(pk);
    setLocalAddress(account.address);
    setIsLoading(false);
  }, []);

  // Sync Circle wallet balance when signed in
  useEffect(() => {
    if (circleWallet && circleCtx) {
      setUsdcBalance(circleCtx.usdcBalance);
    }
  }, [circleWallet, circleCtx]);

  // Fetch local EOA balance from RPC
  const refreshBalance = async () => {
    // If Circle wallet is active, its balance comes from context — refresh there
    if (circleWallet && circleCtx) {
      await circleCtx.loadWallet();
      setUsdcBalance(circleCtx.usdcBalance);
      return;
    }
    const activeAddr = address;
    if (!usdcFact || activeAddr === '0x0000000000000000000000000000000000000000') return;
    try {
      const publicClient = createPublicClient({ chain: viemChain, transport: http(rpcUrl) });
      const raw = await publicClient.readContract({
        address: usdcFact.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [activeAddr],
      });
      setUsdcBalance(parseFloat(formatUsdc(BigInt(raw))).toFixed(2));
    } catch { /* RPC unreachable */ }
  };

  useEffect(() => {
    if (address !== '0x0000000000000000000000000000000000000000' && !circleWallet) {
      void refreshBalance();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, circleWallet]);

  const sendUsdc = async (to: `0x${string}`, amountUsdc: number): Promise<`0x${string}`> => {
    // Validate address first
    if (!isAddress(to)) throw new Error(`Invalid address: ${String(to)}`);
    if (amountUsdc <= 0) throw new Error('Amount must be greater than 0');

    // Circle wallet path — server-initiated transfer via Circle SDK
    if (circleWallet && circleUserToken) {
      const resp = await fetch('/api/wallet/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: circleUserToken,
          walletId: circleWallet.id,
          destinationAddress: to,
          amount: String(amountUsdc),
        }),
      });
      const data = await resp.json() as { ok: boolean; txHash?: string; challengeId?: string; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Circle transfer failed');
      if (data.challengeId) {
        // User-controlled wallets require PIN confirmation — return challengeId as the "hash"
        // The caller can use the Circle SDK to execute the challenge
        return data.challengeId as `0x${string}`;
      }
      return (data.txHash ?? '0x') as `0x${string}`;
    }

    // Local EOA path — sign with private key
    if (!pkRef.current || !usdcFact) throw new Error('Agent wallet not ready');
    const account = privateKeyToAccount(pkRef.current);
    const walletClient = createWalletClient({ account, chain: viemChain, transport: http(rpcUrl) });
    const amt = parseAmount(ARC_CHAIN_ID, String(amountUsdc));
    const hash = await walletClient.writeContract({
      address: usdcFact.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [to, amt.raw],
      chain: viemChain,
    });
    setTimeout(() => { void refreshBalance(); }, 4000);
    return hash;
  };

  const exportKey = (): `0x${string}` => {
    if (circleWallet) throw new Error('Circle wallet — no exportable key. Recover via your PIN and security questions.');
    if (!pkRef.current) throw new Error('Agent wallet not initialised');
    return pkRef.current;
  };

  return { address, privateKey: circleWallet ? '0x' : (pkRef.current ?? '0x'), usdcBalance, isLoading, sendUsdc, refreshBalance, exportKey };
}
