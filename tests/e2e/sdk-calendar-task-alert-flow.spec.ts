import { expect, test, type Page, type Route } from '@playwright/test';

type GatewayUser = {
  id: string;
  email: string;
  name: string;
};

type BackendTask = {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dueAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
};

type BackendNotification = {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'task' | 'calendar' | 'channel';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  body: string;
  read: boolean;
  dismissed: boolean;
  route?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
};

type BackendCalendarEvent = {
  event_id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  reminders?: number[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
};

type GatewayState = {
  user: GatewayUser;
  tasks: BackendTask[];
  notifications: BackendNotification[];
  events: BackendCalendarEvent[];
  providers: Array<{ id: string; name: string; type: string; connected: boolean; lastSynced?: string }>;
  sessions: Array<{ session_id: string; user_id: string; created_at: string; updated_at: string; metadata?: Record<string, unknown> }>;
  lastChatRequestUrl: string | null;
  requestLog: string[];
};

function base64Encode(value: string): string {
  return Buffer.from(value).toString('base64');
}

function makeDevJwt(user: GatewayUser): string {
  const header = base64Encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Encode(
    JSON.stringify({
      sub: user.id,
      user_id: user.id,
      email: user.email,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    }),
  );

  return `${header}.${payload}.signature`;
}

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function fulfillSse(route: Route, events: unknown[]): Promise<void> {
  const chunks = events.map((event) => `data: ${JSON.stringify(event)}`);
  chunks.push('event: done');

  await route.fulfill({
    status: 200,
    contentType: 'text/event-stream',
    body: `${chunks.join('\n\n')}\n\n`,
  });
}

function parseJsonBody(route: Route): Record<string, unknown> {
  return (route.request().postDataJSON?.() as Record<string, unknown>) ?? {};
}

function createCalendarEvent(
  userId: string,
  overrides: Partial<BackendCalendarEvent> = {},
): BackendCalendarEvent {
  const now = new Date();
  const start = new Date(now.getTime() + 30_000);
  const end = new Date(now.getTime() + 30 * 60_000);

  return {
    event_id: `evt-${Math.random().toString(36).slice(2, 10)}`,
    user_id: userId,
    title: 'Launch window',
    description: 'Remember the launch window.',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    all_day: false,
    reminders: [1],
    metadata: { source: 'seed' },
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    ...overrides,
  };
}

function createNotification(
  input: Partial<BackendNotification> & Pick<BackendNotification, 'type' | 'title' | 'body'>,
): BackendNotification {
  return {
    id: `notif-${Math.random().toString(36).slice(2, 10)}`,
    priority: 'normal',
    read: false,
    dismissed: false,
    createdAt: new Date().toISOString(),
    ...input,
  };
}

function createTask(input: Partial<BackendTask> & Pick<BackendTask, 'id' | 'title'>): BackendTask {
  const now = new Date().toISOString();

  return {
    id: input.id,
    title: input.title,
    status: 'pending',
    priority: 'normal',
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

function filterEventsForRange(
  events: BackendCalendarEvent[],
  startDate: string | null,
  endDate: string | null,
): BackendCalendarEvent[] {
  const startMs = startDate ? new Date(startDate).getTime() : Number.NEGATIVE_INFINITY;
  const endMs = endDate ? new Date(endDate).getTime() : Number.POSITIVE_INFINITY;

  return events.filter((event) => {
    const eventStart = new Date(event.start_time).getTime();
    return eventStart >= startMs && eventStart <= endMs;
  });
}

async function handleGatewayRoute(route: Route, state: GatewayState, devJwt: string): Promise<void> {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname;
  const method = request.method();
  state.requestLog.push(`${method} ${path}${url.search}`);

  if (path === '/mate/health') {
    await fulfillJson(route, {
      status: 'ok',
      service: 'isa-mate',
      initialized: true,
      channels: ['chat'],
    });
    return;
  }

  if (path === '/mate/v1/observability/metrics' && method === 'GET') {
    await fulfillJson(route, {
      nodes_executed: 0,
      tool_calls: 0,
      model_calls: 0,
      tokens_used: { input: 0, output: 0 },
      cost_usd: 0,
      window_start: null,
      window_end: null,
    });
    return;
  }

  if (path === '/mate/v1/observability/audit' && method === 'GET') {
    await fulfillJson(route, {
      entries: [],
      total: 0,
      next_cursor: null,
    });
    return;
  }

  if (path === '/api/v1/auth/verify-token' && method === 'POST') {
    await fulfillJson(route, {
      user_id: state.user.id,
      user: {
        sub: state.user.id,
        email: state.user.email,
        name: state.user.name,
      },
    });
    return;
  }

  if (path === '/api/v1/auth/refresh' && method === 'POST') {
    await fulfillJson(route, {
      access_token: devJwt,
      user_id: state.user.id,
      user: {
        sub: state.user.id,
        email: state.user.email,
        name: state.user.name,
      },
    });
    return;
  }

  if (path === '/api/v1/accounts/ensure' && method === 'POST') {
    await fulfillJson(route, {
      id: state.user.id,
      user_id: state.user.id,
      auth0_id: state.user.id,
      email: state.user.email,
      name: state.user.name,
      credits: 25,
      credits_total: 25,
      plan: 'free',
    });
    return;
  }

  if (path === '/api/v1/users/me' && method === 'GET') {
    await fulfillJson(route, {
      id: state.user.id,
      user_id: state.user.id,
      auth0_id: state.user.id,
      email: state.user.email,
      name: state.user.name,
      credits: 25,
      credits_total: 25,
      plan: 'free',
    });
    return;
  }

  if (path === '/api/v1/credits/balance' && method === 'GET') {
    await fulfillJson(route, {
      available_balance: 25,
      total_balance: 25,
    });
    return;
  }

  if (path.startsWith('/api/v1/users/') && path.endsWith('/subscription') && method === 'GET') {
    await fulfillJson(route, { detail: 'No subscription' }, 404);
    return;
  }

  if (path === '/api/v1/projects' && method === 'GET') {
    await fulfillJson(route, { projects: [], total: 0 });
    return;
  }

  if (path === '/api/v1/notifications/unread-count' && method === 'GET') {
    await fulfillJson(route, {
      count: state.notifications.filter((notification) => !notification.read).length,
    });
    return;
  }

  if (path === '/api/v1/notifications' && method === 'GET') {
    await fulfillJson(route, state.notifications.filter((notification) => !notification.dismissed));
    return;
  }

  if (path === '/api/v1/notifications' && method === 'POST') {
    const body = parseJsonBody(route);
    const notification = createNotification({
      type: (body.type as BackendNotification['type']) ?? 'info',
      title: String(body.title ?? 'Notification'),
      body: String(body.body ?? ''),
      route: typeof body.route === 'string' ? body.route : undefined,
      metadata: typeof body.metadata === 'object' ? (body.metadata as Record<string, unknown>) : undefined,
    });
    state.notifications.unshift(notification);
    await fulfillJson(route, notification);
    return;
  }

  if (path === '/api/v1/notifications/read-all' && method === 'POST') {
    const readAt = new Date().toISOString();
    state.notifications = state.notifications.map((notification) => ({
      ...notification,
      read: true,
      readAt: notification.readAt ?? readAt,
    }));
    await fulfillJson(route, { ok: true });
    return;
  }

  if (path.match(/^\/api\/v1\/notifications\/[^/]+\/read$/) && method === 'POST') {
    const id = path.split('/')[4];
    const readAt = new Date().toISOString();
    state.notifications = state.notifications.map((notification) =>
      notification.id === id
        ? { ...notification, read: true, readAt: notification.readAt ?? readAt }
        : notification,
    );
    await fulfillJson(route, { ok: true });
    return;
  }

  if (path.match(/^\/api\/v1\/notifications\/[^/]+\/dismiss$/) && method === 'POST') {
    const id = path.split('/')[4];
    state.notifications = state.notifications.filter((notification) => notification.id !== id);
    await fulfillJson(route, { ok: true });
    return;
  }

  if (path === '/api/v1/tasks' && method === 'GET') {
    await fulfillJson(route, state.tasks);
    return;
  }

  if (path === '/api/v1/tasks' && method === 'POST') {
    const body = parseJsonBody(route);
    const task = createTask({
      id: `task-${Math.random().toString(36).slice(2, 10)}`,
      title: String(body.title ?? 'Untitled task'),
      description: typeof body.description === 'string' ? body.description : undefined,
      priority: (body.priority as BackendTask['priority']) ?? 'normal',
      dueAt: typeof body.dueAt === 'string' ? body.dueAt : undefined,
      metadata: typeof body.metadata === 'object' ? (body.metadata as Record<string, unknown>) : undefined,
    });
    state.tasks.unshift(task);
    await fulfillJson(route, task);
    return;
  }

  if (path.match(/^\/api\/v1\/tasks\/[^/]+$/) && method === 'PATCH') {
    const taskId = path.split('/')[4];
    const body = parseJsonBody(route);
    state.tasks = state.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            ...body,
            updatedAt: new Date().toISOString(),
            completedAt:
              body.status === 'completed'
                ? String(body.completedAt ?? new Date().toISOString())
                : task.completedAt,
          }
        : task,
    );
    await fulfillJson(route, state.tasks.find((task) => task.id === taskId));
    return;
  }

  if (path.match(/^\/api\/v1\/tasks\/[^/]+$/) && method === 'DELETE') {
    const taskId = path.split('/')[4];
    state.tasks = state.tasks.filter((task) => task.id !== taskId);
    await fulfillJson(route, { ok: true });
    return;
  }

  if (path === '/api/v1/calendar/events' && method === 'GET') {
    state.events = state.events.map((event) => {
      if (event.event_id !== 'evt-seeded-reminder') {
        return event;
      }

      return {
        ...event,
        start_time: new Date(Date.now() + 30_000).toISOString(),
        end_time: new Date(Date.now() + 30 * 60_000).toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    const events = filterEventsForRange(
      state.events,
      url.searchParams.get('start_date'),
      url.searchParams.get('end_date'),
    );
    await fulfillJson(route, {
      events,
      total: events.length,
      page: 1,
      page_size: 100,
    });
    return;
  }

  if (path === '/api/v1/calendar/events' && method === 'POST') {
    const body = parseJsonBody(route);
    const event = createCalendarEvent(state.user.id, {
      event_id: `evt-${Math.random().toString(36).slice(2, 10)}`,
      title: String(body.title ?? 'Untitled event'),
      description: typeof body.description === 'string' ? body.description : undefined,
      start_time: String(body.start_time ?? new Date().toISOString()),
      end_time: String(body.end_time ?? new Date(Date.now() + 60 * 60_000).toISOString()),
      all_day: Boolean(body.all_day),
      reminders: Array.isArray(body.reminders) ? (body.reminders as number[]) : [],
      metadata: typeof body.metadata === 'object' ? (body.metadata as Record<string, unknown>) : undefined,
    });
    state.events.push(event);
    await fulfillJson(route, event);
    return;
  }

  if (path.match(/^\/api\/v1\/calendar\/events\/[^/]+$/) && method === 'PUT') {
    const eventId = path.split('/')[5];
    const body = parseJsonBody(route);
    state.events = state.events.map((event) =>
      event.event_id === eventId
        ? {
            ...event,
            title: typeof body.title === 'string' ? body.title : event.title,
            description:
              typeof body.description === 'string' ? body.description : event.description,
            start_time: typeof body.start_time === 'string' ? body.start_time : event.start_time,
            end_time: typeof body.end_time === 'string' ? body.end_time : event.end_time,
            all_day:
              typeof body.all_day === 'boolean' ? body.all_day : event.all_day,
            reminders: Array.isArray(body.reminders) ? (body.reminders as number[]) : event.reminders,
            updated_at: new Date().toISOString(),
          }
        : event,
    );
    await fulfillJson(route, state.events.find((event) => event.event_id === eventId));
    return;
  }

  if (path.match(/^\/api\/v1\/calendar\/events\/[^/]+$/) && method === 'DELETE') {
    const eventId = path.split('/')[5];
    state.events = state.events.filter((event) => event.event_id !== eventId);
    await fulfillJson(route, { success: true, message: 'deleted' });
    return;
  }

  if (path === '/api/v1/calendar/providers' && method === 'GET') {
    await fulfillJson(route, state.providers);
    return;
  }

  if (path.match(/^\/api\/v1\/calendar\/providers\/[^/]+\/connect$/) && method === 'POST') {
    const type = path.split('/')[5];
    await fulfillJson(route, { authUrl: `https://example.com/oauth/${type}` });
    return;
  }

  if (path.match(/^\/api\/v1\/calendar\/providers\/[^/]+\/disconnect$/) && method === 'POST') {
    const type = path.split('/')[5];
    state.providers = state.providers.map((provider) =>
      provider.type === type ? { ...provider, connected: false } : provider,
    );
    await fulfillJson(route, { ok: true });
    return;
  }

  if (path.match(/^\/api\/v1\/calendar\/providers\/[^/]+\/sync$/) && method === 'POST') {
    const type = path.split('/')[5];
    state.providers = state.providers.map((provider) =>
      provider.type === type
        ? { ...provider, connected: true, lastSynced: new Date().toISOString() }
        : provider,
    );
    await fulfillJson(route, { ok: true });
    return;
  }

  if (path === '/api/v1/sessions' && method === 'GET') {
    await fulfillJson(route, {
      sessions: state.sessions,
      total: state.sessions.length,
      page: 1,
      page_size: 20,
    });
    return;
  }

  if (path === '/api/v1/sessions' && method === 'POST') {
    const body = parseJsonBody(route);
    const createdAt = new Date().toISOString();
    const session = {
      session_id: `session-${Math.random().toString(36).slice(2, 10)}`,
      user_id: String(body.user_id ?? state.user.id),
      created_at: createdAt,
      updated_at: createdAt,
      metadata: typeof body.metadata === 'object' ? (body.metadata as Record<string, unknown>) : {},
    };
    state.sessions.unshift(session);
    await fulfillJson(route, session);
    return;
  }

  if (path === '/mate/v1/chat' && method === 'POST') {
    state.lastChatRequestUrl = request.url();

    const mateTask = createTask({
      id: 'task-mate-1',
      title: 'Follow up with finance',
      description: 'Created from Mate chat',
      dueAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
      metadata: { source: 'mate' },
    });
    if (!state.tasks.some((task) => task.id === mateTask.id)) {
      state.tasks.unshift(mateTask);
    }

    const mateEvent = createCalendarEvent(state.user.id, {
      event_id: 'evt-mate-1',
      title: 'Customer demo',
      description: 'Scheduled from Mate chat',
      start_time: new Date(Date.now() + 48 * 60 * 60_000).toISOString(),
      end_time: new Date(Date.now() + 49 * 60 * 60_000).toISOString(),
      reminders: [],
      metadata: { source: 'mate' },
    });
    if (!state.events.some((event) => event.event_id === mateEvent.event_id)) {
      state.events.push(mateEvent);
    }

    await fulfillSse(route, [
      {
        type: 'task_created',
        task_id: mateTask.id,
        title: mateTask.title,
        description: mateTask.description,
        due_at: mateTask.dueAt,
      },
      {
        type: 'schedule_created',
        job_id: 'job-355',
        name: 'Daily digest',
        cron_expression: '0 9 * * *',
        next_run_at: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
        description: 'Calendar schedule created from Mate chat',
      },
    ]);
    return;
  }

  if (path === '/api/v1/agents/chat' && method === 'POST') {
    state.lastChatRequestUrl = request.url();
    await fulfillSse(route, []);
    return;
  }

  if (
    path.startsWith('/api/v1/organization')
    || path.startsWith('/api/v1/authorization')
    || path.startsWith('/api/v1/accounts/me')
    || path.startsWith('/api/v1/contexts')
  ) {
    await fulfillJson(route, {
      success: true,
      data: [],
    });
    return;
  }

  await fulfillJson(route, {
    success: true,
    data: {},
  });
}

async function installGatewayMocks(page: Page): Promise<GatewayState> {
  const user: GatewayUser = {
    id: 'usr_355_e2e',
    email: 'codex355@example.com',
    name: 'Codex 355',
  };
  const devJwt = makeDevJwt(user);
  const state: GatewayState = {
    user,
    tasks: [],
    notifications: [],
    events: [
      createCalendarEvent(user.id, {
        event_id: 'evt-seeded-reminder',
      }),
    ],
    providers: [],
    sessions: [],
    lastChatRequestUrl: null,
    requestLog: [],
  };

  await page.addInitScript((token: string) => {
    localStorage.setItem('isa_dev_token', token);
  }, devJwt);

  for (const origin of ['http://localhost:9080', 'http://127.0.0.1:9080']) {
    await page.route(`${origin}/**`, async (route) => {
      await handleGatewayRoute(route, state, devJwt);
    });
  }

  return state;
}

test('SDK calendar, task, alert, and Mate workflows stay wired through the app', async ({ page }) => {
  test.slow();
  const state = await installGatewayMocks(page);

  await page.goto('/app');
  await expect(page.getByPlaceholder('Type your message...')).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(() => state.requestLog.some((entry) => entry.startsWith('GET /api/v1/calendar/events?')))
    .toBe(true);

  await page.getByRole('button', { name: /^Calendar$/i }).click();
  const calendarPanel = page.locator('div.absolute.right-0.top-full.mt-2.w-96').first();
  await expect(page.getByText('Launch window').first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /Quick Event/i }).click();
  await page.getByPlaceholder('Event title').fill('Quarterly planning');
  await page.getByRole('button', { name: /Create Event/i }).click();
  await expect
    .poll(() => state.events.some((event) => event.title === 'Quarterly planning'))
    .toBe(true);
  await expect(page.getByText('Quarterly planning').first()).toBeVisible({ timeout: 15_000 });

  await calendarPanel.getByRole('button', { name: 'Edit' }).last().click();
  await calendarPanel.locator('input[type="text"]').last().fill('Quarterly planning review');
  await calendarPanel.getByRole('button', { name: 'Save' }).click();
  await expect
    .poll(() => state.events.some((event) => event.title === 'Quarterly planning review'))
    .toBe(true);
  await expect(page.getByText('Quarterly planning review').first()).toBeVisible({ timeout: 15_000 });

  await page.reload();
  await expect(page.getByPlaceholder('Type your message...')).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: /^Calendar$/i }).click();
  await expect(page.getByText('Quarterly planning review').first()).toBeVisible({ timeout: 15_000 });
  const refreshedCalendarPanel = page.locator('div.absolute.right-0.top-full.mt-2.w-96').first();
  await refreshedCalendarPanel.getByRole('button', { name: 'Delete' }).last().click();
  await expect
    .poll(() => state.events.some((event) => event.title === 'Quarterly planning review'))
    .toBe(false);
  await expect(page.getByText('Quarterly planning review')).toHaveCount(0);

  await page.getByRole('button', { name: /^Tasks$/i }).click();
  const taskPanel = page.locator('div.absolute.right-0.top-full.mt-2.w-80').first();
  await taskPanel.getByPlaceholder('Add a new task...').fill('Ship patch release');
  await taskPanel.getByRole('button', { name: /^Add$/i }).click();
  await expect
    .poll(() => state.tasks.some((task) => task.title === 'Ship patch release'))
    .toBe(true);
  await taskPanel.locator('button.w-5.h-5').first().click();
  await expect
    .poll(() => state.tasks.some((task) => task.title === 'Ship patch release' && task.status === 'completed'))
    .toBe(true);
  await expect
    .poll(() => state.notifications.some((notification) => notification.body === 'Ship patch release'))
    .toBe(true);

  await page.reload();
  await expect(page.getByPlaceholder('Type your message...')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /^Tasks$/i }).click();
  const refreshedTaskPanel = page.locator('div.absolute.right-0.top-full.mt-2.w-80').first();
  await expect(refreshedTaskPanel.getByText('0 pending, 1 completed').first()).toBeVisible({ timeout: 15_000 });
  await expect(refreshedTaskPanel.getByText('Ship patch release').first()).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: /Alerts/i }).click();
  await expect(page.getByText('Ship patch release').first()).toBeVisible();
  await page.getByRole('button', { name: /Alerts/i }).click();

  const chatRequestPromise = page.waitForRequest((request) => {
    return request.method() === 'POST'
      && (request.url().includes('/mate/v1/chat') || request.url().includes('/api/v1/agents/chat'));
  });

  await page.getByPlaceholder('Type your message...').fill('Plan tomorrow and schedule the follow-up.');
  await page.getByPlaceholder('Type your message...').press('Enter');

  const chatRequest = await chatRequestPromise;
  if (process.env.NEXT_PUBLIC_CHAT_BACKEND === 'mate') {
    expect(chatRequest.url()).toContain('/mate/v1/chat');
  }

  await expect
    .poll(() => state.tasks.some((task) => task.id === 'task-mate-1'))
    .toBe(true);
  await expect(page.getByText('Schedule created').first()).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: /^Tasks$/i }).click();
  const mateTaskPanel = page.locator('div.absolute.right-0.top-full.mt-2.w-80').first();
  await expect(mateTaskPanel.getByText('Follow up with finance').first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /^Calendar$/i }).click();
  const mateCalendarPanel = page.locator('div.absolute.right-0.top-full.mt-2.w-96').first();
  await expect(mateCalendarPanel.getByText('Customer demo').first()).toBeVisible({ timeout: 15_000 });

  expect(state.lastChatRequestUrl).toBeTruthy();
});
