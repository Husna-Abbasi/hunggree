"use client";

import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Card, CardBody } from "@heroui/react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [restaurantName, setRestaurantName] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const toggleVisibility = () => setIsVisible(!isVisible);

    const router = useRouter();
    const supabase = createClient();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check for disallowed domains
        const disallowedDomains = ["gmail.com", "facebook.com", "outlook.com", "hotmail.com", "yahoo.com"];
        const domain = email.split('@')[1]?.toLowerCase();

        if (disallowedDomains.includes(domain)) {
            alert(`Please use a business email address. ${domain} is not allowed for Partner accounts.`);
            return;
        }

        setLoading(true);

        // 1. Sign up the user
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${location.origin}/auth/callback`,
                data: {
                    full_name: fullName,
                    role: 'restaurant_owner'
                }
            }
        });

        if (error) {
            alert(error.message);
            setLoading(false);
            return;
        }

        if (data.user) {
            // 2. Create the restaurant entry immediately
            const slug = restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

            const { error: restError } = await supabase.from('restaurants').insert({
                owner_id: data.user.id,
                name: restaurantName,
                address: address,
                whatsapp_number: whatsappNumber,
                slug: slug,
                onboarding_status: 'pending',
                is_active: false
            });

            if (restError) {
                console.error("Error creating restaurant:", restError);
                // We don't block the user, they can retry adding restaurant from dashboard if this fails
            }

            router.refresh();
            router.push("/dashboard");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 bg-black text-white selection:bg-primary/30">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[550px] relative z-10"
            >
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-[28px] overflow-hidden border border-white/10 shadow-2xl shadow-primary/20 p-1 bg-zinc-900">
                            <Image src="/logo.png" alt="Logo" width={80} height={80} className="object-cover rounded-[24px]" unoptimized />
                        </div>
                    </div>
                    <h1 className="text-5xl font-black italic tracking-tighter uppercase text-white mb-2">Partner Signup</h1>
                    <p className="text-gray-400 font-medium italic tracking-wide">Join Hunggree and digitalize your menu</p>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 sm:p-10 shadow-2xl shadow-black/50">
                    <form onSubmit={handleSignup} className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full h-14 px-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:border-primary/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-gray-600"
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Restaurant Name</label>
                                <input
                                    type="text"
                                    value={restaurantName}
                                    onChange={(e) => setRestaurantName(e.target.value)}
                                    placeholder="The Grand Bistro"
                                    className="w-full h-14 px-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:border-primary/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-gray-600"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">WhatsApp Number</label>
                            <input
                                type="text"
                                value={whatsappNumber}
                                onChange={(e) => setWhatsappNumber(e.target.value)}
                                placeholder="15551234567 (with country code)"
                                className="w-full h-14 px-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:border-primary/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-gray-600"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Restaurant Address</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="123 Street Name, City"
                                className="w-full h-14 px-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:border-primary/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-gray-600"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Work Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@restaurant.com"
                                className="w-full h-14 px-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:border-primary/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-gray-600"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Password</label>
                            <div className="relative group">
                                <input
                                    type={isVisible ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min. 8 characters"
                                    className="w-full h-14 px-5 pr-12 bg-white/5 border border-white/5 rounded-2xl outline-none focus:border-primary/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-gray-600"
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={toggleVisibility}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                >
                                    {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <Button
                            color="primary"
                            type="submit"
                            isLoading={loading}
                            className="w-full h-16 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 mt-4 bg-primary text-black"
                        >
                            Complete Registration
                        </Button>
                    </form>

                    <p className="text-center mt-10 text-gray-500 font-medium text-sm italic">
                        Already have an account? <Link href="/auth/login" className="text-primary font-black uppercase tracking-widest hover:text-primary/80 ml-2">Log in here</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
