'use server';

import { GoogleGenAI } from "@google/genai";

export async function generateContent(prompt: string, model: string = "gemini-2.5-flash") {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text;
  } catch (error: any) {
    console.error("Error generating content:", error);
    
    // Rate limit error
    if (error?.status === 429) {
      return "⚠️ **Free Quota Exceeded**\n\nWe've hit the daily free quota for the Lite tier. Please try again tomorrow or contact support to upgrade your plan.";
    }
    
    return "Sorry, I couldn't generate a response at this time.";
  }
}
