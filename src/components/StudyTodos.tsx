import React, { useState } from 'react';
import { Plus, Check, Edit, Trash2, GraduationCap, Clock, X } from 'lucide-react';
import { motion } from 'motion/react';
import { format, startOfToday, parseISO, parse } from 'date-fns';
import { cn } from '../lib/utils';
import { StudyTodo } from '../types';

// --- Local UI primitives (mirroring App.tsx styles) ---

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

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-md" }: { key?: React.Key; isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string }) => {
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
        className={cn("relative w-full bg-white dark:bg-zinc-950 rounded shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 max-h-[90vh] flex flex-col transition-all duration-200", maxWidth)}
      >
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <h3 className="text-sm font-bold font-sans tracking-tight uppercase text-zinc-400 dark:text-zinc-500">/ {title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
            <X className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          </button>
        </div>
        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

// --- Study section ---

interface StudyTodosProps {
  todos: StudyTodo[];
  onAdd: (data: { title: string; subject?: string; date: string; time?: string }) => void;
  onUpdate: (id: string, data: Partial<StudyTodo>) => void;
  onDelete: (id: string) => void;
  onToggle: (todo: StudyTodo) => void;
}

export const StudyTodos: React.FC<StudyTodosProps> = ({ todos, onAdd, onUpdate, onDelete, onToggle }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StudyTodo | null>(null);

  const sorted = [...todos].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const doneCount = sorted.filter(t => t.completed).length;

  const formatTime12h = (time: string) => {
    if (!time) return '';
    try {
      return format(parse(time, 'HH:mm', new Date()), 'h:mm a');
    } catch {
      return time;
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const renderItem = (todo: StudyTodo) => (
    <div
      key={todo.id}
      className={cn(
        "group p-4 rounded-xl border transition-all flex items-center justify-between",
        todo.completed
          ? "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800 opacity-60"
          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 shadow-xs"
      )}
    >
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={() => onToggle(todo)}
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
            todo.completed
              ? "bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100 text-white dark:text-zinc-900"
              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100"
          )}
        >
          {todo.completed && <Check className="w-3 h-3" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={cn(
            "text-sm font-bold tracking-tight dark:text-zinc-100 transition-all break-words whitespace-normal",
            todo.completed && "line-through text-zinc-400 dark:text-zinc-600"
          )}>
            {todo.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {todo.subject && (
              <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {todo.subject}
              </span>
            )}
            {todo.time && (
              <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-zinc-400 uppercase">
                <Clock className="w-3 h-3" /> {formatTime12h(todo.time)}
              </span>
            )}
            <span className="text-[9px] font-mono font-bold uppercase text-zinc-400">
              {format(parseISO(todo.date), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 opacity-100 transition-opacity">
        <button
          onClick={() => {
            setEditing(todo);
            setShowModal(true);
          }}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          title="Edit"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(todo.id)}
          className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md text-zinc-400 hover:text-red-500"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <motion.div
      key="study-tab"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-6 md:p-10 max-w-4xl mx-auto space-y-8"
    >
      {/* Title & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter dark:text-zinc-100 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-emerald-500" /> Study
          </h2>
          <p className="text-sm text-zinc-400 font-medium dark:text-zinc-500">Your study to-dos, all in one place.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
            className="h-9 px-5 font-black uppercase tracking-widest text-[10px] flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Add Study Todo
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-900">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200">
              Study Todos ({sorted.length})
            </h3>
          </div>
          {sorted.length > 0 && (
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
              {doneCount}/{sorted.length} Completed
            </span>
          )}
        </div>

        <div className="space-y-3">
          {sorted.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700">
              <GraduationCap className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-bold uppercase tracking-[0.2em] text-[10px]">No study todos yet</p>
              <Button
                onClick={() => {
                  setEditing(null);
                  setShowModal(true);
                }}
                className="mt-3 h-8 px-4 font-bold uppercase tracking-wider text-[10px]"
              >
                + Add Study Todo
              </Button>
            </div>
          ) : (
            sorted.map(renderItem)
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal
          key="study-todo-modal"
          isOpen={showModal}
          onClose={closeModal}
          title={editing ? "Edit Study Todo" : "Add Study Todo"}
        >
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const data = {
              title: fd.get('title') as string,
              subject: (fd.get('subject') as string) || '',
              date: fd.get('date') as string,
              time: fd.get('time') as string,
            };
            if (editing) {
              onUpdate(editing.id, data);
            } else {
              onAdd(data);
            }
            closeModal();
          }} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">What will you study?</label>
              <input
                name="title"
                type="text"
                required
                autoFocus
                defaultValue={editing?.title || ''}
                placeholder="e.g. Finish GRE Math chapter 4, Revise 50 vocab words"
                className="w-full px-4 py-4 rounded-sm border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-bold text-sm dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Subject (Optional)</label>
              <input
                name="subject"
                type="text"
                defaultValue={editing?.subject || ''}
                placeholder="e.g. Math, English, Physics"
                className="w-full px-4 py-4 rounded-sm border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-bold text-sm dark:text-zinc-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Date</label>
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={editing?.date || format(startOfToday(), 'yyyy-MM-dd')}
                  className="w-full px-4 py-3 rounded-sm border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-bold text-xs dark:text-zinc-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-[0.2em] mb-3">Time (Optional)</label>
                <input
                  name="time"
                  type="time"
                  defaultValue={editing?.time || ''}
                  className="w-full px-4 py-3 rounded-sm border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-bold text-xs dark:text-zinc-200"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3 sticky bottom-0 bg-white dark:bg-zinc-950 pb-2">
              <Button type="button" variant="secondary" onClick={closeModal} className="flex-1 text-xs dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 h-10">Cancel</Button>
              <Button type="submit" className="flex-[2] text-xs font-bold h-10 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500">
                {editing ? "Save Changes" : "Add Study Todo"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </motion.div>
  );
};
