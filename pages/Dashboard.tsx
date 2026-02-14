import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { User } from '../types';
import { progressService } from '../services/progressService';
import { upsertUser } from '../services/apiService';

const Dashboard: React.FC = () => {
  const location = useLocation();

  // Derive activeTab from URL path (e.g. /roadmap -> roadmap)
  const activeTab = location.pathname.split('/')[1] || 'roadmap';

  // Build user from Google OAuth data + real progress
  const [user, setUser] = useState<User>(() => {
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

  // Store DB User ID in state to pass to children context
  const [dbUserId, setDbUserId] = useState<number | null>(() => {
    const stored = localStorage.getItem('db_user_id');
    return stored ? parseInt(stored, 10) : null;
  });

  // Sync user to PostgreSQL on mount
  useEffect(() => {
    const syncUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) return;
        const googleUser = JSON.parse(storedUser);
        if (!googleUser.sub) return;

        const dbUser = await upsertUser({
          google_id: googleUser.sub,
          name: googleUser.name || 'User',
          email: googleUser.email,
          picture: googleUser.picture,
        });

        // Store the DB user ID for other services to use
        localStorage.setItem('db_user_id', String(dbUser.id));
        setDbUserId(dbUser.id);

        // Update user state with DB data if it has more XP
        if (dbUser.xp > (user.xp || 0)) {
          setUser(prev => ({
            ...prev,
            xp: dbUser.xp,
            level: Math.floor(dbUser.xp / 200) + 1,
            streak: dbUser.streak || prev.streak,
          }));
        }
      } catch (err) {
        console.warn('[Dashboard] DB sync skipped:', err);
      }
    };
    syncUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh user XP on re-render by reading from progressService
  const currentXp = progressService.getTotalXp();
  const currentLevel = progressService.getLevel();
  const displayUser = { ...user, xp: currentXp, level: currentLevel, rank: progressService.getRank() };

  return (
    <Layout user={displayUser} activeTab={activeTab}>
      <Outlet context={{ dbUserId, user: displayUser }} />
    </Layout>
  );
};

export default Dashboard;
