import { test, expect } from '@playwright/test';

const UPLOAD_PATH = '/tmp/isA_347_knowledge_ui/package.json';
const AUTH_BASE = 'http://127.0.0.1:8201/api/v1/auth';

test('project settings and chat request carry project context', async ({ page, request }) => {
  const projectName = `Codex Project ${Date.now()}`;
  const instructions = 'Answer with concise TypeScript guidance.';
  const chatPrompt = 'Confirm the active project context.';
  const password = 'TestPass123!';
  const email = `codex347verify+${Date.now()}@example.com`;

  const registerResponse = await request.post(`${AUTH_BASE}/register`, {
    data: {
      email,
      password,
      name: 'Codex Verify',
    },
  });
  expect(registerResponse.ok()).toBeTruthy();
  const registerPayload = await registerResponse.json();

  const pendingResponse = await request.get(
    `${AUTH_BASE}/dev/pending-registration/${registerPayload.pending_registration_id}`,
  );
  expect(pendingResponse.ok()).toBeTruthy();
  const pendingPayload = await pendingResponse.json();

  const verifyResponse = await request.post(`${AUTH_BASE}/verify`, {
    data: {
      pending_registration_id: registerPayload.pending_registration_id,
      code: pendingPayload.verification_code,
    },
  });
  expect(verifyResponse.ok()).toBeTruthy();
  const verifyPayload = await verifyResponse.json();
  expect(verifyPayload.success).toBeTruthy();
  expect(verifyPayload.access_token).toBeTruthy();

  await page.addInitScript((token: string) => {
    localStorage.setItem('isa_dev_token', token);
  }, verifyPayload.access_token);

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

  await page.goto('/app');
  await page.waitForLoadState('networkidle');

  const projectTrigger = page.getByRole('button', { name: /All Conversations/i }).first();
  await expect(projectTrigger).toBeVisible({ timeout: 15_000 });

  await projectTrigger.click();
  await page.getByRole('button', { name: /New Project/i }).click();
  await page.getByPlaceholder('Project name').fill(projectName);
  await page.getByRole('button', { name: /^Create$/i }).click();
  await expect(
    page.getByRole('button', { name: new RegExp(projectName, 'i') }).first(),
  ).toBeVisible({ timeout: 15_000 });

  await page.keyboard.press('Control+,');
  await expect(page.getByRole('heading', { name: /^Settings$/i })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole('button', { name: /^Project$/i }).click();
  await expect(
    page.getByRole('heading', { name: new RegExp(`${projectName}.*Instructions`, 'i') }),
  ).toBeVisible({ timeout: 10_000 });

  const instructionsInput = page.getByPlaceholder(/Always use TypeScript/i);
  await instructionsInput.fill(instructions);
  await page.getByRole('button', { name: /^Save$/i }).click();
  await expect(page.getByText(/Project instructions saved/i)).toBeVisible({
    timeout: 10_000,
  });

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(UPLOAD_PATH);
  await expect(page.getByText(/Knowledge file uploaded/i)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('package.json')).toBeVisible({ timeout: 15_000 });

  await page.locator('.fixed.inset-0.z-50 button.absolute.top-4.right-4').click();
  await expect(page.getByRole('heading', { name: /^Settings$/i })).toHaveCount(0);

  const requestPromise = page.waitForRequest(request => {
    return (
      request.method() === 'POST'
      && (
        request.url().includes('/v1/chat')
        || request.url().includes('/agents/chat')
      )
    );
  });

  const chatInput = page.getByPlaceholder('Type your message...');
  await chatInput.fill(chatPrompt);
  await chatInput.press('Enter');

  const chatRequest = await requestPromise;
  const payload = chatRequest.postDataJSON() as {
    message?: string;
    prompt?: string;
    prompt_args?: {
      project_context?: {
        project_id?: string;
        project_name?: string;
        custom_instructions?: string;
        knowledge_file_ids?: string[];
        knowledge_files?: Array<{ filename?: string }>;
      };
    };
  };

  expect(payload.prompt ?? payload.message).toBe(chatPrompt);
  expect(payload.prompt_args?.project_context?.project_name).toBe(projectName);
  expect(payload.prompt_args?.project_context?.custom_instructions).toBe(instructions);
  expect(
    payload.prompt_args?.project_context?.knowledge_file_ids?.length ?? 0,
  ).toBeGreaterThan(0);
  expect(
    payload.prompt_args?.project_context?.knowledge_files?.some(
      file => file.filename === 'package.json',
    ),
  ).toBeTruthy();

  await page.keyboard.press('Control+,');
  await page.getByRole('button', { name: /^Project$/i }).click();
  await page.getByRole('button', { name: /^Remove$/i }).click();
  await expect(page.getByText(/Knowledge file removed/i)).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText('package.json')).toHaveCount(0);
});
