
export enum Difficulty {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced'
}

export interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  status: 'locked' | 'available' | 'completed';
  type: 'concept' | 'quiz' | 'playground' | 'lab';
  xp: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  xp: number;
  level: number;
  streak: number;
  rank: string;
}

export interface CodeSubmission {
  code: string;
  language: string;
  output?: string;
  error?: string;
  aiFeedback?: string;
}
