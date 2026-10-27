/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'
import { IS_MAINNET } from './chain-config'

// Arc Mainnet chain definition (chainId 5042)
const arcMainnet = {
  id: 5042,
  name: 'Arc',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.arc.io'] } },
  blockExplorers: { default: { name: 'Arc Explorer', url: 'https://explorer.arc.io' } },
} as const

// Pre-register chain RPC URLs so trace events show correct chain names immediately
if (IS_MAINNET) {
  registerChain(arcMainnet.id, arcMainnet.rpcUrls.default.http[0])
} else {
  registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])
}

export const config = IS_MAINNET
  ? createConfig({
      chains: [arcMainnet, mainnet],
      connectors: [injected()],
      transports: {
        [arcMainnet.id]: http('https://rpc.mainnet.arc.io'),
        [mainnet.id]: http(),
      },
    })
  : createConfig({
      chains: [arcTestnet, mainnet],
      connectors: [injected()],
      transports: {
        [arcTestnet.id]: http(),
        [mainnet.id]: http(),
      },
    })
