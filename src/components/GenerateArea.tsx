"use client";

import { cn, resizeImage, cropImage } from "@/lib/utils";
import { Sparkles, Download, Share2, Maximize2, Minimize2, X, RefreshCw, Scan, ScanFace, Shirt } from "lucide-react";
import { useState } from "react";
// Import type locally if circular dependency is an issue, or just define subset
import { SettingsState } from "./SettingsPanel";

interface GenerateAreaProps {
    modelImage: File | null;
    styleRefImage?: File | null;
    colorRefImage?: File | null;
    settings: SettingsState;
}

export function GenerateArea({ modelImage, styleRefImage, colorRefImage, settings }: GenerateAreaProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [analysisStep, setAnalysisStep] = useState<string>("");

    // Helper to convert File to Base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data URL prefix (e.g. "data:image/jpeg;base64,")
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleGenerate = async () => {
        console.log("Starting Client-Side Generation (v20250106)...");

        if (!modelImage) {
            alert("生成を開始するには、「モデル画像」をアップロードしてください。");
            return;
        }

        // Phase 1: Image Analysis
        setIsAnalyzing(true);
        setAnalysisStep("髪の領域を検出中...");

        try {
            // Simulate Analysis Steps for UX
            await new Promise(r => setTimeout(r, 1000));
            setAnalysisStep("髪質と光の反射を解析中...");
            await new Promise(r => setTimeout(r, 1000));

            setIsAnalyzing(false);
            setIsGenerating(true);

            // Determine aspect ratio from settings
            let aspectRatio = "3:4";

            // --- Client-Side Crop & Resize ---
            console.log(`Cropping model image to ${aspectRatio}...`);
            const croppedModelFile = await cropImage(modelImage, aspectRatio);

            // 2. Resize to optimal size for Gemini (e.g. max 1536px)
            const resizedModelFile = await resizeImage(croppedModelFile, 1536, 1536);

            console.log("Calling Server-side API...");

            // Prepare FormData for Server API
            const formData = new FormData();
            formData.append('modelImage', resizedModelFile);

            if (styleRefImage) {
                // Resize ref image too
                const resizedRefFile = await resizeImage(styleRefImage, 1024, 1024);
                formData.append('refImage', resizedRefFile);
            }

            if (colorRefImage) {
                const resizedColorRefFile = await resizeImage(colorRefImage, 1024, 1024);
                formData.append('colorRefImage', resizedColorRefFile);
            }

            // Only append settings if they are selected (not null)
            if (settings.hairColor) formData.append('hairColor', settings.hairColor);
            if (settings.hairStyle) formData.append('hairStyle', settings.hairStyle);
            formData.append('gender', settings.gender);

            // Add fixed values for removed settings if API still needs them (or update API later)
            // For now, API might rely on defaults if they are missing, but let's be safe if API expects prompt inputs
            // Actually API constructs prompt based on form data. If we removed them from UI, we should probably remove them from API usage too.
            // But let's check GenerateArea prompt construction... wait, prompt construction was moved to Server Side in previous steps?
            // Ah, let's check the code I'm replacing...
            // In the previous step I cleaned up GenerateArea but it seems I might have left the prompt construction logic inside GenerateArea in my thought process?
            // Let's check the file content first.
            // Oh, I see the previous `replace_file_content` in Step 375/383 *removed* the client-side prompt construction and moved to server-side API call.
            // So here I just need to remove the references in the `return` JSX (Preview Overlay).

            const response = await fetch('/api/generate', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error || `Server Error (${response.status})`);
                } catch (e: any) {
                    if (e.message && e.message.startsWith("Server Error") && !e.message.includes(":")) throw e;
                    throw new Error(`Server Error (${response.status}): ${errorText}`);
                }
            }

            const data = await response.json();
            if (data.imageUrl) {
                setGeneratedImage(data.imageUrl);
            } else {
                throw new Error("画像の生成に失敗しました (Image URL missing)");
            }

        } catch (error) {
            console.error("Generation error:", error);
            const errorMessage = error instanceof Error ? error.message : "不明なエラー";
            alert(`画像の生成に失敗しました。\n\n【エラー詳細】\n${errorMessage}`);
        } finally {
            setIsAnalyzing(false);
            setIsGenerating(false);
            setAnalysisStep("");
        }
    };

    const handleReset = () => {
        setGeneratedImage(null);
    };

    const handleSave = async () => {
        if (!generatedImage) return;

        setIsSaving(true);
        try {
            const timestamp = new Date().getTime();
            const filename = `generated_${timestamp}.jpg`;
            const response = await fetch(generatedImage);
            const blob = await response.blob();
            const formData = new FormData();
            formData.append('file', blob, filename);
            // Fix: Handle null for hairStyle
            formData.append('hairStyle', settings.hairStyle || "Unknown");
            const saveResponse = await fetch('/api/save-image', {
                method: 'POST',
                body: formData,
            });

            if (saveResponse.ok) {
                const link = document.createElement('a');
                link.href = generatedImage;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                const link = document.createElement('a');
                link.href = generatedImage;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Save failed:', error);
            alert("保存に失敗しました。");
        } finally {
            setIsSaving(false);
        }
    };

    const isLoading = isAnalyzing || isGenerating;

    return (
        <div className="flex flex-col gap-4 min-h-0 w-full">
            <div className="relative rounded-2xl border border-border bg-black/40 group min-h-[400px]">
                {generatedImage ? (
                    // --- Result View ---
                    <div className="relative w-full p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={generatedImage}
                            alt="生成結果"
                            className="w-full h-auto shadow-2xl animate-in fade-in zoom-in duration-500"
                        />
                        {/* Control Buttons - Sticky at top right */}
                        <div className="sticky top-4 right-4 float-right -mt-[calc(100%-1rem)] pointer-events-none sticky-buttons-container z-50 flex justify-end">
                            <div className="flex gap-2 p-1 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 shadow-xl pointer-events-auto">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="p-2 rounded-lg text-white hover:bg-white hover:text-black transition-colors"
                                    title="保存"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                                <button className="p-2 rounded-lg text-white hover:bg-white hover:text-black transition-colors">
                                    <Share2 className="w-5 h-5" />
                                </button>
                                <div className="w-px bg-white/20 my-1"></div>
                                <button
                                    onClick={handleReset}
                                    className="p-2 rounded-lg text-white hover:bg-red-500 hover:text-white transition-colors"
                                    title="閉じる"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="clear-both"></div>
                    </div>
                ) : (
                    // --- Preview View (Including Loading State) ---
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-black/20">
                        <div className="absolute inset-0 w-full h-full overflow-hidden">
                            {/* 1. Base Layer: Model Image only */}
                            {modelImage && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={URL.createObjectURL(modelImage)}
                                    alt="Source"
                                    className={cn(
                                        "absolute inset-0 w-full h-full object-contain transition-all duration-1000",
                                        isLoading ? "blur-md scale-105 opacity-40" : "opacity-100 scale-100"
                                    )}
                                />
                            )}

                            {/* Removed Scene/Lighting Overlay */}
                        </div>

                        {/* Message Overlay - Switches between Preview Guide and Loading Status */}
                        <div className="absolute bottom-6 left-6 right-6 z-20 transition-all duration-500">
                            <div className={cn(
                                "backdrop-blur-sm border rounded-xl p-4 shadow-lg text-center transition-colors duration-500",
                                isLoading ? "bg-black/70 border-white/20 text-white" : "bg-white/90 border-black/10 text-black"
                            )}>
                                {isLoading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Sparkles className="w-6 h-6 animate-pulse text-cyan-400" />
                                        <p className="text-sm font-medium leading-relaxed animate-pulse">
                                            <span className="font-bold block text-base mb-1">
                                                {isAnalyzing ? "画像を解析中..." : "画像を生成中..."}
                                            </span>
                                            {isAnalyzing ? analysisStep : "最高の一枚を作成しています。しばらくお待ちください。"}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm font-medium leading-relaxed">
                                        <span className="font-bold block mb-1 text-base">準備完了</span>
                                        モデル画像のアップロードと設定が完了しました。<br />
                                        GENERATEボタンを押して生成を開始してください。
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {generatedImage ? (
                <button
                    onClick={handleReset}
                    className="relative w-full py-4 rounded-xl font-bold text-lg tracking-wide transition-all overflow-hidden bg-muted text-foreground hover:bg-muted/80"
                >
                    <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5" />
                        新しく生成する
                    </span>
                </button>
            ) : (
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !modelImage}
                    className={cn(
                        "relative w-full py-4 rounded-xl font-bold text-lg tracking-wide transition-all overflow-hidden shadow-lg hover:shadow-cyan-500/25",
                        isLoading || !modelImage
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:scale-[1.02] active:scale-[0.98]"
                    )}
                >
                    <span className={cn(
                        "flex items-center justify-center gap-2",
                        isLoading ? "animate-pulse" : ""
                    )}>
                        {isLoading ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                生成中...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                GENERATE
                            </>
                        )}
                    </span>
                    {!isLoading && modelImage && (
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                    )}
                </button>
            )}

            <style jsx>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}
