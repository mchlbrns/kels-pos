'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'STAFF' | 'MANAGER';

export interface Session {
  role: Role;
  name: string;
  loginTime: Date;
}

interface AuthContextType {
  session: Session | null;
  login: (pin: string, name: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  // Load session from sessionStorage on mount to prevent SSR hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('pos_session');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Parse stringified Date
          parsed.loginTime = new Date(parsed.loginTime);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSession(parsed);
        } catch {
          sessionStorage.removeItem('pos_session');
        }
      }
    }
  }, []);

  const login = (pin: string, name: string): boolean => {
    const staffPin = process.env.NEXT_PUBLIC_STAFF_PIN || process.env.VITE_STAFF_PIN || '1234';
    const managerPin = process.env.NEXT_PUBLIC_MANAGER_PIN || process.env.VITE_MANAGER_PIN || '9999';

    if (pin === managerPin) {
      const newSession: Session = {
        role: 'MANAGER',
        name: name.trim() || 'Maria Santos',
        loginTime: new Date()
      };
      setSession(newSession);
      sessionStorage.setItem('pos_session', JSON.stringify(newSession));
      return true;
    } else if (pin === staffPin) {
      const newSession: Session = {
        role: 'STAFF',
        name: name.trim() || 'Juan dela Cruz',
        loginTime: new Date()
      };
      setSession(newSession);
      sessionStorage.setItem('pos_session', JSON.stringify(newSession));
      return true;
    }
    return false;
  };

  const logout = () => {
    setSession(null);
    sessionStorage.removeItem('pos_session');
  };

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
