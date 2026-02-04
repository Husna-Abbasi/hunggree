"use client";

import Link from "next/link";
import { Layout, Store } from "lucide-react";
import { usePathname } from "next/navigation";

export default function RestaurantTabs({ restaurantId }: { restaurantId: string }) {
    const pathname = usePathname();
    const isMenu = pathname?.includes("/menu");
    const isProfile = pathname?.includes("/profile");

    return (
        <div className="flex p-1 bg-zinc-900 rounded-2xl border border-white/5 w-fit mb-8">
            <Link href={`/dashboard/restaurants/${restaurantId}/menu`}>
                <button
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isMenu
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                >
                    <Layout size={18} />
                    Menu
                </button>
            </Link>
            <Link href={`/dashboard/restaurants/${restaurantId}/profile`}>
                <button
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isProfile
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                >
                    <Store size={18} />
                    Profile
                </button>
            </Link>
        </div>
    );
}
