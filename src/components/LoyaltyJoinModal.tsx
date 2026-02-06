"use client";

import { useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Spinner, Image, Input } from "@heroui/react";
import { createClient } from "@/lib/supabase-browser";
import { Gift, Wallet, UserRound, Phone } from "lucide-react";

interface LoyaltyJoinModalProps {
    isOpen: boolean;
    onClose: () => void;
    restaurantId: string;
    restaurantName: string;
}

export default function LoyaltyJoinModal({ isOpen, onClose, restaurantId, restaurantName }: LoyaltyJoinModalProps) {
    const [loading, setLoading] = useState(false);
    const [saveLink, setSaveLink] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [memberName, setMemberName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");

    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            checkUser();
            setMemberName(""); // Reset on open
            setPhoneNumber("");
            setSaveLink(null);
            setError(null);
        }
    }, [isOpen]);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    };

    const handleJoin = async () => {
        if (!memberName.trim()) {
            setError("Please enter your name");
            return;
        }

        if (!phoneNumber.trim() || phoneNumber.length < 10) {
            setError("Please enter a valid phone number");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/loyalty/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId,
                    memberName: memberName.trim(),
                    phoneNumber: phoneNumber.trim()
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to join');

            setSaveLink(data.saveLink);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            backdrop="blur"
            classNames={{
                base: "bg-background border border-white/10",
                header: "border-b border-white/10",
                footer: "border-t border-white/10"
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Gift className="text-primary" /> {restaurantName} Rewards
                            </h2>
                            <p className="text-xs text-gray-400 font-normal">Join our loyalty program and earn points!</p>
                        </ModalHeader>
                        <ModalBody className="py-6">
                            {saveLink ? (
                                <div className="flex flex-col items-center gap-4 text-center">
                                    <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
                                        <Wallet size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Pass Created!</h3>
                                    <p className="text-sm text-gray-400">
                                        Your loyalty card is ready. Tap below to add it to Google Wallet.
                                    </p>
                                    <a href={saveLink} target="_blank" rel="noopener noreferrer" className="block">
                                        <Button
                                            color="primary"
                                            size="lg"
                                            className="w-full font-bold"
                                            startContent={<Wallet size={20} />}
                                        >
                                            Add to Google Wallet
                                        </Button>
                                    </a>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Step 1: Enter Details */}
                                    <div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0">
                                                <span className="font-bold">1</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-white">Enter Your Details</p>
                                                <p className="text-xs text-gray-400">We'll use this for your rewards card</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3 pl-[52px]">
                                            <Input
                                                label="Your Name"
                                                placeholder="Enter your name"
                                                value={memberName}
                                                onValueChange={setMemberName}
                                                startContent={<UserRound size={16} className="text-gray-400" />}
                                                classNames={{
                                                    inputWrapper: "bg-zinc-700 border-white/10",
                                                    label: "text-gray-400"
                                                }}
                                                isRequired
                                                size="sm"
                                            />
                                            <Input
                                                label="Phone Number"
                                                placeholder="Enter your phone number"
                                                value={phoneNumber}
                                                onValueChange={setPhoneNumber}
                                                startContent={<Phone size={16} className="text-gray-400" />}
                                                classNames={{
                                                    inputWrapper: "bg-zinc-700 border-white/10",
                                                    label: "text-gray-400"
                                                }}
                                                type="tel"
                                                isRequired
                                                size="sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Step 2: Add to Wallet */}
                                    <div className="bg-zinc-800/30 p-4 rounded-xl border border-white/5 opacity-60">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary/60 shrink-0">
                                                <span className="font-bold">2</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-white/60">Add to Google Wallet</p>
                                                <p className="text-xs text-gray-500">Save your card for easy access</p>
                                            </div>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                            {error}
                                        </div>
                                    )}
                                </div>
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="light" onPress={onClose}>
                                Close
                            </Button>
                            {!saveLink && (
                                <Button
                                    color="primary"
                                    onPress={handleJoin}
                                    isLoading={loading}
                                    className="font-bold"
                                >
                                    {user ? 'Process My Card' : 'Get My Rewards Card'}
                                </Button>
                            )}
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
