import { db, type Order, type SyncEntry, type Customer, type Product } from './db';
import { v4 as uuidv4 } from 'uuid';

export async function addToSyncQueue(entityType: SyncEntry['entity_type'], payload: Order | Customer | Product) {
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

export async function processSyncQueue() {
  if (!navigator.onLine) return;

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
            await db.orders.update(entry.payload.id, { sync_status: 'SYNCED' });
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
}
