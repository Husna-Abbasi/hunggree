import { NextRequest, NextResponse } from 'next/server';

// This API endpoint processes menu images using AI vision
// Supports both OpenAI GPT-4 Vision and Google Gemini

const EXTRACTION_PROMPT = `You are a menu extraction assistant. Analyze restaurant menu images and extract all menu items with their categories, names, descriptions, and prices.

Return the data in this exact JSON format:
{
  "categories": [
    {
      "name": "Category Name",
      "items": [
        {
          "name": "Item Name",
          "description": "Item description",
          "price": 12.99,
          "category": "Category Name"
        }
      ]
    }
  ]
}

Rules:
- Extract ALL items visible in the menu
- Group items by their categories (Appetizers, Main Courses, Desserts, Beverages, etc.)
- If a category isn't explicitly stated, infer it from the context
- Prices should be numbers only (no currency symbols)
- If price is not visible, estimate based on item type or set to 0
- Descriptions should be concise (1-2 sentences max)
- If no description is visible, create a brief one based on the item name
- Return ONLY valid JSON, no other text`;

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
                            text: 'Extract all menu items from this restaurant menu image. Return the data as JSON with categories and items.'
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
            temperature: 0.2
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
                            text: `${EXTRACTION_PROMPT}\n\nExtract all menu items from this restaurant menu image. Return ONLY valid JSON with categories and items.`
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
                maxOutputTokens: 4096
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
    // AI sometimes adds preamble or wraps it in markdown code blocks
    let jsonContent = content.trim();

    // 1. Try to extract content between ```json and ```
    const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
        jsonContent = jsonBlockMatch[1].trim();
    } else {
        // 2. Try to extract content between any ``` and ```
        const genericBlockMatch = content.match(/```\s*([\s\S]*?)\s*```/);
        if (genericBlockMatch) {
            jsonContent = genericBlockMatch[1].trim();
        } else {
            // 3. Last resort: find the first { and the last }
            const firstBrace = content.indexOf('{');
            const lastBrace = content.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                jsonContent = content.substring(firstBrace, lastBrace + 1).trim();
            }
        }
    }

    try {
        const extractedData = JSON.parse(jsonContent);
        return NextResponse.json({
            ...extractedData,
            provider: provider
        });
    } catch (parseError: any) {
        console.error('Failed to parse AI response as JSON:', jsonContent);
        throw new Error(`AI generated an invalid menu structure. Please try again with a clearer image or different provider.`);
    }
}
