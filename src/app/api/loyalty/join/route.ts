import { createClient } from '@/lib/supabase-server';
import { GoogleWalletService } from '@/lib/google-wallet';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        const body = await req.json();
        const { restaurantId, memberName, phoneNumber } = body;

        if (!restaurantId) {
            return NextResponse.json({ error: 'Restaurant ID required' }, { status: 400 });
        }

        if (!phoneNumber) {
            return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
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

        // Get or Create Loyalty Card (by phone number)
        let { data: card, error: cardError } = await supabase
            .from('loyalty_cards')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('phone_number', phoneNumber)
            .single();

        if (!card) {
            // Use random UUID for objectId to ensure privacy (no phone number in ID)
            const objectId = crypto.randomUUID();
            const { data: newCard, error: createError } = await supabase
                .from('loyalty_cards')
                .insert({
                    user_id: user?.id || null,
                    restaurant_id: restaurantId,
                    google_object_id: objectId,
                    member_name: memberName || null,
                    phone_number: phoneNumber,
                    current_points: 0,
                    total_points_earned: 0
                })
                .select()
                .single();

            if (createError) throw createError;
            card = newCard;

            // If we just created the card, we might want to ensure the pass is created with the correct barcode immediately
            // But the generate link below will handle the initial creation payload via JWT claim.
            // The `card.id` is now available to be used as barcode.
        } else if (memberName && !card.member_name) {
            // Update existing card with member name if not set
            await supabase
                .from('loyalty_cards')
                .update({
                    member_name: memberName,
                    user_id: user?.id || card.user_id
                })
                .eq('id', card.id);
            card.member_name = memberName;
        }

        // Generate Save Link with member name and phone
        const saveLink = GoogleWalletService.generateAddToWalletLink(
            program.google_class_id,
            card.google_object_id!,
            user?.id || `guest-${phoneNumber.replace(/\D/g, '')}`,
            card.current_points,
            restaurant?.name || 'Restaurant',
            card.member_name || memberName || 'Member',
            phoneNumber,
            program.pass_fields,
            card.id // Use UUID as barcode value
        );

        return NextResponse.json({ success: true, saveLink });
    } catch (error: any) {
        console.error('Loyalty Join Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
