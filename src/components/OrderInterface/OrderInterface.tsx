'use client';

import { useState, useEffect } from 'react';
import { db, type Product, type Order, type OrderItem, type Customer } from '@/lib/db';
import { addToSyncQueue } from '@/lib/sync';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Ticket } from 'lucide-react';
import styles from './OrderInterface.module.css';
import CustomerSelector from "@/components/CustomerSelector/CustomerSelector";

export default function OrderInterface() {
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<(OrderItem & { product: Product })[]>([]);
  const [showVariableModal, setShowVariableModal] = useState<Product | null>(null);
  const [variableValue, setVariableValue] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku_barcode?.includes(searchTerm)
  );

  const addToCart = (product: Product) => {
    if (product.is_variable) {
      setShowVariableModal(product);
      setVariableValue('');
    } else {
      updateCartItem(product, 1);
    }
  };

  const updateCartItem = (product: Product, delta: number, overrideQuantity?: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        const newQuantity = overrideQuantity !== undefined ? overrideQuantity : existing.quantity + delta;
        if (newQuantity <= 0) return prev.filter(item => item.product_id !== product.id);
        return prev.map(item => item.product_id === product.id ? { ...item, quantity: newQuantity } : item);
      }
      if (delta > 0 || (overrideQuantity && overrideQuantity > 0)) {
        return [...prev, { 
          product_id: product.id, 
          quantity: overrideQuantity || delta, 
          price_at_sale: product.base_price,
          product 
        }];
      }
      return prev;
    });
  };

  const handleVariableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showVariableModal && variableValue) {
      updateCartItem(showVariableModal, 0, parseFloat(variableValue));
      setShowVariableModal(null);
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.quantity * item.price_at_sale), 0);

  const handleCheckout = async (paymentType: Order['payment_type']) => {
    if (cart.length === 0) return;

    const newOrder: Order = {
      id: crypto.randomUUID(),
      local_id: `LOCAL-${Date.now()}`,
      customer_id: selectedCustomer?.id,
      total,
      status: 'PAID',
      payment_type: paymentType,
      created_at: Date.now(),
      sync_status: 'PENDING',
      items: cart.map(({ product_id, quantity, price_at_sale }) => ({
        product_id,
        quantity,
        price_at_sale
      }))
    };

    await db.orders.add(newOrder);
    await addToSyncQueue('ORDER', newOrder);

    if (selectedCustomer) {
      const pointsEarned = Math.floor(total / 10);
      const updatedCustomer = { ...selectedCustomer, points: selectedCustomer.points + pointsEarned };
      await db.customers.update(selectedCustomer.id, { points: updatedCustomer.points });
      await addToSyncQueue('CUSTOMER', updatedCustomer);
    }

    setCart([]);
    setSelectedCustomer(null);
    alert(`Order completed via ${paymentType}!`);
  };

  const handleHold = async () => {
    if (cart.length === 0) return;

    const heldOrder: Order = {
      id: crypto.randomUUID(),
      local_id: `HELD-${Date.now()}`,
      customer_id: selectedCustomer?.id,
      total,
      status: 'HELD',
      payment_type: 'CASH', 
      created_at: Date.now(),
      sync_status: 'PENDING',
      items: cart.map(({ product_id, quantity, price_at_sale }) => ({
        product_id,
        quantity,
        price_at_sale
      }))
    };

    await db.orders.add(heldOrder);
    setCart([]);
    setSelectedCustomer(null);
    alert(`Order held!`);
  };

  const recallOrder = async (order: Order) => {
    const cartItems = order.items.map(item => {
      const product = products.find(p => p.id === item.product_id);
      return { ...item, product: product! };
    });
    setCart(cartItems);
    if (order.customer_id) {
      const customer = await db.customers.get(order.customer_id);
      if (customer) setSelectedCustomer(customer);
    }
    await db.orders.delete(order.id);
  };

  const heldOrders = useLiveQuery(() => db.orders.where('status').equals('HELD').toArray()) || [];

  return (
    <div className={styles.grid}>
      {/* Product Selection Side */}
      <div className={styles.selectionSection}>
        <div className={styles.searchBar}>
          <Search size={20} />
          <input 
            placeholder="Search products or scan barcode..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.productGrid}>
          {filteredProducts.map(p => (
            <button key={p.id} className={styles.productCard} onClick={() => addToCart(p)}>
              <span className={styles.pName}>{p.name}</span>
              <span className={styles.pPrice}>${p.base_price.toFixed(2)} / {p.unit}</span>
            </button>
          ))}
        </div>

        {heldOrders.length > 0 && (
          <div className={styles.heldSection}>
            <h4>Held Orders</h4>
            <div className={styles.heldList}>
              {heldOrders.map(o => (
                <button key={o.id} onClick={() => recallOrder(o)} className={styles.heldItem}>
                  {o.local_id} (${o.total.toFixed(2)})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cart / Checkout Side */}
      <div className={styles.cartSection}>
        <div className={styles.cartHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShoppingCart />
            <h3>Current Order</h3>
          </div>
          <button onClick={handleHold} className={styles.holdBtn} disabled={cart.length === 0}>
            Hold
          </button>
        </div>

        <div className={styles.cartItems}>
          <CustomerSelector 
            selectedCustomer={selectedCustomer} 
            onSelect={setSelectedCustomer} 
          />
          {cart.map(item => (
            <div key={item.product_id} className={styles.cartItem}>
              <div className={styles.itemMain}>
                <strong>{item.product.name}</strong>
                <span>${item.price_at_sale.toFixed(2)} x {item.quantity} {item.product.unit}</span>
              </div>
              <div className={styles.itemActions}>
                <button onClick={() => updateCartItem(item.product, -1)}><Minus size={16}/></button>
                <button onClick={() => updateCartItem(item.product, 1)}><Plus size={16}/></button>
                <button onClick={() => updateCartItem(item.product, 0, 0)} className={styles.remove}><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <p className={styles.empty}>Cart is empty</p>}
        </div>

        <div className={styles.cartFooter}>
          <div className={styles.totalRow}>
            <span>Total</span>
            <strong>${total.toFixed(2)}</strong>
          </div>
          
          <div className={styles.paymentActions}>
            <button onClick={() => handleCheckout('CASH')} className={styles.cash}>
              <Banknote /> Cash
            </button>
            <button onClick={() => handleCheckout('DIGITAL')} className={styles.digital}>
              <CreditCard /> Digital
            </button>
            <button onClick={() => handleCheckout('VOUCHER')} className={styles.voucher}>
              <Ticket /> Voucher
            </button>
          </div>
        </div>
      </div>

      {/* Variable Quantity Modal */}
      {showVariableModal && (
        <div className={styles.modalOverlay}>
          <form className={styles.modal} onSubmit={handleVariableSubmit}>
            <h3>Enter {showVariableModal.unit} for {showVariableModal.name}</h3>
            <input 
              type="number" 
              step="0.001" 
              autoFocus 
              required
              value={variableValue}
              onChange={e => setVariableValue(e.target.value)}
              placeholder={`Quantity in ${showVariableModal.unit}...`}
            />
            <div className={styles.modalButtons}>
              <button type="button" onClick={() => setShowVariableModal(null)}>Cancel</button>
              <button type="submit" className={styles.confirm}>Add to Cart</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
