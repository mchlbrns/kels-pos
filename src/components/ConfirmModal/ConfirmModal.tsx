'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmModalProps) {
  const focusTrapRef = useFocusTrap(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

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
      <div
        className="pos-card"
        style={{
          width: '380px',
          maxWidth: '92vw',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>{title}</span>
          </div>
          <button type="button" onClick={onCancel} className="pos-btn-icon" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
          {message}
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', backgroundColor: 'var(--bg-surface)' }}>
          <button type="button" onClick={onCancel} className="pos-btn pos-btn-ghost" style={{ flex: 1, height: '40px' }}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="pos-btn pos-btn-danger" style={{ flex: 1, height: '40px' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
