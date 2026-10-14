import React, { useState } from 'react';
import { Sparkles, Trophy, Clock, Target, RefreshCw, Flame, Brain, CheckCircle2 } from 'lucide-react';
import { CategorySpec, StudyTask } from '../../types';
import { MOTIVATIONAL_STUDY_TIPS } from './constants';
import { SubjectIcon } from './SubjectIcon';

interface StudyInsightsProps {
  tasks: StudyTask[];
  categories: CategorySpec[];
  selectedDate: string; // YYYY-MM-DD
}

export const StudyInsights: React.FC<StudyInsightsProps> = ({
  tasks,
  categories,
  selectedDate
}) => {
  const [quoteIndex, setQuoteIndex] = useState(0);

  const rotateQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_STUDY_TIPS.length);
  };

  const dayTasks = tasks.filter((t) => t.date === selectedDate);
  const totalCount = dayTasks.length;
  const completedCount = dayTasks.filter((t) => t.completed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const totalEstMinutes = dayTasks.reduce((sum, t) => sum + (t.estMinutes || 0), 0);
  const totalActualMinutes = dayTasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);

  // Calculate top active subject for this date
  const categoryCounts: Record<string, number> = {};
  dayTasks.forEach((t) => {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
  });

  let topCategoryId: string | null = null;
  let topCategoryCount = 0;
  for (const catId of Object.keys(categoryCounts)) {
    const count = categoryCounts[catId] || 0;
    if (count > topCategoryCount) {
      topCategoryCount = count;
      topCategoryId = catId;
    }
  }

  const topCategorySpec = topCategoryId ? categories.find((c) => c.id === topCategoryId) : null;
  const currentQuote = MOTIVATIONAL_STUDY_TIPS[quoteIndex];

  const formatHoursMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-4">
      {/* Daily Progress Meter Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Study Momentum</h4>
              <p className="text-[10px] text-zinc-400">Daily Target Completion</p>
            </div>
          </div>
          <span className="text-base font-black text-amber-500 font-mono">
            {progressPercent}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden mb-3">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Counter Stats Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-center">
          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-100 dark:border-zinc-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
              Completed
            </span>
            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 font-mono">
              {completedCount} / {totalCount}
            </span>
          </div>

          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-100 dark:border-zinc-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
              Time Studied
            </span>
            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 font-mono">
              {formatHoursMins(totalActualMinutes)}
              <span className="text-[10px] text-zinc-400 font-normal"> / {formatHoursMins(totalEstMinutes)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Top Active Subject Card */}
      {topCategorySpec && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2.5 rounded-2xl ${topCategorySpec.bgLight}`}>
                <SubjectIcon name={topCategorySpec.icon} className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Top Focus Today
                </span>
                <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                  {topCategorySpec.name}
                </h5>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {topCategoryCount} {topCategoryCount === 1 ? 'mission' : 'missions'}
            </span>
          </div>
        </div>
      )}

      {/* Motivational Quote Widget */}
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 dark:via-zinc-900 border border-amber-500/20 dark:border-amber-900/40 rounded-3xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Brain className="w-3.5 h-3.5" />
            <span>Study Mindset</span>
          </div>
          <button
            type="button"
            onClick={rotateQuote}
            className="p-1 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
            title="Rotate tip"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-zinc-700 dark:text-zinc-300 italic leading-relaxed mb-1.5">
          "{currentQuote.quote}"
        </p>
        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
          — {currentQuote.author}
        </span>
      </div>
    </div>
  );
};
