"use client";

import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Card, CardBody } from "@heroui/react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff, ArrowRight, User } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
    const [contactInput, setContactInput] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const toggleVisibility = () => setIsVisible(!isVisible);

    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const isEmail = contactInput.includes('@');
        let emailToUse = contactInput;

        if (!isEmail) {
            // Phone Login Strategy: "Shadow Email"
            // We convert the phone number to the shadow email format used by the backend
            // This allows us to use Supabase's always-enabled Email Auth provider
            const cleanPhone = contactInput.replace(/\D/g, '');
            emailToUse = `${cleanPhone}@login.hunggree`;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: emailToUse,
            password
        });

        if (error) {
            alert(error.message);
            setLoading(false);
        } else {
            router.refresh();
            router.push("/dashboard");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 bg-black text-white selection:bg-primary/30">
            {/* Background Decorative Elements */}
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full opacity-50"
                    style={{ background: 'radial-gradient(circle, rgba(var(--primary-rgb), 0.4) 0%, transparent 70%)' }}
                />
                <div
                    className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full opacity-50"
                    style={{ background: 'radial-gradient(circle, rgba(37, 99, 235, 0.4) 0%, transparent 70%)' }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[440px] relative z-10"
            >
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-[28px] overflow-hidden border border-white/10 shadow-2xl shadow-black/50 p-1 bg-zinc-900">
                            <Image src="/logo.png" alt="Logo" width={80} height={80} className="object-cover rounded-[24px]" unoptimized />
                        </div>
                    </div>
                    <h1 className="text-5xl font-black italic tracking-tighter uppercase text-white mb-2">Welcome Back</h1>
                    <p className="text-gray-400 font-medium italic tracking-wide">Log into your Hunggree dashboard</p>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-md md:backdrop-blur-xl border border-white/10 rounded-[40px] p-8 sm:p-10 shadow-2xl shadow-black/50">
                    <form onSubmit={handleLogin} className="flex flex-col gap-6">
                        {/* Custom Email Input */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Email or Phone Number</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={contactInput}
                                    onChange={(e) => setContactInput(e.target.value)}
                                    placeholder="name@restaurant.com or Phone Number"
                                    className="w-full h-14 pl-12 pr-4 bg-white/5 border border-white/5 rounded-2xl outline-none focus:border-primary/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-gray-600"
                                    required
                                />
                            </div>
                        </div>

                        {/* Custom Password Input */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Password</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={isVisible ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 pl-12 pr-12 bg-white/5 border border-white/5 rounded-2xl outline-none focus:border-primary/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-gray-600"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={toggleVisibility}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                >
                                    {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div className="flex justify-end">
                                <Link href="#" className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">Forgot password?</Link>
                            </div>
                        </div>

                        <Button
                            color="primary"
                            type="submit"
                            isLoading={loading}
                            className="w-full h-16 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 mt-2 bg-primary text-black"
                        >
                            Access Dashboard
                        </Button>
                    </form>

                    <p className="text-center mt-10 text-gray-500 font-medium text-sm italic">
                        Don't have an account? <Link href="/auth/signup" className="text-primary font-black uppercase tracking-widest hover:text-primary/80 ml-2">Join Hunggree</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
