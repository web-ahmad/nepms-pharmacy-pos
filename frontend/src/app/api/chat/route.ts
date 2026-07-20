import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { history, message } = await request.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // Enforce strict persona and domain restrictions
    const systemPrompt = `You are "Pharvix AI Assistant", an expert Pharmacy ERP AI Assistant. 
Your core directive is to strictly answer ONLY questions related to:
- Pharmacies and medicines (substitutes, side effects, active ingredients)
- Point of Sale (POS) operations
- Inventory management
- Pharmacy health and business analytics
- Software usage related to the NEPMS/Pharvix ERP

If the user asks an irrelevant question (e.g., sports, politics, weather, programming, jokes, or anything outside the pharmacy/medical/ERP domain), you MUST politely decline to answer by saying: "I am apologies, but I am specifically designed to assist with Pharmacy, Health, and ERP-related queries. I cannot answer questions outside of this scope."

Keep your answers concise, professional, and helpful. Format your responses in plain text or simple markdown.`;

    // Map the history to Gemini's expected format
    const formattedHistory = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Understood. I will strictly act as Pharvix AI Assistant and only answer pharmacy and ERP-related questions." }] },
    ];

    if (Array.isArray(history)) {
      history.forEach((msg: { role: string, content: string }) => {
        formattedHistory.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });
    }

    // Start chat session with history
    const chatSession = model.startChat({
      history: formattedHistory,
    });

    const result = await chatSession.sendMessage(message);
    const responseText = result.response.text();

    return NextResponse.json({ reply: responseText });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { reply: "I'm sorry, I'm currently experiencing technical difficulties connecting to my AI brain. Please try again later." },
      { status: 500 }
    );
  }
}
