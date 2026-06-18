'use client';

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product } from '@/lib/db';
import { Package, Tag } from 'lucide-react';
import { addToSyncQueue } from '@/lib/sync';

interface CatalogGridProps {
  searchTerm: string;
  onSelectItem: (product: Product) => void;
  inventoryTrackingEnabled?: boolean;
  currency?: 'PHP' | 'USD';
  lowStockThreshold?: number;
}

export default function CatalogGrid({ 
  searchTerm, 
  onSelectItem, 
  inventoryTrackingEnabled = true,
  currency = 'PHP',
  lowStockThreshold = 5
}: CatalogGridProps) {
  const formatPrice = (amount: number) => {
    const locale = currency === 'USD' ? 'en-US' : 'en-PH';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  };
  const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const isDevMode = viteEnv?.VITE_DEV_MODE === 'true' || process.env.VITE_DEV_MODE === 'true';

  const products = useLiveQuery(
    async () => {
      const allProducts = await db.products.toArray();
      if (!searchTerm) return allProducts;
      const query = searchTerm.toLowerCase();
      return allProducts.filter(p => {
        const nameMatch = p.name.toLowerCase().includes(query);
        const skuMatch = p.sku_barcode ? p.sku_barcode.toLowerCase().includes(query) : false;
        return nameMatch || skuMatch;
      });
    },
    [searchTerm]
  );

  if (!products || products.length === 0) {
    return (
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '48px 24px', 
          backgroundColor: 'var(--bg-surface)', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px dashed var(--border)',
          textAlign: 'center',
          gap: '12px',
          margin: '20px 0'
        }}
      >
        <Package size={56} style={{ color: 'var(--text-muted)', opacity: 0.2 }} />
        <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>No products found in catalog.</span>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', opacity: 0.7 }}>Add items to catalog or seed mock data to get started.</span>
        {isDevMode && (
          <button 
            onClick={() => seedMockData()}
            className="pos-btn pos-btn-ghost"
            style={{ marginTop: '8px' }}
          >
            Seed Mock Data
          </button>
        )}
      </div>
    );
  }

  return (
    <div 
      style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
        gap: '12px' 
      }}
    >
      {products.map((product) => {
        const isOutOfStock = inventoryTrackingEnabled && product.type === 'PRODUCT' && product.stock !== undefined && product.stock === 0;
        const isLowStock = inventoryTrackingEnabled && product.type === 'PRODUCT' && product.stock !== undefined && product.stock <= lowStockThreshold && product.stock > 0;

        return (
          <div 
            key={product.id}
            onClick={() => onSelectItem(product)}
            className="pos-card"
            style={{ 
              padding: '14px', 
              cursor: 'pointer', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px',
              opacity: isOutOfStock ? 0.6 : 1,
              position: 'relative',
              overflow: 'hidden',
              borderColor: isLowStock ? '#f59e0b' : 'var(--border)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.boxShadow = '0 0 0 1px var(--primary), var(--shadow)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = isLowStock ? '#f59e0b' : 'var(--border)';
              e.currentTarget.style.boxShadow = 'var(--shadow)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.97)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
          >
            {/* Out of Stock Overlay */}
            {isOutOfStock && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  backdropFilter: 'blur(1px)'
                }}
              >
                <span
                  style={{
                    backgroundColor: 'var(--danger)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '11px',
                    letterSpacing: '0.05em',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  OUT OF STOCK
                </span>
              </div>
            )}

            {/* Top row with badges */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
              <span 
                className="pos-badge"
                style={{ 
                  backgroundColor: product.type === 'SERVICE' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: product.type === 'SERVICE' ? '#a855f7' : '#3b82f6',
                  borderColor: product.type === 'SERVICE' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(59, 130, 246, 0.3)'
                }}
              >
                {product.type}
              </span>
              
              {product.is_variable && (
                <span 
                  className="pos-badge pos-badge-warning"
                  style={{ gap: '3px' }}
                >
                  <Tag size={10} />
                  VAR
                </span>
              )}

              {inventoryTrackingEnabled && product.type === 'PRODUCT' && product.stock !== undefined && (
                <span 
                  className="pos-badge"
                  style={{ 
                    backgroundColor: isOutOfStock ? 'rgba(239, 68, 68, 0.15)' : isLowStock ? 'rgba(245, 158, 11, 0.15)' : 'rgba(71, 85, 105, 0.15)',
                    color: isOutOfStock ? '#ef4444' : isLowStock ? '#f59e0b' : 'var(--text-secondary)',
                    borderColor: isOutOfStock ? 'rgba(239, 68, 68, 0.3)' : isLowStock ? 'rgba(245, 158, 11, 0.3)' : 'rgba(71, 85, 105, 0.3)'
                  }}
                >
                  Stock: {product.stock}
                </span>
              )}
            </div>

            {/* Middle row: Name */}
            <h3 
              style={{ 
                color: 'white', 
                fontWeight: 600, 
                fontSize: '15px', 
                lineHeight: 1.3, 
                height: '40px', 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                zIndex: 1
              }}
            >
              {product.name}
            </h3>

            {/* Bottom Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', zIndex: 1 }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }}>
                {product.unit}
              </span>
              <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '18px', fontVariantNumeric: 'tabular-nums' }}>
                {formatPrice(product.base_price)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

async function seedMockData() {
  const mockProducts: Product[] = [
    { id: '1', name: 'Premium Coffee Beans', type: 'PRODUCT', unit: 'KG', base_price: 25.00, is_variable: true, allow_override: true, sku_barcode: '1001', stock: 45 },
    { id: '2', name: 'Standard Latte', type: 'PRODUCT', unit: 'PIECE', base_price: 4.50, is_variable: false, allow_override: true, sku_barcode: '1002', stock: 120 },
    { id: '3', name: 'Barista Training', type: 'SERVICE', unit: 'HOUR', base_price: 50.00, is_variable: true, allow_override: true, stock: 999 },
    { id: '4', name: 'Gift Bundle', type: 'PRODUCT', unit: 'BUNDLE', base_price: 35.00, is_variable: false, allow_override: false, sku_barcode: '1003', stock: 12 },
    { id: '5', name: 'Fresh Milk', type: 'PRODUCT', unit: 'LITER', base_price: 1.20, is_variable: true, allow_override: true, sku_barcode: '1004', stock: 8 },
  ];
  
  await db.products.bulkPut(mockProducts);
  for (const product of mockProducts) {
    await addToSyncQueue('PRODUCT', product);
  }
}
