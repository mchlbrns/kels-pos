'use client';

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { 
  Printer, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  ArrowUpRight, 
  ArrowDownRight,
  Package,
  Calendar,
  Filter
} from 'lucide-react';

export default function ReportsPage() {
  const startOfDay = new Date();
  startOfDay.setHours(0,0,0,0);

  const todayOrders = useLiveQuery(() => 
    db.orders.where('created_at').above(startOfDay.getTime()).toArray()
  ) || [];

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
  
  const topItems = Object.entries(itemCounts)
    .map(([id, qty]) => ({
      name: products.find(p => p.id === id)?.name || 'Unknown',
      qty
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Business Insights</h1>
          <p className="text-gray-500 flex items-center gap-2">
            <Calendar size={16} />
            Today, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition shadow-sm">
            <Filter size={18} />
            Filter
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            <Printer size={18} />
            Print Report
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Gross Revenue" 
          value={`$${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<TrendingUp className="text-blue-600" />}
          trend="+12.5%"
          isPositive={true}
        />
        <StatCard 
          title="Total Orders" 
          value={todayOrders.length.toString()}
          icon={<ShoppingBag className="text-purple-600" />}
          trend="+5.2%"
          isPositive={true}
        />
        <StatCard 
          title="Average Order" 
          value={`$${averageOrderValue.toFixed(2)}`}
          icon={<ArrowUpRight className="text-orange-600" />}
          trend="-2.1%"
          isPositive={false}
        />
        <StatCard 
          title="Customer Visits" 
          value={todayOrders.filter(o => o.customer_id).length.toString()}
          icon={<Users className="text-green-600" />}
          trend="+18%"
          isPositive={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Products */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Package size={20} className="text-blue-500" />
              Best Selling Products
            </h3>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Units Sold</span>
          </div>
          
          <div className="space-y-6">
            {topItems.length > 0 ? topItems.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-4">
                <span className="text-2xl font-black text-gray-100 w-8">{idx + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-700">{item.name}</span>
                    <span className="font-black text-blue-600">{item.qty.toFixed(1)}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full" 
                      style={{ width: `${(item.qty / topItems[0].qty) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-gray-400 italic">No data available for today yet.</div>
            )}
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 mb-8 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-500" />
            Payment Streams
          </h3>
          
          <div className="space-y-4">
            {Object.entries(paymentBreakdown).map(([type, amount]) => (
              <div key={type} className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center border border-transparent hover:border-green-200 hover:bg-green-50 transition">
                <span className="font-bold text-gray-600 uppercase text-xs tracking-wider">{type}</span>
                <span className="font-black text-gray-800 text-lg">${amount.toFixed(2)}</span>
              </div>
            ))}
            {Object.keys(paymentBreakdown).length === 0 && (
              <div className="text-center py-12 text-gray-400 italic">Awaiting first sale...</div>
            )}
          </div>

          <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
            <p className="text-blue-800 text-xs font-bold uppercase mb-2">Pro Tip</p>
            <p className="text-blue-600 text-sm leading-relaxed">
              Digital payments are up <span className="font-bold">24%</span> this week. Consider promoting your loyalty app at checkout.
            </p>
          </div>
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
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-gray-50 rounded-2xl group-hover:scale-110 transition">
          {icon}
        </div>
        <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-lg ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h4 className="text-2xl font-black text-gray-900 tracking-tight">{value}</h4>
      </div>
    </div>
  );
}
