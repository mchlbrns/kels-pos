'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Circle } from 'lucide-react';
import styles from './OfflineIndicator.module.css';

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  return (
    <div className={styles.container}>
      <Circle 
        size={12} 
        fill={isOnline ? '#4caf50' : '#f44336'} 
        stroke={isOnline ? '#4caf50' : '#f44336'}
      />
      <span className={styles.text}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
