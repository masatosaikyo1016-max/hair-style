import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const modelImage = formData.get('modelImage') as File;
        const garmentImage = formData.get('garmentImage') as File;
        const bottomsImage = formData.get('bottomsImage') as File;

        // Get settings
        const aspect = formData.get('aspect') as string || "3:4";
        const scene = formData.get('scene') as string || "Simple Studio";
        const lighting = formData.get('lighting') as string || "Natural Light";
        const shotType = formData.get('shotType') as string || "Waist-Up";
        const lookAtCamera = formData.get('lookAtCamera') === 'true';

        console.log("--- Generation Request Received ---");
        console.log("Settings:", { aspect, scene, lighting, shotType, lookAtCamera });

        if (!modelImage || (!garmentImage && !bottomsImage)) {
            return NextResponse.json(
                { error: 'モデル画像と、少なくとも1つの服装画像（トップスまたはボトムス）が必要です' },
                { status: 400 }
            );
        }

        // Construct Dynamic Prompt
        const promptText = `
【品質】
アスペクト比は ${aspect}。
アングルは ${shotType === 'Waist-Up' ? '腰から上のクローズアップ' : '全身'}。
＊＊アップロードしたモデル写真を参照し、モデルの表情やポーズを忠実に維持しながら、プロのフォトグラファーが撮影したような完成度の高い写真に再構成する。超重要＊＊

【人物】
写真を参照 (視線: ${lookAtCamera ? "カメラ目線" : "自然な視線"})

【場所や季節】
${scene}, ${lighting}

【服装】
添付画像を参照。
${garmentImage ? "・トップス: 画像を参照。" : ""}
${bottomsImage ? "・ボトムス: 画像を参照。" : ""}
トップスとボトムスが両方提供されている場合は、それらを自然に組み合わせて着用させること。
        `.trim();

        const apiKey = "AIzaSyCymikEwW8Flfs9VDKTJgfvveCJCiK8jjw";

        const modelBuffer = Buffer.from(await modelImage.arrayBuffer());
        const modelBase64 = modelBuffer.toString('base64');

        let contentsParts: any[] = [
            { text: promptText },
            { inline_data: { mime_type: modelImage.type || "image/jpeg", data: modelBase64 } }
        ];

        if (garmentImage) {
            const garmentBuffer = Buffer.from(await garmentImage.arrayBuffer());
            const garmentBase64 = garmentBuffer.toString('base64');
            contentsParts.push({
                inline_data: { mime_type: garmentImage.type || "image/jpeg", data: garmentBase64 }
            });
        }

        if (bottomsImage) {
            const bottomsBuffer = Buffer.from(await bottomsImage.arrayBuffer());
            const bottomsBase64 = bottomsBuffer.toString('base64');
            contentsParts.push({
                inline_data: { mime_type: bottomsImage.type || "image/jpeg", data: bottomsBase64 }
            });
        }

        if (apiKey) {
            console.log("Starting NanoBanana (Gemini 2.5) virtual try-on with settings...", { aspect, scene, lighting });

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

                if (apiResponse.status === 404 || apiResponse.status === 400) {
                    console.error("NanoBanana Access Error:", apiResponse.status, errorText);
                    return NextResponse.json(
                        { error: `Google Gemini 2.5 (NanoBanana) へのアクセスに失敗しました。まだ一般公開されていないか、キーの権限がありません。(Status: ${apiResponse.status})` },
                        { status: 500 }
                    );
                }

                console.error("Google API Error:", apiResponse.status, errorText);
                return NextResponse.json(
                    { error: `Google API Error (${apiResponse.status}): ${errorText}` },
                    { status: 500 }
                );
            }

            const data = await apiResponse.json();
            const generatedPart = data.candidates?.[0]?.content?.parts?.[0];
            const inlineData = generatedPart?.inlineData || generatedPart?.inline_data;

            if (inlineData?.data) {
                const base64Image = inlineData.data;
                const mimeType = inlineData.mimeType || inlineData.mime_type || "image/jpeg";
                const dataUrl = `data:${mimeType};base64,${base64Image}`;

                return NextResponse.json({ imageUrl: dataUrl });
            } else if (generatedPart?.text) {
                console.error("Generation Refused (Text Response):", generatedPart.text);
                return NextResponse.json(
                    { error: `画像生成が拒否されました (AIからのメッセージ): ${generatedPart.text}` },
                    { status: 422 }
                );
            } else {
                return NextResponse.json(
                    { error: `予期しないAPI応答形式です: ${JSON.stringify(data)}` },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            { error: 'APIキーが設定されていません。' },
            { status: 500 }
        );

    } catch (error: any) {
        console.error('Generation Error Full:', error);
        let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json(
            { error: `システムエラー: ${errorMessage}` },
            { status: 500 }
        );
    }
}
