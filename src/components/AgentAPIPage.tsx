/**
 * AgentAPIPage — Public storefront for the VirtualMall x402 Agent API.
 * Shows endpoints, pricing, integration guide, and a live endpoint tester.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Code2, DollarSign, Globe, ChevronRight, Copy, Check,
  Terminal, Package, ArrowRight, Activity,
} from 'lucide-react';

const MERCHANT_ADDRESS = import.meta.env.VITE_MERCHANT_ADDRESS as string;
const SERVER_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/catalog',
    description: 'Full store and product catalog with all 9 stores and 36 products.',
    price: '$0.001',
    example: { stores: [{ id: 'tech-haven', name: 'Tech Haven', productCount: 4 }], meta: { totalStores: 9, totalProducts: 36 } },
  },
  {
    method: 'GET',
    path: '/api/stores',
    description: 'Lightweight store list with names, categories, ratings, and hours.',
    price: '$0.001',
    example: [{ id: 'verde-market', name: 'Verde Market', category: 'food', rating: 4.9 }],
  },
  {
    method: 'GET',
    path: '/api/stores/:id',
    description: 'Single store with full product list. Replace :id with store slug.',
    price: '$0.001',
    example: { id: 'bloom-co', name: 'Bloom & Co', products: [{ id: 'bl-1', name: 'Garden Rose Bouquet', price: 4.50 }] },
  },
  {
    method: 'POST',
    path: '/api/search',
    description: 'NLP product search. POST { query, maxPrice?, category? } to find products.',
    price: '$0.001',
    example: { count: 2, results: [{ store: 'Page One', product: { name: 'Atomic Habits', price: 1.60 } }] },
  },
];

const INTEGRATION_STEPS = [
  {
    step: '1',
    title: 'Make an unpaid request',
    desc: 'The server returns HTTP 402 with payment details in the response body.',
    code: `curl ${SERVER_BASE}/api/catalog\n# → 402 Payment Required\n# { "accepts": [{ "network": "arc-testnet", "amount": "0.001", "address": "0xEA1d…" }] }`,
  },
  {
    step: '2',
    title: 'Deposit USDC into Gateway',
    desc: 'One-time onchain deposit. After this, all payments are gasless offchain signatures.',
    code: `# Using Circle CLI\ncircle gateway deposit --amount 1.00 --network arc-testnet`,
  },
  {
    step: '3',
    title: 'Pay and retry with x402',
    desc: 'Sign an EIP-3009 authorization and attach it as the X-Payment header.',
    code: `# Using @circle-fin/x402-batching client\nimport { createGatewayClient } from '@circle-fin/x402-batching/client';\n\nconst client = createGatewayClient({ privateKey: process.env.BUYER_KEY });\nconst res = await client.fetch('${SERVER_BASE}/api/catalog');\n// → 200 OK + full catalog`,
  },
  {
    step: '4',
    title: 'Search for products',
    desc: 'Use the NLP search endpoint to find products by keyword, price, or category.',
    code: `const res = await client.fetch('${SERVER_BASE}/api/search', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ query: 'something for the gym under $5' }),\n});\nconst { results } = await res.json();`,
  },
];

const NPM_SNIPPET = `npm install @circle-fin/x402-batching

import { createGatewayClient } from '@circle-fin/x402-batching/client';

const client = createGatewayClient({ privateKey: process.env.BUYER_PRIVATE_KEY });

// Any paid endpoint — client handles 402 → pay → retry automatically
const catalog = await client.fetch('${SERVER_BASE}/api/catalog').then(r => r.json());
const results = await client.fetch('${SERVER_BASE}/api/search', {
  method: 'POST',
  body: JSON.stringify({ query: 'show me sneakers under $10', maxPrice: 10 }),
}).then(r => r.json());`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    const el = document.createElement('textarea'); el.value = text; el.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;'; document.body.appendChild(el); el.focus(); el.select(); try { document.execCommand('copy'); } catch { /* silent */ } document.body.removeChild(el);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };
  return { copied, copy };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    POST: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  };
  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${colors[method] ?? 'bg-zinc-700 text-zinc-300'}`}>
      {method}
    </span>
  );
}

function CodeBlock({ code, copyKey, copied, onCopy }: {
  code: string; copyKey: string;
  copied: string | null; onCopy: (t: string, k: string) => void;
}) {
  return (
    <div className="relative group">
      <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300 font-mono overflow-x-auto leading-relaxed">
        {code}
      </pre>
      <button
        onClick={() => onCopy(code, copyKey)}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied === copyKey
          ? <Check className="w-3.5 h-3.5 text-emerald-400" />
          : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live tester
// ---------------------------------------------------------------------------

function LiveTester() {
  const [status, setStatus] = useState<null | { code: number; body: string; ms: number }>(null);
  const [loading, setLoading] = useState(false);
  const { copied, copy } = useCopy();

  const test = async () => {
    setLoading(true);
    setStatus(null);
    const t0 = Date.now();
    try {
      const res = await fetch('/api/catalog');
      const body = await res.text();
      setStatus({ code: res.status, body: body.slice(0, 300) + (body.length > 300 ? '…' : ''), ms: Date.now() - t0 });
    } catch {
      setStatus({ code: 0, body: 'Server unreachable — start with: bun run server', ms: Date.now() - t0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-zinc-200">Live Endpoint Tester</span>
        </div>
        <button
          onClick={() => void test()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {loading ? <Activity className="w-3.5 h-3.5 animate-pulse" /> : <Zap className="w-3.5 h-3.5" />}
          {loading ? 'Requesting…' : 'GET /api/catalog'}
        </button>
      </div>

      {status && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className={`font-bold ${status.code === 402 ? 'text-amber-400' : status.code === 200 ? 'text-emerald-400' : 'text-red-400'}`}>
              {status.code === 0 ? 'ERR' : `HTTP ${status.code}`}
            </span>
            <span>{status.ms}ms</span>
            {status.code === 402 && (
              <span className="text-amber-400">Payment required — attach X-Payment header to get 200</span>
            )}
          </div>
          <div className="relative group">
            <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 font-mono overflow-x-auto">
              {status.body}
            </pre>
            <button
              onClick={() => copy(status.body, 'live')}
              className="absolute top-2 right-2 p-1 rounded bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copied === 'live' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
            </button>
          </div>
          {status.code === 402 && (
            <p className="text-xs text-zinc-500">
              This is expected. The 402 body contains the <code className="text-violet-400">accepts[]</code> array with payment details. Use the x402 client to pay and retry automatically.
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AgentAPIPage({ embedded = false }: { embedded?: boolean }) {
  const { copied, copy } = useCopy();

  return (
    <div className={embedded ? 'text-zinc-100' : 'min-h-screen bg-zinc-950 text-zinc-100'}>
      {/* Hero */}
      <div className={embedded ? 'border-b border-zinc-800 bg-gradient-to-b from-violet-950/30 to-transparent' : 'border-b border-zinc-800 bg-gradient-to-b from-violet-950/30 to-transparent'}>
        <div className={embedded ? 'px-4 py-6 space-y-4' : 'max-w-5xl mx-auto px-6 py-16 space-y-6'}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium">
              <Zap className="w-3 h-3" />
              x402 Agent API · Circle Gateway Nanopayments
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              VirtualMall Agent API
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl">
              A pay-per-call shopping catalog API for AI agents. Search products,
              browse stores, and place orders — paying $0.001 USDC per call with
              Circle Gateway. No API key, no account, no signup.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              {[
                { icon: DollarSign, label: '$0.001 USDC per call', sub: 'gasless via Gateway' },
                { icon: Globe, label: '9 stores · 36 products', sub: 'live catalog' },
                { icon: Zap, label: 'HTTP 402 · x402 protocol', sub: 'standard payment flow' },
                { icon: Package, label: '@circle-fin/x402-batching', sub: 'drop-in client' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <Icon className="w-4 h-4 text-violet-400 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-zinc-200">{label}</div>
                    <div className="text-xs text-zinc-500">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">

        {/* Quick start */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Code2 className="w-5 h-5 text-violet-400" />
            Quick Start
          </h2>
          <CodeBlock code={NPM_SNIPPET} copyKey="npm" copied={copied} onCopy={copy} />
        </section>

        {/* Live tester */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-400" />
            Try It Live
          </h2>
          <LiveTester />
        </section>

        {/* Endpoints */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Endpoints</h2>
          <div className="space-y-3">
            {ENDPOINTS.map((ep, i) => (
              <motion.div
                key={ep.path}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MethodBadge method={ep.method} />
                    <code className="text-sm font-mono text-zinc-100">{ep.path}</code>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-emerald-400">{ep.price} USDC</span>
                </div>
                <p className="text-sm text-zinc-400">{ep.description}</p>
                <details className="group">
                  <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors list-none flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
                    Example response
                  </summary>
                  <pre className="mt-2 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 font-mono overflow-x-auto">
                    {JSON.stringify(ep.example, null, 2)}
                  </pre>
                </details>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Integration guide */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold">How x402 Works</h2>
          <div className="space-y-4">
            {INTEGRATION_STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-5"
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-400 text-sm font-bold flex items-center justify-center">
                  {s.step}
                </div>
                <div className="flex-1 space-y-2 pt-0.5">
                  <div className="font-semibold text-zinc-200">{s.title}</div>
                  <p className="text-sm text-zinc-400">{s.desc}</p>
                  <CodeBlock code={s.code} copyKey={`step-${s.step}`} copied={copied} onCopy={copy} />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Marketplace listing info */}
        <section className="rounded-2xl border border-zinc-700 bg-zinc-900/40 p-8 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold">Circle Agent Marketplace</h2>
              <p className="text-sm text-zinc-400">
                This service is eligible for listing on the Circle Agent Marketplace at
                agents.circle.com, where other AI agents discover and pay for it automatically.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Service name', value: 'VirtualMall Catalog API' },
              { label: 'Category', value: 'E-commerce / Shopping' },
              { label: 'Price per call', value: '$0.001 USDC' },
              { label: 'Payment protocol', value: 'x402 + Circle Gateway' },
              { label: 'Seller address', value: MERCHANT_ADDRESS ? `${MERCHANT_ADDRESS.slice(0,6)}…${MERCHANT_ADDRESS.slice(-4)}` : 'not set' },
              { label: 'Network', value: 'Arc Testnet' },
              { label: 'Health check', value: `${SERVER_BASE}/health` },
              { label: 'Base URL', value: SERVER_BASE },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-2 border-b border-zinc-800 pb-2">
                <span className="text-zinc-500">{label}</span>
                <span className="text-zinc-200 font-medium text-right">{value}</span>
              </div>
            ))}
          </div>

          <a
            href="https://agents.circle.com/services"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            Submit to Agent Marketplace
            <ArrowRight className="w-4 h-4" />
          </a>
        </section>

        {/* Footer note */}
        <p className="text-center text-xs text-zinc-600 pb-8">
          Payments settled via Circle Gateway Nanopayments. Sub-cent USDC, gasless, Arc Testnet.
          Built with @circle-fin/x402-batching v3.
        </p>

      </div>
    </div>
  );
}
