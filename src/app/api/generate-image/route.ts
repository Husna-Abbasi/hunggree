import { NextRequest, NextResponse } from "next/server";
import { uploadToPinata } from "@/lib/pinata";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, description, category } = body;

        if (!title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const prompt = `Professional food photography of  ${title}.
            Category: (${category} || "Food").
            Description: (${description} || title).
            Style: High-end restaurant menu photo, 8k resolution, photorealistic, delicious, appetizing, soft lighting, shallow depth of field, plated beautifully on a table. 
            Do not include text or people. Focus solely on the dish.`;

        const apiKey = process.env.GEMINI_API_KEY;
        const url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=" + apiKey;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                instances: [
                    { prompt: prompt }
                ],
                parameters: {
                    sampleCount: 1
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini Generation Error:", errorText);
            throw new Error("Gemini API failed with status " + response.status + ": " + errorText);
        }

        const data = await response.json();

        if (!data.predictions || data.predictions.length === 0) {
            throw new Error("No image generated");
        }

        const prediction = data.predictions[0];
        const base64Image = prediction.bytesBase64Encoded;
        const mimeType = prediction.mimeType || "image/png";

        const buffer = Buffer.from(base64Image, 'base64');
        const file = new Blob([buffer], { type: mimeType });

        const timestamp = new Date().getTime();
        const cleanTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const filename = "ai-gen-" + cleanTitle + "-" + timestamp + ".png";

        const ipfsUrl = await uploadToPinata(file, filename);

        return NextResponse.json({ url: ipfsUrl });

    } catch (error: any) {
        console.error("Generation error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate image" },
            { status: 500 }
        );
    }
}
