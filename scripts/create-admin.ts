import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

// Admin client with Service Role (Bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createAdmin() {
    const email = "admin@scanmenu.com";
    const password = "password123";

    console.log(`Creating admin user: ${email}...`);

    // 1. Check if user already exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error("Error listing users:", listError.message);
        process.exit(1);
    }

    const existingUser = users.find(u => u.email === email);
    let userId = existingUser?.id;

    if (existingUser) {
        console.log("User already exists in Auth. Updating profile...");
    } else {
        // 2. Create User
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: "System Admin" }
        });

        if (createError) {
            console.error("Error creating user:", createError.message);
            process.exit(1);
        }

        userId = newUser.user.id;
        console.log("User created in Auth.");
        // Wait for trigger to potentially run
        await new Promise(r => setTimeout(r, 2000));
    }

    if (!userId) {
        console.error("Failed to determine user ID.");
        process.exit(1);
    }

    // 3. Ensure Profile Exists and is Admin
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "Row not found"
        console.error("Error fetching profile:", profileError.message);
    }

    if (profile) {
        // Update existing profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', userId);

        if (updateError) console.error("Error updating profile role:", updateError.message);
        else console.log("Profile updated to Admin role.");
    } else {
        // Insert new profile
        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                email: email,
                full_name: "System Admin",
                role: "admin"
            });

        if (insertError) console.error("Error inserting profile:", insertError.message);
        else console.log("Profile created with Admin role.");
    }
}

createAdmin()
    .then(() => console.log("Done."))
    .catch(e => console.error(e));
