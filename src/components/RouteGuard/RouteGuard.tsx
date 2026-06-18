'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useToasts } from '@/context/ToastContext';
import LockScreen from '@/components/LockScreen/LockScreen';

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { session, login, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToasts();

  // 1. Role-based navigation guarding
  useEffect(() => {
    if (session) {
      if (session.role === 'STAFF' && (pathname === '/catalog' || pathname === '/reports')) {
        router.push('/pos');
        showToast('Access denied. Manager login required.', 'ERROR');
      }
    }
  }, [session, pathname, router, showToast]);

  // 2. Inactivity Auto-Lock (15 minutes)
  useEffect(() => {
    if (!session) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        showToast('Session timed out due to inactivity.', 'INFO');
      }, 15 * 60 * 1000); // 15 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    resetTimer(); // Initialize timer

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [session, logout, showToast]);

  // If no session exists, show Lock Screen
  if (!session) {
    return <LockScreen onLogin={login} />;
  }

  return <>{children}</>;
}
