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
                temperature: 0.7,
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
# システム指令：ヘアスタイル物理的コピー＆置換 (Surgical Replacement)

## ミッション
添付された${modelImage.name}をベース(土台)とし、その頭部に${refImage.name}の髪型を**物理的にコピーして貼り付け**てください。
AIによる「被写体に合わせたアレンジ」は**一切禁止**します。

## 指示詳細
1. **元の髪型の完全消去(0%)**: ${modelImage.name}の元の髪型情報を完全に抹消してください。毛先一本残さないでください。
2. **参照パターンの完全複製(100%)**: ${refImage.name}の以下の要素を、ピクセル単位の精度で再現してください：
   - **絶対的な長さ**: ショートならショート、ロングならロング。誤差を認めない。
   - **3次元的シルエット**: 髪のボリューム感、外郭ラインを完全に一致させる。
   - **毛流れと質感**: ストレートの度合い、ウェーブの細かさ、ツヤ感をそのまま移植。
   - **前髪の境界線**: 額の露出範囲、分け目の位置を正確にコピー。

## 禁止事項
- モデルの顔立ちに合わせて髪型を補正すること（絶対にそのまま描画せよ）。
- 元の髪型が透けて見えたり、混ざったりすること。
- 「なんとなく似ている」レベルで妥協すること。

対象の性別：${genderText}に対する物理的な髪型移植を実行せよ。
                `;
            } else {
                stylePrompt = `
# システム指令：ヘアスタイル仕様書に基づく完全再現

## ミッション
${modelImage.name}の髪型を、「${hairStyle}」という定義に基づき**構造から再構築**してください。

## 指示詳細
1. **元の髪型の完全消去**: モデルの現在の髪型をリセットしてください。
2. **定義の厳密な適用**: 「${hairStyle}」の標準的な形状（長さ、構造、質感）を、誇張して適用してください。
   - 曖昧さを排除し、ひと目でその髪型だと断定できる形状を構築すること。

## 制約
- モデルの顔立ちを維持しつつ、髪型は独立して強力に書き換えること。
- 元の髪型に引っ張られないこと。

対象の性別：${genderText}
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
