"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import {
    Button, Card, CardBody, Spinner, Chip,
} from "@heroui/react";
import {
    PlusCircle, QrCode, MapPin, Phone, Store, DollarSign, ListOrdered, Clock, Download, X, ExternalLink
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import QrStickerModal from "@/components/QrStickerModal";

export default function DashboardPage() {
    const [session, setSession] = useState<any>(null);
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [qrModal, setQrModal] = useState<{ isOpen: boolean, restaurant: any | null }>({ isOpen: false, restaurant: null });
    const [newRestValues, setNewRestValues] = useState({ name: "", address: "", whatsapp: "", description: "" });
    const [isCreating, setIsCreating] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/auth/login");
                return;
            }
            setSession(session);
            fetchRestaurants(session.user.id);
        };

        getSession();
    }, [router]);

    const fetchRestaurants = async (userId: string) => {
        // Fetch Profile Role first to determine access
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();

        // Fetch Restaurants
        let query = supabase
            .from('restaurants')
            .select('*')
            .order('created_at', { ascending: false });

        // Only restrict to owner_id if NOT admin
        if (profile?.role !== 'admin') {
            query = query.eq('owner_id', userId);
        }

        const { data: rests } = await query;
        if (rests) setRestaurants(rests);

        setLoading(false);
    };

    const handleCreateRestaurant = async () => {
        if (!newRestValues.name || !newRestValues.whatsapp) {
            alert("Name and WhatsApp number are required");
            return;
        }

        setIsCreating(true);
        const slug = newRestValues.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

        const { error } = await supabase.from('restaurants').insert({
            owner_id: session.user.id,
            name: newRestValues.name,
            address: newRestValues.address,
            whatsapp_number: newRestValues.whatsapp,
            description: newRestValues.description,
            slug: slug,
            onboarding_status: 'approved', // Auto-approve if created by dashboard? Or pending? Setup implies dashboard creation is for established users.
            is_active: true
        });

        if (error) {
            alert(error.message);
        } else {
            await fetchRestaurants(session.user.id);
            setIsModalOpen(false);
            setNewRestValues({ name: "", address: "", whatsapp: "", description: "" });
        }
        setIsCreating(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Spinner size="lg" color="primary" />
            </div>
        );
    }

    return (
        <>
            <header className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6 md:mb-10">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter uppercase">Overview</h1>
                    <p className="text-gray-400 text-sm mt-1">Manage your restaurants and menus from one place.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 w-full md:w-auto"
                >
                    <PlusCircle size={20} />
                    Add Restaurant
                </button>
            </header>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10">
                {[
                    { label: "Total Restaurants", value: restaurants.length, icon: Store, color: "text-primary" },
                    { label: "Active Orders", value: "0", icon: ListOrdered, color: "text-secondary" },
                    { label: "Total Revenue", value: `${restaurants[0]?.currency || '$'}0.00`, icon: DollarSign, color: "text-green-500" },
                ].map((stat, i) => (
                    <div key={i} className="p-6 rounded-[32px] bg-zinc-900 border border-white/5 flex items-center gap-4 transition-all hover:border-white/10 group">
                        <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                            <stat.icon size={26} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{stat.label}</p>
                            <p className="text-3xl font-black italic tracking-tighter uppercase">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <h2 className="text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                <Store size={20} className="text-primary" />
                Your Restaurants
            </h2>

            {restaurants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-zinc-900/30 rounded-[40px] border border-dashed border-zinc-800">
                    <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mb-6 text-gray-500">
                        <Store size={40} />
                    </div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">No Restaurants Found</h3>
                    <p className="text-gray-400 mb-8 max-w-sm text-center font-medium">Get started by creating your first restaurant profile to start digitalizing your menu.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-10 py-4 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95"
                    >
                        Create First Restaurant
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-8">
                    {restaurants.map(rest => (
                        <motion.div
                            key={rest.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card className="bg-zinc-900 border border-white/5 hover:border-primary/50 transition-all group cursor-pointer h-full rounded-[32px] overflow-hidden">
                                <CardBody className="p-0 flex flex-col h-full">
                                    <div className="h-44 bg-zinc-800 relative w-full overflow-hidden">
                                        {rest.cover_image_url ? (
                                            <Image src={rest.cover_image_url} alt="Cover" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 opacity-50">
                                                <Store className="text-zinc-700" size={48} />
                                            </div>
                                        )}

                                        {/* Status Badges */}
                                        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                                            <Chip
                                                size="sm"
                                                variant="solid"
                                                className={`${rest.onboarding_status === 'approved' ? "bg-green-500 text-white font-black" :
                                                    rest.onboarding_status === 'pending' ? "bg-primary text-black font-black animate-pulse" :
                                                        rest.onboarding_status === 'rejected' ? "bg-red-500 text-white font-black" :
                                                            "bg-zinc-700 text-gray-300"
                                                    } uppercase tracking-widest text-[8px] h-6 px-2`}
                                            >
                                                {rest.onboarding_status === 'approved' ? "Live" : rest.onboarding_status?.toUpperCase() || "Status Unknown"}
                                            </Chip>
                                            {rest.onboarding_status === 'approved' && (
                                                <Chip
                                                    size="sm"
                                                    variant="flat"
                                                    className={`${rest.is_active ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"} uppercase tracking-widest text-[8px] h-6 px-2 backdrop-blur-md`}
                                                >
                                                    {rest.is_active ? "Active" : "Hidden"}
                                                </Chip>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-6 flex flex-col flex-grow">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="text-xl font-black italic uppercase tracking-tighter text-white truncate pr-2">{rest.name}</h3>
                                        </div>
                                        <div className="space-y-2 mb-6">
                                            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                                <MapPin size={14} className="text-primary/50" />
                                                <span className="truncate">{rest.address || "No address provided"}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                                <Phone size={14} className="text-primary/50" />
                                                <span className="truncate">{rest.whatsapp_number}</span>
                                            </div>
                                        </div>

                                        <div className="mt-auto grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                                            {rest.onboarding_status === 'approved' ? (
                                                <>
                                                    <Link href={`/dashboard/restaurants/${rest.id}/menu`} className="w-full">
                                                        <Button size="sm" color="primary" variant="solid" className="w-full font-black uppercase tracking-widest text-[10px] rounded-xl h-10 text-black" endContent={<PlusCircle size={14} />}>Manage</Button>
                                                    </Link>
                                                    <Button
                                                        size="sm"
                                                        variant="bordered"
                                                        className="w-full text-white border-white/10 hover:bg-white/5 rounded-xl h-10 font-bold uppercase tracking-widest text-[10px]"
                                                        startContent={<QrCode size={14} />}
                                                        onPress={() => setQrModal({ isOpen: true, restaurant: rest })}
                                                    >
                                                        QR Code
                                                    </Button>
                                                </>
                                            ) : rest.onboarding_status === 'pending' ? (
                                                <div className="col-span-2 p-3 bg-primary/10 border border-primary/20 rounded-xl text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center justify-center gap-2">
                                                        <Clock size={12} /> Waiting for Approval
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="col-span-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Application Rejected</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Custom Create Restaurant Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setIsModalOpen(false)}
                    />
                    <div className="relative bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white">Create New Restaurant</h2>
                            <p className="text-xs text-gray-400 mt-1">Start by entering the basic details.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Restaurant Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. The Burger Joint"
                                    value={newRestValues.name}
                                    onChange={(e) => setNewRestValues({ ...newRestValues, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Address</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 123 Main St, New York"
                                    value={newRestValues.address}
                                    onChange={(e) => setNewRestValues({ ...newRestValues, address: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">WhatsApp Number *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 15551234567 (with country code)"
                                    value={newRestValues.whatsapp}
                                    onChange={(e) => setNewRestValues({ ...newRestValues, whatsapp: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                <p className="text-xs text-gray-500 mt-1">Orders will be sent to this number.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                                <textarea
                                    placeholder="Brief description of your restaurant..."
                                    value={newRestValues.description}
                                    onChange={(e) => setNewRestValues({ ...newRestValues, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateRestaurant}
                                disabled={isCreating}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors font-medium flex items-center gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Creating...
                                    </>
                                ) : (
                                    "Create Restaurant"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Modal / Sticker Designer */}
            <QrStickerModal
                isOpen={qrModal.isOpen}
                onClose={() => setQrModal({ isOpen: false, restaurant: null })}
                restaurant={qrModal.restaurant}
            />
        </>
    );
}
