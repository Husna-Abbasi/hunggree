"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip, Tabs, Tab } from "@heroui/react";
import { CheckCircle, MapPin, Phone, User, Store, Mail, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";

export default function AgentDashboard() {
    const [formData, setFormData] = useState({
        restaurantName: "",
        whatsappNumber: "",
        address: "",
        ownerName: "",
        ownerEmail: "",
        ownerPhone: "",
        latitude: null as number | null,
        longitude: null as number | null
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [successData, setSuccessData] = useState<any | null>(null);
    const [onboardedRestaurants, setOnboardedRestaurants] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("list");

    const supabase = createClient();

    useEffect(() => {
        fetchOnboardedRestaurants();
    }, []);

    const fetchOnboardedRestaurants = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('restaurants')
            .select('*')
            .eq('onboarded_by', user.id)
            .order('created_at', { ascending: false });

        if (data) setOnboardedRestaurants(data);
    };

    const handleDetectLocation = () => {
        setIsLocating(true);
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            setIsLocating(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
                setIsLocating(false);
            },
            (error) => {
                alert("Unable to retrieve location. Please allow location access.");
                console.error(error);
                setIsLocating(false);
            }
        );
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/agent/onboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            setSuccessData(data.credentials);
            setFormData({
                restaurantName: "",
                whatsappNumber: "",
                address: "",
                ownerName: "",
                ownerEmail: "",
                ownerPhone: "",
                latitude: null,
                longitude: null
            });
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsLoading(false);
            fetchOnboardedRestaurants();
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <header className="mb-8">
                <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Agent Dashboard</h1>
                <p className="text-gray-400 font-medium italic">Onboard new restaurants and generate credentials instantly.</p>
            </header>

            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'list' ? 'bg-white text-black' : 'bg-zinc-900 text-gray-500 hover:text-white'}`}
                >
                    My Restaurants
                </button>
                <button
                    onClick={() => setActiveTab('onboard')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'onboard' ? 'bg-primary text-black' : 'bg-zinc-900 text-gray-500 hover:text-white'}`}
                >
                    Onboard New
                </button>
            </div>

            {activeTab === 'onboard' && (
                <div className="bg-zinc-900 border border-white/10 rounded-[32px] p-6 md:p-8 space-y-6 shadow-2xl">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                            <Store size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">New Restaurant</h2>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Enter details below</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Restaurant Name"
                                placeholder="e.g. Burger King"
                                variant="bordered"
                                classNames={{ inputWrapper: "bg-black/50 border-white/10" }}
                                startContent={<Store size={16} className="text-gray-500" />}
                                value={formData.restaurantName}
                                onValueChange={(v) => setFormData({ ...formData, restaurantName: v })}
                            />
                            <Input
                                label="WhatsApp Number"
                                placeholder="e.g. +1234567890"
                                variant="bordered"
                                classNames={{ inputWrapper: "bg-black/50 border-white/10" }}
                                startContent={<Phone size={16} className="text-gray-500" />}
                                value={formData.whatsappNumber}
                                onValueChange={(v) => setFormData({ ...formData, whatsappNumber: v })}
                            />
                        </div>
                        <Input
                            label="Full Address (Typing manually is optional if you use GPS)"
                            placeholder="e.g. 123 Main St, New York, NY"
                            variant="bordered"
                            classNames={{ inputWrapper: "bg-black/50 border-white/10" }}
                            startContent={<MapPin size={16} className="text-gray-500" />}
                            value={formData.address}
                            onValueChange={(v) => setFormData({ ...formData, address: v })}
                        />

                        <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${formData.latitude ? 'bg-green-500/10 border-green-500/20' : 'bg-zinc-800/50 border-white/10'}`}>
                            <div className="flex flex-col">
                                <span className={`text-sm font-bold flex items-center gap-2 ${formData.latitude ? 'text-green-400' : 'text-white'}`}>
                                    <MapPin size={16} />
                                    {formData.latitude ? 'Location Secured' : 'Restaurant Location'}
                                </span>
                                {formData.latitude ? (
                                    <span className="text-[10px] text-green-500 font-mono mt-1">
                                        Lat: {formData.latitude.toFixed(6)}, Lng: {formData.longitude?.toFixed(6)}
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-500 mt-1">Required for Maps & Discovery</span>
                                )}
                            </div>
                            <Button
                                color={formData.latitude ? "success" : "primary"}
                                variant={formData.latitude ? "flat" : "solid"}
                                onPress={handleDetectLocation}
                                isLoading={isLocating}
                                className="font-bold w-full md:w-auto"
                                startContent={<MapPin size={18} />}
                            >
                                {formData.latitude ? "Update GPS" : "Detect GPS Location"}
                            </Button>
                        </div>

                        <div className="h-px bg-white/10 my-4" />

                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500">
                                <User size={16} />
                            </div>
                            <h3 className="text-lg font-black italic uppercase tracking-tighter text-white">Owner Details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Owner Name"
                                placeholder="e.g. John Doe"
                                variant="bordered"
                                classNames={{ inputWrapper: "bg-black/50 border-white/10" }}
                                value={formData.ownerName}
                                onValueChange={(v) => setFormData({ ...formData, ownerName: v })}
                            />
                            <Input
                                label="Owner Email"
                                placeholder="e.g. john@example.com"
                                variant="bordered"
                                classNames={{ inputWrapper: "bg-black/50 border-white/10" }}
                                startContent={<Mail size={16} className="text-gray-500" />}
                                value={formData.ownerEmail}
                                onValueChange={(v) => setFormData({ ...formData, ownerEmail: v })}
                            />
                        </div>
                    </div>

                    <Button
                        color="primary"
                        size="lg"
                        className="w-full font-black uppercase tracking-widest h-14 text-black text-sm"
                        onPress={handleSubmit}
                        isLoading={isLoading}
                        startContent={!isLoading && <CheckCircle size={20} />}
                    >
                        Create Restaurant
                    </Button>
                </div>
            )}

            {/* List of Onboarded Restaurants */}
            {activeTab === 'list' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-end">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Your Restaurants <span className="text-gray-500 text-lg">({onboardedRestaurants.length})</span></h2>
                        {onboardedRestaurants.length === 0 && (
                            <Button size="sm" color="primary" onPress={() => setActiveTab('onboard')} startContent={<Plus size={16} />}>
                                Add New
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {onboardedRestaurants.map(rest => (
                            <div key={rest.id} className="bg-zinc-900 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg text-white">{rest.name}</h3>
                                        <p className="text-xs text-gray-400">{rest.address}</p>
                                    </div>
                                    <Chip size="sm" color="success" variant="flat" className="uppercase font-bold text-[10px]">Active</Chip>
                                </div>
                                <div className="flex gap-4 border-t border-white/5 pt-4">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Phone size={14} /> {rest.whatsapp_number}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Store size={14} /> {new Date(rest.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                <Link href={`/dashboard/restaurants/${rest.id}/menu`} className="w-full">
                                    <Button
                                        className="w-full font-bold uppercase tracking-widest text-[10px]"
                                        color="primary"
                                        variant="solid"
                                        endContent={<ExternalLink size={14} />}
                                    >
                                        Manage Restaurant
                                    </Button>
                                </Link>
                            </div>
                        ))}
                        {onboardedRestaurants.length === 0 && (
                            <div className="col-span-2 py-16 flex flex-col items-center justify-center text-center bg-zinc-900/50 rounded-[32px] border border-white/5 border-dashed">
                                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                    <Store size={32} className="text-gray-600" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">No Restaurants Found</h3>
                                <p className="text-gray-500 max-w-sm mb-6">You haven't onboarded any restaurants yet.</p>
                                <Button color="primary" onPress={() => setActiveTab('onboard')}>
                                    Onboard Your First Restaurant
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Success Modal */}
            <Modal
                isOpen={!!successData}
                onOpenChange={() => setSuccessData(null)}
                backdrop="blur"
                classNames={{ base: "bg-zinc-900 border border-white/10" }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <h2 className="text-xl font-bold text-white text-green-500 flex items-center gap-2">
                                    <CheckCircle size={24} />
                                    Onboarding Successful!
                                </h2>
                                <p className="text-sm text-gray-400">The restaurant is now active. Share these credentials immediately.</p>
                            </ModalHeader>
                            <ModalBody>
                                <div className="p-4 bg-black/50 rounded-xl space-y-4 border border-white/5 border-l-4 border-l-green-500">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Login ID</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xl font-mono text-white font-bold">{successData?.loginId}</p>
                                            <Button size="sm" variant="flat" onPress={() => navigator.clipboard.writeText(successData?.loginId)}>Copy</Button>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Password</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xl font-mono text-primary font-bold">{successData?.password}</p>
                                            <Button size="sm" variant="flat" onPress={() => navigator.clipboard.writeText(successData?.password)}>Copy</Button>
                                        </div>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="flex-col gap-2">
                                <Button
                                    color="success"
                                    className="w-full font-bold text-black"
                                    onPress={() => {
                                        const message = `Welcome to Hunggree!\n\nHere are your login details:\nURL: ${window.location.origin}/auth/login\nLogin ID: ${successData?.loginId}\nPassword: ${successData?.password}\n\nPlease update your profile after logging in.`;
                                        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                                    }}
                                    startContent={<Phone size={18} />}
                                >
                                    Share on WhatsApp
                                </Button>
                                <Button variant="flat" onPress={onClose} className="w-full">
                                    Close
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div >
    );
}
