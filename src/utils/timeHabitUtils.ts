/**
 * Utilities for Time-based habit tracking (e.g. daily wake up time, sleep time)
 */

export interface ParsedTime {
  formatted: string;
  minutes: number; // Minutes from midnight (0 to 1439)
}

/**
 * Parses user-entered time strings flexibly:
 * Supports:
 * - Space-separated hours and minutes: "10 24 am" -> "10:24 AM", "10 24" -> "10:24 AM", "7 30 pm" -> "7:30 PM", "7 5" -> "7:05 AM"
 * - Colon or dot separated: "10:24 am", "8.00 am", "9:30", "14:30"
 * - Compact digits: "1024" -> "10:24 AM", "730" -> "7:30 AM"
 * - Lone hour with meridiem: "8am", "8 am", "8pm", "10 pm", "8a", "8p"
 * - Lone numbers: "8" -> "8:00 AM", "14" -> "2:00 PM"
 */
export function parseTimeInput(input: string): ParsedTime | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // Pattern 1: Hour + Minute separated by space, colon, or dot, with or without AM/PM
  // Examples: "10 24 am", "10 24", "10 24 pm", "7 30", "7 5", "7 05 am", "8.00 am", "8:00 am", "14:30"
  const spaceOrDelimTimeMatch = lower.match(/^(\d{1,2})[\s.:]+(\d{1,2})\s*([ap]m?)?$/);
  if (spaceOrDelimTimeMatch) {
    let h = parseInt(spaceOrDelimTimeMatch[1], 10);
    let m = parseInt(spaceOrDelimTimeMatch[2], 10);
    const rawMeridiem = spaceOrDelimTimeMatch[3];

    // Clamp minute within 0-59
    if (m >= 60) m = 59;
    if (m < 0) m = 0;

    if (h >= 0 && h <= 24) {
      let finalHour = h;
      let displayMeridiem = 'AM';

      if (rawMeridiem) {
        const isPm = rawMeridiem.startsWith('p');
        displayMeridiem = isPm ? 'PM' : 'AM';
        if (isPm) {
          finalHour = (h < 12) ? h + 12 : h;
        } else {
          finalHour = (h === 12) ? 0 : h;
        }
      } else {
        // Default when no AM/PM is provided:
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
          // Habits like wake up, routine time: 1-11 defaults to AM
          displayMeridiem = 'AM';
          finalHour = h;
        }
      }

      const displayH = finalHour % 12 === 0 ? 12 : finalHour % 12;
      const displayM = m < 10 ? `0${m}` : `${m}`;
      return {
        formatted: `${displayH}:${displayM} ${displayMeridiem}`,
        minutes: (finalHour % 24) * 60 + m,
      };
    }
  }

  // Pattern 2: Continuous 3 or 4 digits (e.g. "1024", "1024am", "730", "0730")
  const compactDigitsMatch = lower.match(/^(\d{1,2})(\d{2})\s*([ap]m?)?$/);
  if (compactDigitsMatch) {
    let h = parseInt(compactDigitsMatch[1], 10);
    let m = parseInt(compactDigitsMatch[2], 10);
    const rawMeridiem = compactDigitsMatch[3];

    if (m >= 60) m = 59;
    if (h >= 0 && h <= 24) {
      let finalHour = h;
      let displayMeridiem = 'AM';

      if (rawMeridiem) {
        const isPm = rawMeridiem.startsWith('p');
        displayMeridiem = isPm ? 'PM' : 'AM';
        if (isPm) {
          finalHour = (h < 12) ? h + 12 : h;
        } else {
          finalHour = (h === 12) ? 0 : h;
        }
      } else {
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
          displayMeridiem = 'AM';
          finalHour = h;
        }
      }

      const displayH = finalHour % 12 === 0 ? 12 : finalHour % 12;
      const displayM = m < 10 ? `0${m}` : `${m}`;
      return {
        formatted: `${displayH}:${displayM} ${displayMeridiem}`,
        minutes: (finalHour % 24) * 60 + m,
      };
    }
  }

  // Pattern 3: Hour with AM/PM (e.g. "8am", "8 am", "8pm", "10 pm", "8a", "8p")
  const hourMeridiemMatch = lower.match(/^(\d{1,2})\s*([ap]m?)$/);
  if (hourMeridiemMatch) {
    let h = parseInt(hourMeridiemMatch[1], 10);
    const isPm = hourMeridiemMatch[2].startsWith('p');
    if (h >= 1 && h <= 12) {
      const displayH = h;
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      return {
        formatted: `${displayH}:00 ${isPm ? 'PM' : 'AM'}`,
        minutes: (h % 24) * 60,
      };
    }
  }

  // Pattern 4: Lone integer (e.g. "8", "9", "6", "7", "10")
  const singleNumMatch = lower.match(/^(\d{1,2})$/);
  if (singleNumMatch) {
    const h = parseInt(singleNumMatch[1], 10);
    if (h >= 1 && h <= 12) {
      return {
        formatted: `${h}:00 AM`,
        minutes: (h === 12 ? 12 : h) * 60,
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
