import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const modelImage = formData.get('modelImage') as File;
        const refImage = formData.get('refImage') as File | null;
        const colorRefImage = formData.get('colorRefImage') as File | null;

        const hairColor = formData.get('hairColor') as string | null;
        const hairStyle = formData.get('hairStyle') as string | null;
        const gender = formData.get('gender') as string || "female";

        console.log("--- Hair Style Generation Request Received (Server) ---");
        console.log("Settings:", { hairColor, hairStyle, gender, hasRefImage: !!refImage, hasColorRefImage: !!colorRefImage });

        if (!modelImage) {
            return NextResponse.json(
                { error: 'モデル画像が必要です。' },
                { status: 400 }
            );
        }

        // サーバーサイドでAPIキーを取得 (環境変数)
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'サーバーの設定エラー: APIキーが設定されていません。' },
                { status: 500 }
            );
        }

        // --- Logic to Construct Prompt ---
        // We handle 3 input types for Style and 3 for Color:
        // Style: 1. Ref Image, 2. Text Selection, 3. Keep Original (None)
        // Color: 1. Ref Image, 2. Text Selection, 3. Keep Original (None)

        // 1. Determine Style Instruction
        let styleInstruction = "";
        if (refImage) {
            styleInstruction = "2. LOOK AT the Style Reference Image (2nd Image) and COPY that hairstyle EXACTLY (shape, length, texture). IGNORE original hair shape.";
        } else if (hairStyle) {
            styleInstruction = `2. COMPLETELY REPLACE the original hair with the target style: "${hairStyle}".`;
        } else {
            styleInstruction = "2. STRICTLY KEEP the original hairstyle shape, length, and texture. Do NOT change the form of the hair.";
        }

        // 2. Determine Color Instruction
        let colorInstruction = "";
        if (colorRefImage) {
            colorInstruction = "3. LOOK AT the Color Reference Image (3rd Image) and APPLY that exact hair color/gradient/highlight to the new hair.";
        } else if (hairColor) {
            colorInstruction = `3. CHANGE the hair color to "${hairColor}".`;
        } else {
            colorInstruction = "3. STRICTLY KEEP the original hair color (or use natural color if hair was replaced).";
        }

        const promptText = `
            Act as a professional hair stylist.
            
            [TASK]: Edit the hair of the person in the input image according to the instructions.
            
            [INPUTS]:
            - Target Image (1st Image): The person to transform.
            ${refImage ? '- Style Reference Image (2nd Image): Hairstyle source.' : ''}
            ${colorRefImage ? `- Color Reference Image (${refImage ? '3rd' : '2nd'} Image): Hair color source.` : ''}
            - Generated for: ${gender}.
            
            [CRITICAL INSTRUCTIONS]:
            1. Identify the person in the Target Image.
            ${styleInstruction}
            ${colorInstruction}
            4. The result must be photorealistic and match the head pose/lighting of the Target Image.
            5. STRICTLY KEEP the face, skin tone, and clothing EXACTLY the same.
            
            [OUTPUT]:
            - High-quality photo of the Target person with the requested modification.
        `;

        const modelBuffer = Buffer.from(await modelImage.arrayBuffer());
        const modelBase64 = modelBuffer.toString('base64');

        const contentsParts: any[] = [
            { text: promptText },
            { inline_data: { mime_type: modelImage.type || "image/jpeg", data: modelBase64 } }
        ];

        // Add Reference Images
        if (refImage) {
            const refBuffer = Buffer.from(await refImage.arrayBuffer());
            const refBase64 = refBuffer.toString('base64');
            contentsParts.push({
                inline_data: { mime_type: refImage.type || "image/jpeg", data: refBase64 }
            });
        }

        if (colorRefImage) {
            const colorRefBuffer = Buffer.from(await colorRefImage.arrayBuffer());
            const colorRefBase64 = colorRefBuffer.toString('base64');
            contentsParts.push({
                inline_data: { mime_type: colorRefImage.type || "image/jpeg", data: colorRefBase64 }
            });
        }

        console.log("Calling Gemini API (Server-side)...");

        // Use the model compatible with image generation/editing
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

        const apiResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: contentsParts
                }],
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

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error("Google API Error:", apiResponse.status, errorText);

            if (apiResponse.status === 403) {
                return NextResponse.json(
                    { error: `APIキーが無効です (403)。Vercelの環境変数 GEMINI_API_KEY が正しく設定されているか確認してください。` },
                    { status: 500 }
                );
            }

            return NextResponse.json(
                { error: `Google API Error (${apiResponse.status}): ${errorText}` },
                { status: 500 }
            );
        }

        const data = await apiResponse.json();
        const generatedPart = data.candidates?.[0]?.content?.parts?.[0];

        // レスポンスから画像データを抽出
        const inlineData = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data)?.inlineData
            || data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data)?.inline_data;


        if (inlineData?.data) {
            const base64Image = inlineData.data;
            const mimeType = inlineData.mimeType || inlineData.mime_type || "image/jpeg";
            const dataUrl = `data:${mimeType};base64,${base64Image}`;

            return NextResponse.json({ imageUrl: dataUrl });
        } else {
            // テキストだけ返ってきた場合のハンドリング
            const textPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
            if (textPart) {
                console.error("Generation Refused (Text Response):", textPart);
                return NextResponse.json(
                    { error: `画像生成が拒否されました: ${textPart}` },
                    { status: 422 }
                );
            }

            return NextResponse.json(
                { error: `予期しないAPI応答形式です: ${JSON.stringify(data).substring(0, 200)}...` },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('Generation Error Full:', error);
        let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json(
            { error: `システムエラー: ${errorMessage}` },
            { status: 500 }
        );
    }
}
