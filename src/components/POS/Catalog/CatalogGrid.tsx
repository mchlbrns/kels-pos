'use client';

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product } from '@/lib/db';
import { Package, Tag } from 'lucide-react';

interface CatalogGridProps {
  searchTerm: string;
  onSelectItem: (product: Product) => void;
}

export default function CatalogGrid({ searchTerm, onSelectItem }: CatalogGridProps) {
  const products = useLiveQuery(
    async () => {
      if (!searchTerm) return await db.products.toArray();
      return await db.products
        .where('name')
        .startsWithIgnoreCase(searchTerm)
        .or('sku_barcode')
        .equals(searchTerm)
        .toArray();
    },
    [searchTerm]
  );

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Package size={48} className="mb-2 opacity-20" />
        <p>No products found in catalog.</p>
        <button 
          onClick={() => seedMockData()}
          className="mt-4 text-blue-600 hover:underline"
        >
          Seed Mock Data
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {products.map((product) => (
        <div 
          key={product.id}
          onClick={() => onSelectItem(product)}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${product.type === 'SERVICE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                {product.type}
              </span>
              {product.is_variable && (
                <Tag size={14} className="text-orange-500" />
              )}
            </div>
            <h3 className="font-semibold text-gray-800 line-clamp-2 mb-1">{product.name}</h3>
            <p className="text-xs text-gray-500 uppercase">{product.unit}</p>
          </div>
          <div className="mt-4">
            <span className="text-lg font-bold text-blue-600">
              ${product.base_price.toFixed(2)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Temporary mock data seeder
async function seedMockData() {
  const mockProducts: Product[] = [
    { id: '1', name: 'Premium Coffee Beans', type: 'PRODUCT', unit: 'KG', base_price: 25.00, is_variable: true, allow_override: true, sku_barcode: '1001' },
    { id: '2', name: 'Standard Latte', type: 'PRODUCT', unit: 'PIECE', base_price: 4.50, is_variable: false, allow_override: true, sku_barcode: '1002' },
    { id: '3', name: 'Barista Training', type: 'SERVICE', unit: 'HOUR', base_price: 50.00, is_variable: true, allow_override: true },
    { id: '4', name: 'Gift Bundle', type: 'PRODUCT', unit: 'BUNDLE', base_price: 35.00, is_variable: false, allow_override: false, sku_barcode: '1003' },
    { id: '5', name: 'Fresh Milk', type: 'PRODUCT', unit: 'LITER', base_price: 1.20, is_variable: true, allow_override: true, sku_barcode: '1004' },
  ];
  
  await db.products.bulkPut(mockProducts);
}
