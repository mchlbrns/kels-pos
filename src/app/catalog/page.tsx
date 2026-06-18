'use client';

import { useState, useMemo } from 'react';
import { db, type Product } from '@/lib/db';
import { addToSyncQueue } from '@/lib/sync';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Package } from 'lucide-react';
import styles from './Catalog.module.css';

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export default function CatalogPage() {
  const products = useLiveQuery(() => db.products.toArray());
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL');

  const [formData, setFormData] = useState<Partial<Product>>({
    type: 'PRODUCT',
    unit: 'PIECE',
    is_variable: false,
    allow_override: false,
    base_price: 0,
  });

  const handleToggleAdd = () => {
    if (isAdding) {
      setIsAdding(false);
      setEditingId(null);
      setFormData({
        type: 'PRODUCT',
        unit: 'PIECE',
        is_variable: false,
        allow_override: false,
        base_price: 0,
      });
    } else {
      setIsAdding(true);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      type: product.type,
      unit: product.unit,
      base_price: product.base_price,
      is_variable: product.is_variable,
      allow_override: product.allow_override,
      sku_barcode: product.sku_barcode,
    });
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData: Product = {
      id: editingId || crypto.randomUUID(),
      name: formData.name || '',
      type: formData.type || 'PRODUCT',
      unit: formData.unit || 'PIECE',
      base_price: Number(formData.base_price) || 0,
      is_variable: formData.is_variable || false,
      allow_override: formData.allow_override || false,
      sku_barcode: formData.sku_barcode || undefined,
    };

    if (editingId) {
      // Retrieve old product to preserve stock property if it exists
      const existingProduct = await db.products.get(editingId);
      if (existingProduct) {
        productData.stock = existingProduct.stock;
      }
      await db.products.put(productData);
      await addToSyncQueue('PRODUCT', productData);
      alert('Product updated successfully!');
    } else {
      // Set default stock count for new items
      productData.stock = 10;
      await db.products.add(productData);
      await addToSyncQueue('PRODUCT', productData);
      alert('Product added successfully!');
    }

    setIsAdding(false);
    setEditingId(null);
    setFormData({
      type: 'PRODUCT',
      unit: 'PIECE',
      is_variable: false,
      allow_override: false,
      base_price: 0,
    });
  };

  const handleDelete = async () => {
    if (!editingId) return;
    const prod = products?.find(p => p.id === editingId);
    if (prod && confirm(`Are you sure you want to delete ${prod.name}? This cannot be undone.`)) {
      await db.products.delete(editingId);
      alert('Product deleted successfully!');
      setIsAdding(false);
      setEditingId(null);
      setFormData({
        type: 'PRODUCT',
        unit: 'PIECE',
        is_variable: false,
        allow_override: false,
        base_price: 0,
      });
    }
  };

  // Filter products by search term and type
  const filteredProducts = useMemo(() => {
    const list = products || [];
    return list.filter(p => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(term) || 
                            (p.sku_barcode && p.sku_barcode.toLowerCase().includes(term));
      const matchesType = typeFilter === 'ALL' || p.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [products, searchTerm, typeFilter]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.headerTitle}>Product & Service Catalog</h2>
          <span className={styles.countBadge}>{filteredProducts.length} items</span>
        </div>
        <button className="pos-btn pos-btn-primary" onClick={handleToggleAdd}>
          {isAdding ? 'Cancel' : '＋ Add New Item'}
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search products and services..."
            className="pos-input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.filterPills}>
          <button 
            type="button" 
            className={`${styles.pill} ${typeFilter === 'ALL' ? styles.activePill : ''}`}
            onClick={() => setTypeFilter('ALL')}
          >
            All
          </button>
          <button 
            type="button" 
            className={`${styles.pill} ${typeFilter === 'PRODUCT' ? styles.activePill : ''}`}
            onClick={() => setTypeFilter('PRODUCT')}
          >
            Products
          </button>
          <button 
            type="button" 
            className={`${styles.pill} ${typeFilter === 'SERVICE' ? styles.activePill : ''}`}
            onClick={() => setTypeFilter('SERVICE')}
          >
            Services
          </button>
        </div>
      </div>

      {/* Add / Edit Form Overlay */}
      {isAdding && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formHeader}>
            <h3>{editingId ? `Edit: ${formData.name}` : 'Add New Item'}</h3>
            <button type="button" className="pos-btn pos-btn-ghost" style={{ height: '32px', padding: '0 12px' }} onClick={handleToggleAdd}>
              Cancel
            </button>
          </div>
          
          <div className={styles.formGrid}>
            {/* Name */}
            <div className={`${styles.field} ${styles.span2}`}>
              <label>Name</label>
              <input 
                required 
                className="pos-input"
                value={formData.name || ''} 
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>

            {/* Type */}
            <div className={styles.field}>
              <label>Type</label>
              <select 
                className="pos-select"
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value as 'PRODUCT' | 'SERVICE'})}
              >
                <option value="PRODUCT">Product</option>
                <option value="SERVICE">Service</option>
              </select>
            </div>

            {/* Unit */}
            <div className={styles.field}>
              <label>Unit</label>
              <select 
                className="pos-select"
                value={formData.unit} 
                onChange={e => setFormData({...formData, unit: e.target.value as 'PIECE' | 'KG' | 'LITER' | 'HOUR' | 'BUNDLE'})}
              >
                <option value="PIECE">Piece</option>
                <option value="KG">Kilo</option>
                <option value="LITER">Liter</option>
                <option value="HOUR">Hour</option>
                <option value="BUNDLE">Bundle</option>
              </select>
            </div>

            {/* Base Price */}
            <div className={styles.field}>
              <label>Base Price</label>
              <input 
                type="number" 
                step="0.01" 
                required 
                className="pos-input"
                value={formData.base_price} 
                onChange={e => setFormData({...formData, base_price: Number(e.target.value)})}
              />
            </div>

            {/* SKU / Barcode */}
            <div className={styles.field}>
              <label>SKU / Barcode</label>
              <input 
                className="pos-input"
                placeholder="SKU-XXXX"
                value={formData.sku_barcode || ''} 
                onChange={e => setFormData({...formData, sku_barcode: e.target.value})}
              />
            </div>

            {/* Toggles */}
            <div className={styles.checkboxRow}>
              {/* Variable Toggle */}
              <div 
                className={styles.toggleContainer}
                onClick={() => setFormData({...formData, is_variable: !formData.is_variable})}
              >
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={formData.is_variable} 
                    readOnly
                  />
                  <span className={styles.slider}></span>
                </label>
                <span className={styles.toggleLabel}>Variable Quantity/Price?</span>
              </div>

              {/* Override Toggle */}
              <div 
                className={styles.toggleContainer}
                onClick={() => setFormData({...formData, allow_override: !formData.allow_override})}
              >
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={formData.allow_override} 
                    readOnly
                  />
                  <span className={styles.slider}></span>
                </label>
                <span className={styles.toggleLabel}>Allow Price Override?</span>
              </div>
            </div>
          </div>
          
          <div className={styles.buttonGroup}>
            <button type="submit" className="pos-btn pos-btn-success" style={{ flex: 1, height: '44px' }}>
              {editingId ? 'Save Changes' : 'Save to Catalog'}
            </button>
            {editingId && (
              <button type="button" onClick={handleDelete} className="pos-btn pos-btn-danger" style={{ flex: 1, height: '44px' }}>
                Delete Item
              </button>
            )}
          </div>
        </form>
      )}

      {/* Grid List */}
      <div className={styles.grid}>
        {filteredProducts.map(p => (
          <div key={p.id} onClick={() => handleEditClick(p)} className={styles.card} title="Click to edit product">
            <div className={styles.cardTop}>
              <span 
                className="pos-badge"
                style={{
                  backgroundColor: p.type === 'SERVICE' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: p.type === 'SERVICE' ? '#a855f7' : '#3b82f6',
                  borderColor: p.type === 'SERVICE' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(59, 130, 246, 0.3)'
                }}
              >
                {p.type}
              </span>
              <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '18px', fontVariantNumeric: 'tabular-nums' }}>
                {formatPrice(p.base_price)}
              </span>
            </div>
            
            <span className={styles.cardName}>{p.name}</span>
            
            <div className={styles.cardBottom}>
              <span className={styles.unitLabel}>{p.unit}</span>
              {p.sku_barcode && (
                <span className={styles.skuBadge}>SKU: {p.sku_barcode}</span>
              )}
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <div className={styles.emptyState}>
            <Package size={64} style={{ color: 'var(--text-muted)' }} />
            <span className={styles.emptyStateTitle}>No items in catalog yet</span>
            <span className={styles.emptyStateSub}>{"Click 'Add New Item' to get started"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
