'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Search, Barcode, History, Play, Pause, X, Settings, 
  CreditCard, AlertTriangle, Plus, User, Trash2 
} from 'lucide-react';
import CatalogGrid from '@/components/POS/Catalog/CatalogGrid';
import CartSidebar from '@/components/POS/Cart/CartSidebar';
import BarcodeScanner from '@/components/POS/Scanner/BarcodeScanner';
import { useCart } from '@/hooks/useCart';
import PinModal from '@/components/PinModal/PinModal';
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal';

import { db, type Order, type Product, type Customer } from '@/lib/db';
import { addToSyncQueue } from '@/lib/sync';
import { v4 as uuidv4 } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/context/AuthContext';
import { useToasts } from '@/context/ToastContext';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import CustomerSelector from '@/components/CustomerSelector/CustomerSelector';

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export default function POSPage() {
  const { items, addItem, removeItem, updateQuantity, total, clearCart } = useCart();
  const { session, logout } = useAuth();
  const role = session?.role;
  const { showToast } = useToasts();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMobilePanel, setActiveMobilePanel] = useState<'products' | 'cart'>('products');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // Custom Settings (persisted to localStorage)
  const [taxRate, setTaxRate] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedTaxRate = localStorage.getItem('pos_tax_rate');
      return savedTaxRate ? Number(savedTaxRate) : 8.25;
    }
    return 8.25;
  });
  
  const [inventoryTrackingEnabled, setInventoryTrackingEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedTracking = localStorage.getItem('pos_inventory_tracking');
      return savedTracking !== null ? savedTracking === 'true' : true;
    }
    return true;
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Discount states
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');

  // Checkout Modal states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'SPLIT'>('CASH');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [splitCashAmount, setSplitCashAmount] = useState<string>('');
  const [splitCardAmount, setSplitCardAmount] = useState<string>('');
  const [needsManagerPinForCheckout, setNeedsManagerPinForCheckout] = useState(false);
  
  // New Order / Hold prompt
  const [showNewOrderPrompt, setShowNewOrderPrompt] = useState(false);
  const [pendingLogoutAfterCartChoice, setPendingLogoutAfterCartChoice] = useState(false);

  // Success / Receipt Screen state
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Variable Product Modal states
  const [selectedVarProduct, setSelectedVarProduct] = useState<Product | null>(null);
  const [overrideQty, setOverrideQty] = useState<string>('1');
  const [overridePrice, setOverridePrice] = useState<string>('');
  const [variableProductError, setVariableProductError] = useState('');

  // Manager Override Stock states
  const [overrideStockProduct, setOverrideStockProduct] = useState<Product | null>(null);
  const [needsManagerPinForStock, setNeedsManagerPinForStock] = useState(false);
  const [heldOrderToDelete, setHeldOrderToDelete] = useState<Order | null>(null);

  // Focus traps for modals/drawers
  const checkoutTrapRef = useFocusTrap(isCheckoutOpen);
  const varProductTrapRef = useFocusTrap(!!selectedVarProduct);
  const newOrderTrapRef = useFocusTrap(showNewOrderPrompt);
  const recallTrapRef = useFocusTrap(isRecallOpen);

  const addProductToCart = (product: Product) => {
    if (product.is_variable) {
      setSelectedVarProduct(product);
      setOverrideQty('1');
      setOverridePrice(product.base_price.toString());
      setVariableProductError('');
    } else {
      addItem(product);
      setActiveMobilePanel('cart');
    }
  };

  const handleSelectItem = (product: Product) => {
    const isOutOfStock = inventoryTrackingEnabled && product.type === 'PRODUCT' && product.stock !== undefined && product.stock === 0;
    
    if (isOutOfStock) {
      if (role === 'MANAGER') {
        if (confirm(`${product.name} is out of stock. Add to cart anyway?`)) {
          addProductToCart(product);
        }
      } else {
        setOverrideStockProduct(product);
        setNeedsManagerPinForStock(true);
      }
      return;
    }

    addProductToCart(product);
  };


  // Load settings on mount
  useEffect(() => {
    // Auto-seed database if no products exist
    const checkAndSeed = async () => {
      const count = await db.products.count();
      if (count === 0) {
        const mockProducts: Product[] = [
          { id: '1', name: 'Premium Coffee Beans', type: 'PRODUCT', unit: 'KG', base_price: 25.00, is_variable: true, allow_override: true, sku_barcode: '1001', stock: 45 },
          { id: '2', name: 'Standard Latte', type: 'PRODUCT', unit: 'PIECE', base_price: 4.50, is_variable: false, allow_override: true, sku_barcode: '1002', stock: 120 },
          { id: '3', name: 'Barista Training', type: 'SERVICE', unit: 'HOUR', base_price: 50.00, is_variable: true, allow_override: true, stock: 999 },
          { id: '4', name: 'Gift Bundle', type: 'PRODUCT', unit: 'BUNDLE', base_price: 35.00, is_variable: false, allow_override: false, sku_barcode: '1003', stock: 12 },
          { id: '5', name: 'Fresh Milk', type: 'PRODUCT', unit: 'LITER', base_price: 1.20, is_variable: true, allow_override: true, sku_barcode: '1004', stock: 8 },
        ];
        await db.products.bulkPut(mockProducts);
      }
    };
    checkAndSeed();

    // Listen to settings gear clicks from Header
    const handleOpenSettings = () => {
      if (session?.role === 'MANAGER') {
        setIsSettingsOpen(true);
      } else {
        showToast('Access denied. Manager role required.', 'ERROR');
      }
    };
    window.addEventListener('open-pos-settings', handleOpenSettings);
    return () => window.removeEventListener('open-pos-settings', handleOpenSettings);
  }, [session, showToast]);

  useEffect(() => {
    const handleLogoutRequest = (event: Event) => {
      if (items.length === 0) return;

      event.preventDefault();
      setPendingLogoutAfterCartChoice(true);
      setShowNewOrderPrompt(true);
    };

    window.addEventListener('request-pos-logout', handleLogoutRequest);
    return () => window.removeEventListener('request-pos-logout', handleLogoutRequest);
  }, [items.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (completedOrder) {
          setCompletedOrder(null);
        } else if (isCheckoutOpen) {
          setIsCheckoutOpen(false);
        } else if (isRecallOpen) {
          setIsRecallOpen(false);
        } else if (selectedVarProduct) {
          setSelectedVarProduct(null);
        } else if (showNewOrderPrompt) {
          setShowNewOrderPrompt(false);
          setPendingLogoutAfterCartChoice(false);
        } else if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (needsManagerPinForCheckout) {
          setNeedsManagerPinForCheckout(false);
        } else if (needsManagerPinForStock) {
          setNeedsManagerPinForStock(false);
          setOverrideStockProduct(null);
        } else if (heldOrderToDelete) {
          setHeldOrderToDelete(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    completedOrder,
    isCheckoutOpen,
    isRecallOpen,
    selectedVarProduct,
    showNewOrderPrompt,
    isSettingsOpen,
    needsManagerPinForCheckout,
    needsManagerPinForStock,
    heldOrderToDelete
  ]);


  // Query live held orders
  const heldOrders = useLiveQuery(() => 
    db.orders.where('status').equals('HELD').toArray()
  );

  // Query live products for real-time search dropdown
  const searchDropdownResults = useLiveQuery(async () => {
    if (!searchTerm.trim()) return [];
    const allProducts = await db.products.toArray();
    const query = searchTerm.toLowerCase();
    return allProducts
      .filter(p => {
        const nameMatch = p.name.toLowerCase().includes(query);
        const skuMatch = p.sku_barcode ? p.sku_barcode.toLowerCase().includes(query) : false;
        return nameMatch || skuMatch;
      })
      .slice(0, 8);
  }, [searchTerm]);


  // Calculations
  const subtotal = total;
  const discountAmount = useMemo(() => {
    if (discountType === 'percentage') {
      const pct = Math.min(100, Math.max(0, discount));
      return subtotal * (pct / 100);
    }
    return Math.min(subtotal, Math.max(0, discount));
  }, [subtotal, discount, discountType]);

  const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = useMemo(() => {
    return subtotalAfterDiscount * (taxRate / 100);
  }, [subtotalAfterDiscount, taxRate]);

  const finalTotal = subtotalAfterDiscount + taxAmount;
  const grandTotal = useMemo(() => parseFloat(finalTotal.toFixed(2)), [finalTotal]);

  const isDiscountInvalid = useMemo(() => {
    return (discountType === 'percentage' && discount > 100) || (discountType === 'flat' && discount > subtotal);
  }, [discount, discountType, subtotal]);

  // Change computation for Cash
  const changeDue = useMemo(() => {
    const tendered = Number(amountTendered) || 0;
    if (tendered <= grandTotal) return 0;
    return parseFloat((tendered - grandTotal).toFixed(2));
  }, [amountTendered, grandTotal]);

  const handleScan = async (barcode: string) => {
    const product = await db.products.where('sku_barcode').equals(barcode).first();
    if (product) {
      const isOutOfStock = inventoryTrackingEnabled && product.type === 'PRODUCT' && product.stock !== undefined && product.stock === 0;
      if (isOutOfStock) {
        if (role === 'MANAGER') {
          if (confirm(`${product.name} is out of stock. Add to cart anyway?`)) {
            addProductToCart(product);
            showToast(`Scanned (Override): ${product.name}`, 'SUCCESS');
          }
        } else {
          setOverrideStockProduct(product);
          setNeedsManagerPinForStock(true);
        }
      } else {
        addProductToCart(product);
        setIsScannerOpen(false);
        showToast(`Scanned: ${product.name}`, 'SUCCESS');
      }
    } else {
      showToast(`No product found for barcode: ${barcode}`, 'ERROR');
    }
  };

  const handleHold = async () => {
    if (items.length === 0) {
      showToast('Cannot hold an empty order.', 'WARNING');
      return;
    }
    try {
      const orderId = uuidv4();
      const localId = `HOLD-${Date.now()}`;
      
      const heldOrder: Order = {
        id: orderId,
        local_id: localId,
        customer_id: selectedCustomer?.id || undefined,
        total: grandTotal,
        status: 'HELD',
        payment_type: 'CASH',
        created_at: Date.now(),
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_sale: item.price_at_sale,
          unit: item.unit
        })),
        sync_status: 'PENDING',
        discount: discountAmount,
        tax: taxAmount,
        cashier: session?.name || 'STAFF'
      };

      await db.orders.add(heldOrder);
      clearCart();
      setSelectedCustomer(null);
      setDiscount(0);
      showToast('Order put on hold.', 'SUCCESS');
    } catch (error) {
      console.error('Hold failed:', error);
      showToast('Failed to put order on hold.', 'ERROR');
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

    if (order.discount) {
      setDiscount(order.discount);
      setDiscountType('flat');
    }

    await db.orders.delete(order.id);
    setIsRecallOpen(false);
    showToast(`Recalled order: ${order.local_id}`, 'SUCCESS');
  };

  const deleteHeldOrder = async (orderId: string) => {
    const order = await db.orders.get(orderId);
    if (order) {
      setHeldOrderToDelete(order);
    }
  };

  // Open checkout payment modal
  const openCheckoutModal = () => {
    setAmountTendered(grandTotal.toFixed(2));
    setSplitCashAmount((grandTotal / 2).toFixed(2));
    setSplitCardAmount((grandTotal / 2).toFixed(2));
    setPaymentMethod('CASH');
    setIsCheckoutOpen(true);
  };

  const handleOpenCheckout = () => {
    if (items.length === 0) {
      showToast('Please add items to the order before checking out.', 'WARNING');
      return;
    }

    if (isDiscountInvalid) {
      showToast('Discount cannot exceed the order total.', 'ERROR');
      return;
    }

    if (grandTotal === 0) {
      setNeedsManagerPinForCheckout(true);
      return;
    }

    openCheckoutModal();
  };


  // Confirm payment & process order save
  const handleProcessCheckout = async () => {
    setIsProcessing(true);
    try {
      const orderId = uuidv4();
      const localId = `LOC-${Date.now()}`;

      // Validation
      if (paymentMethod === 'CASH') {
        const tendered = Number(amountTendered) || 0;
        if (tendered < grandTotal) {
          alert('Tendered amount must be at least the total amount due.');
          setIsProcessing(false);
          return;
        }
      } else if (paymentMethod === 'SPLIT') {
        const cashAmt = Number(splitCashAmount) || 0;
        const cardAmt = Number(splitCardAmount) || 0;
        if (Math.abs((cashAmt + cardAmt) - grandTotal) > 0.01) {
          alert(`Split amounts ($${(cashAmt + cardAmt).toFixed(2)}) must equal the total ($${grandTotal.toFixed(2)}).`);
          setIsProcessing(false);
          return;
        }
      }
      
      const newOrder: Order = {
        id: orderId,
        local_id: localId,
        customer_id: selectedCustomer?.id || undefined,
        total: grandTotal,
        status: 'COMPLETED',
        payment_type: paymentMethod,
        created_at: Date.now(),
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_sale: item.price_at_sale,
          unit: item.unit
        })),
        sync_status: 'PENDING',
        discount: discountAmount,
        tax: taxAmount,
        cashier: session?.name || 'STAFF'
      };

      // 1. Decr stock in Dexie if inventory tracking is enabled
      if (inventoryTrackingEnabled) {
        for (const item of items) {
          const product = await db.products.get(item.product_id);
          if (product && product.stock !== undefined && product.type === 'PRODUCT') {
            await db.products.update(item.product_id, {
              stock: Math.max(0, product.stock - item.quantity)
            });
          }
        }
      }

      // 2. Save to local orders table
      await db.orders.add(newOrder);

      // 3. Update customer points and visits if selected
      let updatedCust: Customer | null = null;
      if (selectedCustomer) {
        const earnedPoints = Math.floor(grandTotal); // 1 point per $1
        updatedCust = {
          ...selectedCustomer,
          points: selectedCustomer.points + earnedPoints,
          total_visits: (selectedCustomer.total_visits || 0) + 1
        };
        
        await db.customers.put(updatedCust);
        await addToSyncQueue('CUSTOMER', updatedCust);
      }

      // 4. Add order to sync queue
      await addToSyncQueue('ORDER', newOrder);

      // 5. Open Success / Receipt Modal
      setCompletedOrder({
        ...newOrder,
        customer_id: selectedCustomer ? selectedCustomer.name : undefined // hijack ID for displaying name on receipt easily
      });

      setIsCheckoutOpen(false);
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Failed to process order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewOrderClick = () => {
    if (items.length > 0) {
      setShowNewOrderPrompt(true);
    } else {
      clearCart();
      setSelectedCustomer(null);
      setDiscount(0);
    }
  };

  const handleNewOrderConfirmHold = async () => {
    await handleHold();
    setShowNewOrderPrompt(false);
    if (pendingLogoutAfterCartChoice) {
      setPendingLogoutAfterCartChoice(false);
      logout();
    }
  };

  const handleNewOrderConfirmDiscard = () => {
    clearCart();
    setSelectedCustomer(null);
    setDiscount(0);
    setShowNewOrderPrompt(false);
    if (pendingLogoutAfterCartChoice) {
      setPendingLogoutAfterCartChoice(false);
      logout();
      return;
    }
    showToast('Current sale discarded.', 'INFO');
  };

  const handleSaveSettings = (rate: number, tracking: boolean) => {
    setTaxRate(rate);
    setInventoryTrackingEnabled(tracking);
    localStorage.setItem('pos_tax_rate', rate.toString());
    localStorage.setItem('pos_inventory_tracking', tracking.toString());
    setIsSettingsOpen(false);
    showToast('Configurations saved.', 'SUCCESS');
  };


  const getQuickCashOptions = (tot: number) => {
    const options = [tot];
    const next5 = Math.ceil(tot / 5) * 5;
    if (next5 > tot && !options.includes(next5)) options.push(next5);
    const next10 = Math.ceil(tot / 10) * 10;
    if (next10 > tot && !options.includes(next10)) options.push(next10);
    const next20 = Math.ceil(tot / 20) * 20;
    if (next20 > tot && !options.includes(next20)) options.push(next20);
    const bills = [5, 10, 20, 50, 100];
    for (const b of bills) {
      if (b >= tot && !options.includes(b)) options.push(b);
    }
    return options.sort((a, b) => a - b).slice(0, 5);
  };

  // Split balance calculations
  const splitCashNum = Number(splitCashAmount) || 0;
  const splitCardNum = Number(splitCardAmount) || 0;
  const splitRemaining = finalTotal - (splitCashNum + splitCardNum);
  const isSplitBalanced = Math.abs(splitRemaining) < 0.01;

  return (
    <div className="pos-layout" style={{ display: 'flex', flex: 1, height: '100dvh', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
      <div className="pos-mobile-toggle" role="tablist" aria-label="POS panel">
        <button
          type="button"
          className={activeMobilePanel === 'products' ? 'active' : ''}
          onClick={() => setActiveMobilePanel('products')}
        >
          Products
        </button>
        <button
          type="button"
          className={activeMobilePanel === 'cart' ? 'active' : ''}
          onClick={() => setActiveMobilePanel('cart')}
        >
          Cart ({items.length})
        </button>
      </div>
      {/* LEFT PANEL: Product Browser (60%) */}
      <div 
        className={`pos-products-panel ${activeMobilePanel === 'products' ? 'is-mobile-active' : ''}`}
        style={{ 
          flex: '0 0 60%', 
          backgroundColor: 'var(--bg-base)', 
          padding: '16px', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px' 
        }}
      >
        {/* TOP TOOLBAR ROW */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search 
              size={18} 
              style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} 
            />
             <input 
              type="text" 
              placeholder="Search items or scan barcode..."
              className="pos-input"
              style={{ width: '100%', paddingLeft: '38px', paddingRight: searchTerm ? '38px' : '12px', height: '40px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '50%'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <X size={16} />
              </button>
            )}

            {/* Real-time search dropdown */}
            {searchTerm.trim() !== '' && searchDropdownResults && (
              <div 
                style={{ 
                  position: 'absolute', 
                  left: 0, 
                  right: 0, 
                  top: '44px',
                  backgroundColor: 'var(--bg-surface)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius-md)', 
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)', 
                  zIndex: 50, 
                  maxHeight: '280px', 
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {searchDropdownResults.length === 0 ? (
                  <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    No items match your query.
                  </div>
                ) : (
                  searchDropdownResults.map((product) => (
                    <div 
                      key={product.id}
                      onClick={() => {
                        handleSelectItem(product);
                        setSearchTerm('');
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        borderBottom: '1px solid var(--border)', 
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background 150ms'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'white', display: 'block' }}>{product.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {product.type} • {product.unit} {product.sku_barcode ? `(SKU: ${product.sku_barcode})` : ''}
                        </span>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatPrice(product.base_price)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Barcode scanner trigger */}
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="pos-btn-icon"
            title="Scan Barcode"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Barcode size={20} />
          </button>

          {/* Recall Button with absolute overlay badge */}
          <button 
            onClick={() => setIsRecallOpen(true)}
            className="pos-btn-icon"
            title="Recall Held Orders"
            style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <History size={20} />
            {heldOrders && heldOrders.length > 0 && (
              <span 
                style={{ 
                  position: 'absolute', 
                  top: '-4px', 
                  right: '-4px', 
                  backgroundColor: 'var(--primary)', 
                  color: 'white', 
                  minWidth: '18px', 
                  height: '18px', 
                  borderRadius: '999px', 
                  fontSize: '10px', 
                  fontWeight: 700, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
              >
                {heldOrders.length}
              </span>
            )}
          </button>
        </div>

        {/* CUSTOMER BAR */}
        <div style={{ width: '100%' }}>
          <CustomerSelector 
            selectedCustomer={selectedCustomer} 
            onSelect={setSelectedCustomer} 
          />
        </div>

        {/* NEW SALE BUTTON */}
        <button 
          onClick={handleNewOrderClick}
          className="pos-btn pos-btn-ghost"
          style={{ width: '100%', height: '38px', borderColor: 'var(--primary)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Plus size={16} />
          New Sale
        </button>

        {/* PRODUCT GRID */}
        <div style={{ flex: 1, marginTop: '4px' }}>
          <CatalogGrid 
            searchTerm={searchTerm} 
            onSelectItem={handleSelectItem} 
            inventoryTrackingEnabled={inventoryTrackingEnabled}
          />
        </div>
      </div>

      {/* RIGHT PANEL: Cart (40%) */}
      <div 
        className={`pos-cart-panel ${activeMobilePanel === 'cart' ? 'is-mobile-active' : ''}`}
        style={{ 
          flex: '0 0 40%', 
          backgroundColor: 'var(--bg-surface)', 
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}
      >
        <CartSidebar 
          items={items}
          onRemove={removeItem}
          onUpdateQuantity={updateQuantity}
          subtotal={subtotal}
          taxRate={taxRate}
          discount={discount}
          discountType={discountType}
          onUpdateDiscount={setDiscount}
          onUpdateDiscountType={setDiscountType}
          taxAmount={taxAmount}
          discountAmount={discountAmount}
          total={finalTotal}
          onCheckout={handleOpenCheckout}
          onHold={handleHold}
          isLoading={isProcessing}
          selectedCustomer={selectedCustomer}
        />
      </div>

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <SettingsModal 
          currentTaxRate={taxRate}
          currentTracking={inventoryTrackingEnabled}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* VARIABLE PRODUCT SELECTOR MODAL */}
      {selectedVarProduct && (
        <div 
          ref={varProductTrapRef}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(0,0,0,0.6)', 
            zIndex: 50, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            backdropFilter: 'blur(4px)' 
          }}
        >
          <div 
            className="pos-card animate-in scale-in duration-200"
            style={{ 
              width: '400px', 
              maxWidth: '90vw', 
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden' 
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Adjust Variable Product</span>
              <button 
                onClick={() => {
                  setSelectedVarProduct(null);
                  setVariableProductError('');
                }}
                className="pos-btn-icon"
                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Product Name</span>
                <span style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>{selectedVarProduct.name}</span>
              </div>

              {/* Quantity field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Quantity ({selectedVarProduct.unit})
                </label>
                <input 
                  type="number"
                  step={selectedVarProduct.unit === 'KG' || selectedVarProduct.unit === 'LITER' ? '0.001' : '1'}
                  min="1"
                  className="pos-input"
                  style={{ fontSize: '18px', fontWeight: 600, height: '44px' }}
                  value={overrideQty}
                  onChange={(e) => {
                    setOverrideQty(e.target.value);
                    setVariableProductError('');
                  }}
                />
              </div>

              {/* Price Override field */}
              {selectedVarProduct.allow_override && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Price Override (per {selectedVarProduct.unit})
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    className="pos-input"
                    style={{ fontSize: '18px', fontWeight: 600, height: '44px' }}
                    value={overridePrice}
                    onChange={(e) => {
                      setOverridePrice(e.target.value);
                      setVariableProductError('');
                    }}
                  />
                </div>
              )}
              {variableProductError && (
                <div style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: 600 }}>
                  {variableProductError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', backgroundColor: 'var(--bg-surface)' }}>
              <button 
                onClick={() => {
                  setSelectedVarProduct(null);
                  setVariableProductError('');
                }}
                className="pos-btn pos-btn-ghost"
                style={{ flex: 1, height: '44px' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const qty = Number(overrideQty);
                  const price = overridePrice !== '' ? Number(overridePrice) : selectedVarProduct.base_price;

                  if (Number.isNaN(qty) || qty < 1) {
                    setVariableProductError('Quantity must be at least 1.');
                    return;
                  }

                  if (Number.isNaN(price) || price < 0) {
                    setVariableProductError('Price cannot be negative.');
                    return;
                  }

                  addItem(selectedVarProduct, qty, price);
                  setSelectedVarProduct(null);
                  setVariableProductError('');
                  setActiveMobilePanel('cart');
                }}
                className="pos-btn pos-btn-primary"
                style={{ flex: 2, height: '44px' }}
              >
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW SALE CONFIRMATION DIALOG (BUG 2) */}
      {showNewOrderPrompt && (
        <div 
          ref={newOrderTrapRef}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(0,0,0,0.6)', 
            zIndex: 50, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            backdropFilter: 'blur(4px)' 
          }}
        >
          <div 
            className="pos-card"
            style={{ 
              width: '380px', 
              maxWidth: '90vw', 
              padding: '28px 24px', 
              textAlign: 'center', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '16px' 
            }}
          >
            {/* Warning Icon Container */}
            <div 
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(239,68,68,0.12)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />
            </div>

            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {pendingLogoutAfterCartChoice ? 'Logout?' : 'Start New Sale?'}
            </span>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              You have {items.length} item{items.length === 1 ? '' : 's'} in the current order. What would you like to do?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button 
                onClick={handleNewOrderConfirmHold}
                className="pos-btn pos-btn-success"
                style={{ width: '100%', height: '42px', backgroundColor: 'var(--warning)' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--warning)'}
              >
                Hold Order
              </button>
              <button 
                onClick={handleNewOrderConfirmDiscard}
                className="pos-btn pos-btn-danger"
                style={{ width: '100%', height: '42px' }}
              >
                Discard & New Sale
              </button>
              <button 
                onClick={() => {
                  setShowNewOrderPrompt(false);
                  setPendingLogoutAfterCartChoice(false);
                }}
                className="pos-btn pos-btn-ghost"
                style={{ width: '100%', height: '42px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {needsManagerPinForCheckout && (
        <PinModal
          role="MANAGER"
          onConfirm={() => {
            setNeedsManagerPinForCheckout(false);
            openCheckoutModal();
          }}
          onClose={() => setNeedsManagerPinForCheckout(false)}
        />
      )}

      {needsManagerPinForStock && overrideStockProduct && (
        <PinModal
          role="MANAGER"
          onConfirm={() => {
            setNeedsManagerPinForStock(false);
            const prod = overrideStockProduct;
            setOverrideStockProduct(null);
            addProductToCart(prod);
            showToast(`Manager override: added ${prod.name}`, 'SUCCESS');
          }}
          onClose={() => {
            setNeedsManagerPinForStock(false);
            setOverrideStockProduct(null);
            showToast('Out of stock. Addition cancelled.', 'WARNING');
          }}
        />
      )}

      {heldOrderToDelete && (
        <ConfirmModal
          title="Delete Held Order"
          message={`Delete held order ${heldOrderToDelete.local_id}? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={async () => {
            await db.orders.delete(heldOrderToDelete.id);
            setHeldOrderToDelete(null);
            showToast('Held order deleted.', 'INFO');
          }}
          onCancel={() => setHeldOrderToDelete(null)}
        />
      )}

      {/* RECALL DRAWER (PAGE 9) */}
      {isRecallOpen && (
        <div 
          ref={recallTrapRef}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            zIndex: 40,
            animation: 'fadeIn 150ms ease' 
          }}
        >
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              right: 0, 
              height: '100vh', 
              width: '380px', 
              backgroundColor: 'var(--bg-surface)', 
              borderLeft: '1px solid var(--border)', 
              boxShadow: '-8px 0 32px rgba(0,0,0,0.4)', 
              display: 'flex', 
              flexDirection: 'column', 
              zIndex: 41
            }}
          >
            {/* Drawer Header */}
            <div 
              style={{ 
                padding: '20px 24px', 
                borderBottom: '1px solid var(--border)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={20} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'white' }}>Recall Held Orders</span>
              </div>
              <button 
                onClick={() => setIsRecallOpen(false)}
                className="pos-btn-icon"
                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: '16px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {heldOrders?.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', opacity: 0.6 }}>
                  <Pause size={48} style={{ color: 'var(--text-muted)', opacity: 0.2 }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>No orders on hold</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Hold orders appear here</span>
                </div>
              ) : (
                heldOrders?.map((order) => (
                  <div 
                    key={order.id} 
                    className="pos-card"
                    style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{order.local_id}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span style={{ fontSize: '14px', color: 'white', fontWeight: 500 }}>
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'} • <span style={{ fontWeight: 700 }}>{formatPrice(order.total)}</span>
                    </span>
                    {order.customer_id && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <User size={12} />
                        <span>Loyalty ID: {order.customer_id.substring(0, 10)}...</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button 
                        onClick={() => recallOrder(order)}
                        className="pos-btn pos-btn-primary"
                        style={{ height: '36px', flex: 1, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Play size={12} fill="currentColor" />
                        Recall
                      </button>
                      <button 
                        onClick={() => deleteHeldOrder(order.id)}
                        className="pos-btn pos-btn-icon"
                        style={{ height: '36px', width: '36px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL (PAGE 6) */}
      {isCheckoutOpen && (
        <div 
          ref={checkoutTrapRef}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(0,0,0,0.6)', 
            zIndex: 50, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            backdropFilter: 'blur(4px)' 
          }}
        >
          <div 
            className="pos-card checkout-modal animate-in scale-in duration-200"
            style={{ 
              width: '480px', 
              maxWidth: '95vw', 
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden' 
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Payment Checkout</span>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="pos-btn-icon"
                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--danger)';
                  e.currentTarget.style.borderColor = 'var(--danger)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Amount Due Row */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Amount Due</span>
                <span style={{ fontSize: '32px', fontWeight: 700, color: 'white', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {formatPrice(finalTotal)}
                </span>
              </div>

              {/* Payment Method Tabs */}
              <div 
                style={{ 
                  display: 'flex', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius-md)', 
                  overflow: 'hidden' 
                }}
              >
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  style={{ 
                    flex: 1, 
                    height: '42px', 
                    border: 'none', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    backgroundColor: paymentMethod === 'CASH' ? 'var(--primary)' : 'var(--bg-elevated)',
                    color: paymentMethod === 'CASH' ? 'white' : 'var(--text-secondary)',
                    transition: 'all 150ms'
                  }}
                >
                  <span>💵</span> Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  style={{ 
                    flex: 1, 
                    height: '42px', 
                    border: 'none', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    backgroundColor: paymentMethod === 'CARD' ? 'var(--primary)' : 'var(--bg-elevated)',
                    color: paymentMethod === 'CARD' ? 'white' : 'var(--text-secondary)',
                    transition: 'all 150ms'
                  }}
                >
                  <span>💳</span> Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('SPLIT')}
                  style={{ 
                    flex: 1, 
                    height: '42px', 
                    border: 'none', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    backgroundColor: paymentMethod === 'SPLIT' ? 'var(--primary)' : 'var(--bg-elevated)',
                    color: paymentMethod === 'SPLIT' ? 'white' : 'var(--text-secondary)',
                    transition: 'all 150ms'
                  }}
                >
                  <span>✂️</span> Split
                </button>
              </div>

              {/* CASH Tab content */}
              {paymentMethod === 'CASH' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Amount Tendered
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      className="pos-input"
                      style={{ fontSize: '24px', fontWeight: 700, textAlign: 'center', height: '56px', borderColor: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                    />
                  </div>

                  {/* Quick amount buttons */}
                  <div className="checkout-quick-amounts" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {getQuickCashOptions(grandTotal).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAmountTendered(opt.toFixed(2))}
                        className="pos-btn pos-btn-ghost"
                        style={{ 
                          height: '36px', 
                          padding: '0 12px', 
                          fontSize: '13px', 
                          fontWeight: 500,
                          borderColor: Math.abs(opt - grandTotal) < 0.01 ? 'var(--primary)' : 'var(--border)',
                          color: Math.abs(opt - grandTotal) < 0.01 ? 'var(--primary)' : 'var(--text-primary)'
                        }}
                      >
                        {Math.abs(opt - grandTotal) < 0.01 ? `${formatPrice(opt)} Exact` : formatPrice(opt)}
                      </button>
                    ))}
                  </div>

                  {/* Change due */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Change Due</span>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: changeDue > 0 ? 'var(--success)' : 'white', fontVariantNumeric: 'tabular-nums' }}>
                      {formatPrice(changeDue)}
                    </span>
                  </div>
                </div>
              )}

              {/* CARD Tab content */}
              {paymentMethod === 'CARD' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px 0', textAlign: 'center' }}>
                  <CreditCard size={48} style={{ color: 'var(--primary)', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: '18px', fontWeight: 600, color: 'white' }}>
                    Charge {formatPrice(finalTotal)} to Card Terminal
                  </span>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Please swipe, insert, or tap customer card now.
                  </span>
                  {/* Shimmer line waiting indicator */}
                  <div className="skeleton-shimmer" style={{ width: '120px', height: '4px', marginTop: '8px' }}></div>
                </div>
              )}

              {/* SPLIT Tab content */}
              {paymentMethod === 'SPLIT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cash Amount</label>
                      <input 
                        type="number"
                        step="0.01"
                        className="pos-input"
                        style={{ height: '44px', fontSize: '16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                        value={splitCashAmount}
                        onChange={(e) => {
                          setSplitCashAmount(e.target.value);
                          const val = Number(e.target.value) || 0;
                          const card = Math.max(0, finalTotal - val);
                          setSplitCardAmount(card.toFixed(2));
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Card Amount</label>
                      <input 
                        type="number"
                        step="0.01"
                        className="pos-input"
                        style={{ height: '44px', fontSize: '16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                        value={splitCardAmount}
                        onChange={(e) => {
                          setSplitCardAmount(e.target.value);
                          const val = Number(e.target.value) || 0;
                          const cash = Math.max(0, finalTotal - val);
                          setSplitCashAmount(cash.toFixed(2));
                        }}
                      />
                    </div>
                  </div>

                  {/* Auto-balance status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Remaining Balance</span>
                    <span 
                      style={{ 
                        fontSize: '15px', 
                        fontWeight: 700, 
                        color: isSplitBalanced ? 'var(--success)' : 'var(--warning)',
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {isSplitBalanced ? 'Remaining: $0.00 (Balanced)' : `Remaining: ${formatPrice(splitRemaining)}`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', backgroundColor: 'var(--bg-surface)' }}>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="pos-btn pos-btn-ghost"
                style={{ flex: 1, height: '44px' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleProcessCheckout}
                disabled={isProcessing || (paymentMethod === 'CASH' && (Number(amountTendered) || 0) < grandTotal) || (paymentMethod === 'SPLIT' && !isSplitBalanced)}
                className="pos-btn pos-btn-primary"
                style={{ flex: 2, height: '44px' }}
              >
                {isProcessing ? 'Processing...' : paymentMethod === 'CARD' ? 'Confirm Card Charge' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS RECEIPT MODAL (PAGE 7) */}
      {completedOrder && (
        <ReceiptModal 
          order={completedOrder} 
          taxRate={taxRate}
          changeDue={completedOrder.payment_type === 'CASH' ? changeDue : 0}
          cashierName={completedOrder.cashier || 'STAFF'}
          onClose={() => {
            setCompletedOrder(null);
            clearCart();
            setSelectedCustomer(null);
            setDiscount(0);
          }}
        />
      )}

      {/* SCANNER OVERLAY */}
      {isScannerOpen && (
        <BarcodeScanner 
          onScan={handleScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
}

// Sub-component: SettingsModal
interface SettingsModalProps {
  currentTaxRate: number;
  currentTracking: boolean;
  onSave: (taxRate: number, inventoryTracking: boolean) => void;
  onClose: () => void;
}

function SettingsModal({ currentTaxRate, currentTracking, onSave, onClose }: SettingsModalProps) {
  const [taxRate, setTaxRate] = useState(currentTaxRate.toString());
  const [tracking, setTracking] = useState(currentTracking);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(Number(taxRate) || 0, tracking);
  };

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(0,0,0,0.6)', 
        zIndex: 100, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backdropFilter: 'blur(4px)' 
      }}
    >
      <form 
        onSubmit={handleSubmit} 
        className="pos-card animate-in fade-in duration-200"
        style={{ width: '400px', maxWidth: '95vw', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
            <Settings size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '17px', fontWeight: 600 }}>POS Configurations</h3>
          </div>
          <button type="button" onClick={onClose} className="pos-btn-icon" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Default Tax Rate (%)</label>
            <input 
              type="number"
              step="0.01"
              required
              className="pos-input"
              style={{ fontWeight: 600 }}
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Inventory Tracking</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Track and decrement stock on checkout</span>
            </div>
            <input 
              type="checkbox"
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
              checked={tracking}
              onChange={(e) => setTracking(e.target.checked)}
            />
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', display: 'flex', gap: '12px' }}>
          <button type="button" onClick={onClose} className="pos-btn pos-btn-ghost" style={{ flex: 1 }}>
            Cancel
          </button>
          <button type="submit" className="pos-btn pos-btn-primary" style={{ flex: 1 }}>
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}

// Sub-component: ReceiptModal
interface ReceiptModalProps {
  order: Order;
  taxRate: number;
  changeDue: number;
  cashierName: string;
  onClose: () => void;
}

function ReceiptModal({ order, taxRate, changeDue, cashierName, onClose }: ReceiptModalProps) {
  const [products, setProducts] = useState<Record<string, Product>>({});

  useEffect(() => {
    const fetchProducts = async () => {
      const prods = await db.products.toArray();
      const mapping = prods.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, Product>);
      setProducts(mapping);
    };
    fetchProducts();
  }, [order]);

  const discountVal = order.discount || 0;
  const taxVal = order.tax || 0;
  const subtotalVal = order.total - taxVal + discountVal;

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(0,0,0,0.6)', 
        zIndex: 50, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backdropFilter: 'blur(4px)',
        overflowY: 'auto' 
      }}
    >
      <div 
        style={{ 
          backgroundColor: 'var(--bg-surface)', 
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', 
          width: '450px', 
          maxWidth: '95vw', 
          maxHeight: '90vh', 
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Printable Content Container with scroll/margin */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Printable Content Paper */}
          <div 
            id="printable-receipt" 
            style={{ 
              backgroundColor: 'white', 
              color: '#1a1a1a', 
              padding: '24px 20px', 
              borderRadius: 'var(--radius-sm)',
              fontFamily: "'Courier New', Courier, monospace", 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '4px',
              lineHeight: 1.4,
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)'
            }}
          >
          {/* Store Header */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', display: 'block' }}>KELS POS</span>
            <span style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Omnichannel Retail</span>
            <span style={{ fontSize: '12px', color: '#555', display: 'block' }}>123 POS Main St, Digital City</span>
            <span style={{ fontSize: '12px', color: '#555', display: 'block' }}>Tel: (555) 123-4567</span>
          </div>

          {/* Dashed Divider */}
          <div style={{ borderTop: '1px dashed #ccc', margin: '12px 0' }}></div>

          {/* Meta rows */}
          <div style={{ fontSize: '12px', color: '#555', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Receipt #:</span>
              <span style={{ fontWeight: 600 }}>{order.local_id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Date:</span>
              <span>{new Date(order.created_at).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cashier:</span>
              <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{cashierName}</span>
            </div>
            {order.customer_id && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Loyalty Customer:</span>
                <span style={{ fontWeight: 600 }}>{order.customer_id}</span>
              </div>
            )}
          </div>

          {/* Dashed Divider */}
          <div style={{ borderTop: '1px dashed #ccc', margin: '12px 0' }}></div>

          {/* Items Section Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>
            <span>ITEM</span>
            <span>QTY</span>
            <span style={{ textAlign: 'right' }}>TOTAL</span>
          </div>

          {/* Itemized List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
            {order.items.map((item) => {
              const prod = products[item.product_id];
              return (
                <div key={item.product_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#1a1a1a' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{prod ? prod.name : 'Unknown Product'}</span>
                    <span style={{ fontSize: '11px', color: '#666' }}>
                      {item.unit} @ {formatPrice(item.price_at_sale)}
                    </span>
                  </div>
                  <span style={{ alignSelf: 'flex-end', fontVariantNumeric: 'tabular-nums' }}>
                    {item.quantity} x {formatPrice(item.price_at_sale * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Dashed Divider */}
          <div style={{ borderTop: '1px dashed #ccc', margin: '12px 0' }}></div>

          {/* Summary */}
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
              <span>Subtotal</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatPrice(subtotalVal)}</span>
            </div>
            {discountVal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                <span>Discount</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>-{formatPrice(discountVal)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
              <span>Tax ({taxRate}%)</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatPrice(taxVal)}</span>
            </div>

            {/* Solid Divider */}
            <div style={{ borderTop: '2px solid #1a1a1a', margin: '8px 0' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, color: '#1a1a1a' }}>
              <span>GRAND TOTAL</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatPrice(order.total)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', marginTop: '4px' }}>
              <span>Payment Type:</span>
              <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{order.payment_type}</span>
            </div>
            {order.payment_type === 'CASH' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                <span>Change:</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatPrice(Math.max(0, changeDue))}</span>
              </div>
            )}
          </div>

          {/* Dashed Divider */}
          <div style={{ borderTop: '1px dashed #ccc', margin: '12px 0' }}></div>

          {/* Success Indicator */}
          <div style={{ textAlign: 'center', margin: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#22c55e', fontSize: '28px' }}>✅</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>Transaction Complete</span>
            <span style={{ fontSize: '13px', color: '#555' }}>Thank you for shopping with us!</span>
          </div>

          {/* Loyalty Note */}
          {order.customer_id && (
            <div style={{ textAlign: 'center', fontSize: '12px', color: '#f59e0b', marginTop: '4px' }}>
              <span>⭐ Customer earned {Math.floor(order.total)} points.</span>
            </div>
          )}
        </div>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', backgroundColor: 'var(--bg-surface)', position: 'sticky', bottom: 0 }}>
          <button 
            onClick={() => window.print()}
            style={{ backgroundColor: '#1a1a1a', color: 'white', border: 'none', cursor: 'pointer', flex: 1, height: '44px', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '14px' }}
          >
            🖨 Print Receipt
          </button>
          <button 
            onClick={onClose}
            className="pos-btn pos-btn-primary"
            style={{ flex: 1, height: '44px' }}
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}
