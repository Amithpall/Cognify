import React, { useState, useRef, useEffect, useCallback } from 'react';
import { aiService } from '../services/llamaService';
import * as api from '../services/apiService';
import { progressService } from '../services/progressService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  persona?: string;
  personaColor?: string;
}

interface ConversationSession {
  id: string;
  preview: string;
  date: string;
  messageCount: number;
  startTime: string;
  endTime: string;
}

// AI Personas for group chat
const PERSONAS = [
  { name: 'Socrates', icon: 'fa-scroll', color: 'from-amber-500 to-orange-600', textColor: 'text-amber-400', prompt: 'You are Socrates, the ancient Greek philosopher. Teach through asking probing questions. Use the Socratic method. Be brief but thought-provoking.' },
  { name: 'Ada', icon: 'fa-microchip', color: 'from-pink-500 to-rose-600', textColor: 'text-pink-400', prompt: 'You are Ada Lovelace, the first computer programmer. Explain things with precision and elegance. Focus on patterns and algorithms. Be concise.' },
  { name: 'Newton', icon: 'fa-apple-alt', color: 'from-emerald-500 to-green-600', textColor: 'text-emerald-400', prompt: 'You are Isaac Newton. Explain using first principles and scientific reasoning. Draw analogies to physics. Be methodical and brief.' },
  { name: 'Turing', icon: 'fa-cogs', color: 'from-blue-500 to-cyan-600', textColor: 'text-blue-400', prompt: 'You are Alan Turing. Focus on computation, logic, and problem-solving. Think about edge cases. Be analytical and concise.' },
];

const TUTOR_PROMPT = "You are a senior AI Learning Tutor at Cognify. Explain complex AI concepts simply, use analogies, and encourage students. Be concise but thorough.";

