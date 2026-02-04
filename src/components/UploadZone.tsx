"use client";

import { cn } from "@/lib/utils";
import { Upload, X, Image as ImageIcon, Shirt, Info, ScanFace } from "lucide-react";
import { useState, useCallback, useRef } from "react";

interface UploadZoneProps {
    onModelSelect: (file: File | null) => void;
    onGarmentSelect: (file: File | null) => void;
    onBottomsSelect: (file: File | null) => void;
}

export function UploadZone({ onModelSelect, onGarmentSelect, onBottomsSelect }: UploadZoneProps) {
    const [modelFile, setModelFile] = useState<File | null>(null);
    const [garmentFile, setGarmentFile] = useState<File | null>(null);
    const [bottomsFile, setBottomsFile] = useState<File | null>(null);

    // Preview URLs
    const [modelPreview, setModelPreview] = useState<string | null>(null);
    const [garmentPreview, setGarmentPreview] = useState<string | null>(null);
    const [bottomsPreview, setBottomsPreview] = useState<string | null>(null);

    const handleFileSelect = useCallback((file: File, type: 'model' | 'garment' | 'bottoms') => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            if (type === 'model') {
                setModelFile(file);
                setModelPreview(result);
                onModelSelect(file);
            } else if (type === 'garment') {
                setGarmentFile(file);
                setGarmentPreview(result);
                onGarmentSelect(file);
            } else {
                setBottomsFile(file);
                setBottomsPreview(result);
                onBottomsSelect(file);
            }
        };
        reader.readAsDataURL(file);
    }, [onModelSelect, onGarmentSelect, onBottomsSelect]);

    const handleDrop = useCallback((e: React.DragEvent, type: 'model' | 'garment' | 'bottoms') => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0], type);
        }
    }, [handleFileSelect]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const removeFile = (type: 'model' | 'garment' | 'bottoms') => {
        if (type === 'model') {
            setModelFile(null);
            setModelPreview(null);
            onModelSelect(null);
        } else if (type === 'garment') {
            setGarmentFile(null);
            setGarmentPreview(null);
            onGarmentSelect(null);
        } else {
            setBottomsFile(null);
            setBottomsPreview(null);
            onBottomsSelect(null);
        }
    };

    const UploadBox = ({
        type,
        preview,
        label,
        icon: Icon
    }: {
        type: 'model' | 'garment' | 'bottoms',
        preview: string | null,
        label: string,
        icon: any
    }) => {
        const inputRef = useRef<HTMLInputElement>(null);

        return (
            <div className="space-y-2">
                {/* モデル画像の場合のみ、生成のコツを表示 */}
                {type === 'model' && (
                    <div className="mb-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-xs leading-relaxed text-muted-foreground">
                        <span className="font-bold text-blue-400 flex items-center gap-1.5 mb-1.5">
                            <Info className="w-3.5 h-3.5" />
                            生成のコツ
                        </span>
                        モデル画像を選択する場合は全身の写真をお勧めします。モデル画像が全身であれば顔だけでなくスタイルやポーズも参照しながら生成されます。
                    </div>
                )}

                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-cyan-500" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                    </div>
                    {preview && (
                        <button
                            onClick={() => removeFile(type)}
                            className="text-[10px] flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
                        >
                            <X className="w-3 h-3" />
                            削除
                        </button>
                    )}
                </div>

                <div
                    onClick={() => inputRef.current?.click()}
                    onDrop={(e) => handleDrop(e, type)}
                    onDragOver={handleDragOver}
                    className={cn(
                        "relative group cursor-pointer transition-all duration-300 ease-in-out",
                        "border-2 border-dashed rounded-xl overflow-hidden",
                        "min-h-[200px] flex flex-col items-center justify-center p-4 text-center", // Height increased slightly
                        preview
                            ? "border-transparent bg-black/40 shadow-sm"
                            : "border-border/50 hover:border-cyan-500/50 hover:bg-cyan-500/5 bg-muted/5"
                    )}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], type)}
                    />

                    {preview ? (
                        <div className="relative w-full h-full min-h-[200px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={preview}
                                alt={`${label} Preview`}
                                className="absolute inset-0 w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                                Click to change
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <div className="p-3 rounded-full bg-muted/10 group-hover:bg-cyan-500/10 group-hover:scale-110 transition-all duration-300">
                                <Upload className="w-5 h-5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground group-hover:text-cyan-400 transition-colors">
                                    Click or Drag
                                </p>
                                <p className="text-[10px] text-muted-foreground/60">
                                    JPG, PNG, WEBP
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 w-full">
            <UploadBox
                type="model"
                preview={modelPreview}
                label="モデル画像 (顔写真)"
                icon={ScanFace}
            />
            <div className="grid grid-cols-2 gap-4">
                <UploadBox
                    type="garment"
                    preview={garmentPreview}
                    label="トップス (服装)"
                    icon={Shirt}
                />
                <UploadBox
                    type="bottoms"
                    preview={bottomsPreview}
                    label="ボトムス (任意)"
                    icon={ImageIcon}
                />
            </div>
        </div>
    );
}
