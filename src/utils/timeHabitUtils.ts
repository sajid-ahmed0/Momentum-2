/**
 * Utilities for Time-based habit tracking (e.g. daily wake up time, sleep time)
 */

export interface ParsedTime {
  formatted: string;
  minutes: number; // Minutes from midnight (0 to 1439)
}

/**
 * Parses user-entered time strings flexibly:
 * Supports: "8.00 am", "8:00 am", "9:30 am", "8.00", "8:00", "8am", "8pm", "14:30", "8", etc.
 */
export function parseTimeInput(input: string): ParsedTime | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // Pattern 1: Hour with AM/PM (e.g. "8am", "8 am", "8pm", "10 pm")
  const hourMeridiemMatch = lower.match(/^(\d{1,2})\s*(am|pm)$/);
  if (hourMeridiemMatch) {
    let h = parseInt(hourMeridiemMatch[1], 10);
    const isPm = hourMeridiemMatch[2] === 'pm';
    if (h >= 1 && h <= 12) {
      const displayH = h;
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      return {
        formatted: `${displayH}:00 ${isPm ? 'PM' : 'AM'}`,
        minutes: h * 60,
      };
    }
  }

  // Pattern 2: Hour + Minute with dot or colon, with or without AM/PM
  // Examples: "8.00 am", "8:00 am", "9.30 am", "09:30", "8.00", "14:30", "22:15", "8.15pm"
  const fullTimeMatch = lower.match(/^(\d{1,2})[.:](\d{1,2})\s*(am|pm)?$/);
  if (fullTimeMatch) {
    let h = parseInt(fullTimeMatch[1], 10);
    const m = parseInt(fullTimeMatch[2], 10);
    const meridiem = fullTimeMatch[3];

    if (h >= 0 && h <= 24 && m >= 0 && m < 60) {
      let finalHour = h;
      let displayMeridiem = 'AM';

      if (meridiem) {
        displayMeridiem = meridiem.toUpperCase();
        if (meridiem === 'pm' && h < 12) finalHour = h + 12;
        if (meridiem === 'am' && h === 12) finalHour = 0;
      } else {
        // No explicit AM/PM:
        if (h >= 13 && h <= 23) {
          finalHour = h;
          displayMeridiem = 'PM';
        } else if (h === 12) {
          finalHour = 12;
          displayMeridiem = 'PM';
        } else if (h === 0 || h === 24) {
          finalHour = 0;
          displayMeridiem = 'AM';
        } else {
          // Defaults for 1-11:
          // In daily wake up routines, 4-11 are naturally AM, 12 is PM
          displayMeridiem = 'AM';
          finalHour = h;
        }
      }

      const displayH = finalHour % 12 === 0 ? 12 : finalHour % 12;
      const displayM = m < 10 ? `0${m}` : `${m}`;
      return {
        formatted: `${displayH}:${displayM} ${displayMeridiem}`,
        minutes: finalHour * 60 + m,
      };
    }
  }

  // Pattern 3: Lone integer (e.g. "8", "9", "6", "7")
  const singleNumMatch = lower.match(/^(\d{1,2})$/);
  if (singleNumMatch) {
    const h = parseInt(singleNumMatch[1], 10);
    if (h >= 1 && h <= 12) {
      return {
        formatted: `${h}:00 AM`,
        minutes: h * 60,
      };
    } else if (h >= 13 && h <= 23) {
      return {
        formatted: `${h - 12}:00 PM`,
        minutes: h * 60,
      };
    }
  }

  // Fallback: preserve user's typed string as-is
  return {
    formatted: trimmed,
    minutes: 0,
  };
}

/**
 * Formats minutes from midnight (0 to 1439) into "H:MM AM/PM"
 */
export function formatMinutesToTime(minutes: number): string {
  if (typeof minutes !== 'number' || isNaN(minutes) || minutes < 0 || minutes >= 1440) {
    return '';
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : `${m}`;
  const meridiem = h >= 12 ? 'PM' : 'AM';
  return `${displayH}:${displayM} ${meridiem}`;
}

/**
 * Returns current local time formatted and with minute count
 */
export function getCurrentTime(): ParsedTime {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : `${m}`;
  const meridiem = h >= 12 ? 'PM' : 'AM';
  return {
    formatted: `${displayH}:${displayM} ${meridiem}`,
    minutes: h * 60 + m,
  };
}
