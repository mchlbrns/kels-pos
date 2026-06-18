'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Role = 'STAFF' | 'MANAGER';

interface AuthContextType {
  role: Role | null;
  login: (role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const savedRole = localStorage.getItem('pos_role') as Role;
    if (savedRole) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRole(savedRole);
    }

    // Sync with localStorage if it changes elsewhere
    const handleStorage = () => {
      const savedRole = localStorage.getItem('pos_role') as Role;
      setRole(savedRole);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = (newRole: Role) => {
    setRole(newRole);
    localStorage.setItem('pos_role', newRole);
  };

  const logout = () => {
    setRole(null);
    localStorage.removeItem('pos_role');
  };

  return (
    <AuthContext.Provider value={{ role, login, logout }}>
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
