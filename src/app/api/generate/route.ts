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

            const genderText = gender === 'male' ? '男性' : '女性';
            let stylePrompt = "";

            if (refImage) {
                stylePrompt = `
【品質】
添付した1枚目（${modelImage.name}）のモデル画像を忠実に参照してください。

【目的】
ヘアスタイルを変更して、美容室に行く前に確認したいです。

【ヘアスタイル】
添付画像2枚目（${refImage.name}）の”ヘアスタイルのみ”を忠実に参照。他の装飾やアクセサリーは参照しないでください。
                `;
            } else {
                stylePrompt = `
【品質】
添付した1枚目（${modelImage.name}）のモデル画像を忠実に参照してください。

【目的】
ヘアスタイルを変更して、美容室に行く前に確認したいです。

【ヘアスタイル】
「${hairStyle}」の”ヘアスタイルのみ”を忠実に参照。他の装飾やアクセサリーは参照しないでください。
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
            const genderText = gender === 'male' ? '男性' : '女性';

            if (colorRefImage) {
                colorPrompt = `
【品質】
添付した1枚目（${modelImage.name}）のモデル画像を忠実に参照してください。

【目的】
ヘアカラーを変更して、美容室に行く前に確認したいです。

【ヘアカラー】
添付画像2枚目（${colorRefImage.name}）の”ヘアカラーのみ”を忠実に参照。他の装飾やアクセサリーは参照しないでください。
                 `;
            } else {
                colorPrompt = `
【品質】
添付した1枚目（${modelImage.name}）のモデル画像を忠実に参照してください。

【目的】
ヘアカラーを変更して、美容室に行く前に確認したいです。

【ヘアカラー】
「${hairColor}」の”ヘアカラーのみ”を忠実に参照。他の装飾やアクセサリーは参照しないでください。
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
