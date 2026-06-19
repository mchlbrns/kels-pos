'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { type Product, type Customer, type OrderItem } from '@/lib/db';

export interface CartItem extends OrderItem {
  id: string; // unique identifier in the cart
  product: Product;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, priceOverride?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  selectedCustomer: Customer | null;
  setSelectedCustomer: React.Dispatch<React.SetStateAction<Customer | null>>;
  discount: number;
  setDiscount: React.Dispatch<React.SetStateAction<number>>;
  discountType: 'percentage' | 'flat';
  setDiscountType: React.Dispatch<React.SetStateAction<'percentage' | 'flat'>>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');

  const addItem = useCallback((product: Product, quantity: number = 1, priceOverride?: number) => {
    setItems(current => {
      const targetPrice = priceOverride !== undefined ? priceOverride : product.base_price;
      
      // Look for a matching cart item of the same product with the same price that can be combined.
      // We only combine if it is a standard (non-variable) product AND has no custom price override.
      const existingIndex = current.findIndex(item => 
        item.product_id === product.id && 
        !product.is_variable && 
        item.price_at_sale === targetPrice
      );
      
      if (existingIndex > -1) {
        return current.map((item, idx) => 
          idx === existingIndex 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      
      return [...current, {
        id: uuidv4(),
        product_id: product.id,
        product: product,
        quantity: quantity,
        price_at_sale: targetPrice,
        unit: product.unit
      }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(current => current.filter(item => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(current => current.filter(item => item.id !== id));
    } else {
      setItems(current => 
        current.map(item => 
          item.id === id ? { ...item, quantity } : item
        )
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setDiscountType('percentage');
  }, []);

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.price_at_sale * item.quantity), 0);
  }, [items]);

  const value = useMemo(() => ({
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    selectedCustomer,
    setSelectedCustomer,
    discount,
    setDiscount,
    discountType,
    setDiscountType
  }), [
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    selectedCustomer,
    discount,
    discountType
  ]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
}
