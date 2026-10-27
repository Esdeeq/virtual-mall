/**
 * Single source of truth for which Arc chain the app targets.
 * Set VITE_ARC_MAINNET=true in .env to point at Arc Mainnet (chainId 5042).
 * Defaults to Arc Testnet (chainId 5042002) when the variable is absent or falsy.
 */

export const IS_MAINNET = import.meta.env.VITE_ARC_MAINNET === 'true';

/** Chain ID for all wagmi / viem calls — 5042 (mainnet) or 5042002 (testnet). */
export const ARC_CHAIN_ID: number = IS_MAINNET ? 5042 : 5042002;
