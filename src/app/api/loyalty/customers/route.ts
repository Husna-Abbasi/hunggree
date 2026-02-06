import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET: List all loyalty customers for a restaurant
export async function GET(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const search = searchParams.get('search') || '';

    if (!restaurantId) {
        return NextResponse.json({ error: 'Restaurant ID required' }, { status: 400 });
    }

    try {
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

        // Get loyalty cards (without join to avoid errors)
        const { data: cards, error: cardsError } = await supabase
            .from('loyalty_cards')
            .select('id, current_points, total_points_earned, created_at, updated_at, user_id, google_object_id')
            .eq('restaurant_id', restaurantId)
            .order('updated_at', { ascending: false });

        if (cardsError) {
            console.error('Cards fetch error:', cardsError);
            throw cardsError;
        }

        // Fetch profiles for each card's user_id
        const userIds = (cards || []).map((c: any) => c.user_id).filter(Boolean);
        let profilesMap: Record<string, any> = {};

        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, phone')
                .in('id', userIds);

            if (profiles) {
                profiles.forEach((p: any) => {
                    profilesMap[p.id] = p;
                });
            }
        }

        // Combine cards with profiles
        const cardsWithProfiles = (cards || []).map((card: any) => ({
            ...card,
            profiles: profilesMap[card.user_id] || null
        }));

        // Get program details for threshold info
        const { data: program, error: programError } = await supabase
            .from('loyalty_programs')
            .select('reward_threshold, reward_description, points_per_visit')
            .eq('restaurant_id', restaurantId)
            .maybeSingle();

        if (programError) {
            console.error('Program fetch error:', programError);
        }

        // Filter by search if provided
        let filteredCards = cardsWithProfiles;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredCards = filteredCards.filter((card: any) => {
                const profile = card.profiles;
                if (!profile) return false;
                return (
                    profile.full_name?.toLowerCase().includes(searchLower) ||
                    profile.phone?.includes(search)
                );
            });
        }

        return NextResponse.json({
            customers: filteredCards,
            program: program || null,
            total: filteredCards.length
        });
    } catch (error: any) {
        console.error('Loyalty Customers Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
