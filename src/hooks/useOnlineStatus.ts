'use client';

import { useState, useEffect } from 'react';
import { processSyncQueue } from '@/lib/sync';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    // Process any pending sync items immediately if we are online on mount
    if (typeof window !== 'undefined' && navigator.onLine) {
      processSyncQueue();
    }

    const handleOnline = () => {
      setIsOnline(true);
      processSyncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
