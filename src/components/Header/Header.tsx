'use client';

import OfflineIndicator from "@/components/OfflineIndicator/OfflineIndicator";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import styles from './Header.module.css';

export default function Header() {
  const { role, login, logout } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/" className={styles.title}>
          <h1>POS System</h1>
        </Link>
        <nav className={styles.nav}>
          <Link href="/">Orders</Link>
          {role === 'MANAGER' && <Link href="/catalog">Catalog</Link>}
          {role === 'MANAGER' && <Link href="/reports">Reports</Link>}
        </nav>
      </div>
      
      <div className={styles.right}>
        <OfflineIndicator />
        {role ? (
          <div className={styles.user}>
            <span>{role}</span>
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
