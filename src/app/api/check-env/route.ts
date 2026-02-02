import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const apiKey = process.env.GEMINI_API_KEY;
    const nextPublicApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    return NextResponse.json({
        status: 'Debug Check',
        timestamp: new Date().toISOString(),
        environment: {
            NODE_ENV: process.env.NODE_ENV,
            GEMINI_API_KEY: {
                present: !!apiKey,
                length: apiKey ? apiKey.length : 0,
                firstChar: apiKey ? apiKey.substring(0, 1) : null,
                lastChar: apiKey ? apiKey.substring(apiKey.length - 1) : null
            },
            NEXT_PUBLIC_GEMINI_API_KEY: {
                present: !!nextPublicApiKey,
                length: nextPublicApiKey ? nextPublicApiKey.length : 0
            }
        }
    });
}
