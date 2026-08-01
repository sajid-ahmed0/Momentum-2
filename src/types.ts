export interface QuickPreset {
  id: string;
  name: string;
  durationMinutes: number;
  color: string;
}

export const DEFAULT_PRESETS: QuickPreset[] = [
  { id: '1', name: '⚡ Deep Work', durationMinutes: 120, color: 'indigo' },
  { id: '2', name: '💪 Gym & Fitness', durationMinutes: 60, color: 'emerald' },
  { id: '3', name: '🥗 Lunch Break', durationMinutes: 45, color: 'amber' },
  { id: '4', name: '📚 Reading', durationMinutes: 30, color: 'purple' },
  { id: '5', name: '☕ Short Break', durationMinutes: 15, color: 'sky' },
];

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

export interface BlockTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface TimeBlock {
  id: string;
  date: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  activity: string;
  emoji?: string;    // e.g. '🎯', '⚡', '📚', '💪'
  color?: string;    // e.g. 'amber', 'indigo', 'emerald', 'rose', 'sky', 'purple', 'teal', 'zinc'
  subtasks?: BlockTask[];
  uid: string;
  timestamp: number;
}

export interface OverthinkingLog {
  id: string;
  date: string;
  intensity: number; // 1-10
  trigger?: string;
  thoughts?: string;
  sketchData?: string; // Base64 data URL for stylus sketch page
  uid: string;
  timestamp: number;
}

export interface DailyTask {
  id: string;
  task: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
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
  whyNotReason?: string;
  whatToDoInstead?: string;
  outcome: 'resisted' | 'given_in' | 'returned_to_focus' | 'continued_anyway';
  durationSeconds: number;
  date: string;
  uid: string;
  timestamp: number;
}

export interface Exam {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  uid: string;
  timestamp: number;
}
