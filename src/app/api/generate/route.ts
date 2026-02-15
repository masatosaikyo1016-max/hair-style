import { NextResponse } from 'next/server';

// --- Constants ---
const MODEL_FULL_NAME = "gemini-2.0-flash-exp";
// Note: User mentioned "Gemini 2.5 (Flash Image)" in context, but standard is gemini-1.5-flash or pro. 
// Ideally we should use the one that works. The previous code had "gemini-2.5-flash-image" which might be a typo or a custom access. 
// I will stick to "gemini-1.5-flash" or "gemini-2.0-flash-exp" as safe defaults if "2.5" is invalid, 
// BUT the previous code used "gemini-2.5-flash-image" and it seemingly worked (or user thinks it did).
// However, "gemini-2.5" doesn't exist publicly yet. The previous code might have been using a specific endpoint. 
// Wait, looking at the file content I just viewed: `targetUrl = ... gemini-2.5-flash-image ...`
// If the user *provided* this code or approved it, I should keep it. 
// BUT, if it was hallucinations by previous turns, I should be careful. 
// "gemini-2.0-flash-exp" is available. "gemini-1.5-flash" is stable.
// To be safe and ensure high quality editing, I will use "gemini-2.0-flash-exp" which is excellent for vision tasks, 
// OR keep the one from the file if it's a known internal thing. 
// Let's assume the previous file's "gemini-2.5-flash-image" was a placeholder or typo by previous AI steps.
// I will use "gemini-2.0-flash-exp" as it is the latest capable model, or "gemini-1.5-pro".
// Actually, for "generation/editing", standard models might refuse "editing" people. 
// But the prompt "Act as a professional hair stylist..." usually works with Flash/Pro.
// Note: User mentioned "Gemini 2.5 (Flash Image)" in context.
// The previous code had "gemini-2.5-flash-image" which was working (or at least expected).
// I will revert to "gemini-2.5-flash-image" to fix the 404 error caused by "gemini-2.0-flash-exp".
const TARGET_MODEL = "gemini-2.5-flash-image";

