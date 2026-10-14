import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Clock, ListChecks, FileText, Sparkles, X, Flag } from 'lucide-react';
import { CategorySpec, Priority, StudyTask, SubTask } from '../../types';
import { SubjectIcon } from './SubjectIcon';

interface StudyTaskFormProps {
  categories: CategorySpec[];
  selectedDate: string; // YYYY-MM-DD
  activeCategoryFilter?: string | null;
  onAddTask: (task: Omit<StudyTask, 'id' | 'createdAt'>) => void;
}

const ESTIMATED_TIME_PRESETS = [15, 30, 45, 60, 90, 120];

export const StudyTaskForm: React.FC<StudyTaskFormProps> = ({
  categories,
  selectedDate,
  activeCategoryFilter,
  onAddTask
}) => {
  const [taskName, setTaskName] = useState('');
  const [category, setCategory] = useState<string>(() => {
    if (activeCategoryFilter && categories.some((c) => c.id === activeCategoryFilter)) {
      return activeCategoryFilter;
    }
    return categories[0]?.id || 'math';
  });
  const [priority, setPriority] = useState<Priority>('medium');
  const [estMinutes, setEstMinutes] = useState<number>(45);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [subTaskInput, setSubTaskInput] = useState('');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Sync category if filter changes
  React.useEffect(() => {
    if (activeCategoryFilter && categories.some((c) => c.id === activeCategoryFilter)) {
      setCategory(activeCategoryFilter);
    }
  }, [activeCategoryFilter, categories]);

  const handleAddSubTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = subTaskInput.trim();
    if (!trimmed) return;
    setSubTasks((prev) => [
      ...prev,
      {
        id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: trimmed,
        completed: false
      }
    ]);
    setSubTaskInput('');
  };

  const handleRemoveSubTask = (id: string) => {
    setSubTasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = taskName.trim();
    if (!trimmedName) return;

    const finalMinutes = customMinutes ? parseInt(customMinutes, 10) || estMinutes : estMinutes;

    onAddTask({
      name: trimmedName,
      category,
      priority,
      estMinutes: Math.max(5, finalMinutes),
      actualMinutes: 0,
      completed: false,
      date: selectedDate,
      notes: notes.trim() ? notes.trim() : undefined,
      subTasks: subTasks.length > 0 ? subTasks : undefined
    });

    // Reset Form
    setTaskName('');
    setNotes('');
    setSubTasks([]);
    setSubTaskInput('');
    setCustomMinutes('');
    setIsExpanded(false);
  };

  const activeCategorySpec = categories.find((c) => c.id === category) || categories[0];

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Primary Input Line */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="What is your study mission or topic today? (e.g. Organic Chemistry Ch. 4)"
            className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-medium"
            required
          />
        </div>

        {/* Category Picker */}
        <div className="relative min-w-[150px]">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full appearance-none px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all cursor-pointer pr-8"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-zinc-400">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Priority Selector */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/90 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 shrink-0">
          {(['low', 'medium', 'high'] as Priority[]).map((p) => {
            const isActive = priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-xl capitalize transition-all ${
                  isActive
                    ? p === 'high'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : p === 'medium'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-emerald-500 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!taskName.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-amber-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Quick Controls Bar: Est Time Presets & Expand Accordion */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
        {/* Estimated Duration Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Est:
          </span>
          {ESTIMATED_TIME_PRESETS.map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => {
                setEstMinutes(mins);
                setCustomMinutes('');
              }}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                estMinutes === mins && !customMinutes
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60 hover:border-zinc-300'
              }`}
            >
              {mins}m
            </button>
          ))}
          <input
            type="number"
            min="5"
            max="600"
            placeholder="custom"
            value={customMinutes}
            onChange={(e) => {
              setCustomMinutes(e.target.value);
              const val = parseInt(e.target.value, 10);
              if (val > 0) setEstMinutes(val);
            }}
            className="w-16 px-1.5 py-0.5 text-[11px] font-medium bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Accordion Toggle for Notes & Subtasks */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          <ListChecks className="w-3.5 h-3.5" />
          <span>
            {isExpanded
              ? 'Hide details'
              : `Add subtasks & notes ${subTasks.length > 0 ? `(${subTasks.length})` : ''}`}
          </span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 space-y-4">
          {/* Subtasks Checklist Creator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <ListChecks className="w-3.5 h-3.5 text-amber-500" />
                <span>Mission Subtasks / Checklist</span>
              </label>
              <span className="text-[10px] text-zinc-400">Press Enter to add</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={subTaskInput}
                onChange={(e) => setSubTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubTask();
                  }
                }}
                placeholder="Type subtask step (e.g. solve problem 1-5, re-read summary)..."
                className="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => handleAddSubTask()}
                disabled={!subTaskInput.trim()}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 text-xs font-bold text-zinc-700 dark:text-zinc-200 rounded-xl transition-colors cursor-pointer"
              >
                Add Step
              </button>
            </div>

            {/* Subtasks list chips */}
            {subTasks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {subTasks.map((st, index) => (
                  <span
                    key={st.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs text-zinc-800 dark:text-zinc-200"
                  >
                    <span className="text-[10px] font-mono text-zinc-400">{index + 1}.</span>
                    <span>{st.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubTask(st.id)}
                      className="text-zinc-400 hover:text-rose-500 transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes / Study Memo */}
          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              <span>Study Notes & Reference Links</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Key concepts to memorize, textbook page numbers, exam focus areas..."
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
        </div>
      )}
    </form>
  );
};
