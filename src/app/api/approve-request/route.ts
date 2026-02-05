
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { requestId } = await request.json();

        if (!requestId) {
            return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
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

        // 1. Fetch the request details
        const { data: reqData, error: reqError } = await supabaseAdmin
            .from('registration_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (reqError || !reqData) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        if (reqData.status === 'approved') {
            return NextResponse.json({ error: 'Request already approved' }, { status: 400 });
        }

        // 2. Generate Credentials
        // Clean phone number (remove non-digits)
        const cleanPhone = reqData.whatsapp_number.replace(/\D/g, '');
        const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2).toUpperCase(); // e.g. "x82k1m9Z"

        // We will create a user using a dummy email because Phone+Password creation can be finicky depending on provider settings
        // But allow them to login with the dummy email OR we handle the login page translation.
        // actually, let's try creating with Phone first. unique property is phone.

        // NOTE: To support "Phone + Password" login without OTP, we actually usually need to cheat a bit by using a dummy email, 
        // OR we rely on the project having "Phone" provider enabled and we use the Admin API to set the password.
        // Let's use a dummy email based on phone number to be 100% safe and simple for now, 
        // UNLESS the prompt explicitly asked for phone login (it did).
        // The previous login page update sends { phone: ... }, so we should try to create a user with that phone.

        // STRATEGY: "Shadow Email"
        // We implicitly enable Phone Login by creating an email user: "PHONE_NUMBER@login.hunggree"
        // This bypasses the need for the Supabase Phone Provider to be enabled.
        const shadowEmail = `${cleanPhone}@login.hunggree`;

        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: shadowEmail,
            password: generatedPassword,
            email_confirm: true,
            user_metadata: {
                role: 'restaurant_owner',
                phone: cleanPhone // Store real phone in metadata
            }
        });

        if (userError) {
            console.error("User creation failed:", userError);
            // Fallback: Create with dummy email if phone fails (e.g. duplicate phone, or provider disabled)
            if (userError.message.includes("phone")) {
                return NextResponse.json({ error: 'Failed to create user with phone number. Ensure Phone Auth is enabled or number is unique.' }, { status: 500 });
            }
            return NextResponse.json({ error: userError.message }, { status: 500 });
        }

        // 3. Create Profile
        // The trigger might handle this, but let's be sure since we're using admin client
        await supabaseAdmin.from('profiles').insert({
            id: userData.user.id,
            full_name: reqData.restaurant_name, // Use Restaurant Name as placeholder name
            role: 'restaurant_owner'
        }).select();

        // 4. Create Restaurant
        const slug = reqData.restaurant_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

        const { error: restError } = await supabaseAdmin.from('restaurants').insert({
            owner_id: userData.user.id,
            name: reqData.restaurant_name,
            address: reqData.address,
            whatsapp_number: reqData.whatsapp_number,
            slug: slug,
            onboarding_status: 'approved',
            is_active: true
        });

        if (restError) {
            return NextResponse.json({ error: 'Failed to create restaurant: ' + restError.message }, { status: 500 });
        }

        // 5. Update Request Status
        await supabaseAdmin
            .from('registration_requests')
            .update({ status: 'approved' })
            .eq('id', requestId);

        return NextResponse.json({
            success: true,
            credentials: {
                phone: cleanPhone,
                password: generatedPassword,
                restaurantName: reqData.restaurant_name
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
