import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Minus,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  ListFilter,
  Check,
  AlertCircle
} from 'lucide-react';
import { CategorySpec, Priority, StudyTask, SubTask } from '../../types';
import { SubjectIcon } from './SubjectIcon';

interface StudyTaskListProps {
  tasks: StudyTask[];
  categories: CategorySpec[];
  selectedDate: string; // YYYY-MM-DD
  activeCategoryFilter: string | null;
  onSelectCategoryFilter: (catId: string | null) => void;
  onToggleTask: (taskId: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onAdjustActualMinutes: (taskId: string, delta: number) => void;
  onRequestDeleteTask: (task: StudyTask) => void;
}

export const StudyTaskList: React.FC<StudyTaskListProps> = ({
  tasks,
  categories,
  selectedDate,
  activeCategoryFilter,
  onSelectCategoryFilter,
  onToggleTask,
  onToggleSubTask,
  onAdjustActualMinutes,
  onRequestDeleteTask
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [expandedNotesIds, setExpandedNotesIds] = useState<Set<string>>(new Set());

  const toggleNotes = (id: string) => {
    setExpandedNotesIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter tasks by date, status, and category
  const filteredTasks = tasks.filter((task) => {
    if (task.date !== selectedDate) return false;
    if (statusFilter === 'active' && task.completed) return false;
    if (statusFilter === 'completed' && !task.completed) return false;
    if (activeCategoryFilter && task.category !== activeCategoryFilter) return false;
    return true;
  });

  const getCategorySpec = (catId: string): CategorySpec => {
    return (
      categories.find((c) => c.id === catId) || {
        id: catId,
        name: 'General',
        color: 'text-zinc-600 dark:text-zinc-400',
        bgLight: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
        badge: 'bg-zinc-500',
        borderClass: 'border-zinc-200 dark:border-zinc-700',
        icon: 'BookOpen'
      }
    );
  };

  const getPriorityBadge = (p: Priority) => {
    switch (p) {
      case 'high':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
            Medium
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
            Low
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtering Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-2.5 px-4 shadow-sm">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/90 p-1 rounded-xl">
          {(['all', 'active', 'completed'] as const).map((tab) => {
            const count = tasks.filter((t) => {
              if (t.date !== selectedDate) return false;
              if (tab === 'active') return !t.completed;
              if (tab === 'completed') return t.completed;
              return true;
            }).length;

            const isActive = statusFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1 text-xs font-bold rounded-lg capitalize transition-all ${
                  isActive
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        {/* Subject Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => onSelectCategoryFilter(null)}
            className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all ${
              activeCategoryFilter === null
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            All Subjects
          </button>
          {categories.map((cat) => {
            const isCatActive = activeCategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategoryFilter(isCatActive ? null : cat.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-xl transition-all ${
                  isCatActive
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                    : `${cat.bgLight} hover:opacity-90`
                }`}
              >
                <SubjectIcon name={cat.icon} className="w-3 h-3 shrink-0" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Task List Items */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-10 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-500">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            {statusFilter === 'completed'
              ? 'No completed tasks yet for this date'
              : statusFilter === 'active'
              ? 'All tasks completed! Fantastic work!'
              : 'No study missions scheduled for this day'}
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            Use the form above to plan your study sessions, or select another date from the header.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task) => {
              const catSpec = getCategorySpec(task.category);
              const isNotesExpanded = expandedNotesIds.has(task.id);
              const subTasksTotal = task.subTasks?.length || 0;
              const subTasksDone = task.subTasks?.filter((st) => st.completed).length || 0;

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`group bg-white dark:bg-zinc-900 border rounded-3xl p-4 transition-all ${
                    task.completed
                      ? 'border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 opacity-75'
                      : 'border-zinc-200/90 dark:border-zinc-800 hover:border-amber-400/50 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Completion Checkbox */}
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      className="mt-0.5 text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                      title={task.completed ? 'Mark as incomplete' : 'Mark as completed'}
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950/40" />
                      ) : (
                        <Circle className="w-5 h-5 hover:scale-110 transition-transform" />
                      )}
                    </button>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {/* Subject Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold ${catSpec.bgLight}`}
                        >
                          <SubjectIcon name={catSpec.icon} className="w-3 h-3 shrink-0" />
                          <span>{catSpec.name}</span>
                        </span>

                        {/* Priority Badge */}
                        {getPriorityBadge(task.priority)}

                        {/* Subtask Progress Badge */}
                        {subTasksTotal > 0 && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                              subTasksDone === subTasksTotal
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}
                          >
                            {subTasksDone}/{subTasksTotal} steps
                          </span>
                        )}
                      </div>

                      {/* Task Title */}
                      <h3
                        onClick={() => onToggleTask(task.id)}
                        className={`text-sm font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer select-none transition-all ${
                          task.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : ''
                        }`}
                      >
                        {task.name}
                      </h3>

                      {/* Subtasks Checklist */}
                      {task.subTasks && task.subTasks.length > 0 && (
                        <div className="mt-2.5 space-y-1.5 pl-1 border-l-2 border-zinc-100 dark:border-zinc-800">
                          {task.subTasks.map((subTask) => (
                            <div
                              key={subTask.id}
                              onClick={() => onToggleSubTask(task.id, subTask.id)}
                              className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer group/sub select-none"
                            >
                              <span
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                                  subTask.completed
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-zinc-300 dark:border-zinc-600 group-hover/sub:border-emerald-500'
                                }`}
                              >
                                {subTask.completed && <Check className="w-2.5 h-2.5" />}
                              </span>
                              <span
                                className={`transition-all ${
                                  subTask.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : ''
                                }`}
                              >
                                {subTask.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Expanded Notes Drawer */}
                      {isNotesExpanded && task.notes && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed"
                        >
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                            <FileText className="w-3 h-3" />
                            <span>Study Notes</span>
                          </div>
                          {task.notes}
                        </motion.div>
                      )}
                    </div>

                    {/* Right Controls: Timer Increment, Notes Toggle, Delete */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                      {/* Actual vs Est Study Time Tracker */}
                      <div className="flex items-center bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2 py-1 gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {task.actualMinutes}m
                          <span className="text-[10px] text-zinc-400 font-normal"> / {task.estMinutes}m</span>
                        </span>
                        <div className="flex items-center gap-0.5 ml-1 border-l border-zinc-200 dark:border-zinc-700 pl-1">
                          <button
                            type="button"
                            onClick={() => onAdjustActualMinutes(task.id, -15)}
                            disabled={task.actualMinutes <= 0}
                            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 rounded text-zinc-500"
                            title="Subtract 15 minutes of studied time"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onAdjustActualMinutes(task.id, 15)}
                            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500"
                            title="Add 15 minutes of studied time"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Notes button if notes exist */}
                      {task.notes && (
                        <button
                          type="button"
                          onClick={() => toggleNotes(task.id)}
                          className={`p-1.5 rounded-xl border transition-colors ${
                            isNotesExpanded
                              ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800'
                          }`}
                          title="Toggle notes"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete Task */}
                      <button
                        type="button"
                        onClick={() => onRequestDeleteTask(task)}
                        className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
