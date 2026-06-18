'use client';

import { useState, useCallback, useMemo } from 'react';
import { type Product, type OrderItem } from '@/lib/db';

export interface CartItem extends OrderItem {
  product: Product;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Product, quantity: number = 1, priceOverride?: number) => {
    setItems(current => {
      const existing = current.find(item => item.product_id === product.id);
      if (existing && !product.is_variable) {
        return current.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...current, {
        product_id: product.id,
        product: product,
        quantity: quantity,
        price_at_sale: priceOverride ?? product.base_price,
        unit: product.unit
      }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(current => current.filter(item => item.product_id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems(current => 
      current.map(item => 
        item.product_id === productId ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.price_at_sale * item.quantity), 0);
  }, [items]);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total
  };
}
