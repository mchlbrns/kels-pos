'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import styles from './Reports.module.css';
import { Printer, Download, Share2 } from 'lucide-react';

export default function ReportsPage() {
  const startOfDay = new Date();
  startOfDay.setHours(0,0,0,0);

  const todayOrders = useLiveQuery(() => 
    db.orders.where('created_at').above(startOfDay.getTime()).toArray()
  ) || [];

  const totalSales = todayOrders.reduce((sum, o) => sum + o.total, 0);
  
  const paymentBreakdown = todayOrders.reduce((acc, o) => {
    acc[o.payment_type] = (acc[o.payment_type] || 0) + o.total;
    return acc;
  }, {} as Record<string, number>);

  const itemCounts = todayOrders.flatMap(o => o.items).reduce((acc, item) => {
    acc[item.product_id] = (acc[item.product_id] || 0) + Number(item.quantity);
    return acc;
  }, {} as Record<string, number>);

  const products = useLiveQuery(() => db.products.toArray()) || [];
  
  const topItems = Object.entries(itemCounts)
    .map(([id, qty]) => ({
      name: products.find(p => p.id === id)?.name || 'Unknown',
      qty
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Today's Summary</h2>
        <div className={styles.actions}>
          <button onClick={() => window.print()} className={styles.printBtn}>
            <Printer size={18} /> Print Report
          </button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>Total Sales</span>
          <strong>${totalSales.toFixed(2)}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Total Orders</span>
          <strong>{todayOrders.length}</strong>
        </div>
      </div>

      <div className={styles.sections}>
        <div className={styles.section}>
          <h3>Payment Methods</h3>
          <div className={styles.list}>
            {Object.entries(paymentBreakdown).map(([type, amount]) => (
              <div key={type} className={styles.listItem}>
                <span>{type}</span>
                <strong>${amount.toFixed(2)}</strong>
              </div>
            ))}
            {Object.keys(paymentBreakdown).length === 0 && <p>No sales today.</p>}
          </div>
        </div>

        <div className={styles.section}>
          <h3>Top Selling Items</h3>
          <div className={styles.list}>
            {topItems.map(item => (
              <div key={item.name} className={styles.listItem}>
                <span>{item.name}</span>
                <strong>{item.qty.toFixed(2)} sold</strong>
              </div>
            ))}
            {topItems.length === 0 && <p>No items sold today.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
