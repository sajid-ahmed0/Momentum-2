import React, { useState, useRef, useEffect } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO
} from 'date-fns';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Plus,
  GripVertical,
  Edit2,
  Copy,
  Clipboard,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Calendar as CalendarIcon,
  Check,
  X,
  ListChecks
} from 'lucide-react';
import { CategorySpec, StudyTask } from '../../types';
import { SubjectIcon } from './SubjectIcon';

interface StudyCalendarViewProps {
  tasks: StudyTask[];
  categories: CategorySpec[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onSwitchToDailyPlan: () => void;
  onMoveTaskDate: (taskId: string, targetDateStr: string) => void;
  onReorderTasksForDate: (dateStr: string, reorderedTasks: StudyTask[]) => void;
  onToggleTask: (taskId: string) => void;
  onUpdateTaskName: (taskId: string, newName: string) => void;
  onDuplicateTask: (task: StudyTask) => void;
  onDeleteTask: (task: StudyTask) => void;
  onQuickAddTask: (dateStr: string, name: string) => void;
}

export const StudyCalendarView: React.FC<StudyCalendarViewProps> = ({
  tasks,
  categories,
  selectedDate,
  onSelectDate,
  onSwitchToDailyPlan,
  onMoveTaskDate,
  onReorderTasksForDate,
  onToggleTask,
  onUpdateTaskName,
  onDuplicateTask,
  onDeleteTask,
  onQuickAddTask
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    try {
      return parseISO(selectedDate);
    } catch {
      return new Date();
    }
  });

  const [gridDensity, setGridDensity] = useState<'sm' | 'md' | 'lg'>('md');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [quickInput, setQuickInput] = useState<string>('');

