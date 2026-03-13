/**
 * ============================================================================
 * Session Export Utility (sessionExport.ts) - Export sessions in multiple formats
 * ============================================================================
 *
 * Core Responsibilities:
 * - Format session data as JSON, CSV, or TXT
 * - Compute session statistics (message counts, duration, response times)
 * - Provide a unified export dispatcher
 *
 * Separation of Concerns:
 * - Responsible for: Data formatting, statistics computation, file naming
 * - Not responsible for: File download triggering (handled by UI), API calls
 */

import type { ChatSession, ChatMessage } from '../types/chatTypes';
import type { SessionExportFormat, SessionStats } from '../types/sessionTypes';

// ================================================================================
// Session Statistics
// ================================================================================

/**
 * Compute statistics for a chat session.
 */
export function computeSessionStats(session: ChatSession): SessionStats {
  const messages = session.messages ?? [];

  const userMessages = messages.filter((m) => m.role === 'user').length;
  const assistantMessages = messages.filter((m) => m.role === 'assistant').length;
  const systemMessages = messages.filter(
    (m) => (m as unknown as { role: string }).role === 'system',
  ).length;

  // Timestamps sorted chronologically
  const timestamps = messages
    .map((m) => new Date(m.timestamp).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);

  const totalDuration =
    timestamps.length >= 2
      ? (timestamps[timestamps.length - 1] - timestamps[0]) / 1000
      : 0;

  // Average response time: mean delay between each user message and the next
  // assistant message.
  let avgResponseTime = 0;
  if (assistantMessages > 0) {
    let totalResponseMs = 0;
    let responsePairs = 0;
    for (let i = 0; i < messages.length - 1; i++) {
      if (messages[i].role === 'user' && messages[i + 1].role === 'assistant') {
        const userTs = new Date(messages[i].timestamp).getTime();
        const assistantTs = new Date(messages[i + 1].timestamp).getTime();
        if (!Number.isNaN(userTs) && !Number.isNaN(assistantTs)) {
          totalResponseMs += assistantTs - userTs;
          responsePairs++;
        }
      }
    }
    avgResponseTime = responsePairs > 0 ? totalResponseMs / responsePairs / 1000 : 0;
  }

  const firstTimestamp = timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : session.timestamp;
  const lastTimestamp =
    timestamps.length > 0
      ? new Date(timestamps[timestamps.length - 1]).toISOString()
      : session.timestamp;

  return {
    total_messages: messages.length,
    user_messages: userMessages,
    assistant_messages: assistantMessages,
    system_messages: systemMessages,
    total_duration: totalDuration,
    avg_response_time: avgResponseTime,
    created_at: firstTimestamp,
    last_activity: lastTimestamp,
  };
}

// ================================================================================
// Helpers
// ================================================================================

/** Extract plain-text content from a ChatMessage (regular or artifact). */
function getContent(message: ChatMessage): string {
  if (message.type === 'regular') {
    return message.content;
  }
  // ArtifactMessage
  return `[Artifact: ${message.artifact.widgetName ?? message.artifact.widgetType}]`;
}

/** Escape a value for CSV (RFC 4180). */
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Capitalize the first letter. */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ================================================================================
// Formatters
// ================================================================================

/**
 * Format a session as a pretty-printed JSON string.
 */
export function formatSessionAsJSON(session: ChatSession): string {
  const stats = computeSessionStats(session);
  const payload = {
    session: {
      id: session.id,
      title: session.title,
      created_at: session.timestamp,
      message_count: session.messageCount,
      metadata: session.metadata ?? {},
    },
    messages: (session.messages ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      content: getContent(m),
      timestamp: m.timestamp,
    })),
    stats,
    exported_at: new Date().toISOString(),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Format a session as CSV with columns: timestamp, role, content.
 */
export function formatSessionAsCSV(session: ChatSession): string {
  const header = 'timestamp,role,content';
  const rows = (session.messages ?? []).map((m) => {
    const ts = csvEscape(m.timestamp);
    const role = csvEscape(m.role);
    const content = csvEscape(getContent(m));
    return `${ts},${role},${content}`;
  });
  return [header, ...rows].join('\n');
}

/**
 * Format a session as human-readable plain text.
 */
export function formatSessionAsTXT(session: ChatSession): string {
  const lines: string[] = [];

  // Header
  const dateStr = session.timestamp.split('T')[0];
  lines.push(`Session: ${session.title}`);
  lines.push(`Date: ${dateStr}`);
  lines.push(`Messages: ${session.messageCount}`);
  lines.push('─'.repeat(60));
  lines.push('');

  // Messages
  for (const m of session.messages ?? []) {
    const time = m.timestamp.split('T')[1]?.replace('Z', '').split('.')[0] ?? '';
    const roleLabel = `[${capitalize(m.role)}]`;
    lines.push(`${roleLabel} (${time})`);
    lines.push(getContent(m));
    lines.push('');
  }

  return lines.join('\n');
}

// ================================================================================
// Dispatcher
// ================================================================================

export interface SessionExportResult {
  format: SessionExportFormat;
  data: string;
  filename: string;
}

/**
 * Export a session in the requested format.
 * Returns the formatted data string, format label, and a suggested filename.
 */
export function exportSession(
  session: ChatSession,
  format: SessionExportFormat = 'json',
): SessionExportResult {
  let data: string;

  switch (format) {
    case 'csv':
      data = formatSessionAsCSV(session);
      break;
    case 'txt':
      data = formatSessionAsTXT(session);
      break;
    case 'json':
    default:
      data = formatSessionAsJSON(session);
      break;
  }

  const filename = `session_${session.id}_${Date.now()}.${format}`;

  return { format, data, filename };
}
