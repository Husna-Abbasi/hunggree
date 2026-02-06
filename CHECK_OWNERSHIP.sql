
SELECT 
    r.id as restaurant_id, 
    r.name as restaurant_name, 
    r.owner_id, 
    p.email as owner_email,
    r.whatsapp_number
FROM restaurants r
JOIN profiles p ON r.owner_id = p.id;
