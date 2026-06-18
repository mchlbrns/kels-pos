'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Camera, X, RefreshCw, CheckCircle, Barcode } from 'lucide-react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  // Query first product in the catalog with a barcode/SKU set
  const mockProduct = useLiveQuery(async () => {
    return await db.products.filter(p => !!p.sku_barcode).first();
  });

  // Focus input automatically to support USB HID Scanners (which act as keyboards)
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleManualScan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const barcode = inputRef.current?.value;
    if (barcode) {
      processBarcode(barcode);
    }
  };

  const processBarcode = (barcode: string) => {
    setScanStatus('success');
    setTimeout(() => {
      onScan(barcode);
      if (inputRef.current) inputRef.current.value = '';
      setScanStatus('idle');
    }, 500);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-[4px]"
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
    >
      <div 
        className="pos-card"
        style={{ width: '440px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Modal Header */}
        <div 
          style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Barcode size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'white' }}>Scan Barcode</h3>
          </div>
          <button 
            onClick={onClose}
            className="pos-btn-icon"
            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Camera placeholder area */}
          <div 
            style={{ 
              backgroundColor: 'var(--bg-elevated)', 
              border: '2px dashed var(--border)', 
              borderRadius: 'var(--radius-md)', 
              height: '180px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px',
              position: 'relative'
            }}
          >
            {scanStatus === 'success' ? (
              <div 
                style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  backgroundColor: 'rgba(34, 197, 94, 0.15)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <CheckCircle size={48} style={{ color: 'var(--success)' }} />
              </div>
            ) : (
              <>
                <Camera size={40} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Camera Access Placeholder</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'serif', fontStyle: 'italic' }}>Camera integration coming soon</span>
              </>
            )}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative', margin: '8px 0' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: '1px', backgroundColor: 'var(--border)' }}></div>
            <span style={{ position: 'relative', backgroundColor: 'var(--bg-surface)', padding: '0 12px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>OR</span>
          </div>

          {/* Manual Entry */}
          <form onSubmit={handleManualScan} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Manual Entry / USB Scanner
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                ref={inputRef}
                type="text" 
                placeholder="Place cursor here for USB scanner..."
                className="pos-input"
                style={{ flex: 1, height: '44px' }}
              />
              <button 
                type="submit" 
                className="pos-btn pos-btn-primary"
                style={{ height: '44px' }}
              >
                Apply
              </button>
            </div>
          </form>

          {/* Simulate Button */}
          <button 
            type="button"
            onClick={() => {
              if (mockProduct && mockProduct.sku_barcode) {
                processBarcode(mockProduct.sku_barcode);
              } else {
                alert("No products with barcodes found. Add a SKU to a catalog item first.");
              }
            }}
            className="pos-btn pos-btn-ghost"
            style={{ width: '100%', height: '40px', fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={14} />
            Simulate Scan ({mockProduct ? mockProduct.name : 'None'})
          </button>
        </div>
      </div>
    </div>
  );
}
