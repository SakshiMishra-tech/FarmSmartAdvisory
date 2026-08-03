import { Request, Response } from "express";
import { storage } from "./storage";
import { GoogleGenAI } from "@google/genai";
import { languages } from "@shared/schema";

// Initialize Gemini client (will use process.env.GEMINI_API_KEY by default)
console.log("Gemini Key Loaded:", !!process.env.GEMINI_API_KEY);
console.log("Gemini Key Prefix:", process.env.GEMINI_API_KEY?.substring(0, 10));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});
type VoiceQueryBody = {
  query: string;
  language?: string;
  farmerId: string;
};

function formatLanguageSteps(text: string, lang: string): string {
  if (!text) return text;
  if (lang === 'hi') {
    return text
      .replace(/\bStep\s*1\b:?/gi, 'पहला चरण:')
      .replace(/\bStep\s*2\b:?/gi, 'दूसरा चरण:')
      .replace(/\bStep\s*3\b:?/gi, 'तीसरा चरण:')
      .replace(/\bStep\s*4\b:?/gi, 'चौथा चरण:')
      .replace(/\bStep\s*5\b:?/gi, 'पांचवां चरण:')
      .replace(/\bStep\s*6\b:?/gi, 'छठा चरण:')
      .replace(/\bStep\s*7\b:?/gi, 'सातवां चरण:')
      .replace(/\bStep\s*8\b:?/gi, 'आठवां चरण:')
      .replace(/\bStep\s*9\b:?/gi, 'नौवां चरण:')
      .replace(/\bStep\s*10\b:?/gi, 'दसवां चरण:')
      .replace(/\bStep\s*(\d+)\b:?/gi, 'चरण $1:');
  }
  if (lang === 'or' || lang === 'od') {
    return text
      .replace(/\bStep\s*1\b:?/gi, 'ପ୍ରଥମ ଚରଣ:')
      .replace(/\bStep\s*2\b:?/gi, 'ଦ୍ୱିତୀୟ ଚରଣ:')
      .replace(/\bStep\s*3\b:?/gi, 'ତୃତୀୟ ଚରଣ:')
      .replace(/\bStep\s*(\d+)\b:?/gi, 'ଚରଣ $1:');
  }
  return text;
}

// System instruction to act as a farming advisor and respond step-by-step
const SYSTEM_INSTRUCTION = `You are a highly knowledgeable farming advisor for FarmWise. 
Your goal is to provide clear, actionable advice to farmers based on their queries.
CRITICAL RULES:
1. NEVER respond with a huge block of paragraph text.
2. ALWAYS format your response as a numbered step-by-step guide.
3. ABSOLUTE LANGUAGE PURITY: You MUST write 100% of your response in the user's requested language.
   - If the user's language is Hindi (hi), format step numbers as "पहला चरण:", "दूसरा चरण:", "तीसरा चरण:" or "चरण 1:", "चरण 2:". NEVER output English words like "Step 1", "Step 2" in a Hindi or regional language response.
   - If the user's language is Odia or another language, use that language's step numbers or standard numerals ("1.", "2."). NEVER mix English words into Hindi/regional responses.
4. Keep each step concise, helpful, and actionable for farmers.
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

    const stepFormatInstruction = (detectedLanguage === 'hi') 
      ? 'Use Hindi step prefixes like "पहला चरण:", "दूसरा चरण:", "तीसरा चरण:". Do NOT use English words like "Step 1".'
      : (detectedLanguage === 'or' || detectedLanguage === 'od')
      ? 'Use Odia step prefixes like "ପ୍ରଥମ ଚରଣ:", "ଦ୍ୱିତୀୟ ଚରଣ:". Do NOT use English words.'
      : 'Use step prefixes like "Step 1:", "Step 2:".';

    const prompt = `${contextStr}Please answer the following farming query strictly in ${langObj.name} (${langObj.native}):\nQuery: "${query}"\n\nInstruction: Answer strictly in a step-by-step format in ${langObj.name}. ${stepFormatInstruction}`;

    // Call Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3,
      }
    });

    let responseText = response.text || "I'm sorry, I couldn't generate a response at this time.";
    responseText = formatLanguageSteps(responseText, detectedLanguage);

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