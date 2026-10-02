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
  SlidersHorizontal,
  Timer,
  Play,
  Pause,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { TimeBlock, BlockTask, QuickPreset, DEFAULT_PRESETS } from '../types';
import {
  connectGoogleCalendar,
  getGoogleAccessToken,
  getConnectedCalendarEmail,
  subscribeCalendarAuth,
  trySilentCalendarTokenRefresh,
  auth
} from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

export const COLOR_OPTIONS = [
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-600 border-indigo-700 text-white', dot: '#4f46e5' },
  { id: 'rose', name: 'Red', bg: 'bg-rose-500 border-rose-600 text-white', dot: '#f43f5e' },
  { id: 'amber', name: 'Orange', bg: 'bg-amber-500 border-amber-600 text-white', dot: '#f59e0b' },
  { id: 'emerald', name: 'Green', bg: 'bg-emerald-600 border-emerald-700 text-white', dot: '#059669' },
  { id: 'sky', name: 'Blue', bg: 'bg-sky-500 border-sky-600 text-white', dot: '#0ea5e9' },
  { id: 'purple', name: 'Purple', bg: 'bg-purple-600 border-purple-700 text-white', dot: '#9333ea' },
  { id: 'teal', name: 'Teal', bg: 'bg-teal-600 border-teal-700 text-white', dot: '#0d9488' },
  { id: 'zinc', name: 'Gray', bg: 'bg-zinc-600 border-zinc-700 text-white', dot: '#52525b' },
];

export const getBlockColorStyle = (colorId?: string) => {
  const matched = COLOR_OPTIONS.find(c => c.id === colorId);
  return matched ? matched.bg : 'bg-indigo-600 border-indigo-700 text-white';
};

interface TimeBlockingGridProps {
  timeBlocks: TimeBlock[];
  quickPresets?: QuickPreset[];
  onUpdateQuickPresets?: (presets: QuickPreset[]) => void;
  onAddTimeBlock: (data: { startTime: string; endTime: string; activity: string; date: string; color?: string; emoji?: string; subtasks?: BlockTask[]; showCountdown?: boolean; googleCalendarEventId?: string }) => void;
  onAddBatchTimeBlocks?: (blocks: Array<{ startTime: string; endTime: string; activity: string; date: string; color?: string; emoji?: string; subtasks?: BlockTask[]; showCountdown?: boolean; googleCalendarEventId?: string }>) => Promise<void> | void;
  onEditTimeBlock: (id: string, data: { startTime: string; endTime: string; activity: string; date?: string; color?: string; emoji?: string; subtasks?: BlockTask[]; showCountdown?: boolean; googleCalendarEventId?: string }) => void;
  onDeleteTimeBlock: (id: string) => void;
  onToggleSubtask?: (blockId: string, subtaskId: string) => void;
  onOpenModalWithDefaults?: (defaults: { startTime: string; endTime: string; date: string; block?: TimeBlock }) => void;
  zoomScale?: number;
  onZoomScaleChange?: (newScale: number) => void;
}

