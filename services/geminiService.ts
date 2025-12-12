import { GoogleGenAI, Type } from "@google/genai";
import { TableGenerationConfig } from "../types";

// Initialize the Gemini AI client
// Note: In a real app, ensure process.env.API_KEY is available.
// Here we assume the user might not have it, so we handle errors gracefully in the UI.
const apiKey = process.env.API_KEY || ''; 
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateCreativeTableNames = async (config: TableGenerationConfig): Promise<string[]> => {
  if (!ai) {
    throw new Error("API Key is missing. Please provide an API Key to use AI features.");
  }

  const prompt = `Generate a list of ${config.count} creative and distinct table names based on the theme: "${config.theme}". 
  Return ONLY the list of names as a JSON array of strings. Do not include numbering.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
             type: Type.STRING
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const names = JSON.parse(text);
    if (Array.isArray(names)) {
        return names.slice(0, config.count);
    }
    return [];

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate names. Please try again.");
  }
};
