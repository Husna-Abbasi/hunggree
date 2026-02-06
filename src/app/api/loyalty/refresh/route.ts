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
        const { restaurantId, cardId } = body;

        if (!restaurantId) {
            return NextResponse.json({ error: 'Restaurant ID required' }, { status: 400 });
        }

        // Verify user owns this restaurant or is admin
        const { data: restaurant } = await supabase
            .from('restaurants')
            .select('id, name')
            .eq('id', restaurantId)
            .eq('owner_id', user.id)
            .single();

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!restaurant && profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        // Get loyalty cards (all or single)
        let query = supabase
            .from('loyalty_cards')
            .select('*')
            .eq('restaurant_id', restaurantId);

        if (cardId) {
            query = query.eq('id', cardId);
        }

        const { data: cards, error: cardsError } = await query;

        if (cardsError) throw cardsError;

        if (!cards || cards.length === 0) {
            return NextResponse.json({ success: true, message: 'No cards to update', updated: 0 });
        }

        // Get the loyalty program for class ID
        const { data: program } = await supabase
            .from('loyalty_programs')
            .select('google_class_id, pass_fields')
            .eq('restaurant_id', restaurantId)
            .single();

        let updated = 0;
        let failed = 0;
        const results: any[] = [];

        // Update each pass
        for (const card of cards) {
            if (!card.google_object_id) {
                results.push({ id: card.id, status: 'skipped', reason: 'No Google object ID' });
                continue;
            }

            try {
                await GoogleWalletService.updateLoyaltyObject(
                    card.google_object_id,
                    card.current_points,
                    program?.google_class_id,
                    card.user_id,
                    card.member_name || 'Member',
                    card.phone_number || undefined,
                    program?.pass_fields
                );
                updated++;
                results.push({ id: card.id, name: card.member_name, status: 'updated' });
            } catch (e: any) {
                failed++;
                results.push({ id: card.id, name: card.member_name, status: 'failed', error: e.message });
            }
        }

        console.log(`[Refresh] Updated ${updated}/${cards.length} passes for restaurant ${restaurantId}`);

        return NextResponse.json({
            success: true,
            message: `Refreshed ${updated} passes`,
            updated,
            failed,
            total: cards.length,
            results
        });
    } catch (error: any) {
        console.error('Refresh Passes Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
