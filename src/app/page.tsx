"use client";

import { useState } from "react";
import { Button, Card, CardBody } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Zap, MessageSquare, ShieldCheck, Star, Users, ArrowRight, Play, Menu, X } from "lucide-react";

import LandingSearch from "@/components/LandingSearch";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] border border-white/10 bg-zinc-900">
              <Image src="/logo.png" alt="Hunggree Logo" width={40} height={40} className="object-cover" unoptimized />
            </div>
            <span className="text-2xl font-black italic tracking-tighter uppercase">Hunggree</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-10">
            <Link href="#features" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Features</Link>
            <Link href="#impact" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Impact</Link>
            <Link href="/auth/login" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Partner Login</Link>
            <Link href="/auth/signup">
              <Button color="primary" variant="flat" size="sm" className="font-black uppercase tracking-widest text-[10px] px-6 rounded-full bg-white/10 text-white hover:bg-white/20">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <button onClick={toggleMenu} className="text-white p-2">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-zinc-950 border-b border-white/10 overflow-hidden"
            >
              <div className="flex flex-col p-6 space-y-6">
                <Link href="#features" onClick={toggleMenu} className="text-sm font-black uppercase tracking-widest text-gray-400 hover:text-white">Features</Link>
                <Link href="#impact" onClick={toggleMenu} className="text-sm font-black uppercase tracking-widest text-gray-400 hover:text-white">Impact</Link>
                <Link href="/auth/login" onClick={toggleMenu} className="text-sm font-black uppercase tracking-widest text-gray-400 hover:text-white">Partner Login</Link>
                <Link href="/auth/signup" onClick={toggleMenu}>
                  <Button color="primary" variant="flat" className="w-full font-black uppercase tracking-widest text-sm py-6 rounded-xl bg-primary/20 text-primary">
                    Get Started
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 lg:pt-40 pb-20 px-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10">
            <div
              className="absolute top-20 left-10 w-40 h-40 lg:w-72 lg:h-72 rounded-full opacity-50"
              style={{ background: 'radial-gradient(circle, rgba(92, 111, 43, 0.4) 0%, transparent 70%)' }}
            />
            <div
              className="absolute bottom-20 right-10 w-60 h-60 lg:w-96 lg:h-96 rounded-full opacity-50"
              style={{ background: 'radial-gradient(circle, rgba(222, 128, 43, 0.2) 0%, transparent 70%)' }}
            />
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6 lg:space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <Star size={12} className="text-primary" fill="currentColor" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">#1 Digital Menu Platform</span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black italic uppercase leading-[0.9] lg:leading-[0.85] tracking-tighter">
                DON'T JUST <br />
                <span className="text-primary truncate">SERVE.</span> <br />
                THRILL.
              </h1>
              <p className="text-lg lg:text-xl text-gray-400 max-w-lg font-medium leading-relaxed">
                Elevate your restaurant to elite status. Luxury digital QR menus designed for speed, beauty, and direct-to-WhatsApp ordering.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 pt-4">
                <Link href="/auth/signup" className="w-full sm:w-auto">
                  <Button color="primary" size="lg" className="h-14 lg:h-16 w-full sm:w-auto px-8 lg:px-12 font-black uppercase tracking-widest text-xs lg:text-sm rounded-[20px] shadow-[0_20px_40px_rgba(var(--primary-rgb),0.3)] hover:-translate-y-1 transition-all">
                    Launch Your Brand
                  </Button>
                </Link>
                <Link href="/menu/pizza-360-9pa9z" className="w-full sm:w-auto">
                  <Button variant="bordered" size="lg" className="h-14 lg:h-16 w-full sm:w-auto px-8 lg:px-10 font-black uppercase tracking-widest text-xs lg:text-sm rounded-[20px] border-white/10 text-white hover:bg-white/5 transition-all flex items-center justify-center gap-3">
                    <Play size={16} fill="currentColor" /> See Demo
                  </Button>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-6 lg:gap-8 pt-6 lg:pt-10">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-8 h-8 lg:w-10 lg:h-10 rounded-full border-2 border-black bg-zinc-800 overflow-hidden relative">
                      <Image src={`https://i.pravatar.cc/100?u=${i}`} alt="user" fill sizes="40px" />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} className="text-primary" fill="currentColor" />)}
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">1,200+ Restaurants Scaled</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative aspect-square lg:aspect-auto h-full min-h-[400px] lg:min-h-[600px] mt-10 lg:mt-0 w-full max-w-[500px] lg:max-w-none mx-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-[40px] lg:rounded-[60px] blur-3xl opacity-50" />
              <div className="relative h-full w-full rounded-[40px] lg:rounded-[60px] overflow-hidden border border-white/10 shadow-2xl">
                <Image
                  src="/hunggree_showcase.png"
                  alt="Hunggree Showcase"
                  fill
                  className="object-cover scale-110 hover:scale-125 transition-transform duration-[10s]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-6 left-6 right-6 lg:bottom-10 lg:left-10 lg:right-10 p-6 lg:p-8 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 text-left">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-primary flex items-center justify-center">
                      <ShoppingBag size={20} className="text-black lg:w-6 lg:h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest">LIVE ORDERS</p>
                      <p className="text-sm lg:text-lg font-black italic uppercase">Direct WhatsApp Channel</p>
                    </div>
                  </div>
                  <p className="text-[10px] lg:text-xs text-gray-300 font-medium leading-relaxed">Orders are processed instantly. No apps, no logins, no friction for your guests.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section id="impact" className="py-20 bg-zinc-950 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { label: "Active Partners", value: "1,200+", icon: Users },
              { label: "Monthly Orders", value: "50k+", icon: ShoppingBag },
              { label: "Revenue Processed", value: "$4.2M", icon: Zap },
              { label: "Guest Rating", value: "4.9/5", icon: Star }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center space-y-2"
              >
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <stat.icon size={20} className="text-primary" />
                </div>
                <h4 className="text-3xl lg:text-4xl font-black italic tracking-tighter uppercase">{stat.value}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-20 lg:py-40 px-6">
          <div className="max-w-7xl mx-auto space-y-20">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              <h2 className="text-4xl lg:text-5xl font-black italic uppercase tracking-tighter">Built for the Luxury Hustle</h2>
              <p className="text-lg lg:text-xl text-gray-500">Traditional menus are extinct. Give your guests the fast, beautiful experience they deserve.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {[
                {
                  title: "Instant Setup",
                  desc: "Upload your menu and launch in under 10 minutes. Real-time updates meant no more reprinting.",
                  icon: Zap,
                  color: "primary"
                },
                {
                  title: "WhatsApp Sync",
                  desc: "Orders fly straight to your business WhatsApp. No middleware, no commissions, just 100% margin.",
                  icon: MessageSquare,
                  color: "secondary"
                },
                {
                  title: "Brand Elite",
                  desc: "Stunning high-density visuals that make your dishes look expensive. Fully customizable themes.",
                  icon: ShieldCheck,
                  color: "primary"
                }
              ].map((feature, i) => (
                <Card key={i} className="bg-zinc-900/50 border-white/5 rounded-[40px] p-8 lg:p-10 hover:bg-zinc-900 transition-colors group">
                  <CardBody className="p-0 space-y-6">
                    <div className={`w-14 h-14 rounded-3xl bg-black border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary transition-all duration-500`}>
                      <feature.icon size={24} className="group-hover:text-black" />
                    </div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tight">{feature.title}</h3>
                    <p className="text-gray-500 font-medium leading-relaxed">{feature.desc}</p>
                    <div className="pt-4">
                      <Link href="/auth/signup" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:gap-4 transition-all">
                        Get Started <ArrowRight size={14} />
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-20 lg:py-32 px-6">
          <div className="max-w-5xl mx-auto bg-primary rounded-[40px] lg:rounded-[60px] p-8 lg:p-20 text-center relative overflow-hidden shadow-[0_40px_100px_rgba(232,255,102,0.4)]">
            <div className="absolute top-0 right-0 p-10 opacity-20 text-black">
              <Zap size={200} fill="currentColor" />
            </div>
            <h2 className="text-4xl lg:text-6xl font-black italic uppercase text-black tracking-tighter mb-8 max-w-2xl mx-auto leading-none">
              The future of your restaurant starts tonight.
            </h2>
            <Link href="/auth/signup">
              <Button size="lg" className="h-16 lg:h-20 px-10 lg:px-16 bg-black text-white font-black uppercase tracking-widest text-base lg:text-lg rounded-[24px] hover:scale-105 transition-transform w-full sm:w-auto">
                Join the Elite Only
              </Button>
            </Link>
            <p className="text-black/50 text-xs font-bold uppercase tracking-widest mt-8">No credit card required • Unlimited items • 24/7 VIP Support</p>
          </div>
        </section>

        <LandingSearch />
      </main>

      <footer className="py-12 lg:py-20 border-t border-white/5 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 bg-zinc-900">
                <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-cover" unoptimized />
              </div>
              <span className="text-xl font-black italic tracking-tighter uppercase">Hunggree</span>
            </div>
            <p className="text-gray-500 max-w-xs text-sm font-medium">The world's most elite digital menu platform. Scaled for speed, built for beauty.</p>
          </div>
          <div>
            <h5 className="text-[10px] font-black uppercase tracking-widest text-white mb-6">Product</h5>
            <ul className="space-y-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              <li><Link href="/menu/pizza-360-9pa9z" className="hover:text-primary transition-colors">Showcase</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-[10px] font-black uppercase tracking-widest text-white mb-6">Company</h5>
            <ul className="space-y-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              <li><Link href="/support" className="hover:text-primary transition-colors">Support</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 lg:mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 text-center md:text-left">© 2026 HUNGGREE INC. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">All Systems Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
