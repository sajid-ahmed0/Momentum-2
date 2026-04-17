export interface Habit {
  id: string;
  name: string;
  description?: string;
  color: string;
  type: 'checkbox' | 'number' | 'duration';
  frequency: 'daily' | 'weekdays' | 'weekends';
  createdAt: number;
  uid: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  status: 'completed' | 'skipped' | 'partial';
  value?: number; // Stores count or total minutes
  uid: string;
  timestamp: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: number;
}

export interface TimeBlock {
  id: string;
  date: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  activity: string;
  category?: string;
  uid: string;
  timestamp: number;
}

export interface OverthinkingLog {
  id: string;
  date: string;
  intensity: number; // 1-10
  trigger?: string;
  thoughts?: string;
  uid: string;
  timestamp: number;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  mood?: string;
  lostControl?: string;
  trigger?: string;
  improvementTomorrow?: string;
  learningFromMistake?: string;
  uid: string;
  timestamp: number;
}

export interface UrgeLog {
  id: string;
  intent: string;
  willHelpFuture: boolean;
  outcome: 'resisted' | 'given_in' | 'returned_to_focus' | 'continued_anyway';
  durationSeconds: number;
  date: string;
  uid: string;
  timestamp: number;
}
