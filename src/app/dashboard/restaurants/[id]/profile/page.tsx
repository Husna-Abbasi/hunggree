"use client";

import { useEffect, useState, use, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { Spinner, Button, Input, Textarea, Card, CardBody, Switch } from "@heroui/react";
import {
    ArrowLeft, Save, Store, MapPin, Phone, MessageCircle,
    Globe, Image as ImageIcon, Layout,
    Clock, Bold, Italic, Strikethrough, Code, Type
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function RestaurantProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const restaurantId = resolvedParams.id;

    const [restaurant, setRestaurant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        description: "",
        address: "",
        whatsapp_number: "",
        logo_url: "",
        cover_image_url: "",
        currency: "USD",
        is_active: true,
        opening_time: "09:00",
        closing_time: "22:00",
        whatsapp_template: ""
    });

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        fetchRestaurant();
    }, [restaurantId]);

    const fetchRestaurant = async () => {
        const { data: rest, error } = await supabase
            .from('restaurants')
            .select('*')
            .eq('id', restaurantId)
            .single();

        if (error || !rest) {
            router.push('/dashboard');
            return;
        }

        setRestaurant(rest);
        setFormData({
            name: rest.name || "",
            slug: rest.slug || "",
            description: rest.description || "",
            address: rest.address || "",
            whatsapp_number: rest.whatsapp_number || "",
            logo_url: rest.logo_url || "",
            cover_image_url: rest.cover_image_url || "",
            currency: rest.currency || "USD",
            is_active: rest.is_active ?? true,
            opening_time: rest.opening_time ? rest.opening_time.substring(0, 5) : "09:00",
            closing_time: rest.closing_time ? rest.closing_time.substring(0, 5) : "22:00",
            whatsapp_template: rest.whatsapp_template || ""
        });
        setLoading(false);
    };

    const insertTemplateTag = (tag: string, isWrap = false) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.whatsapp_template;
        const selected = text.substring(start, end);

        let newText = "";
        if (isWrap) {
            newText = text.substring(0, start) + tag + selected + tag + text.substring(end);
        } else {
            newText = text.substring(0, start) + tag + text.substring(end);
        }

        setFormData({ ...formData, whatsapp_template: newText });

        // Set focus back to textarea
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = isWrap ? end + tag.length * 2 : start + tag.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
        if (e && 'preventDefault' in e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
        setIsSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("Your session has expired. Please log in again.");
            setIsSaving(false);
            return;
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'admin';

        console.log("Saving restaurant with data:", formData);

        let query = supabase
            .from('restaurants')
            .update({
                name: formData.name,
                description: formData.description,
                address: formData.address,
                whatsapp_number: formData.whatsapp_number,
                logo_url: formData.logo_url,
                cover_image_url: formData.cover_image_url,
                currency: formData.currency,
                is_active: formData.is_active,
                opening_time: formData.opening_time,
                closing_time: formData.closing_time,
                whatsapp_template: formData.whatsapp_template,
                updated_at: new Date().toISOString()
            })
            .eq('id', restaurantId);

        // Only restrict to owner if NOT admin
        if (!isAdmin) {
            query = query.eq('owner_id', user.id);
        }

        const { data: updatedRows, error } = await query.select();

        if (error) {
            console.error("Supabase Update Error:", error);
            alert("Error updating restaurant: " + error.message);
        } else if (updatedRows && updatedRows.length > 0) {
            const updatedData = updatedRows[0];
            setRestaurant(updatedData);
            setFormData({
                name: updatedData.name || "",
                slug: updatedData.slug || "",
                description: updatedData.description || "",
                address: updatedData.address || "",
                whatsapp_number: updatedData.whatsapp_number || "",
                logo_url: updatedData.logo_url || "",
                cover_image_url: updatedData.cover_image_url || "",
                currency: updatedData.currency || "USD",
                is_active: updatedData.is_active ?? true,
                opening_time: updatedData.opening_time ? updatedData.opening_time.substring(0, 5) : "09:00",
                closing_time: updatedData.closing_time ? updatedData.closing_time.substring(0, 5) : "22:00",
                whatsapp_template: updatedData.whatsapp_template || ""
            });
            alert("Restaurant profile updated successfully! 🎉");
        } else {
            console.warn("Update succeeded but 0 rows returned. Checking if owner_id matches...");
            alert("No changes were saved. \n\nThis usually happens if your user account isn't marked as the 'Owner' of this restaurant in the database. Please verify your RLS policies or owner_id in Supabase.");
        }
        setIsSaving(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-black text-white">
                <Spinner size="lg" color="primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">{formData.name || "Restaurant Profile"}</h1>
                            <p className="text-xs text-gray-400">Manage Identity & Settings</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={`/menu/${restaurant?.slug}`} target="_blank">
                            <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-colors">
                                View Public Page →
                            </button>
                        </Link>
                        <Button
                            color="primary"
                            onPress={() => handleSave()}
                            isLoading={isSaving}
                            className="font-bold rounded-xl"
                            startContent={!isSaving && <Save size={18} />}
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            </header>

            {/* Sub-Navigation */}
            <div className="max-w-4xl mx-auto px-6 mt-8">
                <div className="flex p-1 bg-zinc-900 rounded-2xl border border-white/5 w-fit mb-10">
                    <Link href={`/dashboard/restaurants/${restaurantId}/menu`}>
                        <button className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-all flex items-center gap-2">
                            <Layout size={18} />
                            Menu
                        </button>
                    </Link>
                    <button className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white shadow-lg shadow-blue-500/20 flex items-center gap-2">
                        <Store size={18} />
                        Profile
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-8">
                    {/* Status Card */}
                    <Card className="bg-zinc-900 border border-white/5 shadow-xl">
                        <CardBody className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${formData.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        <Globe size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">Online Visibility</h3>
                                        <p className="text-sm text-gray-400">Turn on to make your menu visible to customers.</p>
                                    </div>
                                </div>
                                <Switch
                                    isSelected={formData.is_active}
                                    onValueChange={(val) => setFormData({ ...formData, is_active: val })}
                                    color="success"
                                />
                            </div>
                        </CardBody>
                    </Card>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-1">
                            <h2 className="text-xl font-bold mb-2">Basic Information</h2>
                            <p className="text-sm text-gray-500">Your restaurant's core identity and how customers find you.</p>
                        </div>
                        <div className="md:col-span-2 space-y-6 bg-zinc-900/50 p-8 rounded-[32px] border border-white/5">
                            <div className="space-y-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-400 ml-1">Restaurant Name</label>
                                    <Input
                                        placeholder="e.g. The Italian Kitchen"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        variant="bordered"
                                        size="lg"
                                        radius="lg"
                                        startContent={<Store className="text-gray-500" size={18} />}
                                        classNames={{ inputWrapper: "border-white/10 hover:border-white/20 focus-within:!border-primary" }}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-400 ml-1">Unique Slug (URL)</label>
                                    <Input
                                        placeholder="italian-kitchen-ny"
                                        value={formData.slug}
                                        disabled
                                        variant="bordered"
                                        size="lg"
                                        radius="lg"
                                        startContent={<Globe className="text-gray-500" size={18} />}
                                        description="Used for your public menu link."
                                        classNames={{ inputWrapper: "border-white/10 opacity-50 bg-white/5" }}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-400 ml-1">Description</label>
                                    <Textarea
                                        placeholder="Tell us about your restaurant, cuisine, and atmosphere..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        variant="bordered"
                                        size="lg"
                                        radius="lg"
                                        classNames={{ inputWrapper: "border-white/10 hover:border-white/20 focus-within:!border-primary" }}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-400 ml-1">Currency Symbol/Code</label>
                                    <Input
                                        placeholder="e.g. USD, €, Rs."
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        variant="bordered"
                                        size="lg"
                                        radius="lg"
                                        startContent={<span className="text-gray-500 font-bold ml-1">$</span>}
                                        description="This symbol will appear next to your prices."
                                        classNames={{ inputWrapper: "border-white/10 hover:border-white/20 focus-within:!border-primary" }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Operating Hours */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-white/5">
                        <div className="md:col-span-1">
                            <h2 className="text-xl font-bold mb-2">Operating Hours</h2>
                            <p className="text-sm text-gray-500">Set your restaurant's daily opening and closing schedule.</p>
                        </div>
                        <div className="md:col-span-2 space-y-6 bg-zinc-900/50 p-8 rounded-[32px] border border-white/5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-400 ml-1">Opening Time</label>
                                    <Input
                                        type="time"
                                        value={formData.opening_time}
                                        onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                                        variant="bordered"
                                        size="lg"
                                        radius="lg"
                                        startContent={<Clock className="text-gray-500" size={18} />}
                                        classNames={{ inputWrapper: "border-white/10 hover:border-white/20 focus-within:!border-primary" }}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-400 ml-1">Closing Time</label>
                                    <Input
                                        type="time"
                                        value={formData.closing_time}
                                        onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                                        variant="bordered"
                                        size="lg"
                                        radius="lg"
                                        startContent={<Clock className="text-gray-500" size={18} />}
                                        classNames={{ inputWrapper: "border-white/10 hover:border-white/20 focus-within:!border-primary" }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact & Location */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-white/5">
                        <div className="md:col-span-1">
                            <h2 className="text-xl font-bold mb-2">Contact & Location</h2>
                            <p className="text-sm text-gray-500">Where you are located and how customers can contact you via WhatsApp.</p>
                        </div>
                        <div className="md:col-span-2 space-y-6 bg-zinc-900/50 p-8 rounded-[32px] border border-white/5">
                            <div className="space-y-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-400 ml-1">Physical Address</label>
                                    <Input
                                        placeholder="e.g. 123 Main St, New York"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        variant="bordered"
                                        size="lg"
                                        radius="lg"
                                        startContent={<MapPin className="text-gray-500" size={18} />}
                                        classNames={{ inputWrapper: "border-white/10 hover:border-white/20 focus-within:!border-primary" }}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-400 ml-1">WhatsApp Business Number</label>
                                    <Input
                                        placeholder="e.g. 923001234567"
                                        value={formData.whatsapp_number}
                                        onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                                        variant="bordered"
                                        size="lg"
                                        radius="lg"
                                        startContent={<MessageCircle className="text-gray-500" size={18} />}
                                        description="Include country code (e.g., 92 for Pakistan). You can include the '+' symbol."
                                        classNames={{ inputWrapper: "border-white/10 hover:border-white/20 focus-within:!border-primary" }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-white/5">
                        <div className="md:col-span-1">
                            <h2 className="text-xl font-bold mb-2">Order Settings</h2>
                            <p className="text-sm text-gray-500">Configure how orders are sent to you on WhatsApp.</p>
                        </div>
                        <div className="md:col-span-2 space-y-6 bg-zinc-900/50 p-8 rounded-[32px] border border-white/5">
                            <div className="space-y-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-400 ml-1">WhatsApp Message Template</label>

                                    {/* Formatting Toolbar */}
                                    <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-800/50 rounded-2xl border border-white/5 mb-2">
                                        <div className="flex gap-1 pr-2 border-r border-white/10">
                                            <Button isIconOnly size="sm" variant="flat" className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10" onPress={() => insertTemplateTag('*', true)} title="Bold">
                                                <Bold size={14} />
                                            </Button>
                                            <Button isIconOnly size="sm" variant="flat" className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10" onPress={() => insertTemplateTag('_', true)} title="Italic">
                                                <Italic size={14} />
                                            </Button>
                                            <Button isIconOnly size="sm" variant="flat" className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10" onPress={() => insertTemplateTag('~', true)} title="Strikethrough">
                                                <Strikethrough size={14} />
                                            </Button>
                                            <Button isIconOnly size="sm" variant="flat" className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10" onPress={() => insertTemplateTag('```', true)} title="Monospace">
                                                <Code size={14} />
                                            </Button>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 pl-1">
                                            <Button size="sm" variant="flat" className="h-8 text-[10px] font-black tracking-widest uppercase rounded-lg bg-primary/10 text-primary hover:bg-primary/20" onPress={() => insertTemplateTag('{items}')}>
                                                Items
                                            </Button>
                                            <Button size="sm" variant="flat" className="h-8 text-[10px] font-black tracking-widest uppercase rounded-lg bg-primary/10 text-primary hover:bg-primary/20" onPress={() => insertTemplateTag('{total}')}>
                                                Total
                                            </Button>
                                            <Button size="sm" variant="flat" className="h-8 text-[10px] font-black tracking-widest uppercase rounded-lg bg-primary/10 text-primary hover:bg-primary/20" onPress={() => insertTemplateTag('{order_id}')}>
                                                Order ID
                                            </Button>
                                            <Button size="sm" variant="flat" className="h-8 text-[10px] font-black tracking-widest uppercase rounded-lg bg-primary/10 text-primary hover:bg-primary/20" onPress={() => insertTemplateTag('{restaurant_name}')}>
                                                Name
                                            </Button>
                                        </div>
                                    </div>

                                    <Textarea
                                        ref={textareaRef}
                                        placeholder="Customize your order message..."
                                        value={formData.whatsapp_template}
                                        onChange={(e) => setFormData({ ...formData, whatsapp_template: e.target.value })}
                                        variant="bordered"
                                        size="lg"
                                        radius="lg"
                                        minRows={8}
                                        classNames={{ inputWrapper: "border-white/10 hover:border-white/20 focus-within:!border-primary" }}
                                    />
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 mt-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Available Placeholders</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                                                <span className="text-primary font-bold">{"{items}"}</span>
                                                <span>List of ordered items</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                                                <span className="text-primary font-bold">{"{total}"}</span>
                                                <span>Total amount of order</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                                                <span className="text-primary font-bold">{"{restaurant_name}"}</span>
                                                <span>Your restaurant name</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                                                <span className="text-primary font-bold">{"{order_id}"}</span>
                                                <span>Short unique ID</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Brand Assets */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-white/5">
                        <div className="md:col-span-1">
                            <h2 className="text-xl font-bold mb-2">Brand Assets</h2>
                            <p className="text-sm text-gray-500">Logo and cover image to make your menu stand out.</p>
                        </div>
                        <div className="md:col-span-2 space-y-6 bg-zinc-900/50 p-8 rounded-[32px] border border-white/5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <label className="text-sm font-bold text-gray-400 ml-1">Logo URL</label>
                                    <div className="relative group">
                                        <div className="w-full aspect-square bg-zinc-800 rounded-3xl border border-white/10 flex items-center justify-center overflow-hidden mb-4">
                                            {formData.logo_url ? (
                                                <img src={formData.logo_url} className="w-full h-full object-cover" alt="Logo preview" />
                                            ) : (
                                                <Store size={40} className="text-zinc-700" />
                                            )}
                                        </div>
                                        <Input
                                            placeholder="Paste URL..."
                                            value={formData.logo_url}
                                            onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                                            variant="bordered"
                                            radius="lg"
                                            classNames={{ inputWrapper: "border-white/10" }}
                                            startContent={<ImageIcon size={14} className="text-gray-500" />}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-sm font-bold text-gray-400 ml-1">Cover Image URL</label>
                                    <div className="relative group">
                                        <div className="w-full aspect-[16/9] sm:aspect-square bg-zinc-800 rounded-3xl border border-white/10 flex items-center justify-center overflow-hidden mb-4">
                                            {formData.cover_image_url ? (
                                                <img src={formData.cover_image_url} className="w-full h-full object-cover" alt="Cover preview" />
                                            ) : (
                                                <ImageIcon size={40} className="text-zinc-700" />
                                            )}
                                        </div>
                                        <Input
                                            placeholder="Paste URL..."
                                            value={formData.cover_image_url}
                                            onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                                            variant="bordered"
                                            radius="lg"
                                            classNames={{ inputWrapper: "border-white/10" }}
                                            startContent={<ImageIcon size={14} className="text-gray-500" />}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="flex justify-end gap-4 pt-10">
                        <Button
                            variant="light"
                            className="font-bold rounded-xl text-gray-400"
                            onPress={() => router.push('/dashboard')}
                        >
                            Back to Dashboard
                        </Button>
                        <Button
                            color="primary"
                            onPress={() => handleSave()}
                            isLoading={isSaving}
                            size="lg"
                            className="font-bold px-10 rounded-2xl shadow-xl shadow-primary/30"
                        >
                            {isSaving ? "Saving..." : "Save All Changes"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
