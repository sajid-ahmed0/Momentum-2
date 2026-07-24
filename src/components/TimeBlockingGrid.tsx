import React, { useState, useEffect, useRef } from 'react';
import { 
  format, 
  parse, 
  addDays, 
  subDays, 
  isSameDay, 
  startOfToday, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isToday,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  addMonths,
  subMonths
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Trash2, 
  Edit, 
  List,
  Sparkles,
  Check,
  X,
  CheckSquare,
  Square,
  ZoomIn,
  ZoomOut,
  Settings,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import { TimeBlock, BlockTask } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const COLOR_OPTIONS = [
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-600 border-indigo-700 text-white', dot: '#4f46e5' },
  { id: 'amber', name: 'Amber', bg: 'bg-amber-500 border-amber-600 text-white', dot: '#f59e0b' },
  { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-600 border-emerald-700 text-white', dot: '#059669' },
  { id: 'rose', name: 'Rose', bg: 'bg-rose-600 border-rose-700 text-white', dot: '#e11d48' },
  { id: 'sky', name: 'Sky Blue', bg: 'bg-sky-600 border-sky-700 text-white', dot: '#0284c7' },
  { id: 'purple', name: 'Purple', bg: 'bg-purple-600 border-purple-700 text-white', dot: '#9333ea' },
  { id: 'teal', name: 'Teal', bg: 'bg-teal-600 border-teal-700 text-white', dot: '#0d9488' },
  { id: 'zinc', name: 'Slate', bg: 'bg-zinc-700 border-zinc-800 text-white', dot: '#3f3f46' },
];

export const getBlockColorStyle = (colorId?: string) => {
  const matched = COLOR_OPTIONS.find(c => c.id === colorId);
  return matched ? matched.bg : 'bg-indigo-600 border-indigo-700 text-white';
};

export interface QuickPreset {
  id: string;
  name: string;
  durationMinutes: number;
  color: string;
}

const DEFAULT_PRESETS: QuickPreset[] = [
  { id: '1', name: '⚡ Deep Work', durationMinutes: 120, color: 'indigo' },
  { id: '2', name: '💪 Gym & Fitness', durationMinutes: 60, color: 'emerald' },
  { id: '3', name: '🥗 Lunch Break', durationMinutes: 45, color: 'amber' },
  { id: '4', name: '📚 Reading', durationMinutes: 30, color: 'purple' },
  { id: '5', name: '☕ Short Break', durationMinutes: 15, color: 'sky' },
];

interface TimeBlockingGridProps {
  timeBlocks: TimeBlock[];
  onAddTimeBlock: (data: { startTime: string; endTime: string; activity: string; date: string; color?: string; subtasks?: BlockTask[] }) => void;
  onEditTimeBlock: (id: string, data: { startTime: string; endTime: string; activity: string; date?: string; color?: string; subtasks?: BlockTask[] }) => void;
  onDeleteTimeBlock: (id: string) => void;
  onToggleSubtask?: (blockId: string, subtaskId: string) => void;
  onOpenModalWithDefaults?: (defaults: { startTime: string; endTime: string; date: string; block?: TimeBlock }) => void;
}

export const TimeBlockingGrid: React.FC<TimeBlockingGridProps> = ({
  timeBlocks,
  onAddTimeBlock,
  onEditTimeBlock,
  onDeleteTimeBlock,
  onToggleSubtask,
  onOpenModalWithDefaults,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [viewMode, setViewMode] = useState<'day' | '3day' | 'week' | 'month' | 'list'>('day');
  const [zoomScale, setZoomScale] = useState<number>(1.0); // 0.6 = 60%, 1.0 = 100%, 2.0 = 200%
  const [now, setNow] = useState<Date>(new Date());
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // Quick presets state persisted in localStorage
  const [quickPresets, setQuickPresets] = useState<QuickPreset[]>(() => {
    try {
      const saved = localStorage.getItem('schedule_quick_presets');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PRESETS;
  });

  const [showCustomizeModal, setShowCustomizeModal] = useState<boolean>(false);
  const [presetNameInput, setPresetNameInput] = useState<string>('');
  const [presetDurationInput, setPresetDurationInput] = useState<number>(60);
  const [presetColorInput, setPresetColorInput] = useState<string>('indigo');

  // Update current time indicator every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const HOUR_HEIGHT = Math.round(64 * zoomScale);

  // Scroll to current hour on load or zoom change
  useEffect(() => {
    if (gridScrollRef.current) {
      const currentHour = now.getHours();
      const scrollTarget = Math.max(0, (currentHour - 1) * HOUR_HEIGHT);
      gridScrollRef.current.scrollTop = scrollTarget;
    }
  }, [viewMode]);

  const savePresets = (newPresets: QuickPreset[]) => {
    setQuickPresets(newPresets);
    try {
      localStorage.setItem('schedule_quick_presets', JSON.stringify(newPresets));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCustomPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetNameInput.trim()) return;

    const newPreset: QuickPreset = {
      id: Date.now().toString(),
      name: presetNameInput.trim(),
      durationMinutes: Number(presetDurationInput) || 30,
      color: presetColorInput
    };

    savePresets([...quickPresets, newPreset]);
    setPresetNameInput('');
    setPresetDurationInput(60);
  };

  const handleDeletePreset = (id: string) => {
    savePresets(quickPresets.filter(p => p.id !== id));
  };

  const handleResetPresets = () => {
    savePresets(DEFAULT_PRESETS);
  };

  // Format time 12h helper
  const formatTime12h = (timeStr: string) => {
    if (!timeStr) return '';
    try {
      return format(parse(timeStr, 'HH:mm', new Date()), 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  // Convert "HH:mm" to minutes from midnight
  const getMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Days to show based on view mode
  const getDisplayedDays = (): Date[] => {
    if (viewMode === 'day' || viewMode === 'list') {
      return [selectedDate];
    }
    if (viewMode === '3day') {
      return [
        selectedDate,
        addDays(selectedDate, 1),
        addDays(selectedDate, 2)
      ];
    }
    // Week view: Monday to Sunday
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const displayedDays = getDisplayedDays();

  // Handle Date Navigation
  const handlePrev = () => {
    if (viewMode === 'day' || viewMode === 'list') {
      setSelectedDate(prev => subDays(prev, 1));
    } else if (viewMode === '3day') {
      setSelectedDate(prev => subDays(prev, 3));
    } else if (viewMode === 'week') {
      setSelectedDate(prev => subWeeks(prev, 1));
    } else if (viewMode === 'month') {
      setSelectedDate(prev => subMonths(prev, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'day' || viewMode === 'list') {
      setSelectedDate(prev => addDays(prev, 1));
    } else if (viewMode === '3day') {
      setSelectedDate(prev => addDays(prev, 3));
    } else if (viewMode === 'week') {
      setSelectedDate(prev => addWeeks(prev, 1));
    } else if (viewMode === 'month') {
      setSelectedDate(prev => addMonths(prev, 1));
    }
  };

  const handleToday = () => {
    setSelectedDate(startOfToday());
  };

  // Hours array 0..23
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Compute Current Time indicator position (in pixels)
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeTop = (currentMinutes / 60) * HOUR_HEIGHT;

  // Handle clicking on an empty slot in the grid
  const handleSlotClick = (dayDate: Date, hour: number) => {
    const startH = hour.toString().padStart(2, '0');
    const endH = ((hour + 1) % 24).toString().padStart(2, '0');
    const startTime = `${startH}:00`;
    const endTime = `${endH}:00`;
    const dateStr = format(dayDate, 'yyyy-MM-dd');

    if (onOpenModalWithDefaults) {
      onOpenModalWithDefaults({ startTime, endTime, date: dateStr });
    } else {
      const activity = prompt(`Add block for ${format(dayDate, 'MMM d')} ${formatTime12h(startTime)} - ${formatTime12h(endTime)}:`);
      if (activity) {
        onAddTimeBlock({
          activity,
          startTime,
          endTime,
          date: dateStr,
          color: 'indigo'
        });
      }
    }
  };

  // Quick preset adder
  const handleAddPreset = (activity: string, durationMinutes: number, color: string) => {
    const startMinutes = Math.floor(currentMinutes / 30) * 30; // round to nearest 30 mins
    const startH = Math.floor(startMinutes / 60).toString().padStart(2, '0');
    const startM = (startMinutes % 60).toString().padStart(2, '0');
    
    const endMinutes = (startMinutes + durationMinutes) % 1440;
    const endH = Math.floor(endMinutes / 60).toString().padStart(2, '0');
    const endM = (endMinutes % 60).toString().padStart(2, '0');

    onAddTimeBlock({
      activity,
      startTime: `${startH}:${startM}`,
      endTime: `${endH}:${endM}`,
      date: format(selectedDate, 'yyyy-MM-dd'),
      color
    });
  };

  return (
    <div className="w-full flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all">
      {/* HEADER CONTROLS */}
      <div className="p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        
        {/* Date Title & Today Button */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleToday}
            className="px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-black uppercase tracking-wider rounded-lg shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            Today
          </button>

          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 shadow-sm">
            <button 
              onClick={handlePrev} 
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-600 dark:text-zinc-400"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={handleNext} 
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-600 dark:text-zinc-400"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm sm:text-base font-black tracking-tight uppercase">
              {viewMode === 'month' ? (
                format(selectedDate, 'MMMM yyyy')
              ) : viewMode === 'week' ? (
                <>
                  {format(displayedDays[0], 'MMM d')} – {format(displayedDays[6], 'MMM d, yyyy')}
                </>
              ) : viewMode === '3day' ? (
                <>
                  {format(displayedDays[0], 'MMM d')} – {format(displayedDays[2], 'MMM d, yyyy')}
                </>
              ) : (
                format(selectedDate, 'EEEE, MMMM d, yyyy')
              )}
            </h2>
          </div>
        </div>

        {/* View Mode Switcher, Zoom Controls & Add Button */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-wrap">
          {/* Zoom In/Out Controls */}
          {viewMode !== 'list' && viewMode !== 'month' && (
            <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 shadow-sm">
              <button 
                onClick={() => setZoomScale(prev => Math.max(0.6, Math.round((prev - 0.2) * 10) / 10))}
                disabled={zoomScale <= 0.6}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 rounded-md transition-colors text-zinc-600 dark:text-zinc-400"
                title="Zoom Out (Compact Grid)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-bold px-1.5 text-zinc-500 dark:text-zinc-400 select-none">
                {Math.round(zoomScale * 100)}%
              </span>
              <button 
                onClick={() => setZoomScale(prev => Math.min(2.0, Math.round((prev + 0.2) * 10) / 10))}
                disabled={zoomScale >= 2.0}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 rounded-md transition-colors text-zinc-600 dark:text-zinc-400"
                title="Zoom In (Detailed Grid)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* View Mode Selector */}
          <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'day' 
                  ? 'bg-amber-500 text-white shadow-sm' 
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('3day')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === '3day' 
                  ? 'bg-amber-500 text-white shadow-sm' 
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              3-Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'week' 
                  ? 'bg-amber-500 text-white shadow-sm' 
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'month' 
                  ? 'bg-amber-500 text-white shadow-sm' 
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title="Month Calendar View"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'list' 
                  ? 'bg-amber-500 text-white shadow-sm' 
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Create Button */}
          <button
            onClick={() => {
              if (onOpenModalWithDefaults) {
                onOpenModalWithDefaults({
                  startTime: '09:00',
                  endTime: '10:00',
                  date: format(selectedDate, 'yyyy-MM-dd')
                });
              } else {
                const activity = prompt('Activity name:');
                if (activity) {
                  onAddTimeBlock({
                    activity,
                    startTime: '09:00',
                    endTime: '10:00',
                    date: format(selectedDate, 'yyyy-MM-dd')
                  });
                }
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-lg hover:shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Block Time</span>
          </button>
        </div>
      </div>

      {/* QUICK PRESETS STRIP WITH CUSTOMIZE BUTTON */}
      <div className="px-6 py-2.5 bg-zinc-100/60 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-2 overflow-x-auto text-xs no-scrollbar">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-mono font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Quick Add:
          </span>

          {quickPresets.map(preset => {
            const dotColor = COLOR_OPTIONS.find(c => c.id === preset.color)?.dot || '#4f46e5';
            return (
              <button 
                key={preset.id}
                onClick={() => handleAddPreset(preset.name, preset.durationMinutes, preset.color)}
                className="px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 font-bold rounded-md shrink-0 transition-all flex items-center gap-1.5 hover:shadow-sm"
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                <span>{preset.name}</span>
                <span className="text-[9px] font-mono opacity-60">({preset.durationMinutes}m)</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowCustomizeModal(true)}
          className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-zinc-600 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400 border border-zinc-200 dark:border-zinc-700 font-bold text-[10px] uppercase tracking-wider rounded-md shrink-0 transition-colors"
          title="Customize Quick Presets"
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>Customize</span>
        </button>
      </div>

      {/* VIEW CONTENT */}
      {viewMode === 'month' ? (
        /* GOOGLE CALENDAR STYLE MONTH VIEW */
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* MONTH WEEKDAY HEADERS */}
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/90 text-center sticky top-0 z-20">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName) => (
              <div key={dayName} className="py-2.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-r last:border-r-0 border-zinc-200 dark:border-zinc-800">
                {dayName}
              </div>
            ))}
          </div>

          {/* MONTH DAYS GRID */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
            {(() => {
              const monthStart = startOfMonth(selectedDate);
              const monthEnd = endOfMonth(selectedDate);
              const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
              const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
              const monthDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd });

              return (
                <div className="grid grid-cols-7 auto-rows-fr min-h-full border-l border-t border-zinc-200 dark:border-zinc-800">
                  {monthDays.map(dayDate => {
                    const isCurrentMonth = isSameMonth(dayDate, selectedDate);
                    const isDayToday = isToday(dayDate);
                    const dateStr = format(dayDate, 'yyyy-MM-dd');
                    const dayBlocks = timeBlocks
                      .filter(b => b.date === dateStr)
                      .sort((a, b) => getMinutes(a.startTime) - getMinutes(b.startTime));

                    return (
                      <div
                        key={dateStr}
                        onClick={() => {
                          if (onOpenModalWithDefaults) {
                            onOpenModalWithDefaults({ startTime: '09:00', endTime: '10:00', date: dateStr });
                          }
                        }}
                        className={`min-h-[110px] sm:min-h-[130px] p-1.5 border-r border-b border-zinc-200 dark:border-zinc-800 flex flex-col justify-between transition-colors relative group cursor-pointer ${
                          isDayToday
                            ? 'bg-amber-500/5 dark:bg-amber-500/10'
                            : isCurrentMonth
                              ? 'bg-white dark:bg-zinc-950 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50'
                              : 'bg-zinc-50/50 dark:bg-zinc-900/30 opacity-60'
                        }`}
                      >
                        {/* Day Number Header */}
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                              isDayToday
                                ? 'bg-amber-500 text-white shadow-sm'
                                : isCurrentMonth
                                  ? 'text-zinc-800 dark:text-zinc-200'
                                  : 'text-zinc-400 dark:text-zinc-600'
                            }`}
                          >
                            {format(dayDate, 'd')}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenModalWithDefaults) {
                                onOpenModalWithDefaults({ startTime: '09:00', endTime: '10:00', date: dateStr });
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-amber-500 hover:text-white rounded text-zinc-400 transition-all"
                            title="Add block on this day"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Event Pills List */}
                        <div className="flex-1 space-y-1 overflow-hidden">
                          {dayBlocks.slice(0, 3).map(block => {
                            const dotColor = COLOR_OPTIONS.find(c => c.id === block.color)?.dot || '#4f46e5';
                            return (
                              <div
                                key={block.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onOpenModalWithDefaults) {
                                    onOpenModalWithDefaults({
                                      startTime: block.startTime,
                                      endTime: block.endTime,
                                      date: block.date,
                                      block
                                    });
                                  }
                                }}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold truncate flex items-center gap-1.5 shadow-sm text-white hover:scale-[1.02] transition-transform"
                                style={{ backgroundColor: dotColor }}
                                title={`${block.activity} (${formatTime12h(block.startTime)} - ${formatTime12h(block.endTime)})`}
                              >
                                <span className="font-mono text-[9px] opacity-80 shrink-0">
                                  {formatTime12h(block.startTime).replace(':00', '').replace(' ', '')}
                                </span>
                                <span className="truncate uppercase font-black">{block.activity}</span>
                              </div>
                            );
                          })}

                          {dayBlocks.length > 3 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(dayDate);
                                setViewMode('day');
                              }}
                              className="text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline px-1 py-0.5 block"
                            >
                              +{dayBlocks.length - 3} more
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* LIST COMPACT VIEW */
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
              Schedule for {format(selectedDate, 'EEEE, MMMM d')}
            </h3>
            <span className="text-[10px] font-mono text-zinc-400 font-bold">
              {timeBlocks.filter(b => b.date === format(selectedDate, 'yyyy-MM-dd')).length} Blocks Scheduled
            </span>
          </div>

          {timeBlocks.filter(b => b.date === format(selectedDate, 'yyyy-MM-dd')).length === 0 ? (
            <div className="p-16 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center text-zinc-400">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-xs font-bold uppercase tracking-widest">No time blocks set for this day</p>
              <button
                onClick={() => {
                  if (onOpenModalWithDefaults) {
                    onOpenModalWithDefaults({ startTime: '09:00', endTime: '10:00', date: format(selectedDate, 'yyyy-MM-dd') });
                  }
                }}
                className="mt-4 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-xs uppercase tracking-wider rounded-lg"
              >
                + Schedule First Block
              </button>
            </div>
          ) : (
            timeBlocks
              .filter(b => b.date === format(selectedDate, 'yyyy-MM-dd'))
              .sort((a, b) => getMinutes(a.startTime) - getMinutes(b.startTime))
              .map(block => {
                const subtasks = block.subtasks || [];
                const completedTasks = subtasks.filter(t => t.completed).length;

                return (
                  <div 
                    key={block.id}
                    className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-amber-500/50 transition-all shadow-sm group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-24 text-right shrink-0 font-mono text-xs font-black text-amber-500">
                          {formatTime12h(block.startTime)}
                        </div>
                        <div 
                          className="w-1.5 h-10 rounded-full shrink-0" 
                          style={{ backgroundColor: COLOR_OPTIONS.find(c => c.id === block.color)?.dot || '#4f46e5' }}
                        />
                        <div>
                          <h4 className="font-black text-sm uppercase dark:text-zinc-100">{block.activity}</h4>
                          <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                            {formatTime12h(block.startTime)} – {formatTime12h(block.endTime)} ({getMinutes(block.endTime) - getMinutes(block.startTime)} mins)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {subtasks.length > 0 && (
                          <span className="text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded-md flex items-center gap-1">
                            <CheckSquare className="w-3 h-3 text-amber-500" />
                            {completedTasks}/{subtasks.length} tasks
                          </span>
                        )}

                        <button
                          onClick={() => {
                            if (onOpenModalWithDefaults) {
                              onOpenModalWithDefaults({ 
                                startTime: block.startTime, 
                                endTime: block.endTime, 
                                date: block.date,
                                block
                              });
                            }
                          }}
                          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                          title="Edit Block & Tasks"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteTimeBlock(block.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500"
                          title="Delete Block"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* SUBTASKS CHECKLIST IN LIST VIEW */}
                    {subtasks.length > 0 && (
                      <div className="mt-3 pl-32 pr-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 space-y-1.5">
                        <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                          Tasks Checklist:
                        </span>
                        {subtasks.map(task => (
                          <div 
                            key={task.id} 
                            onClick={() => onToggleSubtask && onToggleSubtask(block.id, task.id)}
                            className="flex items-center gap-2 text-xs cursor-pointer hover:text-amber-500 transition-colors group/task"
                          >
                            {task.completed ? (
                              <CheckSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-zinc-400 group-hover/task:text-amber-500 shrink-0" />
                            )}
                            <span className={task.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-700 dark:text-zinc-300 font-medium'}>
                              {task.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      ) : (
        /* VISUAL GOOGLE CALENDAR GRID VIEW WITH DYNAMIC ZOOM */
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* COLUMN HEADERS */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/90 sticky top-0 z-20">
            {/* Time Axis Header Space */}
            <div className="w-16 sm:w-20 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-3 text-[10px] font-mono font-bold text-zinc-400 text-center uppercase tracking-wider">
              Time
            </div>

            {/* Day Column Headers */}
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${displayedDays.length}, minmax(0, 1fr))` }}>
              {displayedDays.map(day => {
                const isSelected = isSameDay(day, selectedDate);
                const isDayToday = isToday(day);
                return (
                  <div 
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`p-2.5 sm:p-3 text-center border-r border-zinc-200 dark:border-zinc-800/80 cursor-pointer transition-colors ${
                      isDayToday ? 'bg-amber-500/10 dark:bg-amber-500/10' : 'hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      {format(day, 'EEE')}
                    </div>
                    <div className="mt-0.5 flex items-center justify-center">
                      <span className={`text-xs sm:text-sm font-black w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                        isDayToday 
                          ? 'bg-amber-500 text-white shadow-md' 
                          : isSelected 
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' 
                            : 'text-zinc-800 dark:text-zinc-200'
                      }`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SCROLLABLE GRID BODY */}
          <div ref={gridScrollRef} className="flex-1 overflow-y-auto relative custom-scrollbar">
            <div className="flex relative" style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}>
              
              {/* TIME AXIS */}
              <div className="w-16 sm:w-20 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 sticky left-0 z-10 select-none">
                {hours.map(h => (
                  <div 
                    key={h} 
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="border-b border-zinc-100 dark:border-zinc-800/40 relative pr-2 flex justify-end items-start"
                  >
                    <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 -mt-2 bg-white dark:bg-zinc-950 px-1 rounded">
                      {format(new Date().setHours(h, 0, 0, 0), 'h a')}
                    </span>
                  </div>
                ))}
              </div>

              {/* GRID DAY COLUMNS */}
              <div 
                className="flex-1 grid relative" 
                style={{ gridTemplateColumns: `repeat(${displayedDays.length}, minmax(0, 1fr))` }}
              >
                {displayedDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayBlocks = timeBlocks.filter(b => b.date === dateStr);
                  const isDayToday = isToday(day);

                  return (
                    <div 
                      key={dateStr}
                      style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}
                      className="border-r border-zinc-200 dark:border-zinc-800/80 relative group"
                    >
                      {/* HOUR CLICKABLE SLOTS */}
                      {hours.map(h => (
                        <div
                          key={h}
                          onClick={() => handleSlotClick(day, h)}
                          style={{ height: `${HOUR_HEIGHT}px` }}
                          className="border-b border-zinc-100 dark:border-zinc-800/40 hover:bg-amber-500/5 transition-colors cursor-pointer relative"
                          title={`Click to add block at ${format(new Date().setHours(h, 0), 'h:mm a')}`}
                        >
                          {/* Half hour guideline */}
                          <div 
                            style={{ top: `${HOUR_HEIGHT / 2}px` }}
                            className="absolute left-0 right-0 border-b border-dashed border-zinc-100 dark:border-zinc-800/20 pointer-events-none" 
                          />
                        </div>
                      ))}

                      {/* CURRENT TIME RED/AMBER LINE (IF TODAY) */}
                      {isDayToday && (
                        <div 
                          className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                          style={{ top: `${currentTimeTop}px` }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm -ml-1.5" />
                          <div className="h-0.5 flex-1 bg-red-500/80 shadow-sm" />
                          <span className="text-[8px] font-mono font-bold bg-red-500 text-white px-1 py-0.5 rounded ml-1 shadow-sm">
                            {format(now, 'h:mm a')}
                          </span>
                        </div>
                      )}

                      {/* VISUAL EVENT CARDS PLACED ON GRID */}
                      {dayBlocks.map(block => {
                        const startMins = getMinutes(block.startTime);
                        const endMins = getMinutes(block.endTime);
                        const durationMins = Math.max(15, endMins - startMins || 30);

                        const topPx = (startMins / 60) * HOUR_HEIGHT;
                        const heightPx = (durationMins / 60) * HOUR_HEIGHT;

                        const colorStyle = getBlockColorStyle(block.color);
                        const subtasks = block.subtasks || [];
                        const completedCount = subtasks.filter(t => t.completed).length;

                        return (
                          <motion.div
                            key={block.id}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            style={{
                              top: `${topPx}px`,
                              height: `${heightPx}px`,
                            }}
                            className={`absolute left-1 right-1 rounded-lg p-2 border shadow-md flex flex-col justify-between overflow-hidden cursor-pointer hover:z-30 hover:scale-[1.02] transition-all group/card ${colorStyle}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenModalWithDefaults) {
                                onOpenModalWithDefaults({ 
                                  startTime: block.startTime, 
                                  endTime: block.endTime, 
                                  date: block.date,
                                  block
                                });
                              }
                            }}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono text-[9px] font-bold opacity-90 truncate">
                                  {formatTime12h(block.startTime)} - {formatTime12h(block.endTime)}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTimeBlock(block.id);
                                  }}
                                  className="opacity-0 group-hover/card:opacity-100 p-0.5 hover:bg-black/20 rounded transition-opacity"
                                  title="Delete"
                                >
                                  <X className="w-3 h-3 text-white" />
                                </button>
                              </div>

                              <h5 className="font-black text-xs leading-snug tracking-tight truncate mt-0.5 uppercase">
                                {block.activity}
                              </h5>

                              {/* SUBTASKS PREVIEW FOR TALLER CARDS */}
                              {heightPx >= 60 && subtasks.length > 0 && (
                                <div className="mt-1 space-y-0.5 border-t border-white/20 pt-1">
                                  {subtasks.slice(0, heightPx >= 100 ? 5 : 2).map(st => (
                                    <div 
                                      key={st.id} 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleSubtask && onToggleSubtask(block.id, st.id);
                                      }}
                                      className="flex items-center gap-1 text-[9px] font-medium opacity-90 hover:opacity-100 truncate cursor-pointer"
                                    >
                                      {st.completed ? (
                                        <Check className="w-2.5 h-2.5 shrink-0" />
                                      ) : (
                                        <div className="w-2 h-2 rounded-sm border border-white/80 shrink-0" />
                                      )}
                                      <span className={st.completed ? 'line-through opacity-70' : ''}>
                                        {st.text}
                                      </span>
                                    </div>
                                  ))}
                                  {subtasks.length > (heightPx >= 100 ? 5 : 2) && (
                                    <span className="text-[8px] font-mono opacity-70">
                                      +{subtasks.length - (heightPx >= 100 ? 5 : 2)} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {heightPx > 36 && (
                              <div className="flex items-center justify-between mt-1 text-[8px] font-mono font-bold uppercase opacity-80">
                                <span>{durationMins}m</span>
                                {subtasks.length > 0 && (
                                  <span className="flex items-center gap-1 bg-black/20 px-1 py-0.5 rounded">
                                    <CheckSquare className="w-2.5 h-2.5" />
                                    {completedCount}/{subtasks.length}
                                  </span>
                                )}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

        </div>
      )}

      {/* FOOTER LEGEND */}
      <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-zinc-400">Color Palette:</span>
          {COLOR_OPTIONS.map(col => (
            <div key={col.id} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: col.dot }} />
              <span>{col.name}</span>
            </div>
          ))}
        </div>
        <div>
          💡 Use Zoom buttons to expand/compact grid & click any slot to block time
        </div>
      </div>

      {/* CUSTOMIZE QUICK PRESETS MODAL */}
      <AnimatePresence>
        {showCustomizeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-black uppercase dark:text-zinc-100">
                    Customize Quick Presets
                  </h3>
                </div>
                <button
                  onClick={() => setShowCustomizeModal(false)}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* CURRENT PRESETS LIST */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">
                  Active Presets ({quickPresets.length})
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {quickPresets.map(preset => {
                    const dotColor = COLOR_OPTIONS.find(c => c.id === preset.color)?.dot || '#4f46e5';
                    return (
                      <div key={preset.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: dotColor }} />
                          <div>
                            <p className="font-black dark:text-zinc-100 uppercase">{preset.name}</p>
                            <p className="text-[10px] font-mono text-zinc-400">{preset.durationMinutes} minutes duration</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeletePreset(preset.id)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                          title="Delete Preset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ADD NEW PRESET FORM */}
              <form onSubmit={handleAddCustomPreset} className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <label className="block text-[10px] font-bold uppercase text-amber-500 tracking-wider">
                  + Add New Preset
                </label>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-1">
                    Preset Label / Name
                  </label>
                  <input 
                    type="text" 
                    required
                    value={presetNameInput}
                    onChange={(e) => setPresetNameInput(e.target.value)}
                    placeholder="e.g. 🧘 Meditation, 📞 Team Standup"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-1">
                      Duration (Minutes)
                    </label>
                    <select
                      value={presetDurationInput}
                      onChange={(e) => setPresetDurationInput(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>1 Hour (60m)</option>
                      <option value={90}>1.5 Hours (90m)</option>
                      <option value={120}>2 Hours (120m)</option>
                      <option value={180}>3 Hours (180m)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-1">
                      Preset Color
                    </label>
                    <select
                      value={presetColorInput}
                      onChange={(e) => setPresetColorInput(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {COLOR_OPTIONS.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Quick Preset</span>
                </button>
              </form>

              {/* FOOTER ACTIONS */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={handleResetPresets}
                  className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-[10px] font-mono font-bold uppercase"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Defaults
                </button>

                <button
                  type="button"
                  onClick={() => setShowCustomizeModal(false)}
                  className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-xs rounded-xl"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
