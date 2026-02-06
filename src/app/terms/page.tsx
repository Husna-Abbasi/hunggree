"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
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
                <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2">Terms of Service</h1>
                <p className="text-gray-500 text-sm mb-12">Last updated: February 6, 2026</p>

                <div className="prose prose-invert prose-zinc max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                        <p className="text-gray-400 leading-relaxed">
                            By accessing or using Hunggree's digital menu and ordering platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">2. Description of Service</h2>
                        <p className="text-gray-400 leading-relaxed">
                            Hunggree provides a digital menu and ordering platform that connects customers with restaurants. Our services include digital menus, online ordering, loyalty programs, and related features.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">3. User Accounts</h2>
                        <ul className="list-disc list-inside text-gray-400 space-y-2">
                            <li>You must provide accurate and complete information when creating an account.</li>
                            <li>You are responsible for maintaining the security of your account credentials.</li>
                            <li>You must be at least 13 years old to use our Service.</li>
                            <li>You agree to notify us immediately of any unauthorized access to your account.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">4. Orders and Payments</h2>
                        <ul className="list-disc list-inside text-gray-400 space-y-2">
                            <li>All orders are subject to acceptance by the restaurant.</li>
                            <li>Prices displayed are set by individual restaurants and may change without notice.</li>
                            <li>Payment is processed securely through our payment partners.</li>
                            <li>Refunds are subject to individual restaurant policies.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">5. Restaurant Partners</h2>
                        <p className="text-gray-400 leading-relaxed">
                            Restaurant partners using Hunggree agree to:
                        </p>
                        <ul className="list-disc list-inside text-gray-400 space-y-2 mt-4">
                            <li>Maintain accurate menu information and pricing</li>
                            <li>Fulfill orders in a timely manner</li>
                            <li>Comply with all applicable food safety and business regulations</li>
                            <li>Handle customer data in accordance with our Privacy Policy</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">6. Loyalty Programs</h2>
                        <ul className="list-disc list-inside text-gray-400 space-y-2">
                            <li>Loyalty points and rewards are issued at the discretion of individual restaurants.</li>
                            <li>Points have no cash value and cannot be transferred or sold.</li>
                            <li>Restaurants may modify or terminate their loyalty programs at any time.</li>
                            <li>Fraudulent activity may result in forfeiture of points and account termination.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">7. Prohibited Conduct</h2>
                        <p className="text-gray-400 leading-relaxed mb-4">You agree not to:</p>
                        <ul className="list-disc list-inside text-gray-400 space-y-2">
                            <li>Use the Service for any illegal purpose</li>
                            <li>Attempt to gain unauthorized access to our systems</li>
                            <li>Interfere with the proper functioning of the Service</li>
                            <li>Submit false or misleading information</li>
                            <li>Abuse the loyalty program or promotional offers</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">8. Intellectual Property</h2>
                        <p className="text-gray-400 leading-relaxed">
                            All content, trademarks, and intellectual property on the Service are owned by Hunggree or its licensors. You may not copy, modify, or distribute our content without permission.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">9. Limitation of Liability</h2>
                        <p className="text-gray-400 leading-relaxed">
                            Hunggree is not liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our liability is limited to the amount you paid for the specific transaction in question.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">10. Changes to Terms</h2>
                        <p className="text-gray-400 leading-relaxed">
                            We may update these Terms of Service from time to time. Continued use of the Service after changes constitutes acceptance of the updated terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">11. Contact</h2>
                        <p className="text-gray-400 leading-relaxed">
                            For questions about these Terms, contact us at:
                        </p>
                        <p className="text-primary font-bold mt-2">legal@hunggree.com</p>
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
