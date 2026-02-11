
import React from 'react';

const MOCK_USERS = [
  { rank: 1, name: 'Alex Thompson', xp: 12450, level: 42, avatar: '1', badge: 'AI Oracle' },
  { rank: 2, name: 'Sarah Chen', xp: 10200, level: 38, avatar: '2', badge: 'ML Warrior' },
  { rank: 3, name: 'Marco Rossi', xp: 9800, level: 35, avatar: '3', badge: 'Neural Knight' },
  { rank: 4, name: 'Priya Patel', xp: 8500, level: 30, avatar: '4', badge: 'Data Sensei' },
  { rank: 5, name: 'David Smith', xp: 7900, level: 28, avatar: '5', badge: 'Script Master' },
];

const LeaderboardView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {MOCK_USERS.slice(0, 3).map((user, i) => (
          <div key={user.name} className={`relative p-6 rounded-2xl border ${
            i === 0 ? 'bg-indigo-600/10 border-indigo-500 shadow-xl shadow-indigo-500/10 order-1' : 
            'bg-slate-900 border-slate-800 mt-6 order-2'
          }`}>
            <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
              i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-slate-300 text-slate-900' : 'bg-orange-600'
            }`}>
              {i + 1}
            </div>
            <div className="flex flex-col items-center text-center">
              <img src={`https://picsum.photos/seed/${user.avatar}/80/80`} className="w-20 h-20 rounded-2xl mb-4 border-2 border-slate-800" alt="avatar" />
              <h3 className="font-bold text-white truncate w-full">{user.name}</h3>
              <p className="text-xs text-indigo-400 font-bold mb-3 uppercase tracking-wider">{user.badge}</p>
              <div className="flex items-center space-x-2 bg-slate-950 px-4 py-1.5 rounded-full border border-slate-800">
                <i className="fas fa-bolt text-yellow-500 text-xs"></i>
                <span className="text-sm font-bold text-white">{user.xp} XP</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-800 grid grid-cols-12 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <div className="col-span-1">Rank</div>
          <div className="col-span-6">Student</div>
          <div className="col-span-2 text-center">Level</div>
          <div className="col-span-3 text-right">Total XP</div>
        </div>
        <div className="divide-y divide-slate-800">
          {MOCK_USERS.map((user) => (
            <div key={user.rank} className="px-6 py-4 grid grid-cols-12 items-center hover:bg-slate-800/30 transition-colors group">
              <div className="col-span-1 font-bold text-slate-400">{user.rank}</div>
              <div className="col-span-6 flex items-center space-x-3">
                <img src={`https://picsum.photos/seed/${user.avatar}/32/32`} className="w-8 h-8 rounded-lg" alt="" />
                <span className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">{user.name}</span>
              </div>
              <div className="col-span-2 text-center">
                <span className="bg-slate-800 px-2.5 py-1 rounded text-xs font-bold text-slate-300">Lvl {user.level}</span>
              </div>
              <div className="col-span-3 text-right">
                <span className="text-sm font-black text-white">{user.xp.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardView;
