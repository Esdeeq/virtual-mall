import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Navbar } from './components/Navbar';
import { MallLobby } from './components/MallLobby';
import { DigitalAssetMarket } from './components/DigitalAssetMarket';
import { StoreView } from './components/StoreView';
import { ProductModal } from './components/ProductModal';
import { CheckoutModal } from './components/CheckoutModal';
import { ReceiptModal } from './components/ReceiptModal';
import { BankPanel } from './components/BankPanel';
import { CartDrawer } from './components/CartDrawer';
import { CursorGlow } from './components/CursorGlow';
import { PaymentMethodModal } from './components/PaymentMethodModal';
import { WelcomeSplash } from './components/WelcomeSplash';
import { SignInModal } from './components/SignInModal';

import { ConfettiBlast } from './components/ConfettiBlast';
import { AgentShopper } from './components/AgentShopper';
import AgentAPIPage from './components/AgentAPIPage';
import OrdersPage from './components/OrdersPage';
import type { Store, Product } from './data/marketplace';
import type { CartItem, Order, Theme } from './types';
import { ARC_CHAIN_ID } from './chain-config';
import { buildTxExplorerUrl } from './onchain-facts';

type AppView = 'lobby' | 'store' | 'digital' | 'agent-api' | 'orders';

export default function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const [view, setView] = useState<AppView>('lobby');
  const [activeStore, setActiveStore] = useState<Store | null>(null);

  // Modals / panels
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductStore, setSelectedProductStore] = useState<Store | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false);
  const [agentPrePaidTx, setAgentPrePaidTx] = useState<string | undefined>(undefined);
  const [agentOpen, setAgentOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  // Track sold quantities so inStock decrements live: { productId: totalSold }
  const [soldQty, setSoldQty] = useState<Record<string, number>>({});
  // Confetti
  const [confetti, setConfetti] = useState<{ x: number; y: number; key: number } | null>(null);
  const fireConfetti = useCallback((x: number, y: number) => {
    setConfetti({ x, y, key: Date.now() });
    setTimeout(() => setConfetti(null), 1600);
  }, []);

  // Apply theme to root
  useEffect(() => {
    const themeMap: Record<Theme, string> = {
      light: '',
      dark: 'dark',
      sunset: 'sunset',
      neon: 'neon',
    };
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    if (themeMap[theme]) {
      root.setAttribute('data-theme', themeMap[theme]);
    }
  }, [theme]);

  // Cart operations
  const handleAddToCart = useCallback((product: Product, store: Store, e?: React.MouseEvent) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, store, quantity: 1 }];
    });
    // Fire confetti from click position
    const x = e?.clientX ?? window.innerWidth / 2;
    const y = e?.clientY ?? window.innerHeight * 0.5;
    fireConfetti(x, y);
    toast.success(`Added ${product.name} to cart`, {
      description: `${store.name} · ${product.price.toFixed(2)} USDC`,
      duration: 1000,
    });
  }, [fireConfetti]);

  const handleUpdateQty = useCallback((productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0);
    });
  }, []);

  const handleRemoveFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  // Navigation
  const handleEnterStore = useCallback((store: Store) => {
    setActiveStore(store);
    setView('store');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBackToLobby = useCallback(() => {
    setView('lobby');
    setActiveStore(null);
    setSelectedProduct(null);
    setSelectedProductStore(null);
  }, []);

  const handleDigitalMarket = useCallback(() => {
    setView('digital');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Product modal
  const handleProductClick = useCallback((product: Product, store: Store) => {
    setSelectedProduct(product);
    setSelectedProductStore(store);
  }, []);

  const handleBuyNow = useCallback((product: Product, store: Store) => {
    // Add to cart then open checkout
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev;
      return [...prev, { product, store, quantity: 1 }];
    });
    setSelectedProduct(null);
    setSelectedProductStore(null);
    setCheckoutOpen(true);
  }, []);

  // Order complete — clear cart, decrement stock, fire confetti
  const handleOrderComplete = useCallback((order: Order) => {
    setCompletedOrder(order);
    setCheckoutOpen(false);
    fireConfetti(window.innerWidth / 2, window.innerHeight * 0.35);
    // Persist to orders history
    try {
      const existing = JSON.parse(localStorage.getItem('vm_orders') ?? '[]') as unknown as Order[];
      localStorage.setItem('vm_orders', JSON.stringify([order, ...existing].slice(0, 50)));
    } catch { /* ignore */ }
    setSoldQty(prev => {
      const next = { ...prev };
      order.items.forEach(i => {
        next[i.product.id] = (next[i.product.id] ?? 0) + i.quantity;
      });
      return next;
    });
    setCart([]);
  }, [fireConfetti]);

  // Receipt continue shopping
  const handleContinueShopping = useCallback(() => {
    setCompletedOrder(null);
    setView('lobby');
    setActiveStore(null);
  }, []);

  const handleCartOpenCheckout = useCallback(() => {
    setCartOpen(false);
    setPaymentMethodOpen(true);   // show payment method chooser first
  }, []);

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg-gradient)',
        transition: 'background 0.4s ease',
      }}
    >
      <CursorGlow />
      <Navbar
        theme={theme}
        onThemeChange={setTheme}
        cart={cart}
        onCartOpen={() => setCartOpen(true)}
        onBankOpen={() => setBankOpen(true)}
        onLogoClick={handleBackToLobby}

        onOrdersClick={() => setView('orders')}
        onSignInClick={() => setSignInOpen(true)}
      />

      {/* Main view transitions */}
      <AnimatePresence mode="wait">
        {view === 'lobby' && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, x: -40, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.98 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <MallLobby onEnterStore={handleEnterStore} onDigitalMarket={handleDigitalMarket} onAgentOpen={() => setAgentOpen(true)} />
          </motion.div>
        )}

        {view === 'store' && activeStore && (
          <motion.div
            key={`store-${activeStore.id}`}
            initial={{ opacity: 0, x: 48, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 48, scale: 0.98 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <StoreView
              store={activeStore}
              cart={cart}
              soldQty={soldQty}
              onBack={handleBackToLobby}
              onProductClick={handleProductClick}
              onAddToCart={handleAddToCart}
            />
          </motion.div>
        )}

        {view === 'digital' && (
          <motion.div
            key="digital"
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <DigitalAssetMarket onBack={handleBackToLobby} />
          </motion.div>
        )}

        {view === 'orders' && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pt-16">
              <OrdersPage onBack={handleBackToLobby} />
            </div>
          </motion.div>
        )}

        {view === 'agent-api' && (
          <motion.div
            key="agent-api"
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pt-16">
              <AgentAPIPage />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <ProductModal
        product={selectedProduct}
        store={selectedProductStore}
        cart={cart}
        onClose={() => { setSelectedProduct(null); setSelectedProductStore(null); }}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      <CartDrawer
        open={cartOpen}
        cart={cart}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemove={handleRemoveFromCart}
        onCheckout={handleCartOpenCheckout}
      />

      <CheckoutModal
        open={checkoutOpen}
        cart={cart}
        agentTxHash={agentPrePaidTx}
        onClose={() => { setCheckoutOpen(false); setAgentPrePaidTx(undefined); }}
        onOrderComplete={handleOrderComplete}
      />

      <ReceiptModal
        order={completedOrder}
        onClose={() => setCompletedOrder(null)}
        onContinueShopping={handleContinueShopping}
      />

      <BankPanel
        open={bankOpen}
        onClose={() => setBankOpen(false)}
      />

      <PaymentMethodModal
        open={paymentMethodOpen}
        total={cartTotal}
        onClose={() => setPaymentMethodOpen(false)}
        onProceed={(agentTxHash?: string) => {
          setPaymentMethodOpen(false);
          if (agentTxHash) {
            // Agent already paid — skip checkout, go straight to receipt
            const order: Order = {
              id: `VM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
              items: [...cart],
              total: cartTotal,
              txHash: agentTxHash,
              txExplorerUrl: buildTxExplorerUrl(ARC_CHAIN_ID, agentTxHash),
              fulfillment: 'delivery',
              status: 'confirmed',
              timestamp: Date.now(),
            };
            handleOrderComplete(order);
          } else {
            setCheckoutOpen(true);
          }
        }}
      />

      <AgentShopper
        isOpen={agentOpen}
        onClose={() => setAgentOpen(false)}
        onAddToCart={(product, store) => handleAddToCart(product, store)}
        onEnterStore={(store) => { setAgentOpen(false); handleEnterStore(store); }}
        onCheckout={(product, store, profile) => {
          setAgentOpen(false);
          handleAddToCart(product, store);
          // Write profile FIRST so CheckoutModal picks it up on open
          sessionStorage.setItem('agent_delivery_profile', JSON.stringify(profile));
          setTimeout(() => setCheckoutOpen(true), 200);
        }}
      />

      {/* Global effects */}
      <WelcomeSplash />
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />

      {confetti && (
        <ConfettiBlast
          key={confetti.key}
          trigger
          originX={confetti.x}
          originY={confetti.y}
          count={confetti.key % 2 === 0 ? 52 : 36}
        />
      )}
    </div>
  );
}
