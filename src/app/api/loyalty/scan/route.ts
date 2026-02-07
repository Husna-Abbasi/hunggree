import { createClient } from '@/lib/supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { code } = await req.json();

        if (!code) {
            return NextResponse.json({ error: 'QR Code is required' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Authenticate Request
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Initialize Admin Client (Bypass RLS)
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 3. Determine card object ID from code
        const objectId = code;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(objectId);

        // 4. Lookup the loyalty card using Admin Client
        let query = supabaseAdmin
            .from('loyalty_cards')
            .select(`
                *,
                restaurants (
                    name,
                    loyalty_programs (
                        points_per_visit,
                        reward_threshold
                    )
                )
            `);

        if (isUuid) {
            query = query.or(`id.eq.${objectId},google_object_id.eq.${objectId}`);
        } else {
            query = query.eq('google_object_id', objectId);
        }

        const { data: card, error } = await query.single();

        if (error || !card) {
            console.log(`[Scan API] Card not found for code: "${code}"`);
            return NextResponse.json({ error: `Loyalty card not found for code: ${code}` }, { status: 404 });
        }

        const program = card.restaurants?.loyalty_programs?.[0] || card.restaurants?.loyalty_programs;

        return NextResponse.json({
            success: true,
            card: {
                id: card.id,
                memberName: card.member_name || 'Guest',
                phoneNumber: card.phone_number,
                currentPoints: card.current_points,
                totalPoints: card.total_points_earned,
                restaurantName: card.restaurants?.name,
                pointsPerVisit: program?.points_per_visit || 1,
                rewardThreshold: program?.reward_threshold || 10
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
