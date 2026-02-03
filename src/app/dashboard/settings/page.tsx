"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";
import {
    ArrowLeft, Settings, Sparkles, Key, Check, Eye, EyeOff,
    Save, AlertCircle
} from "lucide-react";
import Link from "next/link";

interface AISettings {
    provider: 'openai' | 'gemini';
    openaiKey: string;
    geminiKey: string;
}

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showOpenAIKey, setShowOpenAIKey] = useState(false);
    const [showGeminiKey, setShowGeminiKey] = useState(false);

    const [settings, setSettings] = useState<AISettings>({
        provider: 'openai',
        openaiKey: '',
        geminiKey: ''
    });

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        checkAuth();
        loadSettings();
    }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/auth/login');
            return;
        }
        setLoading(false);
    };

    const loadSettings = () => {
        // Load settings from localStorage
        const savedSettings = localStorage.getItem('ai_settings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                setSettings(parsed);
            } catch (e) {
                console.error('Failed to parse settings:', e);
            }
        }
    };

    const saveSettings = () => {
        setSaving(true);

        // Save to localStorage
        localStorage.setItem('ai_settings', JSON.stringify(settings));

        // Also save provider preference to be sent with API calls
        localStorage.setItem('ai_provider', settings.provider);

        setTimeout(() => {
            setSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }, 500);
    };

    const maskKey = (key: string) => {
        if (!key) return '';
        if (key.length <= 8) return '••••••••';
        return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-black text-white">
                <Spinner size="lg" color="primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <Settings size={20} />
                                Settings
                            </h1>
                            <p className="text-xs text-gray-400">Configure your preferences</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-3xl mx-auto p-6 space-y-8">
                {/* AI Provider Section */}
                <div className="bg-zinc-900 rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Sparkles className="text-yellow-400" size={20} />
                            AI Menu Scanner Settings
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Choose your preferred AI provider for menu scanning
                        </p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Provider Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-3">AI Provider</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* OpenAI Option */}
                                <button
                                    onClick={() => setSettings({ ...settings, provider: 'openai' })}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${settings.provider === 'openai'
                                        ? 'border-green-500 bg-green-500/10'
                                        : 'border-white/10 hover:border-white/20 bg-zinc-800'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold">OpenAI</span>
                                        {settings.provider === 'openai' && (
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                                <Check size={12} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400">GPT-4 Vision - Best accuracy</p>
                                    <p className="text-xs text-gray-500 mt-1">~$0.01-0.03 per scan</p>
                                </button>

                                {/* Gemini Option */}
                                <button
                                    onClick={() => setSettings({ ...settings, provider: 'gemini' })}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${settings.provider === 'gemini'
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-white/10 hover:border-white/20 bg-zinc-800'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold">Google Gemini</span>
                                        {settings.provider === 'gemini' && (
                                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                <Check size={12} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400">Gemini 2.0 Flash - Fast & affordable</p>
                                    <p className="text-xs text-gray-500 mt-1">Free tier available</p>
                                </button>
                            </div>
                        </div>

                        {/* API Keys */}
                        <div className="space-y-4">
                            {/* OpenAI Key */}
                            <div className={settings.provider === 'openai' ? '' : 'opacity-50'}>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
                                    <Key size={14} />
                                    OpenAI API Key
                                    {settings.provider === 'openai' && <span className="text-red-400">*</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showOpenAIKey ? 'text' : 'password'}
                                        placeholder="sk-..."
                                        value={settings.openaiKey}
                                        onChange={(e) => setSettings({ ...settings, openaiKey: e.target.value })}
                                        className="w-full px-4 py-3 pr-12 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                    <button
                                        onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                    >
                                        {showOpenAIKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-400 hover:underline">platform.openai.com</a>
                                </p>
                            </div>

                            {/* Gemini Key */}
                            <div className={settings.provider === 'gemini' ? '' : 'opacity-50'}>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
                                    <Key size={14} />
                                    Google Gemini API Key
                                    {settings.provider === 'gemini' && <span className="text-red-400">*</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showGeminiKey ? 'text' : 'password'}
                                        placeholder="AIza..."
                                        value={settings.geminiKey}
                                        onChange={(e) => setSettings({ ...settings, geminiKey: e.target.value })}
                                        className="w-full px-4 py-3 pr-12 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                    <button
                                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                    >
                                        {showGeminiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Get your key at <a href="https://makersuite.google.com/app/apikey" target="_blank" className="text-blue-400 hover:underline">Google AI Studio</a>
                                </p>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                            <AlertCircle className="text-blue-400 shrink-0" size={20} />
                            <div className="text-sm">
                                <p className="text-blue-400 font-medium">Your API keys are stored locally</p>
                                <p className="text-gray-400 mt-1">
                                    Keys are saved in your browser's localStorage and sent directly to the AI providers.
                                    They are never stored on our servers.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="p-6 border-t border-white/5 bg-zinc-800/30">
                        <button
                            onClick={saveSettings}
                            disabled={saving}
                            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${saved
                                ? 'bg-green-600 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                        >
                            {saving ? (
                                <>
                                    <Spinner size="sm" color="white" />
                                    Saving...
                                </>
                            ) : saved ? (
                                <>
                                    <Check size={20} />
                                    Settings Saved!
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Save Settings
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Environment Variables Note */}
                <div className="bg-zinc-900 rounded-2xl border border-white/5 p-6">
                    <h3 className="font-bold mb-2">Using Environment Variables</h3>
                    <p className="text-sm text-gray-400 mb-3">
                        Alternatively, you can set API keys as environment variables in your <code className="bg-zinc-800 px-1.5 py-0.5 rounded">.env.local</code> file:
                    </p>
                    <pre className="bg-zinc-800 rounded-lg p-4 text-sm overflow-x-auto">
                        <code className="text-green-400">
                            {`# OpenAI
OPENAI_API_KEY=sk-your-key-here

# Google Gemini
GEMINI_API_KEY=AIza...your-key-here`}
                        </code>
                    </pre>
                    <p className="text-xs text-gray-500 mt-3">
                        Environment variables take priority over locally stored keys.
                    </p>
                </div>
            </div>
        </div>
    );
}
