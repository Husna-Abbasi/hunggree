const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Colors for console
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m"
};

const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);

// Main Restoration Function
async function restoreDatabase() {
    log("\n=== HUNGGREE DATABASE MIGRATION WIZARD ===\n", colors.cyan);

    // 1. Get Configuration
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const ask = (q) => new Promise(resolve => readline.question(colors.bright + q + colors.reset, resolve));

    const backupFile = await ask("Path to backup JSON file (e.g., hunggree_backup.json): ");

    if (!fs.existsSync(backupFile)) {
        log(`Error: File '${backupFile}' not found.`, colors.red);
        process.exit(1);
    }

    const newUrl = await ask("New Supabase URL: ");
    const newKey = await ask("New Supabase SERVICE_ROLE_KEY: ");

    log("\nInitializing Connection...", colors.yellow);

    const supabase = createClient(newUrl.trim(), newKey.trim(), {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const rawData = fs.readFileSync(backupFile, 'utf8');
    const backup = JSON.parse(rawData);
    const data = backup.data;

    log(`Loaded backup from ${backup.timestamp}`, colors.green);

    if (!data.auth_users) {
        log("\nERROR: This backup file is missing 'auth_users'.", colors.red);
        log("It seems you are using an OLD backup file.", colors.yellow);
        log("Please go to Admin Settings > Data Management and download a NEW backup.", colors.yellow);
        process.exit(1);
    }

    log(`Found: ${data.auth_users.length} Users, ${data.restaurants.length} Restaurants.\n`, colors.green);

    // ID Mapping (Old ID -> New ID)
    const idMap = new Map();

    // 2. Restore Users & Map IDs
    log("Step 1: Migrating Users...", colors.cyan);
    for (const user of data.auth_users) {
        // Skip if email is missing (shouldn't happen)
        if (!user.email) continue;

        log(`Creating user: ${user.email}...`);

        // Create user in new DB
        // Note: Passwords cannot be migrated via API. Setting temporary password.
        const { data: newUser, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: "TemporaryPassword123!", // User will need to reset
            email_confirm: true,
            user_metadata: user.user_metadata
        });

        if (error) {
            log(`  Failed: ${error.message}`, colors.red);
            // Try to find if user already exists to map ID
            if (error.message.includes("already been registered") || error.status === 422) {
                log(`  User exists. Fetching ID to remap...`, colors.yellow);
                // We need to find this user's ID. Since getUserByEmail isn't always exposed cleanly in admin without list:
                // We'll search for it.
                // Optimally we'd cache this but for a script this is fine.
                const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
                const match = existingUsers.find(u => u.email === user.email);

                if (match) {
                    idMap.set(user.id, match.id);
                    log(`  Mapped (Existing) ${user.id} -> ${match.id}`, colors.green);
                } else {
                    log(`  Could not find existing user ${user.email} to map!`, colors.red);
                }
            }
        } else {
            idMap.set(user.id, newUser.user.id);
            log(`  Mapped ${user.id} -> ${newUser.user.id}`, colors.green);
        }
    }

    // Helper to remap IDs in an object
    const remap = (obj, fields) => {
        const newObj = { ...obj };
        fields.forEach(field => {
            if (newObj[field] && idMap.has(newObj[field])) {
                newObj[field] = idMap.get(newObj[field]);
            }
        });
        return newObj;
    };

    // 3. Restore Profiles (Public Table)
    log("\nStep 2: Migrating Profiles...", colors.cyan);
    // Filter profiles to only those we have mapped (avoid orphan rows)
    const profilesToInsert = data.profiles
        .map(p => remap(p, ['id'])) // Remap the PRIMARY KEY 'id' which matches auth.users.id
        .filter(p => idMap.has(data.profiles.find(old => old.id === p.id)?.id || '')); // Ensure valid ID? 
    // Actually, since we remapped 'id', let's just check validity.
    // Wait, if idMap has the old ID, remap() changed it to the new ID.

    // Simpler loop
    for (const profile of data.profiles) {
        // If we have a new ID for this user, insert profile with NEW ID
        if (idMap.has(profile.id)) {
            const newId = idMap.get(profile.id);
            await supabase.from('profiles').upsert({
                ...profile,
                id: newId
            });
        }
    }
    log("Profiles migrated.", colors.green);

    // 4. Restore Restaurants
    log("\nStep 3: Migrating Restaurants...", colors.cyan);
    // Filter restaurants where owner exists in New DB (idMap)
    const restaurantsToInsert = data.restaurants
        .filter(r => idMap.has(r.owner_id)) // Only insert if owner was migrated
        .map(r => remap(r, ['owner_id']));

    if (data.restaurants.length > restaurantsToInsert.length) {
        log(`Warning: Skipped ${data.restaurants.length - restaurantsToInsert.length} restaurants due to missing owners.`, colors.yellow);
    }

    const { error: restError } = await supabase.from('restaurants').upsert(restaurantsToInsert);
    if (restError) log(`Error: ${restError.message}`, colors.red);
    else log(`Restaurants migrated: ${restaurantsToInsert.length}`, colors.green);

    // 5. Restore Categories
    log("\nStep 4: Migrating Categories...", colors.cyan);
    // Only insert categories for restaurants that exist (were migrated)
    const migratedRestaurantIds = new Set(restaurantsToInsert.map(r => r.id));
    const categoriesToInsert = data.categories.filter(c => migratedRestaurantIds.has(c.restaurant_id));

    const { error: catError } = await supabase.from('categories').upsert(categoriesToInsert);
    if (catError) log(`Error: ${catError.message}`, colors.red);

    // 6. Restore Items
    log("\nStep 5: Migrating Items...", colors.cyan);
    const itemsToInsert = data.items.filter(i => migratedRestaurantIds.has(i.restaurant_id));
    const { error: itemError } = await supabase.from('items').upsert(itemsToInsert);
    if (itemError) log(`Error: ${itemError.message}`, colors.red);

    // 7. Restore Loyalty Programs
    log("\nStep 6: Migrating Loyalty Config...", colors.cyan);
    const programsToInsert = data.loyalty_programs.filter(p => migratedRestaurantIds.has(p.restaurant_id));
    const { error: loyError } = await supabase.from('loyalty_programs').upsert(programsToInsert);
    if (loyError) log(`Error: ${loyError.message}`, colors.red);

    // 8. Restore Loyalty Cards (Depends on User & Restaurant)
    log("\nStep 7: Migrating Loyalty Cards...", colors.cyan);
    const cardsToInsert = data.loyalty_cards
        .filter(c => migratedRestaurantIds.has(c.restaurant_id) && (!c.user_id || idMap.has(c.user_id)))
        .map(c => remap(c, ['user_id']));
    const { error: cardError } = await supabase.from('loyalty_cards').upsert(cardsToInsert);
    if (cardError) log(`Error: ${cardError.message}`, colors.red);

    // 9. Restore Orders (Depends on User & Restaurant)
    log("\nStep 8: Migrating Orders...", colors.cyan);
    const ordersToInsert = data.orders
        .filter(o => migratedRestaurantIds.has(o.restaurant_id) && (!o.customer_id || idMap.has(o.customer_id)))
        .map(o => remap(o, ['customer_id']));

    if (data.orders.length > ordersToInsert.length) {
        log(`Warning: Skipped ${data.orders.length - ordersToInsert.length} orders due to missing users/restaurants.`, colors.yellow);
    }

    const { error: ordError } = await supabase.from('orders').upsert(ordersToInsert);
    if (ordError) log(`Error: ${ordError.message}`, colors.red);

    // 10. Restore Order Items
    log("\nStep 9: Migrating Order Items...", colors.cyan);
    // Must filter order items where order exists
    // Since we kept original UUIDs for orders, we can check if order ID is in our inserted list
    const migratedOrderIds = new Set(ordersToInsert.map(o => o.id));
    const orderItemsToInsert = data.order_items.filter(oi => migratedOrderIds.has(oi.order_id));

    const { error: oiError } = await supabase.from('order_items').upsert(orderItemsToInsert);
    if (oiError) log(`Error: ${oiError.message}`, colors.red);

    log("\n=== MIGRATION COMPLETE ===", colors.bright);
    log("Note: All users have been reset with password 'TemporaryPassword123!'.", colors.yellow);
    process.exit(0);
}

restoreDatabase().catch(e => {
    log(`Fatal Error: ${e.message}`, colors.red);
    process.exit(1);
});
