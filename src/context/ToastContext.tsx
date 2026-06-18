'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO';
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO') => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(current => current.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO' = 'INFO') => {
    const id = Math.random().toString();
    setToasts(current => {
      const updated = [...current, { id, message, type }];
      // Keep at most 3 toasts, removing the oldest (first in array)
      if (updated.length > 3) {
        return updated.slice(updated.length - 3);
      }
      return updated;
    });

    setTimeout(() => {
      dismissToast(id);
    }, 3000); // Auto-dismiss after 3 seconds
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} dismissToast={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToasts() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToasts must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, dismissToast }: { toasts: Toast[], dismissToast: (id: string) => void }) {
  return (
    <div 
      style={{ 
        position: 'fixed', 
        bottom: '24px', 
        right: '24px', 
        zIndex: 9999, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px',
        maxWidth: '350px',
        width: 'calc(100vw - 48px)'
      }}
    >
      {toasts.map(toast => {
        const bgColor = 
          toast.type === 'SUCCESS' ? 'var(--success)' : 
          toast.type === 'ERROR' ? 'var(--danger)' : 
          toast.type === 'WARNING' ? 'var(--warning)' : 
          'var(--primary)';
        
        return (
          <div 
            key={toast.id}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              backgroundColor: 'var(--bg-surface)', 
              border: `1px solid ${bgColor}`,
              borderRadius: 'var(--radius-md)', 
              padding: '12px 16px', 
              boxShadow: 'var(--shadow)',
              animation: 'toastOpen 200ms ease-out'
            }}
          >
            {toast.type === 'SUCCESS' && <CheckCircle size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />}
            {(toast.type === 'ERROR' || toast.type === 'WARNING') && <AlertTriangle size={18} style={{ color: bgColor, flexShrink: 0 }} />}
            {toast.type === 'INFO' && <Info size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500, flex: 1 }}>
              {toast.message}
            </span>
            <button 
              onClick={() => dismissToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