  // Inline editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState<string>('');

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    task: StudyTask;
  } | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));

  // Compute month days matrix
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getCategorySpec = (catId: string): CategorySpec => {
    return (
      categories.find((c) => c.id === catId) || {
        id: catId,
        name: 'General',
        color: 'text-zinc-600',
        bgLight: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
        badge: 'bg-zinc-500',
        borderClass: 'border-zinc-200',
        icon: 'BookOpen'
      }
    );
  };

  // Tasks for the currently selected date in side panel
  const rosterTasks = tasks.filter((t) => t.date === selectedDate);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnDate = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      onMoveTaskDate(taskId, targetDateStr);
    }
    setDraggedTaskId(null);
  };

  // Inline edit handlers
  const startEditing = (task: StudyTask) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.name);
    setContextMenu(null);
  };

  const saveEditing = (taskId: string) => {
    const trimmed = editingTaskText.trim();
    if (trimmed) {
      onUpdateTaskName(taskId, trimmed);
    }
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  // Context menu trigger
  const handleTaskContextMenu = (e: React.MouseEvent, task: StudyTask) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      task
    });
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard?.writeText(text);
    setContextMenu(null);
  };

  // Density classes
  const getDayHeightClass = () => {
    switch (gridDensity) {
      case 'sm':
        return 'min-h-[75px] max-h-[85px] p-1.5';
      case 'lg':
        return 'min-h-[140px] p-3';
      case 'md':
      default:
        return 'min-h-[105px] p-2';
    }
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    onQuickAddTask(selectedDate, quickInput.trim());
    setQuickInput('');
  };

  return (
    <div
      className={`bg-zinc-50 dark:bg-zinc-950 transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 p-6 overflow-y-auto' : 'space-y-4'
      }`}
    >
      {/* Top Calendar Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-3.5 px-5 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSwitchToDailyPlan}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Daily Plan</span>
          </button>

          {/* Month / Year Stepper */}
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/90 p-1 rounded-2xl">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-100 min-w-[120px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Tools: Density & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Density Picker */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold">
            {(['sm', 'md', 'lg'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setGridDensity(d)}
                className={`px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] transition-all ${
                  gridDensity === d
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Calendar'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Calendar + Missions Roster Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Monthly Grid (8 cols on lg) */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-4 shadow-sm overflow-hidden">
          {/* Weekday Labels (Mon - Sun) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <span
                key={day}
                className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 py-1"
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isDayToday = isToday(day);
              const isSelected = dateStr === selectedDate;

              const dayTasks = tasks.filter((t) => t.date === dateStr);
              const completedCount = dayTasks.filter((t) => t.completed).length;

              return (
                <div
                  key={dateStr}
                  onClick={() => onSelectDate(dateStr)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnDate(e, dateStr)}
                  className={`relative flex flex-col justify-between rounded-2xl border transition-all cursor-pointer ${getDayHeightClass()} ${
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-50/20 dark:bg-amber-950/20'
                      : isDayToday
                      ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/40'
                      : 'border-zinc-100 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                  } ${!isCurrentMonth ? 'opacity-40 bg-zinc-50/30 dark:bg-zinc-950/40' : ''}`}
                >
                  {/* Top Bar of Day: Day Number & Today indicator */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold rounded-lg px-1.5 py-0.5 ${
                        isDayToday
                          ? 'bg-amber-500 text-white font-black'
                          : isSelected
                          ? 'text-amber-600 dark:text-amber-400 font-black'
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>

                    {dayTasks.length > 0 && (
                      <span
                        className={`text-[9px] font-mono font-bold px-1 rounded-md ${
                          completedCount === dayTasks.length
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {completedCount}/{dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Task preview pills (drag-and-drop enabled) */}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {dayTasks.slice(0, gridDensity === 'sm' ? 1 : gridDensity === 'lg' ? 4 : 2).map((t) => {
                      const cat = getCategorySpec(t.category);
                      return (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, t.id)}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg truncate flex items-center gap-1 transition-all ${
                            t.completed
                              ? 'line-through opacity-50 bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                              : `${cat.bgLight} hover:scale-[1.02]`
                          }`}
                          title={`${t.name} (drag to move date)`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cat.badge} shrink-0`} />
                          <span className="truncate">{t.name}</span>
                        </div>
                      );
                    })}

                    {dayTasks.length > (gridDensity === 'sm' ? 1 : gridDensity === 'lg' ? 4 : 2) && (
                      <div className="text-[9px] font-mono text-zinc-400 pl-1">
                        +{dayTasks.length - (gridDensity === 'sm' ? 1 : gridDensity === 'lg' ? 4 : 2)} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Missions Roster (Right Side Panel - 4 cols on lg) */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                Missions Roster
              </span>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {format(parseISO(selectedDate), 'EEEE, MMM d, yyyy')}
              </h4>
            </div>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {rosterTasks.length} {rosterTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          {/* Quick Add Inline Bar */}
          <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Quick add mission to this day..."
              className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500 font-medium"
            />
            <button
              type="submit"
              disabled={!quickInput.trim()}
              className="p-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl shadow-sm transition-all shrink-0 cursor-pointer"
              title="Add task to date"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Reorderable Tasks List */}
          {rosterTasks.length === 0 ? (
            <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
              <CalendarIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No missions scheduled for this day. Type above or drag tasks here from the calendar.
              </p>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={rosterTasks}
              onReorder={(newOrder) => onReorderTasksForDate(selectedDate, newOrder)}
              className="space-y-2 max-h-[480px] overflow-y-auto pr-1"
            >
              {rosterTasks.map((task) => {
                const cat = getCategorySpec(task.category);
                const isEditing = editingTaskId === task.id;

                return (
                  <Reorder.Item
                    key={task.id}
                    value={task}
                    onContextMenu={(e) => handleTaskContextMenu(e, task)}
                    className="relative group flex items-start gap-2.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/80 hover:border-amber-400/60 shadow-sm transition-all"
                  >
                    {/* Drag Handle */}
                    <div className="cursor-grab active:cursor-grabbing text-zinc-300 group-hover:text-zinc-500 mt-1 shrink-0">
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    {/* Completion Toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      className="mt-0.5 text-zinc-400 hover:text-emerald-500 shrink-0 cursor-pointer"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>

                    {/* Task Content or Inline Edit */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cat.bgLight}`}>
                          {cat.name}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {task.estMinutes}m
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="text"
                            value={editingTaskText}
                            onChange={(e) => setEditingTaskText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditing(task.id);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            autoFocus
                            className="flex-1 px-2 py-1 bg-white dark:bg-zinc-900 border border-emerald-500 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => saveEditing(task.id)}
                            className="p-1 rounded-md bg-emerald-500 text-white hover:bg-emerald-600"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="p-1 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <h5
                          onDoubleClick={() => startEditing(task)}
                          className={`text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate cursor-pointer select-none ${
                            task.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : ''
                          }`}
                          title="Double-click or right-click to edit"
                        >
                          {task.name}
                        </h5>
                      )}
                    </div>

                    {/* Quick Delete */}
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 p-1 transition-opacity shrink-0"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          )}
        </div>
      </div>

      {/* Custom Right-Click Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            ref={contextMenuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              top: Math.min(contextMenu.y, window.innerHeight - 180),
              left: Math.min(contextMenu.x, window.innerWidth - 200)
            }}
            className="fixed z-50 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1.5 shadow-2xl space-y-0.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200"
          >
            <button
              type="button"
              onClick={() => startEditing(contextMenu.task)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
            >
              <Edit2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Edit Text</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onDuplicateTask(contextMenu.task);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-500" />
              <span>Duplicate Task</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyText(contextMenu.task.name)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
            >
              <Clipboard className="w-3.5 h-3.5 text-emerald-500" />
              <span>Copy Text</span>
            </button>

            <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />

            <button
              type="button"
              onClick={() => {
                onDeleteTask(contextMenu.task);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
