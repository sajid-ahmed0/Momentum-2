// v1.0.2 - Triggering workflow test
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  format, 
  startOfToday, 
  subDays, 
  eachDayOfInterval, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  isSameMonth, 
  parseISO,
  isAfter,
  startOfDay,
  parse
} from 'date-fns';
import { 
  Plus, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Settings, 
  LogOut, 
  Target,
  Flame,
  Home,
  Layout,
  Clock,
  BookOpen,
  Zap,
  Activity,
  Menu,
  CheckCircle2,
  Trash2,
  MoreVertical,
  ChevronDown,
  Hash,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  Edit,
  Pen,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  Timer,
  Wind,
  ArrowRight,
  Download,
  Share2,
  ListTodo,
  GraduationCap,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, signInWithGoogle, logout, loginWithEmail, registerWithEmail, loginAnonymously } from './firebase';
import { Habit, HabitLog, TimeBlock, OverthinkingLog, DailyTask, JournalEntry, UrgeLog, Exam, BlockTask } from './types';
import { cn } from './lib/utils';
import { BreathingGuide } from './components/BreathingGuide';
import { TimeBlockingGrid, COLOR_OPTIONS } from './components/TimeBlockingGrid';

import { requestNotificationPermission, sendNotification, subscribeToPushNotifications } from './lib/notifications';

// --- Components ---

interface HabitCellProps {
  key?: React.Key;
  habit: Habit;
  log: HabitLog | undefined;
  onToggle: (id: string, d: Date) => void;
  onUpdateValue: (id: string, d: Date, v: number, c: boolean) => void;
  formatDuration: (m: number) => string;
  parseDuration: (s: string) => number;
  date: Date;
  zoom: number;
}

