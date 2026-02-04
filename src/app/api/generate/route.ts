import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const modelImage = formData.get('modelImage') as File;
        const hairColor = formData.get('hairColor') as string || "Brown";
        // ヘアスタイルを取得 (デフォルトは Medium)
        const hairStyle = formData.get('hairStyle') as string || "Medium";

        console.log("--- Hair Style Generation Request Received (Server) ---");
        console.log("Settings:", { hairColor, hairStyle });

        if (!modelImage) {
            return NextResponse.json(
                { error: 'モデル画像が必要です' },
                { status: 400 }
            );
        }

        // サーバーサイドでAPIキーを取得 (環境変数)
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("API Key is missing in server environment");
            return NextResponse.json(
                { error: 'サーバーの設定エラー: APIキーが設定されていません。環境変数 GEMINI_API_KEY を確認してください。' },
                { status: 500 }
            );
        }

        // Construct Prompt for Hair Color and Style Change
        const promptText = `
        Act as a professional hair colorist and photo editor.
        Task: Change the hair color and style of the person in the image naturally.
        
        Input:
        - Target Hair Color: ${hairColor}
        - Target Hair Style: ${hairStyle}
        
        Instructions:
        1. Identify the hair region of the person in the photo accurately.
        2. Change the hair color to "${hairColor}".
        3. Change the hair style to "${hairStyle}".
        4. Maintain the natural texture, lighting, and shading of the original hair.
        5. Do NOT change the skin tone, background, or clothes.
        6. Ensure the edges between hair and face/background are natural.
        
        Output Requirement:
        - Photorealistic quality.
        - Keep the original resolution and aspect ratio.
        `;

        const modelBuffer = Buffer.from(await modelImage.arrayBuffer());
        const modelBase64 = modelBuffer.toString('base64');

        const contentsParts: any[] = [
            { text: promptText },
            { inline_data: { mime_type: modelImage.type || "image/jpeg", data: modelBase64 } }
        ];

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
