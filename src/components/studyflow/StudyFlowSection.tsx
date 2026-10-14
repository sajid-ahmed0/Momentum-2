import React, { useState, useEffect } from 'react';
import {
  format,
  addDays,
  subDays,
  isToday,
  parseISO
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  LayoutDashboard,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  ListFilter
} from 'lucide-react';
import { CategorySpec, StudyTask } from '../../types';
import {
  DEFAULT_SUBJECTS,
  getInitialDemoTasks,
  LOCAL_STORAGE_TASKS_KEY,
  LOCAL_STORAGE_SUBJECTS_KEY
} from './constants';
import { SubjectIcon } from './SubjectIcon';
import { StudyModal, ModalConfig } from './StudyModal';
import { StudyTaskForm } from './StudyTaskForm';
import { StudyTaskList } from './StudyTaskList';
import { StudyInsights } from './StudyInsights';
import { StudySubjectManager } from './StudySubjectManager';
import { StudyCalendarView } from './StudyCalendarView';

export const StudyFlowSection: React.FC = () => {
  // Current view mode: 'dashboard' | 'calendar'
  const [viewMode, setViewMode] = useState<'dashboard' | 'calendar'>('dashboard');

  // Currently selected date for daily plan & roster (format: YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));

  // Active category filter for sidebar & list
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  // Modal Dialog state (sandboxing safeguard - no window.confirm or window.alert)
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    isOpen: false,
    title: '',
    message: ''
  });

  // State: Subjects / Categories
  const [categories, setCategories] = useState<CategorySpec[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SUBJECTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SUBJECTS;
  });

  // State: Tasks
  const [tasks, setTasks] = useState<StudyTask[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return getInitialDemoTasks();
  });

  // Persist categories to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SUBJECTS_KEY, JSON.stringify(categories));
    } catch {}
  }, [categories]);

  // Persist tasks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  // Date navigation handlers
  const handlePrevDay = () => {
    setSelectedDate((prev) => {
      try {
        return format(subDays(parseISO(prev), 1), 'yyyy-MM-dd');
      } catch {
        return format(new Date(), 'yyyy-MM-dd');
      }
    });
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => {
      try {
        return format(addDays(parseISO(prev), 1), 'yyyy-MM-dd');
      } catch {
        return format(new Date(), 'yyyy-MM-dd');
      }
    });
  };

  const handleJumpToToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  // Task operations
  const handleAddTask = (newTaskData: Omit<StudyTask, 'id' | 'createdAt'>) => {
    const newTask: StudyTask = {
      ...newTaskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleToggleSubTask = (taskId: string, subTaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId || !t.subTasks) return t;
        const updatedSubs = t.subTasks.map((st) =>
          st.id === subTaskId ? { ...st, completed: !st.completed } : st
        );
        return { ...t, subTasks: updatedSubs };
      })
    );
  };

  const handleAdjustActualMinutes = (taskId: string, delta: number) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const nextMins = Math.max(0, (t.actualMinutes || 0) + delta);
        return { ...t, actualMinutes: nextMins };
      })
    );
  };

  const handleRequestDeleteTask = (task: StudyTask) => {
    setModalConfig({
      isOpen: true,
      type: 'danger',
      title: 'Delete Study Mission?',
      message: `Are you sure you want to delete "${task.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete Mission',
      onConfirm: () => {
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
      }
    });
  };

  const handleMoveTaskDate = (taskId: string, targetDateStr: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, date: targetDateStr } : t))
    );
  };

  const handleReorderTasksForDate = (dateStr: string, reorderedDayTasks: StudyTask[]) => {
    setTasks((prev) => {
      const otherTasks = prev.filter((t) => t.date !== dateStr);
      return [...reorderedDayTasks, ...otherTasks];
    });
  };

  const handleUpdateTaskName = (taskId: string, newName: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, name: newName } : t))
    );
  };

  const handleDuplicateTask = (task: StudyTask) => {
    const duplicated: StudyTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `${task.name} (Copy)`,
      completed: false,
      createdAt: new Date().toISOString()
    };
    setTasks((prev) => [duplicated, ...prev]);
  };

  const handleQuickAddTask = (dateStr: string, name: string) => {
    const newTask: StudyTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      category: activeCategoryFilter || categories[0]?.id || 'math',
      estMinutes: 45,
      actualMinutes: 0,
      completed: false,
      priority: 'medium',
      createdAt: new Date().toISOString(),
      date: dateStr
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  // Category operations
  const handleAddCategory = (newCat: CategorySpec) => {
    setCategories((prev) => [...prev, newCat]);
  };

  const handleRequestDeleteCategory = (category: CategorySpec) => {
    if (categories.length <= 1) {
      setModalConfig({
        isOpen: true,
        type: 'warning',
        title: 'Cannot Delete Subject',
        message: 'You must maintain at least one study subject in your curriculum.',
        confirmLabel: 'Understood',
        hideCancel: true
      });
      return;
    }

    const fallbackCat = categories.find((c) => c.id !== category.id)!;
    const affectedCount = tasks.filter((t) => t.category === category.id).length;

    setModalConfig({
      isOpen: true,
      type: 'danger',
      title: `Delete Subject "${category.name}"?`,
      message: affectedCount > 0
        ? `This subject currently has ${affectedCount} scheduled mission(s). They will be safely re-assigned to "${fallbackCat.name}".`
        : `Are you sure you want to delete "${category.name}"?`,
      confirmLabel: 'Delete & Reassign',
      onConfirm: () => {
        setCategories((prev) => prev.filter((c) => c.id !== category.id));
        setTasks((prev) =>
          prev.map((t) => (t.category === category.id ? { ...t, category: fallbackCat.id } : t))
        );
        if (activeCategoryFilter === category.id) {
          setActiveCategoryFilter(null);
        }
      }
    });
  };

  // Reset workspace
  const handleRequestResetWorkspace = () => {
    setModalConfig({
      isOpen: true,
      type: 'warning',
      title: 'Reset StudyFlow Workspace?',
      message: 'This will reset all study tasks and categories back to demo defaults. Your custom tasks will be erased.',
      confirmLabel: 'Reset Everything',
      onConfirm: () => {
        setTasks(getInitialDemoTasks());
        setCategories(DEFAULT_SUBJECTS);
        setActiveCategoryFilter(null);
        setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
      }
    });
  };

  // Calculate day summary stats
  const dayTasks = tasks.filter((t) => t.date === selectedDate);
  const dayDoneCount = dayTasks.filter((t) => t.completed).length;
  const dayPercent = dayTasks.length > 0 ? Math.round((dayDoneCount / dayTasks.length) * 100) : 0;
  const dayTotalMinutes = dayTasks.reduce((sum, t) => sum + (t.estMinutes || 0), 0);

  const selectedDateObj = React.useMemo(() => {
    try {
      return parseISO(selectedDate);
    } catch {
      return new Date();
    }
  }, [selectedDate]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Top Application Header Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Brand & Active View Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                  StudyFlow
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Task Manager
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {viewMode === 'dashboard' ? "Today's Study Plan & Focus Missions" : 'Study Plan Schedule & Calendar'}
                {' • '}
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {format(selectedDateObj, 'EEEE, MMMM d, yyyy')}
                </span>
              </p>
            </div>
          </div>

          {/* Stepper + View Switcher + Reset */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Switcher Stepper */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/90 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700/60">
              <button
                type="button"
                onClick={handlePrevDay}
                className="p-1 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleJumpToToday}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                  isToday(selectedDateObj)
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700'
                }`}
              >
                {isToday(selectedDateObj) ? 'Today' : format(selectedDateObj, 'MMM d')}
              </button>

              <button
                type="button"
                onClick={handleNextDay}
                className="p-1 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* View Switcher: Dashboard vs Calendar */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/90 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700/60">
              <button
                type="button"
                onClick={() => setViewMode('dashboard')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  viewMode === 'dashboard'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard Plan</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Monthly Calendar</span>
              </button>
            </div>

            {/* Reset Workspace Button */}
            <button
              type="button"
              onClick={handleRequestResetWorkspace}
              className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 transition-colors"
              title="Reset StudyFlow Workspace to Demo Data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Subject Filter Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 shrink-0 flex items-center gap-1">
            <ListFilter className="w-3 h-3" />
            Filter:
          </span>
          <button
            type="button"
            onClick={() => setActiveCategoryFilter(null)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeCategoryFilter === null
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            All Courses ({tasks.filter((t) => t.date === selectedDate).length})
          </button>
          {categories.map((cat) => {
            const countForDay = tasks.filter(
              (t) => t.date === selectedDate && t.category === cat.id
            ).length;
            const isSelected = activeCategoryFilter === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryFilter(isSelected ? null : cat.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-amber-500 text-white shadow-sm'
                    : `${cat.bgLight} hover:opacity-90`
                }`}
              >
                <SubjectIcon name={cat.icon} className="w-3 h-3 shrink-0" />
                <span>{cat.name}</span>
                {countForDay > 0 && (
                  <span className="text-[10px] px-1 rounded-md bg-black/10 dark:bg-white/20 font-mono">
                    {countForDay}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Dual View Area */}
      <AnimatePresence mode="wait">
        {viewMode === 'dashboard' ? (
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          >
            {/* 8 Columns: Task Form + Task List */}
            <div className="lg:col-span-8 space-y-6">
              <StudyTaskForm
                categories={categories}
                selectedDate={selectedDate}
                activeCategoryFilter={activeCategoryFilter}
                onAddTask={handleAddTask}
              />

              <StudyTaskList
                tasks={tasks}
                categories={categories}
                selectedDate={selectedDate}
                activeCategoryFilter={activeCategoryFilter}
                onSelectCategoryFilter={setActiveCategoryFilter}
                onToggleTask={handleToggleTask}
                onToggleSubTask={handleToggleSubTask}
                onAdjustActualMinutes={handleAdjustActualMinutes}
                onRequestDeleteTask={handleRequestDeleteTask}
              />
            </div>

            {/* 4 Columns: Insights + Subject Manager */}
            <div className="lg:col-span-4 space-y-6">
              <StudyInsights
                tasks={tasks}
                categories={categories}
                selectedDate={selectedDate}
              />

              <StudySubjectManager
                categories={categories}
                tasks={tasks}
                onAddCategory={handleAddCategory}
                onRequestDeleteCategory={handleRequestDeleteCategory}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="calendar-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <StudyCalendarView
              tasks={tasks}
              categories={categories}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onSwitchToDailyPlan={() => setViewMode('dashboard')}
              onMoveTaskDate={handleMoveTaskDate}
              onReorderTasksForDate={handleReorderTasksForDate}
              onToggleTask={handleToggleTask}
              onUpdateTaskName={handleUpdateTaskName}
              onDuplicateTask={handleDuplicateTask}
              onDeleteTask={handleRequestDeleteTask}
              onQuickAddTask={handleQuickAddTask}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-app Sandboxed Modal Dialog */}
      <StudyModal
        config={modalConfig}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
