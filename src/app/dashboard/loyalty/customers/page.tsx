"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Button, Input, Spinner } from "@heroui/react";
import { Users, Search, Store, RefreshCw, ArrowLeft, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoyaltyCustomerCard from "@/components/LoyaltyCustomerCard";

export default function LoyaltyCustomersPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [refreshingPasses, setRefreshingPasses] = useState(false);

    // Multi-restaurant support
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Customers data
    const [customers, setCustomers] = useState<any[]>([]);
    const [program, setProgram] = useState<any>(null);
    const [customerSearch, setCustomerSearch] = useState("");

    const supabase = createClient();
    const router = useRouter();

    // Load restaurants
    useEffect(() => {
        const fetchRestaurants = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/auth/login");
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            const isAdmin = profile?.role === 'admin';

            // Fetch restaurants with loyalty program status
            let query = supabase
                .from('restaurants')
                .select(`
                    id, 
                    name,
                    loyalty_programs!left(id)
                `);
            if (!isAdmin) {
                query = query.eq('owner_id', user.id);
            }

            const { data: rests } = await query;

            // Sort restaurants: ones with loyalty programs first
            const sortedRests = (rests || []).sort((a: any, b: any) => {
                const aHasProgram = a.loyalty_programs?.length > 0 || a.loyalty_programs?.id;
                const bHasProgram = b.loyalty_programs?.length > 0 || b.loyalty_programs?.id;
                if (aHasProgram && !bHasProgram) return -1;
                if (!aHasProgram && bHasProgram) return 1;
                return 0;
            });

            setRestaurants(sortedRests);
            if (sortedRests.length > 0) {
                setSelectedRestaurantId(sortedRests[0].id);
            }
            setLoading(false);
        };
        fetchRestaurants();
    }, []);

    // Load customers when restaurant changes
    useEffect(() => {
        if (selectedRestaurantId) {
            fetchCustomers();
        }
    }, [selectedRestaurantId]);

    const fetchCustomers = async () => {
        if (!selectedRestaurantId) return;
        setRefreshing(true);

        try {
            const res = await fetch(`/api/loyalty/customers?restaurantId=${selectedRestaurantId}&search=${customerSearch}`);
            const data = await res.json();
            if (res.ok) {
                setCustomers(data.customers || []);
                setProgram(data.program);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setRefreshing(false);
        }
    };

    // Search handler with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (selectedRestaurantId) {
                fetchCustomers();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [customerSearch]);

    const handleRefreshPasses = async () => {
        if (!confirm("Update all Google Wallet passes?\n\nThis will push the latest design, member names, and phone numbers to all existing passes in users' wallets.\n\nThis may take a while depending on the number of members.")) {
            return;
        }

        setRefreshingPasses(true);
        try {
            const res = await fetch('/api/loyalty/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantId: selectedRestaurantId })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to refresh passes');

            alert(`Passes updated!\n\nSUCCESS: ${data.updated}\nFAILED: ${data.failed}`);
            fetchCustomers();
        } catch (error: any) {
            console.error(error);
            alert(`Error: ${error.message}`);
        } finally {
            setRefreshingPasses(false);
        }
    };

    const filteredRestaurants = restaurants.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Spinner size="lg" color="primary" />
        </div>
    );

    if (restaurants.length === 0) return (
        <div className="flex flex-col items-center justify-center p-20 text-gray-500 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/50">
            <Store size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No restaurants found.</p>
            <p className="text-sm">Create a restaurant first to manage loyalty.</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/loyalty" className="text-gray-500 hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                            Loyalty <span className="text-primary">Customers</span>
                        </h1>
                    </div>
                    <p className="text-gray-400 text-sm">
                        Manage points and rewards for your loyalty members.
                    </p>
                </div>

                {/* Restaurant Selector */}
                {restaurants.length > 1 && (
                    <select
                        value={selectedRestaurantId || ""}
                        onChange={(e) => setSelectedRestaurantId(e.target.value)}
                        className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                    >
                        {filteredRestaurants.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Program not active warning */}
            {!program && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-300 text-sm">
                    ⚠️ No loyalty program found for this restaurant.{" "}
                    <Link href="/dashboard/loyalty" className="underline font-bold">Set up a program first.</Link>
                </div>
            )}

            {/* Search & Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search customers by name or phone..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-colors placeholder:text-gray-500"
                    />
                </div>
                <Button
                    variant="bordered"
                    className="border-white/20 text-white"
                    startContent={<RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />}
                    onPress={fetchCustomers}
                    isDisabled={refreshing}
                >
                    Refresh
                </Button>
                <Button
                    variant="flat"
                    className="bg-zinc-800 text-white"
                    startContent={<Wallet size={16} />}
                    onPress={handleRefreshPasses}
                    isLoading={refreshingPasses}
                    isDisabled={refreshing || refreshingPasses}
                >
                    Update Wallets
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-4">
                    <p className="text-2xl font-black text-white">{customers.length}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Total Members</p>
                </div>
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-4">
                    <p className="text-2xl font-black text-primary">
                        {customers.filter(c => c.current_points >= (program?.reward_threshold || 10)).length}
                    </p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Rewards Ready</p>
                </div>
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-4">
                    <p className="text-2xl font-black text-white">{program?.points_per_visit || 1}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Pts/Visit</p>
                </div>
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-4">
                    <p className="text-2xl font-black text-white">{program?.reward_threshold || 10}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Reward At</p>
                </div>
            </div>

            {/* Customers Grid */}
            {refreshing && customers.length === 0 ? (
                <div className="flex justify-center py-12">
                    <Spinner size="lg" color="primary" />
                </div>
            ) : customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <Users size={48} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">No loyalty members yet</p>
                    <p className="text-sm">Customers will appear here when they join your loyalty program.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customers.map(customer => (
                        <LoyaltyCustomerCard
                            key={customer.id}
                            customer={customer}
                            program={program}
                            restaurantId={selectedRestaurantId!}
                            onPointsUpdated={fetchCustomers}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
