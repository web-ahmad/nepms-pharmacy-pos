import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { internalInsights = [] } = body;

    // We can also pass dynamic context (e.g., location, recent events like rain)
    const promptContext = `
You are an advanced AI Predictive Insights engine for a Pharmacy POS system located in Lahore, Pakistan.
Your goal is to provide actionable market intelligence, health alerts, and inventory recommendations.

Current Local Context: There has been continuous heavy rain in Lahore for the past 2 days. 
Consider the medical implications of this weather (e.g., rise in dengue, malaria, waterborne diseases, typhoid, cholera, cold/flu, fungal infections) and advise on inventory.

Backend Internal Insights:
${internalInsights.join('\n')}

Based on the above context, generate 3-4 specific, highly actionable alerts or insights for the pharmacy owner.
Format your output EXACTLY as a valid JSON array of objects with the following schema, and no other text or markdown:
[
  {
    "id": "unique-id-1",
    "type": "weather", // can be 'weather', 'trend', 'health', or 'inventory'
    "message": "The insight message...",
    "severity": "high" // can be 'high', 'medium', or 'low'
  }
]
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent(promptContext);
    const text = result.response.text();
    
    // Parse the JSON output from Gemini
    // Clean up potential markdown formatting (```json ... ```)
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let insights = [];
    try {
      insights = JSON.parse(cleanedText);
    } catch (e) {
      console.error("Failed to parse Gemini response:", cleanedText);
      // Fallback
      insights = [
        {
          id: "err-1",
          type: "health",
          message: "AI engine is analyzing the sudden weather changes in Lahore.",
          severity: "low"
        }
      ];
    }

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("Error generating market intelligence:", error);
    return NextResponse.json({ 
      insights: [
        {
          id: "err-api",
          type: "weather",
          message: "Weather alert: Heavy rain detected. Ensure stock of Panadol, anti-allergies and Dengue prevention items.",
          severity: "medium"
        }
      ] 
    }, { status: 500 });
  }
}
