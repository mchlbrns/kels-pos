import { db, type Order, type SyncEntry, type Customer, type Product, type Setting } from './db';
import { v4 as uuidv4 } from 'uuid';

export async function addToSyncQueue(entityType: SyncEntry['entity_type'], payload: Order | Customer | Product | Setting) {
  const syncEntry: SyncEntry = {
    id: uuidv4(),
    entity_type: entityType,
    payload,
    status: 'PENDING',
    retry_count: 0,
    created_at: Date.now(),
  };

  await db.syncQueue.add(syncEntry);
  
  // Try to sync immediately if online
  if (navigator.onLine) {
    processSyncQueue();
  }
}

let isSyncing = false;

export async function processSyncQueue() {
  if (isSyncing) return;
  if (!navigator.onLine) return;

  isSyncing = true;
  try {
    const pendingEntries = await db.syncQueue
      .where('status')
      .equals('PENDING')
      .toArray();

    console.log(`Syncing ${pendingEntries.length} entries...`);

    for (const entry of pendingEntries) {
      try {
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(entry),
        });

        if (response.ok) {
          await db.syncQueue.update(entry.id, { status: 'SYNCED' });
          
          if (entry.entity_type === 'ORDER') {
              await db.orders.update((entry.payload as Order).id, { sync_status: 'SYNCED' });
          }
        } else {
          const nextRetry = entry.retry_count + 1;
          await db.syncQueue.update(entry.id, { 
            retry_count: nextRetry,
            status: nextRetry > 5 ? 'FAILED' : 'PENDING'
          });
        }
      } catch (error) {
        console.error(`Sync failed for entry ${entry.id}:`, error);
      }
    }

    // Pull the latest catalog updates from the server
    await pullFromServer();
  } finally {
    isSyncing = false;
  }
}

export async function pullFromServer() {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  try {
    const response = await fetch('/api/sync');
    if (!response.ok) throw new Error('Failed to fetch sync data');
    const data = await response.json();
    if (data.success) {
      console.log(`Pulled ${data.products.length} products, ${data.customers.length} customers, and ${data.orders ? data.orders.length : 0} orders from server.`);
      
      // Update products in local db
      if (data.products && data.products.length > 0) {
        await db.products.bulkPut(data.products);
      }
      
      // Update customers in local db
      if (data.customers && data.customers.length > 0) {
        await db.customers.bulkPut(data.customers);
      }

      // Update orders in local db
      if (data.orders && data.orders.length > 0) {
        await db.orders.bulkPut(data.orders);
      }

      // Update settings in local db
      if (data.settings && data.settings.length > 0) {
        await db.settings.bulkPut(data.settings);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pos-settings-synced'));
        }
      }
    }
  } catch (error) {
    console.error('Failed to pull from server:', error);
  }
}
