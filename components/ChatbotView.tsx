
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

interface Message {
  role: 'user' | 'model';
  text: string;
}

const ChatbotView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am your AI Learning Tutor. Ask me anything about Machine Learning, Neural Networks, or help with your roadmap.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: {
          systemInstruction: "You are a senior AI Learning Tutor at NexusAI. Explain complex AI concepts simply, use analogies, and encourage students to experiment."
        }
      });

      setMessages(prev => [...prev, { role: 'model', text: response.text || 'Sorry, I hit a snag.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: 'Connection error. Please check your API key environment.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
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
        <button className="text-slate-400 hover:text-white transition-colors">
          <i className="fas fa-cog"></i>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-bl-none px-5 py-3 flex space-x-1 items-center border border-slate-700">
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-75"></div>
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask a question about AI..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-6 py-4 pr-16 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all placeholder:text-slate-500"
          />
          <button 
            onClick={sendMessage}
            className="absolute right-3 top-3 bg-indigo-600 hover:bg-indigo-500 text-white w-10 h-10 rounded-lg flex items-center justify-center transition-all shadow-lg shadow-indigo-600/20"
          >
            <i className="fas fa-paper-plane text-xs"></i>
          </button>
        </div>
        <p className="text-[10px] text-center mt-3 text-slate-500">
          Powered by Gemini 3 Flash • Knowledge up to Sept 2024
        </p>
      </div>
    </div>
  );
};

export default ChatbotView;
