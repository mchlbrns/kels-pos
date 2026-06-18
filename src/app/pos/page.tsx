'use client';

import React from 'react';
import { PlusCircle, Search, Barcode, ShoppingCart, History, Play, Pause, X } from 'lucide-react';
import CatalogGrid from '@/components/POS/Catalog/CatalogGrid';
import CartSidebar from '@/components/POS/Cart/CartSidebar';
import BarcodeScanner from '@/components/POS/Scanner/BarcodeScanner';
import { useCart } from '@/hooks/useCart';

import { db, type Order } from '@/lib/db';
import { addToSyncQueue } from '@/lib/sync';
import { v4 as uuidv4 } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';

import CustomerSelector from '@/components/CustomerSelector/CustomerSelector';
import { type Customer } from '@/lib/db';

export default function POSPage() {
  const { items, addItem, removeItem, updateQuantity, total, clearCart } = useCart();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [isRecallOpen, setIsRecallOpen] = React.useState(false);
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);

  const heldOrders = useLiveQuery(() => 
    db.orders.where('status').equals('HELD').toArray()
  );

  const handleScan = async (barcode: string) => {
    const product = await db.products.where('sku_barcode').equals(barcode).first();
    if (product) {
      addItem(product);
      setIsScannerOpen(false);
    } else {
      alert(`Product with barcode ${barcode} not found.`);
    }
  };

  const handleHold = async () => {
    if (items.length === 0) return;
    try {
      const orderId = uuidv4();
      const localId = `HOLD-${Date.now()}`;
      
      const heldOrder: Order = {
        id: orderId,
        local_id: localId,
        customer_id: selectedCustomer?.id || undefined,
        total: total,
        status: 'HELD',
        payment_type: 'CASH',
        created_at: Date.now(),
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_sale: item.price_at_sale,
          unit: item.unit
        })),
        sync_status: 'PENDING'
      };

      await db.orders.add(heldOrder);
      clearCart();
      setSelectedCustomer(null);
      alert('Order put on hold.');
    } catch (error) {
      console.error('Hold failed:', error);
    }
  };

  const recallOrder = async (order: Order) => {
    clearCart();
    
    for (const item of order.items) {
      const product = await db.products.get(item.product_id);
      if (product) {
        addItem(product, item.quantity, item.price_at_sale);
      }
    }
    
    if (order.customer_id) {
      const customer = await db.customers.get(order.customer_id);
      if (customer) setSelectedCustomer(customer);
    }

    await db.orders.delete(order.id);
    setIsRecallOpen(false);
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    
    setIsProcessing(true);
    try {
      const orderId = uuidv4();
      const localId = `LOC-${Date.now()}`;
      
      const newOrder: Order = {
        id: orderId,
        local_id: localId,
        customer_id: selectedCustomer?.id || undefined,
        total: total,
        status: 'COMPLETED',
        payment_type: 'CASH',
        created_at: Date.now(),
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_sale: item.price_at_sale,
          unit: item.unit
        })),
        sync_status: 'PENDING'
      };

      // 1. Save to local orders table
      await db.orders.add(newOrder);

      // 2. Update customer points and visits if selected
      if (selectedCustomer) {
        const earnedPoints = Math.floor(total); // 1 point per $1
        const updatedCustomer = {
          ...selectedCustomer,
          points: selectedCustomer.points + earnedPoints,
          total_visits: (selectedCustomer.total_visits || 0) + 1
        };
        
        await db.customers.put(updatedCustomer);
        await addToSyncQueue('CUSTOMER', updatedCustomer);
      }

      // 3. Add order to sync queue
      await addToSyncQueue('ORDER', newOrder);

      // 4. Success! Clear cart and customer
      alert(`Order completed! ${selectedCustomer ? `Points added: ${Math.floor(total)}` : ''}`);
      clearCart();
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Failed to process order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top Bar */}
      <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search items or scan barcode..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-blue-600"
          >
            <Barcode size={24} />
          </button>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsRecallOpen(true)}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 px-3 py-2 rounded-lg transition relative"
          >
            <History size={20} />
            <span className="font-medium">Recall</span>
            {heldOrders && heldOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {heldOrders.length}
              </span>
            )}
          </button>

          <CustomerSelector 
            selectedCustomer={selectedCustomer} 
            onSelect={setSelectedCustomer} 
          />
          
          <button 
            onClick={() => {
              clearCart();
              setSelectedCustomer(null);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <PlusCircle size={20} />
            <span className="font-semibold">New Order</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Catalog Section */}
        <div className="flex-1 overflow-y-auto p-6">
          <CatalogGrid 
            searchTerm={searchTerm} 
            onSelectItem={(product) => addItem(product)} 
          />
        </div>

        {/* Cart Sidebar */}
        <div className="w-96 bg-white border-l flex flex-col shadow-xl">
          <CartSidebar 
            items={items}
            onRemove={removeItem}
            onUpdateQuantity={updateQuantity}
            total={total}
            onCheckout={handleCheckout}
            onHold={handleHold}
            isLoading={isProcessing}
          />
        </div>
      </div>

      {/* Recall Modal */}
      {isRecallOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <History className="text-blue-600" />
                <h2 className="text-xl font-bold text-gray-800">Recall Held Orders</h2>
              </div>
              <button onClick={() => setIsRecallOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {heldOrders?.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Pause size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No orders currently on hold.</p>
                </div>
              ) : (
                heldOrders?.map((order: Order) => (
                  <div key={order.id} className="p-4 border rounded-xl hover:border-blue-300 hover:bg-blue-50 transition flex items-center justify-between group">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-800">{order.local_id}</span>
                        <span className="text-xs text-gray-500">• {new Date(order.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {order.items.length} items • <span className="font-semibold text-blue-600">${order.total.toFixed(2)}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => recallOrder(order)}
                      className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-600 hover:text-white transition"
                    >
                      <Play size={16} fill="currentColor" />
                      Recall
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scanner Overlay */}
      {isScannerOpen && (
        <BarcodeScanner 
          onScan={handleScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
}
