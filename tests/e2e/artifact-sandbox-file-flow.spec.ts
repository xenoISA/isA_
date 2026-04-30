import { test, expect } from '@playwright/test';

const buildDevToken = () => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    sub: 'user-356',
    user_id: 'user-356',
    email: 'codex356@example.com',
    name: 'Codex 356',
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  })).toString('base64');

  return `${header}.${payload}.signature`;
};

const toSseBody = (events: Array<Record<string, unknown>>) =>
  `${events.map(event => `data: ${JSON.stringify(event)}\n\n`).join('')}data: [DONE]\n\n`;

test('artifact sandbox preview, backend files, and edit versioning stay in sync', async ({ page }) => {
  const token = buildDevToken();
  const v1DownloadUrl = 'http://localhost:4100/__artifacts/todo-v1.pdf';
  const v2DownloadUrl = 'http://localhost:4100/__artifacts/todo-v2.pdf';
  const chatRequests: any[] = [];
  let chatCallCount = 0;

  await page.addInitScript((value: string) => {
    localStorage.setItem('isa_dev_token', value);
  }, token);

  await page.route('**/api/v1/auth/verify-token', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ valid: true }),
    });
  });

  await page.route('**/api/v1/accounts/ensure', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        auth0_id: 'user-356',
        user_id: 'user-356',
        email: 'codex356@example.com',
        name: 'Codex 356',
        credits: 25,
        credits_total: 25,
        plan: 'free',
      }),
    });
  });

  await page.route('**/api/v1/credits/balance?*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        available_balance: 25,
        total_balance: 25,
      }),
    });
  });

  await page.route('**/__artifacts/*.pdf', async route => {
    const filename = route.request().url().split('/').pop() || 'artifact.pdf';
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      body: '%PDF-1.4 mock artifact',
    });
  });

  await page.route('**/api/v1/agents/chat', async route => {
    chatCallCount += 1;
    chatRequests.push(route.request().postDataJSON());

    if (chatCallCount === 1) {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: toSseBody([
          {
            type: 'text_message_content',
            content: 'Working on the todo component...',
            message_id: 'stream-1',
          },
          {
            type: 'artifact_created',
            artifact: {
              id: 'artifact-356',
              title: 'Todo Component',
              widgetType: 'artifact',
              version: 1,
              type: 'code',
              language: 'tsx',
              filename: 'Todo.tsx',
              content: 'export default function App() { return <main>Todo v1</main>; }',
              generated_files: [
                {
                  id: 'file-v1',
                  filename: 'todo-v1.pdf',
                  type: 'pdf',
                  url: v1DownloadUrl,
                },
              ],
            },
          },
          {
            type: 'text_message_end',
            final_content: 'Initial version ready.',
            message_id: 'stream-1',
          },
        ]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
      body: toSseBody([
        {
          type: 'text_message_content',
          content: 'Applying the requested edit...',
          message_id: 'stream-2',
        },
        {
          type: 'artifact_updated',
          artifact: {
            id: 'artifact-356',
            title: 'Todo Component',
            widgetType: 'artifact',
            version: 2,
            type: 'code',
            language: 'tsx',
            filename: 'Todo.tsx',
            content: 'export default function App() { return <main className="dark">Todo v2 dark mode</main>; }',
            generated_files: [
              {
                id: 'file-v2',
                filename: 'todo-v2.pdf',
                type: 'pdf',
                url: v2DownloadUrl,
              },
            ],
          },
        },
        {
          type: 'text_message_end',
          final_content: 'Updated version ready.',
          message_id: 'stream-2',
        },
      ]),
    });
  });

  const chatInput = page.getByPlaceholder('Type your message...');
  await page.goto('/app');
  await expect(chatInput).toBeVisible({ timeout: 15_000 });

  await chatInput.fill('Create a React todo component and a PDF summary.');
  await chatInput.press('Enter');

  const artifactCard = page.getByRole('button', {
    name: /Open artifact: Todo Component version 1/i,
  });
  await expect(artifactCard).toBeVisible({ timeout: 15_000 });
  await artifactCard.click();

  await expect(page.getByRole('button', { name: /^Preview$/i })).toBeVisible();
  await expect(page.getByTestId('artifact-code-sandbox').first()).toBeVisible();
  await expect(page.getByTestId('artifact-generated-file-file-v1').first()).toBeVisible();

  const firstDownloadPromise = page.waitForEvent('download');
  await page.getByTestId('artifact-generated-file-download-file-v1').first().click();
  const firstDownload = await firstDownloadPromise;
  expect(firstDownload.suggestedFilename()).toBe('todo-v1.pdf');

  await page.getByRole('button', { name: /^Edit$/i }).last().click();
  await page.getByPlaceholder('Describe changes to make...').fill('Add dark mode support.');
  await page.getByRole('button', { name: /^Apply$/i }).click();

  const versionSelect = page.getByTestId('artifact-version-select');
  await expect(versionSelect).toBeVisible({ timeout: 15_000 });
  await expect(versionSelect.locator('option')).toHaveCount(2);
  await page.getByRole('button', { name: /^Preview$/i }).click();
  await expect(page.getByTestId('artifact-generated-file-file-v2').first()).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: /^Code$/i }).click();
  await expect(page.getByRole('code').first()).toContainText('Todo v2 dark mode', { timeout: 15_000 });

  const initialPromptRequests = chatRequests.filter(
    request => request?.message === 'Create a React todo component and a PDF summary.',
  );
  const artifactEditRequests = chatRequests.filter(
    request => typeof request?.message === 'string' && request.message.includes('[Artifact Edit Request]'),
  );

  expect(initialPromptRequests.length).toBeGreaterThan(0);
  expect(artifactEditRequests.length).toBeGreaterThan(0);
  expect(artifactEditRequests[0]?.message).toContain('Add dark mode support.');
});
