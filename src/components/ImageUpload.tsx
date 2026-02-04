"use client";

import { useState, useRef } from "react";
import { Button, Input, Spinner } from "@heroui/react";
import { Image as ImageIcon, Upload, X, Link as LinkIcon, Sparkles } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
    value?: string | null;
    onChange: (url: string) => void;
    label?: string;
    placeholder?: string;
    itemName?: string;
    itemDescription?: string;
    itemCategory?: string;
}

export default function ImageUpload({
    value,
    onChange,
    label = "Image",
    placeholder = "Upload or paste URL",
    itemName,
    itemDescription,
    itemCategory
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            await uploadFile(file);
        }
    };

    const uploadFile = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("File size too large. Max 5MB allowed.");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload/ipfs", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Upload failed");
            }

            onChange(data.url);
            setShowUrlInput(false);
        } catch (err: any) {
            console.error("Upload failed", err);
            alert("Upload failed: " + err.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const generateImage = async () => {
        if (!itemName) {
            alert("Please enter an item name first to generate an image.");
            return;
        }

        setIsGenerating(true);
        try {
            const res = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: itemName,
                    description: itemDescription,
                    category: itemCategory
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Generation failed");
            }

            onChange(data.url);
        } catch (err: any) {
            console.error("Generation failed", err);
            alert("Generation failed: " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await uploadFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-300">
                    {label}
                </label>
                {value && !showUrlInput && (
                    <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                        <LinkIcon size={12} />
                        {showUrlInput ? "Hide URL" : "Edit URL"}
                    </button>
                )}
            </div>

            {!value && !showUrlInput ? (
                // Upload State
                <div
                    className={`relative border-2 border-dashed rounded-xl p-6 transition-colors flex flex-col items-center justify-center gap-3 ${dragActive
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-white/10 hover:border-white/20 hover:bg-white/5"
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isUploading || isGenerating}
                    />

                    {isUploading || isGenerating ? (
                        <div className="flex flex-col items-center gap-2">
                            <Spinner size="lg" color="primary" />
                            <p className="text-sm text-gray-400 animate-pulse">
                                {isGenerating ? "Generating AI Image..." : "Uploading to IPFS..."}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div
                                className="p-3 bg-zinc-800 rounded-full cursor-pointer hover:bg-zinc-700 transition"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload size={20} className="text-gray-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-white cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    Click to upload or drag and drop
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    or
                                </p>
                                {/* Generate Button */}
                                <Button
                                    size="sm"
                                    variant="flat"
                                    className="mt-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 border border-purple-500/30"
                                    startContent={<Sparkles size={14} />}
                                    onClick={(e) => {
                                        e.stopPropagation(); // prevent file input click
                                        if (itemName) generateImage();
                                    }}
                                    isDisabled={!itemName}
                                    title={!itemName ? "Enter Item Name to generate" : "Generate with AI"}
                                >
                                    Generate with AI
                                </Button>
                            </div>
                            <div className="absolute top-2 right-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowUrlInput(true);
                                    }}
                                    className="p-1 text-gray-500 hover:text-white rounded"
                                    title="Enter URL manually"
                                >
                                    <LinkIcon size={16} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            ) : showUrlInput ? (
                // URL Input State
                <div className="flex gap-2">
                    <Input
                        placeholder={placeholder}
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        variant="bordered"
                        size="md"
                        radius="lg"
                        startContent={<LinkIcon size={16} className="text-gray-500" />}
                        classNames={{
                            inputWrapper: "border-white/10 hover:border-white/20 focus-within:!border-primary",
                        }}
                    />
                    <Button isIconOnly variant="light" onClick={() => setShowUrlInput(false)}>
                        <X size={20} />
                    </Button>
                </div>

            ) : (
                // Preview State
                <div className="relative group">
                    <div className="w-full h-48 bg-zinc-800 rounded-xl border border-white/10 overflow-hidden relative">
                        <Image
                            src={value!}
                            alt="Uploaded image"
                            fill
                            className="object-cover"
                            unoptimized // Since IPFS URLs might not be optimized by Next.js by default
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                                size="sm"
                                color="danger"
                                variant="flat"
                                onPress={() => onChange("")}
                                startContent={<X size={14} />}
                            >
                                Remove
                            </Button>
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={() => setShowUrlInput(true)}
                                startContent={<LinkIcon size={14} />}
                            >
                                Edit URL
                            </Button>
                        </div>
                    </div>
                    {value?.includes("pinata") && (
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[10px] text-blue-300 font-mono border border-blue-500/30">
                            IPFS Hosted
                        </div>
                    )}
                    {value?.includes("ai-gen") && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-purple-500/20 backdrop-blur rounded-full text-[10px] text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1">
                            <Sparkles size={10} /> AI Generated
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
