'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { searchMenuItems } from '@/app/actions';

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

interface SearchResult {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    restaurant_slug: string;
    restaurant_name: string;
    currency: string;
}

export default function LandingSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const debouncedQuery = useDebounce(query, 300);
    const router = useRouter();
    const searchRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        async function performSearch() {
            if (debouncedQuery.length < 2) {
                setResults([]);
                return;
            }

            setIsLoading(true);
            try {
                const data = await searchMenuItems(debouncedQuery);
                setResults(data);
                setIsOpen(true);
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setIsLoading(false);
            }
        }

        performSearch();
    }, [debouncedQuery]);

    const handleSelect = (slug: string) => {
        router.push(`/menu/${slug}`);
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] md:w-full md:max-w-md px-4" ref={searchRef}>
            <motion.div
                initial={{ y: 50, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{
                    delay: 0.5,
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                    mass: 0.8
                }}
                className="relative"
            >
                <div className={`relative flex items-center bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-full transition-all duration-300 ${isOpen && results.length > 0 ? 'rounded-b-none rounded-t-[24px]' : 'shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_60px_rgba(var(--primary-rgb),0.4)]'
                    }`}>
                    <div className="absolute inset-0 rounded-full border border-primary/20 animate-pulse pointer-events-none" />
                    <Search className="absolute left-5 text-primary w-6 h-6" />
                    <input
                        type="text"
                        placeholder="Search for cravings..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (e.target.value.length >= 2) setIsOpen(true);
                        }}
                        onFocus={() => {
                            if (results.length > 0) setIsOpen(true);
                        }}
                        className="w-full bg-transparent text-white placeholder-gray-400 py-5 pl-14 pr-12 outline-none text-base font-bold rounded-full"
                    />
                    {isLoading && (
                        <div className="absolute right-5">
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        </div>
                    )}
                </div>

                <AnimatePresence>
                    {isOpen && results.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute bottom-full left-0 right-0 w-full bg-zinc-900/95 backdrop-blur-xl border border-white/10 border-b-0 rounded-t-[20px] overflow-hidden shadow-2xl max-h-[60vh] overflow-y-auto mb-2"
                        >
                            <div className="p-2 space-y-1">
                                {results.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        layoutId={item.id}
                                        onClick={() => handleSelect(item.restaurant_slug)}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors"
                                    >
                                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                                            {item.image_url ? (
                                                <Image
                                                    src={item.image_url}
                                                    alt={item.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 font-bold">
                                                    {item.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{item.name}</h4>
                                            <p className="text-xs text-gray-500 truncate">{item.restaurant_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-sm font-bold text-primary">{item.currency} {item.price}</span>
                                            <ArrowRight className="w-4 h-4 text-gray-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            <div className="px-4 py-2 bg-black/20 text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center border-t border-white/5">
                                {results.length} results found
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
