"use client";

import { cn, resizeImage, cropImage } from "@/lib/utils";
import { Sparkles, Download, Share2, Maximize2, Minimize2, X, RefreshCw, Scan, ScanFace, Shirt } from "lucide-react";
import { useState } from "react";
// Import type locally if circular dependency is an issue, or just define subset
import { SettingsState } from "./SettingsPanel";

interface GenerateAreaProps {
    modelImage: File | null;
    settings: SettingsState;
}

export function GenerateArea({ modelImage, settings }: GenerateAreaProps) {
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
        console.log("Starting Client-Side Generation (Hair Style Mode)...");

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
            // 1. Crop original image to aspect ratio first
            console.log(`Cropping model image to ${aspectRatio}...`);
            const croppedModelFile = await cropImage(modelImage, aspectRatio);

            // 2. Resize to optimal size for Gemini (e.g. max 1536px)
            const resizedModelFile = await resizeImage(croppedModelFile, 1536, 1536);
            const resizedModelBase64 = await fileToBase64(resizedModelFile);

            // Construct Prompt for Hair Color Change
            let prompt = `
            Act as a professional hair colorist and photo editor.
            Task: Change the hair color of the person in the image naturally.
            
            Input:
            - Target Hair Color: ${settings.hairColor}
            
            Instructions:
            1. Identify the hair region of the person in the photo accurately.
            2. Change the hair color to "${settings.hairColor}".
            3. Maintain the natural texture, lighting, and shading of the original hair.
            4. Do NOT change the skin tone, background, or clothes.
            5. Ensure the edges between hair and face/background are natural.
            
            Output Requirement:
            - Photorealistic quality.
            - Keep the original resolution and aspect ratio.
            `;

            const contentsParts: any[] = [
                { text: prompt }
            ];

            // Model image
            contentsParts.push({ inline_data: { mime_type: "image/jpeg", data: resizedModelBase64 } });


            // 4. Call Google API Directly
            const apiKey = "AIzaSyCymikEwW8Flfs9VDKTJgfvveCJCiK8jjw"; // Used directly on client as per user agreement

            // !! USER REQUEST: KEEP GEMINI 2.5 !!
            const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: contentsParts }],
                    generationConfig: {
                        temperature: 0.4,
                        topK: 32,
                        topP: 1,
                        maxOutputTokens: 2048,
                    },
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                    ]
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Throw detailed error with status code
                throw new Error(`Google API Error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            const parts = data.candidates?.[0]?.content?.parts || [];

            // Search for the image part in all parts (model might return text + image)
            const imagePart = parts.find((p: any) => p.inlineData || p.inline_data);
            const inlineData = imagePart?.inlineData || imagePart?.inline_data;

            if (inlineData?.data) {
                const base64Result = inlineData.data;
                const mimeType = inlineData.mimeType || inlineData.mime_type || "image/jpeg";
                setGeneratedImage(`data:${mimeType};base64,${base64Result}`);
            } else {
                // If no image found, check for text explanation
                const textPart = parts.find((p: any) => p.text);
                if (textPart?.text) {
                    throw new Error(`画像生成が拒否されました (Text Response): ${textPart.text}`);
                }
                throw new Error("予期しないAPI応答形式です。画像データが含まれていません。");
            }

        } catch (error) {
            console.error("Generation error:", error);
            const errorMessage = error instanceof Error ? error.message : "不明なエラー";
            // Alert with DETAILS so we can debug
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

    const handleSave = () => {
        if (!generatedImage) return;

        setIsSaving(true);
        try {
            const timestamp = new Date().getTime();
            const filename = `generated_${timestamp}.jpg`;

            // Direct client-side download
            const link = document.createElement('a');
            link.href = generatedImage;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

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
                            {/* 1. Base Layer: Model Image (Fallback) */}
                            {modelImage && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={URL.createObjectURL(modelImage)}
                                    alt="Source"
                                    className={cn(
                                        "absolute inset-0 w-full h-full object-contain transition-all duration-1000",
                                        isLoading ? "blur-md scale-105 opacity-40" : "opacity-30 blur-sm scale-110"
                                    )}
                                />
                            )}

                            {/* 2. Overlay Layer REMOVED */}
                        </div>

                        {/* Message Overlay - Switches between Preview Guide and Loading Status */}
                        <div className="absolute bottom-6 left-6 right-6 z-20 transition-all duration-500">
                            <div className={cn(
                                "backdrop-blur-sm border rounded-xl p-4 shadow-lg text-center transition-colors duration-500",
                                isLoading ? "bg-black/70 border-white/20 text-white" : "hidden"
                            )}>
                                {isLoading && (
                                    <div className="flex flex-col items-center gap-2">
                                        <Sparkles className="w-6 h-6 animate-pulse text-cyan-400" />
                                        <p className="text-sm font-medium leading-relaxed animate-pulse">
                                            <span className="font-bold block text-base mb-1">
                                                {isAnalyzing ? "画像を解析中..." : "画像を生成中..."}
                                            </span>
                                            {isAnalyzing ? analysisStep : "最高の一枚を作成しています。しばらくお待ちください。"}
                                        </p>
                                    </div>
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
