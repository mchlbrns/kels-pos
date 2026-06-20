'use client';

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { pullFromServer } from '@/lib/sync';
import { 
  Printer, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  ArrowUpRight, 
  Calendar,
  Filter,
  Lightbulb
} from 'lucide-react';

export default function ReportsPage() {
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.onLine) {
      pullFromServer();
    }
  }, []);

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM'>('TODAY');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [currency] = useState<'PHP' | 'USD'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_currency');
      return saved === 'USD' ? 'USD' : 'PHP';
    }
    return 'PHP';
  });

  const formatPrice = (amount: number) => {
    const locale = currency === 'USD' ? 'en-US' : 'en-PH';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  };

  const getDateRange = () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    switch (dateFilter) {
      case 'TODAY':
        return { start: todayStart.getTime(), end: null };
      case 'YESTERDAY': {
        const yesterdayStart = new Date();
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        return { start: yesterdayStart.getTime(), end: todayStart.getTime() };
      }
      case 'LAST_7_DAYS': {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        return { start: sevenDaysAgo.getTime(), end: null };
      }
      case 'LAST_30_DAYS': {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        return { start: thirtyDaysAgo.getTime(), end: null };
      }
      case 'CUSTOM': {
        let start = 0;
        let end = null;
        if (customStartDate) {
          const startDateObj = new Date(customStartDate);
          startDateObj.setHours(0, 0, 0, 0);
          start = startDateObj.getTime();
        }
        if (customEndDate) {
          const endDateObj = new Date(customEndDate);
          endDateObj.setHours(23, 59, 59, 999);
          end = endDateObj.getTime();
        }
        return { start, end };
      }
      default:
        return { start: todayStart.getTime(), end: null };
    }
  };

  const getDateRangeLabel = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
    const today = new Date();

    switch (dateFilter) {
      case 'TODAY':
        return `Today, ${today.toLocaleDateString('en-US', options)}`;
      case 'YESTERDAY': {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return `Yesterday, ${yesterday.toLocaleDateString('en-US', options)}`;
      }
      case 'LAST_7_DAYS': {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return `Last 7 Days (${sevenDaysAgo.toLocaleDateString('en-US', options)} - ${today.toLocaleDateString('en-US', options)})`;
      }
      case 'LAST_30_DAYS': {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return `Last 30 Days (${thirtyDaysAgo.toLocaleDateString('en-US', options)} - ${today.toLocaleDateString('en-US', options)})`;
      }
      case 'CUSTOM': {
        const startStr = customStartDate ? new Date(customStartDate).toLocaleDateString('en-US', options) : 'Beginning';
        const endStr = customEndDate ? new Date(customEndDate).toLocaleDateString('en-US', options) : 'Today';
        return `Custom Range (${startStr} - ${endStr})`;
      }
      default:
        return `Today, ${today.toLocaleDateString('en-US', options)}`;
    }
  };

  const { start, end } = getDateRange();

  const rawFilteredOrders = useLiveQuery(() => {
    return db.orders.where('created_at').aboveOrEqual(start).toArray();
  }, [dateFilter, customStartDate, customEndDate]) || [];

  const todayOrders = rawFilteredOrders.filter(o => {
    if (o.status !== 'COMPLETED') return false;
    if (end !== null && o.created_at > end) return false;
    return true;
  });

  const totalSales = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const averageOrderValue = todayOrders.length > 0 ? totalSales / todayOrders.length : 0;
  
  const paymentBreakdown = todayOrders.reduce((acc, o) => {
    acc[o.payment_type] = (acc[o.payment_type] || 0) + o.total;
    return acc;
  }, {} as Record<string, number>);

  const itemCounts = todayOrders.flatMap(o => o.items).reduce((acc, item) => {
    acc[item.product_id] = (acc[item.product_id] || 0) + Number(item.quantity);
    return acc;
  }, {} as Record<string, number>);

  const products = useLiveQuery(() => db.products.toArray()) || [];
  
  // Best selling items
  const topItems = Object.entries(itemCounts)
    .map(([id, qty]) => {
      const prod = products.find(p => p.id === id);
      const name = prod?.name || 'Unknown Product';
      const basePrice = prod?.base_price || 0;
      const revenue = qty * basePrice;
      return { id, name, qty, revenue };
    })
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className="reports-page-container" id="printable-report">
      
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'white' }}>Business Insights</h1>
          {/* Date Chip */}
          <div 
            style={{ 
              backgroundColor: 'var(--bg-surface)', 
              border: '1px solid var(--border)', 
              borderRadius: '999px', 
              padding: '4px 12px', 
              fontSize: '13px', 
              color: 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '6px'
            }}
          >
            <Calendar size={14} />
            {getDateRangeLabel()}
          </div>
        </div>
        
        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }} className="no-print">
          <button 
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="pos-btn pos-btn-ghost" 
            style={{ 
              height: '38px',
              backgroundColor: showFilterPanel ? 'var(--bg-accent)' : 'transparent',
              borderColor: showFilterPanel ? 'var(--primary)' : 'var(--border)',
              color: showFilterPanel ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            <Filter size={16} />
            Filter
          </button>
          <button 
            onClick={() => window.print()}
            className="pos-btn pos-btn-ghost"
            style={{ height: '38px' }}
          >
            <Printer size={16} />
            Print Report
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      {showFilterPanel && (
        <div 
          className="no-print"
          style={{ 
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px', 
            padding: '16px', 
            backgroundColor: 'var(--bg-surface)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '24px',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Time Period</span>
            <select
              className="pos-select"
              style={{ width: '180px', height: '38px' }}
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM')}
            >
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="LAST_30_DAYS">Last 30 Days</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {dateFilter === 'CUSTOM' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>From</span>
                <input 
                  type="date" 
                  className="pos-input"
                  style={{ height: '38px', width: '150px' }}
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>To</span>
                <input 
                  type="date" 
                  className="pos-input"
                  style={{ height: '38px', width: '150px' }}
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* KPI STAT CARDS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard 
          title="Gross Revenue" 
          value={formatPrice(totalSales)}
          icon={<TrendingUp size={16} style={{ color: '#3b82f6' }} />}
          trend="+12.5%"
          isPositive={true}
        />
        <StatCard 
          title="Total Orders" 
          value={todayOrders.length.toString()}
          icon={<ShoppingBag size={16} style={{ color: '#a855f7' }} />}
          trend="+5.2%"
          isPositive={true}
        />
        <StatCard 
          title="Average Order" 
          value={formatPrice(averageOrderValue)}
          icon={<ArrowUpRight size={16} style={{ color: '#f59e0b' }} />}
          trend="-2.1%"
          isPositive={false}
        />
        <StatCard 
          title="Customer Visits" 
          value={todayOrders.filter(o => o.customer_id).length.toString()}
          icon={<Users size={16} style={{ color: '#22c55e' }} />}
          trend="+18%"
          isPositive={true}
        />
      </div>

      {/* BOTTOM SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* BEST SELLING PRODUCTS */}
        <div className="pos-card" style={{ padding: '20px 24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🏆</span> Best Selling Products
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {topItems.length > 0 ? (
              topItems.map((item, idx) => {
                const isLast = idx === topItems.length - 1;
                return (
                  <div 
                    key={item.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '10px 0', 
                      borderBottom: isLast ? 'none' : '1px solid var(--border)' 
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {/* Rank badge */}
                      <span 
                        style={{ 
                          backgroundColor: 'var(--bg-elevated)', 
                          color: 'var(--text-secondary)', 
                          fontSize: '12px', 
                          fontWeight: 700, 
                          minWidth: '24px', 
                          height: '24px', 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ color: 'white', fontWeight: 500, marginLeft: '10px' }}>{item.name}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {item.qty.toFixed(0)} units
                      </span>
                      <span style={{ color: 'var(--primary)', fontWeight: 600, marginLeft: '16px', fontVariantNumeric: 'tabular-nums' }}>
                        {formatPrice(item.revenue)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                No sales data yet.
              </div>
            )}
          </div>
        </div>

        {/* PAYMENT STREAMS */}
        <div className="pos-card" style={{ padding: '20px 24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>💳</span> Payment Streams
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(paymentBreakdown).map(([type, amount]) => {
              const pct = totalSales > 0 ? (amount / totalSales) * 100 : 0;
              const themeColor = 
                type === 'CASH' ? 'var(--success)' : 
                type === 'CARD' ? 'var(--primary)' : 
                'var(--warning)';

              return (
                <div key={type} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span 
                        className="pos-badge"
                        style={{
                          backgroundColor: 
                            type === 'CASH' ? 'rgba(34, 197, 94, 0.15)' : 
                            type === 'CARD' ? 'rgba(59, 130, 246, 0.15)' : 
                            'rgba(245, 158, 11, 0.15)',
                          color: themeColor,
                          borderColor:
                            type === 'CASH' ? 'rgba(34, 197, 94, 0.3)' : 
                            type === 'CARD' ? 'rgba(59, 130, 246, 0.3)' : 
                            'rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        {type}
                      </span>
                      <span style={{ color: 'white', fontWeight: 500, marginLeft: '10px' }}>{type} Payments</span>
                    </div>
                    <span style={{ color: 'white', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {formatPrice(amount)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: '4px', borderRadius: '999px', backgroundColor: 'var(--bg-accent)', marginTop: '6px', overflow: 'hidden', width: '100%' }}>
                    <div style={{ height: '100%', backgroundColor: themeColor, width: `${pct}%`, borderRadius: '999px', transition: 'width 200ms ease' }}></div>
                  </div>
                </div>
              );
            })}
            
            {Object.keys(paymentBreakdown).length === 0 && (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                Awaiting first sale...
              </div>
            )}
          </div>
        </div>

      </div>

      {/* PRO TIP SECTION */}
      <div 
        style={{ 
          backgroundColor: 'rgba(59, 130, 246, 0.08)', 
          border: '1px solid rgba(59, 130, 246, 0.2)', 
          borderRadius: 'var(--radius-md)', 
          padding: '14px 18px', 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '12px',
          marginTop: '20px' 
        }}
      >
        <Lightbulb size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
            Pro Tip
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Digital payments are up 24% this week. Consider promoting your loyalty app at checkout.
          </span>
        </div>
      </div>

    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  isPositive: boolean;
}

function StatCard({ title, value, icon, trend, isPositive }: StatCardProps) {
  return (
    <div 
      className="pos-card"
      style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div 
          style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: 'var(--radius-sm)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 
              title === 'Gross Revenue' ? 'rgba(59, 130, 246, 0.15)' :
              title === 'Total Orders' ? 'rgba(168, 85, 247, 0.15)' :
              title === 'Average Order' ? 'rgba(245, 158, 11, 0.15)' :
              'rgba(34, 197, 94, 0.15)'
          }}
        >
          {icon}
        </div>
        <div 
          style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            padding: '2px 8px', 
            borderRadius: '999px',
            backgroundColor: isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: isPositive ? '#22c55e' : '#ef4444',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px'
          }}
        >
          <span>{isPositive ? '↑' : '↓'}</span> {trend}
        </div>
      </div>
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</span>
      <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</span>
    </div>
  );
}
