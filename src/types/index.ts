import type { Store, Product } from '../data/marketplace';

export type Theme = 'light' | 'dark' | 'sunset' | 'neon';

export type AppView = 'lobby' | 'store' | 'cart';

export interface CartItem {
  product: Product;
  store: Store;
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  timestamp: number;
  fulfillment: 'delivery' | 'pickup';
  deliveryAddress?: string;
  txHash?: string;
  txExplorerUrl?: string;
  /** 'escrow_pending' means funds are held in escrow; buyer must confirm receipt to release */
  status: 'pending' | 'paid' | 'confirmed' | 'escrow_pending' | 'receipt_confirmed';
  /** Set when the order was placed through the MallEscrow contract */
  escrowOrderId?: string;
}

export type { Store, Product };
