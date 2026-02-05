"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Button, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { CheckCircle, AlertCircle, MapPin, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function AdminPage() {
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [activeRestaurants, setActiveRestaurants] = useState<any[]>([]);
    const [view, setView] = useState<'pending' | 'active'>('pending');
    const [isProcessingApproval, setIsProcessingApproval] = useState<string | null>(null);
    const [generatedCredentials, setGeneratedCredentials] = useState<any | null>(null);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        fetchPendingRequests();
        fetchActiveRestaurants();
    }, []);

    const fetchPendingRequests = async () => {
        const { data: pending, error } = await supabase
            .from('registration_requests')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (pending) setPendingRequests(pending);
    };

    const fetchActiveRestaurants = async () => {
        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (restaurants) setActiveRestaurants(restaurants);
    };

    const handleApproveRestaurant = async (requestId: string) => {
        setIsProcessingApproval(`${requestId}-approve`);
        try {
            const response = await fetch('/api/approve-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error);
            }

            setGeneratedCredentials(data.credentials);
            await fetchPendingRequests();
            await fetchActiveRestaurants();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsProcessingApproval(null);
        }
    };

    const handleRejectRestaurant = async (id: string) => {
        setIsProcessingApproval(`${id}-reject`);
        const { error } = await supabase
            .from('registration_requests')
            .update({ status: 'rejected' })
            .eq('id', id);

        if (error) alert(error.message);
        else await fetchPendingRequests();
        setIsProcessingApproval(null);
    };

    const handleRegenerateCredentials = async (restaurantId: string) => {
        setIsProcessingApproval(`${restaurantId}-regen`);
        try {
            const response = await fetch('/api/regenerate-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantId })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error);

            setGeneratedCredentials(data.credentials);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsProcessingApproval(null);
        }
    };

    return (
        <div className="space-y-10">
            <header>
                <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Admin Workspace</h1>
                <p className="text-gray-400 font-medium italic">Review and manage onboarding applications ({pendingRequests.length})</p>
            </header>

            <div className="flex gap-4 border-b border-white/10 pb-4">
                <button
                    onClick={() => setView('pending')}
                    className={`text-sm font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${view === 'pending' ? 'bg-primary text-black' : 'text-gray-500 hover:text-white'}`}
                >
                    Pending Requests ({pendingRequests.length})
                </button>
                <button
                    onClick={() => setView('active')}
                    className={`text-sm font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${view === 'active' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                >
                    Active Restaurants ({activeRestaurants.length})
                </button>
            </div>

            {view === 'pending' ? (
                <div className="grid grid-cols-1 gap-6">
                    {pendingRequests.length === 0 ? (
                        <div className="bg-zinc-900/50 border border-white/5 rounded-[40px] p-20 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-500">
                                <CheckCircle size={40} />
                            </div>
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter">Everything Current</h3>
                            <p className="text-gray-500 max-w-sm mt-2">No pending onboarding requests at this time. Great job staying on top of it!</p>
                        </div>
                    ) : (
                        pendingRequests.map(req => (
                            <motion.div
                                key={req.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-zinc-900 border border-white/10 rounded-[32px] overflow-hidden"
                            >
                                <div className="p-8 flex flex-col md:flex-row gap-10 items-center">
                                    {/* Rest Info */}
                                    <div className="flex-1 space-y-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h3 className="text-2xl font-black italic uppercase tracking-tighter">{req.restaurant_name}</h3>
                                            <Chip size="sm" color="primary" variant="flat" className="font-bold text-[8px] uppercase tracking-widest h-5">NEW LEAD</Chip>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                                <MapPin size={14} className="text-primary" /> {req.address || "N/A"}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                                <Phone size={14} className="text-primary" /> {req.whatsapp_number}
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-600 font-medium">Requested on {new Date(req.created_at).toLocaleDateString()}</p>
                                    </div>

                                    {/* Admin Actions */}
                                    <div className="flex flex-col gap-3 min-w-[200px]">
                                        <Button
                                            color="success"
                                            className="w-full h-12 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-green-500/20"
                                            onPress={() => handleApproveRestaurant(req.id)}
                                            isLoading={isProcessingApproval === `${req.id}-approve`}
                                            startContent={isProcessingApproval !== `${req.id}-approve` && <CheckCircle size={16} />}
                                        >
                                            Generate & Approve
                                        </Button>
                                        <Button
                                            color="danger"
                                            variant="flat"
                                            className="w-full h-12 font-black uppercase text-[10px] tracking-widest rounded-xl bg-red-500/10 text-red-500"
                                            onPress={() => handleRejectRestaurant(req.id)}
                                            isLoading={isProcessingApproval === `${req.id}-reject`}
                                            startContent={isProcessingApproval !== `${req.id}-reject` && <AlertCircle size={16} />}
                                        >
                                            Reject Lead
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {activeRestaurants.map(rest => (
                        <motion.div
                            key={rest.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-zinc-900 border border-white/10 rounded-[32px] overflow-hidden"
                        >
                            <div className="p-8 flex flex-col md:flex-row gap-10 items-center">
                                <div className="flex-1 space-y-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter">{rest.name}</h3>
                                        <Chip size="sm" color="success" variant="flat" className="font-bold text-[8px] uppercase tracking-widest h-5">ACTIVE</Chip>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                        <Phone size={14} className="text-success" /> {rest.whatsapp_number}
                                    </div>
                                </div>
                                <div className="min-w-[200px]">
                                    <Button
                                        color="warning"
                                        variant="flat"
                                        className="w-full h-12 font-black uppercase text-[10px] tracking-widest rounded-xl"
                                        onPress={() => handleRegenerateCredentials(rest.id)}
                                        isLoading={isProcessingApproval === `${rest.id}-regen`}
                                    >
                                        Reset Password
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}


            {/* Generated Credentials Modal */}
            <Modal
                isOpen={!!generatedCredentials}
                onOpenChange={() => setGeneratedCredentials(null)}
                backdrop="blur"
                classNames={{
                    base: "bg-zinc-900 border border-white/10"
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <h2 className="text-xl font-bold text-white">Credentials Generated</h2>
                                <p className="text-sm text-gray-400">Copy these and send to the restaurant via WhatsApp.</p>
                            </ModalHeader>
                            <ModalBody>
                                <div className="p-4 bg-black/50 rounded-xl space-y-4 border border-white/5">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Restaurant</p>
                                        <p className="text-lg font-bold text-white">{generatedCredentials?.restaurantName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Login Phone</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-lg font-mono text-primary">{generatedCredentials?.phone}</p>
                                            <Button size="sm" variant="flat" onPress={() => navigator.clipboard.writeText(generatedCredentials?.phone)}>Copy</Button>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Password</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-lg font-mono text-primary">{generatedCredentials?.password}</p>
                                            <Button size="sm" variant="flat" onPress={() => navigator.clipboard.writeText(generatedCredentials?.password)}>Copy</Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                    <p className="text-xs text-yellow-500">
                                        <strong>Note:</strong> This password is shown only once. Please save it or send it immediately.
                                    </p>
                                </div>
                            </ModalBody>
                            <ModalFooter className="flex-col gap-3">
                                <Button
                                    color="success"
                                    className="w-full text-black font-bold h-12 rounded-xl"
                                    startContent={<Phone size={18} />}
                                    onPress={() => {
                                        const message = `Hello ${generatedCredentials?.restaurantName},\n\nYour Partner account has been approved!\n\nLogin here: ${window.location.origin}/auth/login\n\nCredentials:\nPhone: ${generatedCredentials?.phone}\nPassword: ${generatedCredentials?.password}\n\nWelcome to Hunggree!`;
                                        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
                                        window.open(url, '_blank');
                                    }}
                                >
                                    Share via WhatsApp
                                </Button>
                                <Button variant="flat" onPress={onClose} className="w-full h-12 rounded-xl">
                                    Done
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div >
    );
}
