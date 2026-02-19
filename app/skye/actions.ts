'use server';

import { GoogleGenAI, Content } from "@google/genai";
import { OpenRouter } from "@openrouter/sdk";

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function generateContent(
  prompt: string,
  model: string = "openrouter:arcee-ai/trinity-large-preview:free",
  history: ChatMessage[] = []
) {
  const isOpenRouter = model.startsWith("openrouter:");
  const actualModel = isOpenRouter ? model.replace("openrouter:", "") : model;

  // OpenRouter models
  if (isOpenRouter) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not set.");
    }

    const openrouter = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY
    });

    const messages = [
      ...history.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: prompt }
    ];

    try {
      const stream = await openrouter.chat.send({
        model: actualModel,
        messages,
        stream: true
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
        }
      }

      return fullResponse;
    } catch (error: any) {
      console.error("Error generating content:", error);

      // Rate limit error
      if (error?.statusCode === 429) {
        const errorBody = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
        return `⚠️ **${errorBody?.error?.message}**\n\n${errorBody?.error?.metadata?.raw}`;
      }

      // Internal server error
      if (error?.statusCode === 500) {
        return '⚠️ **Internal server error**';
      }
      
      return "Sorry, I couldn't generate a response at this time.";
    }
  }

  // Google AI Studio models
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

  const contents: Content[] = [
    ...history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    } as Content)),
    { role: 'user', parts: [{ text: prompt }] } as Content
  ];

  try {
    const response = await ai.models.generateContent({
      model: actualModel,
      contents,
    });
    return response.text;
  } catch (error: any) {
    console.error("Error generating content:", error);
    
    // Rate limit error
    if (error?.status === 429) {
      return `⚠️ **Free quota exceeded**\n\nWe've hit the daily free quota for the ${actualModel} model. Please change to another model or try again tomorrow.`;
    }
    
    return "Sorry, I couldn't generate a response at this time.";
  }
}
