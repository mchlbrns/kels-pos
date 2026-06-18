import { NextResponse } from 'next/server';
import { pool } from '@/lib/mysql';

export async function POST(request: Request) {
  try {
    const entry = await request.json();
    const { entity_type, payload } = entry;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      if (entity_type === 'ORDER') {
        const { id, local_id, customer_id, total, status, payment_type, items } = payload;

        // Insert Order
        await connection.execute(
          'INSERT INTO pos_orders (id, local_id, customer_id, total, status, payment_type) VALUES (?, ?, ?, ?, ?, ?)',
          [id, local_id, customer_id || null, total, status, payment_type]
        );

        // Insert Order Items
        for (const item of items) {
          await connection.execute(
            'INSERT INTO pos_order_items (order_id, product_id, quantity, price_at_sale) VALUES (?, ?, ?, ?)',
            [id, item.product_id, item.quantity, item.price_at_sale]
          );
        }
      } else if (entity_type === 'PRODUCT') {
        const { id, name, type, unit, base_price, is_variable, allow_override, sku_barcode } = payload;
        await connection.execute(
          'INSERT INTO pos_products (id, name, type, unit, base_price, is_variable, allow_override, sku_barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, name, type, unit, base_price, is_variable, allow_override, sku_barcode || null]
        );
      }

      // Record in sync queue on server as well for history
      await connection.execute(
        'INSERT INTO pos_sync_queue (id, entity_type, payload, status) VALUES (?, ?, ?, ?)',
        [entry.id, entity_type, JSON.stringify(payload), 'SYNCED']
      );

      await connection.commit();
      return NextResponse.json({ success: true });
    } catch (err) {
      await connection.rollback();
      console.error('Database transaction error:', err);
      return NextResponse.json({ success: false, error: 'Transaction failed' }, { status: 500 });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('API sync error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
