import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import RoadmapView from './components/RoadmapView';
import PlaygroundView from './components/PlaygroundView';
import ChatbotView from './components/ChatbotView';
import LeaderboardView from './components/LeaderboardView';

const NotesPlaceholder: React.FC = () => (
  <div className="text-center py-20">
    <i className="fas fa-book-open text-6xl text-slate-800 mb-6"></i>
    <h2 className="text-2xl font-bold text-white mb-2">Structured Notes System</h2>
    <p className="text-slate-400">Library of syllabus-aligned PDF &amp; Markdown notes coming soon.</p>
  </div>
);

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<Dashboard />}>
          <Route path="/roadmap" element={<RoadmapView />} />
          <Route path="/playground" element={<PlaygroundView />} />
          <Route path="/chatbot" element={<ChatbotView />} />
          <Route path="/leaderboard" element={<LeaderboardView />} />
          <Route path="/notes" element={<NotesPlaceholder />} />
          <Route path="*" element={<Navigate to="/roadmap" />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
