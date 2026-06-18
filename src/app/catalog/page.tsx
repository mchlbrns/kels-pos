'use client';

import { useState } from 'react';
import { db, type Product } from '@/lib/db';
import { addToSyncQueue } from '@/lib/sync';
import { useLiveQuery } from 'dexie-react-hooks';
import styles from './Catalog.module.css';

export default function CatalogPage() {
  const products = useLiveQuery(() => db.products.toArray());
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    type: 'PRODUCT',
    unit: 'PIECE',
    is_variable: false,
    allow_override: false,
    base_price: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newProduct: Product = {
      id: crypto.randomUUID(),
      name: formData.name || '',
      type: formData.type || 'PRODUCT',
      unit: formData.unit || 'PIECE',
      base_price: Number(formData.base_price) || 0,
      is_variable: formData.is_variable || false,
      allow_override: formData.allow_override || false,
      sku_barcode: formData.sku_barcode,
    };

    await db.products.add(newProduct);
    await addToSyncQueue('PRODUCT', newProduct);
    setIsAdding(false);
    setFormData({
      type: 'PRODUCT',
      unit: 'PIECE',
      is_variable: false,
      allow_override: false,
      base_price: 0,
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Product & Service Catalog</h2>
        <button className={styles.addButton} onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : 'Add New Item'}
        </button>
      </div>

      {isAdding && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Name</label>
            <input 
              required 
              value={formData.name || ''} 
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Type</label>
              <select 
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value as any})}
              >
                <option value="PRODUCT">Product</option>
                <option value="SERVICE">Service</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Unit</label>
              <select 
                value={formData.unit} 
                onChange={e => setFormData({...formData, unit: e.target.value as any})}
              >
                <option value="PIECE">Piece</option>
                <option value="KG">Kilo</option>
                <option value="LITER">Liter</option>
                <option value="HOUR">Hour</option>
                <option value="BUNDLE">Bundle</option>
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <label>Base Price</label>
            <input 
              type="number" 
              step="0.01" 
              required 
              value={formData.base_price} 
              onChange={e => setFormData({...formData, base_price: Number(e.target.value)})}
            />
          </div>
          <div className={styles.field}>
            <label>SKU / Barcode</label>
            <input 
              value={formData.sku_barcode || ''} 
              onChange={e => setFormData({...formData, sku_barcode: e.target.value})}
            />
          </div>
          <div className={styles.checkboxGroup}>
            <label>
              <input 
                type="checkbox" 
                checked={formData.is_variable} 
                onChange={e => setFormData({...formData, is_variable: e.target.checked})}
              />
              Variable Quantity/Price?
            </label>
            <label>
              <input 
                type="checkbox" 
                checked={formData.allow_override} 
                onChange={e => setFormData({...formData, allow_override: e.target.checked})}
              />
              Allow Price Override?
            </label>
          </div>
          <button type="submit" className={styles.submitButton}>Save to Catalog</button>
        </form>
      )}

      <div className={styles.list}>
        {products?.map(p => (
          <div key={p.id} className={styles.item}>
            <div className={styles.itemInfo}>
              <strong>{p.name}</strong>
              <span>{p.type} - {p.unit}</span>
            </div>
            <div className={styles.itemPrice}>
              ${p.base_price.toFixed(2)}
            </div>
          </div>
        ))}
        {products?.length === 0 && <p>No items in catalog yet.</p>}
      </div>
    </div>
  );
}
