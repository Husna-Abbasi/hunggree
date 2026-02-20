import { NextRequest, NextResponse } from 'next/server';

// This API endpoint processes menu images using AI vision
// Supports both OpenAI GPT-4 Vision and Google Gemini

const EXTRACTION_PROMPT = `You are a menu extraction assistant. Analyze restaurant menu images and extract all menu items.

Return the data in this exact JSON format:
{"categories":[{"name":"Category Name","items":[{"name":"Item Name","description":"Item description","price":12.99,"category":"Category Name","variations":[{"name":"Small","price":9.99},{"name":"Large","price":14.99}]}]}]}

Rules:
- Extract ALL items visible.
- Group by category.
- Prices = numbers (0 if unknown).
- Descriptions = max 10 words.
- If an item has size or price variations (e.g. Small/Large, Half/Full, pieces), extract them into the "variations" array for that item. If no variations, omit the "variations" array or leave it empty.
- IMPORTANT: Return MINIFIED JSON (no indentation/newlines) to save space.
- NO Markdown.`;

async function processWithOpenAI(image: string, apiKey: string) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: EXTRACTION_PROMPT
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Extract menu items. Return valid minified JSON.'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: image,
                                detail: 'high'
                            }
                        }
                    ]
                }
            ],
            max_tokens: 4096,
            temperature: 0.2,
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to process image with OpenAI');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content;
}

async function processWithGemini(image: string, apiKey: string) {
    // Extract base64 data from data URL
    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
        throw new Error('Invalid image format');
    }

    const mimeType = `image/${base64Match[1]}`;
    const base64Data = base64Match[2];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: EXTRACTION_PROMPT
                        },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 8192,
                response_mime_type: "application/json"
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to process image with Gemini');
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

function getDemoData() {
    return {
        categories: [
            {
                name: "Appetizers",
                items: [
                    { name: "Spring Rolls", description: "Crispy vegetable spring rolls with sweet chili sauce", price: 6.99, category: "Appetizers" },
                    { name: "Chicken Wings", description: "Spicy buffalo wings with blue cheese dip", price: 9.99, category: "Appetizers" },
                    { name: "Soup of the Day", description: "Ask your server for today's fresh soup", price: 5.99, category: "Appetizers" }
                ]
            },
            {
                name: "Main Courses",
                items: [
                    { name: "Grilled Salmon", description: "Fresh Atlantic salmon with lemon butter sauce", price: 24.99, category: "Main Courses" },
                    { name: "Chicken Parmesan", description: "Breaded chicken breast with marinara and mozzarella", price: 18.99, category: "Main Courses" },
                    { name: "Beef Steak", description: "8oz ribeye steak cooked to perfection", price: 29.99, category: "Main Courses" }
                ]
            },
            {
                name: "Desserts",
                items: [
                    { name: "Chocolate Cake", description: "Rich chocolate layer cake with ganache", price: 7.99, category: "Desserts" },
                    { name: "Ice Cream", description: "Three scoops of premium ice cream", price: 5.99, category: "Desserts" }
                ]
            }
        ],
        demo: true
    };
}

export async function POST(request: NextRequest) {
    try {
        const { image, provider: clientProvider, openaiKey: clientOpenAIKey, geminiKey: clientGeminiKey } = await request.json();

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // Determine provider and API key
        // Priority: environment variable > client-provided (env vars are more secure)
        const provider = clientProvider || 'gemini'; // Default to gemini if env has GEMINI_API_KEY

        // Prefer environment variables
        let openaiKey = process.env.OPENAI_API_KEY || clientOpenAIKey;
        let geminiKey = process.env.GEMINI_API_KEY || clientGeminiKey;

        console.log('Provider:', provider);
        console.log('OpenAI Key available:', !!openaiKey);
        console.log('Gemini Key available:', !!geminiKey);
        console.log('Gemini Key from env:', !!process.env.GEMINI_API_KEY);

        // Check if we have the required API key for the selected provider
        if (provider === 'openai' && !openaiKey) {
            // Try Gemini as fallback
            if (geminiKey) {
                console.log('OpenAI key not found, falling back to Gemini');
                return await processRequest('gemini', image, '', geminiKey);
            }
            console.log('No API keys found, returning demo data');
            return NextResponse.json(getDemoData());
        }

        if (provider === 'gemini' && !geminiKey) {
            // Try OpenAI as fallback
            if (openaiKey) {
                console.log('Gemini key not found, falling back to OpenAI');
                return await processRequest('openai', image, openaiKey, '');
            }
            console.log('No API keys found, returning demo data');
            return NextResponse.json(getDemoData());
        }

        return await processRequest(provider, image, openaiKey || '', geminiKey || '');

    } catch (error: any) {
        console.error('Scan menu error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process menu' },
            { status: 500 }
        );
    }
}

async function processRequest(provider: string, image: string, openaiKey: string, geminiKey: string) {
    let content: string;

    if (provider === 'gemini') {
        console.log('Processing with Gemini...');
        content = await processWithGemini(image, geminiKey);
    } else {
        console.log('Processing with OpenAI...');
        content = await processWithOpenAI(image, openaiKey);
    }

    if (!content) {
        throw new Error('No response from AI');
    }

    // Parse the JSON response
    let jsonContent = content.trim();

    // Cleanup: Remove markdown code blocks if present
    const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
        jsonContent = jsonBlockMatch[1].trim();
    } else {
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonContent = content.substring(firstBrace, lastBrace + 1).trim();
        }
    }

    try {
        const extractedData = JSON.parse(jsonContent);

        if (!extractedData.categories || !Array.isArray(extractedData.categories)) {
            throw new Error("Missing 'categories' array in response");
        }

        return NextResponse.json({
            ...extractedData,
            provider: provider
        });
    } catch (parseError: any) {
        console.warn('First JSON parse attempt failed:', parseError.message);

        // Attempt to repair truncated JSON
        try {
            // Check if it looks truncated (missing closing brackets)
            let repairedJson = jsonContent;

            // Very naive repair: try closing arrays/objects
            const openBraces = (repairedJson.match(/\{/g) || []).length;
            const closeBraces = (repairedJson.match(/\}/g) || []).length;
            const openBrackets = (repairedJson.match(/\[/g) || []).length;
            const closeBrackets = (repairedJson.match(/\]/g) || []).length;

            if (openBrackets > closeBrackets) repairedJson += ']'.repeat(openBrackets - closeBrackets);
            if (openBraces > closeBraces) repairedJson += '}'.repeat(openBraces - closeBraces);

            console.log('Attempting to parse repaired JSON...');
            const extractedData = JSON.parse(repairedJson);

            if (!extractedData.categories || !Array.isArray(extractedData.categories)) {
                return NextResponse.json({ categories: [], provider, warning: "Menu was truncated, some items may be missing." });
            }

            return NextResponse.json({
                ...extractedData,
                provider: provider,
                warning: "Menu was truncated, executed repair."
            });

        } catch (repairError) {
            console.error('Failed to parse AI response as JSON:', jsonContent);
            throw new Error(`AI generated an invalid menu structure (${parseError.message}). Please try again with a clearer image.`);
        }
    }
}
