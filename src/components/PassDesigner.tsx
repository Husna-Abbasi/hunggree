"use client";

import { useState, useRef, useCallback } from "react";
import { Button, Card, CardBody, Image, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Switch } from "@heroui/react";
import { Upload, Palette, ImageIcon, Crop, Check, X, Eye, EyeOff } from "lucide-react";
import ReactCrop, { Crop as CropType, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { createClient } from "@/lib/supabase-browser";

interface DesignState {
    logoUrl: string;
    wideLogoUrl: string;
    heroImageUrl: string;
    backgroundColor: string;
    passFields: {
        name: boolean;
        phone: boolean;
        points: boolean;
    };
}

interface PassDesignerProps {
    design: DesignState;
    onChange: (design: DesignState) => void;
    programName: string;
    restaurantName: string;
}

type ImageType = 'logo' | 'wideLogo' | 'hero';

const IMAGE_CONFIGS: Record<ImageType, { width: number; height: number; aspect: number; label: string }> = {
    logo: { width: 660, height: 660, aspect: 1, label: 'Logo (Square)' },
    wideLogo: { width: 1280, height: 400, aspect: 16 / 5, label: 'Wide Logo' },
    hero: { width: 1032, height: 336, aspect: 1032 / 336, label: 'Hero Banner' }
};

// Helper to generate cropped image
function getCroppedImg(image: HTMLImageElement, crop: PixelCrop, targetWidth: number, targetHeight: number): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        targetWidth,
        targetHeight
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob!);
        }, 'image/png', 1);
    });
}

