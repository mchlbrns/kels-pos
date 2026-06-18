'use client';

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Order, type Customer, type Product } from '@/lib/db';
import { addToSyncQueue } from '@/lib/sync';
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal';
import { useAuth } from '@/context/AuthContext';
import { 
  Search, 
  RotateCcw, 
  Trash2, 
  ShoppingBag, 
  User, 
  ArrowLeft,
  X
} from 'lucide-react';
import Link from 'next/link';

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const normalizeOrderStatus = (status: string) => status === 'PAID' ? 'COMPLETED' : status;

export default function OrdersPage() {
  const { session } = useAuth();
  const role = session?.role;
  const [searchTerm, setSearchTerm] = useState('');

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL'); // ALL, TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS
  
  // Custom Date Range states
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Selected Order for detail view modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);

  // Fetch orders and customers
  const orders = useLiveQuery(() => db.orders.toArray());
  const customers = useLiveQuery(() => db.customers.toArray());

  const customerMap = React.useMemo(() => {
    const custs = customers || [];
    return custs.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {} as Record<string, Customer>);
  }, [customers]);

  // Apply filters
  const filteredOrders = React.useMemo(() => {
    const ords = orders || [];
    return ords.filter(order => {
      // 1. Search term (matches order local_id, customer name, cashier name, or payment type)
      const customer = order.customer_id ? customerMap[order.customer_id] : null;
      const custName = customer ? customer.name.toLowerCase() : 'guest';
      const orderId = order.local_id.toLowerCase();
      const cashier = (order.cashier || '').toLowerCase();
      const paymentType = (order.payment_type || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      
      const matchesSearch = orderId.includes(term) || custName.includes(term) || cashier.includes(term) || paymentType.includes(term);
      if (!matchesSearch) return false;


      // 2. Status filter
      const normalizedStatus = normalizeOrderStatus(order.status);
      if (statusFilter !== 'ALL' && normalizedStatus !== statusFilter) return false;

      // 3. Date filter
      if (dateFilter === 'TODAY') {
        const today = new Date();
        today.setHours(0,0,0,0);
        if (order.created_at < today.getTime()) return false;
      } else if (dateFilter === 'YESTERDAY') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0,0,0,0);
        
        const today = new Date();
        today.setHours(0,0,0,0);
        if (order.created_at < yesterday.getTime() || order.created_at >= today.getTime()) return false;
      } else if (dateFilter === 'LAST_7_DAYS') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0,0,0,0);
        if (order.created_at < sevenDaysAgo.getTime()) return false;
      } else if (dateFilter === 'LAST_30_DAYS') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0,0,0,0);
        if (order.created_at < thirtyDaysAgo.getTime()) return false;
      } else if (dateFilter === 'CUSTOM') {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0,0,0,0);
          if (order.created_at < start.getTime()) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23,59,59,999);
          if (order.created_at > end.getTime()) return false;
        }
      }

      return true;
    }).sort((a, b) => b.created_at - a.created_at); // Sort newest first
  }, [orders, customerMap, searchTerm, statusFilter, dateFilter, customStartDate, customEndDate]);

  // Refund Handler
  const handleRefund = async (order: Order) => {
    if (order.status === 'REFUNDED') return;
    try {
      const updatedOrder: Order = {
        ...order,
        status: 'REFUNDED',
        sync_status: 'PENDING'
      };
      await db.orders.put(updatedOrder);
      await addToSyncQueue('ORDER', updatedOrder);
      
      // Return loyalty points to customer if linked
      if (order.customer_id) {
        const customer = await db.customers.get(order.customer_id);
        if (customer) {
          const deductedPoints = Math.floor(order.total);
          const updatedCust = {
            ...customer,
            points: Math.max(0, customer.points - deductedPoints)
          };
          await db.customers.put(updatedCust);
          await addToSyncQueue('CUSTOMER', updatedCust);
        }
      }
      
      alert('Order marked as REFUNDED.');
    } catch (error) {
      console.error('Refund failed:', error);
    }
  };

  // Void Handler
  const handleVoid = async (order: Order) => {
    if (order.status === 'VOIDED') return;
    if (confirm(`Are you sure you want to void order ${order.local_id}?`)) {
      try {
        const updatedOrder: Order = {
          ...order,
          status: 'VOIDED',
          sync_status: 'PENDING'
        };
        await db.orders.put(updatedOrder);
        await addToSyncQueue('ORDER', updatedOrder);

        // Refund loyalty points to customer if linked
        if (order.customer_id) {
          const customer = await db.customers.get(order.customer_id);
          if (customer) {
            const deductedPoints = Math.floor(order.total);
            const updatedCust = {
              ...customer,
              points: Math.max(0, customer.points - deductedPoints)
            };
            await db.customers.put(updatedCust);
            await addToSyncQueue('CUSTOMER', updatedCust);
          }
        }
        
        alert('Order VOIDED.');
      } catch (error) {
        console.error('Void failed:', error);
      }
    }
  };

  return (
    <div className="orders-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', padding: '24px 32px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
      
      {/* PAGE HEADER */}
      <div style={{ marginBottom: '24px' }}>
        <Link 
          href="/pos" 
          style={{ 
            fontSize: '13px', 
            color: 'var(--text-secondary)', 
            textDecoration: 'none', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '4px', 
            marginBottom: '8px' 
          }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft size={14} /> Back to POS
        </Link>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)' }}>Sales & Order History</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Review completed transaction details and manage refunds.
            </p>
          </div>
          
          {/* Dropdown Filters */}
          <div className="orders-filters" style={{ display: 'flex', gap: '8px' }}>
            <select
              className="pos-select"
              style={{ width: '160px' }}
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="LAST_30_DAYS">Last 30 Days</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
            <select
              className="pos-select"
              style={{ width: '160px' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="REFUNDED">Refunded</option>
              <option value="VOIDED">Voided</option>
              <option value="HELD">Held</option>
            </select>
          </div>
        </div>
      </div>

      {/* Custom Date Range Picker Container */}
      {dateFilter === 'CUSTOM' && (
        <div 
          style={{ 
            display: 'flex', 
            gap: '16px', 
            padding: '16px', 
            backgroundColor: 'var(--bg-surface)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '16px' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>From:</span>
            <input 
              type="date" 
              className="pos-input"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>To:</span>
            <input 
              type="date" 
              className="pos-input"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div style={{ marginBottom: '16px', position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
        <input 
          type="text"
          placeholder="Search by order #, customer name..."
          className="pos-input"
          style={{ width: '100%', paddingLeft: '38px', height: '44px' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* ORDERS TABLE CONTAINER */}
      <div 
        className="pos-card orders-table-card" 
        style={{ overflow: 'hidden', borderRadius: 'var(--radius-lg)' }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Order #</th>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Date & Time</th>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Customer</th>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', textAlign: 'right' }}>Total Amount</th>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Payment</th>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '14px' }}>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ShoppingBag size={64} style={{ opacity: 0.2, color: 'var(--text-muted)', display: 'block', margin: '0 auto 12px' }} />
                    <span style={{ fontSize: '15px', fontWeight: 600 }}>No orders found</span>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => {
                  const customer = order.customer_id ? customerMap[order.customer_id] : null;
                  
                  // Row border logic (except last child)
                  const isLastRow = idx === filteredOrders.length - 1;
                  const rowStyle: React.CSSProperties = {
                    borderBottom: isLastRow ? 'none' : '1px solid var(--border)',
                    transition: 'background-color 120ms'
                  };

                  return (
                    <tr 
                      key={order.id} 
                      style={rowStyle}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.04)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Order # */}
                      <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: '13px', color: 'var(--primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                            textDecoration: 'underline'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary-dark)'}
                          onMouseOut={(e) => e.currentTarget.style.color = 'var(--primary)'}
                        >
                          {order.local_id}
                        </button>
                      </td>
                      
                      {/* Date */}
                      <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        {new Date(order.created_at).toLocaleDateString()} at{' '}
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                        {customer ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={14} style={{ color: 'var(--primary)' }} />
                            <span style={{ color: 'white', fontWeight: 500 }}>{customer.name}</span>
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Guest</span>
                        )}
                      </td>

                      {/* Total */}
                      <td style={{ padding: '14px 20px', color: 'white', fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                        {formatPrice(order.total)}
                      </td>

                      {/* Payment */}
                      <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                        <span 
                          className="pos-badge"
                          style={{
                            backgroundColor: order.payment_type === 'CARD' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                            color: order.payment_type === 'CARD' ? '#3b82f6' : '#22c55e',
                            borderColor: order.payment_type === 'CARD' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)'
                          }}
                        >
                          {order.payment_type}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                        <span 
                          className="pos-badge"
                          style={{
                            backgroundColor: 
                              normalizeOrderStatus(order.status) === 'COMPLETED' ? 'rgba(34, 197, 94, 0.12)' :
                              order.status === 'HELD' ? 'rgba(245, 158, 11, 0.12)' :
                              order.status === 'VOIDED' || order.status === 'REFUNDED' ? 'rgba(239, 68, 68, 0.12)' :
                              'rgba(59, 130, 246, 0.12)',
                            color: 
                              normalizeOrderStatus(order.status) === 'COMPLETED' ? '#22c55e' :
                              order.status === 'HELD' ? '#f59e0b' :
                              order.status === 'VOIDED' || order.status === 'REFUNDED' ? '#ef4444' :
                              '#3b82f6',
                            borderColor: 
                              normalizeOrderStatus(order.status) === 'COMPLETED' ? 'rgba(34, 197, 94, 0.3)' :
                              order.status === 'HELD' ? 'rgba(245, 158, 11, 0.3)' :
                              order.status === 'VOIDED' || order.status === 'REFUNDED' ? 'rgba(239, 68, 68, 0.3)' :
                              'rgba(59, 130, 246, 0.3)'
                          }}
                        >
                          {normalizeOrderStatus(order.status)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                        {normalizeOrderStatus(order.status) === 'COMPLETED' ? (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                            <button
                              onClick={() => role === 'MANAGER' && setRefundOrder(order)}
                              disabled={role !== 'MANAGER'}
                              title={role === 'MANAGER' ? "Refund" : "Manager access required."}
                              style={{ 
                                width: '32px', 
                                height: '32px', 
                                backgroundColor: 'transparent', 
                                border: '1px solid var(--warning)', 
                                color: 'var(--warning)', 
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: role === 'MANAGER' ? 'pointer' : 'not-allowed',
                                opacity: role === 'MANAGER' ? 1 : 0.4,
                                transition: 'background-color 150ms'
                              }}
                              onMouseOver={(e) => {
                                if (role === 'MANAGER') e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                              }}
                              onMouseOut={(e) => {
                                if (role === 'MANAGER') e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <RotateCcw size={14} />
                            </button>
                            <button
                              onClick={() => role === 'MANAGER' && handleVoid(order)}
                              disabled={role !== 'MANAGER'}
                              title={role === 'MANAGER' ? "Void" : "Manager access required."}
                              style={{ 
                                width: '32px', 
                                height: '32px', 
                                backgroundColor: 'transparent', 
                                border: '1px solid var(--danger)', 
                                color: 'var(--danger)', 
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: role === 'MANAGER' ? 'pointer' : 'not-allowed',
                                opacity: role === 'MANAGER' ? 1 : 0.4,
                                transition: 'background-color 150ms'
                              }}
                              onMouseOver={(e) => {
                                if (role === 'MANAGER') e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                              }}
                              onMouseOut={(e) => {
                                if (role === 'MANAGER') e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                            No actions
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="orders-mobile-list">
        {filteredOrders.length === 0 ? (
          <div className="pos-card orders-mobile-empty">
            <ShoppingBag size={44} style={{ opacity: 0.2, color: 'var(--text-muted)' }} />
            <span>No orders found</span>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const customer = order.customer_id ? customerMap[order.customer_id] : null;
            const normalizedStatus = normalizeOrderStatus(order.status);

            return (
              <article key={order.id} className="pos-card orders-mobile-card">
                <div className="orders-mobile-card-top">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="orders-mobile-id"
                  >
                    {order.local_id}
                  </button>
                  <span
                    className="pos-badge"
                    style={{
                      backgroundColor:
                        normalizedStatus === 'COMPLETED' ? 'rgba(34, 197, 94, 0.12)' :
                        order.status === 'HELD' ? 'rgba(245, 158, 11, 0.12)' :
                        order.status === 'VOIDED' || order.status === 'REFUNDED' ? 'rgba(239, 68, 68, 0.12)' :
                        'rgba(59, 130, 246, 0.12)',
                      color:
                        normalizedStatus === 'COMPLETED' ? '#22c55e' :
                        order.status === 'HELD' ? '#f59e0b' :
                        order.status === 'VOIDED' || order.status === 'REFUNDED' ? '#ef4444' :
                        '#3b82f6',
                      borderColor:
                        normalizedStatus === 'COMPLETED' ? 'rgba(34, 197, 94, 0.3)' :
                        order.status === 'HELD' ? 'rgba(245, 158, 11, 0.3)' :
                        order.status === 'VOIDED' || order.status === 'REFUNDED' ? 'rgba(239, 68, 68, 0.3)' :
                        'rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    {normalizedStatus}
                  </span>
                </div>

                <div className="orders-mobile-total">{formatPrice(order.total)}</div>

                <div className="orders-mobile-meta">
                  <span>{new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>{customer ? customer.name : 'Guest'}</span>
                  <span>{order.payment_type}</span>
                </div>

                {normalizedStatus === 'COMPLETED' ? (
                  <div className="orders-mobile-actions">
                    <button
                      onClick={() => role === 'MANAGER' && setRefundOrder(order)}
                      disabled={role !== 'MANAGER'}
                      className="pos-btn pos-btn-warning"
                      title={role === 'MANAGER' ? "Refund" : "Manager access required."}
                      style={{
                        cursor: role === 'MANAGER' ? 'pointer' : 'not-allowed',
                        opacity: role === 'MANAGER' ? 1 : 0.4
                      }}
                    >
                      <RotateCcw size={16} />
                      Refund
                    </button>
                    <button
                      onClick={() => role === 'MANAGER' && handleVoid(order)}
                      disabled={role !== 'MANAGER'}
                      className="pos-btn pos-btn-danger"
                      title={role === 'MANAGER' ? "Void" : "Manager access required."}
                      style={{
                        cursor: role === 'MANAGER' ? 'pointer' : 'not-allowed',
                        opacity: role === 'MANAGER' ? 1 : 0.4
                      }}
                    >
                      <Trash2 size={16} />
                      Void
                    </button>
                  </div>
                ) : null}

              </article>
            );
          })
        )}
      </div>

      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder}
          customerMap={customerMap}
          onClose={() => setSelectedOrder(null)}
        />
      )}
      {refundOrder && (
        <ConfirmModal
          title="Confirm Refund"
          message={`Refund order ${refundOrder.local_id} for ${formatPrice(refundOrder.total)}?`}
          confirmLabel="Yes, Refund"
          onConfirm={async () => {
            const orderToRefund = refundOrder;
            setRefundOrder(null);
            await handleRefund(orderToRefund);
          }}
          onCancel={() => setRefundOrder(null)}
        />
      )}
    </div>
  );
}

// Sub-component: OrderDetailModal
interface OrderDetailModalProps {
  order: Order;
  customerMap: Record<string, Customer>;
  onClose: () => void;
}

function OrderDetailModal({ order, customerMap, onClose }: OrderDetailModalProps) {
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
  const subtotalVal = order.items.reduce((sum, item) => sum + item.quantity * item.price_at_sale, 0);
  const customer = order.customer_id ? customerMap[order.customer_id] : null;
  const taxableSubtotal = Math.max(0, subtotalVal - discountVal);
  const taxRate = taxableSubtotal > 0 ? Math.round((taxVal / taxableSubtotal) * 100) : 0;

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
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>Order Details</span>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'white'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block', textTransform: 'uppercase' }}>Order #</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '15px' }}>{order.local_id}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block', textTransform: 'uppercase' }}>Date & Time</span>
              <span>{new Date(order.created_at).toLocaleString()}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block', textTransform: 'uppercase' }}>Cashier</span>
              <span style={{ textTransform: 'uppercase' }}>{order.cashier || 'STAFF'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block', textTransform: 'uppercase' }}>Status</span>
              <span 
                className="pos-badge"
                style={{
                  backgroundColor: 
                    normalizeOrderStatus(order.status) === 'COMPLETED' ? 'rgba(34, 197, 94, 0.15)' :
                    order.status === 'HELD' ? 'rgba(245, 158, 11, 0.15)' :
                    order.status === 'REFUNDED' || order.status === 'VOIDED' ? 'rgba(239, 68, 68, 0.15)' :
                    'rgba(59, 130, 246, 0.15)',
                  color: 
                    normalizeOrderStatus(order.status) === 'COMPLETED' ? 'var(--success)' :
                    order.status === 'HELD' ? 'var(--warning)' :
                    order.status === 'REFUNDED' || order.status === 'VOIDED' ? 'var(--danger)' :
                    'var(--primary)',
                  borderColor: 
                    normalizeOrderStatus(order.status) === 'COMPLETED' ? 'rgba(34, 197, 94, 0.3)' :
                    order.status === 'HELD' ? 'rgba(245, 158, 11, 0.3)' :
                    order.status === 'REFUNDED' || order.status === 'VOIDED' ? 'rgba(239, 68, 68, 0.3)' :
                    'rgba(59, 130, 246, 0.3)'
                }}
              >
                {normalizeOrderStatus(order.status)}
              </span>
            </div>
          </div>

          {/* Customer info if present */}
          {customer && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Customer Details</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: 600 }}>{customer.name}</span>
                <span style={{ color: 'var(--text-secondary)' }}>({customer.phone || 'No phone'})</span>
                <span style={{ marginLeft: 'auto', color: 'var(--warning)', fontWeight: 600 }}>{customer.points} pts</span>
              </div>
            </div>
          )}

          {/* Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Items</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
              {order.items.map((item, idx) => {
                const prod = products[item.product_id];
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 500 }}>{prod ? prod.name : 'Unknown Product'}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {item.unit} @ {formatPrice(item.price_at_sale)}
                      </span>
                    </div>
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {item.quantity} × {formatPrice(item.price_at_sale * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Subtotal</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatPrice(subtotalVal)}</span>
            </div>
            {discountVal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--warning)' }}>
                <span>Discount</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>-{formatPrice(discountVal)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Tax ({taxRate}%)</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatPrice(taxVal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, color: 'white', marginTop: '4px' }}>
              <span>TOTAL</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatPrice(order.total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginTop: '4px' }}>
              <span>Payment Type</span>
              <span style={{ fontWeight: 600, color: 'white' }}>{order.payment_type}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--bg-surface)' }}>
          <button 
            onClick={onClose}
            className="pos-btn pos-btn-primary"
            style={{ width: '120px', height: '40px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
