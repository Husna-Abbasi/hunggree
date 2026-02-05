const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = require('dotenv').config({ path: envPath });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
    console.log("Verifying Database State...");

    // 1. Count Auth Users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) console.error("Auth Error:", authError);
    console.log(`Auth Users: ${users?.length || 0}`);

    // 2. Count Profiles
    const { count: profileCount, error: profError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    console.log(`Profiles: ${profileCount} (Error: ${profError?.message || 'None'})`);

    // 3. Count Restaurants
    const { count: restCount, error: restError } = await supabase.from('restaurants').select('*', { count: 'exact', head: true });
    console.log(`Restaurants: ${restCount} (Error: ${restError?.message || 'None'})`);

    // 4. Check Admin User
    console.log("\nChecking Admin Users:");
    const admins = users?.filter(u => u.email.includes('admin') || u.email.includes('scanmenu')); // Heuristic based on logs

    for (const u of admins || []) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', u.id).single();
        const { count: myTests } = await supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('owner_id', u.id);

        console.log(`- User: ${u.email}`);
        console.log(`  ID: ${u.id}`);
        console.log(`  Profile Role: ${profile?.role}`);
        console.log(`  Owned Restaurants: ${myTests}`);
    }

    // 5. Check Orphaned Restaurants
    const { data: allRests } = await supabase.from('restaurants').select('id, name, owner_id');
    const orphanCount = allRests?.filter(r => !users.find(u => u.id === r.owner_id)).length;
    console.log(`\nOrphaned Restaurants (Invalid Owner ID): ${orphanCount}`);

    // 6. Compare with Backup (Interactive)
    const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise(resolve => readline.question(`\n${q}`, resolve));

    try {
        const backupPath = await ask("Enter path to backup file to compare (or press Enter to skip): ");
        if (backupPath && fs.existsSync(backupPath.trim())) {
            const backup = JSON.parse(fs.readFileSync(backupPath.trim(), 'utf8'));
            const backupUsers = backup.data.auth_users || [];

            console.log(`\n=== COMPARISON ===`);
            console.log(`Backup Users: ${backupUsers.length}`);
            console.log(`DB Users: ${users.length}`);

            const dbEmails = new Set(users.map(u => u.email));
            const missing = backupUsers.filter(u => !dbEmails.has(u.email));

            if (missing.length > 0) {
                console.log(`\n❌ MISSING USERS (${missing.length}):`);
                missing.forEach(u => console.log(`- ${u.email} (ID: ${u.id})`));
                console.log("\nThese users failed to migrate. Their restaurants are likely skipped.");
            } else {
                console.log("\n✅ All users from backup exist in DB.");
            }

            const backupRests = backup.data.restaurants || [];
            console.log(`\nBackup Restaurants: ${backupRests.length}`);
            console.log(`DB Restaurants: ${allRests.length}`);

            // Check missing restaurants by name/slug (ID might differ? No we kept UUIDs for rests)
            const dbRestIds = new Set(allRests.map(r => r.id));
            const missingRests = backupRests.filter(r => !dbRestIds.has(r.id));

            if (missingRests.length > 0) {
                console.log(`\n❌ MISSING RESTAURANTS (${missingRests.length}):`);
                missingRests.forEach(r => console.log(`- ${r.name} (Owner: ${r.owner_id})`));
            }

        }
    } catch (e) {
        console.error("Comparison failed:", e.message);
    } finally {
        readline.close();
    }
}

verify();
