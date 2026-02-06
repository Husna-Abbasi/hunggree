"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
                <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2">Privacy Policy</h1>
                <p className="text-gray-500 text-sm mb-12">Last updated: February 6, 2026</p>

                <div className="prose prose-invert prose-zinc max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">1. Introduction</h2>
                        <p className="text-gray-400 leading-relaxed">
                            Hunggree ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our digital menu and ordering platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">2. Information We Collect</h2>
                        <p className="text-gray-400 leading-relaxed mb-4">We may collect the following types of information:</p>
                        <ul className="list-disc list-inside text-gray-400 space-y-2">
                            <li><strong className="text-white">Personal Information:</strong> Name, email address, phone number when you create an account or place orders.</li>
                            <li><strong className="text-white">Order Information:</strong> Your order history, preferences, and transaction details.</li>
                            <li><strong className="text-white">Device Information:</strong> IP address, browser type, device type, and operating system.</li>
                            <li><strong className="text-white">Location Data:</strong> General location based on IP address for service optimization.</li>
                            <li><strong className="text-white">Loyalty Program Data:</strong> Points earned, rewards redeemed, and program participation history.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">3. How We Use Your Information</h2>
                        <ul className="list-disc list-inside text-gray-400 space-y-2">
                            <li>To process and fulfill your orders</li>
                            <li>To manage your account and provide customer support</li>
                            <li>To operate loyalty programs and rewards</li>
                            <li>To send order confirmations and updates via WhatsApp or SMS</li>
                            <li>To improve our services and user experience</li>
                            <li>To comply with legal obligations</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">4. Information Sharing</h2>
                        <p className="text-gray-400 leading-relaxed">
                            We do not sell your personal information. We may share information with:
                        </p>
                        <ul className="list-disc list-inside text-gray-400 space-y-2 mt-4">
                            <li><strong className="text-white">Restaurant Partners:</strong> To fulfill your orders and provide services.</li>
                            <li><strong className="text-white">Service Providers:</strong> Third-party services that help us operate (payment processors, hosting, analytics).</li>
                            <li><strong className="text-white">Legal Requirements:</strong> When required by law or to protect our rights.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">5. Data Security</h2>
                        <p className="text-gray-400 leading-relaxed">
                            We implement industry-standard security measures to protect your data, including encryption, secure servers, and regular security audits. However, no method of transmission over the internet is 100% secure.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">6. Your Rights</h2>
                        <p className="text-gray-400 leading-relaxed mb-4">You have the right to:</p>
                        <ul className="list-disc list-inside text-gray-400 space-y-2">
                            <li>Access and receive a copy of your personal data</li>
                            <li>Request correction of inaccurate data</li>
                            <li>Request deletion of your data (subject to legal requirements)</li>
                            <li>Opt-out of marketing communications</li>
                            <li>Withdraw consent for data processing</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">7. Cookies</h2>
                        <p className="text-gray-400 leading-relaxed">
                            We use cookies and similar technologies to enhance your experience, analyze usage, and personalize content. You can control cookie preferences through your browser settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">8. Contact Us</h2>
                        <p className="text-gray-400 leading-relaxed">
                            If you have questions about this Privacy Policy, please contact us at:
                        </p>
                        <p className="text-primary font-bold mt-2">support@hunggree.com</p>
                    </section>
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
