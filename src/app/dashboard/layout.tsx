"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter, usePathname } from "next/navigation";
import { Button, User, Chip, Spinner } from "@heroui/react";
import { LogOut, Store, ShieldCheck, ListOrdered, Settings, Menu, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/auth/login");
                return;
            }
            setSession(session);

            // Fetch Profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            setProfile(profile);

            // Fetch notification counts (e.g. pending requests for admin)
            if (profile?.role === 'admin') {
                const { count } = await supabase
                    .from('registration_requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'pending');
                setPendingCount(count || 0);
            }

            setLoading(false);
        };

        getSession();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-black text-white">
                <div className="flex flex-col items-center gap-4">
                    <Spinner size="lg" color="primary" />
                    <p className="text-gray-400 animate-pulse">Loading Workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex font-sans">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-black/90 backdrop-blur-xl border-b border-white/10 z-40 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg shadow-primary/20 border border-white/10 bg-zinc-900">
                        <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-cover" unoptimized />
                    </div>
                    <span className="text-lg font-black italic tracking-tighter uppercase">Hunggree</span>
                </div>
                <Button isIconOnly variant="light" onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </Button>
            </div>

            {/* Mobile Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-black border-r border-white/10 p-6 flex flex-col gap-8 transition-transform duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:static md:h-screen md:sticky md:top-0
            `}>
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-primary/20 border border-white/10 bg-zinc-900">
                        <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-cover" unoptimized />
                    </div>
                    <div>
                        <span className="text-xl font-black italic tracking-tighter uppercase">Hunggree</span>
                        <span className="text-[10px] text-gray-500 block font-bold uppercase tracking-widest">Workspace</span>
                    </div>
                </div>

                {profile && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
                        <User
                            name={profile.full_name || session.user.email?.split('@')[0]}
                            description={<span className="text-xs text-blue-400 font-medium">{profile.role?.toUpperCase() || 'OWNER'}</span>}
                            avatarProps={{
                                src: profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&background=random`,
                                isBordered: true,
                                color: "primary",
                                className: "w-10 h-10"
                            }}
                            classNames={{
                                name: "font-semibold text-sm",
                                description: "text-xs"
                            }}
                        />
                    </div>
                )}

                <nav className="flex flex-col gap-2 flex-grow">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 mb-2">Main Menu</p>

                    <Button
                        variant={pathname === '/dashboard' ? "solid" : "light"}
                        color={pathname === '/dashboard' ? "primary" : "default"}
                        className={`w-full justify-start font-medium ${pathname === '/dashboard' ? "text-white" : "text-gray-400 hover:text-white"}`}
                        startContent={<Store size={18} />}
                        onPress={() => router.push('/dashboard')}
                    >
                        Restaurants
                    </Button>

                    {profile?.role === 'admin' && (
                        <Button
                            variant={pathname === '/dashboard/admin' ? "solid" : "light"}
                            color={pathname === '/dashboard/admin' ? "primary" : "default"}
                            className={`w-full justify-start font-medium ${pathname === '/dashboard/admin' ? "text-white" : "text-gray-400 hover:text-white"}`}
                            startContent={<ShieldCheck size={18} />}
                            onPress={() => router.push('/dashboard/admin')}
                        >
                            Admin Panel
                            {pendingCount > 0 && (
                                <Chip size="sm" color="danger" variant="solid" className="ml-auto h-5 min-w-[20px] px-1 text-[10px] font-bold">
                                    {pendingCount}
                                </Chip>
                            )}
                        </Button>
                    )}

                    <Button variant="light" className="justify-start text-gray-400 hover:text-white" startContent={<ListOrdered size={18} />}>
                        Orders <Chip size="sm" color="danger" variant="flat" className="ml-auto h-5">0</Chip>
                    </Button>

                    <Button
                        variant={pathname?.includes('/settings') ? "solid" : "light"}
                        color={pathname?.includes('/settings') ? "primary" : "default"}
                        className={`w-full justify-start font-medium ${pathname?.includes('/settings') ? "text-white" : "text-gray-400 hover:text-white"}`}
                        startContent={<Settings size={18} />}
                        onPress={() => router.push('/dashboard/settings')}
                    >
                        Settings
                    </Button>
                </nav>

                <div className="border-t border-white/5 pt-4">
                    <Button color="danger" variant="light" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10" startContent={<LogOut size={18} />} onPress={handleSignOut}>
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-0 overflow-y-auto h-screen w-full">
                <div className="md:pt-8 pb-20">
                    {children}
                </div>
            </main>
        </div>
    );
}
