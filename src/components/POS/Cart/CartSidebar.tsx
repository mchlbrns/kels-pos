'use client';

import { Trash2, ShoppingBag, CreditCard, Pause, Tag, Percent, Star } from 'lucide-react';
import { type CartItem } from '@/hooks/useCart';
import { type Customer } from '@/lib/db';

interface CartSidebarProps {
  items: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  subtotal: number;
  taxRate: number;
  discount: number;
  discountType: 'percentage' | 'flat';
  onUpdateDiscount: (val: number) => void;
  onUpdateDiscountType: (type: 'percentage' | 'flat') => void;
  taxAmount: number;
  discountAmount: number;
  total: number;
  onCheckout: () => void;
  onHold: () => void;
  isLoading?: boolean;
  selectedCustomer: Customer | null;
}

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export default function CartSidebar({
  items,
  onRemove,
  onUpdateQuantity,
  subtotal,
  taxRate,
  discount,
  discountType,
  onUpdateDiscount,
  onUpdateDiscountType,
  taxAmount,
  discountAmount,
  total,
  onCheckout,
  onHold,
  isLoading,
  selectedCustomer
}: CartSidebarProps) {
  // Compute loyalty points earned (1 point per dollar)
  const pointsEarned = Math.floor(total);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-surface)' }}>
      {/* Header */}
      <div 
        style={{ 
          padding: '16px 20px', 
          borderBottom: '1px solid var(--border)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface)'
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '18px', color: 'white' }}>Current Order</span>
        <span 
          className="pos-badge pos-badge-primary"
          style={{ fontSize: '12px', padding: '4px 10px' }}
        >
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Cart Items Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
        {items.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '48px 24px' }}>
            <ShoppingBag size={64} style={{ color: 'var(--text-muted)', opacity: 0.2 }} />
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)' }}>Your cart is empty</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.7 }}>Add products from the left panel</span>
          </div>
        ) : (
          items.map((item) => (
            <div 
              key={item.product_id} 
              style={{ 
                padding: '12px 20px', 
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              {/* Row 1 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 500, maxWidth: '75%' }}>
                  {item.product.name}
                </span>
                <span style={{ color: 'white', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {formatPrice(item.price_at_sale * item.quantity)}
                </span>
              </div>

              {/* Row 2 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {item.unit}
                </span>
                
                {/* Quantity Control & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button 
                      onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                      style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '50%', 
                        border: '1px solid var(--border)', 
                        backgroundColor: 'var(--bg-elevated)', 
                        color: 'white', 
                        fontSize: '16px',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 150ms'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                    >
                      −
                    </button>
                    
                    {/* BUG 3 Fix: style quantity wrapper correctly */}
                    <span 
                      style={{ 
                        minWidth: '2rem', 
                        textAlign: 'center', 
                        fontSize: '1rem', 
                        fontWeight: 600, 
                        color: 'white', 
                        display: 'inline-block', 
                        padding: '0 8px' 
                      }}
                    >
                      {item.quantity}
                    </span>
                    
                    <button 
                      onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                      style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '50%', 
                        border: '1px solid var(--border)', 
                        backgroundColor: 'var(--bg-elevated)', 
                        color: 'white', 
                        fontSize: '16px',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 150ms'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                    >
                      +
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                      if (confirm(`Remove ${item.product.name} from order?`)) {
                        onRemove(item.product_id);
                      }
                    }}
                    style={{ 
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 150ms'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.color = 'var(--danger)';
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary */}
      <div 
        style={{ 
          padding: '16px 20px', 
          borderTop: '1px solid var(--border)', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px',
          backgroundColor: 'var(--bg-surface)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Subtotal</span>
          <span style={{ color: 'white', fontSize: '14px', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            {formatPrice(subtotal)}
          </span>
        </div>

        {/* Discount Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            <Tag size={14} />
            <span>Discount</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Toggle Pills */}
            <div 
              style={{ 
                display: 'flex', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius-sm)', 
                overflow: 'hidden',
                height: '28px'
              }}
            >
              <button 
                type="button"
                onClick={() => onUpdateDiscountType('percentage')}
                style={{ 
                  border: 'none',
                  padding: '0 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: discountType === 'percentage' ? 'var(--primary)' : 'var(--bg-elevated)',
                  color: discountType === 'percentage' ? 'white' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Percent size={11} />
              </button>
              <button 
                type="button"
                onClick={() => onUpdateDiscountType('flat')}
                style={{ 
                  border: 'none',
                  padding: '0 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: discountType === 'flat' ? 'var(--primary)' : 'var(--bg-elevated)',
                  color: discountType === 'flat' ? 'white' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                $
              </button>
            </div>

            <input 
              type="number"
              min="0"
              step={discountType === 'flat' ? '0.01' : '1'}
              value={discount || ''}
              onChange={(e) => onUpdateDiscount(Math.max(0, Number(e.target.value)))}
              className="pos-input"
              style={{ 
                width: '90px', 
                height: '28px', 
                textAlign: 'right', 
                padding: '0 8px', 
                fontSize: '12px',
                borderColor: ((discountType === 'percentage' && discount > 100) || (discountType === 'flat' && discount > subtotal)) ? 'var(--danger)' : 'var(--border)'
              }}
              placeholder="0"
            />
          </div>
        </div>

        {((discountType === 'percentage' && discount > 100) || (discountType === 'flat' && discount > subtotal)) && (
          <div style={{ color: 'var(--danger)', fontSize: '12px', fontWeight: 600, textAlign: 'right', marginTop: '-4px' }}>
            Discount cannot exceed the order total.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Tax {taxRate}%</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
            {formatPrice(taxAmount)}
          </span>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--border)' }}></div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>TOTAL</span>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: 'white', fontSize: '26px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', display: 'block' }}>
              {formatPrice(total)}
            </span>
            {discountAmount > 0 && (
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--warning)', display: 'block', marginTop: '2px' }}>
                Saved: {formatPrice(discountAmount)}
              </span>
            )}
          </div>
        </div>

        {/* Loyalty Reward Row */}
        {selectedCustomer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warning)', fontSize: '12px', marginTop: '4px' }}>
            <Star size={14} fill="currentColor" />
            <span>{selectedCustomer.name} earns {pointsEarned} pts this order</span>
          </div>
        )}
      </div>

      {/* Cart Actions */}
      <div 
        style={{ 
          padding: '16px 20px', 
          display: 'flex', 
          gap: '8px', 
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--bg-surface)' 
        }}
      >
        <button 
          onClick={onHold}
          disabled={items.length === 0}
          className="pos-btn pos-btn-warning"
          style={{ flex: 1, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: items.length === 0 ? 0.4 : 1, cursor: items.length === 0 ? 'not-allowed' : 'pointer' }}
        >
          <Pause size={18} />
          Hold
        </button>
        <button 
          onClick={onCheckout}
          disabled={isLoading || ((discountType === 'percentage' && discount > 100) || (discountType === 'flat' && discount > subtotal))}
          className="pos-btn pos-btn-primary"
          style={{ 
            flex: 2, 
            height: '44px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            opacity: (isLoading || ((discountType === 'percentage' && discount > 100) || (discountType === 'flat' && discount > subtotal))) ? 0.5 : 1,
            cursor: (isLoading || ((discountType === 'percentage' && discount > 100) || (discountType === 'flat' && discount > subtotal))) ? 'not-allowed' : 'pointer'
          }}
        >
          <CreditCard size={18} />
          Checkout
        </button>
      </div>
    </div>
  );
}
