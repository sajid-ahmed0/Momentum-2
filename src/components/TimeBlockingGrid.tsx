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
  parseISO,
  isToday,
  addWeeks,
  subWeeks
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Trash2, 
  Edit, 
  Zap, 
  Grid, 
  Columns, 
  List,
  Sparkles,
  Tag,
  Check,
  X
} from 'lucide-react';
import { TimeBlock } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface TimeBlockingGridProps {
  timeBlocks: TimeBlock[];
  onAddTimeBlock: (data: { startTime: string; endTime: string; activity: string; date: string; category?: string; color?: string }) => void;
  onEditTimeBlock: (id: string, data: { startTime: string; endTime: string; activity: string; date?: string; category?: string; color?: string }) => void;
  onDeleteTimeBlock: (id: string) => void;
  onOpenModalWithDefaults?: (defaults: { startTime: string; endTime: string; date: string }) => void;
}

export const CATEGORIES = [
  { name: 'Deep Work', color: 'bg-indigo-600 border-indigo-700 text-white', dot: '#4f46e5' },
  { name: 'Work', color: 'bg-blue-600 border-blue-700 text-white', dot: '#2563eb' },
  { name: 'Health & Gym', color: 'bg-emerald-600 border-emerald-700 text-white', dot: '#059669' },
  { name: 'Personal', color: 'bg-purple-600 border-purple-700 text-white', dot: '#9333ea' },
  { name: 'Study & Reading', color: 'bg-amber-600 border-amber-700 text-white', dot: '#d97706' },
  { name: 'Rest & Break', color: 'bg-teal-600 border-teal-700 text-white', dot: '#0d9488' },
  { name: 'Routine / Chores', color: 'bg-zinc-700 border-zinc-800 text-white', dot: '#3f3f46' },
];

