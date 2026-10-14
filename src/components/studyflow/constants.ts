import { CategorySpec, StudyTask } from '../../types';
import { format } from 'date-fns';

export const LOCAL_STORAGE_TASKS_KEY = 'studyflow_tasks_v1';
export const LOCAL_STORAGE_SUBJECTS_KEY = 'studyflow_subjects_v1';
export const LOCAL_STORAGE_ACTIVE_SUBJECT_KEY = 'studyflow_active_subject_v1';

export const DEFAULT_SUBJECTS: CategorySpec[] = [
  {
    id: 'math',
    name: 'Mathematics',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgLight: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
    badge: 'bg-indigo-500',
    borderClass: 'border-indigo-200 dark:border-indigo-900/60',
    icon: 'Calculator'
  },
  {
    id: 'physics',
    name: 'Physics',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgLight: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    badge: 'bg-emerald-500',
    borderClass: 'border-emerald-200 dark:border-emerald-900/60',
    icon: 'Atom'
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    color: 'text-blue-600 dark:text-blue-400',
    bgLight: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    badge: 'bg-blue-500',
    borderClass: 'border-blue-200 dark:border-blue-900/60',
    icon: 'Beaker'
  },
  {
    id: 'biology',
    name: 'Biology',
    color: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    badge: 'bg-amber-500',
    borderClass: 'border-amber-200 dark:border-amber-900/60',
    icon: 'Dna'
  },
  {
    id: 'language',
    name: 'Language',
    color: 'text-rose-600 dark:text-rose-400',
    bgLight: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    badge: 'bg-rose-500',
    borderClass: 'border-rose-200 dark:border-rose-900/60',
    icon: 'Languages'
  },
  {
    id: 'ict',
    name: 'ICT',
    color: 'text-slate-600 dark:text-slate-400',
    bgLight: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    badge: 'bg-slate-500',
    borderClass: 'border-slate-300 dark:border-slate-700',
    icon: 'Cpu'
  }
];

export const COLOR_PALETTE_PRESETS = [
  {
    id: 'indigo',
    name: 'Indigo',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgLight: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
    badge: 'bg-indigo-500',
    borderClass: 'border-indigo-200 dark:border-indigo-900/60'
  },
  {
    id: 'emerald',
    name: 'Emerald',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgLight: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    badge: 'bg-emerald-500',
    borderClass: 'border-emerald-200 dark:border-emerald-900/60'
  },
  {
    id: 'blue',
    name: 'Blue',
    color: 'text-blue-600 dark:text-blue-400',
    bgLight: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    badge: 'bg-blue-500',
    borderClass: 'border-blue-200 dark:border-blue-900/60'
  },
  {
    id: 'amber',
    name: 'Amber',
    color: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    badge: 'bg-amber-500',
    borderClass: 'border-amber-200 dark:border-amber-900/60'
  },
  {
    id: 'rose',
    name: 'Rose',
    color: 'text-rose-600 dark:text-rose-400',
    bgLight: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    badge: 'bg-rose-500',
    borderClass: 'border-rose-200 dark:border-rose-900/60'
  },
  {
    id: 'cyan',
    name: 'Cyan',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgLight: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
    badge: 'bg-cyan-500',
    borderClass: 'border-cyan-200 dark:border-cyan-900/60'
  },
  {
    id: 'violet',
    name: 'Violet',
    color: 'text-violet-600 dark:text-violet-400',
    bgLight: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    badge: 'bg-violet-500',
    borderClass: 'border-violet-200 dark:border-violet-900/60'
  },
  {
    id: 'slate',
    name: 'Slate',
    color: 'text-slate-600 dark:text-slate-400',
    bgLight: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    badge: 'bg-slate-500',
    borderClass: 'border-slate-300 dark:border-slate-700'
  }
];

export const getInitialDemoTasks = (): StudyTask[] => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  return [
    {
      id: 'demo-task-1',
      name: 'Calculus: Integration by Parts & Trigonometric Substitution',
      category: 'math',
      estMinutes: 60,
      actualMinutes: 45,
      completed: true,
      priority: 'high',
      createdAt: new Date().toISOString(),
      notes: 'Focus on practice questions from Chapter 7, odd numbered exercises 1-25.',
      date: todayStr,
      subTasks: [
        { id: 'sub-1', name: 'Review core integration formula sheet', completed: true },
        { id: 'sub-2', name: 'Solve 6 odd problems from section 7.2', completed: true },
        { id: 'sub-3', name: 'Check answer key and note tricky substitutions', completed: false }
      ]
    },
    {
      id: 'demo-task-2',
      name: 'Electromagnetism: Faraday & Lenz Law Numerical Problems',
      category: 'physics',
      estMinutes: 90,
      actualMinutes: 30,
      completed: false,
      priority: 'high',
      createdAt: new Date().toISOString(),
      notes: 'Derive induced EMF in rotating loop and review flux change graphs.',
      date: todayStr,
      subTasks: [
        { id: 'sub-4', name: 'Derive equation for magnetic flux derivative', completed: true },
        { id: 'sub-5', name: 'Complete textbook examples 12 to 16', completed: false },
        { id: 'sub-6', name: 'Sketch direction of induced current for 4 circuit loop cases', completed: false }
      ]
    },
    {
      id: 'demo-task-3',
      name: 'Organic Reaction Mechanisms: SN1 vs SN2 Comparison Matrix',
      category: 'chemistry',
      estMinutes: 45,
      actualMinutes: 0,
      completed: false,
      priority: 'medium',
      createdAt: new Date().toISOString(),
      notes: 'Make a summary table comparing solvent effects, leaving groups, and stereochemistry.',
      date: todayStr,
      subTasks: [
        { id: 'sub-7', name: 'Table of polar protic vs aprotic solvents', completed: false },
        { id: 'sub-8', name: 'Practice 4 stereochemical inversion diagrams', completed: false }
      ]
    },
    {
      id: 'demo-task-4',
      name: 'Academic Vocabulary & Active Recall Flashcard Session',
      category: 'language',
      estMinutes: 30,
      actualMinutes: 30,
      completed: true,
      priority: 'low',
      createdAt: new Date().toISOString(),
      notes: '50 flashcards reviewed with spaced repetition intervals.',
      date: todayStr,
      subTasks: [
        { id: 'sub-9', name: 'Review red/flagged deck (20 cards)', completed: true },
        { id: 'sub-10', name: 'Write 5 sample sentences using newly mastered terms', completed: true }
      ]
    }
  ];
};

export const MOTIVATIONAL_STUDY_TIPS = [
  {
    quote: "Action precedes motivation. Start with just 5 minutes of focused reading.",
    author: "Feynman Technique"
  },
  {
    quote: "You don't rise to the level of your goals, you fall to the level of your systems.",
    author: "James Clear"
  },
  {
    quote: "Deep work is the ability to focus without distraction on a cognitively demanding task.",
    author: "Cal Newport"
  },
  {
    quote: "Repetition is the mother of learning, the father of action, which makes it the architect of accomplishment.",
    author: "Zig Ziglar"
  },
  {
    quote: "Break large study goals into bite-sized missions. Each solved problem builds momentum.",
    author: "StudyFlow Focus"
  }
];
