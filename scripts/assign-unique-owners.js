const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Service Role Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const ADMIN_EMAIL = 'admin@scanmenu.com';

async function assignUniqueOwners() {
    console.log("=== FIXING RESTAURANT OWNERSHIP ===\n");

    // 1. Get Admin Details
    const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers();
    if (uErr) throw uErr;

    const adminUser = users.find(u => u.email === ADMIN_EMAIL);
    if (!adminUser) {
        console.error("Admin user not found. Aborting.");
        process.exit(1);
    }
    const adminId = adminUser.id;
    console.log(`Admin ID: ${adminId} (${ADMIN_EMAIL})`);

    // 2. Get all restaurants owned by Admin
    const { data: restaurants, error: rErr } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', adminId);

    if (rErr) throw rErr;

    console.log(`Found ${restaurants.length} restaurants incorrectly owned by Admin.\n`);

    if (restaurants.length === 0) {
        console.log("No restaurants need fixing.");
        process.exit(0);
    }

    // 3. Loop and Create Users
    for (const rest of restaurants) {
        console.log(`Processing: ${rest.name} (${rest.whatsapp_number})...`);

        const cleanPhone = rest.whatsapp_number.replace(/\D/g, '');
        const shadowEmail = `${cleanPhone}@login.hunggree`;
        const password = Math.random().toString(36).slice(-8) + "Aa1"; // simple random password

        // Check if user already exists
        let userId = null;
        const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
        // This is inefficient but fine for a script
        const existing = existingUsers.find(u => u.email === shadowEmail);

        if (existing) {
            console.log(`  User already exists: ${shadowEmail}`);
            userId = existing.id;
        } else {
            console.log(`  Creating user: ${shadowEmail}`);
            const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
                email: shadowEmail,
                password: password, // Temporary, admin can reset later or we print it
                email_confirm: true,
                user_metadata: {
                    role: 'restaurant_owner',
                    phone: cleanPhone
                }
            });

            if (createErr) {
                console.error(`  FAILED to create user: ${createErr.message}`);
                continue;
            }
            userId = newUser.user.id;
            console.log(`  Created user ID: ${userId}`);

            // Ensure profile exists with correct role
            await supabase.from('profiles').upsert({
                id: userId,
                email: shadowEmail,
                full_name: rest.name,
                role: 'restaurant_owner'
            });
        }

        // 4. Update Restaurant Owner
        const { error: updateErr } = await supabase
            .from('restaurants')
            .update({ owner_id: userId })
            .eq('id', rest.id);

        if (updateErr) {
            console.error(`  FAILED to update owner: ${updateErr.message}`);
        } else {
            console.log(`  Successfully transferred ownership to ${shadowEmail}`);
        }
    }

    console.log("\n=== DONE ===");
    console.log("NOTE: Use the Admin Dashboard 'Reset Password' button to generate new passwords for these owners.");
}

assignUniqueOwners();
