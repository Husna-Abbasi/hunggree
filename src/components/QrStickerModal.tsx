import { useState } from "react";
import { X, MapPin, Store, Download, Sun, Moon } from "lucide-react";
import { Button, cn } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import { toPng } from 'html-to-image';
import { QRCodeSVG } from "qrcode.react";

interface QrStickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    restaurant: {
        name: string;
        description?: string | null;
        address?: string | null;
        slug: string;
        logo_url?: string | null;
    } | null;
}

export default function QrStickerModal({ isOpen, onClose, restaurant }: QrStickerModalProps) {
    const [stickerTheme, setStickerTheme] = useState<'dark' | 'light'>('dark');
    const [isDownloading, setIsDownloading] = useState(false);

    if (!restaurant) return null;

    const isDark = stickerTheme === 'dark';

    const handleDownloadImage = async () => {
        setIsDownloading(true);
        const node = document.getElementById('printable-sticker');
        if (node) {
            try {
                // Wait a moment for rendering
                await new Promise(resolve => setTimeout(resolve, 100));
                const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 });
                const link = document.createElement('a');
                link.download = `${restaurant.slug}-sticker.png`;
                link.href = dataUrl;
                link.click();
            } catch (err: any) {
                console.error('Failed to download image', err);
                alert(`Failed to generate: ${err.message || 'Unknown error'}`);
            }
        }
        setIsDownloading(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-[95vw] max-w-[360px] sm:max-w-[850px] flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-8 p-3 sm:p-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button - Absolute Top Right */}
                        <button
                            onClick={onClose}
                            className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 hover:bg-white/10 rounded-full text-white transition-colors z-50"
                        >
                            <X size={24} />
                        </button>

                        {/* LEFT COLUMN: Sticker Preview */}
                        <div className="flex justify-center perspective-1000 scale-[0.55] sm:scale-100 origin-top sm:origin-top-left mb-[-216px] sm:mb-0 mt-6 sm:mt-0">
                            <div
                                id="printable-sticker"
                                className={cn(
                                    "relative w-[320px] h-[480px] rounded-[32px] border-[6px] shadow-2xl flex flex-col items-center justify-between py-12 px-8 overflow-hidden transform transition-transform hover:scale-[1.02] duration-500",
                                    isDark ? "bg-zinc-900 border-[#C5A059]" : "bg-white border-black"
                                )}
                                style={{
                                    boxShadow: isDark
                                        ? "0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 2px #4a3b1d"
                                        : "0 20px 50px rgba(0,0,0,0.1), inset 0 0 0 2px #000000"
                                }}
                            >
                                {/* Embossed / Metallic Effect Overlay - Dark Only */}
                                {isDark && (
                                    <>
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                                        <div
                                            className="absolute inset-0 opacity-10 pointer-events-none"
                                            style={{
                                                backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
                                                backgroundSize: '16px 16px'
                                            }}
                                        />
                                    </>
                                )}

                                {/* Top Text */}
                                <div className="text-center space-y-3 z-10 w-full px-4">
                                    <p className={cn(
                                        "text-xs font-black tracking-[0.4em] uppercase",
                                        isDark ? "text-[#C5A059]" : "text-black/60"
                                    )}>Scan For Menu</p>

                                    <h3 className={cn(
                                        "text-3xl font-black uppercase tracking-tighter italic drop-shadow-lg leading-none",
                                        isDark ? "text-white" : "text-black"
                                    )}>
                                        {restaurant.name}
                                    </h3>

                                    {/* Description & Location */}
                                    <div className="space-y-1">
                                        {restaurant.description && (
                                            <p className={cn(
                                                "text-[10px] font-medium leading-tight line-clamp-2 px-2 italic",
                                                isDark ? "text-gray-400" : "text-gray-500"
                                            )}>
                                                "{restaurant.description}"
                                            </p>
                                        )}
                                        {restaurant.address && (
                                            <div className={cn(
                                                "flex items-center justify-center gap-1",
                                                isDark ? "text-gray-500" : "text-gray-600"
                                            )}>
                                                <MapPin size={10} />
                                                <p className="text-[9px] font-bold uppercase tracking-wider">{restaurant.address}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* QR Code Frame */}
                                <div className={cn(
                                    "relative p-3 rounded-3xl z-10 mt-2",
                                    isDark ? "bg-white shadow-[0_0_30px_rgba(197,160,89,0.2)]" : "bg-black text-white shadow-xl"
                                )}>
                                    <div className="border-[3px] border-black rounded-2xl overflow-hidden bg-white">
                                        <QRCodeSVG
                                            id="qr-code-svg"
                                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${restaurant.slug}`}
                                            size={160}
                                            level="H"
                                            includeMargin={true}
                                            imageSettings={restaurant.logo_url ? {
                                                src: restaurant.logo_url,
                                                x: undefined,
                                                y: undefined,
                                                height: 35,
                                                width: 35,
                                                excavate: true,
                                                crossOrigin: "anonymous",
                                            } : undefined}
                                        />
                                    </div>
                                </div>

                                {/* Bottom Branding */}
                                <div className="text-center z-10">
                                    <div className={cn(
                                        "flex items-center justify-center gap-2 opacity-80 mb-2",
                                        isDark ? "text-[#C5A059]" : "text-black"
                                    )}>
                                        <div className={cn("w-12 h-[1px]", isDark ? "bg-[#C5A059]" : "bg-black")} />
                                        <Store size={14} />
                                        <div className={cn("w-12 h-[1px]", isDark ? "bg-[#C5A059]" : "bg-black")} />
                                    </div>
                                    <p className={cn(
                                        "text-[9px] font-bold tracking-[0.3em] uppercase",
                                        isDark ? "text-gray-500" : "text-gray-400"
                                    )}>Powered by Hunggree</p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Controls */}
                        <div className="flex flex-col gap-4 sm:gap-8 w-full sm:flex-1 sm:h-[480px] sm:justify-center">
                            {/* Desktop Title - Hidden on Mobile */}
                            <div className="space-y-2 hidden sm:block">
                                <h2 className="text-2xl sm:text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
                                    Get Your <br />
                                    <span className="text-[#C5A059]">Sticker</span>
                                </h2>
                                <p className="text-gray-400 text-sm">
                                    Download high-quality printable sticker for your restaurant tables.
                                </p>
                            </div>

                            {/* Theme Toggle - Centered on Mobile */}
                            <div className="flex justify-center sm:justify-start">
                                <div className="bg-zinc-800 p-1 rounded-full flex gap-1 border border-white/10">
                                    <button
                                        onClick={() => setStickerTheme('dark')}
                                        className={cn(
                                            "px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all",
                                            isDark ? "bg-black text-[#C5A059] shadow-lg" : "text-gray-400 hover:text-white"
                                        )}
                                    >
                                        <Moon size={14} /> Dark
                                    </button>
                                    <button
                                        onClick={() => setStickerTheme('light')}
                                        className={cn(
                                            "px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all",
                                            !isDark ? "bg-white text-black shadow-lg" : "text-gray-400 hover:text-white"
                                        )}
                                    >
                                        <Sun size={14} /> Light
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                <Button
                                    size="md"
                                    className="bg-[#C5A059] text-black font-black uppercase tracking-widest shadow-xl shadow-yellow-900/20 w-full sm:h-12"
                                    startContent={<div className="p-1 bg-black/10 rounded-full"><Download size={18} /></div>}
                                    onPress={handleDownloadImage}
                                    isLoading={isDownloading}
                                >
                                    {isDownloading ? "Generating..." : "Download Image"}
                                </Button>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        size="md"
                                        className="bg-zinc-800 text-white font-bold uppercase tracking-wide border border-white/10 sm:h-12 text-xs sm:text-sm"
                                        onPress={() => {
                                            // Print Logic
                                            const printContent = document.getElementById('printable-sticker');
                                            if (printContent) {
                                                const win = window.open('', '', 'height=800,width=600');
                                                if (win) {
                                                    win.document.write(`
                                                        <html>
                                                            <head>
                                                                <title>Print Sticker - ${restaurant.name}</title>
                                                                <style>
                                                                    body { 
                                                                        display: flex; 
                                                                        justify-content: center; 
                                                                        align-items: center; 
                                                                        height: 100vh; 
                                                                        background: #f0f0f0; 
                                                                        margin: 0;
                                                                        font-family: system-ui, -apple-system, sans-serif;
                                                                    }
                                                                    #sticker-container {
                                                                        transform: scale(1.5); /* Scale up for print quality */
                                                                    }
                                                                    /* Replicate Tailwind Styles roughly for Print */
                                                                    .sticker {
                                                                        position: relative;
                                                                        width: 320px;
                                                                        height: 480px;
                                                                        background-color: ${isDark ? '#18181b' : '#ffffff'};
                                                                        border-radius: 32px;
                                                                        border: 6px solid ${isDark ? '#C5A059' : '#000000'};
                                                                        display: flex;
                                                                        flex-direction: column;
                                                                        align-items: center;
                                                                        justify-content: space-between;
                                                                        padding: 40px 24px;
                                                                        box-sizing: border-box;
                                                                        color: ${isDark ? 'white' : 'black'};
                                                                        overflow: hidden;
                                                                        text-rendering: geometricPrecision;
                                                                        -webkit-print-color-adjust: exact;
                                                                        print-color-adjust: exact;
                                                                    }
                                                                    .top-text { text-align: center; width: 100%; }
                                                                    .label { 
                                                                        color: ${isDark ? '#C5A059' : '#666666'}; 
                                                                        font-size: 11px; 
                                                                        letter-spacing: 0.4em; 
                                                                        text-transform: uppercase; 
                                                                        font-weight: 900; 
                                                                        margin-bottom: 8px; 
                                                                    }
                                                                    .name { 
                                                                        font-size: 26px; 
                                                                        font-weight: 900; 
                                                                        text-transform: uppercase; 
                                                                        font-style: italic; 
                                                                        line-height: 1.1; 
                                                                        margin: 0; 
                                                                        color: ${isDark ? 'white' : 'black'};
                                                                        text-shadow: ${isDark ? '0 4px 10px rgba(0,0,0,0.5)' : 'none'}; 
                                                                    }
                                                                    
                                                                    .details { margin-top: 10px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
                                                                    .desc { 
                                                                        font-size: 10px; 
                                                                        color: #aaa; 
                                                                        font-style: italic; 
                                                                        max-width: 90%; 
                                                                        line-height: 1.2; 
                                                                        text-align: center; 
                                                                    }
                                                                    .address { font-size: 8px; color: #666; text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em; display: flex; align-items: center; gap: 4px; }
                                                                    
                                                                    .qr-box { 
                                                                        padding: 10px; 
                                                                        background: ${isDark ? 'white' : 'black'}; 
                                                                        border-radius: 24px; 
                                                                        margin-top: 10px; 
                                                                    }
                                                                    .qr-border { border: 3px solid black; border-radius: 16px; overflow: hidden; display: flex; background: white; }
                                                                    .bottom { text-align: center; }
                                                                    .powered { color: #888; font-size: 8px; letter-spacing: 0.3em; text-transform: uppercase; font-weight: 700; margin-top: 8px; }
                                                                    .divider { width: 48px; height: 1px; background: ${isDark ? '#C5A059' : 'black'}; display: inline-block; vertical-align: middle; }
                                                                    .icon { color: ${isDark ? '#C5A059' : 'black'}; margin: 0 8px; vertical-align: middle; }
                                                                </style>
                                                            </head>
                                                            <body>
                                                                <div id="sticker-container">
                                                                    <div class="sticker">
                                                                        <div class="top-text">
                                                                            <div class="label">Scan For Menu</div>
                                                                            <div class="name">${restaurant.name}</div>
                                                                            <div class="details">
                                                                                ${restaurant.description ? `<div class="desc">"${restaurant.description}"</div>` : ''}
                                                                                ${restaurant.address ? `<div class="address">📍 ${restaurant.address}</div>` : ''}
                                                                            </div>
                                                                        </div>
                                                                        <div class="qr-box">
                                                                            <div class="qr-border">
                                                                                <img src="${'data:image/svg+xml;base64,' + btoa(new XMLSerializer().serializeToString(document.getElementById('qr-code-svg') as Node))}" width="160" height="160" />
                                                                            </div>
                                                                        </div>
                                                                        <div class="bottom">
                                                                            <div style="margin-bottom: 8px;">
                                                                                <span class="divider"></span>
                                                                                <span class="icon">★</span>
                                                                                <span class="divider"></span>
                                                                            </div>
                                                                            <div class="powered">Powered by Hunggree</div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <script>
                                                                    window.onload = function() { window.print(); window.close(); }
                                                                </script>
                                                            </body>
                                                        </html>
                                                    `);
                                                    win.document.close();
                                                }
                                            }
                                        }}
                                    >
                                        Print Sticker
                                    </Button>
                                    <Button
                                        size="md"
                                        variant="bordered"
                                        className="border-white/20 text-white font-bold sm:h-12 text-xs sm:text-sm"
                                        onPress={() => {
                                            if (typeof window !== 'undefined') {
                                                navigator.clipboard.writeText(`${window.location.origin}/menu/${restaurant.slug}`);
                                                alert("Public Menu Link copied!");
                                            }
                                        }}
                                    >
                                        Copy Link
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
