
import React, { useState } from 'react';
import { aiService } from '../services/llamaService';

const PlaygroundView: React.FC = () => {
  const [code, setCode] = useState<string>(`# Welcome to Cognify Playground\nimport numpy as np\n\ndef main():\n    print("Hello, AI Architect!")\n\nmain()`);
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const runCode = async () => {
    setIsLoading(true);
    // In a real app, this would send code to a sandboxed backend.
    // For this prototype, we simulate execution and show AI analysis.
    setTimeout(() => {
      setOutput(`>>> Running ${language} script...\nHello, AI Architect!\n[Process exited with code 0]`);
      setIsLoading(false);
    }, 1000);
  };

  const getAIAdvice = async () => {
    setIsLoading(true);
    try {
      const advice = await aiService.getCodeExplanation(code, language);
      setAiFeedback(advice || 'Could not generate advice at this moment.');
    } catch (error) {
      setAiFeedback('Error reaching Llama API: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex space-x-4">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="python">Python 3.10</option>
            <option value="javascript">JavaScript (Node v18)</option>
            <option value="cpp">C++ (GCC 11)</option>
          </select>
          <button
            onClick={runCode}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all"
          >
            <i className="fas fa-play"></i>
            <span>Run Code</span>
          </button>
          <button
            onClick={getAIAdvice}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all"
          >
            <i className="fas fa-wand-magic-sparkles"></i>
            <span>AI Explain</span>
          </button>
        </div>
        <div className="text-slate-400 text-xs font-mono">
          Last saved: Just now
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Editor */}
        <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Main.py</span>
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
              <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 p-6 bg-transparent text-slate-300 font-mono text-sm resize-none focus:outline-none custom-scrollbar"
            spellCheck={false}
          />
        </div>

        {/* Console & AI */}
        <div className="flex flex-col space-y-4 min-h-0">
          <div className="h-1/2 flex flex-col bg-black border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center space-x-2">
              <i className="fas fa-terminal text-[10px] text-slate-500"></i>
              <span className="text-xs font-bold text-slate-400 uppercase">Console</span>
            </div>
            <pre className="flex-1 p-4 font-mono text-sm text-emerald-500 overflow-auto whitespace-pre-wrap">
              {output || "Output will appear here..."}
            </pre>
          </div>

          <div className="h-1/2 flex flex-col bg-indigo-950/20 border border-indigo-500/20 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-indigo-900/30 border-b border-indigo-500/20 flex items-center space-x-2">
              <i className="fas fa-robot text-[10px] text-indigo-400"></i>
              <span className="text-xs font-bold text-indigo-300 uppercase">AI Insights</span>
            </div>
            <div className="flex-1 p-6 overflow-auto">
              {isLoading ? (
                <div className="flex items-center space-x-3 text-indigo-400">
                  <i className="fas fa-circle-notch animate-spin"></i>
                  <span className="text-sm">Cognify is thinking...</span>
                </div>
              ) : aiFeedback ? (
                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {aiFeedback}
                </div>
              ) : (
                <div className="text-center py-10 opacity-40">
                  <i className="fas fa-brain text-4xl mb-4 text-indigo-500"></i>
                  <p className="text-xs">Click "AI Explain" to get detailed code analysis.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaygroundView;
