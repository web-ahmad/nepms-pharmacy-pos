import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
// @ts-ignore
import googleTrends from 'google-trends-api';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { internalInsights } = await request.json();

    const weatherPromise = axios.get('https://api.open-meteo.com/v1/forecast?latitude=31.5497&longitude=74.3436&daily=temperature_2m_max,temperature_2m_min&timezone=auto');
    const diseasePromise = axios.get('https://disease.sh/v3/covid-19/countries/pakistan');
    
    // Start date 7 days ago
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const trendsPromise = googleTrends.interestOverTime({ keyword: 'Dengue', geo: 'PK', startTime: startDate });

    const results = await Promise.allSettled([weatherPromise, diseasePromise, trendsPromise]);

    let weatherData = null;
    let diseaseData = null;
    let trendsData = null;

    if (results[0].status === 'fulfilled') {
      weatherData = results[0].value.data;
    }
    if (results[1].status === 'fulfilled') {
      diseaseData = results[1].value.data;
    }
    if (results[2].status === 'fulfilled') {
      try {
        trendsData = JSON.parse(results[2].value);
      } catch (e) {
        // Parse error ignored
      }
    }

    const rawData = {
      weather: weatherData,
      healthStats: diseaseData,
      searchTrends: trendsData,
      internalSales: internalInsights
    };

    // Gemini Integration
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `You are an expert Pharmacy ERP Business Analyst. Analyze the following raw data (Weather, Health Stats, Internal Sales). Generate exactly 4 short, highly actionable alerts for a pharmacy owner. Format the output strictly as a JSON array of objects with the following schema:
[{ "id": "string", "type": "weather" | "trend" | "health" | "inventory", "message": "string", "severity": "high" | "medium" | "low" }]

CRITICAL INSTRUCTION: If the "Internal Sales" data provided is empty or missing ([]), DO NOT generate any insights related to inventory, sales, or medicines. Strictly generate insights ONLY for Weather and Health based on the provided external data. Do not hallucinate data.

Raw Data:
${JSON.stringify(rawData)}`;

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        }
      });
      
      const responseText = result.response.text();
      const aiInsights = JSON.parse(responseText);

      return NextResponse.json({ insights: aiInsights });

    } catch (aiError) {
      console.error("Gemini API Error, falling back to heuristic rules:", aiError);
      return returnFallback(rawData);
    }

  } catch (error) {
    console.error('Market Intelligence Service Error:', error);
    return NextResponse.json({ insights: [] }, { status: 500 });
  }
}

function returnFallback(rawData: any) {
  const insights: any[] = [];
  
  if (rawData.weather?.daily?.temperature_2m_max) {
    const temps = rawData.weather.daily.temperature_2m_max;
    if (temps.length >= 3 && (temps[0] - temps[2]) > 3) {
      insights.push({ id: `fb-1-${Date.now()}`, type: 'weather', message: `Temperature drop detected. Stock up on cold/flu medication.`, severity: 'medium' });
    }
  }

  if (rawData.healthStats?.active > 50) {
    insights.push({ id: `fb-2-${Date.now()}`, type: 'health', message: `Disease.sh reports active cases (${rawData.healthStats.active}). Monitor antiviral stock.`, severity: 'high' });
  }

  // Only include internal sales insight if it's a real insight and not a placeholder or empty
  if (rawData.internalSales && rawData.internalSales.length > 0 && !rawData.internalSales[0].includes('Analyzing regional datasets')) {
    insights.push({ id: `fb-3-${Date.now()}`, type: 'inventory', message: rawData.internalSales[0], severity: 'low' });
  }

  if (insights.length === 0) {
    insights.push({ id: `fb-4-${Date.now()}`, type: 'trend', message: `All external markets currently stable.`, severity: 'low' });
  }

  return NextResponse.json({ insights });
}
