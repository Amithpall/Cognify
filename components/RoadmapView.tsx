import React, { useState, useEffect, useCallback } from 'react';
import { GeneratedRoadmap, RoadmapLevel } from '../types';
import { aiService } from '../services/llamaService';
import { progressService, REWARDS } from '../services/progressService';
import * as api from '../services/apiService';
import TopicSelector from './TopicSelector';
import LevelView from './LevelView';

type ViewState = 'topic-select' | 'roadmap' | 'level';

const COMMUNITIES = [
  { id: 'c1', name: 'AI Enthusiasts', members: 1243, color: 'from-violet-500 to-purple-600', icon: 'fa-robot', online: 42 },
  { id: 'c2', name: 'Python Devs', members: 892, color: 'from-blue-500 to-cyan-600', icon: 'fa-python', iconPrefix: 'fab', online: 28 },
  { id: 'c3', name: 'Cognify Study Group', members: 356, color: 'from-indigo-500 to-blue-600', icon: 'fa-brain', online: 15 },
  { id: 'c4', name: 'DSA Warriors', members: 678, color: 'from-emerald-500 to-green-600', icon: 'fa-code', online: 31 },
  { id: 'c5', name: 'Web Dev Hub', members: 1105, color: 'from-orange-500 to-red-600', icon: 'fa-globe', online: 53 },
];

const CircularProgress: React.FC<{ percent: number; size?: number; strokeWidth?: number }> = ({
  percent, size = 120, strokeWidth = 8,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(51, 65, 85, 0.5)" strokeWidth={strokeWidth} />
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
          style={{ '--ring-circumference': `${circumference}`, '--ring-offset': `${offset}` } as React.CSSProperties}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-2xl font-bold">{Math.round(percent)}%</span>
      </div>
    </div>
  );
};

