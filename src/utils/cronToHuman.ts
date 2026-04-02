/**
 * cronToHuman — Convert a cron expression to a human-readable string.
 *
 * Handles common patterns; falls back to the raw expression for anything exotic.
 */

export function cronToHuman(expr: string): string {
  if (!expr || typeof expr !== 'string') return expr;

  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Every minute: * * * * *
  if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every minute';
  }

  // Every N minutes: */N * * * *
  const everyNMin = minute.match(/^\*\/(\d+)$/);
  if (everyNMin && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const n = parseInt(everyNMin[1], 10);
    return n === 1 ? 'Every minute' : `Every ${n} minutes`;
  }

  // Every N hours: 0 */N * * *
  const everyNHour = hour.match(/^\*\/(\d+)$/);
  if (minute === '0' && everyNHour && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const n = parseInt(everyNHour[1], 10);
    return n === 1 ? 'Every hour' : `Every ${n} hours`;
  }

  // Specific time patterns (minute and hour are numbers)
  const m = parseInt(minute, 10);
  const h = parseInt(hour, 10);
  if (!isNaN(m) && !isNaN(h) && dayOfMonth === '*' && month === '*') {
    const time = formatTime(h, m);

    // Every day: 0 9 * * *
    if (dayOfWeek === '*') {
      return `Every day at ${time}`;
    }

    // Weekdays: 0 9 * * 1-5
    if (dayOfWeek === '1-5') {
      return `Weekdays at ${time}`;
    }

    // Weekends: 0 9 * * 0,6 or 0 9 * * 6,0
    if (dayOfWeek === '0,6' || dayOfWeek === '6,0') {
      return `Weekends at ${time}`;
    }

    // Specific days
    const dayNames = parseDays(dayOfWeek);
    if (dayNames) {
      return `${dayNames} at ${time}`;
    }
  }

  return expr;
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

const DAY_NAMES: Record<string, string> = {
  '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed',
  '4': 'Thu', '5': 'Fri', '6': 'Sat', '7': 'Sun',
};

function parseDays(dayOfWeek: string): string | null {
  // Handle comma-separated: 1,3,5
  const dayParts = dayOfWeek.split(',');
  const names: string[] = [];
  for (const part of dayParts) {
    const name = DAY_NAMES[part.trim()];
    if (!name) return null;
    names.push(name);
  }
  return names.join(', ');
}
