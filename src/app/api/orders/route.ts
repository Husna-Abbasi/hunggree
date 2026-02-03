import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { restaurant_id, items, total_amount, table_number } = body;

    // 1. Create Order
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            restaurant_id,
            customer_id: session.user.id,
            total_amount,
            status: 'pending',
            table_number
        })
        .select()
        .single();

    if (orderError) {
        return NextResponse.json({ error: orderError.message }, { status: 400 });
    }

    // 2. Create Order Items
    const orderItems = items.map((item: any) => ({
        order_id: order.id,
        item_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price
    }));

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

    if (itemsError) {
        return NextResponse.json({ error: itemsError.message }, { status: 400 });
    }

    return NextResponse.json({ order_id: order.id, status: 'success' });
}
