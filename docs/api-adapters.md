# API Adapters — Calendar, Task, Notification

Thin fetch wrappers that bridge the frontend to backend services via the API gateway.

## Pattern

Every adapter follows the same structure:

1. **Gateway URL** — resolved from `NEXT_PUBLIC_GATEWAY_URL` (defaults to `http://localhost:9080`)
2. **Base path** — e.g. `/api/v1/calendar`, `/api/v1/tasks`, `/api/v1/notifications`
3. **`apiFetch<T>()`** — internal generic helper that sets `Content-Type: application/json`, includes credentials, and throws on non-2xx responses
4. **Exported async functions** — one per API operation, fully typed

All adapters send cookies (`credentials: 'include'`) so auth is handled transparently by the gateway.

### Error handling

Every call can throw `Error` with a message like `"Calendar API error: 401"`. Callers should wrap in `try/catch`:

```ts
import { getTodayEvents } from '@/api/adapters/CalendarAdapter';

try {
  const events = await getTodayEvents();
} catch (err) {
  // err.message → "Calendar API error: <status>"
}
```

---

## CalendarAdapter

**Source**: `src/api/adapters/CalendarAdapter.ts`
**Base**: `/api/v1/calendar`

### Types

| Type | Description |
|------|-------------|
| `CalendarEvent` | Event with `id`, `title`, `startTime`, `endTime`, optional `description`, `allDay`, `provider`, `reminders`, `metadata` |
| `CalendarProvider` | Provider info — `id`, `name`, `type` (`'google' \| 'outlook' \| 'apple' \| 'local'`), `connected`, `lastSynced` |

### Functions

| Function | Method | Description |
|----------|--------|-------------|
| `getEvents(start, end)` | GET | Fetch events in an ISO date range |
| `getTodayEvents()` | GET | Convenience — calls `getEvents` for today |
| `createEvent(event)` | POST | Create an event (pass `Omit<CalendarEvent, 'id'>`) |
| `deleteEvent(id)` | DELETE | Delete an event by ID |
| `getProviders()` | GET | List calendar providers and connection status |
| `connectProvider(type)` | POST | Start OAuth flow — returns `{ authUrl }` |
| `disconnectProvider(type)` | POST | Disconnect a provider |
| `syncProvider(type)` | POST | Trigger a manual sync |

### Example

```ts
import { getProviders, connectProvider, getEvents } from '@/api/adapters/CalendarAdapter';

// List connected providers
const providers = await getProviders();

// Connect Google Calendar
const { authUrl } = await connectProvider('google');
window.open(authUrl);

// Fetch this week's events
const events = await getEvents('2026-04-13T00:00:00Z', '2026-04-20T00:00:00Z');
```

---

## TaskAdapter

**Source**: `src/api/adapters/TaskAdapter.ts`
**Base**: `/api/v1/tasks`

### Types

| Type | Description |
|------|-------------|
| `BackendTask` | Task with `id`, `title`, `status` (`'pending' \| 'in_progress' \| 'completed' \| 'failed' \| 'cancelled'`), `priority`, `dueAt`, `completedAt`, `createdAt`, `updatedAt`, `metadata` |
| `TaskCreatePayload` | Required: `title`. Optional: `description`, `priority`, `dueAt`, `metadata` |
| `TaskUpdatePayload` | All fields optional — partial update |

### Functions

| Function | Method | Description |
|----------|--------|-------------|
| `getTasks(params?)` | GET | List tasks, optionally filter by `status` and `limit` |
| `getTask(id)` | GET | Fetch a single task |
| `createTask(payload)` | POST | Create a task |
| `updateTask(id, payload)` | PATCH | Partial update |
| `deleteTask(id)` | DELETE | Delete a task |
| `completeTask(id)` | PATCH | Convenience — sets `status: 'completed'` and `completedAt` |

### Example

```ts
import { createTask, completeTask, getTasks } from '@/api/adapters/TaskAdapter';

const task = await createTask({ title: 'Review PR #42', priority: 'high', dueAt: '2026-04-17T17:00:00Z' });
await completeTask(task.id);

// List pending tasks
const pending = await getTasks({ status: 'pending', limit: 20 });
```

---

## NotificationAdapter

**Source**: `src/api/adapters/NotificationAdapter.ts`
**Base**: `/api/v1/notifications`

### Types

| Type | Description |
|------|-------------|
| `Notification` | Notification with `id`, `type` (info/success/warning/error/task/calendar/channel), `priority`, `title`, `body`, `read`, `dismissed`, `route`, `metadata`, `createdAt`, `readAt` |
| `NotificationSendRequest` | Required: `type`, `title`, `body`. Optional: `priority`, `route`, `metadata`, `targetUserId` |
| `NotificationPreferences` | `enabled`, `channels` (`push`, `email`, `inApp`), optional `quietHours` with `start`/`end` (HH:mm) |

### Functions

| Function | Method | Description |
|----------|--------|-------------|
| `getNotifications(params?)` | GET | List notifications, optionally `unreadOnly` and `limit` |
| `getUnreadCount()` | GET | Returns unread notification count |
| `markAsRead(id)` | POST | Mark one notification as read |
| `markAllAsRead()` | POST | Mark all as read |
| `dismiss(id)` | POST | Dismiss a notification |
| `send(request)` | POST | Send a notification |
| `subscribePush(subscription)` | POST | Register a `PushSubscriptionJSON` for web push |
| `unsubscribePush()` | POST | Unregister push |
| `getPreferences()` | GET | Get notification preferences |
| `updatePreferences(prefs)` | PATCH | Partial update of preferences |

### Example

```ts
import { getNotifications, markAsRead, send } from '@/api/adapters/NotificationAdapter';

// Fetch unread
const unread = await getNotifications({ unreadOnly: true });
await markAsRead(unread[0].id);

// Send a notification
await send({ type: 'info', title: 'Deploy complete', body: 'v2.3.1 is live.' });
```

---

## Adding a new adapter

1. Create `src/api/adapters/FooAdapter.ts`
2. Define `GATEWAY` and `BASE` the same way (use `NEXT_PUBLIC_GATEWAY_URL`)
3. Copy the `apiFetch<T>()` helper (or extract it to a shared module when the pattern stabilizes)
4. Export one async function per endpoint, fully typed with input/output interfaces
5. Add documentation to this file following the same format
