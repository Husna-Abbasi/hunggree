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
        const { restaurantId, memberName } = body;

        if (!restaurantId) {
            return NextResponse.json({ error: 'Restaurant ID required' }, { status: 400 });
        }

        // Get Program Details
        const { data: program, error: progError } = await supabase
            .from('loyalty_programs')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .single();

        if (progError || !program) {
            return NextResponse.json({ error: 'Loyalty program not found' }, { status: 404 });
        }

        // Get Restaurant Name
        const { data: restaurant } = await supabase.from('restaurants').select('name').eq('id', restaurantId).single();

        // Get or Create Loyalty Card
        let { data: card, error: cardError } = await supabase
            .from('loyalty_cards')
            .select('*')
            .eq('user_id', user.id)
            .eq('restaurant_id', restaurantId)
            .single();

        if (!card) {
            // Use restaurantId (not full classId) to avoid double ISSUER_ID prefix
            const objectId = `${restaurantId}-user-${user.id}`;
            const { data: newCard, error: createError } = await supabase
                .from('loyalty_cards')
                .insert({
                    user_id: user.id,
                    restaurant_id: restaurantId,
                    google_object_id: objectId,
                    member_name: memberName || null,
                    current_points: 0,
                    total_points_earned: 0
                })
                .select()
                .single();

            if (createError) throw createError;
            card = newCard;
        } else if (memberName && !card.member_name) {
            // Update existing card with member name if not set
            await supabase
                .from('loyalty_cards')
                .update({ member_name: memberName })
                .eq('id', card.id);
            card.member_name = memberName;
        }

        // Generate Save Link with member name
        const saveLink = GoogleWalletService.generateAddToWalletLink(
            program.google_class_id,
            card.google_object_id!,
            user.id,
            card.current_points,
            restaurant?.name || 'Restaurant',
            card.member_name || memberName || 'Member'
        );

        return NextResponse.json({ success: true, saveLink });
    } catch (error: any) {
        console.error('Loyalty Join Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
