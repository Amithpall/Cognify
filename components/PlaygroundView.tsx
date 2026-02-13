import React, { useState, useRef, useEffect, useCallback } from 'react';
import { aiService } from '../services/llamaService';
import {
  LANGUAGES,
  getLanguageById,
  getFileName,
  executeCode,
  type LanguageConfig,
  type ExecutionResult,
} from '../services/codeExecutionService';

type RightTab = 'console' | 'preview';
type AiMode = 'idle' | 'insights' | 'generating';

const PlaygroundView: React.FC = () => {
  const [languageId, setLanguageId] = useState('python');
  const [code, setCode] = useState(LANGUAGES[0].defaultCode);
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>('console');
  const [aiMode, setAiMode] = useState<AiMode>('idle');
  const [aiOutput, setAiOutput] = useState('');
  const [genPrompt, setGenPrompt] = useState('');
  const [showGenModal, setShowGenModal] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);

  const lang = getLanguageById(languageId) || LANGUAGES[0];

  // Switch language
  const handleLanguageChange = (id: string) => {
    const newLang = getLanguageById(id);
    if (newLang) {
      setLanguageId(id);
      setCode(newLang.defaultCode);
      setOutput('');
      setAiOutput('');
      setExecutionResult(null);
      setRightTab(newLang.isWebLang ? 'preview' : 'console');
    }
  };

  // Sync line numbers with editor scroll
  const syncScroll = () => {
    if (editorRef.current && lineNumberRef.current) {
      lineNumberRef.current.scrollTop = editorRef.current.scrollTop;
    }
  };

  // Line count
  const lineCount = code.split('\n').length;

  // ── Run Code ──
  const handleRun = async () => {
    if (lang.isWebLang) {
      setRightTab('preview');
      return;
    }
    setIsExecuting(true);
    setOutput('⏳ Executing...\n');
    setRightTab('console');
    try {
      const result = await executeCode(languageId, code, stdin);
      setExecutionResult(result);
      let out = '';
      if (result.stdout) out += result.stdout;
      if (result.stderr) out += (out ? '\n' : '') + `⚠️ STDERR:\n${result.stderr}`;
      if (!out) out = '[No output]';
      out += `\n\n── Exit Code: ${result.exitCode} | ${result.language} ${result.version} ──`;
      setOutput(out);
    } catch (err: any) {
      setOutput(`❌ Execution Error:\n${err.message || err}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // ── AI Insights (streaming) ──
  const handleInsights = async () => {
    if (aiMode === 'insights') return;
    setAiMode('insights');
    setAiOutput('');
    try {
      await aiService.getDetailedInsights(code, lang.label, (text) => {
        setAiOutput(text);
      });
    } catch (err: any) {
      setAiOutput(`❌ Error: ${err.message || err}`);
    } finally {
      setAiMode('idle');
    }
  };

  // ── AI Code Generation (streaming) ──
  const handleGenerate = async () => {
    if (!genPrompt.trim()) return;
    setShowGenModal(false);
    setAiMode('generating');
    setAiOutput('');
    setCode('');
    try {
      await aiService.generateCode(genPrompt.trim(), lang.label, (text) => {
        // Strip markdown code fences if AI wraps them
        let clean = text;
        const fenceRegex = /^```[\w]*\n?([\s\S]*?)```$/;
        const match = clean.match(fenceRegex);
        if (match) clean = match[1];
        setCode(clean);
      });
    } catch (err: any) {
      setAiOutput(`❌ Generation Error: ${err.message || err}`);
    } finally {
      setAiMode('idle');
      setGenPrompt('');
    }
  };

  // Live preview for HTML
  useEffect(() => {
    if (lang.isWebLang && rightTab === 'preview' && iframeRef.current) {
      iframeRef.current.srcdoc = code;
    }
  }, [code, rightTab, lang.isWebLang]);

  // Handle Tab key in editor
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className="h-full flex flex-col gap-3" style={{ minHeight: 0 }}>
      {/* ── Top Toolbar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Language Selector */}
          <div className="relative">
            <select
              value={languageId}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="appearance-none bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-8 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer hover:bg-slate-800"
            >
              {LANGUAGES.map(l => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
            <i className={`${lang.iconPrefix || 'fas'} ${lang.icon} absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 text-sm`}></i>
            <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]"></i>
          </div>

          {/* Run Button */}
          <button
            onClick={handleRun}
            disabled={isExecuting}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
          >
            <i className={`fas ${isExecuting ? 'fa-circle-notch animate-spin' : 'fa-play'}`}></i>
            <span>{isExecuting ? 'Running...' : lang.isWebLang ? 'Preview' : 'Run Code'}</span>
          </button>

          {/* Generate Code Button */}
          <button
            onClick={() => setShowGenModal(true)}
            disabled={aiMode !== 'idle'}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-violet-500/10"
          >
            <i className={`fas ${aiMode === 'generating' ? 'fa-circle-notch animate-spin' : 'fa-wand-magic-sparkles'}`}></i>
            <span>{aiMode === 'generating' ? 'Generating...' : 'Generate'}</span>
          </button>

          {/* AI Insights Button */}
          <button
            onClick={handleInsights}
            disabled={aiMode !== 'idle'}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/10"
          >
            <i className={`fas ${aiMode === 'insights' ? 'fa-circle-notch animate-spin' : 'fa-brain'}`}></i>
            <span>{aiMode === 'insights' ? 'Analyzing...' : 'AI Insights'}</span>
          </button>
        </div>

        {/* File info */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="font-mono bg-slate-800/50 px-2 py-1 rounded">{getFileName(lang)}</span>
          <span>{lineCount} lines</span>
          {executionResult && (
            <span className={`px-2 py-0.5 rounded-full font-bold ${executionResult.exitCode === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              Exit {executionResult.exitCode}
            </span>
          )}
        </div>
      </div>

      {/* ── Code Generation Modal ── */}
      {showGenModal && (
        <div className="animate-fade-in-up bg-violet-950/30 border border-violet-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <i className="fas fa-wand-magic-sparkles text-violet-400"></i>
            <span className="text-sm font-bold text-violet-300">AI Code Generator</span>
            <span className="text-[10px] text-slate-500 ml-auto">Generating as {lang.label}</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="Describe what you want... e.g. 'fibonacci sequence with memoization'"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              autoFocus
            />
            <button
              onClick={handleGenerate}
              disabled={!genPrompt.trim()}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
            >
              Generate
            </button>
            <button
              onClick={() => setShowGenModal(false)}
              className="text-slate-400 hover:text-white px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-all"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* ── Main Editor Area ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-0">
        {/* ── Left: Code Editor ── */}
        <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl shadow-black/20">
          {/* Editor Header */}
          <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <i className={`${lang.iconPrefix || 'fas'} ${lang.icon} text-indigo-400 text-xs`}></i>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{getFileName(lang)}</span>
            </div>
            <div className="flex space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60"></div>
            </div>
          </div>

          {/* Editor Body with Line Numbers */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Line Numbers */}
            <div
              ref={lineNumberRef}
              className="py-4 pl-3 pr-2 bg-slate-900/50 text-right select-none overflow-hidden border-r border-slate-800/50 flex-shrink-0"
              style={{ width: '50px' }}
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} className="text-[11px] leading-[1.65rem] text-slate-600 font-mono">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              ref={editorRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={syncScroll}
              onKeyDown={handleEditorKeyDown}
              className="flex-1 py-4 px-4 bg-transparent text-slate-300 font-mono text-[13px] leading-[1.65rem] resize-none focus:outline-none sidebar-scroll"
              spellCheck={false}
              wrap="off"
            />

            {/* Generating overlay */}
            {aiMode === 'generating' && (
              <div className="absolute top-2 right-2 flex items-center gap-2 bg-violet-600/20 border border-violet-500/30 rounded-lg px-3 py-1.5">
                <i className="fas fa-circle-notch animate-spin text-violet-400 text-xs"></i>
                <span className="text-xs font-bold text-violet-300">AI typing...</span>
              </div>
            )}
          </div>

          {/* Stdin Input */}
          {lang.supportsStdin && (
            <div className="px-4 py-2.5 bg-slate-800/50 border-t border-slate-700/50">
              <div className="flex items-center gap-2">
                <i className="fas fa-keyboard text-slate-500 text-xs"></i>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Stdin</span>
              </div>
              <input
                type="text"
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Program input (one line, or use \\n for multiple lines)"
                className="w-full mt-1.5 bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {/* ── Right: Console / Preview + AI Insights ── */}
        <div className="flex flex-col gap-3 min-h-0">
          {/* Console / Preview Panel */}
          <div className={`flex flex-col bg-black/80 border border-slate-800 rounded-xl overflow-hidden ${rightTab === 'preview' ? 'flex-[7]' : 'flex-1'}`}>
            {/* Tab bar */}
            <div className="px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 flex items-center gap-1">
              <button
                onClick={() => setRightTab('console')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${rightTab === 'console'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                <i className="fas fa-terminal mr-1.5"></i>Console
              </button>
              {lang.isWebLang && (
                <button
                  onClick={() => setRightTab('preview')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${rightTab === 'preview'
                    ? 'bg-slate-800 text-indigo-400'
                    : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                  <i className="fas fa-eye mr-1.5"></i>Live Preview
                </button>
              )}
              {isExecuting && (
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 online-pulse"></div>
                  <span className="text-[10px] text-emerald-400 font-bold">Running</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              {rightTab === 'console' ? (
                <pre className="p-4 font-mono text-sm text-emerald-400/90 whitespace-pre-wrap leading-relaxed">
                  {output || '$ Ready. Click "Run Code" to execute.\n\nSupported: stdin input, stdout/stderr output.\nPowered by Piston API.'}
                </pre>
              ) : (
                <iframe
                  ref={iframeRef}
                  sandbox="allow-scripts allow-modals"
                  className="w-full h-full bg-white border-0"
                  title="Live Preview"
                  srcDoc={code}
                />
              )}
            </div>
          </div>

          {/* AI Insights Panel */}
          <div className={`flex flex-col bg-indigo-950/20 border border-indigo-500/15 rounded-xl overflow-hidden ${rightTab === 'preview' ? 'flex-[3]' : 'flex-1'}`}>
            <div className="px-4 py-2 bg-indigo-900/20 border-b border-indigo-500/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fas fa-brain text-indigo-400 text-xs"></i>
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">AI Insights</span>
              </div>
              {aiMode === 'insights' && (
                <div className="flex items-center gap-1.5">
                  <i className="fas fa-circle-notch animate-spin text-indigo-400 text-[10px]"></i>
                  <span className="text-[10px] text-indigo-400 font-bold">Streaming...</span>
                </div>
              )}
            </div>
            <div className="flex-1 p-4 overflow-auto sidebar-scroll">
              {aiOutput ? (
                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                  {aiOutput}
                </div>
              ) : aiMode === 'insights' ? (
                <div className="flex items-center gap-3 text-indigo-400 py-6">
                  <i className="fas fa-circle-notch animate-spin text-xl"></i>
                  <span className="text-sm">Cognify is analyzing your code...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
                  <i className="fas fa-brain text-4xl mb-3 text-indigo-500"></i>
                  <p className="text-xs text-slate-400 max-w-[200px]">
                    Click <b>"AI Insights"</b> for a detailed analysis with readability scores, complexity, and improvement suggestions.
                  </p>
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
