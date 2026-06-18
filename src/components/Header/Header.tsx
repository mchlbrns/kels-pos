'use client';

import OfflineIndicator from "@/components/OfflineIndicator/OfflineIndicator";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from './Header.module.css';
import { Settings, User } from 'lucide-react';

export default function Header() {
  const { role, login, logout } = useAuth();
  const pathname = usePathname();

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
          {role === 'MANAGER' && (
            <Link href="/catalog" className={`${styles.navLink} ${pathname === '/catalog' ? styles.activeNavLink : ''}`}>
              Catalog
            </Link>
          )}
          {role === 'MANAGER' && (
            <Link href="/reports" className={`${styles.navLink} ${pathname === '/reports' ? styles.activeNavLink : ''}`}>
              Reports
            </Link>
          )}
        </nav>
      </div>
      
      <div className={styles.right}>
        <OfflineIndicator />
        {role ? (
          <div className={styles.right}>
            <div className={styles.userBadge}>
              <User size={14} />
              <span>{role}</span>
            </div>
            {role === 'MANAGER' && (
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-pos-settings'))} 
                className={styles.settingsBtn}
                title="Settings"
              >
                <Settings size={20} />
              </button>
            )}
            <button onClick={logout} className={styles.logoutBtn}>Logout</button>
          </div>
        ) : (
          <div className={styles.login}>
            <button onClick={() => login('STAFF')}>Staff Login</button>
            <button onClick={() => login('MANAGER')}>Manager Login</button>
          </div>
        )}
      </div>
    </header>
  );
}
