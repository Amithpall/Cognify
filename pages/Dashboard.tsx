import React, { useState } from 'react';
import Layout from '../components/Layout';
import RoadmapView from '../components/RoadmapView';
import PlaygroundView from '../components/PlaygroundView';
import ChatbotView from '../components/ChatbotView';
import LeaderboardView from '../components/LeaderboardView';
import { User } from '../types';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('roadmap');
  
  // Mock user session
  const [user] = useState<User>({
    id: 'user-778',
    name: 'Jane Doe',
    email: 'jane@nexusai.io',
    xp: 1250,
    level: 12,
    streak: 8,
    rank: 'ML Apprentice'
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'roadmap': return <RoadmapView />;
      case 'playground': return <PlaygroundView />;
      case 'chatbot': return <ChatbotView />;
      case 'leaderboard': return <LeaderboardView />;
      case 'notes': return (
        <div className="text-center py-20">
          <i className="fas fa-book-open text-6xl text-slate-800 mb-6"></i>
          <h2 className="text-2xl font-bold text-white mb-2">Structured Notes System</h2>
          <p className="text-slate-400">Library of syllabus-aligned PDF & Markdown notes coming soon.</p>
        </div>
      );
      default: return <RoadmapView />;
    }
  };

  return (
    <Layout user={user} activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default Dashboard;
