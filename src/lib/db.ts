import Dexie, { type Table } from 'dexie';

export interface Product {
  id: string;
  name: string;
  type: 'PRODUCT' | 'SERVICE';
  unit: 'KG' | 'LITER' | 'PIECE' | 'HOUR' | 'BUNDLE';
  base_price: number;
  is_variable: boolean;
  allow_override: boolean;
  sku_barcode?: string;
  stock?: number; // Optional stock/inventory count
}

export interface Order {
  id: string; // Global UUID
  local_id: string; // local temporary ID
  customer_id?: string;
  total: number;
  status: 'PENDING' | 'HELD' | 'COMPLETED' | 'REFUNDED' | 'VOIDED';
  payment_type: 'CASH' | 'CARD' | 'SPLIT' | 'DIGITAL' | 'VOUCHER';
  created_at: number;
  items: OrderItem[];
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  discount?: number; // Applied discount amount
  tax?: number; // Calculated tax amount
  cashier?: string; // Cashier role/name
}

export interface OrderItem {
  product_id: string;
  quantity: number;
  price_at_sale: number;
  unit: string;
}

export interface SyncEntry {
  id: string;
  entity_type: 'ORDER' | 'PRODUCT' | 'CUSTOMER' | 'SETTING';
  payload: Product | Order | Customer | Setting;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  retry_count: number;
  created_at: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  loyalty_id?: string;
  points: number;
  total_visits: number;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: number;
}

export class POSDatabase extends Dexie {
  products!: Table<Product>;
  orders!: Table<Order>;
  customers!: Table<Customer>;
  syncQueue!: Table<SyncEntry>;
  settings!: Table<Setting>;

  constructor() {
    super('POSDatabase');
    this.version(5).stores({
      products: 'id, name, sku_barcode, type',
      orders: 'id, local_id, status, sync_status, customer_id, created_at',
      customers: 'id, name, phone, loyalty_id',
      syncQueue: 'id, entity_type, status',
      settings: 'key'
    });
  }
}

export const db = new POSDatabase();
