import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';

// Initialize Service Role Client for Admin Operations
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

export async function GET(request: Request) {
    // 1. Verify Requestor is an Admin
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    try {
        // 2. Fetch Data from All Major Tables using Service Role
        // Using Promise.all for parallel fetching
        const [
            { data: restaurants },
            { data: categories },
            { data: items },
            { data: orders },
            { data: orderItems },
            { data: profiles },
            { data: loyaltyPrograms },
            { data: loyaltyCards }
        ] = await Promise.all([
            supabaseAdmin.from('restaurants').select('*'),
            supabaseAdmin.from('categories').select('*'),
            supabaseAdmin.from('items').select('*'),
            supabaseAdmin.from('orders').select('*'),
            supabaseAdmin.from('order_items').select('*'),
            supabaseAdmin.from('profiles').select('*'),
            supabaseAdmin.from('loyalty_programs').select('*'),
            supabaseAdmin.from('loyalty_cards').select('*')
        ]);

        // Fetch ALL Users (Pagination)
        let allUsers: any[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
                page: page,
                perPage: 1000
            });

            if (error || !users || users.length === 0) {
                hasMore = false;
            } else {
                allUsers = [...allUsers, ...users];
                if (users.length < 1000) hasMore = false;
                page++;
            }
        }

        // 3. Construct Export Object
        const exportData = {
            timestamp: new Date().toISOString(),
            generated_by: user.email,
            data: {
                auth_users: allUsers,
                restaurants: restaurants || [],
                categories: categories || [],
                items: items || [],
                orders: orders || [],
                order_items: orderItems || [],
                profiles: profiles || [],
                loyalty_programs: loyaltyPrograms || [],
                loyalty_cards: loyaltyCards || []
            },
            meta: {
                counts: {
                    restaurants: restaurants?.length || 0,
                    orders: orders?.length || 0,
                    users: profiles?.length || 0
                }
            }
        };

        // 4. Return as JSON
        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="hunggree_backup_${new Date().toISOString().split('T')[0]}.json"`
            }
        });

    } catch (error: any) {
        console.error("Export failed:", error);
        return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
    }
}
