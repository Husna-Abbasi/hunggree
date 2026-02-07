"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Button, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { CheckCircle, AlertCircle, MapPin, Phone, Search, Trash, Key, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function AdminPage() {
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [activeRestaurants, setActiveRestaurants] = useState<any[]>([]);
    const [view, setView] = useState<'pending' | 'active' | 'agents'>('pending');
    const [searchTerm, setSearchTerm] = useState("");
    const [locationFilter, setLocationFilter] = useState("");
    const [isProcessingApproval, setIsProcessingApproval] = useState<string | null>(null);
    const [generatedCredentials, setGeneratedCredentials] = useState<any | null>(null);

    // Agent Management
    const [agents, setAgents] = useState<any[]>([]);
    const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
    const [newAgent, setNewAgent] = useState({ fullName: '', email: '', phone: '', password: '' });
    const [creatingAgent, setCreatingAgent] = useState(false);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        fetchPendingRequests();
        fetchActiveRestaurants();
        fetchAgents();
    }, []);

    // Filter Logic
    const getFilteredData = (data: any[]) => {
        return data.filter(item => {
            const matchesSearch = searchTerm === "" ||
                (item.restaurant_name || item.name)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.whatsapp_number?.includes(searchTerm);

            const matchesLocation = locationFilter === "" ||
                item.address?.toLowerCase().includes(locationFilter.toLowerCase());

            return matchesSearch && matchesLocation;
        });
    };

    const filteredPending = getFilteredData(pendingRequests);
    const filteredActive = getFilteredData(activeRestaurants);

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

    const fetchAgents = async () => {
        try {
            const res = await fetch('/api/admin/agents');
            const data = await res.json();
            if (res.ok) setAgents(data.agents || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateAgent = async () => {
        setCreatingAgent(true);
        try {
            const res = await fetch('/api/admin/agents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAgent)
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            // Show credentials modal
            setGeneratedCredentials({
                restaurantName: `Agent: ${newAgent.fullName}`,
                loginIdentifier: newAgent.email || newAgent.phone,
                password: newAgent.password,
                isAgent: true
            });

            setIsAddAgentOpen(false);
            setNewAgent({ fullName: '', email: '', phone: '', password: '' });
            fetchAgents();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setCreatingAgent(false);
        }
    };

    const handleDeleteAgent = async (agentId: string) => {
        if (!confirm("Are you sure you want to delete this agent? This cannot be undone.")) return;
        try {
            const res = await fetch(`/api/admin/agents?id=${agentId}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            fetchAgents();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleResetAgentPassword = async (agent: any) => {
        const newPassword = Math.random().toString(36).slice(-8);
        try {
            const res = await fetch('/api/admin/agents', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId: agent.id, newPassword })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            setGeneratedCredentials({
                restaurantName: `Agent: ${agent.full_name}`,
                loginIdentifier: agent.email?.includes('@agent.hunggree.com')
                    ? (agent.raw_user_meta_data?.phone_number || agent.email)
                    : agent.email,
                password: newPassword,
                isAgent: true
            });
        } catch (error: any) {
            alert(error.message);
        }
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

    const handleDeleteRestaurant = async (restaurantId: string) => {
        if (!confirm("Are you sure you want to delete this restaurant? This action implies deleting all associated data and cannot be undone.")) return;

        setIsProcessingApproval(`${restaurantId}-delete`);
        try {
            const { error } = await supabase.from('restaurants').delete().eq('id', restaurantId);
            if (error) throw error;

            await fetchActiveRestaurants();
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
                <button
                    onClick={() => setView('agents')}
                    className={`text-sm font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${view === 'agents' ? 'bg-purple-500 text-white' : 'text-gray-500 hover:text-white'}`}
                >
                    Team / Agents ({agents.length})
                </button>
            </div>

            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                    />
                </div>
                <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Filter by city or address..."
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                    />
                </div>
            </div>

            {view === 'pending' && (
                <div className="grid grid-cols-1 gap-6">
                    {filteredPending.length === 0 ? (
                        <div className="bg-zinc-900/50 border border-white/5 rounded-[40px] p-20 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-500">
                                <CheckCircle size={40} />
                            </div>
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter">No Results Found</h3>
                            <p className="text-gray-500 max-w-sm mt-2">
                                {pendingRequests.length === 0
                                    ? "No pending onboarding requests at this time."
                                    : "Try adjusting your search or filters."}
                            </p>
                        </div>
                    ) : (
                        filteredPending.map(req => (
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
            )}

            {view === 'active' && (
                <div className="grid grid-cols-1 gap-6">
                    {filteredActive.map(rest => (
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
                                <div className="min-w-[200px] flex flex-col gap-3">
                                    <Button
                                        color="warning"
                                        variant="flat"
                                        className="w-full h-12 font-black uppercase text-[10px] tracking-widest rounded-xl"
                                        onPress={() => handleRegenerateCredentials(rest.id)}
                                        isLoading={isProcessingApproval === `${rest.id}-regen`}
                                    >
                                        Reset Password
                                    </Button>
                                    <Button
                                        color="danger"
                                        variant="flat"
                                        className="w-full h-12 font-black uppercase text-[10px] tracking-widest rounded-xl"
                                        onPress={() => handleDeleteRestaurant(rest.id)}
                                        isLoading={isProcessingApproval === `${rest.id}-delete`}
                                        startContent={<Trash size={16} />}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {
                view === 'agents' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Field Agents</h2>
                            <Button color="secondary" onPress={() => setIsAddAgentOpen(true)}>
                                Add New Agent
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {agents.map(agent => (
                                <div key={agent.id} className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-500 font-bold text-xl">
                                            {agent.full_name?.charAt(0) || 'A'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white">{agent.full_name}</h3>
                                            <p className="text-xs text-gray-500">{agent.email?.includes('@agent.hunggree.com') ? (agent.raw_user_meta_data?.phone_number || 'Phone Login') : agent.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 text-xs font-mono text-gray-400 mb-4">
                                        <span className="bg-zinc-800 px-2 py-1 rounded">Role: {agent.role}</span>
                                        <span className="bg-zinc-800 px-2 py-1 rounded">Joined: {new Date(agent.created_at).toLocaleDateString()}</span>
                                    </div>

                                    <div className="flex gap-2 pt-4 border-t border-white/5">
                                        <Button
                                            size="sm"
                                            variant="flat"
                                            color="warning"
                                            className="flex-1 font-bold text-[10px] uppercase"
                                            startContent={<Key size={14} />}
                                            onPress={() => handleResetAgentPassword(agent)}
                                        >
                                            Reset Pass
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="flat"
                                            color="danger"
                                            isIconOnly
                                            onPress={() => handleDeleteAgent(agent.id)}
                                        >
                                            <Trash size={14} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Add Agent Modal */}
            <Modal isOpen={isAddAgentOpen} onOpenChange={setIsAddAgentOpen} classNames={{ base: "bg-zinc-900 border border-white/10" }}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader><h2 className="text-xl font-bold text-white">Add New Agent</h2></ModalHeader>
                            <ModalBody className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-500">Full Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white mt-1"
                                        value={newAgent.fullName}
                                        onChange={e => setNewAgent({ ...newAgent, fullName: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-500">Email (Optional)</label>
                                        <input
                                            type="email"
                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white mt-1"
                                            value={newAgent.email}
                                            onChange={e => setNewAgent({ ...newAgent, email: e.target.value })}
                                            placeholder="agent@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-500">Phone (Optional)</label>
                                        <input
                                            type="tel"
                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white mt-1"
                                            value={newAgent.phone}
                                            onChange={e => setNewAgent({ ...newAgent, phone: e.target.value })}
                                            placeholder="+1234567890"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-500">Password</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white mt-1"
                                        value={newAgent.password}
                                        onChange={e => setNewAgent({ ...newAgent, password: e.target.value })}
                                    />
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="flat" onPress={onClose}>Cancel</Button>
                                <Button color="secondary" onPress={handleCreateAgent} isLoading={creatingAgent}>Create Agent</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>


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
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Login ID</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-lg font-mono text-primary">{generatedCredentials?.loginIdentifier || generatedCredentials?.phone}</p>
                                            <Button size="sm" variant="flat" onPress={() => navigator.clipboard.writeText(generatedCredentials?.loginIdentifier || generatedCredentials?.phone)}>Copy</Button>
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
                                        const loginId = generatedCredentials?.loginIdentifier || generatedCredentials?.phone;
                                        const message = `Hello ${generatedCredentials?.restaurantName},\n\nYour Partner account has been approved and password reset!\n\nLogin here: ${window.location.origin}/auth/login\n\nCredentials:\nLogin ID: ${loginId}\nPassword: ${generatedCredentials?.password}\n\nWelcome to Hunggree!`;
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
