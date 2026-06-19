import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { type SyncEntry, type Order, type Customer, type Product, type Setting } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const entry: SyncEntry = await request.json();
    const { entity_type, payload } = entry;

    const entityId = 'id' in payload ? payload.id : ('key' in payload ? payload.key : 'unknown');
    console.log(`Processing sync entry: ${entity_type}`, entityId);

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
    } else if (entity_type === 'SETTING') {
      const settingPayload = payload as Setting;
      await prisma.setting.upsert({
        where: { key: settingPayload.key },
        update: {
          value: settingPayload.value,
          updatedAt: new Date(settingPayload.updated_at),
        },
        create: {
          key: settingPayload.key,
          value: settingPayload.value,
          updatedAt: new Date(settingPayload.updated_at),
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

export async function GET() {
  try {
    const products = await prisma.product.findMany();
    const customers = await prisma.customer.findMany();
    const orders = await prisma.order.findMany({
      include: {
        items: true,
      },
    });
    const settings = await prisma.setting.findMany();

    return NextResponse.json({
      success: true,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        unit: p.unit,
        base_price: Number(p.basePrice),
        is_variable: p.isVariable,
        allow_override: p.allowOverride,
        sku_barcode: p.skuBarcode || undefined,
      })),
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || undefined,
        loyalty_id: c.loyaltyId || undefined,
        points: c.points,
        total_visits: c.totalVisits,
      })),
      orders: orders.map((o) => ({
        id: o.id,
        local_id: o.localId || o.id,
        customer_id: o.customerId || undefined,
        total: Number(o.total),
        status: o.status,
        payment_type: o.paymentType,
        created_at: new Date(o.createdAt).getTime(),
        sync_status: 'SYNCED',
        items: o.items.map((item) => ({
          product_id: item.productId,
          quantity: Number(item.quantity),
          price_at_sale: Number(item.priceAtSale),
          unit: item.unit,
        })),
      })),
      settings: settings.map((s) => ({
        key: s.key,
        value: s.value,
        updated_at: new Date(s.updatedAt).getTime(),
      })),
    });
  } catch (error: unknown) {
    console.error('Sync GET API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
