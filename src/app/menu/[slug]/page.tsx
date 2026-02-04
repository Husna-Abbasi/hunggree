"use client";

import { useEffect, useState, use, useMemo } from "react";
import Image from "next/image";
import { Button, Card, CardBody, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Spinner, Input, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection } from "@heroui/react";
import { useCartStore } from "@/store/useCartStore";
import { createClient } from "@/lib/supabase-browser";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Plus, Minus, ChevronLeft, Search, Filter, Clock, X, Info, LayoutGrid, List, Sun, Moon, Trash2, ChevronDown, Sparkles, QrCode } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { formatPrice, optimizeImage } from "@/lib/utils";
import QrStickerModal from "@/components/QrStickerModal";

interface Restaurant {
    id: string;
    name: string;
    slug: string;
    description: string;
    logo_url: string;
    cover_image_url: string;
    whatsapp_number: string;
    whatsapp_template?: string;
    currency: string;
    opening_time: string;
    closing_time: string;
}

interface Category {
    id: string;
    name: string;
    items: Item[];
}

interface Item {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    is_available: boolean;
    order_count: number;
    prep_time?: string; // Mocked for now since not in schema
}

export default function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const { items: cartItems, addItem, updateQuantity, removeItem, total } = useCartStore();
    const { isOpen, onOpen, onOpenChange } = useDisclosure();

    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"none" | "price-asc" | "price-desc" | "time">("none");
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [selectedPriceRange, setSelectedPriceRange] = useState<[number, number] | null>(null);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        const fetchMenuData = async () => {
            setLoading(true);
            try {
                const { data: rest, error: restError } = await supabase
                    .from('restaurants')
                    .select('*')
                    .eq('slug', slug)
                    .single();

                if (restError || !rest) throw new Error("Restaurant not found");
                setRestaurant(rest);

                const { data: cats, error: catsError } = await supabase
                    .from('categories')
                    .select('*')
                    .eq('restaurant_id', rest.id)
                    .eq('is_active', true)
                    .order('display_order', { ascending: true });

                if (catsError) throw catsError;

                const { data: items, error: itemsError } = await supabase
                    .from('items')
                    .select('*')
                    .eq('restaurant_id', rest.id)
                    .eq('is_available', true)
                    .order('display_order', { ascending: true });

                if (itemsError) throw itemsError;

                const categoriesWithItems = cats.map(cat => ({
                    ...cat,
                    items: items.filter(item => item.category_id === cat.id).map(item => ({
                        ...item,
                        prep_time: "10-15 min" // Mocked prep time
                    }))
                })).filter(cat => cat.items.length > 0);

                setCategories(categoriesWithItems);
            } catch (err) {
                console.error("Error fetching menu:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMenuData();
    }, [slug]);

    const availablePriceRanges = useMemo(() => {
        const prices = categories.flatMap(cat => cat.items.map(i => i.price));
        if (prices.length === 0) return [];
        const maxPrice = Math.max(...prices);

        // Spending Caps
        const caps: [number, string][] = [
            [2000, "Up to 2,000"],
            [3000, "Up to 3,000"],
            [5000, "Up to 5,000"],
            [10000, "Up to 10,000"],
        ];

        // Add the max item price as an option if it's very high
        if (maxPrice > 10000) {
            caps.push([Math.ceil(maxPrice / 1000) * 1000, `Up to ${formatPrice(Math.ceil(maxPrice / 1000) * 1000)}`]);
        }

        return caps;
    }, [categories]);

    const priceStats = useMemo(() => {
        const prices = categories.flatMap(cat => cat.items.map(i => i.price));
        if (prices.length === 0) return { min: 0, max: 0 };
        return {
            min: Math.min(...prices),
            max: Math.max(...prices)
        };
    }, [categories]);

    const timeStatus = useMemo(() => {
        if (!restaurant?.opening_time || !restaurant?.closing_time) return { isOpen: true, statusText: "Open Now" };

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const parseTime = (timeStr: string) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + (minutes || 0);
        };

        const openMin = parseTime(restaurant.opening_time);
        let closeMin = parseTime(restaurant.closing_time);

        // Handle overnight closing (e.g., 6 PM to 2 AM)
        const isOvernight = closeMin < openMin;

        let isOpen = false;
        let diff = 0;
        let statusPrefix = "";

        if (isOvernight) {
            isOpen = currentMinutes >= openMin || currentMinutes < closeMin;
            if (isOpen) {
                statusPrefix = "Closes in ";
                diff = currentMinutes >= openMin ? (1440 - currentMinutes) + closeMin : closeMin - currentMinutes;
            } else {
                statusPrefix = "Opens in ";
                diff = openMin - currentMinutes;
            }
        } else {
            isOpen = currentMinutes >= openMin && currentMinutes < closeMin;
            if (isOpen) {
                statusPrefix = "Closes in ";
                diff = closeMin - currentMinutes;
            } else {
                statusPrefix = "Opens in ";
                if (currentMinutes < openMin) {
                    diff = openMin - currentMinutes;
                } else {
                    diff = (1440 - currentMinutes) + openMin;
                }
            }
        }

        const formatDiff = (d: number) => {
            const h = Math.floor(d / 60);
            const m = d % 60;
            if (h > 0) return `${h}h ${m > 0 ? m + 'm' : ''}`;
            return `${m}m`;
        };

        return {
            isOpen,
            statusText: `${statusPrefix}${formatDiff(diff)}`
        };
    }, [restaurant]);

    const filteredMenu = useMemo(() => {
        let result = categories.map(cat => ({
            ...cat,
            items: [...cat.items]
        }));

        // 1. Filter by Category
        if (selectedCategoryId !== "all") {
            result = result.filter(cat => cat.id === selectedCategoryId);
        }

        // 2. Filter by Search
        if (searchQuery.trim()) {
            result = result.map(cat => ({
                ...cat,
                items: cat.items.filter(item =>
                    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
                )
            })).filter(cat => cat.items.length > 0);
        }

        // 3. Sort Items within Categories
        if (sortBy !== "none") {
            result = result.map(cat => ({
                ...cat,
                items: [...cat.items].sort((a, b) => {
                    const priceA = Number(a.price);
                    const priceB = Number(b.price);
                    if (sortBy === "price-asc") {
                        if (priceA !== priceB) return priceA - priceB;
                        return a.name.localeCompare(b.name);
                    }
                    if (sortBy === "price-desc") {
                        if (priceA !== priceB) return priceB - priceA;
                        return a.name.localeCompare(b.name);
                    }
                    if (sortBy === "time") {
                        const getTime = (s?: string) => {
                            if (!s) return 999;
                            const match = s.match(/\d+/);
                            return match ? parseInt(match[0]) : 999;
                        };
                        const timeA = getTime(a.prep_time);
                        const timeB = getTime(b.prep_time);
                        if (timeA !== timeB) return timeA - timeB;
                        return a.name.localeCompare(b.name);
                    }
                    return 0;
                })
            }));
        }

        // 4. Filter by Spending Cap
        if (selectedPriceRange) {
            result = result.map(cat => ({
                ...cat,
                items: cat.items.filter(item => item.price <= selectedPriceRange[0])
            })).filter(cat => cat.items.length > 0);
        }

        return result;
    }, [categories, searchQuery, selectedCategoryId, sortBy, selectedPriceRange]);

    const handleAddToCart = (item: any) => {
        addItem({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            image: item.image_url,
            quantity: 1
        });
    };

    const handleCheckout = async () => {
        if (!restaurant || cartItems.length === 0) return;

        try {
            // Get current user if any
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Create the order in Supabase
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    restaurant_id: restaurant.id,
                    customer_id: user?.id || null,
                    total_amount: total(),
                    status: 'pending'
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Create order items
            const orderItemsData = cartItems.map(item => ({
                order_id: order.id,
                item_id: item.id,
                quantity: item.quantity,
                price_at_time: item.price
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsData);

            if (itemsError) throw itemsError;

            // 3. Open WhatsApp
            const itemsText = cartItems.map(i => `• ${i.quantity}x ${i.name} (${restaurant.currency} ${formatPrice(i.price * i.quantity)})`).join('\n');
            const totalText = `${restaurant.currency} ${formatPrice(total())}`;
            const shortOrderId = order.id.slice(0, 8);

            let message = restaurant.whatsapp_template ||
                `*New Order from {restaurant_name}*\n\nOrder ID: #{order_id}\n\n{items}\n\n*Total: {total}*\n\n_Please confirm my order._`;

            // Replace placeholders
            message = message
                .replace(/{restaurant_name}/g, restaurant.name)
                .replace(/{order_id}/g, shortOrderId)
                .replace(/{items}/g, itemsText)
                .replace(/{total}/g, totalText);

            // Official universal link format is more reliable than wa.me on some mobile browsers
            const cleanPhone = restaurant.whatsapp_number.replace(/\D/g, '');
            window.location.assign(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`);

            // 4. Clear cart after successful save
            // useCartStore.getState().clearCart();
        } catch (err: any) {
            console.error("Error saving order:", err);
            const errorMsg = err.message || "Unknown error";
            alert(`There was an issue processing your order: ${errorMsg}. You can still message the restaurant directly.`);

            // Fallback to simple WhatsApp link if database fails
            const itemsText = cartItems.map(i => `• ${i.quantity}x ${i.name} (${restaurant.currency} ${formatPrice(i.price * i.quantity)})`).join('\n');
            const message = `*New Order from ${restaurant.name}*\n\n${itemsText}\n\n*Total: ${restaurant.currency} ${formatPrice(total())}*\n\n_Please confirm my order._`;
            const cleanPhone = restaurant.whatsapp_number.replace(/\D/g, '');
            window.location.assign(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`);
        }
    };

    const { theme, setTheme } = useTheme();

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-background text-foreground gap-4">
                <Spinner size="lg" color="primary" />
                <p className="text-default-500 font-medium animate-pulse">Designing your experience...</p>
            </div>
        );
    }

    if (!restaurant) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-background text-foreground p-6 text-center">
                <Info size={48} className="text-default-400 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Menu Not Found</h1>
                <p className="text-default-500 mb-6 font-medium">Sorry, we couldn't find the restaurant you're looking for.</p>
                <Link href="/"><Button color="primary" variant="flat" size="lg" className="font-bold">Return Home</Button></Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
            {/* Header / Hero */}
            <div className="relative h-[35vh] min-h-[300px] w-full group overflow-hidden">
                <Image
                    src={optimizeImage(restaurant.cover_image_url) || "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2000"}
                    alt="Cover"
                    fill
                    sizes="100vw"
                    className="object-cover opacity-60 scale-105 group-hover:scale-100 transition-transform duration-700 ease-out"
                    priority
                    unoptimized={!!restaurant.cover_image_url}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

                <div className="absolute top-6 left-6 z-20 flex gap-4">
                    <Link href="/">
                        <Button isIconOnly variant="flat" className="bg-background/40 backdrop-blur-md rounded-2xl border border-divider">
                            <ChevronLeft className="text-foreground" size={24} />
                        </Button>
                    </Link>
                    <Button
                        isIconOnly
                        variant="flat"
                        className="bg-background/40 backdrop-blur-md rounded-2xl border border-divider"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    >
                        {theme === 'dark' ? <Sun size={20} className="text-foreground" /> : <Moon size={20} className="text-foreground" />}
                    </Button>
                    <Button
                        isIconOnly
                        variant="flat"
                        className="bg-background/40 backdrop-blur-md rounded-2xl border border-divider"
                        onClick={() => setIsQrModalOpen(true)}
                    >
                        <QrCode size={20} className="text-foreground" />
                    </Button>
                </div>

                <div className="absolute top-6 right-6 z-20">
                    <Button
                        isIconOnly
                        variant="flat"
                        className="bg-background/40 backdrop-blur-md rounded-2xl border border-divider relative"
                        onClick={onOpen}
                    >
                        <ShoppingBag className="text-foreground" size={24} />
                        {cartItems.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-background">
                                {cartItems.reduce((a, b) => a + b.quantity, 0)}
                            </span>
                        )}
                    </Button>
                </div>

                <div className="absolute bottom-6 sm:bottom-10 left-0 right-0 px-6 sm:px-8 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 text-foreground">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-4 border-background shadow-2xl bg-content1 shrink-0 transform sm:-rotate-3 hover:rotate-0 transition-transform duration-500">
                        <Image
                            src={optimizeImage(restaurant.logo_url) || "https://images.unsplash.com/photo-1522333323558-4446b30f7e17?q=80&w=200"}
                            alt="Logo"
                            fill
                            sizes="(max-width: 640px) 96px, 120px"
                            className="object-cover"
                            unoptimized={!!restaurant.logo_url}
                        />
                    </div>
                    <div className="mb-2 pb-1 flex flex-col items-center sm:items-start text-center sm:text-left">
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tighter mb-1 leading-none uppercase drop-shadow-lg">
                            {restaurant.name}
                        </h2>
                        <p className="text-default-200 sm:text-default-500 text-xs sm:text-sm font-medium tracking-tight mb-3 sm:mb-4 max-w-xl line-clamp-2 drop-shadow-md">
                            {restaurant.description}
                        </p>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
                            <Chip radius="sm" size="sm" variant="flat" className="bg-primary/20 text-white sm:text-primary border border-primary/20 font-black tracking-widest uppercase text-[9px] sm:text-[10px] px-2 sm:px-3 backdrop-blur-md">
                                {restaurant.currency} {formatPrice(priceStats.min)} — {formatPrice(priceStats.max)}
                            </Chip>
                            <div className="hidden sm:block h-4 w-px bg-divider mx-1" />
                            <Chip
                                radius="sm"
                                size="sm"
                                variant="solid"
                                color={timeStatus.isOpen ? "success" : "warning"}
                                className={`font-black tracking-widest uppercase text-[9px] sm:text-[10px] px-2 sm:px-3 shadow-xl ${timeStatus.isOpen ? 'bg-success text-white' : 'bg-warning text-white'}`}
                                startContent={<Clock size={12} className="mr-1" />}
                            >
                                {timeStatus.statusText}
                            </Chip>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Interaction Bar */}
            <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-3xl border-b border-divider py-4 px-4 sm:py-3 sm:px-8 space-y-4 sm:space-y-4 shadow-2xl">
                <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-stretch md:items-center">
                    {/* Hero Search */}
                    <div className="relative flex-grow group">
                        <Input
                            variant="flat"
                            placeholder="SEARCH FOR YOUR FAVORITES..."
                            size="lg"
                            radius="lg"
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                            startContent={<Search className="text-primary group-focus-within:scale-110 transition-transform shrink-0" size={24} strokeWidth={3} />}
                            endContent={searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="p-2 hover:bg-default-200 rounded-full transition-colors shrink-0">
                                    <X className="text-secondary" size={20} />
                                </button>
                            )}
                            classNames={{
                                base: "h-14 sm:h-12",
                                inputWrapper: [
                                    "h-14 sm:h-12",
                                    "bg-default-100",
                                    "border-2 border-transparent",
                                    "group-hover:bg-default-200",
                                    "group-data-[focus=true]:border-primary/50",
                                    "group-data-[focus=true]:bg-default-100",
                                    "px-6",
                                    "flex items-center gap-4",
                                    "transition-all duration-500",
                                    "shadow-inner"
                                ].join(" "),
                                input: "text-base sm:text-sm font-black placeholder:text-default-400 tracking-widest uppercase ml-2",
                                innerWrapper: "flex items-center h-full w-full"
                            }}
                        />
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-[2rem] blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 -z-10" />
                    </div>

                    {/* Interaction Group */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                        {/* View Mode Switcher */}
                        <div className="flex bg-default-100 p-1 rounded-[1.5rem] border border-divider shadow-inner w-full sm:w-auto">
                            <button
                                onClick={() => setViewMode("list")}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-[1.2rem] transition-all duration-500 ${viewMode === 'list' ? 'bg-primary text-white shadow-xl' : 'text-default-500 hover:text-foreground'}`}
                            >
                                <List size={18} strokeWidth={3} />
                                <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Menu</span>
                            </button>
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-[1.2rem] transition-all duration-500 ${viewMode === 'grid' ? 'bg-primary text-white shadow-xl' : 'text-default-500 hover:text-foreground'}`}
                            >
                                <LayoutGrid size={18} strokeWidth={3} />
                                <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Gallery</span>
                            </button>
                        </div>

                        <div className="h-4 sm:h-10 w-px bg-divider mx-2 hidden sm:block" />

                        {/* Sorting Filters */}
                        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                            <Button
                                variant={sortBy.startsWith('price') ? 'solid' : 'flat'}
                                color={sortBy.startsWith('price') ? 'primary' : 'default'}
                                size="lg"
                                radius="full"
                                className="font-black text-[10px] tracking-[0.2em] uppercase h-14 px-8 transition-all"
                                onPress={() => {
                                    if (sortBy === 'price-asc') setSortBy('price-desc');
                                    else if (sortBy === 'price-desc') setSortBy('none');
                                    else setSortBy('price-asc');
                                }}
                            >
                                Price {sortBy === 'price-asc' ? '↑' : sortBy === 'price-desc' ? '↓' : ''}
                            </Button>

                            <Dropdown backdrop="blur" classNames={{ content: "bg-background/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-2 min-w-[200px]" }}>
                                <DropdownTrigger>
                                    <Button
                                        variant={selectedPriceRange ? 'solid' : 'flat'}
                                        color={selectedPriceRange ? 'secondary' : 'default'}
                                        size="lg"
                                        radius="full"
                                        className="font-black text-[10px] tracking-[0.2em] uppercase h-14 px-8 transition-all gap-3"
                                        endContent={<ChevronDown size={14} strokeWidth={3} />}
                                    >
                                        {selectedPriceRange
                                            ? (availablePriceRanges as [number, string][]).find(r => r[0] === selectedPriceRange[0])?.[1] || "Set Cap"
                                            : "Budget Cap"}
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu
                                    aria-label="Budget Caps"
                                    onAction={(key) => {
                                        if (key === "all") {
                                            setSelectedPriceRange(null);
                                        } else {
                                            const cap = (availablePriceRanges as [number, string][]).find(r => `${r[0]}` === key);
                                            if (cap) setSelectedPriceRange([cap[0], 0]);
                                        }
                                    }}
                                    itemClasses={{
                                        base: "rounded-2xl transition-all duration-300 px-4 py-3 data-[hover=true]:bg-primary/20",
                                        title: "text-[10px] font-black uppercase tracking-widest"
                                    }}
                                >
                                    <DropdownSection>
                                        <DropdownItem key="all">No Limit</DropdownItem>
                                    </DropdownSection>
                                    <DropdownSection>
                                        {(availablePriceRanges as [number, string][]).map(cap => (
                                            <DropdownItem key={`${cap[0]}`}>
                                                {cap[1]}
                                            </DropdownItem>
                                        ))}
                                    </DropdownSection>
                                </DropdownMenu>
                            </Dropdown>

                            <Button
                                variant={sortBy === 'time' ? 'solid' : 'flat'}
                                color={sortBy === 'time' ? 'primary' : 'default'}
                                size="lg"
                                radius="full"
                                className="font-black text-[10px] tracking-[0.2em] uppercase h-14 px-8 transition-all"
                                onPress={() => setSortBy(sortBy === 'time' ? 'none' : 'time')}
                            >
                                Fastest
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Category Slider */}
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                    <button
                        onClick={() => setSelectedCategoryId("all")}
                        className={`px-6 h-10 rounded-2xl text-xs font-black tracking-[0.2em] uppercase transition-all duration-300 border ${selectedCategoryId === "all"
                            ? 'bg-primary text-white border-primary shadow-xl'
                            : 'bg-transparent text-default-500 border-divider hover:border-default-400 hover:text-foreground'
                            }`}
                    >
                        Everything
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategoryId(cat.id)}
                            className={`px-6 h-10 rounded-2xl text-xs font-black tracking-[0.2em] uppercase whitespace-nowrap transition-all duration-300 border ${selectedCategoryId === cat.id
                                ? 'bg-primary text-white border-primary shadow-xl'
                                : 'bg-transparent text-default-500 border-divider hover:border-default-400 hover:text-foreground'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu List */}
            <main className="px-4 sm:px-8 py-8 sm:py-16 max-w-7xl mx-auto min-h-[60vh]">
                {filteredMenu.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 sm:py-40 text-center opacity-40">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 sm:mb-8 border border-white/5">
                            <Search size={32} className="sm:w-10 sm:h-10" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black uppercase tracking-[0.2em] text-white mb-2 sm:mb-3">No Discoveries</h3>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">We couldn't find any items matching your current filters.</p>
                    </div>
                ) : (
                    <div className="space-y-16 sm:space-y-32">
                        {filteredMenu.map(cat => (
                            <section key={cat.id} className="space-y-8 sm:space-y-12">
                                <div className="space-y-2">
                                    <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-[0.15em] flex items-center gap-4 sm:gap-6">
                                        {cat.name}
                                        <div className="h-[2px] flex-grow bg-gradient-to-r from-white/20 to-transparent" />
                                    </h3>
                                    <p className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-[0.4em]">{cat.items.length} Handcrafted Dishes</p>
                                </div>

                                {viewMode === "grid" ? (
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-10">
                                        {cat.items.map(item => (
                                            <div
                                                key={item.id}
                                                className="group/item relative bg-content1 border border-divider rounded-[32px] sm:rounded-[48px] p-3 pt-1 sm:p-6 sm:pt-2 transition-all duration-700 hover:bg-content2 hover:border-primary/30 hover:-translate-y-3 shadow-xl hover:shadow-2xl"
                                            >
                                                <div className="flex flex-col h-full">
                                                    <div className="relative aspect-square w-full rounded-2xl sm:rounded-[40px] overflow-hidden bg-background mb-4 sm:mb-8 mt-[-8%] sm:mt-[-15%] shadow-2xl">
                                                        <Image
                                                            src={optimizeImage(item.image_url) || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800"}
                                                            alt={item.name}
                                                            fill
                                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                            className="object-cover transition-transform duration-1000 group-hover/item:scale-110"
                                                            unoptimized={!!item.image_url}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                                                    </div>
                                                    <div className="flex-grow space-y-2 sm:space-y-5 px-1 sm:px-2">
                                                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-start gap-1">
                                                            <div className="flex flex-col gap-0.5">
                                                                <h4 className="text-sm sm:text-2xl font-black text-foreground uppercase tracking-tight leading-tight pt-1 group-hover/item:text-secondary transition-colors line-clamp-2">{item.name}</h4>
                                                                {item.order_count > 10 && (
                                                                    <div className="flex items-center gap-1 text-[7px] sm:text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                                                        <Sparkles size={8} className="sm:w-[10px] sm:h-[10px]" fill="currentColor" />
                                                                        Best Seller
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-base sm:text-2xl font-black text-foreground shrink-0 mt-1 sm:mt-0">
                                                                <span className="text-secondary text-[10px] sm:text-sm mr-1 align-top font-bold">{restaurant.currency}</span>
                                                                {formatPrice(item.price)}
                                                            </span>
                                                        </div>
                                                        <p className="hidden sm:block text-sm font-medium text-default-500 line-clamp-3 leading-relaxed">{item.description || "A culinary masterpiece prepared with the finest ingredients and a touch of chef's magic."}</p>
                                                        <div className="flex items-center gap-3 sm:gap-5 pt-1">
                                                            <div className="flex items-center gap-1.5 sm:gap-2 text-default-400 font-bold text-[8px] sm:text-[10px] tracking-widest uppercase italic border border-divider sm:border-none px-1.5 py-0.5 rounded-full sm:px-0 sm:py-0">
                                                                <Clock size={10} className="text-secondary sm:w-3 sm:h-3" />
                                                                {item.prep_time}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="pt-4 sm:pt-10 mt-auto px-1 sm:px-2">
                                                        <Button
                                                            radius="full"
                                                            className="w-full bg-foreground text-background hover:bg-primary hover:text-white font-black text-[10px] sm:text-sm uppercase tracking-[0.2em] h-10 sm:h-16 transition-all duration-500 shadow-xl active:scale-95"
                                                            onPress={() => handleAddToCart(item)}
                                                            startContent={<Plus size={14} className="sm:w-5 sm:h-5" />}
                                                        >
                                                            Add
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2 sm:space-y-6">
                                        {cat.items.map(item => (
                                            <div
                                                key={item.id}
                                                className="group/list relative bg-content1/50 hover:bg-content1 border border-divider rounded-2xl sm:rounded-[32px] p-3 sm:p-6 transition-all duration-500 flex flex-row items-center gap-3 sm:gap-8"
                                            >
                                                <div className="relative w-14 h-14 sm:w-32 sm:h-32 rounded-xl sm:rounded-3xl overflow-hidden bg-background shrink-0 shadow-sm sm:shadow-xl border border-divider group-hover/list:scale-105 transition-transform duration-700">
                                                    <Image
                                                        src={optimizeImage(item.image_url) || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400"}
                                                        alt={item.name}
                                                        fill
                                                        sizes="(max-width: 640px) 56px, 128px"
                                                        className="object-cover"
                                                        unoptimized={!!item.image_url}
                                                    />
                                                </div>
                                                <div className="flex-grow flex flex-row items-center justify-between gap-2 sm:gap-4">
                                                    <div className="flex-grow flex flex-col gap-0.5 min-w-0">
                                                        <h4 className="text-sm sm:text-2xl font-black text-foreground uppercase tracking-tight leading-tight line-clamp-2 mb-0.5">{item.name}</h4>
                                                        <p className="text-[10px] sm:text-sm font-medium text-default-500 leading-tight">{item.description || "A signature selection from our culinary team."}</p>
                                                        <div className="flex items-center gap-3 mt-1 underline-offset-4">
                                                            <div className="flex items-center gap-1.5 text-secondary text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                                                                <Clock size={11} className="sm:w-3 sm:h-3" />
                                                                {item.prep_time}
                                                            </div>
                                                            {item.order_count > 10 && (
                                                                <div className="flex items-center gap-1 text-[9px] sm:text-[9px] font-black text-amber-500 uppercase tracking-widest">
                                                                    <Sparkles size={9} className="sm:w-[10px] sm:h-[10px]" fill="currentColor" />
                                                                    Popular
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 sm:gap-8 shrink-0 ml-4">
                                                        <div className="text-right">
                                                            <p className="text-base sm:text-3xl font-black text-foreground whitespace-nowrap">
                                                                <span className="text-secondary text-[11px] sm:text-sm mr-1 font-bold">{restaurant.currency}</span>
                                                                {formatPrice(item.price)}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            isIconOnly
                                                            radius="full"
                                                            size="sm"
                                                            className="w-10 h-10 sm:w-16 sm:h-16 bg-foreground text-background hover:bg-primary hover:text-white transition-all duration-500 shadow-lg active:scale-95"
                                                            onPress={() => handleAddToCart(item)}
                                                        >
                                                            <Plus size={18} className="sm:w-6 sm:h-6" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        ))}
                    </div>
                )
                }
            </main >

            {/* Premium Sticky Footer */}
            <AnimatePresence>
                {
                    cartItems.length > 0 && !isOpen && (
                        <motion.div
                            initial={{ y: 200 }}
                            animate={{ y: 0 }}
                            exit={{ y: 200 }}
                            className="fixed bottom-0 left-0 right-0 z-[60] p-4 sm:p-8 pointer-events-none"
                        >
                            <div className="max-w-xl mx-auto pointer-events-auto">
                                <button
                                    className="w-full bg-primary hover:opacity-90 text-white rounded-[2rem] sm:rounded-[32px] h-16 sm:h-20 px-6 sm:px-10 flex items-center justify-between shadow-2xl transition-all duration-300 active:scale-95 border-2 sm:border-4 border-background/20 group/cart"
                                    onClick={onOpen}
                                >
                                    <div className="flex items-center gap-3 sm:gap-5">
                                        <div className="relative h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center bg-white/20 rounded-xl sm:rounded-2xl group-hover/cart:rotate-12 transition-transform">
                                            <ShoppingBag size={16} className="text-white sm:w-5 sm:h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Ready to eat?</p>
                                            <p className="font-black text-sm sm:text-lg leading-none uppercase">{cartItems.reduce((a, b) => a + b.quantity, 0)} Items Selected</p>
                                        </div>
                                    </div>
                                    <div className="h-8 sm:h-10 w-px bg-white/20 mx-1 sm:mx-2" />
                                    <div className="text-right">
                                        {selectedPriceRange && total() > selectedPriceRange[0] ? (
                                            <div className="flex flex-col items-end">
                                                <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-warning mb-0.5 sm:mb-1 flex items-center gap-1">
                                                    <Info size={10} /> Over Cap
                                                </span>
                                                <p className="font-black text-lg sm:text-2xl leading-none text-white">{restaurant.currency} {formatPrice(total())}</p>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total Bill</p>
                                                <p className="font-black text-lg sm:text-2xl leading-none">{restaurant.currency} {formatPrice(total())}</p>
                                            </>
                                        )}
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            <QrStickerModal
                isOpen={isQrModalOpen}
                onClose={() => setIsQrModalOpen(false)}
                restaurant={restaurant}
            />

            {/* Luxury Sidebar/Cart */}
            <Modal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                size="lg"
                placement="center"
                scrollBehavior="inside"
                classNames={{
                    base: "bg-background text-foreground border-divider rounded-none sm:rounded-[48px] h-[100dvh] sm:h-[90vh] sm:m-6",
                    header: "px-8 pt-6 pb-2 border-none",
                    body: "px-8 py-0 no-scrollbar",
                    footer: "px-8 pb-8 pt-6 border-none",
                    closeButton: "top-6 right-8 hover:bg-default-100 rounded-full p-2 transition-colors z-50 text-foreground"
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <h1 className="text-2xl font-black uppercase tracking-tighter">Your Order</h1>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Selection from {restaurant.name}</p>
                            </ModalHeader>
                            <ModalBody>
                                <div className="space-y-6 py-2">
                                    {cartItems.length === 0 ? (
                                        <div className="flex flex-col items-center py-12 gap-6 opacity-20">
                                            <div className="w-20 h-20 bg-default-100 rounded-full flex items-center justify-center border border-divider">
                                                <ShoppingBag size={40} strokeWidth={1} />
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-[0.3em] text-center">Your bag is currently empty</p>
                                        </div>
                                    ) : cartItems.map(item => (
                                        <div key={item.id} className="group relative flex gap-4 items-center">
                                            <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-content1 border border-divider group-hover:scale-105 transition-transform duration-500 shadow-lg">
                                                <Image
                                                    src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200"}
                                                    alt={item.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="flex-grow space-y-2">
                                                <div className="flex justify-between items-start gap-4">
                                                    <span className="font-black uppercase tracking-tight text-base sm:text-lg min-w-0 flex-grow">{item.name}</span>
                                                    <span className="font-black text-primary text-sm shrink-0">{restaurant.currency} {formatPrice(item.price * item.quantity)}</span>
                                                </div>
                                                <p className="text-xs font-medium text-default-500 leading-tight line-clamp-2">
                                                    {item.description}
                                                </p>
                                                <div className="flex items-center justify-between gap-1.5">
                                                    <div className="bg-default-100 border border-divider rounded-full px-2 py-1 flex items-center gap-4">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                                            className="text-default-400 hover:text-primary transition-colors"
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <span className="font-black text-xs w-3 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                            className="text-default-400 hover:text-primary transition-colors"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>

                                                    <Button
                                                        isIconOnly
                                                        variant="flat"
                                                        size="sm"
                                                        radius="full"
                                                        color="danger"
                                                        className="opacity-100 bg-danger/10 hover:bg-danger hover:text-white transition-all duration-300"
                                                        onClick={() => removeItem(item.id)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ModalBody>
                            <ModalFooter className="flex flex-col gap-6">
                                <div className="space-y-4 w-full">
                                    {selectedPriceRange && total() > selectedPriceRange[0] && (
                                        <div className="bg-danger/10 border border-danger/20 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                                            <Info className="text-danger" size={20} />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-danger">
                                                Over Budget! Limit is {restaurant.currency} {formatPrice(selectedPriceRange[0])}
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center opacity-60">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Subtotal</span>
                                        <span className="font-black">{restaurant.currency} {formatPrice(total())}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-divider pt-4">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Total Amount</span>
                                        <span className="text-3xl font-black">{restaurant.currency} {formatPrice(total())}</span>
                                    </div>
                                </div>
                                <Button
                                    className="w-full h-20 bg-primary hover:opacity-90 text-white font-black text-lg uppercase tracking-widest rounded-3xl shadow-2xl transition-all duration-300 active:scale-95"
                                    onPress={handleCheckout}
                                    disabled={cartItems.length === 0}
                                >
                                    Confirm via WhatsApp
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal >
        </div >
    );
}
