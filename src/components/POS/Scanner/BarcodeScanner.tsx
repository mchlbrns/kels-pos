'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Camera, X, RefreshCw, CheckCircle } from 'lucide-react';
import { db } from '@/lib/db';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md overflow-hidden relative shadow-2xl">
        {/* Scanner Viewport Placeholder */}
        <div className="aspect-square bg-black relative flex items-center justify-center overflow-hidden">
          {/* Animated Scan Line */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
             <div className="w-64 h-64 border-2 border-blue-500/30 rounded-3xl relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse"></div>
             </div>
          </div>

          {scanStatus === 'success' && (
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center z-10 animate-in fade-in duration-200">
               <CheckCircle size={80} className="text-green-500" />
            </div>
          )}

          <div className="absolute bottom-6 text-gray-400 text-sm font-medium flex items-center gap-2">
            <Camera size={16} />
            Camera Access Placeholder
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 bg-gray-900">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-bold text-lg">Scan Barcode</h3>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleManualScan} className="space-y-4">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Manual Entry / USB Scanner</p>
            <div className="relative">
               <input 
                ref={inputRef}
                type="text" 
                placeholder="Place cursor here for USB Scanner..."
                className="w-full bg-gray-800 border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
              <button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
              >
                Apply
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-800 flex justify-center">
            <button 
              onClick={() => processBarcode('1001')} // Mock premium beans
              className="text-blue-400 text-sm hover:underline flex items-center gap-2"
            >
              <RefreshCw size={14} />
              Simulate Successful Scan (Beans)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
