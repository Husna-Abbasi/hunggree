'use server';

import { createClient } from '@/lib/supabase-server';

export async function searchMenuItems(query: string) {
    if (!query || query.length < 2) return [];

    const supabase = await createClient();

    const { data, error } = await supabase
        .from('items')
        .select(`
      id,
      name,
      description,
      price,
      image_url,
      restaurants (
        slug,
        name,
        currency
      )
    `)
        .ilike('name', `%${query}%`)
        .eq('is_available', true)
        .limit(10);

    if (error) {
        console.error('Search error:', error);
        return [];
    }

    return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image_url,
        restaurant_slug: item.restaurants?.slug,
        restaurant_name: item.restaurants?.name,
        currency: item.restaurants?.currency || '$',
    }));
}
