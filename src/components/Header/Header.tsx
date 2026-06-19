'use client';

import OfflineIndicator from "@/components/OfflineIndicator/OfflineIndicator";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from './Header.module.css';
import { ChevronDown, LogOut, Settings, User, ShoppingBag, Receipt, Package, TrendingUp, Sun, Moon, Store } from 'lucide-react';
import { useState, useEffect } from "react";

export default function Header() {
  const { session, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('pos_theme');
      return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('pos_theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogoutClick = () => {
    const logoutEvent = new Event('request-pos-logout', { cancelable: true });
    window.dispatchEvent(logoutEvent);

    if (!logoutEvent.defaultPrevented) {
      logout();
    }
  };

  const isManager = session?.role === 'MANAGER';

  return (
    <>
      <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/pos" className={styles.title}>
          <Store size={22} className={styles.logoIcon} style={{ color: 'var(--primary)' }} />
          <span>KELS POS</span>
        </Link>
        <nav className={styles.nav}>
          <Link href="/pos" className={`${styles.navLink} ${pathname === '/pos' ? styles.activeNavLink : ''}`}>
            POS
          </Link>
          <Link href="/orders" className={`${styles.navLink} ${pathname === '/orders' ? styles.activeNavLink : ''}`}>
            Orders
          </Link>
          {isManager && (
            <Link href="/catalog" className={`${styles.navLink} ${pathname === '/catalog' ? styles.activeNavLink : ''}`}>
              Catalog
            </Link>
          )}
          {isManager && (
            <Link href="/reports" className={`${styles.navLink} ${pathname === '/reports' ? styles.activeNavLink : ''}`}>
              Reports
            </Link>
          )}
        </nav>
      </div>
      
      <div className={styles.right}>
        <button 
          onClick={toggleTheme} 
          className={styles.themeToggleBtn}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          aria-label="Toggle theme"
          type="button"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <OfflineIndicator />
        {session && (
          <div className={styles.desktopUserControls}>
            <div className={styles.userBadge} title={`Role: ${session.role}`}>
              <User size={14} />
              <span>{session.name}</span>
            </div>
            {isManager && (
              <button 
                onClick={() => {
                  if (pathname === '/pos') {
                    window.dispatchEvent(new CustomEvent('open-pos-settings'));
                  } else {
                    router.push('/pos?settings=true');
                  }
                }} 
                className={styles.settingsBtn}
                title="Settings"
              >
                <Settings size={20} />
              </button>
            )}
            <button onClick={handleLogoutClick} className={styles.logoutBtn}>Logout</button>
          </div>
        )}
        {session && (
          <div className={styles.mobileUserMenu}>
            <button
              type="button"
              className={styles.mobileUserButton}
              onClick={() => setIsUserMenuOpen((open) => !open)}
              aria-expanded={isUserMenuOpen}
              aria-label="User menu"
            >
              <User size={18} />
              <ChevronDown size={16} />
            </button>
            {isUserMenuOpen && (
              <div className={styles.mobileUserDropdown}>
                <div className={styles.mobileRole}>{session.name}</div>
                {isManager && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      if (pathname === '/pos') {
                        window.dispatchEvent(new CustomEvent('open-pos-settings'));
                      } else {
                        router.push('/pos?settings=true');
                      }
                    }}
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    handleLogoutClick();
                  }}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>

    {session && (
      <nav className={styles.bottomNav}>
        <Link href="/pos" className={`${styles.bottomNavLink} ${pathname === '/pos' ? styles.bottomActiveNavLink : ''}`}>
          <ShoppingBag size={20} />
          <span>POS</span>
        </Link>
        <Link href="/orders" className={`${styles.bottomNavLink} ${pathname === '/orders' ? styles.bottomActiveNavLink : ''}`}>
          <Receipt size={20} />
          <span>Orders</span>
        </Link>
        {isManager && (
          <Link href="/catalog" className={`${styles.bottomNavLink} ${pathname === '/catalog' ? styles.bottomActiveNavLink : ''}`}>
            <Package size={20} />
            <span>Catalog</span>
          </Link>
        )}
        {isManager && (
          <Link href="/reports" className={`${styles.bottomNavLink} ${pathname === '/reports' ? styles.bottomActiveNavLink : ''}`}>
            <TrendingUp size={20} />
            <span>Reports</span>
          </Link>
        )}
      </nav>
    )}
    </>
  );
}
