"use client";

import { useEffect, useState, use, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { Spinner, Chip } from "@heroui/react";
import { ArrowLeft, Plus, Trash2, Edit2, GripVertical, Image as ImageIcon, Store, Tag, DollarSign, Save, X, Layout, Search, Filter, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import Image from "next/image";

interface Category {
    id: string;
    name: string;
    description: string | null;
    display_order: number;
}

interface MenuItem {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    is_available: boolean;
    display_order: number;
}

export default function MenuManagementPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const restaurantId = resolvedParams.id;

    const [restaurant, setRestaurant] = useState<any>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    // Modal states
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

    // Form states
    const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
    const [itemForm, setItemForm] = useState({ name: "", description: "", price: "", image_url: "", is_available: true });
    const [isSaving, setIsSaving] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        fetchData();
    }, [restaurantId]);

    const fetchData = async () => {
        // Fetch restaurant
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

        // Fetch categories
        const { data: cats } = await supabase
            .from('categories')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('display_order', { ascending: true });

        if (cats) {
            setCategories(cats);
            if (cats.length > 0 && !activeCategory) {
                setActiveCategory(cats[0].id);
            }
        }

        // Fetch all items for this restaurant
        const { data: menuItems } = await supabase
            .from('items')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('display_order', { ascending: true });

        if (menuItems) setItems(menuItems);

        setLoading(false);
    };

    // Category CRUD
    const openCategoryModal = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setCategoryForm({ name: category.name, description: category.description || "" });
        } else {
            setEditingCategory(null);
            setCategoryForm({ name: "", description: "" });
        }
        setShowCategoryModal(true);
    };

    const saveCategory = async () => {
        if (!categoryForm.name.trim()) {
            alert("Category name is required");
            return;
        }
        setIsSaving(true);

        let error = null;

        if (editingCategory) {
            // Update
            const result = await supabase
                .from('categories')
                .update({ name: categoryForm.name, description: categoryForm.description || null })
                .eq('id', editingCategory.id);
            error = result.error;
        } else {
            // Create - First check if it exists
            const existing = categories.find(c => c.name.toLowerCase() === categoryForm.name.toLowerCase().trim());
            if (existing) {
                setActiveCategory(existing.id);
                setShowCategoryModal(false);
                setIsSaving(false);
                return;
            }

            const newOrder = categories.length;
            const result = await supabase.from('categories').insert({
                restaurant_id: restaurantId,
                name: categoryForm.name,
                description: categoryForm.description || null,
                display_order: newOrder
            });
            error = result.error;
        }

        if (error) {
            console.error("Category save error:", error);
            alert("Error saving category: " + error.message);
            setIsSaving(false);
            return;
        }

        setShowCategoryModal(false);
        setIsSaving(false);
        fetchData();
    };

    const deleteCategory = async (categoryId: string) => {
        if (!confirm("Delete this category and all its items?")) return;

        // Delete items first
        await supabase.from('items').delete().eq('category_id', categoryId);
        // Delete category
        await supabase.from('categories').delete().eq('id', categoryId);

        if (activeCategory === categoryId) {
            setActiveCategory(categories.find(c => c.id !== categoryId)?.id || null);
        }
        fetchData();
    };

    // Item CRUD
    const openItemModal = (item?: MenuItem) => {
        if (item) {
            setEditingItem(item);
            setItemForm({
                name: item.name,
                description: item.description || "",
                price: item.price.toString(),
                image_url: item.image_url || "",
                is_available: item.is_available
            });
        } else {
            setEditingItem(null);
            setItemForm({ name: "", description: "", price: "", image_url: "", is_available: true });
        }
        setShowItemModal(true);
    };

    const saveItem = async () => {
        if (!itemForm.name.trim() || !itemForm.price) {
            alert("Name and price are required");
            return;
        }
        if (!activeCategory) {
            alert("Please select a category first");
            return;
        }
        setIsSaving(true);

        const priceNum = parseFloat(itemForm.price);
        if (isNaN(priceNum) || priceNum < 0) {
            alert("Invalid price");
            setIsSaving(false);
            return;
        }

        if (editingItem) {
            // Update
            await supabase
                .from('items')
                .update({
                    name: itemForm.name,
                    description: itemForm.description || null,
                    price: priceNum,
                    image_url: itemForm.image_url || null,
                    is_available: itemForm.is_available
                })
                .eq('id', editingItem.id);
        } else {
            // Create
            const categoryItems = items.filter(i => i.category_id === activeCategory);
            const newOrder = categoryItems.length;
            await supabase.from('items').insert({
                restaurant_id: restaurantId,
                category_id: activeCategory,
                name: itemForm.name,
                description: itemForm.description || null,
                price: priceNum,
                image_url: itemForm.image_url || null,
                is_available: itemForm.is_available,
                display_order: newOrder
            });
        }

        setShowItemModal(false);
        setIsSaving(false);
        fetchData();
    };

    const deleteItem = async (itemId: string) => {
        if (!confirm("Delete this item?")) return;
        await supabase.from('items').delete().eq('id', itemId);
        fetchData();
    };

    const toggleItemAvailability = async (item: MenuItem) => {
        await supabase.from('items').update({ is_available: !item.is_available }).eq('id', item.id);
        fetchData();
    };

    const mergeDuplicateCategories = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            // Group categories by lowercase name
            const groups: { [key: string]: Category[] } = {};
            categories.forEach(cat => {
                const name = cat.name.toLowerCase().trim();
                if (!groups[name]) groups[name] = [];
                groups[name].push(cat);
            });

            const duplicateGroups = Object.values(groups).filter(g => g.length > 1);
            if (duplicateGroups.length === 0) {
                setIsSaving(false);
                return;
            }

            for (const group of duplicateGroups) {
                const mainCat = group[0];
                const otherCatIds = group.slice(1).map(c => c.id);

                // 1. Move items to main category
                const { error: moveError } = await supabase
                    .from('items')
                    .update({ category_id: mainCat.id })
                    .in('category_id', otherCatIds);

                if (moveError) throw moveError;

                // 2. Delete empty duplicate categories
                const { error: deleteError } = await supabase
                    .from('categories')
                    .delete()
                    .in('id', otherCatIds);

                if (deleteError) throw deleteError;
            }

            await fetchData();
            alert("Categories merged successfully!");
        } catch (err: any) {
            console.error("Merge error:", err);
            alert("Failed to merge categories: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const hasDuplicates = useMemo(() => {
        const names = categories.map(c => c.name.toLowerCase().trim());
        return new Set(names).size !== names.length;
    }, [categories]);

    // Filter items for active category
    const filteredItems = items.filter(i => i.category_id === activeCategory);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-black text-white">
                <div className="flex flex-col items-center gap-4">
                    <Spinner size="lg" color="primary" />
                    <p className="text-gray-400 animate-pulse">Loading Menu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            {/* Header */}
            <header className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold line-clamp-1">{restaurant?.name}</h1>
                            <p className="text-xs text-gray-400">Menu Management</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <Link href={`/dashboard/restaurants/${restaurantId}/scan`} className="w-full sm:w-auto">
                            <button className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                <Sparkles size={16} />
                                Hunggree AI Scanner
                            </button>
                        </Link>
                        <Link href={`/menu/${restaurant?.slug}`} target="_blank" className="w-full sm:w-auto">
                            <button className="w-full sm:w-auto px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                                Preview Menu <ArrowLeft className="rotate-180" size={14} />
                            </button>
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4 md:p-6">
                {/* Sub-Navigation */}
                <div className="w-full md:w-fit grid grid-cols-2 md:flex bg-zinc-900 rounded-2xl border border-white/5 p-1 mb-8 gap-1">
                    <button className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                        <Layout size={18} />
                        Menu
                    </button>
                    <Link href={`/dashboard/restaurants/${restaurantId}/profile`}>
                        <button className="w-full px-6 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                            <Store size={18} />
                            Profile
                        </button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Categories Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-zinc-900 rounded-2xl border border-white/5 p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold flex items-center gap-2">
                                    <Tag size={18} className="text-primary" />
                                    Categories
                                </h2>
                                <div className="flex items-center gap-2">
                                    {hasDuplicates && (
                                        <button
                                            onClick={mergeDuplicateCategories}
                                            disabled={isSaving}
                                            className="p-2 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 rounded-lg transition-colors animate-pulse"
                                            title="Merge Duplicate Categories"
                                        >
                                            <Sparkles size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => openCategoryModal()}
                                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>

                            {categories.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-8">No categories yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {categories.map(cat => (
                                        <div
                                            key={cat.id}
                                            className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${activeCategory === cat.id
                                                ? 'bg-blue-600/20 border border-blue-500/30'
                                                : 'hover:bg-white/5 border border-transparent'
                                                }`}
                                            onClick={() => setActiveCategory(cat.id)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <GripVertical size={14} className="text-gray-500" />
                                                <span className="font-medium text-sm">{cat.name}</span>
                                                <Chip size="sm" variant="flat" className="ml-1">
                                                    {items.filter(i => i.category_id === cat.id).length}
                                                </Chip>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); openCategoryModal(cat); }} className="p-1 hover:text-blue-400">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }} className="p-1 hover:text-red-400">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items Grid */}
                    <div className="lg:col-span-3">
                        <div className="bg-zinc-900 rounded-2xl border border-white/5 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-bold text-lg">
                                    {activeCategory ? categories.find(c => c.id === activeCategory)?.name : 'Select a Category'}
                                </h2>
                                {activeCategory && (
                                    <button
                                        onClick={() => openItemModal()}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors font-medium"
                                    >
                                        <Plus size={18} />
                                        Add Item
                                    </button>
                                )}
                            </div>

                            {!activeCategory ? (
                                <div className="text-center py-16 text-gray-500">
                                    <Store size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>Create a category first, then add items to it.</p>
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="text-center py-16 text-gray-500">
                                    <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No items in this category yet.</p>
                                    <button
                                        onClick={() => openItemModal()}
                                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                                    >
                                        Add First Item
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredItems.map(item => (
                                        <div
                                            key={item.id}
                                            className="group bg-zinc-800 rounded-xl border border-white/5 overflow-hidden hover:border-white/10 transition-colors"
                                        >
                                            {/* Image */}
                                            <div className="h-32 bg-zinc-700 relative">
                                                {item.image_url ? (
                                                    <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <ImageIcon size={32} className="text-zinc-600" />
                                                    </div>
                                                )}
                                                {/* Availability Badge */}
                                                <button
                                                    onClick={() => toggleItemAvailability(item)}
                                                    className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-medium transition-colors ${item.is_available
                                                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                        }`}
                                                >
                                                    {item.is_available ? 'Available' : 'Sold Out'}
                                                </button>
                                            </div>

                                            {/* Content */}
                                            <div className="p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-bold text-white">{item.name}</h3>
                                                    <span className="text-green-400 font-bold flex items-center gap-1">
                                                        <span className="text-xs">{restaurant?.currency || '$'}</span>
                                                        {formatPrice(item.price)}
                                                    </span>
                                                </div>
                                                {item.description && (
                                                    <p className="text-xs text-gray-400 line-clamp-2 mb-3">{item.description}</p>
                                                )}
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openItemModal(item)}
                                                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <Edit2 size={12} /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteItem(item.id)}
                                                        className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)} />
                    <div className="relative bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-bold">{editingCategory ? 'Edit Category' : 'New Category'}</h2>
                            <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-white/5 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Category Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Appetizers"
                                    value={categoryForm.name}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                                <textarea
                                    placeholder="Optional description..."
                                    value={categoryForm.description}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                            <button onClick={() => setShowCategoryModal(false)} className="px-5 py-2.5 text-gray-400 hover:bg-white/5 rounded-xl transition-colors font-medium">
                                Cancel
                            </button>
                            <button onClick={saveCategory} disabled={isSaving} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors font-medium flex items-center gap-2">
                                {isSaving ? <Spinner size="sm" /> : <Save size={16} />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Item Modal */}
            {showItemModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowItemModal(false)} />
                    <div className="relative bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-zinc-900">
                            <h2 className="text-xl font-bold">{editingItem ? 'Edit Item' : 'New Item'}</h2>
                            <button onClick={() => setShowItemModal(false)} className="p-2 hover:bg-white/5 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Item Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Margherita Pizza"
                                    value={itemForm.name}
                                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                                <textarea
                                    placeholder="Delicious description..."
                                    value={itemForm.description}
                                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Price *</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">{restaurant?.currency || '$'}</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="9.99"
                                        value={itemForm.price}
                                        onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Image URL</label>
                                <input
                                    type="url"
                                    placeholder="https://example.com/image.jpg"
                                    value={itemForm.image_url}
                                    onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                <p className="text-xs text-gray-500 mt-1">Paste an image URL (e.g., from Unsplash)</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="is_available"
                                    checked={itemForm.is_available}
                                    onChange={(e) => setItemForm({ ...itemForm, is_available: e.target.checked })}
                                    className="w-5 h-5 rounded bg-zinc-800 border-white/10 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="is_available" className="text-sm font-medium text-gray-300">Available for ordering</label>
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/10 flex justify-end gap-3 sticky bottom-0 bg-zinc-900">
                            <button onClick={() => setShowItemModal(false)} className="px-5 py-2.5 text-gray-400 hover:bg-white/5 rounded-xl transition-colors font-medium">
                                Cancel
                            </button>
                            <button onClick={saveItem} disabled={isSaving} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors font-medium flex items-center gap-2">
                                {isSaving ? <Spinner size="sm" /> : <Save size={16} />}
                                Save Item
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
