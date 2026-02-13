import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { User } from '../types';
import { progressService } from '../services/progressService';

const Dashboard: React.FC = () => {
  const location = useLocation();

  // Derive activeTab from URL path (e.g. /roadmap -> roadmap)
  const activeTab = location.pathname.split('/')[1] || 'roadmap';

  // Build user from Google OAuth data + real progress from localStorage
  const [user] = useState<User>(() => {
    const storedUser = localStorage.getItem('user');
    const realXp = progressService.getTotalXp();
    const realLevel = progressService.getLevel();
    const realRank = progressService.getRank();

    const baseUser: User = {
      id: 'user-778',
      name: 'Jane Doe',
      email: 'jane@nexusai.io',
      xp: realXp,
      level: realLevel,
      streak: 0,
      rank: realRank
    };

    if (storedUser) {
      try {
        const googleUser = JSON.parse(storedUser);
        return {
          ...baseUser,
          id: googleUser.sub || baseUser.id,
          name: googleUser.name || baseUser.name,
          email: googleUser.email || baseUser.email,
          picture: googleUser.picture
        };
      } catch (e) {
        console.error("Failed to parse user from local storage", e);
        return baseUser;
      }
    }
    return baseUser;
  });

  // Refresh user XP on re-render by reading from progressService
  const currentXp = progressService.getTotalXp();
  const currentLevel = progressService.getLevel();
  const displayUser = { ...user, xp: currentXp, level: currentLevel, rank: progressService.getRank() };

  return (
    <Layout user={displayUser} activeTab={activeTab}>
      <Outlet />
    </Layout>
  );
};

export default Dashboard;
