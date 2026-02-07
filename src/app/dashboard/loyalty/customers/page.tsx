"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Button, Input, Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Users, Search, Store, RefreshCw, ArrowLeft, Wallet, QrCode, X, CheckCircle } from "lucide-react";
import { Scanner } from '@yudiel/react-qr-scanner';
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

    // Scanner State
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannedCard, setScannedCard] = useState<any>(null);
    const [pointsToAdd, setPointsToAdd] = useState("1");
    const [processingPoints, setProcessingPoints] = useState(false);
    const [scanError, setScanError] = useState("");

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

    const handleScan = async (detectedCodes: any[]) => {
        if (detectedCodes.length === 0) return;
        const code = detectedCodes[0].rawValue;

        // Stop scanning immediately by setting a temp state or checking if we already have a card
        if (scannedCard) return;

        try {
            const res = await fetch('/api/loyalty/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            const data = await res.json();

            if (res.ok) {
                setScannedCard(data.card);
                setScanError("");
            } else {
                setScanError(data.error || "Card not found");
            }
        } catch (error) {
            setScanError("Failed to scan card");
        }
    };

    const handleAddPoints = async () => {
        if (!scannedCard) return;
        setProcessingPoints(true);
        try {
            const res = await fetch('/api/loyalty/points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardId: scannedCard.id,
                    pointsToAdd: parseInt(pointsToAdd)
                })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Successfully added ${pointsToAdd} points! New Balance: ${data.newBalance}`);
                setScannerOpen(false);
                setScannedCard(null);
                setPointsToAdd("1");
                fetchCustomers(); // Refresh list
            } else {
                alert(data.error || "Failed to add points");
            }
        } catch (error) {
            alert("Error adding points");
        } finally {
            setProcessingPoints(false);
        }
    };

    const closeScanner = () => {
        setScannerOpen(false);
        setScannedCard(null);
        setScanError("");
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
                <Button
                    color="primary"
                    className="font-bold text-black"
                    startContent={<QrCode size={18} />}
                    onPress={() => setScannerOpen(true)}
                >
                    Scan Pass
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


            {/* Scanner Modal */}
            <Modal
                isOpen={scannerOpen}
                onClose={closeScanner}
                size="2xl"
                classNames={{
                    base: "bg-zinc-900 border border-white/10",
                    header: "border-b border-white/10",
                    footer: "border-t border-white/10"
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <QrCode /> {scannedCard ? "Customer Found" : "Scan Loyalty Pass"}
                        </h2>
                    </ModalHeader>
                    <ModalBody className="py-6">
                        {!scannedCard ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-full max-w-sm aspect-square overflow-hidden rounded-2xl border-2 border-primary/50 relative bg-black">
                                    <Scanner
                                        onScan={handleScan}
                                        components={{ finder: false }}
                                        styles={{ container: { width: '100%', height: '100%' } }}
                                    />
                                    {/* Overlay Frame */}
                                    <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
                                        <div className="w-48 h-48 border-2 border-white/50 rounded-lg relative">
                                            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary -mt-1 -ml-1"></div>
                                            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary -mt-1 -mr-1"></div>
                                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary -mb-1 -ml-1"></div>
                                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary -mb-1 -mr-1"></div>
                                        </div>
                                    </div>
                                </div>
                                {scanError && (
                                    <p className="text-red-400 font-bold bg-red-500/10 px-4 py-2 rounded-lg">
                                        {scanError}
                                    </p>
                                )}
                                <p className="text-gray-400 text-sm">Point the camera at the customer's Google Wallet pass QR code.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                {/* Customer Details Card */}
                                <div className="bg-zinc-800/50 p-6 rounded-2xl border border-white/5 flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-2xl">
                                        {scannedCard.memberName.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white">{scannedCard.memberName}</h3>
                                        <p className="text-gray-400">{scannedCard.phoneNumber}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-black text-white">{scannedCard.currentPoints}</p>
                                        <p className="text-xs uppercase tracking-wider text-gray-500">Current Points</p>
                                    </div>
                                </div>

                                {/* Rewards Status */}
                                {scannedCard.currentPoints >= scannedCard.rewardThreshold && (
                                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center gap-3">
                                        <CheckCircle className="text-green-500 fill-green-500/20" size={24} />
                                        <div>
                                            <p className="font-bold text-green-400">Reward Available!</p>
                                            <p className="text-xs text-green-300/80">Customer has reached the threshold.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Add Points Form */}
                                <div className="space-y-4 pt-4 border-t border-white/10">
                                    <h4 className="font-bold text-gray-400 uppercase tracking-wider text-sm">Add Points / Visits</h4>
                                    <div className="flex gap-4">
                                        <Input
                                            type="number"
                                            label="Points to Add"
                                            value={pointsToAdd}
                                            onChange={(e) => setPointsToAdd(e.target.value)}
                                            classNames={{
                                                inputWrapper: "bg-zinc-700 hover:bg-zinc-600 transition-colors group-data-[focus=true]:bg-zinc-600",
                                                input: "!text-white text-lg font-bold placeholder:text-zinc-400",
                                                label: "!text-zinc-300"
                                            }}
                                        />
                                        <Button
                                            color="primary"
                                            size="lg"
                                            className="h-14 px-8 font-bold text-black"
                                            onPress={handleAddPoints}
                                            isLoading={processingPoints}
                                        >
                                            Add {pointsToAdd} Points
                                        </Button>
                                    </div>
                                    <div className="flex gap-2 justify-center">
                                        {[1, 2, 5, 10, -10].map(val => (
                                            <Button
                                                key={val}
                                                size="sm"
                                                variant="flat"
                                                className="bg-zinc-700 hover:bg-zinc-600 !text-white font-bold"
                                                onPress={() => setPointsToAdd(val.toString())}
                                            >
                                                {val > 0 ? `+${val}` : val}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="flat" className="bg-white/10 text-white" onPress={() => setScannedCard(null)}>
                            Scan Another
                        </Button>
                        <Button color="danger" variant="light" onPress={closeScanner}>
                            Close
                        </Button>
                    </ModalFooter>

                </ModalContent>

            </Modal>
        </div >
    );
}
