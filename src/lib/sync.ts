import { db, type Order, type SyncEntry } from './db';

export async function addToSyncQueue(entityType: SyncEntry['entity_type'], payload: any) {
  const syncEntry: SyncEntry = {
    id: crypto.randomUUID(),
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
  const pendingEntries = await db.syncQueue
    .where('status')
    .equals('PENDING')
    .toArray();

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
        
        // If it was an order, update its sync status in the orders table
        if (entry.entity_type === 'ORDER') {
            const orderId = entry.payload.id;
            await db.orders.update(orderId, { sync_status: 'SYNCED' });
        }
      } else {
        await db.syncQueue.update(entry.id, { 
          retry_count: entry.retry_count + 1,
          status: entry.retry_count > 5 ? 'FAILED' : 'PENDING'
        });
      }
    } catch (error) {
      console.error('Sync failed for entry:', entry.id, error);
    }
  }
}
