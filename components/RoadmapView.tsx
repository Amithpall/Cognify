import React, { useState, useCallback } from 'react';
import { GeneratedRoadmap, RoadmapLevel } from '../types';
import { aiService } from '../services/llamaService';
import { progressService, REWARDS } from '../services/progressService';
import TopicSelector from './TopicSelector';
import LevelView from './LevelView';

type ViewState = 'topic-select' | 'roadmap' | 'level';

// Save/load roadmaps from localStorage
const ROADMAPS_KEY = 'cognify_roadmaps';

function getSavedRoadmaps(): GeneratedRoadmap[] {
  try {
    const stored = localStorage.getItem(ROADMAPS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRoadmap(roadmap: GeneratedRoadmap): void {
  const existing = getSavedRoadmaps();
  const filtered = existing.filter(r => r.id !== roadmap.id);
  filtered.unshift(roadmap);
  localStorage.setItem(ROADMAPS_KEY, JSON.stringify(filtered.slice(0, 10)));
}

// ── Mock community data ──
const COMMUNITIES = [
  { id: 'c1', name: 'AI Enthusiasts', members: 1243, color: 'from-violet-500 to-purple-600', icon: 'fa-robot', online: 42 },
  { id: 'c2', name: 'Python Devs', members: 892, color: 'from-blue-500 to-cyan-600', icon: 'fa-python', iconPrefix: 'fab', online: 28 },
  { id: 'c3', name: 'Cognify Study Group', members: 356, color: 'from-indigo-500 to-blue-600', icon: 'fa-brain', online: 15 },
  { id: 'c4', name: 'DSA Warriors', members: 678, color: 'from-emerald-500 to-green-600', icon: 'fa-code', online: 31 },
  { id: 'c5', name: 'Web Dev Hub', members: 1105, color: 'from-orange-500 to-red-600', icon: 'fa-globe', online: 53 },
];

// ── Circular Progress Component ──
const CircularProgress: React.FC<{ percent: number; size?: number; strokeWidth?: number }> = ({
  percent, size = 120, strokeWidth = 8,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(51, 65, 85, 0.5)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="progress-ring-circle"
          style={{
            '--ring-circumference': `${circumference}`,
            '--ring-offset': `${offset}`,
          } as React.CSSProperties}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-white progress-percent-text">{percent}%</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Complete</span>
      </div>
    </div>
  );
};

const RoadmapView: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('topic-select');
  const [roadmap, setRoadmap] = useState<GeneratedRoadmap | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<RoadmapLevel | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleSelectTopic = useCallback(async (topic: string) => {
    setIsGenerating(true);
    setError('');
    try {
      const levels = await aiService.generateRoadmap(topic);
      const generatedRoadmap: GeneratedRoadmap = {
        id: `roadmap-${Date.now()}`,
        topic,
        createdAt: new Date().toISOString(),
        levels: levels.map((l, i) => ({
          id: `level-${Date.now()}-${i}`,
          order: i + 1,
          title: l.title,
          description: l.description,
          theoryContent: '',
          subtopics: [],
          xpReward: l.xpReward || (100 + i * 50),
          quiz: [],
        })),
      };
      setRoadmap(generatedRoadmap);
      saveRoadmap(generatedRoadmap);
      setViewState('roadmap');
    } catch (err) {
      console.error('Roadmap generation failed:', err);
      setError('Failed to generate roadmap. Make sure your AI server is running and accessible.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const openLevel = (level: RoadmapLevel) => {
    setSelectedLevel(level);
    setViewState('level');
  };

  const goBackToRoadmap = () => {
    setSelectedLevel(null);
    setViewState('roadmap');
  };

  const goToNextLevel = () => {
    if (!roadmap || !selectedLevel) return;
    const currentIdx = roadmap.levels.findIndex(l => l.id === selectedLevel.id);
    if (currentIdx < roadmap.levels.length - 1) {
      setSelectedLevel(roadmap.levels[currentIdx + 1]);
    }
  };

  const goBackToTopics = () => {
    setRoadmap(null);
    setSelectedLevel(null);
    setViewState('topic-select');
  };

  // ── Render: Topic Selection ──
  if (viewState === 'topic-select') {
    return (
      <div>
        {error && (
          <div className="max-w-5xl mx-auto mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <i className="fas fa-exclamation-triangle mr-2"></i>{error}
          </div>
        )}
        <TopicSelector onSelectTopic={handleSelectTopic} isLoading={isGenerating} />

        {/* Previously Generated Roadmaps */}
        <PreviousRoadmaps onResume={(rm) => { setRoadmap(rm); setViewState('roadmap'); }} />
      </div>
    );
  }

  // ── Render: Level Detail ──
  if (viewState === 'level' && selectedLevel && roadmap) {
    const isLast = roadmap.levels[roadmap.levels.length - 1].id === selectedLevel.id;
    return (
      <LevelView
        level={selectedLevel}
        topic={roadmap.topic}
        roadmapId={roadmap.id}
        onBack={goBackToRoadmap}
        onNext={goToNextLevel}
        isLastLevel={isLast}
      />
    );
  }

  // ── Render: Roadmap Timeline + Right Sidebar ──
  if (!roadmap) return null;

  const rp = progressService.getRoadmapProgress(roadmap.id);
  const completedCount = rp?.completedLevels.length || 0;
  const progressPercent = Math.round((completedCount / roadmap.levels.length) * 100);

  // Calculate XP earned on this roadmap
  const roadmapXp = roadmap.levels
    .filter(l => rp?.completedLevels.includes(l.id))
    .reduce((sum, l) => sum + l.xpReward, 0);

  return (
    <div className="flex gap-6">
      {/* ── Left: Roadmap Timeline ── */}
      <div className="flex-1 max-w-4xl mx-auto py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={goBackToTopics} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <i className="fas fa-arrow-left"></i>
            <span>Choose another topic</span>
          </button>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <i className="fas fa-map text-indigo-400 text-xs"></i>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{roadmap.topic}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-3">Your Learning Roadmap</h1>
          <p className="text-slate-400 max-w-lg mx-auto text-sm">
            Click on any level to start learning. Complete quizzes to earn XP.
          </p>

          {/* Progress Bar */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>{completedCount}/{roadmap.levels.length} levels completed</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Connection Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-800"></div>

          <div className="space-y-6">
            {roadmap.levels.map((level, index) => {
              const isCompleted = rp?.completedLevels.includes(level.id) ?? false;
              const quizResult = rp?.quizResults.find(q => q.levelId === level.id);
              const scorePercent = quizResult ? Math.round((quizResult.score / quizResult.total) * 100) : null;

              return (
                <button
                  key={level.id}
                  onClick={() => openLevel(level)}
                  className="w-full flex items-start gap-6 group text-left"
                >
                  {/* Node */}
                  <div className={`relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-lg ${isCompleted
                    ? 'bg-emerald-600 shadow-emerald-500/20 group-hover:scale-110'
                    : 'bg-slate-800 border-2 border-slate-700 group-hover:border-indigo-500 group-hover:scale-110'
                    }`}>
                    {isCompleted ? (
                      <i className="fas fa-check text-white text-xl"></i>
                    ) : (
                      <span className="text-lg font-black text-slate-500 group-hover:text-indigo-400 transition-colors">{level.order}</span>
                    )}
                  </div>

                  {/* Card */}
                  <div className={`flex-1 p-5 rounded-2xl border transition-all duration-300 ${isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-400/40'
                    : 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Level {level.order}</span>
                      <div className="flex items-center gap-2">
                        {scorePercent !== null && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${scorePercent >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                            scorePercent >= 50 ? 'bg-yellow-500/10 text-yellow-400' :
                              'bg-red-500/10 text-red-400'
                            }`}>
                            Quiz: {scorePercent}%
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-500">{level.xpReward} XP</span>
                      </div>
                    </div>
                    <h3 className={`text-lg font-bold mb-1 transition-colors ${isCompleted ? 'text-emerald-300' : 'text-white group-hover:text-indigo-300'
                      }`}>
                      {level.title}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-2">{level.description}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>{isCompleted ? 'Review' : 'Start Learning'}</span>
                      <i className="fas fa-arrow-right"></i>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right: Progress Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-[280px] flex-shrink-0 py-6 space-y-4 sidebar-scroll overflow-y-auto pr-2">
        {/* Circular Progress */}
        <div className="animate-fade-in-up p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-4 text-center">Roadmap Progress</p>
          <div className="flex justify-center mb-3">
            <CircularProgress percent={progressPercent} />
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">
              <span className="text-white font-bold">{completedCount}</span> of <span className="text-white font-bold">{roadmap.levels.length}</span> levels
            </p>
          </div>
        </div>

        {/* Roadmap Stats */}
        <div className="animate-fade-in-up delay-100 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-3">Stats</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-2">
                <i className="fas fa-bolt text-yellow-500"></i> XP Earned
              </span>
              <span className="text-sm font-bold text-yellow-300">{roadmapXp}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-2">
                <i className="fas fa-clock text-cyan-500"></i> Topic
              </span>
              <span className="text-sm font-bold text-cyan-300 truncate max-w-[120px]">{roadmap.topic}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-2">
                <i className="fas fa-layer-group text-purple-500"></i> Total Levels
              </span>
              <span className="text-sm font-bold text-purple-300">{roadmap.levels.length}</span>
            </div>
          </div>
        </div>

        {/* Community Chats */}
        <div className="animate-fade-in-up delay-200 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Community Chats</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold">{COMMUNITIES.length} Joined</span>
          </div>
          <div className="space-y-2">
            {COMMUNITIES.map((community, i) => (
              <button
                key={community.id}
                onClick={() => console.log(`Navigate to chat: ${community.name}`)}
                className={`animate-fade-in-up delay-${(i + 3) * 100} w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-all group`}
              >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${community.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                  <i className={`${community.iconPrefix || 'fas'} ${community.icon} text-white text-xs`}></i>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{community.name}</p>
                  <p className="text-[10px] text-slate-500">{community.members.toLocaleString()} members</p>
                </div>
                {/* Online indicator */}
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 online-pulse"></div>
                  <span className="text-[10px] text-emerald-400 font-bold">{community.online}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Tip */}
        <div className="animate-fade-in-up delay-500 p-4 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <i className="fas fa-lightbulb text-indigo-400 text-xs"></i>
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-300 mb-1">Pro Tip</p>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Complete levels in order for the best learning experience. Each quiz builds on the previous topic!
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

// ── Sub-component: Show previously generated roadmaps from localStorage ──
const PreviousRoadmaps: React.FC<{ onResume: (roadmap: GeneratedRoadmap) => void }> = ({ onResume }) => {
  const savedRoadmaps = getSavedRoadmaps();
  if (savedRoadmaps.length === 0) return null;

  return (
    <div className="max-w-5xl mx-auto mt-12">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
        <i className="fas fa-history mr-2"></i>Recent Roadmaps
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {savedRoadmaps.map((rm) => {
          const progress = progressService.getRoadmapProgress(rm.id);
          const completed = progress?.completedLevels.length || 0;
          const total = rm.levels.length;
          return (
            <button
              key={rm.id}
              onClick={() => onResume(rm)}
              className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-600 text-left transition-all hover:-translate-y-0.5 group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-400">{rm.topic}</span>
                <span className="text-[10px] text-slate-500">{completed}/{total}</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                ></div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RoadmapView;

