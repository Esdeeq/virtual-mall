# [App Name]

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

[Brief description of what the app does and its primary use case]

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## Deployed Contracts

| Contract | Chain | Address | Explorer |
|---|---|---|---|
| MallEscrow v1 | Arc Testnet (5042002) | `0x0e91880c0e122ba2b53c4ad0af4cad55b781c08e` | [View](https://explorer.testnet.arc.io/address/0x0e91880c0e122ba2b53c4ad0af4cad55b781c08e) | Deprecated — signer=merchant |
| MallEscrow v2 | Arc Testnet (5042002) | `0xad54fd03e71ad9ff5d63712fdbe67b8e557f6e9e` | [View](https://explorer.testnet.arc.io/address/0xad54fd03e71ad9ff5d63712fdbe67b8e557f6e9e) | signer separate from merchant; VITE_ESCROW_SIGNER_KEY holds deposit auth key |

Constructor args: `usdc=0x3600000000000000000000000000000000000000`, `merchant=0xEA1d5555d707086622181Ac64c43DB6860868f0E`, `owner=0x5B12Ce46C7194aD57d143bC22847224047b1Ef42`, `timeoutSeconds=604800` (7 days).

## Mainnet Deploy — MallEscrow on Arc Mainnet

**DEPLOYED:** `0x695643fDff2cd0c5a539352B6708BFb5aA3f8D00` on Arc Mainnet (chainId 5042)
Deployer: `0x6a3905b96A8f60D87981B7C5294145a9FB95e69b`
Signer address: `0xdE78Ee177e1b950Cf66237e9141f3682d89629CC`
Merchant: `0xEA1d5555d707086622181Ac64c43DB6860868f0E`
Explorer: https://explorer.arc.io/address/0x695643fDff2cd0c5a539352B6708BFb5aA3f8D00
Deploy tx: `0x079b35fb8fbe9b66447a50d50dd53cab607c51d4f2284821f32f99d6f02980df`

The contract source is `contracts/MallEscrow.sol` (audited, 40/40 tests pass). To redeploy on Arc Mainnet:

1. Build the contract:
   ```bash
   forge build
   ```

2. Deploy with forge (run this from your own machine — never commit `$PRIVATE_KEY`):
   ```bash
   forge create contracts/MallEscrow.sol:MallEscrow \
     --rpc-url https://rpc.mainnet.arc.io \
     --private-key $PRIVATE_KEY \
     --broadcast \
     --constructor-args \
       0x3600000000000000000000000000000000000000 \
       0xEA1d5555d707086622181Ac64c43DB6860868f0E \
       <YOUR_OWNER_ADDRESS> \
       604800
   ```
   Constructor args: `usdc`, `merchant`, `owner`, `timeoutSeconds` (604800 = 7 days).
   The deployer wallet needs USDC on Arc Mainnet for gas.

3. After deploy, set these in `.env`:
   ```
   VITE_ARC_MAINNET=true
   VITE_ESCROW_ADDRESS=<deployed contract address>
   VITE_MERCHANT_ADDRESS=0xEA1d5555d707086622181Ac64c43DB6860868f0E
   VITE_ESCROW_SIGNER_KEY=<your signer private key>
   ```

4. The app auto-switches to Arc Mainnet (chainId 5042) when `VITE_ARC_MAINNET=true`.

## To Run

```bash
bun install
bun run dev
```
