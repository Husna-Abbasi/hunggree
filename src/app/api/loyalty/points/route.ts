import { createClient } from '@/lib/supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { GoogleWalletService } from '@/lib/google-wallet';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { cardId, pointsToAdd } = await req.json();

        if (!cardId || pointsToAdd === undefined) {
            console.error("[PointsAPI] Missing cardId or pointsToAdd", { cardId, pointsToAdd });
            return NextResponse.json({ error: 'Card ID and points are required' }, { status: 400 });
        }

        console.log(`[PointsAPI] Adding ${pointsToAdd} points to card ${cardId}`);

        const supabase = await createClient();

        // 1. Authenticate Request
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Initialize Admin Client
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 3. Get current card details (using Admin)
        const { data: card, error: fetchError } = await supabaseAdmin
            .from('loyalty_cards')
            // Join restaurants, and then nested join loyalty_programs to get class_id and pass_fields
            .select(`
                *,
                restaurants (
                    name,
                    loyalty_programs (
                        google_class_id,
                        pass_fields
                    )
                )
            `)
            .eq('id', cardId)
            .single();

        if (fetchError || !card) {
            console.error("[PointsAPI] Card not found or error:", fetchError);
            return NextResponse.json({ error: 'Loyalty card not found' }, { status: 404 });
        }

        // 2. Calculate new balance
        const newBalance = (card.current_points || 0) + Number(pointsToAdd);
        const newTotal = (card.total_points_earned || 0) + Number(pointsToAdd);

        // 4. Update Database (using Admin)
        const { error: updateError } = await supabaseAdmin
            .from('loyalty_cards')
            .update({
                current_points: newBalance,
                total_points_earned: newTotal,
                updated_at: new Date().toISOString()
            })
            .eq('id', cardId);

        if (updateError) {
            throw new Error('Failed to update database');
        }

        // 4. Sync to Google Wallet (Async - don't block response if possible, but for now await for safety)
        // Access nested program details safely
        const program = card.restaurants?.loyalty_programs?.[0] || card.restaurants?.loyalty_programs;

        if (card.google_object_id && program?.google_class_id) {
            try {
                await GoogleWalletService.updateLoyaltyObject(
                    card.google_object_id,
                    newBalance,
                    program.google_class_id,
                    card.user_id || `guest-${card.phone_number}`,
                    card.member_name,
                    card.phone_number,
                    program.pass_fields,
                    card.id // Use UUID as barcode value
                );
            } catch (gwError) {
                console.error("[PointsAPI] Google Wallet Sync Failed:", gwError);
                // We don't fail the request if GW sync fails, but we log it.
                // In production, might want a queue system for retries.
            }
        }

        return NextResponse.json({
            success: true,
            newBalance,
            pointsAdded: pointsToAdd
        });

    } catch (error: any) {
        console.error("Points API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
