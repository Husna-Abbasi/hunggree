import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { GoogleWalletService } from '@/lib/google-wallet';

// POST: Add points to a customer's loyalty card
export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { cardId, restaurantId, pointsToAdd } = body;

        if (!cardId || !restaurantId) {
            return NextResponse.json({ error: 'Card ID and Restaurant ID required' }, { status: 400 });
        }

        // Verify user is owner or admin
        const { data: restaurant } = await supabase
            .from('restaurants')
            .select('owner_id')
            .eq('id', restaurantId)
            .single();

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'admin';
        const isOwner = restaurant?.owner_id === user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get current card with google_object_id
        const { data: card, error: cardError } = await supabase
            .from('loyalty_cards')
            .select('current_points, total_points_earned, google_object_id')
            .eq('id', cardId)
            .eq('restaurant_id', restaurantId)
            .single();

        if (cardError || !card) {
            return NextResponse.json({ error: 'Card not found' }, { status: 404 });
        }

        // Get program for points_per_visit default and classId for wallet
        const { data: program } = await supabase
            .from('loyalty_programs')
            .select('points_per_visit, reward_threshold, google_class_id, pass_fields')
            .eq('restaurant_id', restaurantId)
            .single();

        const addPoints = pointsToAdd || program?.points_per_visit || 1;
        const newPoints = card.current_points + addPoints;
        const newTotal = card.total_points_earned + addPoints;

        // Update card
        const { data: updatedCard, error: updateError } = await supabase
            .from('loyalty_cards')
            .update({
                current_points: newPoints,
                total_points_earned: newTotal,
                updated_at: new Date().toISOString()
            })
            .eq('id', cardId)
            .select('*, user_id, member_name')
            .single();

        if (updateError) throw updateError;

        // Sync to Google Wallet if user has a pass
        if (updatedCard.google_object_id) {
            try {
                await GoogleWalletService.updateLoyaltyObject(
                    updatedCard.google_object_id,
                    newPoints,
                    program?.google_class_id,
                    updatedCard.user_id,
                    updatedCard.member_name,
                    undefined,
                    program?.pass_fields
                );
            } catch (walletError) {
                console.error('Wallet sync failed:', walletError);
                // Don't fail the request if wallet sync fails
            }
        }

        return NextResponse.json({
            success: true,
            card: updatedCard,
            rewardReady: newPoints >= (program?.reward_threshold || 10)
        });
    } catch (error: any) {
        console.error('Add Points Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Redeem reward (reset points)
export async function DELETE(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const cardId = searchParams.get('cardId');
        const restaurantId = searchParams.get('restaurantId');

        if (!cardId || !restaurantId) {
            return NextResponse.json({ error: 'Card ID and Restaurant ID required' }, { status: 400 });
        }

        // Verify user is owner or admin
        const { data: restaurant } = await supabase
            .from('restaurants')
            .select('owner_id')
            .eq('id', restaurantId)
            .single();

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'admin';
        const isOwner = restaurant?.owner_id === user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Reset points to 0
        const { data: updatedCard, error: updateError } = await supabase
            .from('loyalty_cards')
            .update({
                current_points: 0,
                updated_at: new Date().toISOString()
            })
            .eq('id', cardId)
            .eq('restaurant_id', restaurantId)
            .select('*, google_object_id')
            .single();

        if (updateError) throw updateError;

        // Sync to Google Wallet if user has a pass
        if (updatedCard.google_object_id) {
            try {
                await GoogleWalletService.updateLoyaltyObject(updatedCard.google_object_id, 0);
            } catch (walletError) {
                console.error('Wallet sync failed:', walletError);
            }
        }

        return NextResponse.json({
            success: true,
            card: updatedCard,
            message: 'Reward redeemed, points reset to 0'
        });
    } catch (error: any) {
        console.error('Redeem Reward Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
