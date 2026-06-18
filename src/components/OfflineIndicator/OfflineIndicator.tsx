'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import styles from './OfflineIndicator.module.css';

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  return (
    <div className={`${styles.container} ${isOnline ? styles.online : styles.offline}`}>
      <span 
        className={`${styles.dot} ${isOnline ? styles.dotOnline : styles.dotOffline} pulsing-dot`}
      ></span>
      <span>
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