const RoadmapView: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('topic-select');
  const [roadmaps, setRoadmaps] = useState<GeneratedRoadmap[]>([]);
  const [currentRoadmap, setCurrentRoadmap] = useState<GeneratedRoadmap | null>(null);
  const [currentLevel, setCurrentLevel] = useState<RoadmapLevel | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load roadmaps from DB on mount
  useEffect(() => {
    const loadRoadmaps = async () => {
      const userId = progressService.getDbUserId();
      if (!userId) {
        setLoadingHistory(false);
        return;
      }
      try {
        const saved = await api.getUserRoadmaps(userId);
        // Map DB fields to frontend format
        const formatted: GeneratedRoadmap[] = saved.map((r: any) => ({
          id: String(r.id), // Use DB ID
          topic: r.topic,
          levels: r.levels || [],
          dbId: r.id
        }));
        setRoadmaps(formatted);
      } catch (err) {
        console.error('Failed to load roadmaps:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadRoadmaps();
  }, []);

  const handleGenerate = async (topic: string) => {
    setIsGenerating(true);
    try {
      const userId = progressService.getDbUserId();

      // 1. Generate roadmap content via AI
      const rawLevels = await aiService.generateRoadmap(topic);

      // Map raw levels to full RoadmapLevel objects
      const levels: RoadmapLevel[] = rawLevels.map((l, i) => ({
        id: crypto.randomUUID(),
        order: i + 1,
        title: l.title,
        description: l.description,
        theoryContent: '', // Generated lazily
        subtopics: [],     // Generated lazily
        xpReward: l.xpReward,
        quiz: []           // Generated lazily
      }));

      // 2. Save to DB (handle duplicates)
      let newRoadmap: GeneratedRoadmap;

      if (userId) {
        const saved = await api.createRoadmap({
          user_id: userId,
          topic: topic,
          levels: levels
        });

        newRoadmap = {
          id: String(saved.id),
          topic: saved.topic,
          levels: saved.levels,
          createdAt: saved.created_at || new Date().toISOString(),
          dbId: saved.id
        };

        // If returned existing, use that
        if (saved.existing) {
          console.log(`Using existing roadmap for topic: ${topic}`);
          // Update local state to ensure it's in the list
          setRoadmaps(prev => {
            const others = prev.filter(r => r.dbId !== saved.id);
            return [newRoadmap, ...others];
          });
        } else {
          setRoadmaps(prev => [newRoadmap, ...prev]);
        }
      } else {
        // Fallback for guest (no DB)
        newRoadmap = {
          id: crypto.randomUUID(),
          topic,
          levels,
          createdAt: new Date().toISOString()
        };
        setRoadmaps(prev => [newRoadmap, ...prev]);
      }

      setCurrentRoadmap(newRoadmap);
      setViewState('roadmap');
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate roadmap. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectRoadmap = (roadmap: GeneratedRoadmap) => {
    setCurrentRoadmap(roadmap);
    setViewState('roadmap');
  };

  const handleDeleteRoadmap = async (e: React.MouseEvent, id: string, dbId?: number) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this roadmap?')) {
      if (dbId) {
        try {
          await api.deleteRoadmap(dbId);
        } catch (err) {
          console.error('Failed to delete roadmap:', err);
        }
      }
      setRoadmaps(prev => prev.filter(r => r.id !== id));
      if (currentRoadmap?.id === id) {
        setViewState('topic-select');
        setCurrentRoadmap(null);
      }
    }
  };

  const handleLevelSelect = (level: RoadmapLevel) => {
    setCurrentLevel(level);
    setViewState('level');
  };

  const handleBack = () => {
    if (viewState === 'level') {
      setViewState('roadmap');
      setCurrentLevel(null);
    } else {
      setViewState('topic-select');
      setCurrentRoadmap(null);
    }
  };

  // ── Render Views ──

  if (viewState === 'topic-select') {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <TopicSelector onSelectTopic={handleGenerate} isLoading={isGenerating} />

        {/* Saved Roadmaps List */}
        <div className="mt-12">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <i className="fas fa-history text-indigo-400"></i>
            Your Learning Paths
          </h3>

          {loadingHistory ? (
            <div className="text-center py-8 text-slate-500">
              <i className="fas fa-circle-notch animate-spin mr-2"></i>
              Loading roadmaps...
            </div>
          ) : roadmaps.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-700/50 border-dashed">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-map-signs text-slate-600 text-2xl"></i>
              </div>
              <p className="text-slate-400">No roadmaps generated yet.</p>
              <p className="text-sm text-slate-500 mt-1">Select a topic above to start your journey!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roadmaps.map(roadmap => {
                const progress = progressService.getRoadmapProgress(roadmap.id);
                const completed = progress?.completedLevels.length || 0;
                const total = roadmap.levels.length;
                const percent = Math.round((completed / total) * 100) || 0;

                return (
                  <div
                    key={roadmap.id}
                    onClick={() => handleSelectRoadmap(roadmap)}
                    className="group bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500/50 rounded-xl p-5 cursor-pointer transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDeleteRoadmap(e, roadmap.id, roadmap.dbId)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete Roadmap"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>

                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg text-white mb-1 group-hover:text-indigo-300 transition-colors">
                          {roadmap.topic}
                        </h4>
                        <p className="text-xs text-slate-400">{total} Levels • Generated by AI</p>
                      </div>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${percent === 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'
                        }`}>
                        {percent}%
                      </div>
                    </div>

                    <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Detail / Level View ──

  if (viewState === 'level' && currentLevel && currentRoadmap) {
    return (
      <LevelView
        level={currentLevel}
        roadmapId={currentRoadmap.id}
        roadmapDbId={currentRoadmap.dbId} // Pass DB ID for persistence
        topic={currentRoadmap.topic}
        onBack={handleBack}
        onComplete={(xp) => {
          progressService.completeLevel(
            currentRoadmap.id,
            currentRoadmap.topic,
            currentLevel.id,
            xp,
            currentRoadmap.dbId // Sync to DB
          );
        }}
      />
    );
  }

  if (viewState === 'roadmap' && currentRoadmap) {
    const progress = progressService.getRoadmapProgress(currentRoadmap.id);
    const completedCount = progress?.completedLevels.length || 0;
    const totalLevels = currentRoadmap.levels.length;
    const progressPercent = Math.round((completedCount / totalLevels) * 100);

    return (
      <div className="flex gap-6 h-full">
        {/* Left: Roadmap Timeline */}
        <div className="flex-1 max-w-4xl mx-auto py-6 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-slate-700"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <h2 className="text-2xl font-bold text-white">{currentRoadmap.topic}</h2>
              <p className="text-slate-400 text-sm">Your personalized learning path</p>
            </div>
          </div>

          <div className="relative pl-8 border-l-2 border-slate-800 space-y-12 ml-4">
            {currentRoadmap.levels.map((level, index) => {
              const isCompleted = progressService.isLevelCompleted(currentRoadmap.id, level.id);
              const isLocked = index > 0 && !progressService.isLevelCompleted(currentRoadmap.id, currentRoadmap.levels[index - 1].id);

              return (
                <div key={level.id} className="relative">
                  <div className={`absolute -left-[41px] top-0 w-5 h-5 rounded-full border-4 transition-all ${isCompleted
                    ? 'bg-emerald-500 border-emerald-900 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                    : isLocked
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-indigo-500 border-indigo-900 shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                    }`}></div>

                  <div
                    onClick={() => !isLocked && handleLevelSelect(level)}
                    className={`block p-6 rounded-xl border transition-all duration-300 group ${isLocked
                      ? 'bg-slate-900/50 border-slate-800 opacity-60 cursor-not-allowed'
                      : 'bg-slate-800/80 border-slate-700 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer transform hover:-translate-y-1'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs font-bold uppercase tracking-wider ${isCompleted ? 'text-emerald-400' : isLocked ? 'text-slate-600' : 'text-indigo-400'
                        }`}>
                        Level {index + 1}
                      </span>
                      {isCompleted && <i className="fas fa-check-circle text-emerald-500"></i>}
                      {isLocked && <i className="fas fa-lock text-slate-600"></i>}
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${isLocked ? 'text-slate-500' : 'text-white group-hover:text-indigo-200'}`}>
                      {level.title}
                    </h3>
                    <p className={`text-sm mb-4 ${isLocked ? 'text-slate-600' : 'text-slate-400'}`}>
                      {level.description}
                    </p>
                    <div className="flex items-center gap-4">
                      {level.subtopics.map((sub, i) => (
                        <span key={i} className={`text-xs px-2 py-1 rounded border ${isLocked
                          ? 'bg-slate-800 border-slate-700 text-slate-600'
                          : 'bg-slate-900 border-slate-700 text-slate-300'
                          }`}>
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Progress Sidebar */}
        <aside className="hidden lg:flex flex-col w-[280px] space-y-4 pt-20 animate-fade-in-up">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center">
            <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Roadmap Progress</h3>
            <div className="animate-fade-in-up">
              <CircularProgress percent={progressPercent} />
            </div>
            <div className="mt-4 text-center">
              <div className="text-2xl font-bold text-white">{completedCount} / {totalLevels}</div>
              <div className="text-xs text-slate-500">Levels Completed</div>
            </div>
          </div>

          {/* Community Chats */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden animate-fade-in-up delay-100">
            <div className="px-5 py-3 border-b border-slate-700 bg-slate-800/80">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Community Hub</h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto sidebar-scroll">
              {COMMUNITIES.map((community) => (
                <button
                  key={community.id}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0"
                  onClick={() => console.log(`Joined ${community.name}`)}
                >
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${community.color} flex items-center justify-center shadow-lg`}>
                    <i className={`${community.iconPrefix || 'fas'} ${community.icon} text-white text-xs`}></i>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-bold text-slate-200 truncate">{community.name}</div>
                    <div className="text-[10px] text-slate-500">{community.members.toLocaleString()} members</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 online-pulse"></div>
                    <span className="text-[10px] font-mono text-emerald-400">{community.online}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    );
  }

  return null;
};

export default RoadmapView;
