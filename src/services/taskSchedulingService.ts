/**
 * ============================================================================
 * Task Scheduling Service (taskSchedulingService.ts)
 * ============================================================================
 *
 * Detects task-scheduling intent from plain-text chat messages and returns
 * structured task data ready for the task store.
 *
 * Uses simple keyword + regex matching (no AI/NLP dependency).
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TaskIntent {
  /** Whether the message expresses a task/reminder intent */
  isTask: boolean;
  /** Extracted task title (the "what") */
  title?: string;
  /** ISO-8601 due date derived from time expressions */
  dueDate?: string;
  /** Mapped priority: low | normal | high | urgent */
  priority?: string;
}

// ---------------------------------------------------------------------------
// Keyword patterns that signal task intent
// ---------------------------------------------------------------------------

const TASK_TRIGGER_PATTERNS: RegExp[] = [
  /\bremind\s+me\s+to\b/i,
  /\bschedule\s+(a\s+)?task\b/i,
  /\bcreate\s+(a\s+)?task\b/i,
  /\badd\s+(a\s+)?task\b/i,
  /\btodo\s*:\s*/i,
  /\badd\s+to\s+my\s+todo\b/i,
  /\bset\s+(a\s+)?reminder\b/i,
  /\bdon'?t\s+let\s+me\s+forget\s+to\b/i,
  /\bneed\s+to\s+remember\s+to\b/i,
];

// ---------------------------------------------------------------------------
// Time expression parsing
// ---------------------------------------------------------------------------

interface TimeMatch {
  pattern: RegExp;
  /** Returns a Date relative to `now` */
  resolve: (match: RegExpMatchArray, now: Date) => Date;
}

const TIME_MATCHERS: TimeMatch[] = [
  // "tomorrow"
  {
    pattern: /\btomorrow\b/i,
    resolve: (_m, now) => {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  // "next week"
  {
    pattern: /\bnext\s+week\b/i,
    resolve: (_m, now) => {
      const d = new Date(now);
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  // "next month"
  {
    pattern: /\bnext\s+month\b/i,
    resolve: (_m, now) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  // "in N hours/minutes/days"
  {
    pattern: /\bin\s+(\d+)\s+(hour|hr|minute|min|day)s?\b/i,
    resolve: (m, now) => {
      const amount = parseInt(m[1], 10);
      const unit = m[2].toLowerCase();
      const d = new Date(now);
      if (unit.startsWith('hour') || unit.startsWith('hr')) {
        d.setHours(d.getHours() + amount);
      } else if (unit.startsWith('min')) {
        d.setMinutes(d.getMinutes() + amount);
      } else if (unit.startsWith('day')) {
        d.setDate(d.getDate() + amount);
      }
      return d;
    },
  },
  // "by <day-of-week>"  e.g. "by Friday"
  {
    pattern: /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    resolve: (m, now) => {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = dayNames.indexOf(m[1].toLowerCase());
      const d = new Date(now);
      const currentDay = d.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7; // next occurrence
      d.setDate(d.getDate() + diff);
      d.setHours(17, 0, 0, 0); // end of business day
      return d;
    },
  },
  // "tonight" / "this evening"
  {
    pattern: /\b(tonight|this\s+evening)\b/i,
    resolve: (_m, now) => {
      const d = new Date(now);
      d.setHours(20, 0, 0, 0);
      return d;
    },
  },
  // "end of day" / "eod"
  {
    pattern: /\b(end\s+of\s+day|eod)\b/i,
    resolve: (_m, now) => {
      const d = new Date(now);
      d.setHours(17, 0, 0, 0);
      return d;
    },
  },
];

// ---------------------------------------------------------------------------
// Priority detection
// ---------------------------------------------------------------------------

function detectPriority(message: string): string {
  const lower = message.toLowerCase();
  if (/\burgent(ly)?\b/.test(lower) || /\basap\b/.test(lower) || /\bcritical\b/.test(lower)) {
    return 'urgent';
  }
  if (/\bhigh\s+priority\b/.test(lower) || /\bimportant\b/.test(lower)) {
    return 'high';
  }
  if (/\blow\s+priority\b/.test(lower) || /\bwhenever\b/.test(lower) || /\bno\s+rush\b/.test(lower)) {
    return 'low';
  }
  return 'normal';
}

// ---------------------------------------------------------------------------
// Title extraction
// ---------------------------------------------------------------------------

/**
 * Strips the trigger phrase and time expressions from the message to produce
 * a clean task title.
 */
function extractTitle(message: string): string {
  let title = message;

  // Remove trigger phrases
  for (const pattern of TASK_TRIGGER_PATTERNS) {
    title = title.replace(pattern, '');
  }

  // Remove time expressions
  for (const { pattern } of TIME_MATCHERS) {
    title = title.replace(pattern, '');
  }

  // Remove priority keywords
  title = title.replace(/\b(urgent(ly)?|asap|critical|high\s+priority|important|low\s+priority|no\s+rush|whenever)\b/gi, '');

  // Clean up residual punctuation and whitespace
  title = title
    .replace(/^\s*[,\-:;]+\s*/, '')  // leading separators
    .replace(/\s*[,\-:;]+\s*$/, '')  // trailing separators
    .replace(/\s{2,}/g, ' ')         // collapse whitespace
    .trim();

  // Capitalize first letter
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return title || 'Untitled task';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze a chat message and determine if it expresses task-scheduling intent.
 *
 * @param message  Raw user message from chat input
 * @returns        Structured task intent data
 */
export function detectTaskIntent(message: string): TaskIntent {
  // Check if any trigger pattern matches
  const triggered = TASK_TRIGGER_PATTERNS.some((p) => p.test(message));

  if (!triggered) {
    return { isTask: false };
  }

  // Parse due date from time expressions
  const now = new Date();
  let dueDate: string | undefined;

  for (const { pattern, resolve } of TIME_MATCHERS) {
    const match = message.match(pattern);
    if (match) {
      dueDate = resolve(match, now).toISOString();
      break; // use first match
    }
  }

  return {
    isTask: true,
    title: extractTitle(message),
    dueDate,
    priority: detectPriority(message),
  };
}