export default function PassDesigner({ design, onChange, programName, restaurantName }: PassDesignerProps) {
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [cropImage, setCropImage] = useState<string | null>(null);
    const [cropType, setCropType] = useState<ImageType>('logo');
    const [crop, setCrop] = useState<CropType>();
    const [uploading, setUploading] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const supabase = createClient();

    // Center crop with aspect ratio
    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const aspect = IMAGE_CONFIGS[cropType].aspect;
        // Use smaller width for wide aspect ratios to fit in viewport
        const cropWidth = aspect > 2 ? 80 : 90;
        const newCrop = centerCrop(
            makeAspectCrop({ unit: '%', width: cropWidth }, aspect, width, height),
            width,
            height
        );
        setCrop(newCrop);
    }, [cropType]);

    // Handle file selection
    const handleFileSelect = (type: ImageType) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            setCropImage(reader.result as string);
            setCropType(type);
            setCropModalOpen(true);
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // Reset input
    };

    // Upload cropped image
    const handleCropComplete = async () => {
        if (!imgRef.current || !crop) return;

        setUploading(true);
        try {
            const config = IMAGE_CONFIGS[cropType];
            const imgWidth = imgRef.current.naturalWidth || imgRef.current.width;
            const imgHeight = imgRef.current.naturalHeight || imgRef.current.height;

            // Handle both percentage and pixel units
            const isPercent = crop.unit === '%';
            const pixelCrop: PixelCrop = {
                unit: 'px',
                x: isPercent ? (crop.x / 100) * imgWidth : crop.x,
                y: isPercent ? (crop.y / 100) * imgHeight : crop.y,
                width: isPercent ? (crop.width / 100) * imgWidth : crop.width,
                height: isPercent ? (crop.height / 100) * imgHeight : crop.height,
            };

            console.log('[PassDesigner] Crop:', { cropType, crop, pixelCrop, imgWidth, imgHeight });

            const croppedBlob = await getCroppedImg(imgRef.current, pixelCrop, config.width, config.height);
            const fileName = `pass-${cropType}-${Date.now()}.png`;

            const { data, error } = await supabase.storage
                .from('loyalty')
                .upload(fileName, croppedBlob, { contentType: 'image/png' });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('loyalty').getPublicUrl(fileName);
            console.log('[PassDesigner] Uploaded:', { cropType, publicUrl });

            // Update design state
            const fieldMap: Record<ImageType, keyof DesignState> = {
                logo: 'logoUrl',
                wideLogo: 'wideLogoUrl',
                hero: 'heroImageUrl'
            };
            onChange({ ...design, [fieldMap[cropType]]: publicUrl });
            setCropModalOpen(false);
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Live Preview */}
            <Card className="bg-zinc-900 border border-white/10">
                <CardBody className="p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Palette size={18} /> Pass Preview
                    </h3>
                    <div
                        className="rounded-2xl overflow-hidden shadow-2xl max-w-xs mx-auto"
                        style={{ backgroundColor: design.backgroundColor || '#1a1a1a' }}
                    >
                        {/* Hero Image */}
                        {design.heroImageUrl ? (
                            <div className="h-24 bg-cover bg-center" style={{ backgroundImage: `url(${design.heroImageUrl})` }} />
                        ) : (
                            <div className="h-24 bg-gradient-to-r from-primary/30 to-primary/10" />
                        )}

                        {/* Content */}
                        <div className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                                {/* Logo */}
                                {design.logoUrl ? (
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                                        <Image src={design.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                                        <ImageIcon size={20} className="text-white/40" />
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] text-white/50 uppercase">{restaurantName || 'Restaurant Name'}</p>
                                    <p className="font-bold text-white">{programName || 'Rewards'}</p>
                                </div>
                            </div>

                            {/* Wide Logo */}
                            {design.wideLogoUrl && (
                                <div className="mb-3">
                                    <Image src={design.wideLogoUrl} alt="Wide Logo" className="h-10 object-contain" />
                                </div>
                            )}

                            {/* Points Display */}
                            <div className="bg-white/5 rounded-xl p-3 text-center">
                                <p className="text-2xl font-bold text-white">0</p>
                                <p className="text-xs text-white/60">Points</p>
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Design Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Logo Upload */}
                <Card className="bg-zinc-800/50 border border-white/5">
                    <CardBody className="p-4">
                        <label className="block">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-white">Logo (660×660)</span>
                                {design.logoUrl && <Check size={16} className="text-green-500" />}
                            </div>
                            <p className="text-xs text-gray-400 mb-3">Square logo, will be masked circular</p>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect('logo')}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                                />
                                <Button color="primary" variant="flat" className="w-full pointer-events-none font-bold text-primary-foreground" startContent={<Upload size={16} />}>
                                    {design.logoUrl ? 'Change Logo' : 'Upload Logo'}
                                </Button>
                            </div>
                        </label>
                    </CardBody>
                </Card>

                {/* Wide Logo Upload */}
                <Card className="bg-zinc-800/50 border border-white/5">
                    <CardBody className="p-4">
                        <label className="block">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-white">Wide Logo (1280×400)</span>
                                {design.wideLogoUrl && <Check size={16} className="text-green-500" />}
                            </div>
                            <p className="text-xs text-gray-400 mb-3">Landscape logo for pass header</p>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect('wideLogo')}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                                />
                                <Button color="primary" variant="flat" className="w-full pointer-events-none font-bold text-primary-foreground" startContent={<Upload size={16} />}>
                                    {design.wideLogoUrl ? 'Change Wide Logo' : 'Upload Wide Logo'}
                                </Button>
                            </div>
                        </label>
                    </CardBody>
                </Card>

                {/* Hero Image Upload */}
                <Card className="bg-zinc-800/50 border border-white/5">
                    <CardBody className="p-4">
                        <label className="block">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-white">Hero Banner (1032×336)</span>
                                {design.heroImageUrl && <Check size={16} className="text-green-500" />}
                            </div>
                            <p className="text-xs text-gray-400 mb-3">Banner image across the pass</p>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect('hero')}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                                />
                                <Button color="primary" variant="flat" className="w-full pointer-events-none font-bold text-primary-foreground" startContent={<Upload size={16} />}>
                                    {design.heroImageUrl ? 'Change Banner' : 'Upload Banner'}
                                </Button>
                            </div>
                        </label>
                    </CardBody>
                </Card>

                {/* Background Color */}
                <Card className="bg-zinc-800/50 border border-white/5">
                    <CardBody className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-white">Background Color</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">Pass background color</p>
                        <div className="flex gap-2 items-center">
                            <input
                                type="color"
                                value={design.backgroundColor || '#1a1a1a'}
                                onChange={(e) => onChange({ ...design, backgroundColor: e.target.value })}
                                className="w-12 h-10 rounded cursor-pointer border-0"
                            />
                            <Input
                                value={design.backgroundColor || '#1a1a1a'}
                                onValueChange={(val) => onChange({ ...design, backgroundColor: val })}
                                placeholder="#1a1a1a"
                                size="sm"
                                classNames={{ inputWrapper: "bg-zinc-700", input: "text-white" }}
                            />
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Field Visibility Toggles */}
            <Card className="bg-zinc-800/50 border border-white/5">
                <CardBody className="p-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Pass Fields Display</h3>
                    <div className="grid grid-cols-1 gap-3">
                        <Switch
                            isSelected={design.passFields?.name ?? true}
                            onValueChange={(isSelected) => onChange({ ...design, passFields: { ...design.passFields, name: isSelected } })}
                            classNames={{
                                wrapper: "group-data-[selected=true]:bg-primary",
                            }}
                        >
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-white">Member Name</span>
                                <span className="text-xs text-gray-500">Show member's name on pass</span>
                            </div>
                        </Switch>
                        <Switch
                            isSelected={design.passFields?.phone ?? true}
                            onValueChange={(isSelected) => onChange({ ...design, passFields: { ...design.passFields, phone: isSelected } })}
                            classNames={{
                                wrapper: "group-data-[selected=true]:bg-primary",
                            }}
                        >
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-white">Phone Number</span>
                                <span className="text-xs text-gray-500">Show member's phone number</span>
                            </div>
                        </Switch>
                        <Switch
                            isSelected={design.passFields?.points ?? true}
                            onValueChange={(isSelected) => onChange({ ...design, passFields: { ...design.passFields, points: isSelected } })}
                            classNames={{
                                wrapper: "group-data-[selected=true]:bg-primary",
                            }}
                        >
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-white">Points Balance</span>
                                <span className="text-xs text-gray-500">Show loyalty points balance</span>
                            </div>
                        </Switch>
                    </div>
                </CardBody>
            </Card>

            {/* Crop Modal */}
            <Modal
                isOpen={cropModalOpen}
                onClose={() => setCropModalOpen(false)}
                size="2xl"
                classNames={{ base: "bg-zinc-900 border border-white/10" }}
            >
                <ModalContent>
                    <ModalHeader className="flex items-center gap-2">
                        <Crop size={20} /> Crop {IMAGE_CONFIGS[cropType]?.label}
                    </ModalHeader>
                    <ModalBody>
                        <p className="text-sm text-gray-400 mb-4">
                            Target size: {IMAGE_CONFIGS[cropType]?.width}×{IMAGE_CONFIGS[cropType]?.height}px
                        </p>
                        {cropImage && (
                            <div className="flex justify-center">
                                <ReactCrop
                                    crop={crop}
                                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                                    aspect={IMAGE_CONFIGS[cropType]?.aspect}
                                >
                                    <img
                                        ref={imgRef}
                                        src={cropImage}
                                        onLoad={onImageLoad}
                                        style={{ maxHeight: '400px' }}
                                        alt="Crop preview"
                                    />
                                </ReactCrop>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={() => setCropModalOpen(false)} startContent={<X size={16} />}>
                            Cancel
                        </Button>
                        <Button
                            color="primary"
                            onPress={handleCropComplete}
                            isLoading={uploading}
                            startContent={<Check size={16} />}
                        >
                            Apply Crop
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