export const TimeBlockingGrid = React.memo<TimeBlockingGridProps>(({
  timeBlocks,
  quickPresets,
  onUpdateQuickPresets,
  onAddTimeBlock,
  onAddBatchTimeBlocks,
  onEditTimeBlock,
  onDeleteTimeBlock,
  onToggleSubtask,
  onOpenModalWithDefaults,
  zoomScale: controlledZoomScale,
  onZoomScaleChange,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [viewMode, setViewMode] = useState<'day' | '3day' | 'week' | 'month' | 'list'>('day');
  const [internalZoomScale, setInternalZoomScale] = useState<number>(1.0); // 0.6 = 60%, 1.0 = 100%, 2.0 = 200%
  
  const zoomScale = controlledZoomScale !== undefined ? controlledZoomScale : internalZoomScale;

  const setZoomScale = (action: number | ((prev: number) => number)) => {
    const nextVal = typeof action === 'function' ? action(zoomScale) : action;
    const clamped = Math.max(0.1, Math.min(1.0, Math.round(nextVal * 10) / 10));
    if (onZoomScaleChange) {
      onZoomScaleChange(clamped);
    } else {
      setInternalZoomScale(clamped);
    }
  };

  const [now, setNow] = useState<Date>(new Date());
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // Quick presets state persisted in localStorage
  const activeQuickPresets = quickPresets || DEFAULT_PRESETS;

  const [showCustomizeModal, setShowCustomizeModal] = useState<boolean>(false);
  const [presetNameInput, setPresetNameInput] = useState<string>('');
  const [presetDurationInput, setPresetDurationInput] = useState<number>(60);
  const [presetColorInput, setPresetColorInput] = useState<string>('indigo');

  // Google Calendar Sync State
  const [showCalendarSyncModal, setShowCalendarSyncModal] = useState<boolean>(false);
  const [calendarSyncTab, setCalendarSyncTab] = useState<'import' | 'export'>('import');
  const [calendarSyncRange, setCalendarSyncRange] = useState<'day' | 'week'>('day');
  const [calendarToken, setCalendarToken] = useState<string | null>(() => getGoogleAccessToken());
  const [calendarEmail, setCalendarEmail] = useState<string | null>(() => getConnectedCalendarEmail());
  const [isConnectingCalendar, setIsConnectingCalendar] = useState<boolean>(false);
  const [isFetchingGCalEvents, setIsFetchingGCalEvents] = useState<boolean>(false);
  const [isPushingToGCal, setIsPushingToGCal] = useState<boolean>(false);
  const [gcalEvents, setGcalEvents] = useState<Array<{
    id: string;
    summary: string;
    date: string;
    startTime: string;
    endTime: string;
    htmlLink?: string;
    alreadyImported: boolean;
  }>>([]);
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);
  const [selectedExportBlockIds, setSelectedExportBlockIds] = useState<string[]>([]);
  const [calendarTimeZone, setCalendarTimeZone] = useState<string>(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [calendarSyncStatus, setCalendarSyncStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    calendarLink?: string;
  } | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('momentum_gcal_auto_sync') !== 'false';
    } catch {
      return true;
    }
  });

  // Keep latest timeBlocks in a ref & track in-flight auto-synced IDs to avoid duplicates
  const timeBlocksRef = useRef<TimeBlock[]>(timeBlocks);
  useEffect(() => {
    timeBlocksRef.current = timeBlocks;
  }, [timeBlocks]);
  const autoImportedEventIdsRef = useRef<Set<string>>(new Set());
  const autoPushedBlockIdsRef = useRef<Set<string>>(new Set());

  const getDismissedGCalIds = (): Set<string> => {
    try {
      const raw = localStorage.getItem('momentum_dismissed_gcal_ids');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  };

  const addDismissedGCalId = (gcalId?: string) => {
    if (!gcalId) return;
    try {
      const set = getDismissedGCalIds();
      set.add(gcalId);
      localStorage.setItem('momentum_dismissed_gcal_ids', JSON.stringify(Array.from(set)));
    } catch {}
  };

  const handleDeleteBlockWithGCal = async (block: TimeBlock) => {
    if (block.googleCalendarEventId) {
      addDismissedGCalId(block.googleCalendarEventId);
      const activeToken = calendarToken || getGoogleAccessToken();
      if (activeToken) {
        fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(block.googleCalendarEventId)}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${activeToken}` },
          }
        ).catch(() => {});
      }
    }
    onDeleteTimeBlock(block.id);
  };

  const toggleAutoSync = () => {
    setAutoSyncEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('momentum_gcal_auto_sync', String(next));
      } catch {}
      return next;
    });
  };

  // Subscribe to persistent Google Calendar session on load & across page refreshes
  useEffect(() => {
    const unsubscribe = subscribeCalendarAuth(({ token, email }) => {
      setCalendarToken(token);
      if (email) setCalendarEmail(email);
    });
    return unsubscribe;
  }, []);

  // Quick presets drag-to-scroll state
  const quickPresetScrollRef = useRef<HTMLDivElement>(null);
  const [isQuickDragging, setIsQuickDragging] = useState(false);
  const [quickStartX, setQuickStartX] = useState(0);
  const [quickScrollLeft, setQuickScrollLeft] = useState(0);
  const [quickDragDistance, setQuickDragDistance] = useState(0);

  const handleQuickMouseDown = (e: React.MouseEvent) => {
    if (!quickPresetScrollRef.current) return;
    setIsQuickDragging(true);
    setQuickStartX(e.pageX - quickPresetScrollRef.current.offsetLeft);
    setQuickScrollLeft(quickPresetScrollRef.current.scrollLeft);
    setQuickDragDistance(0);
  };

  const handleQuickMouseLeave = () => {
    setIsQuickDragging(false);
  };

  const handleQuickMouseUp = () => {
    setIsQuickDragging(false);
  };

  const handleQuickMouseMove = (e: React.MouseEvent) => {
    if (!isQuickDragging || !quickPresetScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - quickPresetScrollRef.current.offsetLeft;
    const walk = (x - quickStartX) * 1.5;
    setQuickDragDistance(Math.abs(x - quickStartX));
    quickPresetScrollRef.current.scrollLeft = quickScrollLeft - walk;
  };

  // Update current time every second so live block countdowns and the current time line stay in sync
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
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
    if (onUpdateQuickPresets) {
      onUpdateQuickPresets(newPresets);
    } else {
      try {
        localStorage.setItem('schedule_quick_presets', JSON.stringify(newPresets));
      } catch (e) {
        console.error(e);
      }
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

    savePresets([...activeQuickPresets, newPreset]);
    setPresetNameInput('');
    setPresetDurationInput(60);
  };

  const handleDeletePreset = (id: string) => {
    savePresets(activeQuickPresets.filter(p => p.id !== id));
  };

  const handleResetPresets = () => {
    savePresets(DEFAULT_PRESETS);
  };

  // Compute start & end Date objects for the active Google Calendar sync range
  const getSyncRangeBounds = (rangeMode: 'day' | 'week' = calendarSyncRange) => {
    if (rangeMode === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      const startBound = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
      const endBound = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
      return { startBound, endBound, days: eachDayOfInterval({ start, end }) };
    }
    const startBound = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0);
    const endBound = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999);
    return { startBound, endBound, days: [selectedDate] };
  };

  // Schedule blocks within the selected sync range
  const syncRangeDateStrings = getSyncRangeBounds(calendarSyncRange).days.map(d => format(d, 'yyyy-MM-dd'));
  const exportableScheduleBlocks = timeBlocks
    .filter(b => syncRangeDateStrings.includes(b.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  // Build RFC3339 dateTime string in the target Google Calendar timezone so wall-clock date/time always matches
  const getTimeZoneOffsetString = (tz: string, refDate: Date): string => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'longOffset',
      }).formatToParts(refDate);
      const tzName = parts.find((p) => p.type === 'timeZoneName')?.value || '';
      if (tzName === 'GMT' || tzName === 'UTC') return '+00:00';
      const match = tzName.match(/GMT([+-]\d{2}:\d{2})/);
      if (match) return match[1];
    } catch {}
    const offsetMins = -refDate.getTimezoneOffset();
    const sign = offsetMins >= 0 ? '+' : '-';
    const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
    return `${sign}${pad(Math.floor(Math.abs(offsetMins) / 60))}:${pad(Math.abs(offsetMins) % 60)}`;
  };

  const buildGoogleCalendarEventBody = (block: TimeBlock, targetTz?: string) => {
    const resolvedTz = targetTz || calendarTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const safeDate = block.date && /^\d{4}-\d{2}-\d{2}$/.test(block.date) ? block.date : format(selectedDate, 'yyyy-MM-dd');
    const [year, month, day] = safeDate.split('-').map(Number);
    const [shRaw, smRaw] = (block.startTime || '09:00').split(':').map(Number);
    const [ehRaw, emRaw] = (block.endTime || '10:00').split(':').map(Number);
    const sh = Number.isFinite(shRaw) ? shRaw : 9;
    const sm = Number.isFinite(smRaw) ? smRaw : 0;
    const eh = Number.isFinite(ehRaw) ? ehRaw : 10;
    const em = Number.isFinite(emRaw) ? emRaw : 0;

    const startDt = new Date(year, (month || 1) - 1, day || 1, sh, sm, 0);
    let endDt = new Date(year, (month || 1) - 1, day || 1, eh, em, 0);
    if (endDt.getTime() === startDt.getTime()) {
      endDt = new Date(startDt.getTime() + 30 * 60 * 1000);
    } else if (endDt.getTime() < startDt.getTime()) {
      endDt = new Date(endDt.getTime() + 24 * 60 * 60 * 1000);
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const startOffset = getTimeZoneOffsetString(resolvedTz, startDt);
    const endOffset = getTimeZoneOffsetString(resolvedTz, endDt);

    const startRfc3339 = `${startDt.getFullYear()}-${pad(startDt.getMonth() + 1)}-${pad(startDt.getDate())}T${pad(startDt.getHours())}:${pad(startDt.getMinutes())}:00${startOffset}`;
    const endRfc3339 = `${endDt.getFullYear()}-${pad(endDt.getMonth() + 1)}-${pad(endDt.getDate())}T${pad(endDt.getHours())}:${pad(endDt.getMinutes())}:00${endOffset}`;

    const subtaskLines =
      block.subtasks && block.subtasks.length > 0
        ? 'Subtasks:\n' +
          block.subtasks.map((st) => `${st.completed ? '✓' : '○'} ${st.text}`).join('\n') +
          '\n\n'
        : '';

    const cleanActivity = block.emoji && block.activity.startsWith(block.emoji)
      ? block.activity.slice(block.emoji.length).trim()
      : block.activity.trim();

    return {
      status: 'confirmed',
      summary: `${block.emoji ? block.emoji + ' ' : ''}${cleanActivity || 'Scheduled Block'}`.trim(),
      description: `${subtaskLines}Synced from Momentum Schedule`,
      start: {
        dateTime: startRfc3339,
        timeZone: resolvedTz,
      },
      end: {
        dateTime: endRfc3339,
        timeZone: resolvedTz,
      },
    };
  };

  // Create or update a single block in Google Calendar (recreating via POST if old event was deleted/cancelled)
  const upsertSingleBlockToGoogleCalendar = async (
    block: TimeBlock,
    token: string,
    targetTz?: string,
    knownActiveEventIds?: Set<string>
  ): Promise<{ action: 'created' | 'updated'; eventId: string; htmlLink?: string; calendarEmail?: string }> => {
    const eventBody = buildGoogleCalendarEventBody(block, targetTz);
    const syncedEventId = block.googleCalendarEventId;

    if (syncedEventId) {
      let isStillActiveInGCal = knownActiveEventIds ? knownActiveEventIds.has(syncedEventId) : false;

      if (!isStillActiveInGCal) {
        try {
          const checkRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(syncedEventId)}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (checkRes.ok) {
            const existingEv = await checkRes.json();
            if (existingEv && existingEv.status !== 'cancelled') {
              isStillActiveInGCal = true;
            }
          }
        } catch {}
      }

      if (isStillActiveInGCal) {
        const patchRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(syncedEventId)}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventBody),
          }
        );

        if (patchRes.ok) {
          const patchedEvent = await patchRes.json();
          if (patchedEvent && patchedEvent.status !== 'cancelled') {
            return {
              action: 'updated',
              eventId: patchedEvent.id || syncedEventId,
              htmlLink: patchedEvent.htmlLink,
              calendarEmail: patchedEvent.organizer?.email || patchedEvent.creator?.email,
            };
          }
        } else if (patchRes.status === 401 || patchRes.status === 403) {
          const err: any = new Error('AUTH_EXPIRED');
          err.status = patchRes.status;
          throw err;
        }
      }
    }

    // Create a fresh active event on the user's primary Google Calendar
    const postRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (postRes.status === 401 || postRes.status === 403) {
      const err: any = new Error('AUTH_EXPIRED');
      err.status = postRes.status;
      throw err;
    }

    if (!postRes.ok) {
      const errData = await postRes.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to sync "${block.activity}" to Google Calendar.`);
    }

    const createdEvent = await postRes.json();
    if (createdEvent?.id) {
      autoImportedEventIdsRef.current.add(createdEvent.id);
      onEditTimeBlock(block.id, {
        startTime: block.startTime,
        endTime: block.endTime,
        activity: block.activity,
        date: block.date,
        color: block.color,
        emoji: block.emoji,
        subtasks: block.subtasks,
        showCountdown: block.showCountdown,
        googleCalendarEventId: createdEvent.id,
      });
    }

    return {
      action: 'created',
      eventId: createdEvent.id,
      htmlLink: createdEvent.htmlLink,
      calendarEmail: createdEvent.organizer?.email || createdEvent.creator?.email,
    };
  };

  // Fetch events from user's primary Google Calendar (and two-way auto-sync with schedule if enabled)
  const fetchGoogleCalendarEvents = async (
    tokenOverride?: string,
    rangeOverride?: 'day' | 'week',
    isBackgroundSync: boolean = false
  ) => {
    let activeToken = tokenOverride || calendarToken || getGoogleAccessToken();
    if (!activeToken && calendarEmail) {
      activeToken = await trySilentCalendarTokenRefresh(calendarEmail);
      if (activeToken) setCalendarToken(activeToken);
    }
    if (!activeToken) return;

    setIsFetchingGCalEvents(true);
    if (!isBackgroundSync) {
      setCalendarSyncStatus(null);
    }
    try {
      const activeRangeMode = rangeOverride || calendarSyncRange;
      const { startBound, endBound, days: rangeDays } = getSyncRangeBounds(activeRangeMode);
      const rangeDatesSet = new Set(rangeDays.map((d) => format(d, 'yyyy-MM-dd')));
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const params = new URLSearchParams({
        timeMin: startBound.toISOString(),
        timeMax: endBound.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '150',
        timeZone: browserTz,
      });

      let res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if ((res.status === 401 || res.status === 403) && calendarEmail) {
        const refreshed = await trySilentCalendarTokenRefresh(calendarEmail);
        if (refreshed) {
          activeToken = refreshed;
          setCalendarToken(refreshed);
          res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
            headers: {
              Authorization: `Bearer ${refreshed}`,
            },
          });
        }
      }

      if (res.status === 401 || res.status === 403) {
        setCalendarToken(null);
        if (!isBackgroundSync) {
          setCalendarSyncStatus({
            type: 'error',
            message: 'Your Google Calendar session expired. Click Reconnect to refresh access.',
          });
        }
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || 'Failed to fetch Google Calendar events.');
      }

      const data = await res.json();
      const detectedTz = data.timeZone || browserTz;
      if (detectedTz) {
        setCalendarTimeZone(detectedTz);
      }
      if (data.summary && data.summary.includes('@') && !calendarEmail) {
        setCalendarEmail(data.summary);
      }

      const rawItems: any[] = Array.isArray(data.items) ? data.items : [];
      const currentBlocks = timeBlocksRef.current;
      const dismissedIds = getDismissedGCalIds();

      const stripEmojiPrefix = (text: string, emoji?: string) => {
        let cleaned = text.trim();
        if (emoji && cleaned.startsWith(emoji)) {
          cleaned = cleaned.slice(emoji.length).trim();
        }
        return cleaned;
      };

      const parsedEvents = rawItems
        .filter((item) => item.status !== 'cancelled')
        .map((item) => {
          const summary = (item.summary || 'Untitled Event').trim();
          let dateStr = format(selectedDate, 'yyyy-MM-dd');
          let startTimeStr = '09:00';
          let endTimeStr = '10:00';

          if (item.start?.dateTime && item.end?.dateTime) {
            const startDt = new Date(item.start.dateTime);
            const endDt = new Date(item.end.dateTime);
            dateStr = format(startDt, 'yyyy-MM-dd');
            startTimeStr = format(startDt, 'HH:mm');
            endTimeStr = format(endDt, 'HH:mm');
            if (endTimeStr === startTimeStr) {
              endTimeStr = format(new Date(startDt.getTime() + 30 * 60 * 1000), 'HH:mm');
            }
          } else if (item.start?.date) {
            dateStr = item.start.date;
            startTimeStr = '09:00';
            endTimeStr = '10:00';
          }

          const existingLinkedBlock = currentBlocks.find(
            (b) => b.googleCalendarEventId && b.googleCalendarEventId === item.id
          );

          const normalizedSummaryForBlock = existingLinkedBlock
            ? stripEmojiPrefix(summary, existingLinkedBlock.emoji).slice(0, 190)
            : summary.slice(0, 190);

          // If an already-synced Google Calendar event changed time, date, or title in Google Calendar, update it automatically
          if (
            autoSyncEnabled &&
            existingLinkedBlock &&
            (existingLinkedBlock.date !== dateStr ||
              existingLinkedBlock.startTime !== startTimeStr ||
              existingLinkedBlock.endTime !== endTimeStr ||
              existingLinkedBlock.activity.trim() !== normalizedSummaryForBlock)
          ) {
            onEditTimeBlock(existingLinkedBlock.id, {
              startTime: startTimeStr,
              endTime: endTimeStr,
              activity: normalizedSummaryForBlock,
              date: dateStr,
              color: existingLinkedBlock.color,
              emoji: existingLinkedBlock.emoji,
              subtasks: existingLinkedBlock.subtasks,
              showCountdown: existingLinkedBlock.showCountdown,
              googleCalendarEventId: item.id,
            });
          }

          const matchingUnlinkedBlock = !existingLinkedBlock
            ? currentBlocks.find(
                (b) =>
                  b.date === dateStr &&
                  b.startTime === startTimeStr &&
                  (b.activity.trim().toLowerCase() === summary.toLowerCase() ||
                    `${b.emoji ? b.emoji + ' ' : ''}${b.activity}`.trim().toLowerCase() === summary.toLowerCase())
              )
            : undefined;

          if (matchingUnlinkedBlock && !matchingUnlinkedBlock.googleCalendarEventId) {
            onEditTimeBlock(matchingUnlinkedBlock.id, {
              startTime: matchingUnlinkedBlock.startTime,
              endTime: matchingUnlinkedBlock.endTime,
              activity: matchingUnlinkedBlock.activity,
              date: matchingUnlinkedBlock.date,
              color: matchingUnlinkedBlock.color,
              emoji: matchingUnlinkedBlock.emoji,
              subtasks: matchingUnlinkedBlock.subtasks,
              showCountdown: matchingUnlinkedBlock.showCountdown,
              googleCalendarEventId: item.id,
            });
          }

          const alreadyImported =
            Boolean(existingLinkedBlock) ||
            Boolean(matchingUnlinkedBlock) ||
            autoImportedEventIdsRef.current.has(item.id);

          return {
            id: item.id as string,
            summary,
            date: dateStr,
            startTime: startTimeStr,
            endTime: endTimeStr,
            htmlLink: item.htmlLink as string | undefined,
            alreadyImported,
          };
        });

      const activeGCalEventIds = new Set(parsedEvents.map((ev) => ev.id));

      // Two-Way Auto-Sync when autoSyncEnabled is ON:
      // 1) Import new Google Calendar events -> Momentum Schedule
      // 2) Push unsynced (or missing on GCal) Momentum Schedule blocks -> Google Calendar
      if (autoSyncEnabled) {
        const eventsToAutoImport = parsedEvents.filter(
          (ev) => !ev.alreadyImported && !dismissedIds.has(ev.id) && !autoImportedEventIdsRef.current.has(ev.id)
        );

        if (eventsToAutoImport.length > 0) {
          eventsToAutoImport.forEach((ev) => {
            autoImportedEventIdsRef.current.add(ev.id);
            ev.alreadyImported = true;
          });

          const blocksPayload = eventsToAutoImport.map((ev) => ({
            activity: ev.summary.slice(0, 190),
            emoji: '📅',
            startTime: ev.startTime,
            endTime: ev.endTime,
            date: ev.date,
            color: 'sky',
            subtasks: [] as BlockTask[],
            showCountdown: false,
            googleCalendarEventId: ev.id,
          }));

          if (onAddBatchTimeBlocks) {
            await onAddBatchTimeBlocks(blocksPayload);
          } else {
            for (const b of blocksPayload) {
              onAddTimeBlock(b);
            }
          }
        }

        // Auto-push any Momentum schedule block in the active range that isn't on Google Calendar yet
        const blocksInRangeToAutoPush = currentBlocks.filter((b) => {
          if (!rangeDatesSet.has(b.date)) return false;
          if (autoPushedBlockIdsRef.current.has(b.id)) return false;
          if (b.googleCalendarEventId && activeGCalEventIds.has(b.googleCalendarEventId)) return false;
          const matchesExistingGCal = parsedEvents.some(
            (ev) =>
              ev.date === b.date &&
              ev.startTime === b.startTime &&
              (ev.summary.toLowerCase() === b.activity.trim().toLowerCase() ||
                ev.summary.toLowerCase() === `${b.emoji ? b.emoji + ' ' : ''}${b.activity}`.trim().toLowerCase())
          );
          return !matchesExistingGCal;
        });

        if (blocksInRangeToAutoPush.length > 0) {
          for (const blockToPush of blocksInRangeToAutoPush) {
            autoPushedBlockIdsRef.current.add(blockToPush.id);
            try {
              const resPush = await upsertSingleBlockToGoogleCalendar(
                blockToPush,
                activeToken,
                detectedTz,
                activeGCalEventIds
              );
              if (resPush.eventId) {
                activeGCalEventIds.add(resPush.eventId);
                parsedEvents.push({
                  id: resPush.eventId,
                  summary: `${blockToPush.emoji ? blockToPush.emoji + ' ' : ''}${blockToPush.activity}`.trim(),
                  date: blockToPush.date,
                  startTime: blockToPush.startTime,
                  endTime: blockToPush.endTime,
                  htmlLink: resPush.htmlLink,
                  alreadyImported: true,
                });
              }
            } catch (pushErr) {
              autoPushedBlockIdsRef.current.delete(blockToPush.id);
              console.warn('Auto-push block to Google Calendar failed:', pushErr);
            }
          }
        }
      }

      setGcalEvents(parsedEvents);
      setSelectedImportIds(parsedEvents.filter((e) => !e.alreadyImported).map((e) => e.id));
    } catch (error: any) {
      console.error('Google Calendar fetch error:', error);
      if (!isBackgroundSync) {
        setCalendarSyncStatus({
          type: 'error',
          message: error.message || 'Could not load events from Google Calendar.',
        });
      }
    } finally {
      setIsFetchingGCalEvents(false);
    }
  };

  // Connect Google Calendar via OAuth popup
  const handleConnectGoogleCalendar = async (forceAccountPicker: boolean = false) => {
    setIsConnectingCalendar(true);
    setCalendarSyncStatus(null);
    try {
      const { user: calUser, accessToken } = await connectGoogleCalendar(forceAccountPicker);
      setCalendarToken(accessToken);
      if (calUser?.email) setCalendarEmail(calUser.email);
      setCalendarSyncStatus({
        type: 'success',
        message: `Connected to Google Calendar${calUser?.email ? ` (${calUser.email})` : ''}!`,
      });
      await fetchGoogleCalendarEvents(accessToken);
    } catch (error: any) {
      console.error('Google Calendar auth error:', error);
      setCalendarSyncStatus({
        type: 'error',
        message: error.message || 'Google sign-in was cancelled or failed.',
      });
    } finally {
      setIsConnectingCalendar(false);
    }
  };

  // Import selected Google Calendar events into Schedule
  const handleImportSelectedFromGCal = async () => {
    const toImport = gcalEvents.filter((ev) => selectedImportIds.includes(ev.id) && !ev.alreadyImported);
    if (toImport.length === 0) return;

    try {
      const blocksPayload = toImport.map((ev) => ({
        activity: ev.summary.slice(0, 190),
        emoji: '📅',
        startTime: ev.startTime,
        endTime: ev.endTime,
        date: ev.date,
        color: 'sky',
        subtasks: [] as BlockTask[],
        showCountdown: false,
        googleCalendarEventId: ev.id,
      }));

      if (onAddBatchTimeBlocks) {
        await onAddBatchTimeBlocks(blocksPayload);
      } else {
        for (const b of blocksPayload) {
          onAddTimeBlock(b);
        }
      }

      setGcalEvents((prev) =>
        prev.map((ev) => (selectedImportIds.includes(ev.id) ? { ...ev, alreadyImported: true } : ev))
      );
      setSelectedImportIds([]);
      setCalendarSyncStatus({
        type: 'success',
        message: `Imported ${toImport.length} event${toImport.length > 1 ? 's' : ''} from Google Calendar into your schedule.`,
      });
    } catch (error: any) {
      setCalendarSyncStatus({
        type: 'error',
        message: error.message || 'Failed to import events to schedule.',
      });
    }
  };

  // Push selected Schedule blocks to Google Calendar immediately
  const handleConfirmExportToGCal = async () => {
    let activeToken = calendarToken || getGoogleAccessToken();
    if (!activeToken && calendarEmail) {
      activeToken = await trySilentCalendarTokenRefresh(calendarEmail);
      if (activeToken) setCalendarToken(activeToken);
    }
    if (!activeToken) {
      setCalendarSyncStatus({
        type: 'error',
        message: 'Please sign in with Google first to push blocks to Google Calendar.',
      });
      return;
    }

    const blocksToExport = exportableScheduleBlocks.filter((b) => selectedExportBlockIds.includes(b.id));
    if (blocksToExport.length === 0) {
      setCalendarSyncStatus({
        type: 'info',
        message: 'Please select at least one schedule block to push to Google Calendar.',
      });
      return;
    }

    setIsPushingToGCal(true);
    setCalendarSyncStatus(null);
    let createdCount = 0;
    let updatedCount = 0;
    let detectedEmail = calendarEmail;
    const knownActiveIds = new Set<string>(gcalEvents.map((e) => e.id));

    try {
      for (const block of blocksToExport) {
        autoPushedBlockIdsRef.current.add(block.id);
        let result;
        try {
          result = await upsertSingleBlockToGoogleCalendar(block, activeToken, calendarTimeZone, knownActiveIds);
        } catch (err: any) {
          if ((err?.status === 401 || err?.status === 403 || err?.message === 'AUTH_EXPIRED') && calendarEmail) {
            const refreshed = await trySilentCalendarTokenRefresh(calendarEmail);
            if (refreshed) {
              activeToken = refreshed;
              setCalendarToken(refreshed);
              result = await upsertSingleBlockToGoogleCalendar(block, refreshed, calendarTimeZone, knownActiveIds);
            } else {
              setCalendarToken(null);
              throw new Error('Your Google Calendar session expired. Please click Reconnect and try again.');
            }
          } else {
            throw err;
          }
        }

        if (result.action === 'created') {
          createdCount++;
        } else {
          updatedCount++;
        }
        if (result.calendarEmail && !detectedEmail) {
          detectedEmail = result.calendarEmail;
          setCalendarEmail(result.calendarEmail);
        }
        if (result.eventId) {
          knownActiveIds.add(result.eventId);
        }
      }

      const firstDateStr = blocksToExport[0]?.date || format(selectedDate, 'yyyy-MM-dd');
      const [y, m, d] = firstDateStr.split('-').map(Number);
      const gcalDayUrl = `https://calendar.google.com/calendar/r/day/${y}/${m}/${d}`;

      const parts: string[] = [];
      if (createdCount > 0) parts.push(`${createdCount} created`);
      if (updatedCount > 0) parts.push(`${updatedCount} updated`);

      setCalendarSyncStatus({
        type: 'success',
        message: `Pushed ${blocksToExport.length} event${blocksToExport.length > 1 ? 's' : ''} (${parts.join(', ')}) to Google Calendar${
          detectedEmail ? ` (${detectedEmail})` : ''
        } on ${firstDateStr}!`,
        calendarLink: gcalDayUrl,
      });

      await fetchGoogleCalendarEvents(activeToken, calendarSyncRange, true);
    } catch (error: any) {
      console.error('Export to Google Calendar error:', error);
      setCalendarSyncStatus({
        type: 'error',
        message: error.message || 'Failed to push schedule blocks to Google Calendar.',
      });
    } finally {
      setIsPushingToGCal(false);
    }
  };

  // Auto-populate export selection and fetch events when modal opens or range changes
  useEffect(() => {
    if (!showCalendarSyncModal) return;
    setSelectedExportBlockIds(exportableScheduleBlocks.map((b) => b.id));
    const token = calendarToken || getGoogleAccessToken();
    if (token) {
      if (!calendarToken) setCalendarToken(token);
      fetchGoogleCalendarEvents(token, calendarSyncRange, false);
    } else if (calendarEmail) {
      trySilentCalendarTokenRefresh(calendarEmail).then((refreshed) => {
        if (refreshed) {
          setCalendarToken(refreshed);
          fetchGoogleCalendarEvents(refreshed, calendarSyncRange, false);
        }
      });
    }
  }, [showCalendarSyncModal, calendarSyncRange, selectedDate, calendarToken, calendarEmail, autoSyncEnabled, timeBlocks.length]);

  // Background Two-Way Auto-Sync: automatically sync Google Calendar <-> Momentum Schedule without opening the modal
  useEffect(() => {
    if (!autoSyncEnabled || (!calendarToken && !calendarEmail)) return;

    const runBackgroundSync = () => {
      const bgRange: 'day' | 'week' = viewMode === 'day' ? 'day' : 'week';
      fetchGoogleCalendarEvents(undefined, bgRange, true);
    };

    runBackgroundSync();

    const intervalId = setInterval(runBackgroundSync, 60000);
    const handleWindowFocus = () => runBackgroundSync();
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [autoSyncEnabled, calendarToken, calendarEmail, selectedDate, viewMode, timeBlocks.length]);

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

  // Format minutes into readable hours & minutes (e.g. 420 mins -> 7 hrs, 90 mins -> 1 hr 30 mins)
  const formatMinutesToHM = (totalMins: number) => {
    if (totalMins <= 0) return '0 mins';
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours === 0) return `${mins} mins`;
    if (mins === 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
    return `${hours} hr${hours > 1 ? 's' : ''} ${mins} min${mins > 1 ? 's' : ''}`;
  };

  const formatBlockDuration = (startStr: string, endStr: string) => {
    let startMins = getMinutes(startStr);
    let endMins = getMinutes(endStr);
    if (endMins < startMins) endMins += 1440;
    return formatMinutesToHM(endMins - startMins);
  };

  // Calculate total block duration in seconds from startTime and endTime
  const getBlockDurationSeconds = (startStr: string, endStr: string) => {
    let startMins = getMinutes(startStr);
    let endMins = getMinutes(endStr);
    if (endMins <= startMins) endMins += 1440;
    return Math.max(60, (endMins - startMins) * 60);
  };

  // Format seconds as 00:00 when finished, or HH:MM:SS (if >= 1 hr) / MM:SS
  const formatCountdownTime = (remainingSecs: number, totalSecs: number) => {
    const clamped = Math.max(0, Math.floor(remainingSecs));
    if (clamped === 0) {
      return '00:00';
    }
    const hrs = Math.floor(clamped / 3600);
    const mins = Math.floor((clamped % 3600) / 60);
    const secs = clamped % 60;
    if (totalSecs >= 3600 || hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Compute real-time countdown state synced directly to current time
  const getLiveBlockCountdownState = (block: TimeBlock, currentNow: Date) => {
    const [year, month, day] = (block.date || format(startOfToday(), 'yyyy-MM-dd')).split('-').map(Number);
    const [sh, sm] = (block.startTime || '09:00').split(':').map(Number);
    const [eh, em] = (block.endTime || '10:00').split(':').map(Number);

    const startDateObj = new Date(year, (month || 1) - 1, day || 1, sh || 0, sm || 0, 0, 0);
    let endDateObj = new Date(year, (month || 1) - 1, day || 1, eh || 0, em || 0, 0, 0);
    if (endDateObj.getTime() <= startDateObj.getTime()) {
      endDateObj = new Date(endDateObj.getTime() + 24 * 60 * 60 * 1000);
    }

    const startMs = startDateObj.getTime();
    const endMs = endDateObj.getTime();
    const nowMs = currentNow.getTime();
    const totalSecs = Math.max(60, Math.round((endMs - startMs) / 1000));

    if (nowMs >= endMs) {
      return {
        remainingSecs: 0,
        totalSecs,
        isRunning: false,
        isCompleted: true,
        progressPct: 100,
      };
    }

    if (nowMs >= startMs && nowMs < endMs) {
      const remainingSecs = Math.max(0, Math.floor((endMs - nowMs) / 1000));
      const progressPct = totalSecs > 0 ? Math.min(100, Math.max(0, ((totalSecs - remainingSecs) / totalSecs) * 100)) : 0;
      return {
        remainingSecs,
        totalSecs,
        isRunning: true,
        isCompleted: remainingSecs === 0,
        progressPct,
      };
    }

    return {
      remainingSecs: totalSecs,
      totalSecs,
      isRunning: false,
      isCompleted: false,
      progressPct: 0,
    };
  };

  const renderBlockCountdown = (block: TimeBlock, heightPx: number, isListView = false) => {
    const { remainingSecs, totalSecs, isRunning, isCompleted, progressPct } = getLiveBlockCountdownState(block, now);

    if (isListView) {
      return (
        <div
          className={`relative overflow-hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-all select-none ${
            isCompleted
              ? 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500'
              : isRunning
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200'
          }`}
          title={
            isCompleted
              ? 'Time block completed'
              : isRunning
                ? 'Live countdown following current time'
                : 'Scheduled countdown (starts automatically at block start time)'
          }
        >
          {isRunning && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          )}
          <Timer className={`w-3.5 h-3.5 shrink-0 ${isRunning ? 'text-amber-500' : 'opacity-70'}`} />
          <span className="tabular-nums tracking-wider font-black text-[11px]">
            {formatCountdownTime(remainingSecs, totalSecs)}
          </span>
        </div>
      );
    }

    // Compact layout for short blocks (< 38px height)
    if (heightPx < 38) {
      return (
        <div
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border backdrop-blur-xs transition-all select-none shrink-0 ${
            isCompleted
              ? 'bg-black/25 border-white/15 text-white/60'
              : isRunning
                ? 'bg-black/55 border-amber-300/70 text-white ring-1 ring-amber-300/30'
                : 'bg-black/30 border-white/25 text-white'
          }`}
          title={
            isCompleted
              ? 'Time block completed'
              : isRunning
                ? 'Live countdown following current time'
                : 'Scheduled countdown'
          }
        >
          {isRunning && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse shrink-0" />
          )}
          <Timer className={`w-2.5 h-2.5 shrink-0 ${isRunning ? 'text-amber-300' : 'text-white/80'}`} />
          <span className="font-mono text-[9.5px] font-black tracking-wider tabular-nums leading-none">
            {formatCountdownTime(remainingSecs, totalSecs)}
          </span>
        </div>
      );
    }

    // Standard / Tall Schedule Block Countdown Pill — Positioned on the right side of the block
    return (
      <div
        className={`relative overflow-hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-xs transition-all select-none shrink-0 shadow-xs ${
          isCompleted
            ? 'bg-black/25 border-white/15 text-white/65'
            : isRunning
              ? 'bg-black/50 border-amber-300/80 text-white ring-1 ring-amber-300/30'
              : 'bg-black/30 border-white/25 text-white'
        }`}
        title={
          isCompleted
            ? 'Time block completed'
            : isRunning
              ? 'Live countdown following current time'
              : 'Scheduled countdown (starts automatically at block start time)'
        }
      >
        {/* Subtle bottom progress bar while active */}
        {isRunning && (
          <div
            className="absolute bottom-0 left-0 h-[2px] bg-amber-300 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        )}

        {isRunning && (
          <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse shrink-0" />
        )}

        <div className="flex items-center gap-1.5 leading-none">
          <Timer className={`w-3.5 h-3.5 shrink-0 ${isRunning ? 'text-amber-300' : 'text-white/80'}`} />
          <span className="font-mono text-xs sm:text-[13px] font-black tracking-wider tabular-nums text-white leading-none">
            {formatCountdownTime(remainingSecs, totalSecs)}
          </span>
        </div>
      </div>
    );
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
    <div className="w-full flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden transition-all">
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
            <button 
              onClick={() => setViewMode(prev => prev === 'month' ? 'day' : 'month')}
              className="p-1 hover:bg-amber-500/10 rounded-lg transition-colors group"
              title="Click to toggle Month Calendar View"
            >
              <CalendarIcon className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            </button>
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

        {/* View Mode Switcher & Add Button */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-wrap">

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

          {/* Google Calendar Sync Button */}
          <button
            onClick={() => {
              setCalendarSyncStatus(null);
              setShowCalendarSyncModal(true);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 font-bold text-xs rounded-lg shadow-sm active:scale-95 transition-all"
            title="Sync schedule with Google Calendar"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span className="hidden sm:inline">Calendar Sync</span>
            <span className="sm:hidden">Sync</span>
            {isFetchingGCalEvents ? (
              <RefreshCw className="w-3 h-3 text-amber-500 animate-spin shrink-0" />
            ) : (calendarToken || calendarEmail) ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Google Calendar Auto-Sync Active" />
            ) : null}
          </button>

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

      {/* QUICK PRESETS STRIP WITH DRAG-TO-SCROLL & CUSTOMIZE BUTTON */}
      <div className="px-6 py-2.5 bg-zinc-100/60 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-2 text-xs no-scrollbar overflow-hidden">
        <div 
          ref={quickPresetScrollRef}
          onMouseDown={handleQuickMouseDown}
          onMouseLeave={handleQuickMouseLeave}
          onMouseUp={handleQuickMouseUp}
          onMouseMove={handleQuickMouseMove}
          className={`flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none select-none cursor-grab flex-1 ${
            isQuickDragging ? 'cursor-grabbing' : ''
          }`}
        >
          <span className="text-[10px] font-mono font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0 flex items-center gap-1 select-none pointer-events-none">
            <Sparkles className="w-3 h-3 text-amber-500" /> Quick Add:
          </span>

          {activeQuickPresets.map(preset => {
            const dotColor = COLOR_OPTIONS.find(c => c.id === preset.color)?.dot || '#4f46e5';
            return (
              <button 
                key={preset.id}
                onClick={() => {
                  if (quickDragDistance > 5) return; // Prevent triggering preset click when dragging to scroll
                  handleAddPreset(preset.name, preset.durationMinutes, preset.color);
                }}
                className="px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 font-bold rounded-md shrink-0 transition-all flex items-center gap-1.5 hover:shadow-sm select-none"
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                <span>{preset.name}</span>
                <span className="text-[9px] font-mono opacity-60">({formatMinutesToHM(preset.durationMinutes)})</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowCustomizeModal(true)}
          className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-zinc-600 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400 border border-zinc-200 dark:border-zinc-700 font-bold text-[10px] uppercase tracking-wider rounded-md shrink-0 transition-colors ml-2"
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
                                <span className="font-mono text-[9px] opacity-80 shrink-0 flex items-center gap-1">
                                  {block.emoji && <span className="normal-case leading-none">{block.emoji}</span>}
                                  <span>{formatTime12h(block.startTime).replace(':00', '').replace(' ', '')}</span>
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
                const completedTasks = subtasks.filter(t => t.completed || t.status === 'completed').length;

                return (
                  <div 
                    key={block.id}
                    className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-amber-500/50 transition-all shadow-sm group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-1.5 h-10 rounded-full shrink-0" 
                          style={{ backgroundColor: COLOR_OPTIONS.find(c => c.id === block.color)?.dot || '#4f46e5' }}
                        />
                        <div>
                          <h4 className="font-bold text-sm uppercase dark:text-zinc-100 flex items-center gap-2">
                            <span className="font-mono text-sm sm:text-[15px] font-black tracking-tight text-zinc-700 dark:text-zinc-200">
                              {formatTime12h(block.startTime)} – {formatTime12h(block.endTime)}
                            </span>
                            <span className="text-zinc-300 dark:text-zinc-600 font-mono text-[10px]">•</span>
                            <span className="flex items-center gap-1.5 font-black">
                              {block.emoji && <span className="normal-case text-base leading-none">{block.emoji}</span>}
                              <span>{block.activity}</span>
                            </span>
                          </h4>
                          <p className="text-[11px] font-mono font-medium text-zinc-400/70 dark:text-zinc-500/70 mt-1">
                            ({formatBlockDuration(block.startTime, block.endTime)})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {block.showCountdown && renderBlockCountdown(block, 64, true)}

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
                          onClick={() => handleDeleteBlockWithGCal(block)}
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
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
                            Tasks Checklist:
                          </span>
                          <span className="text-[8px] font-mono text-zinc-400">1st click: tick • 2nd click: cross</span>
                        </div>
                        {subtasks.map(task => {
                          const isCompleted = task.status === 'completed' || (task.completed && task.status !== 'cancelled');
                          const isCancelled = task.status === 'cancelled';
                          return (
                            <div 
                              key={task.id} 
                              onClick={() => onToggleSubtask && onToggleSubtask(block.id, task.id)}
                              className="flex items-center gap-2 text-xs cursor-pointer hover:text-amber-500 transition-colors group/task select-none"
                              title={`${task.text} (1st click: tick, 2nd click: cross)`}
                            >
                              {isCompleted ? (
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              ) : isCancelled ? (
                                <div className="w-3.5 h-3.5 rounded-sm border border-rose-500 bg-rose-500/10 flex items-center justify-center shrink-0">
                                  <X className="w-2.5 h-2.5 text-rose-500 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border border-zinc-400 group-hover/task:border-amber-500 shrink-0" />
                              )}
                              <span className={isCompleted ? 'line-through text-zinc-400 dark:text-zinc-500' : isCancelled ? 'line-through text-rose-500 dark:text-rose-400 font-medium' : 'text-zinc-700 dark:text-zinc-300 font-medium'}>
                                {task.text}
                              </span>
                            </div>
                          );
                        })}
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
            <div className="w-14 sm:w-16 shrink-0 border-r border-zinc-200 dark:border-zinc-800 py-1.5 text-[9px] font-mono font-bold text-zinc-400 text-center uppercase tracking-wider">
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
                    className={`py-1.5 px-2 text-center border-r border-zinc-200 dark:border-zinc-800/80 cursor-pointer transition-colors ${
                      isDayToday ? 'bg-amber-500/10 dark:bg-amber-500/10' : 'hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      {format(day, 'EEE')}
                    </div>
                    <div className="mt-0.5 flex items-center justify-center">
                      <span className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full transition-all ${
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
              <div className="w-14 sm:w-16 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 sticky left-0 z-10 select-none">
                {hours.map(h => (
                  <div 
                    key={h} 
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="border-b border-zinc-100 dark:border-zinc-800/40 relative pr-2 flex justify-end items-start"
                  >
                    {h !== 0 && (
                      <span className="text-[9px] font-mono font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-50/50 dark:bg-zinc-900/30 px-1 rounded -mt-2 relative z-10">
                        {format(new Date().setHours(h, 0, 0, 0), 'h a')}
                      </span>
                    )}
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
                        const completedCount = subtasks.filter(t => t.completed || t.status === 'completed').length;

                        // Layout thresholds based on pixel height
                        const paddingClass = heightPx < 32 ? 'px-1 py-0.5' : heightPx < 60 ? 'px-1.5 py-0.5' : 'px-2 py-1';
                        const titleSize = heightPx < 32 ? 'text-[10px]' : 'text-sm';
                        const timeSize = heightPx < 32 ? 'text-[10px]' : 'text-[13px] sm:text-sm';

                        return (
                          <motion.div
                            key={block.id}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            style={{
                              top: `${topPx}px`,
                              height: `${heightPx}px`,
                            }}
                            className={`absolute left-0.5 right-0.5 rounded-md border shadow-sm flex items-center overflow-hidden cursor-pointer hover:z-30 hover:scale-[1.01] transition-all group/card ${paddingClass} ${colorStyle}`}
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
                            {/* UNIFIED SIDE-BY-SIDE HORIZONTAL LAYOUT FOR ALL SCALES */}
                            <div className="flex items-center justify-between gap-1 w-full h-full min-w-0">
                              <div className="flex flex-col justify-center min-w-0 flex-1 h-full">
                                <div className="flex items-center gap-1.5 min-w-0 w-full truncate">
                                  <span className={`font-mono ${timeSize} font-black tracking-tight leading-none text-white shrink-0`}>
                                    {formatTime12h(block.startTime)} – {formatTime12h(block.endTime)}
                                  </span>
                                  <span className="text-white/70 font-mono text-[9px] shrink-0 leading-none">•</span>
                                  <span className={`font-black ${titleSize} uppercase shrink-0 leading-none flex items-center gap-0.5`}>
                                    {block.emoji && <span className="normal-case leading-none">{block.emoji}</span>}
                                    <span className="truncate">{block.activity}</span>
                                  </span>

                                  {heightPx < 48 && (
                                    <>
                                      <span className="text-white/60 font-mono text-[8px] shrink-0 leading-none">•</span>
                                      <span className="font-mono text-[10px] font-medium opacity-60 leading-none text-white shrink-0">
                                        ({formatBlockDuration(block.startTime, block.endTime)})
                                      </span>
                                    </>
                                  )}

                                  {/* TASKS VISIBLE ON LINE 1 IF HEIGHT < 48 */}
                                  {heightPx < 48 && subtasks.length > 0 && (
                                    <>
                                      <span className="text-white/60 font-mono text-[8px] shrink-0 leading-none">•</span>
                                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0 py-0.5">
                                        {subtasks.map(st => {
                                          const isCompleted = st.status === 'completed' || (st.completed && st.status !== 'cancelled');
                                          const isCancelled = st.status === 'cancelled';
                                          return (
                                            <span
                                              key={st.id}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleSubtask && onToggleSubtask(block.id, st.id);
                                              }}
                                              className="inline-flex items-center gap-1.5 text-[8.5px] font-semibold bg-black/25 hover:bg-black/40 px-1.5 py-0.5 rounded cursor-pointer shrink-0 whitespace-nowrap transition-colors shadow-xs select-none"
                                              title={`${st.text} (1st click: tick, 2nd click: cross)`}
                                            >
                                              {isCompleted ? (
                                                <Check className="w-2.5 h-2.5 shrink-0 text-emerald-300 stroke-[3]" />
                                              ) : isCancelled ? (
                                                <X className="w-2.5 h-2.5 shrink-0 text-rose-300 stroke-[3]" />
                                              ) : (
                                                <div className="w-2.5 h-2.5 rounded-full border border-white/80 shrink-0" />
                                              )}
                                              <span className={isCompleted ? 'line-through opacity-75 font-semibold text-white whitespace-nowrap' : isCancelled ? 'line-through opacity-85 font-semibold text-rose-100 whitespace-nowrap' : 'font-bold text-white whitespace-nowrap'}>
                                                {st.text}
                                              </span>
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </>
                                  )}
                                </div>
                                
                                {/* TASKS AND DURATION VISIBLE ON LINE 2 IF HEIGHT >= 48 */}
                                {heightPx >= 48 && (
                                  <div className="flex items-center gap-1.5 w-full min-w-0 mt-0.5">
                                    <span className="font-mono text-[10px] font-medium opacity-60 leading-none text-white shrink-0">
                                      ({formatBlockDuration(block.startTime, block.endTime)})
                                    </span>
                                    {subtasks.length > 0 && (
                                      <>
                                        <span className="text-white/60 font-mono text-[8px] shrink-0 leading-none">•</span>
                                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0 py-0.5">
                                          {subtasks.map(st => {
                                            const isCompleted = st.status === 'completed' || (st.completed && st.status !== 'cancelled');
                                            const isCancelled = st.status === 'cancelled';
                                            return (
                                              <span
                                                key={st.id}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onToggleSubtask && onToggleSubtask(block.id, st.id);
                                                }}
                                                className="inline-flex items-center gap-1.5 text-[8.5px] font-semibold bg-black/25 hover:bg-black/40 px-1.5 py-0.5 rounded cursor-pointer shrink-0 whitespace-nowrap transition-colors shadow-xs select-none"
                                                title={`${st.text} (1st click: tick, 2nd click: cross)`}
                                              >
                                                {isCompleted ? (
                                                  <Check className="w-2.5 h-2.5 shrink-0 text-emerald-300 stroke-[3]" />
                                                ) : isCancelled ? (
                                                  <X className="w-2.5 h-2.5 shrink-0 text-rose-300 stroke-[3]" />
                                                ) : (
                                                  <div className="w-2.5 h-2.5 rounded-full border border-white/80 shrink-0" />
                                                )}
                                                <span className={isCompleted ? 'line-through opacity-75 font-semibold text-white whitespace-nowrap' : isCancelled ? 'line-through opacity-85 font-semibold text-rose-100 whitespace-nowrap' : 'font-bold text-white whitespace-nowrap'}>
                                                  {st.text}
                                                </span>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>

                                <div className="flex items-center gap-2 shrink-0 self-center pl-2 mr-12 sm:mr-16">
                                  {block.showCountdown && renderBlockCountdown(block, heightPx, false)}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteBlockWithGCal(block);
                                    }}
                                    className="opacity-0 group-hover/card:opacity-100 p-0.5 hover:bg-black/20 rounded transition-opacity shrink-0"
                                    title="Delete block"
                                  >
                                    <X className="w-3 h-3 text-white" />
                                  </button>
                                </div>
                              </div>

                            {/* HOVER SUBTASKS POPOVER FOR EASY VISIBILITY AT ANY SCALE */}
                            {subtasks.length > 0 && (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="hidden group-hover/card:block absolute left-0 right-0 top-full mt-1 z-50 p-2.5 bg-zinc-900/95 text-white dark:bg-zinc-950 dark:text-zinc-100 rounded-xl shadow-2xl border border-zinc-700/80 dark:border-zinc-800 text-[10px] min-w-[240px] pointer-events-auto backdrop-blur-md"
                              >
                                <div className="flex items-center justify-between border-b border-zinc-700 dark:border-zinc-800 pb-1.5 mb-1.5 font-bold">
                                  <span className="flex items-center gap-1 text-amber-400 font-mono text-[9px] uppercase tracking-wider">
                                    <CheckSquare className="w-3 h-3" /> Checklist ({completedCount}/{subtasks.length})
                                  </span>
                                  <span className="text-[8px] font-mono text-zinc-400">1st click: tick • 2nd click: cross</span>
                                </div>
                                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                  {subtasks.map(st => {
                                    const isCompleted = st.status === 'completed' || (st.completed && st.status !== 'cancelled');
                                    const isCancelled = st.status === 'cancelled';
                                    return (
                                      <div 
                                        key={st.id} 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onToggleSubtask && onToggleSubtask(block.id, st.id);
                                        }}
                                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-zinc-800/80 cursor-pointer transition-colors select-none"
                                        title={`${st.text} (1st click: tick, 2nd click: cross)`}
                                      >
                                        {isCompleted ? (
                                          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5] shrink-0" />
                                        ) : isCancelled ? (
                                          <X className="w-3.5 h-3.5 text-rose-400 stroke-[2.5] shrink-0" />
                                        ) : (
                                          <div className="w-3.5 h-3.5 rounded-full border border-zinc-400 shrink-0" />
                                        )}
                                        <span className={`text-[10px] font-medium leading-snug break-words ${isCompleted ? 'line-through text-zinc-400' : isCancelled ? 'line-through text-rose-400 font-medium' : 'text-zinc-100'}`}>
                                          {st.text}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
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


      {/* GOOGLE CALENDAR SYNC MODAL */}
      <AnimatePresence>
        {showCalendarSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight dark:text-zinc-100">
                      Google Calendar Sync
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Import events into your schedule or push blocks to Google Calendar
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCalendarSyncModal(false)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Banner */}
              {calendarSyncStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-start justify-between gap-2.5 ${
                    calendarSyncStatus.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : calendarSyncStatus.type === 'error'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                        : 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400'
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1">
                    {calendarSyncStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span className="flex-1">{calendarSyncStatus.message}</span>
                  </div>
                  {calendarSyncStatus.calendarLink && (
                    <a
                      href={calendarSyncStatus.calendarLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 shrink-0 transition-colors"
                    >
                      <span>Open Google Calendar</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Connection Card / Sign in with Google */}
              {!calendarToken ? (
                <div className="p-6 bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-black uppercase tracking-wide dark:text-zinc-100">
                      Connect Your Google Calendar
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                      Sign in with Google to grant permission to view and sync your calendar events with your schedule blocks.
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleConnectGoogleCalendar(false)}
                      disabled={isConnectingCalendar}
                      className="inline-flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-full font-semibold text-sm shadow-sm hover:shadow transition-all disabled:opacity-60"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        <path fill="none" d="M0 0h48v48H0z" />
                      </svg>
                      <span>{isConnectingCalendar ? 'Connecting...' : 'Sign in with Google'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Connected Bar + Range Selector */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="font-bold text-zinc-700 dark:text-zinc-200">
                        {calendarEmail || auth.currentUser?.email
                          ? `Connected (${calendarEmail || auth.currentUser?.email})`
                          : 'Google Calendar Connected'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleConnectGoogleCalendar(true)}
                        className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline ml-1"
                      >
                        Switch / Reconnect
                      </button>
                    </div>

                    {/* Date Scope: Selected Day vs Week */}
                    <div className="flex items-center bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => setCalendarSyncRange('day')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                          calendarSyncRange === 'day'
                            ? 'bg-amber-500 text-white'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        Selected Day ({format(selectedDate, 'MMM d')})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarSyncRange('week')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                          calendarSyncRange === 'week'
                            ? 'bg-amber-500 text-white'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        Full Week
                      </button>
                    </div>
                  </div>

                  {/* Auto-Sync Toggle Bar */}
                  <div
                    onClick={toggleAutoSync}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      autoSyncEnabled
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <RefreshCw className={`w-4 h-4 ${autoSyncEnabled ? 'text-emerald-500' : 'text-zinc-400'}`} />
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide dark:text-zinc-100">
                          Two-Way Auto-Sync (Google Calendar ↔ Schedule)
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Automatically syncs Google Calendar events and pushes your schedule blocks in the background
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                        autoSyncEnabled ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Mode Switcher: Import vs Export */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarSyncTab('import');
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        calendarSyncTab === 'import'
                          ? 'bg-white dark:bg-zinc-950 text-amber-600 dark:text-amber-400 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Import from Google</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarSyncTab('export');
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        calendarSyncTab === 'export'
                          ? 'bg-white dark:bg-zinc-950 text-amber-600 dark:text-amber-400 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Push to Google</span>
                    </button>
                  </div>

                  {calendarSyncTab === 'import' ? (
                    /* IMPORT TAB: Google Calendar -> Schedule */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          Google Calendar Events ({gcalEvents.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => fetchGoogleCalendarEvents()}
                          disabled={isFetchingGCalEvents}
                          className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isFetchingGCalEvents ? 'animate-spin' : ''}`} />
                          <span>Refresh</span>
                        </button>
                      </div>

                      {isFetchingGCalEvents ? (
                        <div className="py-10 text-center text-xs font-mono text-zinc-400">
                          Loading events from Google Calendar...
                        </div>
                      ) : gcalEvents.length === 0 ? (
                        <div className="py-10 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-400">
                          No Google Calendar events found for this {calendarSyncRange === 'day' ? 'day' : 'week'}.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                          {gcalEvents.map((ev) => {
                            const isSelected = selectedImportIds.includes(ev.id);
                            return (
                              <div
                                key={ev.id}
                                onClick={() => {
                                  if (ev.alreadyImported) return;
                                  setSelectedImportIds((prev) =>
                                    prev.includes(ev.id) ? prev.filter((id) => id !== ev.id) : [...prev, ev.id]
                                  );
                                }}
                                className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                                  ev.alreadyImported
                                    ? 'bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/70 dark:border-zinc-800/70 opacity-60 cursor-default'
                                    : isSelected
                                      ? 'bg-amber-500/10 border-amber-500/40 cursor-pointer'
                                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 cursor-pointer'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {ev.alreadyImported ? (
                                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                                  ) : isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-amber-500 shrink-0" />
                                  ) : (
                                    <Square className="w-4 h-4 text-zinc-400 shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-black text-zinc-900 dark:text-zinc-100 truncate">
                                      {ev.summary}
                                    </p>
                                    <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                                      {ev.date} • {formatTime12h(ev.startTime)} – {formatTime12h(ev.endTime)}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {ev.alreadyImported ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
                                      Synced
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 font-mono text-[10px] font-bold">
                                      New
                                    </span>
                                  )}
                                  {ev.htmlLink && (
                                    <a
                                      href={ev.htmlLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                      title="Open in Google Calendar"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleImportSelectedFromGCal}
                        disabled={selectedImportIds.length === 0}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>
                          Import Selected to Schedule ({selectedImportIds.length})
                        </span>
                      </button>
                    </div>
                  ) : (
                    /* EXPORT TAB: Schedule -> Google Calendar */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          Schedule Blocks ({exportableScheduleBlocks.length})
                        </span>
                        {exportableScheduleBlocks.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedExportBlockIds.length === exportableScheduleBlocks.length) {
                                setSelectedExportBlockIds([]);
                              } else {
                                setSelectedExportBlockIds(exportableScheduleBlocks.map((b) => b.id));
                              }
                            }}
                            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                          >
                            {selectedExportBlockIds.length === exportableScheduleBlocks.length
                              ? 'Deselect All'
                              : 'Select All'}
                          </button>
                        )}
                      </div>

                      {exportableScheduleBlocks.length === 0 ? (
                        <div className="py-10 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-400">
                          No schedule blocks found for this {calendarSyncRange === 'day' ? 'day' : 'week'} to push.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                          {exportableScheduleBlocks.map((block) => {
                            const isSelected = selectedExportBlockIds.includes(block.id);
                            const isActiveOnGCal = Boolean(
                              block.googleCalendarEventId && gcalEvents.some((ev) => ev.id === block.googleCalendarEventId)
                            );
                            return (
                              <div
                                key={block.id}
                                onClick={() => {
                                  setSelectedExportBlockIds((prev) =>
                                    prev.includes(block.id)
                                      ? prev.filter((id) => id !== block.id)
                                      : [...prev, block.id]
                                  );
                                }}
                                className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-amber-500/10 border-amber-500/40'
                                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-amber-500 shrink-0" />
                                  ) : (
                                    <Square className="w-4 h-4 text-zinc-400 shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-black text-zinc-900 dark:text-zinc-100 truncate">
                                      {block.emoji ? `${block.emoji} ` : ''}{block.activity}
                                    </p>
                                    <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                                      {block.date} • {formatTime12h(block.startTime)} – {formatTime12h(block.endTime)}
                                    </p>
                                  </div>
                                </div>

                                <span
                                  className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold shrink-0 ${
                                    isActiveOnGCal
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                                  }`}
                                >
                                  {isActiveOnGCal ? 'Synced on Google' : 'Create Event'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleConfirmExportToGCal}
                        disabled={selectedExportBlockIds.length === 0 || isPushingToGCal}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Upload className={`w-4 h-4 ${isPushingToGCal ? 'animate-bounce' : ''}`} />
                        <span>
                          {isPushingToGCal
                            ? 'Pushing to Google Calendar...'
                            : `Push Selected to Google Calendar (${selectedExportBlockIds.length})`}
                        </span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  Active Presets ({activeQuickPresets.length})
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {activeQuickPresets.map(preset => {
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
});
