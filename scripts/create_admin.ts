import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function createAdmin() {
    const email = "admin@scanmenu.com";
    const password = "password123";

    console.log(`Creating admin user: ${email}...`);

    const { data: user, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "System Admin" },
    });

    if (error) {
        if (error.message.includes("already registered")) {
            console.log("User already exists. Attempting to update role...");
            // If user exists, we might need to find their ID to update the profile
            // But we can't search users easily without admin privileges, which we have.
            const { data: users } = await supabase.auth.admin.listUsers();
            const existingUser = users.users.find((u) => u.email === email);

            if (existingUser) {
                const { error: updateError } = await supabase
                    .from("profiles")
                    .update({ role: "admin" })
                    .eq("id", existingUser.id);

                if (updateError) {
                    console.error("Error updating profile role:", updateError);
                } else {
                    console.log("Successfully updated existing user to admin role.");
                }
            }
        } else {
            console.error("Error creating user:", error);
        }
    } else {
        console.log("User created successfully:", user);
        // The trigger in SCHEMA.sql should handle profile creation, 
        // but we might need to update the role manually if the trigger defaults to 'customer'.

        // Wait a moment for trigger
        await new Promise((r) => setTimeout(r, 1000));

        const { error: updateError } = await supabase
            .from("profiles")
            .update({ role: "admin" })
            .eq("id", user.user.id);

        if (updateError) {
            // If profile doesn't exist yet (trigger failed), insert it manually
            const { error: insertError } = await supabase.from("profiles").insert({
                id: user.user.id,
                email: email,
                full_name: "System Admin",
                role: "admin",
            });

            if (insertError) {
                console.error("Error creating profile manually:", insertError);
            } else {
                console.log("Profile created manually with admin role.");
            }
        } else {
            console.log("Profile role updated to admin.");
        }
    }
}

createAdmin();
