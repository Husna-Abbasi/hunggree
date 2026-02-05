"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, ArrowRight, Check, Sparkles, X, Loader2, Store } from "lucide-react";
import { Button, Spinner } from "@heroui/react";
import Image from "next/image";
import { createClient } from "@/lib/supabase-browser";

interface OnboardingWizardProps {
    restaurantId: string;
    restaurantName: string;
    onComplete: () => void;
    onClose: () => void;
}

type Step = "welcome" | "upload" | "processing" | "review" | "success";

export default function OnboardingWizard({ restaurantId, restaurantName, onComplete, onClose }: OnboardingWizardProps) {
    const [step, setStep] = useState<Step>("welcome");
    const [image, setImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedData, setExtractedData] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setStep("upload"); // Move to upload preview
            };
            reader.readAsDataURL(file);
        }
    };

    const processMenu = async () => {
        if (!image) return;
        setStep("processing");
        setIsProcessing(true);

        try {
            // 1. Scan the menu
            const response = await fetch('/api/scan-menu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image,
                    provider: 'gemini' // Use Gemini for cost/speed efficiency
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setExtractedData(data);

            // 2. Automatically Save to Database (Magic!)
            await saveToDatabase(data);

            setStep("success");
        } catch (error: any) {
            console.error("Scanning failed:", error);
            alert("Oops! We couldn't read that menu. Please try a clearer photo.");
            setStep("upload");
        } finally {
            setIsProcessing(false);
        }
    };

    const saveToDatabase = async (data: any) => {
        // Save Categories
        for (const [index, cat] of data.categories.entries()) {
            const { data: catData, error: catError } = await supabase
                .from('categories')
                .insert({
                    restaurant_id: restaurantId,
                    name: cat.name,
                    display_order: index
                })
                .select()
                .single();

            if (catError) {
                console.error("Error saving category:", cat);
                continue;
            }

            // Save Items for this Category
            if (cat.items && cat.items.length > 0) {
                const itemsToInsert = cat.items.map((item: any, i: number) => ({
                    restaurant_id: restaurantId,
                    category_id: catData.id,
                    name: item.name,
                    description: item.description,
                    price: item.price || 0,
                    is_available: true,
                    display_order: i
                }));

                await supabase.from('items').insert(itemsToInsert);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="relative w-full max-w-2xl bg-zinc-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                            <Sparkles size={20} fill="currentColor" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Quick Launch</h2>
                            <p className="text-xs font-medium text-gray-400">AI Menu Setup Wizard</p>
                        </div>
                    </div>
                    {step !== "processing" && (
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 relative">
                    <AnimatePresence mode="wait">

                        {/* STEP 1: WELCOME */}
                        {step === "welcome" && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="flex flex-col items-center text-center space-y-6"
                            >
                                <div className="w-32 h-32 bg-zinc-800 rounded-full flex items-center justify-center mb-4 relative">
                                    <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-20"></div>
                                    <Store size={64} className="text-blue-400" />
                                </div>

                                <div className="space-y-4 max-w-md">
                                    <h3 className="text-3xl font-bold text-white">Welcome, {restaurantName}!</h3>
                                    <p className="text-gray-400 text-lg leading-relaxed">
                                        Let's get your menu online in seconds. Do you have a paper menu handy?
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md pt-8">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl hover:scale-105 transition-transform shadow-xl shadow-blue-500/20 group"
                                    >
                                        <Camera size={32} className="text-white group-hover:rotate-12 transition-transform" />
                                        <div className="text-left">
                                            <span className="block font-bold text-white">Take a Photo</span>
                                            <span className="text-blue-200 text-xs">Use your camera</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex flex-col items-center gap-3 p-6 bg-zinc-800 border border-white/5 rounded-2xl hover:bg-zinc-700 transition-colors group"
                                    >
                                        <Upload size={32} className="text-gray-400 group-hover:text-white transition-colors" />
                                        <div className="text-left">
                                            <span className="block font-bold text-gray-200">Upload File</span>
                                            <span className="text-gray-500 text-xs">PDF, JPG, or PNG</span>
                                        </div>
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleFileSelect}
                                    />
                                </div>

                                <button onClick={onComplete} className="text-gray-500 text-sm hover:text-white transition-colors mt-8">
                                    Skip setup, I'll add items manually later
                                </button>
                            </motion.div>
                        )}

                        {/* STEP 2: PREVIEW UPLOAD */}
                        {step === "upload" && image && (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col items-center text-center space-y-6"
                            >
                                <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl">
                                    <Image src={image} alt="Menu Preview" fill className="object-cover" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white">Look good?</h3>
                                    <p className="text-gray-400">Make sure the text is readable.</p>
                                </div>

                                <div className="flex gap-4 w-full max-w-sm">
                                    <Button
                                        variant="flat"
                                        className="flex-1"
                                        onPress={() => { setImage(null); setStep("welcome"); }}
                                    >
                                        Retake
                                    </Button>
                                    <Button
                                        color="primary"
                                        className="flex-1 font-bold"
                                        endContent={<Sparkles size={16} />}
                                        onPress={processMenu}
                                    >
                                        Scan Magic
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: PROCESSING */}
                        {step === "processing" && (
                            <motion.div
                                key="processing"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center text-center space-y-8 py-10"
                            >
                                <div className="relative">
                                    <div className="absolute inset-0 bg-blue-500/30 blur-3xl rounded-full animate-pulse"></div>
                                    <div className="relative bg-zinc-800 p-8 rounded-full border border-white/10 shadow-2xl">
                                        <Loader2 size={48} className="text-blue-400 animate-spin" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-white animate-pulse">Reading your menu...</h3>
                                    <p className="text-gray-400 max-w-xs mx-auto">
                                        Our AI is identifying dishes, prices, and descriptions. This usually takes about 10-15 seconds.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 4: SUCCESS */}
                        {step === "success" && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center text-center space-y-6 py-8"
                            >
                                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-4 text-green-500">
                                    <Check size={48} strokeWidth={3} />
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">Menu Online!</h3>
                                    <p className="text-gray-300 text-lg">
                                        We successfully extracted <strong className="text-white">{extractedData?.categories?.length || 0} categories</strong>
                                        {' '}and saved them to your dashboard.
                                    </p>
                                </div>

                                <div className="bg-zinc-800/50 rounded-xl p-4 w-full max-w-md border border-white/5 text-left">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Preview</p>
                                    <div className="space-y-2">
                                        {extractedData?.categories?.slice(0, 3).map((cat: any, i: number) => (
                                            <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                                <Check size={14} className="text-green-500" />
                                                <span>{cat.name} ({cat.items?.length || 0} items)</span>
                                            </div>
                                        ))}
                                        {extractedData?.categories?.length > 3 && (
                                            <p className="text-xs text-gray-500 pl-6">+ {extractedData.categories.length - 3} more categories...</p>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    color="success"
                                    className="w-full max-w-md font-bold text-black h-12 text-lg shadow-lg shadow-green-500/20"
                                    onPress={onComplete}
                                    endContent={<ArrowRight size={20} />}
                                >
                                    Go to Dashboard
                                </Button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
