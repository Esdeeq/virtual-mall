# VirtualMall Catalog API — Circle Agent Marketplace Listing

## Service Metadata

| Field | Value |
|---|---|
| **Service name** | VirtualMall Catalog API |
| **Provider** | VirtualMall |
| **Category** | E-commerce / Shopping |
| **Description** | A pay-per-call shopping catalog API for AI agents. Browse 9 stores, 36 products across food, fashion, electronics, books, sports, home, flowers, meat, and toys. Search with natural language, filter by price and category, and retrieve full product details — all for $0.001 USDC per call. |
| **Base URL** | `http://localhost:3001` (testnet) |
| **Health check** | `GET /health` (free) |
| **Payment protocol** | x402 + Circle Gateway Nanopayments |
| **Price per call** | $0.001 USDC |
| **Network** | Arc Testnet (chain ID 5042002) |
| **Seller address** | `0xEA1d5555d707086622181Ac64c43DB6860868f0E` |

---

## Endpoints

### `GET /api/catalog` — $0.001 USDC
Returns full store and product catalog.

**Response:**
```json
{
  "stores": [...],
  "meta": { "totalStores": 9, "totalProducts": 36, "currency": "USDC", "network": "Arc Testnet" }
}
```

### `GET /api/stores` — $0.001 USDC
Returns lightweight store list with names, categories, ratings, and operating hours.

### `GET /api/stores/:id` — $0.001 USDC
Returns a single store with its full product list. Store IDs: `tech-haven`, `studio-style`, `verde-market`, `page-one`, `peak-performance`, `casa-luxe`, `bloom-co`, `butcher-block`, `pixel-playground`.

### `POST /api/search` — $0.001 USDC
Natural language product search.

**Request:**
```json
{ "query": "something for the gym under $5", "maxPrice": 5, "category": "sports" }
```

**Response:**
```json
{
  "query": "something for the gym under $5",
  "count": 3,
  "results": [
    { "store": "Peak Performance", "storeId": "peak-performance", "product": { "id": "pp-1", "name": "Pro Yoga Mat", "price": 3.80 }, "score": 45 }
  ]
}
```

---

## Integration (Node.js / TypeScript)

```typescript
import { createGatewayClient } from '@circle-fin/x402-batching/client';

const client = createGatewayClient({ privateKey: process.env.BUYER_PRIVATE_KEY });

// Browse catalog
const catalog = await client.fetch('http://localhost:3001/api/catalog').then(r => r.json());

// Search products
const results = await client.fetch('http://localhost:3001/api/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'show me books under $2' }),
}).then(r => r.json());
```

---

## Example Agent Prompts

- "Search the VirtualMall for running shoes under $12"
- "Get me the full catalog from VirtualMall"
- "Find flowers for a gift, budget $5"
- "What electronics does VirtualMall carry?"
- "Show me all food items under $3"

---

## Payment Flow (x402)

1. Agent sends unauthenticated request → server returns `HTTP 402` with `accepts[]` array
2. Agent reads payment details: chain, address, amount
3. Agent signs EIP-3009 offchain authorization (zero gas)
4. Agent retries request with `X-Payment` header
5. Server verifies signature → returns `200 OK` + data
6. Gateway batches authorizations, settles to seller's balance onchain

---

## Marketplace Submission

Submit this service to the Circle Agent Marketplace:
- **Intake form:** https://agents.circle.com/services (click "Talk to us" or the seller intake link)
- **Evidence required:** unpaid request returns 402, paid request returns 200
- **Support URL:** (your contact URL)

---

*Built with `@circle-fin/x402-batching` v3. Payments settled via Circle Gateway on Arc Testnet.*
