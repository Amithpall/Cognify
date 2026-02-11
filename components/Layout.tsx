
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { googleLogout } from '@react-oauth/google';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, activeTab, setActiveTab }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    googleLogout();
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  };
  const menuItems = [
    { id: 'roadmap', icon: 'fa-map', label: 'Roadmap' },
    { id: 'playground', icon: 'fa-code', label: 'Playground' },
    { id: 'chatbot', icon: 'fa-robot', label: 'Tutor AI' },
    { id: 'leaderboard', icon: 'fa-trophy', label: 'Leaderboard' },
    { id: 'notes', icon: 'fa-book', label: 'Notes' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <i className="fas fa-brain text-white text-xl"></i>
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Cognify</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === item.id
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
            >
              <i className={`fas ${item.icon}`}></i>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center space-x-3 bg-white/[0.03] p-3 rounded-xl border border-white/5">
            <img
              src={user.picture || `https://picsum.photos/seed/${user.id}/40/40`}
              className="rounded-full w-10 h-10 object-cover ring-2 ring-indigo-500/30"
              alt="avatar"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-white">{user.name}</p>
              <p className="text-xs text-slate-400">Level {user.level} {user.rank}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="group w-full mt-3 px-3 py-2.5 bg-white/[0.03] hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl transition-all duration-300 text-sm font-medium border border-white/5 hover:border-red-500/20 flex items-center justify-center gap-2"
          >
            <i className="fas fa-sign-out-alt group-hover:translate-x-0.5 transition-transform duration-300"></i>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-4">
            <button className="md:hidden text-slate-400">
              <i className="fas fa-bars"></i>
            </button>
            <h2 className="text-lg font-semibold text-white capitalize">{activeTab}</h2>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 bg-indigo-900/20 px-3 py-1 rounded-full border border-indigo-500/30">
              <i className="fas fa-bolt text-yellow-500"></i>
              <span className="text-sm font-bold text-indigo-300">{user.xp} XP</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300">
              <i className="fas fa-fire text-orange-500"></i>
              <span className="text-sm font-bold">{user.streak} Days</span>
            </div>
            <button className="text-slate-400 hover:text-white transition-colors">
              <i className="fas fa-bell"></i>
            </button>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors" title="Sign Out">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