const ChatbotView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', text: 'Hello! I\'m your AI Learning Tutor powered by Kimi K2.5. Ask me anything about Machine Learning, Neural Networks, or help with your roadmap.' }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [groupChatMode, setGroupChatMode] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      const userId = progressService.getDbUserId();
      if (!userId) return;
      try {
        const history = await api.getChatHistory(userId, 50);
        if (history.length > 0) {
          const formatted: Message[] = history.map((m: any, i: number) => ({
            id: `db-${m.id || i}`,
            role: m.role as 'user' | 'assistant',
            text: m.content
          }));
          setMessages(formatted);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    loadHistory();
  }, []);

  // Load conversation sessions for sidebar
  const loadSessions = useCallback(async () => {
    const userId = progressService.getDbUserId();
    if (!userId) return;
    setLoadingSessions(true);
    try {
      const data = await api.getConversationSessions(userId);
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (sidebarOpen) loadSessions();
  }, [sidebarOpen, loadSessions]);

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // ── Speech Recognition (fixed: only use final results, auto-populate input) ──
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Google Chrome.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          } else {
            interim += result[0].transcript;
          }
        }
        // Show final + interim in input
        setInput((finalTranscript + interim).trim());
      };

      recognition.onend = () => {
        setIsListening(false);
        // Focus the input so user can see their transcription and send
        if (finalTranscript.trim()) {
          setInput(finalTranscript.trim());
          inputRef.current?.focus();
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access in your browser settings.');
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      alert('Failed to start speech recognition. Make sure you\'re using Chrome and have microphone access.');
    }
  };

  // ── Speech Synthesis ──
  const toggleSpeak = (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setSpeakingMsgId(msgId);
  };

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  // ── Send Message ──
  const sendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    // Stop mic if still listening
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMsg = input.trim();
    setInput('');
    setIsGenerating(true);

    const userId = progressService.getDbUserId();
    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: userMsg };

    if (groupChatMode) {
      // Group chat: get responses from all personas
      setMessages(prev => [...prev, userMessage]);
      if (userId) {
        api.saveMessage({ user_id: userId, role: 'user', content: userMsg }).catch(console.error);
      }

      for (const persona of PERSONAS) {
        const placeholderId = `${persona.name}-${Date.now()}`;
        const placeholder: Message = {
          id: placeholderId,
          role: 'assistant',
          text: '',
          persona: persona.name,
          personaColor: persona.textColor,
        };
        setMessages(prev => [...prev, placeholder]);

        try {
          const chatHistory = [{ role: 'user' as const, content: userMsg }];
          let fullResponse = '';

          await aiService.chatStream(
            chatHistory,
            (accumulated) => {
              fullResponse = accumulated;
              setMessages(prev => {
                const updated = [...prev];
                const idx = updated.findIndex(m => m.id === placeholderId);
                if (idx >= 0) updated[idx] = { ...updated[idx], text: accumulated };
                return updated;
              });
            },
            persona.prompt
          );

          if (userId && fullResponse) {
            api.saveMessage({ user_id: userId, role: 'assistant', content: `[${persona.name}] ${fullResponse}` }).catch(console.error);
          }
        } catch (err) {
          console.error(`${persona.name} error:`, err);
          setMessages(prev => {
            const updated = [...prev];
            const idx = updated.findIndex(m => m.id === placeholderId);
            if (idx >= 0) updated[idx] = { ...updated[idx], text: `${persona.name} is unavailable right now.` };
            return updated;
          });
        }
      }
    } else {
      // Normal single-tutor mode
      const assistantPlaceholder: Message = { id: `asst-${Date.now()}`, role: 'assistant', text: '' };
      setMessages(prev => [...prev, userMessage, assistantPlaceholder]);

      if (userId) {
        api.saveMessage({ user_id: userId, role: 'user', content: userMsg }).catch(console.error);
      }

      try {
        const chatHistory = [...messages, userMessage].map(m => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.text
        }));

        let fullResponse = '';

        await aiService.chatStream(
          chatHistory,
          (accumulated) => {
            fullResponse = accumulated;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { ...updated[updated.length - 1], text: accumulated };
              return updated;
            });
          },
          TUTOR_PROMPT
        );

        if (userId && fullResponse) {
          api.saveMessage({ user_id: userId, role: 'assistant', content: fullResponse }).catch(console.error);
        }
      } catch (err) {
        console.error('Chat error:', err);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            text: 'Connection error. Make sure your AI server is running.'
          };
          return updated;
        });
      }
    }
    setIsGenerating(false);
  };

  // ── New Chat ──
  const handleNewChat = () => {
    setMessages([
      { id: `new-${Date.now()}`, role: 'assistant', text: 'Starting a new conversation. How can I help you today?' }
    ]);
    setActiveSessionId(null);
    setInput('');
    inputRef.current?.focus();
  };

  // ── Clear Chat ──
  const handleClearChat = async () => {
    if (confirm('Clear all chat history? This cannot be undone.')) {
      const userId = progressService.getDbUserId();
      if (userId) {
        try { await api.clearChat(userId); } catch (err) { console.error('Failed to clear chat:', err); }
      }
      setMessages([{ id: 'cleared', role: 'assistant', text: 'Chat cleared. How can I help you now?' }]);
      setSessions([]);
      setActiveSessionId(null);
    }
  };

  // ── Load Session ──
  const loadSession = async (session: ConversationSession) => {
    const userId = progressService.getDbUserId();
    if (!userId) return;
    try {
      const history = await api.getChatSessionMessages(userId, session.startTime, session.endTime);
      if (history.length > 0) {
        setMessages(history.map((m: any, i: number) => ({
          id: `sess-${m.id || i}`,
          role: m.role as 'user' | 'assistant',
          text: m.content,
        })));
        setActiveSessionId(session.id);
      }
      setSidebarOpen(false);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  return (
    <div className="h-full flex relative">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Minimal Top Bar */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 online-pulse"></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Tutor</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 font-semibold">Kimi K2.5</span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* New Chat */}
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/50 transition-all hover:border-indigo-500/30"
              title="New Conversation"
            >
              <i className="fas fa-plus text-[10px]"></i>
              <span className="hidden sm:inline">New</span>
            </button>
            {/* Group Chat Toggle */}
            <button
              onClick={() => setGroupChatMode(!groupChatMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${groupChatMode
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/50'
                }`}
              title="Toggle Group Chat"
            >
              <i className="fas fa-users text-[10px]"></i>
              <span className="hidden sm:inline">Panel</span>
            </button>
            <button
              onClick={handleClearChat}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors p-1.5"
              title="Clear All History"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-1.5 rounded-lg text-xs transition-all ${sidebarOpen ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-500 hover:text-white'}`}
              title="Conversation History"
            >
              <i className="fas fa-history"></i>
            </button>
          </div>
        </div>

        {/* Group Chat Persona Indicators */}
        {groupChatMode && (
          <div className="px-4 py-2 border-b border-slate-800/30 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">Panel:</span>
            {PERSONAS.map(p => (
              <div key={p.name} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${p.color} bg-opacity-10 border border-white/10`}>
                <i className={`fas ${p.icon} text-white text-[9px]`}></i>
                <span className="text-[10px] font-bold text-white">{p.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 sidebar-scroll">
          {messages.map((m, i) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
              <div className={`max-w-[85%] md:max-w-[75%] relative group`}>
                {/* Persona label for group chat */}
                {m.persona && (
                  <div className="flex items-center gap-1.5 mb-1">
                    {(() => {
                      const p = PERSONAS.find(p => p.name === m.persona);
                      return p ? (
                        <>
                          <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${p.color} flex items-center justify-center`}>
                            <i className={`fas ${p.icon} text-white text-[8px]`}></i>
                          </div>
                          <span className={`text-xs font-bold ${p.textColor}`}>{p.name}</span>
                        </>
                      ) : null;
                    })()}
                  </div>
                )}

                <div className={`rounded-2xl px-4 py-3 ${m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-slate-800/60 text-slate-200 rounded-bl-sm border border-slate-700/50'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {m.text || '\u00A0'}
                    {isGenerating && i === messages.length - 1 && m.role === 'assistant' && !m.text && (
                      <span className="inline-flex gap-1 ml-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                    )}
                    {isGenerating && m.role === 'assistant' && m.text && i >= messages.length - (groupChatMode ? PERSONAS.length : 1) && (
                      <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 rounded-sm align-text-bottom animate-pulse"></span>
                    )}
                  </p>
                </div>

                {/* Speaker button on AI messages */}
                {m.role === 'assistant' && m.text && !isGenerating && (
                  <button
                    onClick={() => toggleSpeak(m.id, m.text)}
                    className={`absolute -bottom-1 ${m.persona ? 'left-7' : 'left-2'} opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-[10px] ${speakingMsgId === m.id
                        ? 'text-indigo-400 bg-indigo-500/10'
                        : 'text-slate-500 hover:text-white bg-slate-800/80'
                      }`}
                    title={speakingMsgId === m.id ? 'Stop speaking' : 'Read aloud'}
                  >
                    <i className={`fas ${speakingMsgId === m.id ? 'fa-pause' : 'fa-volume-up'}`}></i>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 md:p-4 border-t border-slate-800/50">
          <div className="relative flex items-center gap-2">
            {/* Mic Button */}
            <button
              onClick={toggleListening}
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isListening
                  ? 'bg-red-500 text-white mic-recording shadow-lg shadow-red-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              title={isListening ? 'Stop recording' : 'Voice input (requires Chrome)'}
            >
              <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'} text-sm`}></i>
            </button>

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={isListening ? 'Listening... speak now' : groupChatMode ? 'Ask the panel of experts...' : 'Ask anything...'}
                disabled={isGenerating}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 pr-12 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all placeholder:text-slate-500 disabled:opacity-40"
              />
              <button
                onClick={sendMessage}
                disabled={isGenerating || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40"
              >
                <i className={`fas ${isGenerating ? 'fa-circle-notch animate-spin' : 'fa-paper-plane'} text-xs`}></i>
              </button>
            </div>
          </div>
          {isListening && (
            <div className="mt-2 flex items-center gap-2 text-xs text-red-400 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              Recording — click Stop or press Enter to send
            </div>
          )}
        </div>
      </div>

      {/* Conversation Sidebar (Right) */}
      <div className={`absolute md:relative right-0 top-0 h-full z-20 transition-all duration-300 ${sidebarOpen ? 'w-72 md:w-64' : 'w-0'
        } overflow-hidden`}>
        <div className="w-72 md:w-64 h-full bg-slate-900/95 md:bg-slate-900/60 backdrop-blur-md border-l border-slate-800/50 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">History</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewChat}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
                title="New Chat"
              >
                <i className="fas fa-plus text-xs"></i>
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-slate-500 hover:text-white transition-colors md:hidden"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto sidebar-scroll p-2 space-y-1">
            {loadingSessions ? (
              <div className="text-center py-8">
                <i className="fas fa-circle-notch animate-spin text-slate-500"></i>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-comments text-2xl text-slate-700 mb-2 block"></i>
                <p className="text-xs text-slate-500">No past conversations</p>
                <p className="text-[10px] text-slate-600 mt-1">Start chatting to see history here</p>
              </div>
            ) : (
              sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => loadSession(session)}
                  className={`w-full text-left p-3 rounded-xl transition-all group ${activeSessionId === session.id
                      ? 'bg-indigo-600/10 border border-indigo-500/30'
                      : 'hover:bg-slate-800/50'
                    }`}
                >
                  <p className="text-xs font-semibold text-slate-300 truncate group-hover:text-white transition-colors">
                    {session.preview}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-500">{session.date}</span>
                    <span className="text-[10px] text-slate-600">•</span>
                    <span className="text-[10px] text-slate-500">{session.messageCount} msgs</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default ChatbotView;
