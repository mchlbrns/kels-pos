'use client';

import React from 'react';
import { Trash2, Minus, Plus, ShoppingBag, CreditCard, Pause } from 'lucide-react';
import { type CartItem } from '@/hooks/useCart';

interface CartSidebarProps {
  items: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  total: number;
  onCheckout: () => void;
  onHold: () => void;
  isLoading?: boolean;
}

export default function CartSidebar({ items, onRemove, onUpdateQuantity, total, onCheckout, onHold, isLoading }: CartSidebarProps) {
  return (
    <>
      <div className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <ShoppingBag className="text-blue-600" size={20} />
          <h2 className="font-bold text-lg">Current Order</h2>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button 
              onClick={onHold}
              title="Hold Order"
              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
            >
              <Pause size={20} />
            </button>
          )}
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
            {items.length} Items
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
            <ShoppingBag size={48} className="mb-2" />
            <p>Your cart is empty</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.product_id} className="flex gap-3 group">
              <div className="flex-1">
                <h4 className="font-medium text-sm text-gray-800 leading-tight mb-1">{item.product.name}</h4>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                    <button 
                      onClick={() => onUpdateQuantity(item.product_id, Math.max(0.1, item.quantity - 1))}
                      className="p-1 hover:bg-white rounded transition"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-xs font-bold w-8 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                      className="p-1 hover:bg-white rounded transition"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-bold text-sm text-blue-600">
                    ${(item.price_at_sale * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => onRemove(item.product_id)}
                className="text-gray-300 hover:text-red-500 self-start pt-1 transition"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-6 border-t bg-gray-50">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-500 font-medium">Subtotal</span>
          <span className="text-gray-800 font-medium">${total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center mb-6">
          <span className="text-xl font-bold text-gray-900">Total</span>
          <span className="text-2xl font-black text-blue-600">${total.toFixed(2)}</span>
        </div>
        
        <button 
          onClick={onCheckout}
          disabled={items.length === 0 || isLoading}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-200"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
          ) : (
            <>
              <CreditCard size={20} />
              Checkout
            </>
          )}
        </button>
      </div>
    </>
  );
}
