"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Button, Input, Card, CardBody, CardHeader, Divider, Image, Spinner, Select, SelectItem, Switch } from "@heroui/react";
import { Gift, Save, CheckCircle, AlertCircle, Store, Power, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoyaltyDashboard() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Multi-restaurant support
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Filtered restaurants based on search
    const filteredRestaurants = restaurants.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Auto-select first filtered restaurant when search changes
    useEffect(() => {
        if (filteredRestaurants.length > 0) {
            // If current selection is not in filtered list, select the first one
            const currentInFiltered = filteredRestaurants.find(r => r.id === selectedRestaurantId);
            if (!currentInFiltered) {
                setSelectedRestaurantId(filteredRestaurants[0].id);
            }
        }
    }, [searchQuery, filteredRestaurants.length]);

    // Computed selected restaurant object
    const restaurant = restaurants.find(r => r.id === selectedRestaurantId) || null;

    const [program, setProgram] = useState<any>({
        program_name: "",
        points_per_visit: 1,
        reward_threshold: 10,
        reward_description: "",
        logo_url: "",
        is_active: true
    });
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchRestaurants = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/auth/login");
                return;
            }

            // Get Restaurants owned by user (or ALL if admin)
            // 1. Check Profile Role
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            const isAdmin = profile?.role === 'admin';

            let query = supabase.from('restaurants').select('*');

            if (!isAdmin) {
                query = query.eq('owner_id', user.id);
            }

            const { data: rests, error } = await query;

            if (rests && rests.length > 0) {
                setRestaurants(rests);
                // Default to first one
                setSelectedRestaurantId(rests[0].id);
            }
            setLoading(false);
        };
        fetchRestaurants();
    }, []);

    // Fetch Program when Selected Restaurant Changes
    useEffect(() => {
        if (!selectedRestaurantId) return;

        const fetchProgram = async () => {
            const { data: prog } = await supabase
                .from('loyalty_programs')
                .select('*')
                .eq('restaurant_id', selectedRestaurantId)
                .single();

            if (prog) {
                setProgram(prog);
            } else {
                // Reset to defaults for this new restaurant
                const currentRest = restaurants.find(r => r.id === selectedRestaurantId);
                setProgram({
                    program_name: currentRest ? `${currentRest.name} Rewards` : "Rewards",
                    points_per_visit: 1,
                    reward_threshold: 10,
                    reward_description: "",
                    logo_url: ""
                });
            }
        };
        fetchProgram();
    }, [selectedRestaurantId, restaurants]);

    const handleSave = async () => {
        if (!restaurant) return;
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch('/api/loyalty/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId: restaurant.id,
                    programName: program.program_name,
                    pointsPerVisit: Number(program.points_per_visit),
                    rewardThreshold: Number(program.reward_threshold),
                    rewardDescription: program.reward_description,
                    logoUrl: program.logo_url
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');

            setMessage({ type: 'success', text: 'Loyalty Program activated successfully!' });

            // Refresh data
            const { data: prog } = await supabase
                .from('loyalty_programs')
                .select('*')
                .eq('restaurant_id', restaurant.id)
                .single();
            if (prog) setProgram(prog);

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async () => {
        if (!program?.id) return; // No program yet
        const newValue = !program.is_active;
        setProgram({ ...program, is_active: newValue });

        const { error } = await supabase
            .from('loyalty_programs')
            .update({ is_active: newValue, updated_at: new Date().toISOString() })
            .eq('id', program.id);

        if (error) {
            setMessage({ type: 'error', text: 'Failed to update status' });
            setProgram({ ...program, is_active: !newValue }); // Revert
        } else {
            setMessage({ type: 'success', text: newValue ? 'Program enabled!' : 'Program disabled.' });
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Spinner size="lg" /></div>;

    if (restaurants.length === 0) return (
        <div className="flex flex-col items-center justify-center p-20 text-gray-500 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/50">
            <Store size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No restaurants found.</p>
            <p className="text-sm">Create a restaurant first to enable loyalty.</p>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
                        Loyalty <span className="text-primary">Program</span>
                    </h1>
                    <p className="text-gray-400">
                        Create a digital loyalty card for your customers.
                    </p>
                    {program?.google_class_id && (
                        <Link href="/dashboard/loyalty/customers">
                            <Button
                                size="sm"
                                variant="flat"
                                className="mt-2 bg-primary/10 text-primary font-bold"
                                startContent={<Users size={14} />}
                            >
                                Manage Customers
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Restaurant Selector (Only show if > 1) */}
                {restaurants.length > 1 && (
                    <div className="w-full md:w-80 space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">Search & Select Restaurant</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search by name or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary transition-colors placeholder:text-gray-500"
                            />
                        </div>
                        <select
                            value={selectedRestaurantId || ""}
                            onChange={(e) => setSelectedRestaurantId(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                        >
                            {filteredRestaurants.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                        {searchQuery && filteredRestaurants.length === 0 && (
                            <p className="text-xs text-gray-500">No restaurants match "{searchQuery}"</p>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Configuration Form */}
                <Card className="md:col-span-2 bg-zinc-900 border border-white/10">
                    <CardHeader className="px-6 py-4 border-b border-white/10">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <Gift className="text-primary" />
                                <h3 className="font-bold text-lg text-white">Program Configuration</h3>
                            </div>
                            {/* Toggle Switch (Only show if program exists) */}
                            {program?.google_class_id && (
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${program.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                                        {program.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    <Switch
                                        isSelected={program.is_active}
                                        onValueChange={handleToggleActive}
                                        color="success"
                                        size="sm"
                                    />
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardBody className="p-6 space-y-6">
                        <Input
                            label="Program Name"
                            placeholder="e.g. Hunggree Rewards"
                            value={program.program_name}
                            onChange={(e) => setProgram({ ...program, program_name: e.target.value })}
                            variant="bordered"
                            classNames={{ inputWrapper: "bg-black/50 border-white/10" }}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                type="number"
                                label="Points per Visit"
                                value={program.points_per_visit.toString()}
                                onChange={(e) => setProgram({ ...program, points_per_visit: e.target.value })}
                                variant="bordered"
                                classNames={{ inputWrapper: "bg-black/50 border-white/10" }}
                            />
                            <Input
                                type="number"
                                label="Points for Reward"
                                value={program.reward_threshold.toString()}
                                onChange={(e) => setProgram({ ...program, reward_threshold: e.target.value })}
                                variant="bordered"
                                description={`Customer gets a reward after ${program.reward_threshold} visits`}
                                classNames={{ inputWrapper: "bg-black/50 border-white/10" }}
                            />
                        </div>

                        <Input
                            label="Reward Description"
                            placeholder="e.g. Free Burger"
                            value={program.reward_description}
                            onChange={(e) => setProgram({ ...program, reward_description: e.target.value })}
                            variant="bordered"
                            classNames={{ inputWrapper: "bg-black/50 border-white/10" }}
                        />

                        <Input
                            label="Logo URL (Optional)"
                            placeholder="https://..."
                            value={program.logo_url || ''}
                            onChange={(e) => setProgram({ ...program, logo_url: e.target.value })}
                            variant="bordered"
                            classNames={{ inputWrapper: "bg-black/50 border-white/10" }}
                        />

                        {message && (
                            <div className={`p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                <span className="text-sm font-medium">{message.text}</span>
                            </div>
                        )}

                        <Button
                            color="primary"
                            size="lg"
                            className="w-full font-bold uppercase tracking-widest"
                            onPress={handleSave}
                            isLoading={saving}
                            startContent={!saving && <Save size={20} />}
                        >
                            {program.google_class_id ? 'Update Program' : 'Activate Loyalty Program'}
                        </Button>
                    </CardBody>
                </Card>

                {/* Preview Card */}
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-400 text-sm uppercase tracking-wider">Preview</h3>

                    {/* Mock Google Wallet Pass */}
                    <div className="relative w-full aspect-[1/1.6] bg-black rounded-[24px] border-2 border-white/10 overflow-hidden shadow-2xl flex flex-col cursor-default select-none">
                        {/* Header */}
                        <div className="bg-[#3C4043] p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden">
                                {program.logo_url ? (
                                    <Image src={program.logo_url} width={40} height={40} className="w-full h-full object-cover" />
                                ) : (
                                    <Gift className="text-zinc-800" size={20} />
                                )}
                            </div>
                            <div className="text-white">
                                <div className="text-xs opacity-80">{program.program_name || 'Rewards'}</div>
                                <div className="font-medium text-sm">{restaurant.name}</div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 bg-[#202124] p-6 flex flex-col items-center justify-center gap-4">
                            <div className="text-white text-center">
                                <div className="text-[40px] font-google-sans-display leading-none">0</div>
                                <div className="text-xs uppercase tracking-wider opacity-60 mt-1">Points</div>
                            </div>

                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-400 w-[10%]" />
                            </div>
                            <div className="text-xs text-center text-gray-400">
                                {Number(program.reward_threshold) - 0} more points for {program.reward_description || 'Reward'}
                            </div>
                        </div>

                        {/* Footer / Barcode */}
                        <div className="bg-white p-4 flex justify-center items-center">
                            <div className="h-12 w-3/4 bg-black/10 flex items-center justify-center">
                                <span className="text-[10px] text-black/40 font-mono">BARCODE_PREVIEW</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs text-blue-300">
                        <p className="flex gap-2 items-start">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            Once activated, customers can add this card to their Google Wallet directly from your digital menu.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
