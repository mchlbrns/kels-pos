'use client';

import React, { createContext, useContext, useState } from 'react';

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

  const login = (pin: string, name: string): boolean => {
    const staffPin = process.env.NEXT_PUBLIC_STAFF_PIN || process.env.VITE_STAFF_PIN || '1234';
    const managerPin = process.env.NEXT_PUBLIC_MANAGER_PIN || process.env.VITE_MANAGER_PIN || '9999';

    if (pin === managerPin) {
      setSession({
        role: 'MANAGER',
        name: name.trim() || 'Maria Santos',
        loginTime: new Date()
      });
      return true;
    } else if (pin === staffPin) {
      setSession({
        role: 'STAFF',
        name: name.trim() || 'Juan dela Cruz',
        loginTime: new Date()
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setSession(null);
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