async function generateImage(
    apiKey: string,
    modelImageBase64: string,
    prompt: string,
    refImageBase64?: string | null
): Promise<string> {
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${TARGET_MODEL}:generateContent?key=${apiKey}`;

    const contentsParts: any[] = [
        { text: prompt },
        { inline_data: { mime_type: "image/jpeg", data: modelImageBase64 } }
    ];

    if (refImageBase64) {
        contentsParts.push({
            inline_data: { mime_type: "image/jpeg", data: refImageBase64 }
        });
    }

    const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: contentsParts }],
            generationConfig: {
                temperature: 0.85,
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
        throw new Error(`Google API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Extract Image
    const inlineData = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data)?.inlineData
        || data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data)?.inline_data;

    if (inlineData?.data) {
        return inlineData.data;
    }

    // Text Fallback (Error)
    const textPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
    if (textPart) {
        throw new Error(`詳細: 生成が拒否されました (テキスト応答: ${textPart})`);
    }

    throw new Error("予期しないAPI応答形式です (画像が含まれていません)");
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const modelImage = formData.get('modelImage') as File;
        let refImage = formData.get('refImage') as File | null;
        let colorRefImage = formData.get('colorRefImage') as File | null;

        let hairColor = formData.get('hairColor') as string | null;
        let hairStyle = formData.get('hairStyle') as string | null;
        const gender = formData.get('gender') as string || "female";

        console.log("--- Pipeline Generation Request (2-Stage) ---");
        console.log("Settings:", { hairColor, hairStyle, gender, hasRefImage: !!refImage, hasColorRefImage: !!colorRefImage });

        if (!modelImage) {
            return NextResponse.json({ error: 'モデル画像が必要です。' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'サーバー設定エラー: APIキー不足' }, { status: 500 });
        }

        // --- Prepare Base64 inputs ---
        const modelBuffer = Buffer.from(await modelImage.arrayBuffer());
        let currentImageBase64 = modelBuffer.toString('base64'); // This will be updated through the pipeline

        const refImageBase64 = refImage ? Buffer.from(await refImage.arrayBuffer()).toString('base64') : null;
        const colorRefImageBase64 = colorRefImage ? Buffer.from(await colorRefImage.arrayBuffer()).toString('base64') : null;

        // --- Determine Requirements ---
        const needsStyleChange = !!hairStyle || !!refImage;
        const needsColorChange = !!hairColor || !!colorRefImage;

        // --- STAGE 1: Hair Style ---
        if (needsStyleChange) {
            console.log(">>> Executing STAGE 1: Hair Style");

            let stylePrompt = "";

            if (refImage) {
                stylePrompt = `
**重要指令：添付した${modelImage.name}の人物の髪型を、${refImage.name}の髪型に「完全置換」してください。**
モデル画像の元の髪型（特に長さや輪郭）は**一切考慮せず、無視してください。**

【手順】
1. **元の髪型の消去**: 頭部にある現在の髪型を概念的に消去してください。
2. **参照画像の特徴移植**: 添付画像${refImage.name}の以下の要素を**100%コピー**して、人物の頭部に再構築してください：
    - **髪の長さ**（ショートならショートに、ロングならロングに強制変更）
    - **髪の質感**（ストレート、ウェーブ、カールの完全再現）
    - **前髪の形状**
    - **全体のシルエットとボリューム**

【制約】
- 人物の顔立ち（目、鼻、口、輪郭）は維持してください。
- 元の髪がはみ出したり、透けて見えたりしないようにしてください。
- **大胆に**形を変えてください。元の髪型に引っ張られないでください。
                `;
            } else {
                stylePrompt = `
**重要指令：添付した${modelImage.name}の人物の髪型を、「${hairStyle}」に「完全置換」してください。**
モデル画像の元の髪型（特に長さや輪郭）は**一切考慮せず、無視してください。**

【手順】
1. **元の髪型の消去**: 頭部にある現在の髪型を概念的に消去してください。
2. **指定スタイルの適用**: 「${hairStyle}」の一般的な特徴（長さ、質感、形状）を**忠実に再現**して、人物の頭部に再構築してください。
    - 指定された髪型のシルエットを最優先してください。
    - 顔の雰囲気に合わせる必要はありません。髪型そのものを正しく描画してください。

【制約】
- 人物の顔立ち（目、鼻、口、輪郭）は維持してください。
- 元の髪がはみ出したり、透けて見えたりしないようにしてください。
- **大胆に**形を変えてください。元の髪型に引っ張られないでください。
                `;
            }

            try {
                // Call API with Model + StyleRef (if exists)
                const resultBase64 = await generateImage(
                    apiKey,
                    currentImageBase64,
                    stylePrompt,
                    refImageBase64 // Pass style ref if exists
                );
                currentImageBase64 = resultBase64; // Update current image
            } catch (e: any) {
                console.error("Stage 1 Failed:", e);
                return NextResponse.json({ error: `スタイル生成エラー: ${e.message}` }, { status: 500 });
            }
        } else {
            console.log(">>> Skipping STAGE 1 (No Style Change Requested)");
        }

        // --- STAGE 2: Hair Color ---
        if (needsColorChange) {
            console.log(">>> Executing STAGE 2: Hair Color");

            let colorPrompt = "";

            if (colorRefImage) {
                colorPrompt = `
**重要指令：添付した${modelImage.name}の人物の髪色を、${colorRefImage.name}の色に「完全塗り替え」してください。**
モデル画像の元の髪色は**一切考慮せず、無視してください。**

【手順】
1. **元の色の消去**: 現在の髪色を概念的にリセットしてください。
2. **参照画像の色移植**: 添付画像${colorRefImage.name}の色味（Hue）、彩度（Saturation）、明るさ（Brightness）を**そのまま抽出**し、髪全体に適用してください。
    - 元の髪色が透けないように、完全に新しい色で上書きしてください。

【制約】
- 人物の顔立ちや肌の色、背景は維持してください。
- 髪の質感や光沢は保ちつつ、色味だけを参照画像に合わせてください。
                 `;
            } else {
                colorPrompt = `
**重要指令：添付した${modelImage.name}の人物の髪色を、「${hairColor}」に「完全塗り替え」してください。**
モデル画像の元の髪色は**一切考慮せず、無視してください。**

【手順】
1. **元の色の消去**: 現在の髪色を概念的にリセットしてください。
2. **指定色の適用**: 「${hairColor}」の色味を**忠実に表現**し、髪全体に適用してください。
    - 元の髪色が透けないように、完全に新しい色で上書きしてください。

【制約】
- 人物の顔立ちや肌の色、背景は維持してください。
- 髪の質感や光沢は保ちつつ、色味だけを指定色に合わせてください。
                `;
            }

            try {
                // Call API with Current Image (Result of Stage 1 or Original) + ColorRef (if exists)
                const resultBase64 = await generateImage(
                    apiKey,
                    currentImageBase64, // Use output of Stage 1
                    colorPrompt,
                    colorRefImageBase64 // Pass color ref if exists
                );
                currentImageBase64 = resultBase64;
            } catch (e: any) {
                console.error("Stage 2 Failed:", e);
                return NextResponse.json({ error: `カラー生成エラー: ${e.message}` }, { status: 500 });
            }
        } else {
            console.log(">>> Skipping STAGE 2 (No Color Change Requested)");
        }

        // --- Return Final Result ---
        return NextResponse.json({ imageUrl: `data:image/jpeg;base64,${currentImageBase64}` });

    } catch (error: any) {
        console.error('Pipeline Error:', error);
        return NextResponse.json(
            { error: `システムエラー: ${error.message}` },
            { status: 500 }
        );
    }
}
