"use client";

import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Card, CardBody } from "@heroui/react";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const toggleVisibility = () => setIsVisible(!isVisible);

    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert(error.message);
            setLoading(false);
        } else {
            router.refresh();
            router.push("/dashboard");
        }
    };

    const handleGoogleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${location.origin}/auth/callback` }
        });
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 bg-[#F9F9F7]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[440px]"
            >
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-extrabold tracking-tight text-[#1A1C14]">Welcome Back</h1>
                    <p className="text-default-500 mt-3 font-medium">Log into your Hunggree dashboard</p>
                </div>

                <div className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[40px] p-8 sm:p-10 border border-black/[0.02]">
                    <form onSubmit={handleLogin} className="flex flex-col gap-6">
                        {/* Custom Email Input */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-[#1A1C14] ml-1">Email address</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-default-400 group-focus-within:text-primary transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full h-14 pl-12 pr-4 bg-default-50 border-2 border-transparent rounded-2xl outline-none focus:border-primary focus:bg-white transition-all text-base"
                                    required
                                />
                            </div>
                        </div>

                        {/* Custom Password Input */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-[#1A1C14] ml-1">Password</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-default-400 group-focus-within:text-primary transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={isVisible ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 pl-12 pr-12 bg-default-50 border-2 border-transparent rounded-2xl outline-none focus:border-primary focus:bg-white transition-all text-base"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={toggleVisibility}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-default-400 hover:text-default-600 transition-colors"
                                >
                                    {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div className="flex justify-end">
                                <Link href="#" className="text-sm font-bold text-primary hover:opacity-80">Forgot password?</Link>
                            </div>
                        </div>

                        <Button
                            color="primary"
                            type="submit"
                            isLoading={loading}
                            className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 mt-2"
                        >
                            Log in
                        </Button>
                    </form>

                    <div className="my-10 relative flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-default-100"></div></div>
                        <span className="relative bg-white px-4 text-[10px] font-black text-default-400 uppercase tracking-widest">Or continue with</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant="bordered"
                            className="h-14 rounded-2xl border-2 border-default-100 font-bold hover:bg-default-50"
                            onClick={handleGoogleLogin}
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </Button>
                        <Button
                            variant="bordered"
                            className="h-14 rounded-2xl border-2 border-default-100 font-bold hover:bg-default-50"
                        >
                            <svg className="w-5 h-5 fill-[#1877F2]" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            Facebook
                        </Button>
                    </div>

                    <p className="text-center mt-10 text-default-500 font-medium text-sm">
                        Don't have an account? <Link href="/auth/signup" className="text-primary font-bold hover:underline">Join Hunggree</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
