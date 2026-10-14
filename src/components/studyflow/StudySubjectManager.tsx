import React, { useState } from 'react';
import { Plus, Trash2, Palette, Check, Sparkles, BookOpen, Layers } from 'lucide-react';
import { CategorySpec, StudyTask } from '../../types';
import { COLOR_PALETTE_PRESETS } from './constants';
import { SubjectIcon, AVAILABLE_SUBJECT_ICONS } from './SubjectIcon';

interface StudySubjectManagerProps {
  categories: CategorySpec[];
  tasks: StudyTask[];
  onAddCategory: (category: CategorySpec) => void;
  onRequestDeleteCategory: (category: CategorySpec) => void;
}

export const StudySubjectManager: React.FC<StudySubjectManagerProps> = ({
  categories,
  tasks,
  onAddCategory,
  onRequestDeleteCategory
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('BookOpen');
  const [selectedColorPreset, setSelectedColorPreset] = useState(COLOR_PALETTE_PRESETS[0]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    // Ensure unique id
    const finalId = categories.some((c) => c.id === id) ? `${id}-${Date.now().toString(36)}` : id;

    const newCategory: CategorySpec = {
      id: finalId,
      name: trimmed,
      color: selectedColorPreset.color,
      bgLight: selectedColorPreset.bgLight,
      badge: selectedColorPreset.badge,
      borderClass: selectedColorPreset.borderClass,
      icon: selectedIcon
    };

    onAddCategory(newCategory);
    setName('');
    setIsAdding(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Subjects & Courses</h4>
            <p className="text-[10px] text-zinc-400">Manage your study curriculum</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAdding ? 'Close' : 'New Subject'}</span>
        </button>
      </div>

      {/* Add New Subject Drawer */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="p-4 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 rounded-2xl space-y-3"
        >
          <div>
            <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              Subject Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Neuroscience, Literature, Statistics..."
              className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-amber-500 font-medium"
              required
            />
          </div>

          {/* Color Presets */}
          <div>
            <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              Color Theme
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PALETTE_PRESETS.map((preset) => {
                const isSelected = selectedColorPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedColorPreset(preset)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      isSelected
                        ? 'border-zinc-900 dark:border-white ring-2 ring-zinc-400/40'
                        : 'border-transparent opacity-80 hover:opacity-100'
                    } ${preset.bgLight}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${preset.badge}`} />
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon Selector Grid */}
          <div>
            <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              Subject Icon
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl max-h-32 overflow-y-auto">
              {AVAILABLE_SUBJECT_ICONS.map((iconKey) => {
                const isSelected = selectedIcon === iconKey;
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => setSelectedIcon(iconKey)}
                    className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-sm scale-110'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    title={iconKey}
                  >
                    <SubjectIcon name={iconKey} className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              Save Subject
            </button>
          </div>
        </form>
      )}

      {/* Active Subjects List */}
      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {categories.map((cat) => {
          const count = tasks.filter((t) => t.category === cat.id).length;
          return (
            <div
              key={cat.id}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-1.5 rounded-xl ${cat.bgLight} shrink-0`}>
                  <SubjectIcon name={cat.icon} className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                    {cat.name}
                  </h5>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {count} {count === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onRequestDeleteCategory(cat)}
                className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                title={`Delete ${cat.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
