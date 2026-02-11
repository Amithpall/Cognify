
import React from 'react';
import { RoadmapNode, Difficulty } from '../types';

const MOCK_NODES: RoadmapNode[] = [
  { id: '1', title: 'Foundations of AI', description: 'Logic, Probability & Statistics', status: 'completed', type: 'concept', xp: 100 },
  { id: '2', title: 'Python for Data Science', description: 'NumPy, Pandas, Matplotlib', status: 'available', type: 'playground', xp: 200 },
  { id: '3', title: 'Supervised Learning', description: 'Regression, Classification', status: 'locked', type: 'lab', xp: 350 },
  { id: '4', title: 'Neural Networks 101', description: 'Perceptrons, Backpropagation', status: 'locked', type: 'quiz', xp: 400 },
  { id: '5', title: 'Natural Language Processing', description: 'Tokenization, Embeddings', status: 'locked', type: 'concept', xp: 500 },
];

const RoadmapView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-white mb-4">AI Architect Journey</h1>
        <p className="text-slate-400 max-w-lg mx-auto">Master AI from scratch. Complete tasks to unlock the next frontier of intelligence.</p>
        
        <div className="mt-8 flex justify-center space-x-4">
          <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20 flex items-center">
             <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
             Beginner Path
          </span>
          <span className="px-4 py-1.5 rounded-full bg-slate-800 text-slate-500 text-xs font-bold border border-slate-700">
             Intermediate Path
          </span>
          <span className="px-4 py-1.5 rounded-full bg-slate-800 text-slate-500 text-xs font-bold border border-slate-700">
             Advanced Path
          </span>
        </div>
      </div>

      <div className="relative">
        {/* Connection Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-800 -translate-x-1/2 rounded-full"></div>

        <div className="space-y-24 relative">
          {MOCK_NODES.map((node, index) => (
            <div key={node.id} className={`flex items-center ${index % 2 === 0 ? 'flex-row-reverse' : 'flex-row'} group`}>
              <div className="w-1/2"></div>
              
              {/* Node Center */}
              <div className={`z-10 w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-2xl shadow-indigo-500/20 ${
                node.status === 'completed' ? 'bg-indigo-600 scale-110' : 
                node.status === 'available' ? 'bg-slate-800 border-2 border-indigo-500 animate-pulse' : 
                'bg-slate-900 border border-slate-800 grayscale'
              }`}>
                {node.status === 'completed' ? (
                  <i className="fas fa-check text-white text-xl"></i>
                ) : (
                  <i className={`fas ${
                    node.type === 'concept' ? 'fa-lightbulb' : 
                    node.type === 'quiz' ? 'fa-question' : 
                    node.type === 'lab' ? 'fa-flask' : 'fa-code'
                  } text-xl ${node.status === 'locked' ? 'text-slate-600' : 'text-indigo-400'}`}></i>
                )}
              </div>

              {/* Content Card */}
              <div className={`w-1/2 px-8 ${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                <div className={`p-6 rounded-2xl border transition-all duration-300 ${
                  node.status === 'locked' 
                    ? 'bg-slate-900/50 border-slate-800 text-slate-500' 
                    : 'bg-slate-900 border-slate-700 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      node.status === 'locked' ? 'bg-slate-800 text-slate-600' : 'bg-indigo-900/30 text-indigo-400'
                    }`}>
                      {node.type}
                    </span>
                    <span className="text-xs font-bold">{node.xp} XP</span>
                  </div>
                  <h3 className={`text-lg font-bold mb-2 ${node.status === 'locked' ? 'text-slate-600' : 'text-white'}`}>
                    {node.title}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-2">{node.description}</p>
                  
                  {node.status !== 'locked' && (
                    <button className="mt-4 text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-2 group-hover:translate-x-1 transition-transform">
                      <span>{node.status === 'completed' ? 'Review Lesson' : 'Start Lesson'}</span>
                      <i className="fas fa-arrow-right"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoadmapView;
