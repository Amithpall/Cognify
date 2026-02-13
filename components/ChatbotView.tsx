
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { aiService } from '../services/llamaService';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const SYSTEM_PROMPT = "You are a senior AI Learning Tutor at Cognify. Explain complex AI concepts simply, use analogies, and encourage students. Be concise but thorough.";

const ChatbotView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hello! I am your AI Learning Tutor powered by Kimi K2.5. Ask me anything about Machine Learning, Neural Networks, or help with your roadmap.' }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on every message update
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    const userMsg = input.trim();
    setInput('');
    setIsGenerating(true);

    // Add user message + empty assistant placeholder
    const userMessage: Message = { role: 'user', text: userMsg };
    const assistantPlaceholder: Message = { role: 'assistant', text: '' };

    setMessages(prev => [...prev, userMessage, assistantPlaceholder]);

    try {
      const chatHistory = [...messages, userMessage].map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text
      }));

      // Stream tokens directly — each onToken call updates the message INSTANTLY
      await aiService.chatStream(
        chatHistory,
        (accumulated) => {
          // Update the last message with accumulated text — zero delay
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', text: accumulated };
            return updated;
          });
        },
        SYSTEM_PROMPT
      );
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          text: 'Connection error. Make sure your AI server is running.'
        };
        return updated;
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
              <i className="fas fa-robot text-white"></i>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Cognify</h3>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Online • Ready to help</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 font-semibold">Kimi K2.5</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${m.role === 'user'
              ? 'bg-indigo-600 text-white rounded-br-none'
              : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
              }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {m.text || '\u00A0'}
                {/* Blinking cursor on the streaming message */}
                {isGenerating && i === messages.length - 1 && m.role === 'assistant' && (
                  <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 rounded-sm align-text-bottom animate-pulse"></span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask a question about AI..."
            disabled={isGenerating}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-6 py-4 pr-16 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all placeholder:text-slate-500 disabled:opacity-40"
          />
          <button
            onClick={sendMessage}
            disabled={isGenerating}
            className="absolute right-3 top-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white w-10 h-10 rounded-lg flex items-center justify-center transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <i className="fas fa-paper-plane text-xs"></i>
          </button>
        </div>
        <p className="text-[10px] text-center mt-3 text-slate-500">
          Powered by Kimi K2.5 • AI-powered learning
        </p>
      </div>
    </div>
  );
};

export default ChatbotView;
