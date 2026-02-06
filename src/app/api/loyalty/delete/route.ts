import { createClient } from '@/lib/supabase-server';
import { GoogleWalletService } from '@/lib/google-wallet';
import { NextResponse } from 'next/server';

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

        // Verify user owns this restaurant
        const { data: restaurant } = await supabase
            .from('restaurants')
            .select('id')
            .eq('id', restaurantId)
            .eq('owner_id', user.id)
            .single();

        // Also check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!restaurant && profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Not authorized to manage this restaurant' }, { status: 403 });
        }

        // Get the card to find the Google object ID
        const { data: card, error: cardError } = await supabase
            .from('loyalty_cards')
            .select('google_object_id')
            .eq('id', cardId)
            .eq('restaurant_id', restaurantId)
            .single();

        if (cardError || !card) {
            return NextResponse.json({ error: 'Card not found' }, { status: 404 });
        }

        // Archive the pass in Google Wallet (makes it EXPIRED for the user)
        if (card.google_object_id) {
            try {
                await GoogleWalletService.archiveLoyaltyObject(card.google_object_id);
            } catch (walletError: any) {
                console.error('Failed to archive pass in Google Wallet:', walletError);
                // Continue with deletion even if wallet archive fails
            }
        }

        // Delete the card from database
        const { error: deleteError } = await supabase
            .from('loyalty_cards')
            .delete()
            .eq('id', cardId);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true, message: 'Card deleted and pass archived' });
    } catch (error: any) {
        console.error('Delete Card Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
