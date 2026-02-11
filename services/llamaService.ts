/**
 * Llama 3.2 AI Service
 * 
 * Connects to your locally hosted Llama 3.2 model via an OpenAI-compatible API.
 * Works with: Ollama, vLLM, llama.cpp server, LM Studio, LocalAI, etc.
 * 
 * Configure the base URL and model name via environment variables:
 *   LLAMA_API_URL  - Your API endpoint (default: http://localhost:11434)
 *   LLAMA_MODEL    - Model name (default: llama3.2)
 */

const LLAMA_API_URL = (process.env.LLAMA_API_URL || 'http://localhost:11434').replace(/\/$/, '');
const LLAMA_MODEL = process.env.LLAMA_MODEL || 'llama3.2';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface LlamaCompletionOptions {
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
}

/**
 * Make a chat completion request to the Llama API.
 * Supports both Ollama's native API and OpenAI-compatible endpoints.
 */
async function llamaChat(options: LlamaCompletionOptions): Promise<string> {
    const { messages, temperature = 0.7, max_tokens = 2048 } = options;

    // Try Ollama-style API first (/api/chat), fall back to OpenAI-compatible (/v1/chat/completions)
    const isOllama = LLAMA_API_URL.includes('11434');

    const endpoint = isOllama
        ? `${LLAMA_API_URL}/api/chat`
        : `${LLAMA_API_URL}/v1/chat/completions`;

    const body = isOllama
        ? {
            model: LLAMA_MODEL,
            messages,
            stream: false,
            options: { temperature, num_predict: max_tokens }
        }
        : {
            model: LLAMA_MODEL,
            messages,
            temperature,
            max_tokens,
            stream: false
        };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // If an API key is set (for remote/authenticated endpoints), include it
    const apiKey = process.env.LLAMA_API_KEY;
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Llama API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Handle both Ollama and OpenAI response formats
    if (data.message?.content) {
        return data.message.content; // Ollama format
    }
    if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content; // OpenAI format
    }

    throw new Error('Unexpected API response format');
}

export class AIService {

    async getCodeExplanation(code: string, language: string): Promise<string> {
        return llamaChat({
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert programming tutor. Explain code clearly and concisely for learners. Use simple language and focus on key concepts.'
                },
                {
                    role: 'user',
                    content: `Explain this ${language} code for a learner. Keep it concise and conceptual:\n\n\`\`\`${language}\n${code}\n\`\`\``
                }
            ],
            temperature: 0.5,
        });
    }

    async getHint(code: string, error: string): Promise<string> {
        return llamaChat({
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful programming tutor. Provide hints to guide students to solutions without giving the full answer. Be encouraging.'
                },
                {
                    role: 'user',
                    content: `The student is getting this error: "${error}" in their code.\nCode:\n${code}\n\nProvide a helpful HINT only. Do NOT provide the full corrected code. Guide them to the solution.`
                }
            ],
            temperature: 0.6,
        });
    }

    async getLearningRecommendation(xp: number, completedTopics: string[]): Promise<string> {
        return llamaChat({
            messages: [
                {
                    role: 'system',
                    content: 'You are an AI learning advisor. Suggest relevant and progressively challenging topics based on the learner\'s progress.'
                },
                {
                    role: 'user',
                    content: `Based on a student with ${xp} XP who has finished these topics: [${completedTopics.join(', ')}], suggest the next 3 advanced AI concepts they should explore. Output as a short numbered list.`
                }
            ],
            temperature: 0.7,
        });
    }

    async analyzeSubmission(code: string): Promise<{ readability: number; efficiency: number; explanation: string }> {
        const response = await llamaChat({
            messages: [
                {
                    role: 'system',
                    content: 'You are a code review expert. Analyze code and return your assessment as a JSON object with these exact fields: readability (0-100), efficiency (0-100), explanation (string). Return ONLY valid JSON, no markdown.'
                },
                {
                    role: 'user',
                    content: `Analyze the following code for complexity and best practices. Return a JSON object with scores (0-100):\n\n${code}`
                }
            ],
            temperature: 0.3,
        });

        try {
            // Try to extract JSON from the response (handle any surrounding text)
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return JSON.parse(response);
        } catch {
            return { readability: 0, efficiency: 0, explanation: 'Could not parse AI response.' };
        }
    }

    /**
     * General-purpose chat with conversation history.
     * Used by the Chatbot view for multi-turn conversations.
     */
    async chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
        const chatMessages: ChatMessage[] = [];

        if (systemPrompt) {
            chatMessages.push({ role: 'system', content: systemPrompt });
        }

        chatMessages.push(...messages);

        return llamaChat({
            messages: chatMessages,
            temperature: 0.7,
        });
    }
}

export const aiService = new AIService();
