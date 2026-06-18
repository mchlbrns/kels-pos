'use client';

import React, { useState } from 'react';
import { Lock, User, ShieldAlert } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface LockScreenProps {
  onLogin: (pin: string, name: string) => boolean;
}

export default function LockScreen({ onLogin }: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [cashierName, setCashierName] = useState('');
  const [error, setError] = useState('');
  const focusTrapRef = useFocusTrap(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError('Please enter a PIN.');
      return;
    }
    const success = onLogin(pin, cashierName);
    if (!success) {
      setError('Incorrect PIN. Please try again.');
      setPin('');
    }
  };

  const handleNumClick = (num: string) => {
    setError('');
    if (pin.length < 6) {
      setPin(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setError('');
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError('');
    setPin('');
  };

  return (
    <div 
      ref={focusTrapRef}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-base)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflowY: 'auto',
        padding: '20px'
      }}
    >
      <div 
        className="pos-card"
        style={{
          width: '420px',
          maxWidth: '100%',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)'
        }}
      >
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div 
            style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '50%', 
              backgroundColor: 'rgba(59, 130, 246, 0.1)', 
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '4px'
            }}
          >
            <Lock size={28} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'white', letterSpacing: '0.02em' }}>⚡ KELS POS</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Omnichannel Retail System</p>
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cashier Name
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Enter your name (e.g. Juan dela Cruz)" 
                className="pos-input"
                style={{ width: '100%', paddingLeft: '36px' }}
                value={cashierName}
                onChange={e => setCashierName(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Enter Staff PIN or Manager PIN to continue
            </label>
            <input 
              type="password"
              inputMode="numeric"
              placeholder="••••"
              className="pos-input"
              style={{ width: '100%', height: '48px', fontSize: '20px', letterSpacing: '0.3em', textAlign: 'center', borderColor: error ? 'var(--danger)' : 'var(--border)' }}
              value={pin}
              onChange={e => {
                setError('');
                setPin(e.target.value.replace(/\D/g, ''));
              }}
            />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontSize: '13px', fontWeight: 600 }}>
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Numeric Keypad */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '10px', 
              marginTop: '8px' 
            }}
          >
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumClick(num)}
                className="pos-btn pos-btn-ghost"
                style={{ height: '48px', fontSize: '18px', fontWeight: 700 }}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="pos-btn pos-btn-ghost"
              style={{ height: '48px', fontSize: '13px', fontWeight: 700, color: 'var(--danger)' }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleNumClick('0')}
              className="pos-btn pos-btn-ghost"
              style={{ height: '48px', fontSize: '18px', fontWeight: 700 }}
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="pos-btn pos-btn-ghost"
              style={{ height: '48px', fontSize: '13px', fontWeight: 700 }}
            >
              ⌫
            </button>
          </div>

          <button 
            type="submit" 
            className="pos-btn pos-btn-primary"
            style={{ width: '100%', height: '48px', marginTop: '12px', fontSize: '15px' }}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
