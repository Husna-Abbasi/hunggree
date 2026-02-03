import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    id: string; // The menu item ID
    name: string;
    price: number;
    quantity: number;
    image?: string;
    description?: string;
    options?: Record<string, string>; // e.g. { size: "large", spicy: "mild" }
}

interface CartState {
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    clearCart: () => void;
    total: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            addItem: (newItem) =>
                set((state) => {
                    const existingItem = state.items.find((i) => i.id === newItem.id);
                    if (existingItem) {
                        return {
                            items: state.items.map((i) =>
                                i.id === newItem.id
                                    ? { ...i, ...newItem, quantity: i.quantity + newItem.quantity }
                                    : i
                            ),
                        };
                    }
                    return { items: [...state.items, newItem] };
                }),
            removeItem: (itemId) =>
                set((state) => ({ items: state.items.filter((i) => i.id !== itemId) })),
            updateQuantity: (itemId, quantity) =>
                set((state) => ({
                    items: state.items.map((i) =>
                        i.id === itemId ? { ...i, quantity } : i
                    ),
                })),
            clearCart: () => set({ items: [] }),
            total: () => {
                const items = get().items;
                return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
            },
        }),
        {
            name: 'cart-storage', // unique name
        }
    )
);
