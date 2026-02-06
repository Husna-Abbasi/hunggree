"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ChevronDown, Mail, MessageCircle, HelpCircle } from "lucide-react";

interface FAQItem {
    question: string;
    answer: string;
    category: string;
}

const faqs: FAQItem[] = [
    // General
    {
        category: "General",
        question: "What is Hunggree?",
        answer: "Hunggree is a digital menu and ordering platform that helps restaurants create QR-code based menus, accept orders, and manage customer loyalty programs. Customers can scan a QR code to view menus, place orders, and earn rewards."
    },
    {
        category: "General",
        question: "Is Hunggree free for customers?",
        answer: "Yes! Hunggree is completely free for customers. You can browse menus, place orders, and join loyalty programs without any charges. Only the restaurants pay for using our platform."
    },
    {
        category: "General",
        question: "Do I need to download an app?",
        answer: "No app download required! Hunggree works directly in your web browser. Just scan the QR code at the restaurant and you're ready to go."
    },
    // Ordering
    {
        category: "Ordering",
        question: "How do I place an order?",
        answer: "Simply scan the QR code at your table, browse the menu, add items to your cart, and submit your order. You'll receive a confirmation and the restaurant will prepare your food."
    },
    {
        category: "Ordering",
        question: "Can I customize my order?",
        answer: "Yes! Most menu items allow you to add special instructions or customize options. Look for the 'Special Instructions' field when adding items to your cart."
    },
    {
        category: "Ordering",
        question: "How do I know my order was received?",
        answer: "You'll see a confirmation screen after placing your order. If the restaurant has WhatsApp notifications enabled, you'll also receive a message with your order details."
    },
    // Loyalty Program
    {
        category: "Loyalty Program",
        question: "How do I join a loyalty program?",
        answer: "Look for the 'Rewards' or gift icon on the restaurant's menu page. Tap it to join the loyalty program. You can save your loyalty card to Google Wallet for easy access."
    },
    {
        category: "Loyalty Program",
        question: "How do I earn points?",
        answer: "Points are earned automatically when you place orders at participating restaurants. The number of points per order varies by restaurant."
    },
    {
        category: "Loyalty Program",
        question: "How do I redeem my rewards?",
        answer: "Once you've earned enough points for a reward, show your loyalty card to the restaurant staff when placing your next order. They'll apply your reward and reset your points."
    },
    {
        category: "Loyalty Program",
        question: "Can I use my loyalty card at multiple locations?",
        answer: "Loyalty programs are specific to each restaurant. If a restaurant chain has multiple locations using Hunggree, your points may or may not be shared - check with the restaurant."
    },
    // For Restaurants
    {
        category: "For Restaurants",
        question: "How do I sign up my restaurant?",
        answer: "Click 'Get Started' on our homepage and create a partner account. You can set up your menu, customize your QR codes, and start accepting orders within minutes."
    },
    {
        category: "For Restaurants",
        question: "What does Hunggree cost for restaurants?",
        answer: "We offer flexible pricing plans for restaurants. Contact us at partners@hunggree.com for detailed pricing information tailored to your needs."
    },
    {
        category: "For Restaurants",
        question: "Can I manage multiple restaurant locations?",
        answer: "Yes! Our platform supports multiple locations under a single account. Each location can have its own menu, settings, and loyalty program."
    },
    // Technical
    {
        category: "Technical",
        question: "What browsers are supported?",
        answer: "Hunggree works on all modern browsers including Chrome, Safari, Firefox, and Edge on both mobile and desktop devices."
    },
    {
        category: "Technical",
        question: "I'm having trouble loading the menu. What should I do?",
        answer: "Try refreshing the page or clearing your browser cache. If the problem persists, check your internet connection or try a different browser. Contact support if issues continue."
    }
];

export default function Support() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>("General");

    const categories = [...new Set(faqs.map(faq => faq.category))];
    const filteredFaqs = faqs.filter(faq => faq.category === activeCategory);

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 bg-zinc-900">
                            <Image src="/logo.png" alt="Hunggree" width={32} height={32} className="object-cover" unoptimized />
                        </div>
                        <span className="text-lg font-black italic tracking-tighter uppercase">Hunggree</span>
                    </Link>
                    <Link href="/" className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1">
                        <ArrowLeft size={14} /> Back
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-16">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2">
                        Support <span className="text-primary">Center</span>
                    </h1>
                    <p className="text-gray-400">Find answers to common questions or get in touch with our team.</p>
                </div>

                {/* Quick Contact Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                    <a href="mailto:support@hunggree.com" className="p-6 bg-zinc-900 rounded-2xl border border-white/10 hover:border-primary/50 transition-colors group">
                        <Mail className="text-primary mb-3" size={24} />
                        <h3 className="font-bold text-white mb-1">Email Support</h3>
                        <p className="text-sm text-gray-400">support@hunggree.com</p>
                        <p className="text-xs text-gray-500 mt-2">Response within 24 hours</p>
                    </a>
                    <a href="https://wa.me/923001234567" target="_blank" rel="noopener noreferrer" className="p-6 bg-zinc-900 rounded-2xl border border-white/10 hover:border-green-500/50 transition-colors group">
                        <MessageCircle className="text-green-500 mb-3" size={24} />
                        <h3 className="font-bold text-white mb-1">WhatsApp</h3>
                        <p className="text-sm text-gray-400">+92 300 123 4567</p>
                        <p className="text-xs text-gray-500 mt-2">Available 9 AM - 9 PM PKT</p>
                    </a>
                </div>

                {/* FAQ Section */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-6">
                        <HelpCircle className="text-primary" size={24} />
                        <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${activeCategory === cat
                                        ? 'bg-primary text-black'
                                        : 'bg-zinc-900 text-gray-400 hover:text-white border border-white/10'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* FAQ Accordion */}
                    <div className="space-y-3">
                        {filteredFaqs.map((faq, index) => (
                            <div
                                key={index}
                                className="bg-zinc-900 rounded-xl border border-white/10 overflow-hidden"
                            >
                                <button
                                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                    className="w-full p-5 text-left flex items-center justify-between gap-4"
                                >
                                    <span className="font-medium text-white">{faq.question}</span>
                                    <ChevronDown
                                        size={18}
                                        className={`text-gray-400 shrink-0 transition-transform ${openIndex === index ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {openIndex === index && (
                                    <div className="px-5 pb-5 pt-0">
                                        <p className="text-gray-400 text-sm leading-relaxed">{faq.answer}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Still Need Help */}
                <div className="text-center p-8 bg-zinc-900/50 rounded-2xl border border-white/10">
                    <h3 className="text-xl font-bold mb-2">Still need help?</h3>
                    <p className="text-gray-400 mb-4">Our support team is here to assist you.</p>
                    <a
                        href="mailto:support@hunggree.com"
                        className="inline-block px-6 py-3 bg-primary text-black font-bold rounded-full hover:bg-primary/90 transition-colors"
                    >
                        Contact Support
                    </a>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 py-8 mt-16">
                <div className="max-w-4xl mx-auto px-6 flex flex-wrap gap-6 text-xs text-gray-500">
                    <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-white">Terms of Service</Link>
                    <Link href="/support" className="hover:text-white">Support</Link>
                    <span className="ml-auto">© 2026 Hunggree. All rights reserved.</span>
                </div>
            </footer>
        </div>
    );
}
