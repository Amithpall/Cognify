/**
 * AI Service — True Token-by-Token Streaming
 *
 * Two modes:
 *   1) /llm-api  → FastAPI server (for JSON-parsed responses like roadmap, quiz)
 *   2) /ollama-stream → Ollama directly with stream:true (for real-time text)
 *   3) OpenRouter → For free tier models (Arcee AI Trinity, GPT-5 Nano, Gemini Flash)
 *
 * Config via .env.local: 
 *   - LLAMA_MODEL: Primary model (Ollama/vLLM)
 *   - LLAMA_API_KEY: API key for Ollama server
 *   - VITE_LLM_API_KEY: OpenRouter API key
 *   - VITE_LLM_MODELS: Comma-separated list of fallback models (OpenRouter)
 * 
 * Model Switching: Supports fallback between multiple models
 * - Primary: Kimi K2.5 Cloud (Ollama/vLLM)
 * - Fallbacks: Arcee AI Trinity, GPT-5 Nano, Gemini Flash (OpenRouter)
 */

// Model configurations - can be overridden via env variables
const getModelConfig = () => {
    const fallbackModels = (import.meta.env.VITE_LLM_MODELS || 'arcee-ai/trinity-large-preview:free,openai/gpt-5-nano,google/gemini-2.0-flash-preview-0514').split(',');
    return {
        primary: import.meta.env.LLAMA_MODEL || 'kimi-k2.5:cloud',
        fallbacks: fallbackModels,
        // Combined list for roadmaps/chat - primary first, then fallbacks
        roadmaps: [import.meta.env.LLAMA_MODEL || 'kimi-k2.5:cloud', ...fallbackModels],
        chatbot: [import.meta.env.LLAMA_MODEL || 'kimi-k2.5:cloud', ...fallbackModels],
        code: [import.meta.env.LLAMA_MODEL || 'kimi-k2.5:cloud', ...fallbackModels],
    };
};

const LLAMA_MODEL = import.meta.env.LLAMA_MODEL || 'kimi-k2.5:cloud';
const PROXY_ENDPOINT = '/llm-api';           // FastAPI (non-streaming)
const STREAM_ENDPOINT = '/ollama-stream';     // Ollama direct (streaming)

// OpenRouter configuration
const OPENROUTER_API_KEY = import.meta.env.VITE_LLM_API_KEY;
const OPENROUTER_BASE_URL = import.meta.env.VITE_LLM_BASE_URL || 'https://openrouter.ai/api/v1';

// Check if a model is an OpenRouter model (uses / in name like 'arcee-ai/trinity-large-preview:free')
function isOpenRouterModel(model: string): boolean {
    return model.includes('/');
}

