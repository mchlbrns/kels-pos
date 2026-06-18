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
}

export interface Order {
  id: string; // Global UUID
  local_id: string; // local temporary ID
  customer_id?: string;
  total: number;
  status: 'PENDING' | 'HELD' | 'COMPLETED' | 'REFUNDED';
  payment_type: 'CASH' | 'DIGITAL' | 'VOUCHER';
  created_at: number;
  items: OrderItem[];
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
}

export interface OrderItem {
  product_id: string;
  quantity: number;
  price_at_sale: number;
  unit: string;
}

export interface SyncEntry {
  id: string;
  entity_type: 'ORDER' | 'PRODUCT' | 'CUSTOMER';
  payload: Product | Order | Customer;
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

export class POSDatabase extends Dexie {
  products!: Table<Product>;
  orders!: Table<Order>;
  customers!: Table<Customer>;
  syncQueue!: Table<SyncEntry>;

  constructor() {
    super('POSDatabase');
    this.version(3).stores({
      products: 'id, name, sku_barcode, type',
      orders: 'id, local_id, status, sync_status, customer_id',
      customers: 'id, name, phone, loyalty_id',
      syncQueue: 'id, entity_type, status'
    });
  }
}

export const db = new POSDatabase();
