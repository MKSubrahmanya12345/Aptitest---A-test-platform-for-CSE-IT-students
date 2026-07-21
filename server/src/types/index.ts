export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'student';
}

export interface Question {
  id: number;
  question: string;
  type: 'mcq' | 'numeric';
  category_id: number | null;
  difficulty: 'easy' | 'hard';
  explanation: string;
}

export interface TestSession {
  id: number;
  user_id: number;
  difficulty: 'easy' | 'hard';
  duration: number;
  score: number | null;
  percentage: number | null;
}