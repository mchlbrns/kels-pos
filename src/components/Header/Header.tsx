'use client';

import OfflineIndicator from "@/components/OfflineIndicator/OfflineIndicator";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from './Header.module.css';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useState } from "react";

export default function Header() {
  const { session, logout } = useAuth();
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogoutClick = () => {
    const logoutEvent = new Event('request-pos-logout', { cancelable: true });
    window.dispatchEvent(logoutEvent);

    if (!logoutEvent.defaultPrevented) {
      logout();
    }
  };

  const isManager = session?.role === 'MANAGER';

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/pos" className={styles.title}>
          <span className={styles.logoIcon}>⚡</span>
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
        <OfflineIndicator />
        {session && (
          <div className={styles.desktopUserControls}>
            <div className={styles.userBadge} title={`Role: ${session.role}`}>
              <User size={14} />
              <span>{session.name}</span>
            </div>
            {isManager && (
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-pos-settings'))} 
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
                      window.dispatchEvent(new CustomEvent('open-pos-settings'));
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
  );
}
