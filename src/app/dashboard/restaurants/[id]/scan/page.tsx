"use client";

import { useState, useRef, useEffect, use } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";
import {
    ArrowLeft, Camera, Upload, Sparkles, Check, X, Edit2,
    Trash2, Plus, RefreshCw, Image as ImageIcon
} from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

interface ExtractedItem {
    name: string;
    description: string;
    price: number;
    category: string;
}

interface ExtractedCategory {
    name: string;
    items: ExtractedItem[];
}

export default function ScanMenuPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const restaurantId = resolvedParams.id;

    const [restaurant, setRestaurant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<'capture' | 'processing' | 'review'>('capture');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [extractedData, setExtractedData] = useState<ExtractedCategory[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [cameraActive, setCameraActive] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        fetchRestaurant();
        return () => {
            // Cleanup camera on unmount
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [restaurantId]);

    const fetchRestaurant = async () => {
        const { data: rest } = await supabase
            .from('restaurants')
            .select('*')
            .eq('id', restaurantId)
            .single();

        if (!rest) {
            router.push('/dashboard');
            return;
        }
        setRestaurant(rest);
        setLoading(false);
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Use back camera on mobile
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setCameraActive(true);
        } catch (err) {
            console.error("Camera error:", err);
            setError("Could not access camera. Please allow camera permissions or upload an image instead.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setCameraActive(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                const imageData = canvas.toDataURL('image/jpeg', 0.8);
                setCapturedImage(imageData);
                stopCamera();
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setCapturedImage(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const processWithAI = async () => {
        if (!capturedImage) return;

        setStep('processing');
        setIsProcessing(true);
        setError(null);

        try {
            // Get AI settings from localStorage
            const savedSettings = localStorage.getItem('ai_settings');
            let provider = 'openai';
            let openaiKey = '';
            let geminiKey = '';

            if (savedSettings) {
                try {
                    const parsed = JSON.parse(savedSettings);
                    provider = parsed.provider || 'openai';
                    openaiKey = parsed.openaiKey || '';
                    geminiKey = parsed.geminiKey || '';
                } catch (e) {
                    console.error('Failed to parse AI settings:', e);
                }
            }

            const response = await fetch('/api/scan-menu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: capturedImage,
                    provider,
                    openaiKey,
                    geminiKey
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process image');
            }

            const data = await response.json();

            if (data.demo) {
                setError('No API key configured. Showing demo data. Go to Settings to add your API key.');
            }

            if (data.categories && data.categories.length > 0) {
                setExtractedData(data.categories);
                setStep('review');
            } else {
                setError('Could not extract menu items. Please try a clearer image.');
                setStep('capture');
            }
        } catch (err: any) {
            console.error("AI processing error:", err);
            setError(err.message || 'Failed to process the menu. Please try again.');
            setStep('capture');
        } finally {
            setIsProcessing(false);
        }
    };

    const updateItem = (catIndex: number, itemIndex: number, field: string, value: any) => {
        const newData = [...extractedData];
        (newData[catIndex].items[itemIndex] as any)[field] = value;
        setExtractedData(newData);
    };

    const deleteItem = (catIndex: number, itemIndex: number) => {
        const newData = [...extractedData];
        newData[catIndex].items.splice(itemIndex, 1);
        if (newData[catIndex].items.length === 0) {
            newData.splice(catIndex, 1);
        }
        setExtractedData(newData);
    };

    const deleteCategory = (catIndex: number) => {
        const newData = [...extractedData];
        newData.splice(catIndex, 1);
        setExtractedData(newData);
    };

    const saveToDatabase = async () => {
        setIsSaving(true);

        try {
            // 1. Fetch existing categories to prevent duplicates
            const { data: existingCatsData } = await supabase
                .from('categories')
                .select('id, name')
                .eq('restaurant_id', restaurantId);

            // Keep a local list that we update as we create new categories
            const activeCategories = [...(existingCatsData || [])];

            for (let catIndex = 0; catIndex < extractedData.length; catIndex++) {
                const cat = extractedData[catIndex];
                let categoryId = null;

                // 2. Check if category already exists (case-insensitive) in our live list
                const existing = activeCategories.find(ec => ec.name.toLowerCase() === cat.name.toLowerCase().trim());

                if (existing) {
                    categoryId = existing.id;
                } else {
                    // 3. Create new category
                    const { data: newCat, error: catError } = await supabase
                        .from('categories')
                        .insert({
                            restaurant_id: restaurantId,
                            name: cat.name.trim(),
                            display_order: activeCategories.length + catIndex
                        })
                        .select()
                        .single();

                    if (catError) throw catError;
                    categoryId = newCat.id;

                    // Add to our live list so the next item in this scan doesn't create another one
                    activeCategories.push({ id: newCat.id, name: newCat.name });
                }

                // 4. Create items for this category
                const itemsToInsert = cat.items.map((item, idx) => ({
                    restaurant_id: restaurantId,
                    category_id: categoryId,
                    name: item.name,
                    description: item.description || null,
                    price: item.price,
                    is_available: true,
                    display_order: idx
                }));

                const { error: itemsError } = await supabase
                    .from('items')
                    .insert(itemsToInsert);

                if (itemsError) throw itemsError;
            }

            // Success - redirect to menu management
            router.push(`/dashboard/restaurants/${restaurantId}/menu`);
        } catch (err: any) {
            console.error("Save error:", err);
            setError('Failed to save menu: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const resetScan = () => {
        setCapturedImage(null);
        setExtractedData([]);
        setStep('capture');
        setError(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-black text-white">
                <Spinner size="lg" color="primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/dashboard/restaurants/${restaurantId}/menu`} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <Sparkles className="text-yellow-400" size={20} />
                                AI Menu Scanner
                            </h1>
                            <p className="text-xs text-gray-400">{restaurant?.name}</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto p-6">
                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3">
                        <X size={20} />
                        <p>{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-500/20 rounded">
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    {[
                        { key: 'capture', label: 'Capture' },
                        { key: 'processing', label: 'AI Processing' },
                        { key: 'review', label: 'Review & Save' }
                    ].map((s, idx) => (
                        <div key={s.key} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === s.key ? 'bg-blue-600 text-white' :
                                (step === 'review' && idx < 2) || (step === 'processing' && idx === 0) ? 'bg-green-500 text-white' :
                                    'bg-zinc-800 text-gray-400'
                                }`}>
                                {(step === 'review' && idx < 2) || (step === 'processing' && idx === 0) ? <Check size={16} /> : idx + 1}
                            </div>
                            <span className={`text-sm ${step === s.key ? 'text-white' : 'text-gray-500'}`}>{s.label}</span>
                            {idx < 2 && <div className="w-8 h-px bg-zinc-700" />}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                {step === 'capture' && (
                    <div className="space-y-6">
                        {/* Camera Preview or Captured Image */}
                        <div className="aspect-[4/3] bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden relative">
                            {capturedImage ? (
                                <img src={capturedImage} alt="Captured menu" className="w-full h-full object-contain" />
                            ) : cameraActive ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                                    <Camera size={64} className="mb-4 opacity-50" />
                                    <p className="text-lg font-medium">Take a photo of your menu</p>
                                    <p className="text-sm">or upload an existing image</p>
                                </div>
                            )}

                            {/* Camera Controls */}
                            {cameraActive && !capturedImage && (
                                <button
                                    onClick={capturePhoto}
                                    className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                                >
                                    <div className="w-12 h-12 bg-white rounded-full border-4 border-zinc-900" />
                                </button>
                            )}
                        </div>

                        <canvas ref={canvasRef} className="hidden" />

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            {!capturedImage ? (
                                <>
                                    {!cameraActive ? (
                                        <button
                                            onClick={startCamera}
                                            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-colors"
                                        >
                                            <Camera size={20} />
                                            Open Camera
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopCamera}
                                            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-zinc-700 hover:bg-zinc-600 rounded-xl font-medium transition-colors"
                                        >
                                            <X size={20} />
                                            Close Camera
                                        </button>
                                    )}

                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl font-medium transition-colors"
                                    >
                                        <Upload size={20} />
                                        Upload Image
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={resetScan}
                                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
                                    >
                                        <RefreshCw size={20} />
                                        Retake Photo
                                    </button>
                                    <button
                                        onClick={processWithAI}
                                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-medium transition-colors"
                                    >
                                        <Sparkles size={20} />
                                        Extract with AI
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Tips */}
                        <div className="bg-zinc-900 rounded-xl border border-white/5 p-4">
                            <h3 className="font-bold mb-2 flex items-center gap-2">
                                <ImageIcon size={16} className="text-blue-400" />
                                Tips for best results
                            </h3>
                            <ul className="text-sm text-gray-400 space-y-1">
                                <li>• Ensure good lighting and avoid shadows</li>
                                <li>• Keep the menu flat and capture the entire page</li>
                                <li>• Make sure text is readable and not blurry</li>
                                <li>• For multi-page menus, scan each page separately</li>
                            </ul>
                        </div>
                    </div>
                )}

                {step === 'processing' && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-6 relative">
                            <Spinner size="lg" color="primary" />
                            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-400" size={24} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Analyzing Menu...</h2>
                        <p className="text-gray-400">Our AI is extracting categories and items from your menu.</p>
                        <p className="text-gray-500 text-sm mt-2">This may take a few seconds.</p>
                    </div>
                )}

                {step === 'review' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">Review Extracted Menu</h2>
                                <p className="text-sm text-gray-400">
                                    Found {extractedData.length} categories and {extractedData.reduce((acc, cat) => acc + cat.items.length, 0)} items
                                </p>
                            </div>
                            <button
                                onClick={resetScan}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm transition-colors flex items-center gap-2"
                            >
                                <RefreshCw size={16} />
                                Scan Another
                            </button>
                        </div>

                        {/* Extracted Categories & Items */}
                        <div className="space-y-6">
                            {extractedData.map((category, catIndex) => (
                                <div key={catIndex} className="bg-zinc-900 rounded-2xl border border-white/5 overflow-hidden">
                                    {/* Category Header */}
                                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-800/50">
                                        <h3 className="font-bold text-lg">{category.name}</h3>
                                        <button
                                            onClick={() => deleteCategory(catIndex)}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Items */}
                                    <div className="divide-y divide-white/5">
                                        {category.items.map((item, itemIndex) => (
                                            <div key={itemIndex} className="p-4 hover:bg-white/5 transition-colors">
                                                <div className="flex gap-4">
                                                    <div className="flex-1 space-y-2">
                                                        <input
                                                            type="text"
                                                            value={item.name}
                                                            onChange={(e) => updateItem(catIndex, itemIndex, 'name', e.target.value)}
                                                            className="w-full bg-transparent text-white font-medium text-lg focus:outline-none focus:bg-zinc-800 rounded px-2 py-1 -ml-2"
                                                        />
                                                        <textarea
                                                            value={item.description}
                                                            onChange={(e) => updateItem(catIndex, itemIndex, 'description', e.target.value)}
                                                            placeholder="Add description..."
                                                            className="w-full bg-transparent text-gray-400 text-sm focus:outline-none focus:bg-zinc-800 rounded px-2 py-1 -ml-2 resize-none"
                                                            rows={2}
                                                        />
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">{restaurant?.currency || '$'}</span>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={item.price}
                                                                onChange={(e) => updateItem(catIndex, itemIndex, 'price', parseFloat(e.target.value) || 0)}
                                                                className="w-24 pl-10 pr-2 py-2 bg-zinc-800 border border-white/10 rounded-lg text-green-400 font-bold focus:outline-none focus:border-blue-500"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => deleteItem(catIndex, itemIndex)}
                                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Save Button */}
                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={resetScan}
                                className="flex-1 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveToDatabase}
                                disabled={isSaving || extractedData.length === 0}
                                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl font-medium transition-colors"
                            >
                                {isSaving ? (
                                    <>
                                        <Spinner size="sm" color="white" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check size={20} />
                                        Save to Menu
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
