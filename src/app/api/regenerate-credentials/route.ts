
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { restaurantId } = await request.json();

        if (!restaurantId) {
            return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
        }

        // Initialize Supabase Admin Client
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // 1. Fetch the restaurant details to get the Owner ID and Metadata
        const { data: restaurant, error: restError } = await supabaseAdmin
            .from('restaurants')
            .select('*')
            .eq('id', restaurantId)
            .single();

        if (restError || !restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        if (!restaurant.owner_id) {
            return NextResponse.json({ error: 'Restaurant has no owner assigned' }, { status: 400 });
        }

        // 2. Generate New Credentials
        const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2).toUpperCase();

        // 3. Update User Password
        const { data: userData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            restaurant.owner_id,
            { password: generatedPassword }
        );

        if (updateError) {
            return NextResponse.json({ error: 'Failed to update user password: ' + updateError.message }, { status: 500 });
        }

        // 4. Return the new credentials (using the restaurant's stored whatsapp number as the login identifier)
        return NextResponse.json({
            success: true,
            credentials: {
                phone: restaurant.whatsapp_number,
                password: generatedPassword,
                restaurantName: restaurant.name
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
