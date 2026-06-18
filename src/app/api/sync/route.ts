import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { type SyncEntry, type Order, type Customer, type Product } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const entry: SyncEntry = await request.json();
    const { entity_type, payload } = entry;

    console.log(`Processing sync entry: ${entity_type}`, payload.id);

    if (entity_type === 'ORDER') {
      const orderPayload = payload as Order;
      // Create or update order in cloud database
      await prisma.order.upsert({
        where: { id: orderPayload.id },
        update: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: orderPayload.status as any,
          total: orderPayload.total,
          paymentType: orderPayload.payment_type,
          items: {
            deleteMany: {}, // Delete existing items to recreate them
            create: orderPayload.items.map((item) => ({
              productId: item.product_id,
              quantity: item.quantity,
              priceAtSale: item.price_at_sale,
              unit: item.unit,
            })),
          },
        },
        create: {
          id: orderPayload.id,
          localId: orderPayload.local_id,
          customerId: orderPayload.customer_id,
          total: orderPayload.total,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: orderPayload.status as any,
          paymentType: orderPayload.payment_type,
          createdAt: new Date(orderPayload.created_at),
          items: {
            create: orderPayload.items.map((item) => ({
              productId: item.product_id,
              quantity: item.quantity,
              priceAtSale: item.price_at_sale,
              unit: item.unit,
            })),
          },
        },
      });
    } else if (entity_type === 'CUSTOMER') {
      const customerPayload = payload as Customer;
      await prisma.customer.upsert({
        where: { id: customerPayload.id },
        update: {
          name: customerPayload.name,
          phone: customerPayload.phone,
          loyaltyId: customerPayload.loyalty_id,
          points: customerPayload.points,
          totalVisits: customerPayload.total_visits,
        },
        create: {
          id: customerPayload.id,
          name: customerPayload.name,
          phone: customerPayload.phone,
          loyaltyId: customerPayload.loyalty_id,
          points: customerPayload.points,
          totalVisits: customerPayload.total_visits,
        },
      });
    } else if (entity_type === 'PRODUCT') {
      const productPayload = payload as Product;
      await prisma.product.upsert({
        where: { id: productPayload.id },
        update: {
          name: productPayload.name,
          type: productPayload.type,
          unit: productPayload.unit,
          basePrice: productPayload.base_price,
          isVariable: productPayload.is_variable,
          allowOverride: productPayload.allow_override,
          skuBarcode: productPayload.sku_barcode || null,
        },
        create: {
          id: productPayload.id,
          name: productPayload.name,
          type: productPayload.type,
          unit: productPayload.unit,
          basePrice: productPayload.base_price,
          isVariable: productPayload.is_variable,
          allowOverride: productPayload.allow_override,
          skuBarcode: productPayload.sku_barcode || null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Sync API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
