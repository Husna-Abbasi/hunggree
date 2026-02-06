
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { restaurantId } = await request.json();

        if (!restaurantId) {
            return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
        }

        // Initialize Supabase Admin Client
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // 1. Fetch the restaurant details to get the Owner ID and Metadata
        const { data: restaurant, error: restError } = await supabaseAdmin
            .from('restaurants')
            .select('*')
            .eq('id', restaurantId)
            .single();

        if (restError || !restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        if (!restaurant.owner_id) {
            return NextResponse.json({ error: 'Restaurant has no owner assigned' }, { status: 400 });
        }

        // --- OWNERSHIP CHECK & REPAIR ---
        // Check if the current owner is the "Admin" (shared account).
        // If so, we must create a dedicated user for this restaurant + transfer ownership 
        // BEFORE resetting the password, otherwise we reset the Admin's password!

        let targetOwnerId = restaurant.owner_id;

        // Fetch the current owner's profile/user data to check role/email
        const { data: currentOwnerUser, error: ownerFetchError } = await supabaseAdmin.auth.admin.getUserById(restaurant.owner_id);

        // Identify if "Admin" by email or role
        // Hardcoded check for known admin email or if role is 'admin' (from metadata or profile, but simplest is email)
        const isAdmin = currentOwnerUser?.user?.email === 'admin@scanmenu.com' ||
            currentOwnerUser?.user?.user_metadata?.role === 'admin';

        if (isAdmin) {
            console.log(`[RegenCreds] Restaurant ${restaurant.name} is owned by Admin (${currentOwnerUser?.user?.email}). creating dedicated user...`);

            const cleanPhone = restaurant.whatsapp_number.replace(/\D/g, '');
            const shadowEmail = `${cleanPhone}@login.hunggree`;
            const tempPassword = Math.random().toString(36).slice(-8) + "Aa1"; // we will overwrite this below anyway

            // Check if dedicated user already exists (by email)
            // listUsers is paginated, but we can try to "get" by creating? No.
            // Admin API doesn't have "getUserByEmail". We have to list.
            // Optimization: Just try to create. If fails with "already registered", then find it.

            let newOwnerId = null;

            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: shadowEmail,
                password: tempPassword,
                email_confirm: true,
                user_metadata: {
                    role: 'restaurant_owner',
                    phone: cleanPhone
                }
            });

            if (createError) {
                if (createError.message.includes("already registered") || createError.message.includes("unique")) {
                    console.log(`[RegenCreds] User ${shadowEmail} already exists. Finding ID...`);
                    // Fallback: list users and find matches. expensive but robust.
                    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
                    const existing = users.find(u => u.email === shadowEmail);
                    if (existing) {
                        newOwnerId = existing.id;
                    } else {
                        return NextResponse.json({ error: 'User exists but could not be found' }, { status: 500 });
                    }
                } else {
                    return NextResponse.json({ error: 'Failed to create dedicated user: ' + createError.message }, { status: 500 });
                }
            } else {
                newOwnerId = newUser.user.id;
                // Create Profile
                await supabaseAdmin.from('profiles').upsert({
                    id: newOwnerId,
                    email: shadowEmail,
                    full_name: restaurant.name,
                    role: 'restaurant_owner'
                });
            }

            if (newOwnerId) {
                // Transfer Ownership
                const { error: transferError } = await supabaseAdmin
                    .from('restaurants')
                    .update({ owner_id: newOwnerId })
                    .eq('id', restaurantId);

                if (transferError) {
                    return NextResponse.json({ error: 'Failed to transfer ownership: ' + transferError.message }, { status: 500 });
                }

                targetOwnerId = newOwnerId;
                console.log(`[RegenCreds] Ownership transferred to ${newOwnerId}`);
            }
        }
        // --------------------------------

        // 2. Generate New Credentials
        const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2).toUpperCase();

        // 3. Update User Password
        const { data: userData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            targetOwnerId,
            { password: generatedPassword }
        );

        if (updateError || !userData.user) {
            return NextResponse.json({ error: 'Failed to update user password: ' + (updateError?.message || 'Unknown error') }, { status: 500 });
        }

        // Determine Login Identifier
        let loginIdentifier = restaurant.whatsapp_number;
        const email = userData.user.email || '';
        const isShadowEmail = email.endsWith('@login.hunggree');

        if (!isShadowEmail) {
            loginIdentifier = email;
        }

        // 4. Return the new credentials
        return NextResponse.json({
            success: true,
            credentials: {
                loginIdentifier: loginIdentifier,
                phone: restaurant.whatsapp_number, // Keep for reference
                password: generatedPassword,
                restaurantName: restaurant.name,
                isEmail: !isShadowEmail
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
