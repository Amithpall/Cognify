
import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

export class AIService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: API_KEY! });
  }

  async getCodeExplanation(code: string, language: string) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Explain this ${language} code for a learner. Keep it concise and conceptual: \n\n \`\`\`${language}\n${code}\n\`\`\``,
    });
    return response.text;
  }

  async getHint(code: string, error: string) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The student is getting this error: "${error}" in their code. \nCode: \n${code}\n Provide a helpful HINT only. Do NOT provide the full corrected code. Guide them to the solution.`,
    });
    return response.text;
  }

  async getLearningRecommendation(xp: number, completedTopics: string[]) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on a student with ${xp} XP who has finished these topics: [${completedTopics.join(', ')}], suggest the next 3 advanced AI concepts they should explore. Output as a short list.`,
    });
    return response.text;
  }

  async analyzeSubmission(code: string) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following code for complexity and best practices. Return a JSON object with scores (0-100).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            readability: { type: Type.NUMBER },
            efficiency: { type: Type.NUMBER },
            explanation: { type: Type.STRING }
          },
          required: ["readability", "efficiency", "explanation"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  }
}

export const aiService = new AIService();
