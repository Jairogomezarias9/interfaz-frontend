import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const response = await fetch("http://185.254.96.194:8001/api/fast-odds", {
            headers: {
                'Cache-Control': 'no-store' // Ensure fresh data
            }
        });

        if (!response.ok) {
            throw new Error(`Upstream API failed with status: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Proxy Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch match data", details: error.message },
            { status: 500 }
        );
    }
}
