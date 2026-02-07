import { createClient } from '@/lib/supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Admin Client for user creation/management
const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to verify Admin access
async function verifyAdmin(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') return null;
    return user;
}

export async function GET(req: Request) {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createClient();
    const { data: agents, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'agent')
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ agents });
}

export async function POST(req: Request) {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { email, phone, password, fullName } = await req.json();

    if ((!email && !phone) || !password || !fullName) {
        return NextResponse.json({ error: 'Missing required fields. Provide Email OR Phone.' }, { status: 400 });
    }

    // Determine Login Identifier
    let finalEmail = email;
    let finalPhone = phone;

    // Shadow Email Logic: If no email, use phone@agent.hunggree.com
    if (!email && phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        finalEmail = `${cleanPhone}@agent.hunggree.com`;
    }

    // Create user via Admin Client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: finalEmail,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: fullName,
            role: 'agent',
            phone_number: finalPhone
        }
    });

    if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({
        agent: newUser.user,
        generatedEmail: !email ? finalEmail : undefined
    });
}

export async function DELETE(req: Request) {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('id');

    if (!agentId) return NextResponse.json({ error: 'Missing agent ID' }, { status: 400 });

    const { error } = await supabaseAdmin.auth.admin.deleteUser(agentId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}

export async function PUT(req: Request) {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { agentId, newPassword } = await req.json();

    if (!agentId || !newPassword) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const { error } = await supabaseAdmin.auth.admin.updateUserById(agentId, {
        password: newPassword
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