const HabitCell = ({ 
  habit, 
  log, 
  onToggle, 
  onUpdateValue,
  formatDuration,
  parseDuration,
  date,
  zoom
}: HabitCellProps) => {
  const [localValue, setLocalValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);
  const isCompleted = !!log;

  // Sync internal state with external log when not focused
  useEffect(() => {
    if (!isFocused) {
      if (habit.type === 'number') {
        setLocalValue(log?.value?.toString() ?? '');
      } else if (habit.type === 'duration') {
        setLocalValue(log?.value ? formatDuration(log.value) : '');
      }
    }
  }, [log?.value, habit.type, formatDuration, isFocused]);

  if (habit.type === 'checkbox') {
    return (
      <div 
        className="p-0 flex items-center justify-center h-full border-r border-high-line dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors"
        style={{ minWidth: `${140 * zoom}px` }}
      >
        <button
          onClick={() => onToggle(habit.id, date)}
          className={cn(
            "rounded-sm border-2 transition-all flex items-center justify-center",
            zoom < 0.7 ? "w-3 h-3 border" : "w-5 h-5",
            log?.status === 'completed' 
              ? "bg-emerald-500 border-emerald-500 text-white shadow-sm scale-110" 
              : log?.status === 'skipped'
              ? "bg-rose-500 border-rose-500 text-white shadow-sm scale-110"
              : "border-zinc-200 hover:border-zinc-300 bg-white dark:bg-zinc-900 dark:border-zinc-800"
          )}
        >
          {log?.status === 'completed' && <Check className={cn(zoom < 0.7 ? "w-2 h-2" : "w-3.5 h-3.5", "stroke-[3]")} />}
          {log?.status === 'skipped' && <X className={cn(zoom < 0.7 ? "w-2 h-2" : "w-3.5 h-3.5", "stroke-[3]")} />}
        </button>
      </div>
    );
  }

  const handleBlur = () => {
    setIsFocused(false);
    if (habit.type === 'number') {
      let val = parseInt(localValue);
      if (isNaN(val)) {
        onUpdateValue(habit.id, date, 0, false);
      } else {
        if (val < 1) val = 1;
        if (val > 10) val = 10;
        onUpdateValue(habit.id, date, val, true);
      }
    } else {
      const val = parseDuration(localValue);
      onUpdateValue(habit.id, date, val, val > 0);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // When focusing duration, maybe show the minutes raw? 
    // Or just keep it as is. Let's keep it but select all.
  };

  return (
    <div 
      className={cn(
        "p-0 flex items-center justify-start h-full border-r border-high-line dark:border-zinc-800 transition-all group",
        isFocused ? "ring-2 ring-inset ring-high-accent bg-white dark:bg-zinc-900 z-10" : "hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50"
      )}
      style={{ minWidth: `${140 * zoom}px` }}
    >
      <div className={cn("w-full flex items-baseline gap-1", zoom < 0.7 ? "px-1" : "px-3")}>
        <input 
          type="text"
          placeholder={zoom < 0.8 ? '' : (habit.type === 'number' ? 'Add count...' : 'Add time...')}
          className={cn(
            "w-full bg-transparent font-mono font-bold focus:outline-none placeholder:text-zinc-200 dark:placeholder:text-zinc-800",
            zoom < 0.7 ? "text-[8px] py-1" : "text-xs py-3",
            isCompleted ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-600"
          )}
          value={localValue}
          onFocus={handleFocus}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        {!isFocused && localValue && habit.type === 'number' && zoom > 0.6 && (
          <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-tighter">units</span>
        )}
      </div>
    </div>
  );
};

const Button = ({ 
  children, 
  variant = 'primary', 
  className, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' }) => {
  const variants = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm border border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:border-zinc-100',
    secondary: 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 shadow-sm dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800',
    ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50',
    success: 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50',
  };

  return (
    <button 
      className={cn(
        'px-4 py-2 rounded font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Modal = ({ isOpen, onClose, title, children }: { key?: React.Key; isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className="relative w-full max-w-md bg-white dark:bg-zinc-950 rounded shadow-2xl overflow-hidden border border-high-line dark:border-zinc-800 max-h-[90vh] flex flex-col"
      >
        <div className="px-6 py-4 border-b border-high-line dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <h3 className="text-sm font-bold font-sans tracking-tight uppercase text-zinc-400 dark:text-zinc-500">/ {title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
            <X className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

interface ExamCountdownProps {
  key?: React.Key;
  exam: Exam;
  onEdit: (exam: Exam) => void;
  onDelete: (id: string) => void;
}

const ExamCountdown = ({ exam, onEdit, onDelete }: ExamCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);

  useEffect(() => {
    const calculate = () => {
      const target = parse(`${exam.date} ${exam.time}`, 'yyyy-MM-dd HH:mm', new Date());
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ d, h, m, s });
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [exam.date, exam.time]);

  if (!timeLeft) return null;

  return (
    <div className="relative group overflow-hidden bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800 dark:border-zinc-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs font-black uppercase tracking-widest">{exam.title}</h3>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(exam)} className="p-1 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded">
            <Edit className="w-3 h-3 text-zinc-400" />
          </button>
          <button onClick={() => onDelete(exam.id)} className="p-1 hover:bg-red-900/30 dark:hover:bg-red-100 rounded">
            <Trash2 className="w-3 h-3 text-red-500/70 hover:text-red-500" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-2xl font-mono font-black">{timeLeft.d}</p>
          <p className="text-[8px] font-bold uppercase tracking-widest opacity-40">Days</p>
        </div>
        <div>
          <p className="text-2xl font-mono font-black">{timeLeft.h}</p>
          <p className="text-[8px] font-bold uppercase tracking-widest opacity-40">Hours</p>
        </div>
        <div>
          <p className="text-2xl font-mono font-black">{timeLeft.m}</p>
          <p className="text-[8px] font-bold uppercase tracking-widest opacity-40">Mins</p>
        </div>
        <div>
          <p className="text-2xl font-mono font-black animate-pulse">{timeLeft.s}</p>
          <p className="text-[8px] font-bold uppercase tracking-widest opacity-40">Secs</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-zinc-800 dark:border-zinc-200 flex items-center justify-between">
        <span className="text-[9px] font-mono font-black opacity-40 tracking-widest uppercase">
          {format(parseISO(exam.date), 'MMM dd, yyyy')} @ {exam.time}
        </span>
      </div>
    </div>
  );
};

// --- App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [overthinkingLogs, setOverthinkingLogs] = useState<OverthinkingLog[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [urgeLogs, setUrgeLogs] = useState<UrgeLog[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'habits' | 'tasks' | 'schedule' | 'overthinking' | 'journal' | 'urge'>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '') as any;
      const validTabs = ['home', 'habits', 'tasks', 'schedule', 'overthinking', 'journal', 'urge'];
      if (validTabs.includes(hash)) return hash;
    }
    return 'home';
  });
  const [globalAuthError, setGlobalAuthError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDefaults, setScheduleDefaults] = useState<{ startTime: string; endTime: string; date: string; block?: TimeBlock } | null>(null);
  const [modalColor, setModalColor] = useState<string>('indigo');
  const [modalEmoji, setModalEmoji] = useState<string>('');
  const [modalSubtasks, setModalSubtasks] = useState<BlockTask[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState<string>('');
  const [showOverthinkingModal, setShowOverthinkingModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingTimeBlock, setEditingTimeBlock] = useState<TimeBlock | null>(null);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [editingJournalEntry, setEditingJournalEntry] = useState<JournalEntry | null>(null);
  const [editingOverthinkingLog, setEditingOverthinkingLog] = useState<OverthinkingLog | null>(null);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editingUrgeLog, setEditingUrgeLog] = useState<UrgeLog | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  
  // Urge Surfing State
  const [urgeSession, setUrgeSession] = useState<{
    stage: 0 | 1 | 2 | 3 | 4;
    timer: number;
    intent: string;
    willHelpFuture: boolean | null;
    whyNotReason?: string;
    whatToDoInstead?: string;
    startTime: number;
    showBreather?: boolean;
  } | null>(null);

  const [newHabit, setNewHabit] = useState({ 
    name: '', 
    color: '#18181b', 
    frequency: 'daily' as const,
    type: 'checkbox' as const
  });
  const [expandedMonths, setExpandedMonths] = useState<string[]>([format(new Date(), 'MMMM yyyy')]);
  const [zoom, setZoom] = useState(1);
  const previousTabRef = useRef<'home' | 'habits' | 'tasks' | 'schedule' | 'overthinking' | 'journal' | 'urge'>(activeTab);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('momentum-app-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('momentum-app-theme', theme);
  }, [theme]);

  // Handle Browser Back Button & History Navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
      } else {
        // Fallback to hash or home
        const hash = window.location.hash.replace('#', '') as any;
        const validTabs = ['habits', 'tasks', 'schedule', 'overthinking', 'journal', 'urge'];
        if (validTabs.includes(hash)) {
          setActiveTab(hash);
        } else {
          setActiveTab('home');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update URL history when tab changes
  useEffect(() => {
    const hash = activeTab === 'home' ? '' : `#${activeTab}`;
    const currentHash = window.location.hash;
    
    // Only update if it's a real change and not already in sync
    if (currentHash !== hash) {
      if (activeTab === 'home') {
        // If we are navigating to home, we push home so user can potentially exit on next back
        window.history.pushState({ tab: 'home' }, '', window.location.pathname);
      } else {
        // Going to a sub-tab
        if (previousTabRef.current === 'home') {
          // From home -> Sub-tab: Push new entry
          window.history.pushState({ tab: activeTab }, '', hash);
        } else {
          // From sub-tab -> Another sub-tab: Replace current sub-tab entry
          // This ensures "Back" always returns to Home
          window.history.replaceState({ tab: activeTab }, '', hash);
        }
      }
    }
    previousTabRef.current = activeTab;
  }, [activeTab]);

  // Generate all months for the current year
  const monthsOfYear = useMemo(() => {
    const start = startOfMonth(new Date(new Date().getFullYear(), 0, 1));
    const end = startOfToday(); // Or end of year, but today is more practical
    
    const months = [];
    let current = startOfMonth(end);
    const firstMonth = start;
    
    while (!isAfter(firstMonth, current)) {
      months.push(current);
      current = subDays(current, 1);
      current = startOfMonth(current);
    }
    return months;
  }, []);

  // Helper to get days for a specific month
  const getDaysForMonth = (monthDate: Date) => {
    return eachDayOfInterval({
      start: startOfMonth(monthDate),
      end: isSameMonth(monthDate, new Date()) ? startOfToday() : endOfMonth(monthDate),
    }).reverse();
  };

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => 
      prev.includes(monthKey) ? prev.filter(m => m !== monthKey) : [...prev, monthKey]
    );
  };

  useEffect(() => {
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(!!isStandaloneMode);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // For iOS or browsers that don't support beforeinstallprompt
      setShowInstallHelp(true);
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      setGlobalAuthError(null);
      await loginAnonymously();
    } catch (err: any) {
      console.error("Anonymous Sign-in Error:", err);
      const errorCode = err.code || 'unknown-error';
      
      if (err.code === 'auth/admin-restricted-operation') {
        setGlobalAuthError(`[${errorCode}] Anonymous login restricted. Check Firebase Authentication > Sign-in method and enable Anonymous.`);
      } else if (err.code === 'auth/unauthorized-domain') {
        setGlobalAuthError(`[${errorCode}] Domain blocked. You must add "sajid-ahmed0.github.io" to Firebase > Authentication > Settings > Authorized domains.`);
      } else {
        setGlobalAuthError(`[${errorCode}] ${err.message || 'Failed to start a guest session'}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        await handleAnonymousSignIn();
      } else {
        setUser(u);
        setGlobalAuthError(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const qHabits = query(collection(db, 'habits'), where('uid', '==', user.uid), orderBy('createdAt', 'asc'));
    const unsubHabits = onSnapshot(qHabits, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Habit[];
      setHabits(data);
    });

    const qLogs = query(collection(db, 'habitLogs'), where('uid', '==', user.uid));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HabitLog[];
      setLogs(data);
    });

    const qBlocks = query(collection(db, 'timeBlocks'), where('uid', '==', user.uid), orderBy('startTime', 'asc'));
    const unsubBlocks = onSnapshot(qBlocks, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TimeBlock[];
      setTimeBlocks(data);
    });

    const qOverthinking = query(collection(db, 'overthinkingLogs'), where('uid', '==', user.uid), orderBy('timestamp', 'desc'));
    const unsubOverthinking = onSnapshot(qOverthinking, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as OverthinkingLog[];
      setOverthinkingLogs(data);
    });

    const qJournal = query(collection(db, 'journalEntries'), where('uid', '==', user.uid), orderBy('timestamp', 'desc'));
    const unsubJournal = onSnapshot(qJournal, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as JournalEntry[];
      setJournalEntries(data);
    });

    const qTasks = query(collection(db, 'dailyTasks'), where('uid', '==', user.uid), orderBy('timestamp', 'desc'));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DailyTask[];
      setTasks(data);
    });

    const qUrge = query(collection(db, 'urgeLogs'), where('uid', '==', user.uid), orderBy('timestamp', 'desc'));
    const unsubUrge = onSnapshot(qUrge, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UrgeLog[];
      setUrgeLogs(data);
    });

    const qExams = query(collection(db, 'exams'), where('uid', '==', user.uid), orderBy('date', 'asc'));
    const unsubExams = onSnapshot(qExams, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Exam[];
      setExams(data);
    });

    return () => {
      unsubHabits();
      unsubLogs();
      unsubBlocks();
      unsubOverthinking();
      unsubJournal();
      unsubTasks();
      unsubUrge();
      unsubExams();
    };
  }, [user]);

  // Notification Checker
  useEffect(() => {
    if (!user || notificationPermission !== 'granted') return;

    const checkNotifications = () => {
      const now = new Date();
      const todayKey = format(now, 'yyyy-MM-dd');
      
      // 1. DAILY COUNTDOWN CHECK
      const dailyKey = `daily_countdown_${todayKey}`;
      if (!localStorage.getItem(dailyKey)) {
        // Find the closest upcoming exam
        const upcomingExams = exams
          .map(e => ({ ...e, dateObj: parse(e.date, 'yyyy-MM-dd', new Date()) }))
          .filter(e => e.dateObj > now)
          .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

        if (upcomingExams.length > 0) {
          const nextExam = upcomingExams[0];
          const daysLeft = Math.ceil((nextExam.dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          sendNotification(`Milestone Countdown: ${nextExam.title}`, {
            body: `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} remaining until your exam. Stay focused!`,
            tag: 'daily-countdown',
            icon: '/manifest.json'
          });
          localStorage.setItem(dailyKey, 'true');
        }
      }

      // 2. IMMEDIATE REMINDERS (within 30 mins)
      const thirtyMinsFromNow = new Date(now.getTime() + 30 * 60 * 1000);
      
      exams.forEach(exam => {
        try {
          const examDate = parse(`${exam.date} ${exam.time}`, 'yyyy-MM-dd HH:mm', new Date());
          if (examDate > now && examDate <= thirtyMinsFromNow) {
            const notifiedKey = `notified_exam_${exam.id}`;
            if (!localStorage.getItem(notifiedKey)) {
              sendNotification(`URGENT: ${exam.title}`, {
                body: `Starts in less than 30 minutes! Time to lock in.`,
                tag: exam.id,
                requireInteraction: true
              });
              localStorage.setItem(notifiedKey, 'true');
            }
          }
        } catch (e) { console.error('Date parse error', e); }
      });

      tasks.forEach(task => {
        if (!task.completed && task.time) {
          try {
            const taskDate = parse(`${task.date} ${task.time}`, 'yyyy-MM-dd HH:mm', new Date());
            if (taskDate > now && taskDate <= thirtyMinsFromNow) {
              const notifiedKey = `notified_task_${task.id}`;
              if (!localStorage.getItem(notifiedKey)) {
                sendNotification(`Task Starting: ${task.task}`, {
                  body: `Scheduled for ${task.time}.`,
                  tag: task.id
                });
                localStorage.setItem(notifiedKey, 'true');
              }
            }
          } catch (e) { console.error('Date parse error', e); }
        }
      });
    };

    // Run initially for daily check
    checkNotifications();

    const checkInterval = setInterval(checkNotifications, 60000); // Check every minute for timed reminders
    return () => clearInterval(checkInterval);
  }, [exams, tasks, user, notificationPermission]);

  const handleRequestNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(granted ? 'granted' : 'denied');
    
    if (granted && user) {
      const subscription = await subscribeToPushNotifications();
      if (subscription) {
        // Save to Firestore for the server to use
        const subData = {
          uid: user.uid,
          subscription: subscription.toJSON(),
          updatedAt: Date.now()
        };
        
        try {
          // Check if already exists for this device (simplified: just add)
          await addDoc(collection(db, 'pushSubscriptions'), subData);
          
          sendNotification("Push Notifications Active", {
            body: "You'll now receive daily milestone updates at 7 AM even if the app is closed.",
          });
        } catch (e) {
          console.error("Error saving subscription:", e);
        }
      }
    }
  };

  const formatTime12h = (time: string) => {
    if (!time) return '';
    try {
      return format(parse(time, 'HH:mm', new Date()), 'h:mm a');
    } catch {
      return time;
    }
  };

  useEffect(() => {
    if (showScheduleModal) {
      const activeBlock = editingTimeBlock || scheduleDefaults?.block;
      setModalColor(activeBlock?.color || 'indigo');
      setModalEmoji(activeBlock?.emoji || '');
      setModalSubtasks(activeBlock?.subtasks ? JSON.parse(JSON.stringify(activeBlock.subtasks)) : []);
      setNewSubtaskInput('');
    }
  }, [showScheduleModal, editingTimeBlock, scheduleDefaults]);

  const handleToggleSubtask = async (blockId: string, subtaskId: string) => {
    const targetBlock = timeBlocks.find(b => b.id === blockId);
    if (!targetBlock || !targetBlock.subtasks) return;

    const updatedSubtasks = targetBlock.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    try {
      await updateDoc(doc(db, 'timeBlocks', blockId), {
        subtasks: updatedSubtasks
      });
    } catch (err) {
      console.error("Error toggling subtask:", err);
    }
  };

  const handleAddTimeBlock = async (data: { startTime: string; endTime: string; activity: string; date?: string; color?: string; emoji?: string; subtasks?: BlockTask[] }) => {
    if (!user) return;
    setShowScheduleModal(false);
    setScheduleDefaults(null);
    try {
      await addDoc(collection(db, 'timeBlocks'), {
        activity: data.activity,
        emoji: data.emoji !== undefined ? data.emoji : (modalEmoji || ''),
        startTime: data.startTime,
        endTime: data.endTime,
        color: data.color || modalColor || 'indigo',
        subtasks: data.subtasks || modalSubtasks || [],
        date: data.date || scheduleDefaults?.date || format(startOfToday(), 'yyyy-MM-dd'),
        uid: user.uid,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditTimeBlock = async (id: string, data: { startTime: string; endTime: string; activity: string; date?: string; color?: string; emoji?: string; subtasks?: BlockTask[] }) => {
    setShowScheduleModal(false);
    setEditingTimeBlock(null);
    setScheduleDefaults(null);
    try {
      await updateDoc(doc(db, 'timeBlocks', id), {
        activity: data.activity,
        emoji: data.emoji !== undefined ? data.emoji : (modalEmoji || ''),
        startTime: data.startTime,
        endTime: data.endTime,
        date: data.date,
        color: data.color || modalColor || 'indigo',
        subtasks: data.subtasks !== undefined ? data.subtasks : modalSubtasks,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTimeBlock = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'timeBlocks', id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddOverthinking = async (data: { intensity: number, trigger: string, thoughts: string }) => {
    if (!user) return;
    // Close modal immediately
    setShowOverthinkingModal(false);
    try {
      await addDoc(collection(db, 'overthinkingLogs'), {
        ...data,
        date: format(startOfToday(), 'yyyy-MM-dd'),
        uid: user.uid,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOverthinking = async (id: string, data: { intensity: number, trigger: string, thoughts: string }) => {
    // Close modal immediately
    setShowOverthinkingModal(false);
    setEditingOverthinkingLog(null);
    try {
      await updateDoc(doc(db, 'overthinkingLogs', id), {
        ...data,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Error updating log:', error);
    }
  };

  const handleDeleteOverthinking = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'overthinkingLogs', id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = async (data: { task: string, time?: string, date?: string }) => {
    if (!user) return;
    // Close modal immediately
    setShowTaskModal(false);
    try {
      await addDoc(collection(db, 'dailyTasks'), {
        task: data.task,
        time: data.time || "",
        date: data.date || format(startOfToday(), 'yyyy-MM-dd'),
        completed: false,
        uid: user.uid,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTask = async (id: string, data: Partial<DailyTask>) => {
    // Close modal immediately
    setShowTaskModal(false);
    setEditingTask(null);
    try {
      await updateDoc(doc(db, 'dailyTasks', id), {
        ...data,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'dailyTasks', id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddExam = async (data: { title: string, date: string, time: string }) => {
    if (!user) return;
    // Close modal immediately
    setShowExamModal(false);
    try {
      await addDoc(collection(db, 'exams'), {
        ...data,
        uid: user.uid,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateExam = async (id: string, data: Partial<Exam>) => {
    // Close modal immediately
    setShowExamModal(false);
    setEditingExam(null);
    try {
      await updateDoc(doc(db, 'exams', id), {
        ...data,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExam = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'exams', id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTask = async (task: DailyTask) => {
    try {
      await updateDoc(doc(db, 'dailyTasks', task.id), {
        completed: !task.completed
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveJournalEntry = async (data: { 
    title: string, 
    content: string, 
    mood?: string,
    lostControl?: string,
    trigger?: string,
    improvementTomorrow?: string,
    learningFromMistake?: string
  }) => {
    if (!user) return;
    // Close modal immediately
    setShowJournalModal(false);
    setEditingJournalEntry(null);
    try {
      if (editingJournalEntry) {
        await updateDoc(doc(db, 'journalEntries', editingJournalEntry.id), {
          ...data,
          timestamp: Date.now()
        });
      } else {
        await addDoc(collection(db, 'journalEntries'), {
          ...data,
          date: format(startOfToday(), 'yyyy-MM-dd'),
          uid: user.uid,
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Urge Surfing Logic ---

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (urgeSession && urgeSession.timer > 0) {
      interval = setInterval(() => {
        setUrgeSession(prev => {
          if (!prev) return null;
          if (prev.timer <= 1) {
            if (prev.stage === 1) return { ...prev, stage: 2, timer: 0 };
            if (prev.stage === 3) return { ...prev, stage: 4, timer: 0 };
          }
          return { ...prev, timer: prev.timer - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [urgeSession]);

  const startUrgeSession = () => {
    setUrgeSession({
      stage: 1,
      timer: 0,
      intent: '',
      willHelpFuture: null,
      whyNotReason: '',
      whatToDoInstead: '',
      startTime: Date.now()
    });
  };

  const handleUrgeOutcome = (outcome: UrgeLog['outcome']) => {
    if (!urgeSession) return;

    // Capture session data before clearing
    const sessionData = { ...urgeSession };
    
    // Optimistic UI: Close the session immediately
    setUrgeSession(null);

    if (!user) return;
    
    // Perform data logging in background
    addDoc(collection(db, 'urgeLogs'), {
      intent: sessionData.intent,
      willHelpFuture: sessionData.willHelpFuture ?? false,
      whyNotReason: sessionData.whyNotReason || '',
      whatToDoInstead: sessionData.whatToDoInstead || '',
      outcome,
      durationSeconds: Math.floor((Date.now() - sessionData.startTime) / 1000),
      date: format(startOfToday(), 'yyyy-MM-dd'),
      uid: user.uid,
      timestamp: Date.now()
    }).catch(err => {
      console.error("Failed to log urge outcome:", err);
    });
  };

  const formatDurationSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleLevelUp = () => {
    if (!urgeSession) return;
    setUrgeSession({
      ...urgeSession,
      stage: 3,
      timer: 120 // 2 minutes
    });
  };

  const handleDeleteJournalEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'journalEntries', id));
    } catch (err) {
      console.error(err);
    }
  };

  const getStats = () => {
    const today = format(startOfToday(), 'yyyy-MM-dd');
    const todayLogs = logs.filter(l => l.date === today && l.status === 'completed');
    const habitComp = habits.length > 0 ? Math.round((todayLogs.length / habits.length) * 100) : 0;
    
    // Simple next/current task
    const now = format(new Date(), 'HH:mm');
    const currentBlock = timeBlocks.find(b => b.startTime <= now && b.endTime >= now);
    const nextBlock = timeBlocks.find(b => b.startTime > now);
    
    const todayUrgeLogs = urgeLogs.filter(l => l.date === today);
    const urgeSuccess = todayUrgeLogs.length > 0 
      ? Math.round((todayUrgeLogs.filter(l => l.outcome === 'resisted' || l.outcome === 'returned_to_focus').length / todayUrgeLogs.length) * 100) 
      : 0;

    return { habitComp, currentBlock, nextBlock, urgeSuccess, todayUrgeCount: todayUrgeLogs.length };
  };

  const quotes = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
    { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
    { text: "Your focus determines your reality.", author: "Qui-Gon Jinn" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
    { text: "The master has failed more times than the beginner has even tried.", author: "Stephen McCranie" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King" },
    { text: "Hard work betrays none.", author: "Hachiman Hikigaya" },
    { text: "Suffer the pain of discipline or suffer the pain of regret.", author: "Jim Rohn" },
    { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
    { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
    { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" }
  ];

  // Daily quote selection based on date (rotates every 24h)
  const quote = useMemo(() => {
    const today = format(startOfToday(), 'yyyyMMdd');
    const dayAsNumber = parseInt(today);
    const index = dayAsNumber % quotes.length;
    return quotes[index];
  }, [quotes.length]);

  const { habitComp, currentBlock, nextBlock, urgeSuccess, todayUrgeCount } = getStats();

  const navItems = [
    { id: 'tasks', icon: ListTodo, label: 'Tasks' },
    { id: 'schedule', icon: Clock, label: 'Schedule' },
    { id: 'overthinking', icon: Activity, label: 'Thinking' },
    { id: 'habits', icon: Flame, label: 'Habits' },
    { id: 'journal', icon: BookOpen, label: 'Journal' },
  ];

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newHabit.name) return;

    // Close modal immediately
    setShowAddModal(false);
    const habitData = { ...newHabit };
    // Clear draft state
    setNewHabit({ name: '', color: '#18181b', frequency: 'daily', type: 'checkbox' });

    try {
      await addDoc(collection(db, 'habits'), {
        ...habitData,
        uid: user.uid,
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const updateHabitValue = async (habitId: string, date: Date, value: number, isCompleted: boolean) => {
    if (!user) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const logId = `${user.uid}_${habitId}_${dateStr}`;

    try {
      if (!isCompleted && value === 0) {
        // If it's a number/duration and we cleared it, delete log
        const existing = logs.find(l => l.habitId === habitId && l.date === dateStr);
        if (existing) await deleteDoc(doc(db, 'habitLogs', existing.id));
      } else {
        await setDoc(doc(db, 'habitLogs', logId), {
          habitId,
          date: dateStr,
          status: 'completed',
          value,
          uid: user.uid,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleHabit = async (habitId: string, date: Date) => {
    if (!user) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingLog = logs.find(l => l.habitId === habitId && l.date === dateStr);

    try {
      const logId = `${user.uid}_${habitId}_${dateStr}`;
      if (!existingLog) {
        // null -> completed
        await setDoc(doc(db, 'habitLogs', logId), {
          habitId,
          date: dateStr,
          status: 'completed',
          uid: user.uid,
          timestamp: Date.now(),
        });
      } else if (existingLog.status === 'completed') {
        // completed -> skipped
        await updateDoc(doc(db, 'habitLogs', logId), {
          status: 'skipped',
          timestamp: Date.now(),
        });
      } else {
        // skipped -> null (delete)
        await deleteDoc(doc(db, 'habitLogs', logId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatDurationValue = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
  };

  const parseDurationString = (str: string) => {
    // Basic parser for "4:45", "5", "5h", "45m"
    const trimmed = str.trim().toLowerCase();
    if (!trimmed) return 0;

    const hMatch = trimmed.match(/(\d+)h/i);
    const mMatch = trimmed.match(/(\d+)m/i);
    const colonMatch = trimmed.match(/(\d+)[:.](\d+)/);
    
    let total = 0;
    if (colonMatch) {
      total = parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
    } else if (hMatch || mMatch) {
      if (hMatch) total += parseInt(hMatch[1]) * 60;
      if (mMatch) total += parseInt(mMatch[1]);
    } else {
      // If it's just a number like "5", assume hours
      const num = parseFloat(trimmed);
      if (!isNaN(num)) total = Math.round(num * 60);
    }
    return total;
  };

  const handleDeleteHabit = async (id: string, name: string) => {
    // Note: We're removing window.confirm as it can be blocked in iframe environments.
    // In a production app, we would use a custom modal here.
    try {
      await deleteDoc(doc(db, 'habits', id));
    } catch (err) {
      console.error(err);
    }
  };

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthenticating(true);
    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
      setShowAuthModal(false);
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setAuthError('Email or password is incorrect');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('User already exists. Please sign in');
        setAuthMode('login');
      } else {
        setAuthError(err.message);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setIsAuthenticating(true);
    try {
      await signInWithGoogle();
      setShowAuthModal(false);
    } catch (err: any) {
      console.error("Google Sign-in Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in window was closed');
      } else if (err.code === 'auth/unauthorized-domain') {
        setAuthError('This domain is not authorized in Firebase. Please add your GitHub domain to "Authorized domains" in Firebase Console.');
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('Sign-in popup was blocked. Please enable popups for this site in your browser settings (look for a popup blocker icon in your address bar), or click "Open in New Tab" at the top right of your preview window to run in a standalone tab.');
      } else {
        setAuthError(err.message || 'Failed to sign in with Google');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
      <div className="w-1.5 h-1.5 bg-zinc-900 rounded-full animate-ping dark:bg-zinc-100" />
    </div>
  );

  const calculateStreak = (habitId: string) => {
    let streak = 0;
    let checkDate = startOfToday();
    
    while (true) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      const log = logs.find(l => l.habitId === habitId && l.date === dateStr && l.status === 'completed');
      if (log) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const urgeLogsByDate = urgeLogs.reduce((acc, log) => {
    if (!acc[log.date]) acc[log.date] = [];
    acc[log.date].push(log);
    return acc;
  }, {} as Record<string, UrgeLog[]>);

  const urgeHistoryDates = Object.keys(urgeLogsByDate)
    .filter(d => d !== format(new Date(), 'yyyy-MM-dd'))
    .sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex h-screen bg-white text-zinc-900 font-sans selection:bg-high-accent/10 overflow-hidden dark:bg-zinc-950 dark:text-zinc-100 transition-colors duration-300">
      {/* Sidebar - Aside */}
      <aside className="w-64 bg-zinc-50/50 border-r border-high-line flex flex-col p-8 shrink-0 hidden lg:flex dark:bg-zinc-900/50 dark:border-zinc-800">
        <div className="text-lg font-black tracking-tighter mb-12 flex items-center justify-between">
          <button 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none"
          >
            <div className="w-6 h-6 bg-zinc-900 rounded-sm flex items-center justify-center text-white dark:bg-zinc-100 dark:text-zinc-900">
              <Flame className="w-4 h-4" />
            </div>
            MOMENTUM
          </button>
          <button 
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
        
        <div className="space-y-10 flex-1 overflow-y-auto pr-2 scrollbar-none">
          <div className="nav-group">
            <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-5">NAVIGATION</h5>
            <div className="space-y-1">
              <button 
                onClick={() => setActiveTab('tasks')}
                className={cn(
                  "w-full flex items-center px-3 py-2 rounded transition-all text-xs font-bold uppercase tracking-tight",
                  activeTab === 'tasks' 
                    ? "bg-zinc-900 text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900" 
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <ListTodo className="w-4 h-4 mr-3" /> Daily Tasks
              </button>
              <button 
                onClick={() => setActiveTab('schedule')}
                className={cn(
                  "w-full flex items-center px-3 py-2 rounded transition-all text-xs font-bold uppercase tracking-tight",
                  activeTab === 'schedule' 
                    ? "bg-zinc-900 text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900" 
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <Clock className="w-4 h-4 mr-3" /> Schedule
              </button>
              <button 
                onClick={() => setActiveTab('overthinking')}
                className={cn(
                  "w-full flex items-center px-3 py-2 rounded transition-all text-xs font-bold uppercase tracking-tight",
                  activeTab === 'overthinking' 
                    ? "bg-zinc-900 text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900" 
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <Activity className="w-4 h-4 mr-3" /> Overthinking
              </button>
              <button 
                onClick={() => setActiveTab('habits')}
                className={cn(
                  "w-full flex items-center px-3 py-2 rounded transition-all text-xs font-bold uppercase tracking-tight",
                  activeTab === 'habits' 
                    ? "bg-zinc-900 text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900" 
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <Layout className="w-4 h-4 mr-3" /> Habits
              </button>
              <button 
                onClick={() => setActiveTab('journal')}
                className={cn(
                  "w-full flex items-center px-3 py-2 rounded transition-all text-xs font-bold uppercase tracking-tight",
                  activeTab === 'journal' 
                    ? "bg-zinc-900 text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900" 
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <BookOpen className="w-4 h-4 mr-3" /> Daily Journal
              </button>
              <button 
                onClick={() => setActiveTab('urge')}
                className={cn(
                  "w-full flex items-center px-3 py-2 rounded transition-all text-xs font-bold uppercase tracking-tight",
                  activeTab === 'urge' 
                    ? "bg-amber-500 text-white shadow-lg dark:bg-amber-500 dark:text-white" 
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <Zap className="w-4 h-4 mr-3" /> Circuit Breaker
              </button>
            </div>
          </div>

          <div className="nav-group">
            <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-5">HABIT STATS</h5>
            <div className="space-y-4">
              {habits.map(h => {
                const streak = calculateStreak(h.id);
                return (
                  <div key={h.id} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-zinc-700 truncate dark:text-zinc-300">{h.name}</span>
                      <span className="text-[10px] font-mono text-high-accent font-bold bg-high-accent/5 px-1.5 rounded">{streak}d</span>
                    </div>
                    <div className="h-1 bg-zinc-100 rounded-full overflow-hidden dark:bg-zinc-800">
                      <div 
                        className="h-full bg-zinc-900 transition-all duration-500 dark:bg-zinc-100" 
                        style={{ width: `${Math.min((streak / 21) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-high-line dark:border-zinc-800">
          {!user || user.isAnonymous ? (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="w-full flex items-center justify-between group py-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded border border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                  <Plus className="w-3 h-3 text-zinc-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">Sign In / Sync Data</p>
                  <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Guest Session</p>
                </div>
              </div>
              <ArrowRight className="w-3 h-3 text-zinc-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <img 
                  src={user.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                  alt="" 
                  className="w-8 h-8 rounded border border-high-line dark:border-zinc-800" 
                  referrerPolicy="no-referrer" 
                />
                <div className="truncate">
                  <p className="text-[11px] font-bold leading-none truncate mb-1 uppercase tracking-tight dark:text-zinc-200">{user.displayName || 'Momentum User'}</p>
                  <p className="text-[10px] text-zinc-400 truncate tracking-tight dark:text-zinc-500">{user.email || 'Synced'}</p>
                </div>
              </div>
              <button 
                onClick={async () => {
                   await logout();
                   // Signing out will trigger the anonymous login effect in the background
                }} 
                className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors w-full text-left"
              >
                Sign Out
              </button>
            </>
          )}

          {!isStandalone && (
            <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-900">
              <button 
                onClick={handleInstallClick}
                className="w-full flex items-center justify-between group py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shadow-lg shadow-black/10 dark:shadow-white/5">
                    <Download className="w-3.5 h-3.5 text-white dark:text-zinc-900" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100 transition-colors">Install App</p>
                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Use as Native</p>
                  </div>
                </div>
                <ArrowRight className="w-3 h-3 text-zinc-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
              </button>
            </div>
          )}
          
          <div className="mt-8 pt-6 border-t border-zinc-50 dark:border-zinc-900 opacity-40">
            <p className="text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400">
              Developed by <span className="text-zinc-900 dark:text-zinc-100 italic">Sajid Ahmed</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 relative">
        <header className="h-20 border-b border-high-line flex items-center justify-between px-6 lg:px-10 bg-white sticky top-0 z-20 dark:bg-zinc-950 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <ChevronDown className="lg:block hidden w-4 h-4 text-zinc-400" />
            <h1 className="text-xs lg:text-sm font-bold uppercase tracking-tighter leading-none pt-0.5 dark:text-white">
              {activeTab === 'home' ? 'Momentum Dashboard' :
               activeTab === 'habits' ? 'Habit Database' : 
               activeTab === 'schedule' ? 'Daily Schedule' : 
               activeTab === 'overthinking' ? 'Overthinking Tracker' : 
               activeTab === 'journal' ? 'Daily Journal' : 
               activeTab === 'tasks' ? 'Daily Tasks' : 'The Circuit Breaker'}
            </h1>
            {activeTab === 'habits' && (
              <span className="ml-2 px-1.5 py-0.5 bg-zinc-100 rounded text-[10px] font-mono font-bold text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">{habits.length}</span>
            )}
          </div>
          <div className="flex items-center gap-6">
            <AnimatePresence mode="wait">
              <motion.div 
                key="zoom-controls"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-1.5 p-1 bg-zinc-50 border border-high-line rounded shadow-inner dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none"
              >
                <button 
                  onClick={() => setZoom(prev => Math.max(0.1, Math.round((prev - 0.1) * 10) / 10))}
                  disabled={zoom <= 0.1}
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-zinc-400 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 disabled:opacity-30"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
                <span className="text-[9px] font-mono font-bold text-zinc-400 px-1 w-8 text-center">{Math.round(zoom * 100)}%</span>
                <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
                <button 
                  onClick={() => setZoom(prev => Math.min(1.0, Math.round((prev + 0.1) * 10) / 10))}
                  disabled={zoom >= 1.0}
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-zinc-400 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 disabled:opacity-30"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </motion.div>
            </AnimatePresence>
            
            <div className="flex items-center gap-1.5">
                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-[10px] lg:text-[11px] uppercase font-bold text-zinc-400 tracking-tight">System Online</span>
              </div>

            <AnimatePresence mode="wait">
              {activeTab === 'home' ? null : 
               activeTab === 'habits' ? (
                <motion.div
                  key="add-habit-btn"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Button onClick={() => setShowAddModal(true)} className="h-9 py-0 rounded px-4 text-xs tracking-tight font-bold">
                    <Plus className="w-4 h-4" /> Add Property
                  </Button>
                </motion.div>
              ) : activeTab === 'schedule' ? (
                <motion.div
                  key="add-block-btn"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Button onClick={() => setShowScheduleModal(true)} className="h-9 py-0 rounded px-4 text-xs tracking-tight font-bold">
                    <Plus className="w-4 h-4" /> Add Block
                  </Button>
                </motion.div>
              ) : activeTab === 'overthinking' ? (
                <motion.div
                  key="log-overthinking-btn"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Button onClick={() => setShowOverthinkingModal(true)} className="h-9 py-0 rounded px-4 text-xs tracking-tight font-bold">
                    <Plus className="w-4 h-4" /> Log Session
                  </Button>
                </motion.div>
              ) : activeTab === 'journal' ? (
                <motion.div
                  key="write-journal-btn"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Button onClick={() => setShowJournalModal(true)} className="h-9 py-0 rounded px-4 text-xs tracking-tight font-bold">
                    <Pen className="w-3.5 h-3.5" /> Write Entry
                  </Button>
                </motion.div>
              ) : activeTab === 'tasks' ? (
                <motion.div
                  key="add-task-btn"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Button onClick={() => { setEditingTask(null); setShowTaskModal(true); }} className="h-9 py-0 rounded px-4 text-xs tracking-tight font-bold underline decoration-zinc-900/10 dark:decoration-white/10 underline-offset-4">
                    <Plus className="w-4 h-4" /> Add Task
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="trigger-pause-btn"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Button 
                    onClick={() => startUrgeSession()} 
                    className="h-9 py-0 rounded px-4 text-xs tracking-tight font-bold bg-amber-500 border-amber-500 hover:bg-amber-600 text-white dark:bg-amber-500 dark:text-white"
                    disabled={!!urgeSession && urgeSession.stage > 0}
                  >
                    <Zap className="w-4 h-4" /> Trigger Pause
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-white dark:bg-zinc-950 custom-scrollbar relative pb-24 lg:pb-0">
          <AnimatePresence>
            {globalAuthError && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-red-50 dark:bg-red-500/10 border-b border-red-100 dark:border-red-900/50 px-10 py-3 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tight leading-tight">
                    {globalAuthError}
                  </p>
                </div>
                <button 
                  onClick={handleAnonymousSignIn}
                  className="px-3 py-1 bg-red-600 text-white rounded text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors shrink-0"
                >
                  Retry Guest Session
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeTab === 'home' ? (
              <motion.div 
                key="home-tab"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="p-10 max-w-6xl mx-auto"
              >
                <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-600 mb-4 block">System Status: Active</span>
                    <h2 className="text-5xl font-black tracking-tighter uppercase dark:text-zinc-100 mb-4">Welcome Back, {(!user || user.isAnonymous) ? 'Protege' : user.displayName?.split(' ')[0]}</h2>
                    <div className="h-0.5 w-24 bg-zinc-900 dark:bg-zinc-100" />
                  </div>
                  
                  {notificationPermission !== 'granted' && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-6 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-2xl flex items-center gap-6 shadow-2xl border border-zinc-800 dark:border-zinc-200"
                    >
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Mobile Updates</p>
                        <p className="text-sm font-bold tracking-tight">Enable Milestone Reminders</p>
                      </div>
                      <Button 
                        onClick={handleRequestNotifications} 
                        className="bg-emerald-500 border-emerald-500 hover:bg-emerald-600 text-white h-10 px-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                      >
                        Enable Now
                      </Button>
                    </motion.div>
                  )}
                </div>

                {/* --- Milestones Section --- */}
                <div className="mb-16">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-1">Target Tracking</h4>
                      <h3 className="text-xl font-black uppercase tracking-tighter dark:text-zinc-100">Upcoming Milestones</h3>
                    </div>
                    <Button 
                      variant="secondary" 
                      onClick={() => { setEditingExam(null); setShowExamModal(true); }}
                      className="text-[10px] font-bold uppercase tracking-widest px-4 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 h-9"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Milestone
                    </Button>
                  </div>

                  {exams.length === 0 ? (
                    <div className="p-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700">
                      <GraduationCap className="w-12 h-12 mb-4 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-[10px]">No active countdowns</p>
                      <button 
                        onClick={() => { setEditingExam(null); setShowExamModal(true); }}
                        className="mt-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        Set your first exam goal
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {exams.map(exam => (
                        <ExamCountdown 
                          key={exam.id} 
                          exam={exam} 
                          onEdit={(e) => { setEditingExam(e); setShowExamModal(true); }}
                          onDelete={handleDeleteExam}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                  <div className="col-span-1 md:col-span-2 p-10 bg-zinc-900 text-white rounded-2xl shadow-2xl relative overflow-hidden dark:bg-zinc-100 dark:text-zinc-900">
                     <div className="relative z-10">
                        <p className="text-2xl font-serif italic mb-6 leading-relaxed">"{quote.text}"</p>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-60">— {quote.author}</p>
                     </div>
                     <Activity className="absolute bottom-[-20px] right-[-20px] w-64 h-64 opacity-[0.03] rotate-12" />
                  </div>
                  
                  <div className="p-10 bg-emerald-600 text-white rounded-2xl shadow-xl flex flex-col justify-between group cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setActiveTab('tasks')}>
                    <div>
                      <ListTodo className="w-8 h-8 mb-4 text-emerald-100" />
                      <h3 className="font-black uppercase tracking-tight text-xl">Daily Tasks</h3>
                    </div>
                    <div>
                      <p className="text-4xl font-mono font-black mb-1">
                        {tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0}%
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Today's Completion Rate</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  <div className="col-span-1 p-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer" onClick={() => setActiveTab('schedule')}>
                    <Clock className="w-5 h-5 mb-4 text-zinc-400" />
                    <p className="text-sm font-bold uppercase tracking-tight mb-2 dark:text-zinc-200">Schedule</p>
                    <div className="truncatexl max-w-full">
                       <span className="text-xs font-bold block truncate">{currentBlock ? currentBlock.activity : (nextBlock ? `Next: ${nextBlock.activity}` : 'Open Schedule')}</span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Active Blocks</p>
                  </div>

                  <div className="col-span-1 p-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer" onClick={() => setActiveTab('overthinking')}>
                    <Activity className="w-5 h-5 mb-4 text-zinc-400" />
                    <p className="text-sm font-bold uppercase tracking-tight mb-2 dark:text-zinc-200">Mental Map</p>
                    <div className="flex items-baseline gap-2">
                       <span className="text-3xl font-mono font-black">{overthinkingLogs.length}</span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Sessions Tracked</p>
                  </div>

                  <div className="col-span-1 p-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer" onClick={() => setActiveTab('habits')}>
                    <Layout className="w-5 h-5 mb-4 text-zinc-400" />
                    <p className="text-sm font-bold uppercase tracking-tight mb-2 dark:text-zinc-200">Habits</p>
                    <div className="flex items-baseline gap-2">
                       <span className="text-3xl font-mono font-black">{habitComp}%</span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Today's Progress</p>
                  </div>

                  <div className="col-span-1 p-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer" onClick={() => setActiveTab('journal')}>
                    <BookOpen className="w-5 h-5 mb-4 text-zinc-400" />
                    <p className="text-sm font-bold uppercase tracking-tight mb-2 dark:text-zinc-200">Journal</p>
                    <div className="flex items-baseline gap-2">
                       <span className="text-3xl font-mono font-black">{journalEntries.length}</span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Total Entries</p>
                  </div>

                  <div className="col-span-1 p-8 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-900/50 rounded-2xl hover:border-amber-300 dark:hover:border-amber-700 transition-all cursor-pointer" onClick={() => setActiveTab('urge')}>
                    <Zap className="w-5 h-5 mb-4 text-amber-500" />
                    <p className="text-sm font-bold uppercase tracking-tight mb-2 dark:text-zinc-200">Circuit</p>
                    <div className="flex items-baseline gap-2">
                       <span className="text-3xl font-mono font-black text-amber-500">{urgeSuccess}%</span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Success Rate</p>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'habits' ? (
              <motion.div 
                key="habits-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="min-w-max p-10"
              >
                {monthsOfYear.map((monthDate) => {
                  const monthKey = format(monthDate, 'MMMM yyyy');
                  const isExpanded = expandedMonths.includes(monthKey);
                  const days = getDaysForMonth(monthDate);
                  
                  return (
                    <div key={monthKey} className="mb-4">
                      <button 
                        onClick={() => toggleMonth(monthKey)}
                        className="w-full flex items-center gap-3 py-4 px-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group text-left border-b border-zinc-50 dark:border-zinc-800"
                      >
                        <ChevronDown className={cn("w-4 h-4 text-zinc-300 transition-transform duration-200", !isExpanded && "-rotate-90")} />
                        <h3 className="text-lg font-black tracking-tighter uppercase dark:text-zinc-200">{monthKey}</h3>
                        <span className="text-[10px] font-mono font-bold text-zinc-300 ml-2 uppercase tracking-widest dark:text-zinc-600">
                          {days.length} ENTRIES
                        </span>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-6 mb-8 border border-high-line dark:border-zinc-800 rounded-sm shadow-sm overflow-hidden">
                              <div className="overflow-x-auto custom-scrollbar scroll-smooth">
                                <div className="min-w-fit">
                                  {/* Table Header */}
                                  <div 
                                    className="grid bg-zinc-50/80 dark:bg-zinc-900/80 border-b border-high-line dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-md"
                                    style={{ gridTemplateColumns: `${140 * zoom}px ${160 * zoom}px repeat(${habits.length}, ${140 * zoom}px) ${140 * zoom}px` }}
                                  >
                                    <div className="p-3 font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center gap-2 border-r border-high-line dark:border-zinc-800" style={{ fontSize: `${10 * zoom}px` }}>
                                      <Layout className="w-3 h-3" /> Day
                                    </div>
                                    <div className="p-3 font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center gap-2 border-r border-high-line dark:border-zinc-800" style={{ fontSize: `${10 * zoom}px` }}>
                                      <CalendarIcon className="w-3 h-3" /> Date
                                    </div>
                                    {habits.map(habit => (
                                      <div key={habit.id} className="p-3 group flex items-center justify-between border-r border-high-line dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30">
                                        <div className="flex items-center gap-2 truncate">
                                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: habit.color }} />
                                          <span className="font-black uppercase tracking-widest truncate dark:text-zinc-200" style={{ fontSize: `${10 * zoom}px` }}>{habit.name}</span>
                                        </div>
                                        {zoom > 0.7 && (
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteHabit(habit.id, habit.name); }}
                                            className="lg:opacity-0 lg:group-hover:opacity-100 opacity-100 transition-opacity p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-sm"
                                            title="Delete Property"
                                          >
                                            <X className="w-3.5 h-3.5 text-zinc-400 hover:text-red-500 transition-colors" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                    <div className="p-3 flex items-center justify-center font-bold text-zinc-300 dark:text-zinc-700 uppercase italic tracking-widest" style={{ fontSize: `${10 * zoom}px` }}>
                                      End
                                    </div>
                                  </div>

                                  {/* Table Rows */}
                                  <div className="bg-white dark:bg-zinc-950">
                                    {days.map((day) => {
                                      const dateStr = format(day, 'yyyy-MM-dd');
                                      const isToday = isSameDay(day, startOfToday());
                                      
                                      return (
                                        <div 
                                          key={dateStr} 
                                          className="grid divide-x-0 divide-high-line dark:divide-zinc-800 border-b border-high-line dark:border-zinc-800 hover:bg-zinc-50/10 dark:hover:bg-zinc-900/10 transition-colors group"
                                          style={{ gridTemplateColumns: `${140 * zoom}px ${160 * zoom}px repeat(${habits.length}, ${140 * zoom}px) ${140 * zoom}px` }}
                                        >
                                          <div className={cn(
                                            "p-3 font-bold tracking-tight border-r border-high-line dark:border-zinc-800",
                                            isToday ? "text-high-accent bg-high-accent/5 dark:bg-high-accent/10" : "text-zinc-600 dark:text-zinc-400"
                                          )}
                                          style={{ fontSize: `${12 * zoom}px` }}
                                          >
                                            {format(day, 'EEEE')}
                                          </div>
                                          <div className="p-3 font-medium text-zinc-400 dark:text-zinc-600 font-mono border-r border-high-line dark:border-zinc-800" style={{ fontSize: `${12 * zoom}px` }}>
                                            {format(day, 'MMMM d, yyyy')}
                                          </div>
                                          {habits.map(habit => {
                                            const log = logs.find(l => l.habitId === habit.id && l.date === dateStr);
                                            
                                            return (
                                              <HabitCell 
                                                key={`${habit.id}-${dateStr}`}
                                                habit={habit}
                                                log={log}
                                                date={day}
                                                zoom={zoom}
                                                onToggle={toggleHabit}
                                                onUpdateValue={updateHabitValue}
                                                formatDuration={formatDurationValue}
                                                parseDuration={parseDurationString}
                                              />
                                            );
                                          })}
                                          <div className="p-3"></div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </motion.div>
            ) : activeTab === 'tasks' ? (
              <motion.div 
                key="tasks-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-10 max-w-4xl mx-auto"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter dark:text-zinc-100">Daily Tasks</h2>
                    <p className="text-sm text-zinc-400 font-medium dark:text-zinc-500">Stay organized. One task at a time.</p>
                  </div>
                  <Button 
                    onClick={() => {
                      setEditingTask(null);
                      setShowTaskModal(true);
                    }}
                    className="h-10 px-6 font-black uppercase tracking-widest text-[10px] flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Task
                  </Button>
                </div>

                <div className="space-y-3">
                  {tasks.length === 0 ? (
                    <div className="p-20 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700">
                      <ListTodo className="w-12 h-12 mb-4 opacity-20" />
                      <p className="font-bold uppercase tracking-[0.2em] text-[10px]">Your task list is empty</p>
                    </div>
                  ) : (
                    tasks.map(task => (
                      <div 
                        key={task.id} 
                        className={cn(
                          "group p-4 rounded-xl border transition-all flex items-center justify-between",
                          task.completed 
                            ? "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800 opacity-60" 
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm"
                        )}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <button 
                            onClick={() => handleToggleTask(task)}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                              task.completed 
                                ? "bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100 text-white dark:text-zinc-900" 
                                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100"
                            )}
                          >
                            {task.completed && <Check className="w-3 h-3" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={cn(
                              "text-sm font-bold tracking-tight dark:text-zinc-100 transition-all break-words whitespace-normal",
                              task.completed && "line-through text-zinc-400 dark:text-zinc-600"
                            )}>
                              {task.task}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              {task.time && (
                                <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-zinc-400 uppercase">
                                  <Clock className="w-3 h-3" /> {formatTime12h(task.time)}
                                </span>
                              )}
                              <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase">
                                {format(parseISO(task.date), 'MMM d')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingTask(task);
                              setShowTaskModal(true);
                            }}
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md text-zinc-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'schedule' ? (
              <motion.div 
                key="schedule-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full h-[calc(100vh-80px)] flex flex-col p-0"
              >
                <TimeBlockingGrid 
                  timeBlocks={timeBlocks}
                  onAddTimeBlock={handleAddTimeBlock}
                  onEditTimeBlock={(id, data) => handleEditTimeBlock(id, data)}
                  onDeleteTimeBlock={handleDeleteTimeBlock}
                  onToggleSubtask={handleToggleSubtask}
                  zoomScale={zoom}
                  onZoomScaleChange={setZoom}
                  onOpenModalWithDefaults={(defaults) => {
                    setEditingTimeBlock(defaults.block || null);
                    setScheduleDefaults(defaults);
                    setShowScheduleModal(true);
                  }}
                />
              </motion.div>
            ) : activeTab === 'overthinking' ? (
              <motion.div 
                key="overthinking-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-10 max-w-4xl mx-auto"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter dark:text-zinc-100">Overthinking Log</h2>
                    <p className="text-sm text-zinc-400 font-medium dark:text-zinc-500">Tracking mental intensity and triggers</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {overthinkingLogs.length === 0 ? (
                    <div className="col-span-full p-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700">
                      <Activity className="w-12 h-12 mb-4 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-[10px]">No overthinking sessions logged</p>
                    </div>
                  ) : (
                    overthinkingLogs.map(log => (
                      <div 
                        key={log.id} 
                        onClick={() => {
                          setExpandedLogs(prev => {
                            const next = new Set(prev);
                            if (next.has(log.id)) next.delete(log.id);
                            else next.add(log.id);
                            return next;
                          });
                        }}
                        className="p-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:shadow-lg transition-all border-l-4 group relative cursor-pointer" 
                        style={{ borderLeftColor: log.intensity > 7 ? '#ef4444' : log.intensity > 4 ? '#f59e0b' : '#10b981' }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-600 tracking-widest lowercase">
                              {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black dark:text-zinc-200">Level {log.intensity}</span>
                              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-zinc-900 dark:bg-zinc-100" 
                                  style={{ width: `${log.intensity * 10}%` }} 
                                />
                              </div>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOverthinking(log.id);
                              }}
                              className="lg:opacity-0 lg:group-hover:opacity-100 opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-zinc-300 hover:text-red-500" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingOverthinkingLog(log);
                                setShowOverthinkingModal(true);
                              }}
                              className="lg:opacity-0 lg:group-hover:opacity-100 opacity-100 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-all"
                            >
                              <Edit className="w-3.5 h-3.5 text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400" />
                            </button>
                          </div>
                        </div>
                        {log.trigger && (
                          <div className="mb-3">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-1">Trigger</p>
                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{log.trigger}</p>
                          </div>
                        )}
                        {log.thoughts && (
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-1">Current Thoughts</p>
                            <p className={cn(
                              "text-sm text-zinc-600 dark:text-zinc-400 italic",
                              !expandedLogs.has(log.id) && "line-clamp-3"
                            )}>"{log.thoughts}"</p>
                            {!expandedLogs.has(log.id) && log.thoughts.length > 100 && (
                              <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-500 mt-2">Click to expand</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'journal' ? (
              <motion.div 
                key="journal-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-10 max-w-4xl mx-auto"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter dark:text-zinc-100">Daily Journal</h2>
                    <p className="text-sm text-zinc-400 font-medium dark:text-zinc-500">Document your journey and internal state</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {journalEntries.length === 0 ? (
                    <div className="p-20 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700">
                      <BookOpen className="w-16 h-16 mb-6 opacity-20" />
                      <p className="font-bold uppercase tracking-[0.2em] text-[10px]">Your journal is empty</p>
                    </div>
                  ) : (
                    journalEntries.map(entry => (
                      <div 
                        key={entry.id} 
                        onClick={() => {
                          setExpandedEntries(prev => {
                            const next = new Set(prev);
                            if (next.has(entry.id)) next.delete(entry.id);
                            else next.add(entry.id);
                            return next;
                          });
                        }}
                        className="p-8 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:bg-white dark:hover:bg-zinc-900 hover:shadow-xl hover:border-zinc-200 dark:hover:border-zinc-700 transition-all group cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-6">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                               <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">
                                {format(new Date(entry.timestamp), 'EEEE, MMM do')}
                              </span>
                              {entry.mood && (
                                <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold uppercase tracking-widest rounded-full text-zinc-500 dark:text-zinc-400 ring-1 ring-zinc-200 dark:ring-zinc-700">
                                  {entry.mood}
                                </span>
                              )}
                            </div>
                            <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">{entry.title}</h3>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingJournalEntry(entry);
                                setShowJournalModal(true);
                              }}
                              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4 text-zinc-400" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteJournalEntry(entry.id);
                              }}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors group/del"
                            >
                              <Trash2 className="w-4 h-4 text-zinc-400 group-hover/del:text-red-500" />
                            </button>
                          </div>
                        </div>
                        <p className={cn(
                          "text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap selection:bg-zinc-900 selection:text-white dark:selection:bg-zinc-100 dark:selection:text-zinc-900",
                          !expandedEntries.has(entry.id) && "line-clamp-4"
                        )}>{entry.content}</p>
                        
                        {!expandedEntries.has(entry.id) && (entry.content.length > 200) && (
                          <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-500 mt-4">Click to expand</p>
                        )}

                        {expandedEntries.has(entry.id) && (entry.lostControl || entry.trigger || entry.improvementTomorrow || entry.learningFromMistake) && (
                          <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {entry.lostControl && (
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-1.5">Where did you lose control?</p>
                                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{entry.lostControl}</p>
                              </div>
                            )}
                            {entry.trigger && (
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-1.5">What triggered it?</p>
                                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{entry.trigger}</p>
                              </div>
                            )}
                            {entry.improvementTomorrow && (
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-1.5">One improvement tomorrow</p>
                                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{entry.improvementTomorrow}</p>
                              </div>
                            )}
                            {entry.learningFromMistake && (
                              <div className="md:col-span-2">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-1.5">Learning from mistake</p>
                                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{entry.learningFromMistake}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="urge-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "p-6 sm:p-10 max-w-2xl mx-auto flex flex-col",
                  urgeSession ? "min-h-[calc(100vh-160px)] justify-center" : "pb-36 lg:pb-16"
                )}
              >
                {!urgeSession ? (
                  <div className="flex-1 flex flex-col">
                    <div className="mb-12">
                      <h2 className="text-3xl font-black uppercase tracking-tighter dark:text-zinc-100 flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-amber-500" />
                        The Circuit Breaker
                      </h2>
                      <p className="text-sm text-zinc-400 font-medium dark:text-zinc-500 mt-2">Break the loop. Reclaim your focus.</p>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center -mt-10">
                      <button 
                        onClick={startUrgeSession}
                        className="group relative w-48 h-48 rounded-full bg-zinc-900 dark:bg-zinc-100 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-2xl overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-amber-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                        <Zap className="w-12 h-12 text-amber-500 mb-4 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white dark:text-black">Interrupt</span>
                      </button>
                      <p className="mt-8 text-xs font-bold text-zinc-400 uppercase tracking-widest">Momentary urge? Push to pause.</p>
                    </div>

                    <div className="mt-12 space-y-12">
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-2">Today's Sessions</h4>
                        
                        <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                            <p className="text-[9px] font-bold uppercase text-zinc-400 mb-1">Today's Success Rate</p>
                            <p className="stat-value text-emerald-500">
                              {urgeLogs.filter(l => l.date === format(new Date(), 'yyyy-MM-dd')).length > 0 
                                ? Math.round((urgeLogs.filter(l => l.date === format(new Date(), 'yyyy-MM-dd')).filter(l => l.outcome === 'resisted' || l.outcome === 'returned_to_focus').length / urgeLogs.filter(l => l.date === format(new Date(), 'yyyy-MM-dd')).length) * 100)
                                : 0}%
                            </p>
                          </div>
                          <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                            <p className="text-[9px] font-bold uppercase text-zinc-400 mb-1">Cycles Broken Today</p>
                            <p className="stat-value text-amber-500">{urgeLogs.filter(l => l.date === format(new Date(), 'yyyy-MM-dd')).length}</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {urgeLogs.filter(l => l.date === format(new Date(), 'yyyy-MM-dd')).length === 0 ? (
                            <p className="text-xs text-zinc-500 font-medium text-center py-8">No sessions today. Great job staying focused!</p>
                          ) : urgeLogs.filter(l => l.date === format(new Date(), 'yyyy-MM-dd')).map(log => {
                            const isEditing = editingUrgeLog?.id === log.id;

                            if (isEditing && editingUrgeLog) {
                              return (
                                <div key={log.id} className="p-4 bg-white dark:bg-zinc-900 border-2 border-amber-500 rounded-xl space-y-4 shadow-md">
                                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                                    <span className="text-xs font-black uppercase text-amber-500 tracking-wider">Edit Urge Session</span>
                                    <span className="text-[10px] font-mono text-zinc-400">{format(new Date(log.timestamp), 'MMM d, p')}</span>
                                  </div>

                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Action / Impulse</label>
                                      <input 
                                        type="text"
                                        value={editingUrgeLog.intent}
                                        onChange={(e) => setEditingUrgeLog({ ...editingUrgeLog, intent: e.target.value })}
                                        placeholder="What were you about to do?"
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Outcome</label>
                                        <select
                                          value={editingUrgeLog.outcome}
                                          onChange={(e) => setEditingUrgeLog({ ...editingUrgeLog, outcome: e.target.value as any })}
                                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        >
                                          <option value="returned_to_focus">Returned To Focus</option>
                                          <option value="resisted">Resisted</option>
                                          <option value="continued_anyway">Continued Anyway</option>
                                          <option value="given_in">Given In</option>
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Helps Future?</label>
                                        <div className="flex gap-2 pt-0.5">
                                          <button
                                            type="button"
                                            onClick={() => setEditingUrgeLog({ ...editingUrgeLog, willHelpFuture: true })}
                                            className={cn(
                                              "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border",
                                              editingUrgeLog.willHelpFuture === true
                                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                                                : "border-zinc-200 text-zinc-400 dark:border-zinc-800"
                                            )}
                                          >
                                            Yes
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingUrgeLog({ ...editingUrgeLog, willHelpFuture: false })}
                                            className={cn(
                                              "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border",
                                              editingUrgeLog.willHelpFuture === false
                                                ? "bg-red-500 text-white border-red-500"
                                                : "border-zinc-200 text-zinc-400 dark:border-zinc-800"
                                            )}
                                          >
                                            No
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-bold uppercase text-red-500 mb-1">Why Shouldn't I Do It?</label>
                                      <textarea 
                                        rows={2}
                                        value={editingUrgeLog.whyNotReason || ''}
                                        onChange={(e) => setEditingUrgeLog({ ...editingUrgeLog, whyNotReason: e.target.value })}
                                        placeholder="Reason why you shouldn't..."
                                        className="w-full bg-red-500/5 border border-red-200 dark:border-red-900/40 rounded-lg p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium resize-none"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-bold uppercase text-emerald-500 mb-1">What Should I Do Instead?</label>
                                      <textarea 
                                        rows={2}
                                        value={editingUrgeLog.whatToDoInstead || ''}
                                        onChange={(e) => setEditingUrgeLog({ ...editingUrgeLog, whatToDoInstead: e.target.value })}
                                        placeholder="Plan for what to do instead..."
                                        className="w-full bg-emerald-500/5 border border-emerald-200 dark:border-emerald-900/40 rounded-lg p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium resize-none"
                                      />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                      <button 
                                        type="button"
                                        onClick={() => setEditingUrgeLog(null)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            await updateDoc(doc(db, 'urgeLogs', editingUrgeLog.id), {
                                              intent: editingUrgeLog.intent,
                                              willHelpFuture: editingUrgeLog.willHelpFuture,
                                              outcome: editingUrgeLog.outcome,
                                              whyNotReason: editingUrgeLog.whyNotReason || '',
                                              whatToDoInstead: editingUrgeLog.whatToDoInstead || ''
                                            });
                                            setEditingUrgeLog(null);
                                          } catch (err) {
                                            console.error('Failed to update urge log:', err);
                                          }
                                        }}
                                        className="px-4 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-amber-600 transition-all shadow-xs"
                                      >
                                        Save Changes
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={log.id} className="p-4 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 rounded-xl space-y-3 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase">
                                      {format(new Date(log.timestamp), 'MMM d, p')}
                                    </span>
                                    <span className={cn(
                                      "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                                      log.outcome === 'resisted' || log.outcome === 'returned_to_focus' 
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                        : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                    )}>
                                      {log.outcome.replace(/_/g, ' ')}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button 
                                      type="button"
                                      onClick={() => setEditingUrgeLog(log)}
                                      className="p-1.5 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all"
                                      title="Edit session"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          await deleteDoc(doc(db, 'urgeLogs', log.id));
                                        } catch (err) {
                                          console.error(err);
                                        }
                                      }}
                                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500 transition-all"
                                      title="Delete record"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                    "{log.intent || 'Unspecified Action'}"
                                  </p>
                                  <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mt-0.5">
                                    Future impact: <span className={log.willHelpFuture ? 'text-emerald-500 font-bold' : 'text-red-400 font-bold'}>{log.willHelpFuture ? 'Positive' : 'Negative'}</span> • Duration: {formatDurationSeconds(log.durationSeconds)}
                                  </p>
                                </div>

                                {/* REASON & ALTERNATIVE PLAN DETAILS */}
                                {(log.whyNotReason || log.whatToDoInstead) && (
                                  <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                                    {log.whyNotReason && (
                                      <div className="p-2.5 bg-red-500/5 border border-red-500/15 rounded-lg text-xs space-y-1">
                                        <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-[10px] uppercase tracking-wider">
                                          <AlertTriangle className="w-3 h-3 shrink-0" />
                                          <span>Why Shouldn't I Do It?</span>
                                        </div>
                                        <p className="text-zinc-700 dark:text-zinc-300 font-medium whitespace-pre-wrap pl-4 text-[11px]">
                                          {log.whyNotReason}
                                        </p>
                                      </div>
                                    )}

                                    {log.whatToDoInstead && (
                                      <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-lg text-xs space-y-1">
                                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider">
                                          <Sparkles className="w-3 h-3 shrink-0" />
                                          <span>What Should I Do Instead?</span>
                                        </div>
                                        <p className="text-zinc-700 dark:text-zinc-300 font-medium whitespace-pre-wrap pl-4 text-[11px]">
                                          {log.whatToDoInstead}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-2">History & Insights</h4>
                        {urgeHistoryDates.length > 0 ? (
                          <div className="space-y-4">
                            {urgeHistoryDates.map(date => {
                              const dayLogs = urgeLogsByDate[date];
                              const successes = dayLogs.filter(l => l.outcome === 'resisted' || l.outcome === 'returned_to_focus').length;
                              const rate = dayLogs.length > 0 ? Math.round((successes / dayLogs.length) * 100) : 0;
                              return (
                                <div key={date} className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                                      {format(new Date(date + 'T00:00:00'), 'MMM d, yyyy')}
                                    </p>
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                                      rate >= 80 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                                      rate >= 50 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                                      "bg-red-500/10 text-red-600 dark:text-red-400"
                                    )}>
                                      {rate}% Success
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Total Cycles</p>
                                      <p className="text-lg font-black text-zinc-800 dark:text-zinc-200">{dayLogs.length}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 justify-center">
                                      <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-zinc-500 uppercase tracking-wider font-bold">Back to Focus:</span>
                                        <span className="font-black text-emerald-500">{successes}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-zinc-500 uppercase tracking-wider font-bold">Given In/Continued:</span>
                                        <span className="font-black text-red-500">{dayLogs.length - successes}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-8 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 border-dashed">
                            <p className="text-xs text-zinc-400 font-medium">No past sessions to display yet.</p>
                            <p className="text-[10px] text-zinc-500 mt-1">Tomorrow, your stats for today will appear here.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-10">
                    <AnimatePresence mode="wait">
                      {urgeSession.stage === 1 && (
                        <motion.div 
                          key="stage-1"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="w-full max-w-lg p-6 sm:p-8 border-2 border-zinc-900 dark:border-zinc-100 rounded-2xl shadow-2xl space-y-6 bg-white dark:bg-zinc-950 text-left my-auto"
                        >
                          <div className="text-center pb-4 border-b border-zinc-100 dark:border-zinc-800">
                            <div className="inline-flex items-center justify-center gap-2 text-xl font-mono font-black text-amber-500 mb-1 uppercase tracking-tight">
                              <Zap className="w-6 h-6 animate-pulse" />
                              Circuit Breaker Pause
                            </div>
                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                              Interrupt the impulse loop. Reflect before acting.
                            </p>
                          </div>

                          <div className="space-y-5">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-2 leading-tight">What are you about to do?</label>
                              <input 
                                type="text"
                                value={urgeSession.intent}
                                onChange={(e) => setUrgeSession({ ...urgeSession, intent: e.target.value })}
                                placeholder="e.g. Check social media, order junk food, binge videos..."
                                className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                              />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                              <span className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-[0.15em]">Will this help your future?</span>
                              <div className="flex gap-2">
                                <button 
                                  type="button"
                                  onClick={() => setUrgeSession({ ...urgeSession, willHelpFuture: true })}
                                  className={cn(
                                    "px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ring-1",
                                    urgeSession.willHelpFuture === true 
                                      ? "bg-zinc-900 text-white ring-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-100 shadow-sm" 
                                      : "ring-zinc-200 text-zinc-400 hover:ring-zinc-400 dark:ring-zinc-800"
                                  )}
                                >
                                  Yes
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setUrgeSession({ ...urgeSession, willHelpFuture: false })}
                                  className={cn(
                                    "px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ring-1",
                                    urgeSession.willHelpFuture === false 
                                      ? "bg-red-500 text-white ring-red-500 shadow-sm" 
                                      : "ring-zinc-200 text-zinc-400 hover:ring-zinc-400 dark:ring-zinc-800"
                                  )}
                                >
                                  No
                                </button>
                              </div>
                            </div>

                            {/* USER EDITABLE SECTION 1: WHY SHOULDN'T I DO IT? */}
                            <div className="p-3.5 bg-red-500/5 border border-red-500/20 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black text-xs uppercase tracking-wider">
                                  <AlertTriangle className="w-4 h-4 shrink-0" />
                                  <span>Why Shouldn't I Do It?</span>
                                </div>
                                <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">Write your reason</span>
                              </div>
                              <textarea 
                                rows={2}
                                value={urgeSession.whyNotReason || ''}
                                onChange={(e) => setUrgeSession({ ...urgeSession, whyNotReason: e.target.value })}
                                placeholder="e.g. Brief 5-sec dopamine spike, followed by regret, brain fog & 30 mins lost focus..."
                                className="w-full bg-white dark:bg-zinc-900/90 border border-red-200 dark:border-red-900/40 rounded-lg p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none font-medium placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                              />
                            </div>

                            {/* USER EDITABLE SECTION 2: WHAT SHOULD I DO INSTEAD? */}
                            <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                                  <Sparkles className="w-4 h-4 shrink-0" />
                                  <span>What Should I Do Instead?</span>
                                </div>
                                <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">Write your plan</span>
                              </div>
                              <textarea 
                                rows={2}
                                value={urgeSession.whatToDoInstead || ''}
                                onChange={(e) => setUrgeSession({ ...urgeSession, whatToDoInstead: e.target.value })}
                                placeholder="e.g. Take 3 deep breaths, drink water, or work for just 5 more minutes..."
                                className="w-full bg-white dark:bg-zinc-900/90 border border-emerald-200 dark:border-emerald-900/40 rounded-lg p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none font-medium placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                              />
                            </div>
                          </div>

                          {/* CONTINUE TO NEXT PAGE BUTTON */}
                          <div className="pt-2">
                            <motion.button 
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setUrgeSession({ ...urgeSession, stage: 2 })}
                              className="w-full py-3.5 px-5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl font-black uppercase tracking-wider text-xs hover:bg-zinc-800 dark:hover:bg-white transition-all shadow-lg flex items-center justify-center gap-2 group"
                            >
                              <span>Continue to Action Options</span>
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-amber-400 dark:text-amber-600" />
                            </motion.button>
                          </div>
                        </motion.div>
                      )}

                      {urgeSession.stage === 2 && (
                        <motion.div 
                          key="stage-2"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="w-full max-w-md p-8 sm:p-10 border-2 border-zinc-900 dark:border-zinc-100 rounded-2xl shadow-2xl space-y-6 bg-white dark:bg-zinc-950 text-center my-auto"
                        >
                          <div className="space-y-1">
                            <h3 className="text-xl font-black uppercase tracking-tighter dark:text-zinc-100">Choose your action</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">How do you want to handle this impulse?</p>
                          </div>
                          
                          <div className="grid gap-3.5">
                            <motion.button 
                              whileHover={{ scale: 1.01, x: 4 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={handleLevelUp}
                              className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-amber-500 hover:bg-amber-500/5 transition-all group flex items-center justify-between text-left"
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                                  <Wind className="w-5 h-5" />
                                </div>
                                <div>
                                  <span className="font-black uppercase tracking-tight text-xs block dark:text-zinc-100">Ride the Urge</span>
                                  <span className="text-[10px] text-zinc-400 block font-medium">Use 2-min timer & 4-7-8 breathing</span>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500" />
                            </motion.button>

                            <motion.button 
                              whileHover={{ scale: 1.01, x: 4 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleUrgeOutcome('returned_to_focus')}
                              className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-500/5 transition-all group flex items-center justify-between text-left"
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                                  <Check className="w-5 h-5" />
                                </div>
                                <div>
                                  <span className="font-black uppercase tracking-tight text-xs block dark:text-zinc-100">Return to Focus</span>
                                  <span className="text-[10px] text-zinc-400 block font-medium">I will skip the impulse and lock back in</span>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500" />
                            </motion.button>

                            <motion.button 
                              whileHover={{ scale: 1.01, x: 4 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleUrgeOutcome('continued_anyway')}
                              className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-red-500 hover:bg-red-500/5 transition-all group flex items-center justify-between text-left"
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                                  <X className="w-5 h-5" />
                                </div>
                                <div>
                                  <span className="font-black uppercase tracking-tight text-xs block dark:text-zinc-100">Continue Anyway</span>
                                  <span className="text-[10px] text-zinc-400 block font-medium">Proceed with action & log it honestly</span>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-red-500" />
                            </motion.button>
                          </div>

                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <button 
                              type="button"
                              onClick={() => setUrgeSession({ ...urgeSession, stage: 1 })}
                              className="text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center justify-center gap-1 mx-auto transition-colors"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" /> Back to Reflection
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {urgeSession.stage === 3 && (
                        <motion.div 
                          key="stage-3"
                          initial={{ opacity: 0, scale: 1.1 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="w-full max-w-md p-10 border-2 border-zinc-900 dark:border-zinc-100 rounded-lg shadow-2xl space-y-12 bg-white dark:bg-zinc-950 text-center"
                        >
                          <div className="space-y-4">
                            <div className="inline-flex items-center px-3 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                              <Wind className="w-3 h-3 mr-2" /> URGE ACTIVE
                            </div>
                            <div className="text-4xl font-mono font-black tabular-nums">
                              {formatDurationSeconds(urgeSession.timer)}
                            </div>
                          </div>

                          <div className="space-y-6">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Recommended Technique</p>
                            <motion.button 
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setUrgeSession(prev => prev ? { ...prev, showBreather: true } : null)}
                              className="w-full p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-500/5 transition-all text-left flex items-center justify-between group"
                            >
                              <div className="space-y-1">
                                <p className="text-sm font-black uppercase tracking-tight dark:text-zinc-100 group-hover:text-emerald-500 transition-colors">Mindful Breathing</p>
                                <p className="text-xs text-zinc-500">The 4-7-8 method. Proven to lower heart rate.</p>
                              </div>
                              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <Zap className="w-5 h-5" />
                              </div>
                            </motion.button>
                          </div>

                          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                             <motion.button 
                               whileHover={{ scale: 1.02 }}
                               whileTap={{ scale: 0.98 }}
                               onClick={() => handleUrgeOutcome('given_in')}
                               className="w-full p-4 rounded border-2 border-red-500/20 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 group"
                             >
                               <ShieldAlert className="w-5 h-5 opacity-50 group-hover:opacity-100" />
                               I Gave Up
                             </motion.button>
                             <p className="mt-4 text-[9px] font-bold uppercase text-zinc-300 dark:text-zinc-700 tracking-widest">Survive the timer to win.</p>
                          </div>
                        </motion.div>
                      )}

                      {urgeSession.stage === 4 && (
                         <motion.div 
                          key="stage-4"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.1 }}
                          className="w-full max-w-md p-10 border-4 border-emerald-500 rounded-lg shadow-2xl space-y-8 bg-white dark:bg-zinc-950 text-center"
                        >
                           <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                             <Check className="w-10 h-10 stroke-[3]" />
                           </div>
                           <div>
                             <h3 className="text-3xl font-black uppercase tracking-tighter text-emerald-500 mb-2">Victory</h3>
                             <p className="text-zinc-500 font-medium">You rode the wave. The loop is broken.</p>
                           </div>

                           <motion.button 
                             whileHover={{ scale: 1.02 }}
                             whileTap={{ scale: 0.95 }}
                             onClick={() => handleUrgeOutcome('resisted')}
                             className="w-full p-6 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
                           >
                             Return to Focus <ArrowRight className="w-5 h-5" />
                           </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {urgeSession.stage > 0 && (
                      <button 
                        onClick={() => setUrgeSession(null)}
                        className="mt-12 text-[10px] font-bold uppercase tracking-widest text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      >
                        Abort Circuit
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Nav - Mobile */}
          <nav className="lg:hidden fixed bottom-4 left-4 right-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-around py-3 px-2 z-40 shadow-2xl ring-1 ring-black/5 dark:ring-white/5 mx-auto max-w-lg">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={cn(
                  "p-2.5 rounded-xl transition-all relative flex flex-col items-center group",
                  activeTab === item.id 
                    ? "text-zinc-900 dark:text-white scale-110" 
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
              >
                <item.icon className={cn("w-6 h-6", activeTab === item.id && "fill-current")} />
                {activeTab === item.id && (
                  <motion.div 
                    layoutId="mobile-nav-pill"
                    className="absolute -bottom-1 w-1 h-1 bg-zinc-900 dark:bg-white rounded-full"
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Mobile Menu Drawer */}
          <AnimatePresence>
            {isMenuOpen && (
              <div className="fixed inset-0 z-[60] lg:hidden">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMenuOpen(false)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />
                <motion.aside
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="relative w-72 h-full bg-white dark:bg-zinc-950 p-8 flex flex-col border-r border-zinc-200 dark:border-zinc-800"
                >
                  <div className="flex items-center justify-between mb-12">
                     <div className="flex items-center gap-4">
                       <span className="text-xs font-black uppercase tracking-widest opacity-30">Account</span>
                       <button 
                         onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                         className="p-1 px-2.5 rounded-full bg-zinc-100 dark:bg-zinc-900 transition-colors text-zinc-500 flex items-center gap-2 border border-zinc-200 dark:border-zinc-800"
                       >
                         {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                         <span className="text-[9px] font-black uppercase tracking-tight">
                           {theme === 'light' ? 'Dark' : 'Light'}
                         </span>
                       </button>
                     </div>
                     <button onClick={() => setIsMenuOpen(false)} className="p-2 -mr-2 text-zinc-400">
                       <X className="w-5 h-5" />
                     </button>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-10 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                    {!user || user.isAnonymous ? (
                      <button 
                        onClick={() => {
                          setShowAuthModal(true);
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                          <Plus className="w-4 h-4 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Sign In / Sync Data</p>
                          <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Guest Session</p>
                        </div>
                      </button>
                    ) : (
                      <>
                        <img 
                          src={user.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                          alt="" 
                          className="w-10 h-10 rounded-lg" 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate dark:text-zinc-200">{user.displayName || 'Momentum User'}</p>
                          <p className="text-[10px] text-zinc-400 truncate tracking-tight">{user.email || 'Synced'}</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-6 flex-1">
                    <div>
                <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4">SYSTEM</h5>
                      <div className="space-y-1">
                        <button 
                          onClick={() => {
                            setActiveTab('home');
                            setIsMenuOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center px-4 py-3 rounded-xl transition-all text-sm font-bold uppercase tracking-tight",
                            activeTab === 'home' ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          )}
                        >
                          <Home className="w-4 h-4 mr-4" /> Momentum Home
                        </button>
                        <button 
                          onClick={() => {
                            setActiveTab('tasks');
                            setIsMenuOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center px-4 py-3 rounded-xl transition-all text-sm font-bold uppercase tracking-tight",
                            activeTab === 'tasks' ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          )}
                        >
                          <ListTodo className="w-4 h-4 mr-4" /> Daily Tasks
                        </button>
                        <button 
                          onClick={() => {
                            setActiveTab('schedule');
                            setIsMenuOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center px-4 py-3 rounded-xl transition-all text-sm font-bold uppercase tracking-tight",
                            activeTab === 'schedule' ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          )}
                        >
                          <Clock className="w-4 h-4 mr-4" /> Schedule
                        </button>
                        <button 
                          onClick={() => {
                            setActiveTab('overthinking');
                            setIsMenuOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center px-4 py-3 rounded-xl transition-all text-sm font-bold uppercase tracking-tight",
                            activeTab === 'overthinking' ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          )}
                        >
                          <Activity className="w-4 h-4 mr-4" /> Overthinking
                        </button>
                        <button 
                          onClick={() => {
                            setActiveTab('habits');
                            setIsMenuOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center px-4 py-3 rounded-xl transition-all text-sm font-bold uppercase tracking-tight",
                            activeTab === 'habits' ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          )}
                        >
                          <Layout className="w-4 h-4 mr-4" /> Habits
                        </button>
                        <button 
                          onClick={() => {
                            setActiveTab('journal');
                            setIsMenuOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center px-4 py-3 rounded-xl transition-all text-sm font-bold uppercase tracking-tight",
                            activeTab === 'journal' ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          )}
                        >
                          <BookOpen className="w-4 h-4 mr-4" /> Daily Journal
                        </button>
                        <button 
                          onClick={() => {
                            setActiveTab('urge');
                            setIsMenuOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center px-4 py-3 rounded-xl transition-all text-sm font-bold uppercase tracking-tight",
                            activeTab === 'urge' ? "bg-amber-500 text-white shadow-lg" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          )}
                        >
                          <Zap className="w-4 h-4 mr-4" /> Circuit Breaker
                        </button>
                      </div>
                    </div>
                  </div>

                  {!isStandalone && (
                    <div className="mb-6">
                      <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4">APPLICATION</h5>
                      <button 
                        onClick={() => {
                          handleInstallClick();
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center px-4 py-3 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 transition-all text-sm font-bold uppercase tracking-tight shadow-lg shadow-black/10 dark:shadow-white/5"
                      >
                        <Download className="w-4 h-4 mr-4" /> Install Momentum
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={logout}
                    className="w-full flex items-center px-4 py-4 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-sm font-bold uppercase tracking-tight"
                  >
                    <LogOut className="w-5 h-5 mr-4" /> Sign Out
                  </button>

                  <div className="mt-auto pt-8 text-center opacity-40">
                    <p className="text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-zinc-400">
                      Developed by <span className="text-zinc-900 dark:text-zinc-100">Sajid Ahmed</span>
                    </p>
                  </div>
                </motion.aside>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <Modal key="add-habit-modal" isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="New Property">
            <form onSubmit={handleAddHabit} className="space-y-8">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Habit Name</label>
              <input 
                autoFocus
                type="text"
                placeholder="Morning Routine, etc."
                className="w-full px-4 py-4 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all font-bold tracking-tight text-sm dark:text-zinc-100"
                value={newHabit.name}
                onChange={e => setNewHabit({ ...newHabit, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-8">
               <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Property Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'checkbox', label: 'Checkbox', icon: CheckCircle2 },
                    { id: 'number', label: 'Count', icon: Hash },
                    { id: 'duration', label: 'Timer', icon: Clock },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewHabit({ ...newHabit, type: t.id as any })}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-sm border transition-all gap-2",
                        newHabit.type === t.id 
                          ? "bg-zinc-900 border-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900" 
                          : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-400 dark:bg-zinc-900/50 dark:border-zinc-800 dark:text-zinc-600 dark:hover:border-zinc-700"
                      )}
                    >
                      <t.icon className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Frequency</label>
                <select 
                  className="w-full px-4 py-3 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-bold text-xs uppercase tracking-tight dark:text-zinc-200"
                  value={newHabit.frequency}
                  onChange={e => setNewHabit({ ...newHabit, frequency: e.target.value as any })}
                >
                  <option value="daily" className="dark:bg-zinc-900">Daily</option>
                  <option value="weekdays" className="dark:bg-zinc-900">Weekdays</option>
                  <option value="weekends" className="dark:bg-zinc-900">Weekends</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Accent Color</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {['#18181b', '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#db2777'].map(c => (
                    <button
                      key={c}
                      type="button"
                      className={cn(
                        'w-6 h-6 rounded-sm border transition-all active:scale-90',
                        newHabit.color === c ? 'border-zinc-900 ring-2 ring-zinc-100 ring-offset-1 dark:border-zinc-100 dark:ring-zinc-800' : 'border-transparent'
                      )}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewHabit({ ...newHabit, color: c })}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 flex gap-3 sticky bottom-0 bg-white dark:bg-zinc-950 pb-2">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1 text-xs dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 h-10">Cancel</Button>
              <Button type="submit" className="flex-[2] text-xs font-bold dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white h-10" disabled={!newHabit.name}>Create Property</Button>
            </div>
          </form>
        </Modal>
      )}

      {showTaskModal && (
          <Modal 
            key="add-task-modal" 
            isOpen={showTaskModal} 
            onClose={() => {
              setShowTaskModal(false);
              setEditingTask(null);
            }} 
            title={editingTask ? "Edit Task" : "New Daily Task"}
          >
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const data = {
                task: fd.get('task') as string,
                time: fd.get('time') as string,
                date: fd.get('date') as string
              };
              
              if (editingTask) {
                handleUpdateTask(editingTask.id, data);
              } else {
                handleAddTask(data);
              }
            }} className="space-y-8">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">What needs to be done?</label>
                <input 
                  name="task"
                  type="text" 
                  required
                  autoFocus
                  defaultValue={editingTask?.task || ''}
                  placeholder="e.g. Finish project proposal, Buy groceries"
                  className="w-full px-4 py-4 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-bold text-sm dark:text-zinc-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Due Date</label>
                  <input 
                    name="date"
                    type="date" 
                    required
                    defaultValue={editingTask?.date || format(startOfToday(), 'yyyy-MM-dd')}
                    className="w-full px-4 py-3 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-bold text-xs dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Time (Optional)</label>
                  <input 
                    name="time"
                    type="time" 
                    defaultValue={editingTask?.time || ''}
                    className="w-full px-4 py-3 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-bold text-xs dark:text-zinc-200"
                  />
                </div>
              </div>
              <div className="pt-6 flex gap-3 sticky bottom-0 bg-white dark:bg-zinc-950 pb-2">
                <Button type="button" variant="secondary" onClick={() => {
                  setShowTaskModal(false);
                  setEditingTask(null);
                }} className="flex-1 text-xs dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 h-10">Cancel</Button>
                <Button type="submit" className="flex-[2] text-xs font-bold dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white h-10">{editingTask ? "Update Task" : "Save Task"}</Button>
              </div>
            </form>
          </Modal>
        )}

      {showScheduleModal && (
          <Modal 
            key="add-schedule-modal" 
            isOpen={showScheduleModal} 
            onClose={() => {
              setShowScheduleModal(false);
              setEditingTimeBlock(null);
              setScheduleDefaults(null);
            }} 
            title={editingTimeBlock ? "Edit Time Block" : "New Time Block"}
          >
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const data = {
                startTime: fd.get('startTime') as string,
                endTime: fd.get('endTime') as string,
                activity: fd.get('activity') as string,
                emoji: modalEmoji,
                date: fd.get('date') as string,
                color: modalColor,
                subtasks: modalSubtasks,
              };
              
              if (editingTimeBlock) {
                handleEditTimeBlock(editingTimeBlock.id, data);
              } else {
                handleAddTimeBlock(data);
              }
            }} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-2">Activity Name & Emoji</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={modalEmoji}
                    onChange={(e) => setModalEmoji(e.target.value)}
                    placeholder="⚡"
                    title="Emoji Icon"
                    className="w-12 h-11 text-center text-lg rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-bold"
                  />
                  <input 
                    name="activity"
                    type="text" 
                    required
                    autoFocus
                    defaultValue={editingTimeBlock?.activity || ''}
                    placeholder="e.g. Deep Work, Gym, Lunch, Client Meeting"
                    className="flex-1 px-4 py-3 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-bold text-sm dark:text-zinc-100"
                  />
                </div>

                {/* QUICK EMOJI SELECTOR ROW */}
                <div className="mt-2 flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                  <span className="text-[9px] font-bold uppercase text-zinc-400 shrink-0 mr-0.5">Quick Emoji:</span>
                  {['🎯', '⚡', '📚', '💪', '🥗', '☕', '💻', '🧠', '🎨', '🎧', '🛌', '🏃', '📝', '💼', '🧘', '🚀', '🔥', '⚽', '🛒', '🏖️'].map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setModalEmoji(e)}
                      className={`w-7 h-7 shrink-0 rounded-lg text-sm flex items-center justify-center transition-all ${
                        modalEmoji === e 
                          ? 'bg-amber-500/20 border-2 border-amber-500 scale-110 shadow-sm' 
                          : 'bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                  {modalEmoji && (
                    <button
                      type="button"
                      onClick={() => setModalEmoji('')}
                      className="text-[9px] font-mono font-bold text-zinc-400 hover:text-red-500 px-1.5 py-1 shrink-0"
                      title="Clear emoji"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* COLOR SELECTION */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em]">Block Color</label>
                  <Palette className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <div className="p-3 bg-zinc-100/80 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl">
                  <div className="flex flex-wrap gap-2.5 justify-start items-center">
                    {COLOR_OPTIONS.map(col => {
                      const isSelected = modalColor === col.id;
                      const isLight = ['yellow', 'gold', 'lime', 'mint'].includes(col.id);
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => setModalColor(col.id)}
                          title={col.name}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            isSelected 
                              ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-zinc-950 scale-110 shadow-md' 
                              : 'hover:scale-110 opacity-90 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: col.dot }}
                        >
                          {isSelected && (
                            <Check className={`w-4 h-4 ${isLight ? 'text-zinc-900' : 'text-white'} drop-shadow-sm`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected color indicator pill matching image_1 */}
                  <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-center">
                    <div className="w-full py-1.5 px-3 bg-white dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl flex items-center justify-center gap-2 shadow-sm text-xs font-bold text-zinc-800 dark:text-zinc-100">
                      <div 
                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0" 
                        style={{ backgroundColor: COLOR_OPTIONS.find(c => c.id === modalColor)?.dot || '#4f46e5' }}
                      >
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span>{COLOR_OPTIONS.find(c => c.id === modalColor)?.name || 'Default'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-2">Date</label>
                  <input 
                    name="date"
                    type="date" 
                    required
                    defaultValue={editingTimeBlock?.date || scheduleDefaults?.date || format(startOfToday(), 'yyyy-MM-dd')}
                    className="w-full px-3 py-2.5 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-bold text-xs dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-2">Start Time</label>
                  <input 
                    name="startTime"
                    type="time" 
                    required
                    defaultValue={editingTimeBlock?.startTime || scheduleDefaults?.startTime || '09:00'}
                    className="w-full px-3 py-2.5 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-bold text-xs dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-2">End Time</label>
                  <input 
                    name="endTime"
                    type="time" 
                    required
                    defaultValue={editingTimeBlock?.endTime || scheduleDefaults?.endTime || '10:00'}
                    className="w-full px-3 py-2.5 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-bold text-xs dark:text-zinc-200"
                  />
                </div>
              </div>

              {/* TASKS LIST FOR THIS TIME BLOCK */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-2">
                  Tasks Checklist for this Block
                </label>

                <div className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    value={newSubtaskInput}
                    onChange={(e) => setNewSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newSubtaskInput.trim()) {
                          setModalSubtasks([...modalSubtasks, { id: Date.now().toString(), text: newSubtaskInput.trim(), completed: false }]);
                          setNewSubtaskInput('');
                        }
                      }
                    }}
                    placeholder="Add a task e.g. Read chapter 2, Outline report..."
                    className="flex-1 px-3 py-2 rounded-lg border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-medium dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSubtaskInput.trim()) {
                        setModalSubtasks([...modalSubtasks, { id: Date.now().toString(), text: newSubtaskInput.trim(), completed: false }]);
                        setNewSubtaskInput('');
                      }
                    }}
                    className="px-3 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg text-xs font-bold flex items-center gap-1 hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Task
                  </button>
                </div>

                {modalSubtasks.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                    {modalSubtasks.map((st, idx) => (
                      <div key={st.id} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                          <input 
                            type="checkbox" 
                            checked={st.completed}
                            onChange={() => {
                              const updated = [...modalSubtasks];
                              updated[idx].completed = !updated[idx].completed;
                              setModalSubtasks(updated);
                            }}
                            className="rounded text-amber-500 focus:ring-amber-500 shrink-0"
                          />
                          <span className={`truncate ${st.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : 'font-medium dark:text-zinc-200'}`}>
                            {st.text}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setModalSubtasks(modalSubtasks.filter(t => t.id !== st.id))}
                          className="text-zinc-400 hover:text-red-500 p-1 shrink-0"
                          title="Remove task"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-6 flex gap-3 sticky bottom-0 bg-white dark:bg-zinc-950 pb-2">
                <Button type="button" variant="secondary" onClick={() => {
                  setShowScheduleModal(false);
                  setEditingTimeBlock(null);
                  setScheduleDefaults(null);
                }} className="flex-1 text-xs dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 h-10">Cancel</Button>
                <Button type="submit" className="flex-[2] text-xs font-bold dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white h-10">{editingTimeBlock ? "Update Block" : "Save Block"}</Button>
              </div>
            </form>
          </Modal>
        )}
        {showOverthinkingModal && (
          <Modal 
            key="add-overthinking-modal" 
            isOpen={showOverthinkingModal} 
            onClose={() => {
              setShowOverthinkingModal(false);
              setEditingOverthinkingLog(null);
            }} 
            title={editingOverthinkingLog ? "Edit Overthinking Log" : "Log Overthinking"}
          >
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const data = {
                intensity: parseInt(fd.get('intensity') as string),
                trigger: fd.get('trigger') as string,
                thoughts: fd.get('thoughts') as string
              };

              if (editingOverthinkingLog) {
                handleUpdateOverthinking(editingOverthinkingLog.id, data);
              } else {
                handleAddOverthinking(data);
              }
            }} className="space-y-8">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Intensity (1-10)</label>
                <input 
                  name="intensity"
                  type="range" 
                  min="1" 
                  max="10" 
                  defaultValue={editingOverthinkingLog?.intensity || "5"}
                  className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                />
                <div className="flex justify-between text-[8px] font-bold text-zinc-300 dark:text-zinc-700 mt-2 tracking-widest uppercase">
                  <span>Tranquil</span>
                  <span>Overwhelmed</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Trigger / Context</label>
                <input 
                  name="trigger"
                  type="text" 
                  defaultValue={editingOverthinkingLog?.trigger || ""}
                  placeholder="e.g. Work deadline, Social situation"
                  className="w-full px-4 py-4 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-bold text-sm dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Current Thoughts</label>
                <textarea 
                  name="thoughts"
                  rows={3}
                  defaultValue={editingOverthinkingLog?.thoughts || ""}
                  placeholder="What's spinning in your head?"
                  className="w-full px-4 py-4 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-bold text-sm dark:text-zinc-100"
                />
              </div>
              <div className="pt-6 flex gap-3 sticky bottom-0 bg-white dark:bg-zinc-950 pb-2">
                <Button type="button" variant="secondary" onClick={() => {
                  setShowOverthinkingModal(false);
                  setEditingOverthinkingLog(null);
                }} className="flex-1 text-xs dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 h-10">Cancel</Button>
                <Button type="submit" className="flex-[2] text-xs font-bold dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white h-10">{editingOverthinkingLog ? "Update Entry" : "Log Entry"}</Button>
              </div>
            </form>
          </Modal>
      )}

        {showJournalModal && (
          <Modal 
            key="journal-modal" 
            isOpen={showJournalModal} 
            onClose={() => {
              setShowJournalModal(false);
              setEditingJournalEntry(null);
            }} 
            title={editingJournalEntry ? "Edit Entry" : "New Journal Entry"}
          >
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              handleSaveJournalEntry({
                title: fd.get('title') as string,
                mood: fd.get('mood') as string,
                content: fd.get('content') as string,
                lostControl: fd.get('lostControl') as string,
                trigger: fd.get('trigger') as string,
                improvementTomorrow: fd.get('improvementTomorrow') as string,
                learningFromMistake: fd.get('learningFromMistake') as string
              });
            }} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Title</label>
                <input 
                  name="title"
                  type="text" 
                  required
                  autoFocus
                  defaultValue={editingJournalEntry?.title || ''}
                  placeholder="Today's Reflections..."
                  className="w-full px-4 py-4 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-bold text-lg dark:text-zinc-100"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Mood</label>
                  <input 
                    name="mood"
                    type="text" 
                    defaultValue={editingJournalEntry?.mood || ''}
                    placeholder="e.g. Grateful, Calm"
                    className="w-full px-4 py-4 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-bold text-sm dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">One improvement tomorrow</label>
                  <input 
                    name="improvementTomorrow"
                    type="text" 
                    defaultValue={editingJournalEntry?.improvementTomorrow || ''}
                    placeholder="Be more patient..."
                    className="w-full px-4 py-4 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-bold text-sm dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Where did you lose control?</label>
                  <input 
                    name="lostControl"
                    type="text" 
                    defaultValue={editingJournalEntry?.lostControl || ''}
                    placeholder="Specific moment..."
                    className="w-full px-4 py-4 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-bold text-sm dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">What triggered it?</label>
                  <input 
                    name="trigger"
                    type="text" 
                    defaultValue={editingJournalEntry?.trigger || ''}
                    placeholder="Internal/External trigger..."
                    className="w-full px-4 py-4 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-bold text-sm dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Today's learning from mistake</label>
                <input 
                  name="learningFromMistake"
                  type="text" 
                  defaultValue={editingJournalEntry?.learningFromMistake || ''}
                  placeholder="Key takeaway..."
                  className="w-full px-4 py-4 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-bold text-sm dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Content</label>
                <textarea 
                  name="content"
                  rows={4}
                  required
                  defaultValue={editingJournalEntry?.content || ''}
                  placeholder="Let your thoughts flow..."
                  className="w-full px-4 py-4 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-medium text-sm dark:text-zinc-100 leading-relaxed resize-none"
                />
              </div>
              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white dark:bg-zinc-950 pb-2">
                <Button type="button" variant="secondary" onClick={() => {
                  setShowJournalModal(false);
                  setEditingJournalEntry(null);
                }} className="flex-1 text-xs dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 h-10">Cancel</Button>
                <Button type="submit" className="flex-[2] text-xs font-bold dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white h-10">
                  {editingJournalEntry ? "Update Entry" : "Save Entry"}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {showExamModal && (
          <Modal key="exam-modal" isOpen={showExamModal} onClose={() => { setShowExamModal(false); setEditingExam(null); }} title={editingExam ? "Edit Milestone" : "Add Milestone"}>
            <form onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              const data = {
                title: d.get('title') as string,
                date: d.get('date') as string,
                time: d.get('time') as string
              };
              if (editingExam) {
                handleUpdateExam(editingExam.id, data);
              } else {
                handleAddExam(data);
              }
            }} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Milestone Title</label>
                <input 
                  name="title"
                  type="text" 
                  required
                  defaultValue={editingExam?.title || ''}
                  placeholder="Final Exam / Project Due..."
                  className="w-full px-4 py-4 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-bold text-sm dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Target Date</label>
                  <input 
                    name="date"
                    type="date" 
                    required
                    defaultValue={editingExam?.date || format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-4 py-4 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-bold text-sm dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Target Time</label>
                  <input 
                    name="time"
                    type="time" 
                    required
                    defaultValue={editingExam?.time || '09:00'}
                    className="w-full px-4 py-4 rounded-sm border border-high-line dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-bold text-sm dark:text-zinc-100 uppercase"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="secondary" onClick={() => {
                  setShowExamModal(false);
                  setEditingExam(null);
                }} className="flex-1 text-xs dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 h-10">Cancel</Button>
                <Button type="submit" className="flex-[2] text-xs font-bold dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white h-10">
                  {editingExam ? "Update Milestone" : "Start Countdown"}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {showAuthModal && (
          <Modal key="auth-modal" isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} title={authMode === 'login' ? 'Initiate Session' : 'Create Account'}>
            <div className="w-12 h-12 bg-zinc-900 rounded flex items-center justify-center mx-auto mb-8 shadow-lg dark:bg-zinc-100">
              <Flame className="w-6 h-6 text-white dark:text-zinc-900" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tighter text-zinc-900 dark:text-white mb-2 text-center uppercase">MOMENTUM</h1>
            <p className="text-zinc-500 text-[10px] mb-8 text-center uppercase tracking-widest font-bold">Focused protocol for the high performer.</p>
            
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 tracking-widest">Email Address</label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-high-line dark:border-zinc-800 rounded font-bold text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 tracking-widest">Password</label>
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-high-line dark:border-zinc-800 rounded font-bold text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                  placeholder="••••••••"
                />
              </div>

              {authError && (
                <p className="text-[10px] text-red-500 font-bold bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-100 dark:border-red-900/50">
                  {authError}
                </p>
              )}

              <Button type="submit" disabled={isAuthenticating} className="w-full py-3 h-auto font-bold tracking-tight text-xs uppercase">
                {isAuthenticating ? 'Processing...' : (authMode === 'login' ? 'Initiate Session' : 'Create Account')}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-high-line dark:border-zinc-800 text-center">
              <button 
                disabled={isAuthenticating}
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors disabled:opacity-50"
              >
                {authMode === 'login' ? 'New User? Register here' : 'Already have an account? Log in'}
              </button>
            </div>

            <div className="mt-6">
              <button 
                disabled={isAuthenticating}
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-2 py-3 border border-high-line dark:border-zinc-800 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all text-[10px] font-bold uppercase tracking-widest text-zinc-400 focus:outline-none disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {isAuthenticating ? 'Connecting...' : 'Sign in with Google'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInstallHelp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-100 p-8 rounded-lg max-w-sm w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowInstallHelp(false)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shrink-0">
                  <Share2 className="w-6 h-6 text-white dark:text-zinc-900" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tighter dark:text-white">Install Momentum</h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Tap the <span className="font-bold text-zinc-900 dark:text-zinc-100 underline decoration-zinc-300">Share button</span> in your browser's toolbar.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Scroll down and select <span className="font-bold text-zinc-900 dark:text-zinc-100">"Add to Home Screen"</span>.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Tap <span className="font-bold text-zinc-900 dark:text-zinc-100">"Add"</span> to finish. Reclaim your focus instantly.</p>
                  </div>
                </div>
                
                <Button 
                  onClick={() => setShowInstallHelp(false)}
                  className="w-full h-12 font-black uppercase tracking-widest text-xs"
                >
                  Got It
                </Button>
              </div>
            </motion.div>
          </div>
        )}
        {urgeSession && urgeSession.showBreather && (
          <BreathingGuide 
            onBack={() => setUrgeSession(prev => prev ? { ...prev, showBreather: false } : null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
