import { createClient } from '@/lib/supabase-server';
import { GoogleWalletService } from '@/lib/google-wallet';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const {
            restaurantId,
            programName,
            pointsPerVisit,
            rewardThreshold,
            rewardDescription,
            logoUrl,
            wideLogoUrl,
            heroImageUrl,
            backgroundColor,
            passFields
        } = body;

        if (!restaurantId || !programName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify ownership (or admin check)
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const isAdmin = profile?.role === 'admin';

        const { data: restaurant, error: restError } = await supabase
            .from('restaurants')
            .select('owner_id, name')
            .eq('id', restaurantId)
            .single();

        if (restError || !restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        if (!isAdmin && restaurant.owner_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Create/Update Google Wallet Class with design options
        const classId = await GoogleWalletService.createLoyaltyClass(
            restaurantId,
            programName,
            restaurant.name,
            {
                logoUrl,
                wideLogoUrl,
                heroImageUrl,
                backgroundColor
            }
        );

        // Save to DB
        const { error: dbError } = await supabase
            .from('loyalty_programs')
            .upsert({
                restaurant_id: restaurantId,
                program_name: programName,
                points_per_visit: pointsPerVisit || 1,
                reward_threshold: rewardThreshold || 10,
                reward_description: rewardDescription || 'Free Item',
                google_class_id: classId,
                logo_url: logoUrl,
                wide_logo_url: wideLogoUrl,
                hero_image_url: heroImageUrl,
                background_color: backgroundColor || '#1a1a1a',
                pass_fields: passFields,
                updated_at: new Date().toISOString()
            }, { onConflict: 'restaurant_id' });

        if (dbError) throw dbError;

        return NextResponse.json({ success: true, classId });
    } catch (error: any) {
        console.error('Loyalty Setup Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
