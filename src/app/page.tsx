"use client";

import { Button } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 gap-16 sm:p-20 font-sans">
      <main className="flex flex-col gap-12 items-center sm:items-start text-center sm:text-left max-w-5xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center sm:items-start space-y-6"
        >
          <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic">The Future of Dining</span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter sm:text-8xl leading-[0.9] uppercase italic">
            Scan. Order. <span className="text-secondary">Savor.</span>
          </h1>
          <p className="text-xl text-default-500 max-w-[650px] font-medium leading-relaxed">
            Transform your restaurant with luxury digital QR menus. Allow customers to order directly via WhatsApp—no downloads, no friction, just pure hospitality.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="flex gap-6 items-center flex-col sm:flex-row"
        >
          <Link href="/auth/signup">
            <Button color="primary" size="lg" className="h-16 px-12 font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover:-translate-y-1 transition-transform">
              Start Free Trial
            </Button>
          </Link>
          <Link href="/menu/demo-restaurant">
            <Button variant="flat" size="lg" className="h-16 px-10 font-black text-sm uppercase tracking-[0.1em] rounded-2xl border-2 border-divider hover:bg-white transition-colors">
              Experience Demo
            </Button>
          </Link>
          <Link href="/auth/login" className="text-xs font-black uppercase tracking-widest text-default-400 hover:text-primary ml-4 transition-colors">
            Partner Login
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 w-full mt-10">
          {[
            { title: "⚡ ZERO FRICTION", desc: "No app downloads. Guests scan and browse in seconds.", color: "primary" },
            { title: "💬 DIRECT ORDERS", desc: "Orders fly straight to your WhatsApp. Fast & Reliable.", color: "secondary" },
            { title: "🎨 BRAND CONTROL", desc: "Update your luxury menu in real-time from our dashboard.", color: "primary" }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + idx * 0.1, duration: 0.8 }}
              className="p-10 border border-divider rounded-[40px] bg-content1 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 group"
            >
              <div className={`w-12 h-12 rounded-2xl bg-background border border-divider flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <div className={`w-3 h-3 rounded-full ${item.color === 'primary' ? 'bg-primary shadow-[0_0_15px_rgba(92,111,43,0.5)]' : 'bg-secondary shadow-[0_0_15px_rgba(222,128,43,0.5)]'}`} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight mb-3 italic">{item.title}</h3>
              <p className="text-sm font-medium text-default-500 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="w-full flex gap-10 flex-wrap items-center justify-center py-10 border-t border-divider mt-auto">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-default-400">© 2026 SCANMENU ELITE</p>
        <div className="flex gap-8">
          <a href="#" className="text-[10px] font-black uppercase tracking-[0.2em] text-default-400 hover:text-primary transition-colors">Privacy</a>
          <a href="#" className="text-[10px] font-black uppercase tracking-[0.2em] text-default-400 hover:text-primary transition-colors">Contact</a>
        </div>
      </footer>
    </div>
  );
}