export const TimeBlockingGrid: React.FC<TimeBlockingGridProps> = ({
  timeBlocks,
  onAddTimeBlock,
  onEditTimeBlock,
  onDeleteTimeBlock,
  onOpenModalWithDefaults,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [viewMode, setViewMode] = useState<'day' | '3day' | 'week' | 'list'>('day');
  const [now, setNow] = useState<Date>(new Date());
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // Update current time indicator every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Scroll to current hour on load
  useEffect(() => {
    if (gridScrollRef.current) {
      const currentHour = now.getHours();
      // Scroll to hour - 1 (min 0)
      const scrollTarget = Math.max(0, (currentHour - 1) * 64);
      gridScrollRef.current.scrollTop = scrollTarget;
    }
  }, [viewMode]);

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
    } else {
      setSelectedDate(prev => subWeeks(prev, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'day' || viewMode === 'list') {
      setSelectedDate(prev => addDays(prev, 1));
    } else if (viewMode === '3day') {
      setSelectedDate(prev => addDays(prev, 3));
    } else {
      setSelectedDate(prev => addWeeks(prev, 1));
    }
  };

  const handleToday = () => {
    setSelectedDate(startOfToday());
  };

  // Hours array 0..23
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Height of 1 hour block in pixels
  const HOUR_HEIGHT = 64; 

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
      // Default fallback
      const activity = prompt(`Add block for ${format(dayDate, 'MMM d')} ${formatTime12h(startTime)} - ${formatTime12h(endTime)}:`);
      if (activity) {
        onAddTimeBlock({
          activity,
          startTime,
          endTime,
          date: dateStr,
          category: 'Deep Work'
        });
      }
    }
  };

  // Quick preset adder
  const handleAddPreset = (activity: string, durationMinutes: number) => {
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
      category: activity.includes('Gym') ? 'Health & Gym' : activity.includes('Lunch') ? 'Rest & Break' : 'Deep Work'
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
              {viewMode === 'week' ? (
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

        {/* View Mode Switcher & Add Button */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
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

      {/* QUICK PRESETS STRIP */}
      <div className="px-6 py-2.5 bg-zinc-100/60 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[10px] font-mono font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" /> Quick Add:
        </span>
        <button 
          onClick={() => handleAddPreset('Deep Work Session', 120)}
          className="px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-md shrink-0 transition-colors"
        >
          ⚡ Deep Work (2h)
        </button>
        <button 
          onClick={() => handleAddPreset('Workout / Gym', 60)}
          className="px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-md shrink-0 transition-colors"
        >
          💪 Gym & Fitness (1h)
        </button>
        <button 
          onClick={() => handleAddPreset('Lunch & Rest', 45)}
          className="px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-amber-50 dark:hover:bg-amber-900/30 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-md shrink-0 transition-colors"
        >
          🥗 Lunch Break (45m)
        </button>
        <button 
          onClick={() => handleAddPreset('Reading & Review', 30)}
          className="px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-md shrink-0 transition-colors"
        >
          📚 Reading (30m)
        </button>
      </div>

      {/* VIEW CONTENT */}
      {viewMode === 'list' ? (
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
              .map(block => (
                <div 
                  key={block.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-amber-500/50 transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right shrink-0 font-mono text-xs font-black text-amber-500">
                      {formatTime12h(block.startTime)}
                    </div>
                    <div className="w-1 h-8 bg-amber-500 rounded-full" />
                    <div>
                      <h4 className="font-black text-sm uppercase dark:text-zinc-100">{block.activity}</h4>
                      <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                        {formatTime12h(block.startTime)} – {formatTime12h(block.endTime)} ({getMinutes(block.endTime) - getMinutes(block.startTime)} mins)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        if (onOpenModalWithDefaults) {
                          onOpenModalWithDefaults({ startTime: block.startTime, endTime: block.endTime, date: block.date });
                        }
                      }}
                      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteTimeBlock(block.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      ) : (
        /* VISUAL GOOGLE CALENDAR GRID VIEW */
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
            <div className="flex min-h-[1536px] relative">
              
              {/* TIME AXIS */}
              <div className="w-16 sm:w-20 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 sticky left-0 z-10 select-none">
                {hours.map(h => (
                  <div 
                    key={h} 
                    className="h-[64px] border-b border-zinc-100 dark:border-zinc-800/40 relative pr-2 flex justify-end items-start"
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
                      className="border-r border-zinc-200 dark:border-zinc-800/80 relative min-h-[1536px] group"
                    >
                      {/* HOUR CLICKABLE SLOTS */}
                      {hours.map(h => (
                        <div
                          key={h}
                          onClick={() => handleSlotClick(day, h)}
                          className="h-[64px] border-b border-zinc-100 dark:border-zinc-800/40 hover:bg-amber-500/5 transition-colors cursor-pointer relative"
                          title={`Click to add task at ${format(new Date().setHours(h, 0), 'h:mm a')}`}
                        >
                          {/* Half hour guideline */}
                          <div className="absolute top-[32px] left-0 right-0 border-b border-dashed border-zinc-100 dark:border-zinc-800/20 pointer-events-none" />
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

                        // Match category style or fallback to default amber/indigo
                        const matchedCategory = CATEGORIES.find(c => c.name.toLowerCase() === (block.category || '').toLowerCase());
                        const categoryColor = matchedCategory ? matchedCategory.color : 'bg-amber-500 border-amber-600 text-white';

                        return (
                          <motion.div
                            key={block.id}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            style={{
                              top: `${topPx}px`,
                              height: `${heightPx}px`,
                            }}
                            className={`absolute left-1 right-1 rounded-lg p-2 border shadow-md flex flex-col justify-between overflow-hidden cursor-pointer hover:z-30 hover:scale-[1.02] transition-all group/card ${categoryColor}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenModalWithDefaults) {
                                onOpenModalWithDefaults({ startTime: block.startTime, endTime: block.endTime, date: block.date });
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
                            </div>

                            {heightPx > 40 && (
                              <div className="flex items-center justify-between mt-1 text-[8px] font-mono font-bold uppercase opacity-80">
                                <span>{durationMins}m</span>
                                {block.category && (
                                  <span className="truncate max-w-[80px] bg-black/20 px-1 py-0.5 rounded">
                                    {block.category}
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
          <span className="text-zinc-400">Categories:</span>
          {CATEGORIES.map(cat => (
            <div key={cat.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.dot }} />
              <span>{cat.name}</span>
            </div>
          ))}
        </div>
        <div>
          💡 Click any time slot on the grid to instantly block time
        </div>
      </div>
    </div>
  );
};
