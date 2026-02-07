import { createClient } from '@/lib/supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// Initialize Admin Client
const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    const supabase = await createClient();

    // 1. Verify Agent Role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .single();

    // Allow Admins or Agents
    if (profile?.role !== 'agent' && profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden. Agent role required.' }, { status: 403 });
    }

    const {
        restaurantName,
        whatsappNumber,
        address,
        ownerEmail,
        ownerName,
        ownerPhone,
        latitude,
        longitude
    } = await req.json();

    if (!restaurantName || !whatsappNumber || !ownerEmail || !ownerName) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Create Owner Account
    // Generate a random 8-char password
    const tempPassword = nanoid(8);

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: ownerEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
            full_name: ownerName,
            role: 'restaurant_owner'
        }
    });

    if (authError) {
        return NextResponse.json({ error: `User creation failed: ${authError.message}` }, { status: 500 });
    }

    const ownerId = authUser.user.id;

    // 3. Create Restaurant (Approved & Active)
    // Generate slug from name
    const slug = restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + nanoid(4);

    const { data: restaurant, error: restError } = await supabaseAdmin
        .from('restaurants')
        .insert({
            owner_id: ownerId,
            name: restaurantName,
            slug: slug,
            whatsapp_number: whatsappNumber,
            address: address,
            phone: ownerPhone || whatsappNumber,
            is_active: true,
            onboarding_status: 'approved', // Auto-approve
            admin_notes: `Onboarded by Agent: ${profile.email} (${user.id})`,
            onboarded_by: user.id,
            latitude: latitude || null,
            longitude: longitude || null
        })
        .select()
        .single();

    if (restError) {
        // Rollback user creation? Ideally yes, but for now just report error
        console.error("Restaurant creation failed, user exists:", ownerId, restError);
        return NextResponse.json({ error: `Restaurant creation failed: ${restError.message}` }, { status: 500 });
    }

    // 4. Return Credentials
    return NextResponse.json({
        success: true,
        credentials: {
            restaurantName: restaurant.name,
            loginId: ownerEmail,
            password: tempPassword,
            ownerName: ownerName
        }
    });

}