// Call OpenRouter API
async function callOpenRouter(
    messages: ChatMessage[],
    model: string,
    options: { temperature?: number; max_tokens?: number; stream?: boolean } = {}
): Promise<{ text: string; stream?: AsyncGenerator<string> }> {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API key not configured');
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Cognify',
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.max_tokens ?? 4096,
            stream: options.stream ?? false,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${error}`);
    }

    if (options.stream) {
        // Return a streaming response
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        const generator = async function* () {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim() || !line.startsWith('data: ')) continue;
                    if (line.includes('[DONE]')) continue;

                    try {
                        const data = JSON.parse(line.slice(6));
                        const content = data.choices?.[0]?.delta?.content || '';
                        if (content) yield content;
                    } catch { }
                }
            }
        };

        // For streaming, return accumulated text and stream
        let accumulated = '';
        const streamWrapper = async function* () {
            for await (const chunk of generator()) {
                accumulated += chunk;
                yield chunk;
            }
        };
        return { text: '', stream: streamWrapper() };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    return { text };
}

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface LlamaCompletionOptions {
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
}

function messagesToPrompt(messages: ChatMessage[]): string {
    return messages.map(m => {
        if (m.role === 'system') return `[System Instructions]\n${m.content}\n`;
        if (m.role === 'user') return `[User]\n${m.content}\n`;
        return `[Assistant]\n${m.content}\n`;
    }).join('\n') + '\n[Assistant]\n';
}

// Try multiple models with fallback - tries Ollama first, then OpenRouter
async function tryModels(
    models: string[],
    fn: (model: string) => Promise<string>
): Promise<string> {
    let lastError: Error | null = null;

    for (const model of models) {
        try {
            console.log(`[AI] Trying model: ${model}`);
            return await fn(model);
        } catch (err) {
            console.warn(`[AI] Model ${model} failed:`, err);
            lastError = err as Error;
        }
    }

    throw new Error(`All models failed. Last error: ${lastError?.message}`);
}

// Wrapper for calling AI - decides whether to use Ollama or OpenRouter based on model
async function callAI(
    messages: ChatMessage[],
    model: string,
    options: { temperature?: number; max_tokens?: number } = {}
): Promise<string> {
    if (isOpenRouterModel(model)) {
        // Use OpenRouter
        const result = await callOpenRouter(messages, model, options);
        return result.text;
    } else {
        // Use Ollama/vLLM
        return llamaChat({ messages, ...options }, model);
    }
}

// ════════════════════════════════════════════
//  NON-STREAMING: full response at once
//  Used for: roadmap, quiz, subtopics (need JSON parsing)
// ════════════════════════════════════════════

async function llamaChat(options: LlamaCompletionOptions, model?: string): Promise<string> {
    const prompt = messagesToPrompt(options.messages);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = process.env.LLAMA_API_KEY;
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const modelToUse = model || LLAMA_MODEL;
    console.log(`[AI] Non-stream request to ${PROXY_ENDPOINT} (model: ${modelToUse})`);

    const response = await fetch(PROXY_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            prompt,
            model: modelToUse
        }),
    });

    if (!response.ok) {
        throw new Error(`AI API error (${response.status}): ${await response.text()}`);
    }

    const ct = response.headers.get('content-type') || '';
    if (ct.includes('text/plain')) return await response.text();

    const data = await response.json();
    if (data.response) return data.response;
    if (data.message?.content) return data.message.content;
    if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
    throw new Error('Unexpected response format');
}

// ════════════════════════════════════════════
//  TRUE STREAMING: token-by-token from Ollama
//  Calls /ollama-stream → Ollama /api/generate with stream:true
//  Reads NDJSON lines and fires onToken for each token instantly
// ════════════════════════════════════════════

async function llamaChatStream(
    options: LlamaCompletionOptions,
    onToken: (accumulated: string) => void,
    model?: string
): Promise<string> {
    const prompt = messagesToPrompt(options.messages);
    const modelToUse = model || LLAMA_MODEL;

    console.log(`[AI] Streaming request to ${STREAM_ENDPOINT} (model: ${modelToUse})`);

    const response = await fetch(STREAM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelToUse,
            prompt: prompt,
            stream: true,
        }),
    });

    if (!response.ok) {
        // Fallback: if Ollama direct fails, try FastAPI non-streaming
        console.warn('[AI] Streaming failed, falling back to non-streaming');
        const text = await llamaChat(options);
        onToken(text);
        return text;
    }

    const reader = response.body?.getReader();
    if (!reader) {
        const text = await response.text();
        onToken(text);
        return text;
    }

    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Ollama sends NDJSON: one JSON object per line
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep incomplete last line

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const data = JSON.parse(line);
                if (data.response) {
                    accumulated += data.response;
                    onToken(accumulated);  // INSTANT — no delay
                }
                if (data.done) break;
            } catch {
                // If it's not JSON, treat as plain text
                accumulated += line;
                onToken(accumulated);
            }
        }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
        try {
            const data = JSON.parse(buffer);
            if (data.response) {
                accumulated += data.response;
                onToken(accumulated);
            }
        } catch {
            accumulated += buffer;
            onToken(accumulated);
        }
    }

    return accumulated;
}

// ════════════════════════════════════════════
//  AIService Class
// ════════════════════════════════════════════

export class AIService {

    async getCodeExplanation(code: string, language: string): Promise<string> {
        return llamaChat({
            messages: [
                { role: 'system', content: 'You are an expert programming tutor. Explain code clearly and concisely.' },
                { role: 'user', content: `Explain this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`` }
            ],
            temperature: 0.5,
        });
    }

    async getHint(code: string, error: string): Promise<string> {
        return llamaChat({
            messages: [
                { role: 'system', content: 'Provide hints without giving full answers. Be encouraging.' },
                { role: 'user', content: `Error: "${error}"\nCode:\n${code}\n\nProvide a hint only.` }
            ],
            temperature: 0.6,
        });
    }

    async getLearningRecommendation(xp: number, completedTopics: string[]): Promise<string> {
        return llamaChat({
            messages: [
                { role: 'system', content: 'You are an AI learning advisor.' },
                { role: 'user', content: `Student has ${xp} XP, finished: [${completedTopics.join(', ')}]. Suggest 3 next topics.` }
            ],
            temperature: 0.7,
        });
    }

    async analyzeSubmission(code: string): Promise<{ readability: number; efficiency: number; explanation: string }> {
        const response = await llamaChat({
            messages: [
                { role: 'system', content: 'Return a JSON object: { readability: 0-100, efficiency: 0-100, explanation: "..." }. ONLY valid JSON.' },
                { role: 'user', content: `Analyze:\n\n${code}` }
            ],
            temperature: 0.3,
        });
        try {
            const m = response.match(/\{[\s\S]*\}/);
            return JSON.parse(m ? m[0] : response);
        } catch {
            return { readability: 0, efficiency: 0, explanation: 'Could not parse AI response.' };
        }
    }

    // ── Chat (non-streaming) ──
    async chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
        const all: ChatMessage[] = [];
        if (systemPrompt) all.push({ role: 'system', content: systemPrompt });
        all.push(...messages);

        // Try multiple models with fallback - uses callAI which handles both Ollama and OpenRouter
        return tryModels(
            getModelConfig().chatbot,
            async (model) => callAI(all, model, { temperature: 0.7 })
        );
    }

    // ── Chat (TRUE streaming — token by token) ──
    async chatStream(messages: ChatMessage[], onToken: (text: string) => void, systemPrompt?: string): Promise<string> {
        const all: ChatMessage[] = [];
        if (systemPrompt) all.push({ role: 'system', content: systemPrompt });
        all.push(...messages);

        // For streaming, try models sequentially - if one fails, try the next
        let lastError: Error | null = null;
        for (const model of getModelConfig().chatbot) {
            try {
                console.log(`[AI] Chat streaming with model: ${model}`);
                if (isOpenRouterModel(model)) {
                    // Use OpenRouter streaming
                    const result = await callOpenRouter(all, model, { temperature: 0.7, stream: true });
                    if (result.stream) {
                        for await (const chunk of result.stream) {
                            onToken(chunk);
                        }
                        return '';
                    }
                } else {
                    // Use Ollama streaming
                    return await llamaChatStream({ messages: all, temperature: 0.7 }, onToken, model);
                }
            } catch (err) {
                console.warn(`[AI] Chat streaming model ${model} failed:`, err);
                lastError = err as Error;
            }
        }
        throw new Error(`All streaming models failed: ${lastError?.message}`);
    }

    // ── Roadmap (needs JSON parsing → non-streaming) ──
    async generateRoadmap(topic: string): Promise<Array<{ title: string; description: string; xpReward: number }>> {
        // Try multiple models with fallback - uses callAI which handles both Ollama and OpenRouter
        const response = await tryModels(
            getModelConfig().roadmaps,
            async (model) => callAI(
                [
                    { role: 'system', content: 'You are an expert curriculum designer. Return ONLY a valid JSON array, no markdown.' },
                    { role: 'user', content: `Create a 6-level roadmap for "${topic}" (beginner→advanced). JSON: [{"title":"...","description":"...","xpReward":100}]. XP: 100, +50/level. ONLY JSON.` }
                ],
                model,
                { temperature: 0.7, max_tokens: 2048 }
            )
        );
        try {
            const m = response.match(/\[[\s\S]*\]/);
            return JSON.parse(m ? m[0] : response);
        } catch {
            console.error('Failed to parse roadmap:', response);
            throw new Error('Failed to generate roadmap.');
        }
    }

    // ── Level Content (streaming) ──
    async generateLevelContent(topic: string, levelTitle: string, levelDescription: string): Promise<string> {
        return llamaChat({
            messages: [
                { role: 'system', content: 'Write educational content with markdown (##, bullets, bold, code). 300-500 words with examples.' },
                { role: 'user', content: `Theory for "${levelTitle}" (topic: "${topic}"). Context: ${levelDescription}. Include: explanation, key points, example, fun fact.` }
            ],
            temperature: 0.6,
            max_tokens: 2048,
        });
    }

    async generateLevelContentStream(
        topic: string, levelTitle: string, levelDescription: string,
        onToken: (text: string) => void
    ): Promise<string> {
        return llamaChatStream({
            messages: [
                { role: 'system', content: 'Write educational content with markdown (##, bullets, bold, code). 300-500 words with examples.' },
                { role: 'user', content: `Theory for "${levelTitle}" (topic: "${topic}"). Context: ${levelDescription}. Include: explanation, key points, example, fun fact.` }
            ],
            temperature: 0.6,
            max_tokens: 2048,
        }, onToken);
    }

    // ── Quiz (needs JSON → non-streaming) ──
    async generateQuiz(topic: string, levelTitle: string): Promise<Array<{ question: string; options: string[]; correctIndex: number; explanation: string }>> {
        const response = await llamaChat({
            messages: [
                { role: 'system', content: 'Generate quiz questions. Return ONLY a valid JSON array.' },
                { role: 'user', content: `5 quiz questions about "${levelTitle}" (topic: "${topic}"). JSON: [{"question":"...","options":["a","b","c","d"],"correctIndex":0,"explanation":"..."}]. ONLY JSON.` }
            ],
            temperature: 0.5,
            max_tokens: 2048,
        });
        try {
            const m = response.match(/\[[\s\S]*\]/);
            return JSON.parse(m ? m[0] : response);
        } catch {
            console.error('Failed to parse quiz:', response);
            throw new Error('Failed to generate quiz.');
        }
    }

    // ── Subtopics (needs JSON → non-streaming) ──
    async generateSubtopics(topic: string, levelTitle: string, levelDescription: string): Promise<Array<{ title: string; description: string }>> {
        const response = await llamaChat({
            messages: [
                { role: 'system', content: 'Break down a topic into subtopics. Return ONLY a valid JSON array.' },
                { role: 'user', content: `Break "${levelTitle}" (course: "${topic}") into 4-6 subtopics. Context: ${levelDescription}. JSON: [{"title":"...","description":"..."}]. ONLY JSON.` }
            ],
            temperature: 0.6,
            max_tokens: 1024,
        });
        try {
            const m = response.match(/\[[\s\S]*\]/);
            return JSON.parse(m ? m[0] : response);
        } catch {
            console.error('Failed to parse subtopics:', response);
            throw new Error('Failed to generate subtopics.');
        }
    }

    // ── Subtopic Content (streaming) ──
    async generateSubtopicContent(topic: string, levelTitle: string, subtopicTitle: string, subtopicDescription: string): Promise<string> {
        return llamaChat({
            messages: [
                { role: 'system', content: 'Write detailed educational content with markdown. 400-600 words with examples.' },
                { role: 'user', content: `Content for "${subtopicTitle}" (level: "${levelTitle}", course: "${topic}"). Context: ${subtopicDescription}.` }
            ],
            temperature: 0.6,
            max_tokens: 2048,
        });
    }

    async generateSubtopicContentStream(
        topic: string, levelTitle: string, subtopicTitle: string, subtopicDescription: string,
        onToken: (text: string) => void
    ): Promise<string> {
        return llamaChatStream({
            messages: [
                { role: 'system', content: 'Write detailed educational content with markdown. 400-600 words with examples.' },
                { role: 'user', content: `Content for "${subtopicTitle}" (level: "${levelTitle}", course: "${topic}"). Context: ${subtopicDescription}.` }
            ],
            temperature: 0.6,
            max_tokens: 2048,
        }, onToken);
    }

    // ── Code Generation (streaming) ──
    async generateCode(
        prompt: string,
        language: string,
        onToken: (text: string) => void
    ): Promise<string> {
        return llamaChatStream({
            messages: [
                {
                    role: 'system',
                    content: `You are an expert ${language} programmer. Generate clean, well-commented, production-quality code. Return ONLY the code — no explanations, no markdown fences, no extra text. The code should be complete and runnable.`
                },
                {
                    role: 'user',
                    content: `Write ${language} code for: ${prompt}`
                }
            ],
            temperature: 0.4,
            max_tokens: 4096,
        }, onToken);
    }

    // ── Detailed Code Insights (streaming) ──
    async getDetailedInsights(
        code: string,
        language: string,
        onToken: (text: string) => void
    ): Promise<string> {
        return llamaChatStream({
            messages: [
                {
                    role: 'system',
                    content: `You are a senior software engineer and expert code reviewer. Provide a thorough, detailed analysis of the given code. Structure your response with these sections using markdown headers:

## 📋 Overview
Brief summary of what the code does.

## 🔍 Line-by-Line Explanation
Walk through the key parts of the code explaining the logic.

## 📊 Complexity Analysis
- **Time Complexity**: Big-O analysis
- **Space Complexity**: Big-O analysis

## ✅ Strengths
What the code does well (list 2-4 points).

## ⚠️ Issues & Improvements
Bugs, edge cases, or improvements (list 2-4 points with suggested fixes).

## 💡 Best Practices
Relevant best practices for this ${language} code.

## 🎯 Readability Score: X/10
## ⚡ Efficiency Score: X/10

Be specific, reference actual lines/variables, and provide actionable suggestions.`
                },
                {
                    role: 'user',
                    content: `Analyze this ${language} code in complete detail:\n\n\`\`\`${language}\n${code}\n\`\`\``
                }
            ],
            temperature: 0.4,
            max_tokens: 4096,
        }, onToken);
    }
}

export const aiService = new AIService();
