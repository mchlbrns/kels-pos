'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

type Role = 'STAFF' | 'MANAGER';

interface PinModalProps {
  role: Role;
  onConfirm: () => void;
  onClose: () => void;
}

const getExpectedPin = (role: Role) => {
  if (role === 'MANAGER') {
    return process.env.NEXT_PUBLIC_MANAGER_PIN || process.env.VITE_MANAGER_PIN || '9999';
  }

  return process.env.NEXT_PUBLIC_STAFF_PIN || process.env.VITE_STAFF_PIN || '1234';
};

export default function PinModal({ role, onConfirm, onClose }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const focusTrapRef = useFocusTrap(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (pin !== getExpectedPin(role)) {
      setError('Incorrect PIN. Please try again.');
      return;
    }

    onConfirm();
  };

  return (
    <div
      ref={focusTrapRef}
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
        className="pos-card"
        style={{
          width: '360px',
          maxWidth: '92vw',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>{role === 'MANAGER' ? 'Manager' : 'Staff'} PIN</span>
          <button type="button" onClick={onClose} className="pos-btn-icon" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Enter PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            className="pos-input"
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, ''));
              setError('');
            }}
            style={{ height: '44px', fontSize: '18px', letterSpacing: '0.2em', textAlign: 'center' }}
          />
          {error && (
            <span style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: 600 }}>
              {error}
            </span>
          )}
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', backgroundColor: 'var(--bg-surface)' }}>
          <button type="button" onClick={onClose} className="pos-btn pos-btn-ghost" style={{ flex: 1, height: '40px' }}>
            Cancel
          </button>
          <button type="submit" className="pos-btn pos-btn-primary" style={{ flex: 1, height: '40px' }}>
            Login
          </button>
        </div>
      </form>
    </div>
  );
}
