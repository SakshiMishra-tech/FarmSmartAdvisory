import { Request, Response } from "express";
import { storage } from "./storage";
import { GoogleGenAI } from "@google/genai";
import { languages } from "@shared/schema";

// Initialize Gemini client (will use process.env.GEMINI_API_KEY by default)
const ai = new GoogleGenAI({});

type VoiceQueryBody = {
  query: string;
  language?: string;
  farmerId: string;
};

// System instruction to act as a farming advisor and respond step-by-step
const SYSTEM_INSTRUCTION = `You are a highly knowledgeable farming advisor for FarmWise. 
Your goal is to provide clear, actionable advice to farmers based on their queries.
CRITICAL RULES:
1. NEVER respond with a huge block of paragraph text.
2. ALWAYS format your response as a numbered step-by-step guide (Step 1, Step 2, etc.).
3. Keep each step concise and actionable.
4. Speak in the language requested by the user. If they speak in a regional language, respond in that exact same language.
5. If the query is unclear, ask a clarifying question in the same step-by-step format.`;

export async function handleVoiceQuery(req: Request, res: Response) {
  const { query, language, farmerId }: VoiceQueryBody = req.body;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ message: "Query is required" });
  }

  if (!farmerId) {
    return res.status(400).json({ message: "Farmer ID is required to maintain conversation history." });
  }

  // Fallback to "en" if not provided
  const detectedLanguage = language || "en";

  try {
    // Determine the language name for prompting
    const langObj = languages.find(l => l.code === detectedLanguage) || languages[0];
    
    // Fetch previous conversation history for this farmer to provide context
    const history = await storage.getVoiceConversations(farmerId);
    const recentHistory = history.slice(-5); // Keep last 5 for context window limits
    
    let contextStr = "";
    if (recentHistory.length > 0) {
      contextStr = "Previous conversation context:\n";
      recentHistory.forEach(h => {
        contextStr += `User: ${h.query}\nAdvisor: ${h.response}\n\n`;
      });
    }

    const prompt = `${contextStr}Please answer the following query from the farmer in ${langObj.name}:\nQuery: "${query}"\n\nRemember to answer strictly in a step-by-step format (Step 1, Step 2, etc.).`;

    // Call Gemini
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.3,
        }
    });

    const responseText = response.text || "I'm sorry, I couldn't generate a response at this time.";

    // Save to history via storage
    await storage.createVoiceConversation({
      farmerId,
      query,
      response: responseText,
      language: detectedLanguage
    });

    return res.json({
      response: responseText,
      language: detectedLanguage,
      detected_language: detectedLanguage,
    });
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    
    // Check if it's an API key error
    if (error.message?.includes('API key') || !process.env.GEMINI_API_KEY) {
      const fallbackMsg = "Step 1\nPlease configure the GEMINI_API_KEY environment variable.\nStep 2\nRestart the server to enable intelligent voice assistance.";
      
      await storage.createVoiceConversation({
        farmerId,
        query,
        response: fallbackMsg,
        language: detectedLanguage
      });

      return res.json({
        response: fallbackMsg,
        language: detectedLanguage,
        detected_language: detectedLanguage,
      });
    }

    return res.status(500).json({ message: "Error generating response from AI." });
  }
}

export async function handleGetConversations(req: Request, res: Response) {
  const { farmerId } = req.query;
  if (!farmerId || typeof farmerId !== 'string') {
    return res.status(400).json({ message: "Farmer ID is required" });
  }

  try {
    const conversations = await storage.getVoiceConversations(farmerId);
    return res.json({ conversations });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching conversations" });
  }
}

export async function handleClearConversations(req: Request, res: Response) {
  const { farmerId } = req.query;
  if (!farmerId || typeof farmerId !== 'string') {
    return res.status(400).json({ message: "Farmer ID is required" });
  }

  try {
    await storage.clearVoiceConversations(farmerId);
    return res.json({ message: "Conversation history cleared successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: `Error clearing conversations: ${error.message}` });
  }
}