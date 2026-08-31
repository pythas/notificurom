import { test, expect } from '@playwright/test';
import Database from 'better-sqlite3';
import path from 'path';

test.describe('Notificurom Kanban Board', () => {
  test.beforeEach(async ({ request }) => {
    // Clean up existing tasks to make each test deterministic
    const res = await request.get('/api/tasks');
    if (res.ok()) {
      const data = await res.json();
      for (const t of data.tasks || []) {
        await request.delete(`/api/tasks/${t.id}`);
      }
    }

    // Seed test tasks in Inbox
    await request.post('/api/tasks', {
      data: {
        title: 'Task Alpha',
        sourceType: 'task',
        status: 'inbox',
        sortOrder: 0,
      },
    });

    await request.post('/api/tasks', {
      data: {
        title: 'Task Beta',
        sourceType: 'pr',
        repository: 'owner/repo',
        status: 'inbox',
        sortOrder: 1,
      },
    });
  });

  test('Story 2: loads cleanly with zero console or hydration errors', async ({ page }) => {
    const consoleIssues: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (
        msg.type() === 'error' ||
        text.includes('Hydration failed') ||
        text.includes('did not match')
      ) {
        consoleIssues.push(text);
      }
    });

    await page.goto('/');
    await expect(page.getByText('Notificurom')).toBeVisible();
    await expect(page.getByText('Task Alpha')).toBeVisible();
    await expect(page.getByText('Task Beta')).toBeVisible();

    // Verify age badge renders client text cleanly without errors
    await expect(page.getByText(/Age (just now|\d+[mhd])/).first()).toBeVisible();

    expect(consoleIssues).toEqual([]);
  });

  test('Story 1: move card using chevron action button persists across reload', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Task Alpha')).toBeVisible();

    // Locate Task Alpha card specifically
    const alphaCard = page.locator('[data-testid="task-card"]', { hasText: 'Task Alpha' });
    await alphaCard.hover();

    // Click "Move forward" on Task Alpha
    const moveForwardBtn = alphaCard.getByTitle('Move forward to next');
    await moveForwardBtn.click();

    // Verify Task Alpha moved to Next Actions column
    const nextCol = page.locator('[data-testid="column-next"]');
    await expect(nextCol.getByText('Task Alpha')).toBeVisible();

    // Hard reload the page
    await page.reload();

    // Assert persistence in SQLite backend
    const nextColAfterReload = page.locator('[data-testid="column-next"]');
    await expect(nextColAfterReload.getByText('Task Alpha')).toBeVisible();

    const inboxColAfterReload = page.locator('[data-testid="column-inbox"]');
    await expect(inboxColAfterReload.getByText('Task Alpha')).not.toBeVisible();
  });

  test('Story 1: drag and drop card between columns persists across reload', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Task Alpha')).toBeVisible();

    const alphaCard = page.locator('[data-testid="task-card"]', { hasText: 'Task Alpha' });
    const dragHandle = alphaCard.getByTitle('Drag to reorder or move column');
    const inProgressColumn = page.locator('[data-testid="column-in_progress"]');

    // Perform smooth drag and drop from handle to target column
    const handleBox = await dragHandle.boundingBox();
    const targetBox = await inProgressColumn.boundingBox();

    expect(handleBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    if (handleBox && targetBox) {
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        targetBox.x + targetBox.width / 2,
        targetBox.y + targetBox.height / 2,
        { steps: 15 }
      );
      await page.mouse.up();
    }

    // Verify Task Alpha is now in In Progress column
    await expect(inProgressColumn.getByText('Task Alpha')).toBeVisible();

    // Reload the page to test database persistence
    await page.reload();

    const inProgressColAfterReload = page.locator('[data-testid="column-in_progress"]');
    await expect(inProgressColAfterReload.getByText('Task Alpha')).toBeVisible();

    const inboxColAfterReload = page.locator('[data-testid="column-inbox"]');
    await expect(inboxColAfterReload.getByText('Task Alpha')).not.toBeVisible();
  });

  test('Story 1: create new task via modal and verify persistence', async ({ page }) => {
    await page.goto('/');

    // Click "New Task"
    await page.getByRole('button', { name: 'New Task' }).click();

    // Fill modal form
    await page.getByPlaceholder('What needs to be done?').fill('Task Gamma Manual');
    await page.getByPlaceholder('e.g. backend/auth').fill('frontend/core');
    await page.getByRole('button', { name: 'Create Item' }).click();

    // Verify Task Gamma is in Inbox
    const inboxCol = page.locator('[data-testid="column-inbox"]');
    await expect(inboxCol.getByText('Task Gamma Manual')).toBeVisible();

    // Reload and assert persistence
    await page.reload();
    const inboxAfterReload = page.locator('[data-testid="column-inbox"]');
    await expect(inboxAfterReload.getByText('Task Gamma Manual')).toBeVisible();
  });

  test('Story 1: delete task and verify removal', async ({ page }) => {
    await page.goto('/');
    const alphaCard = page.locator('[data-testid="task-card"]', { hasText: 'Task Alpha' });
    await alphaCard.hover();

    const deleteBtn = alphaCard.getByTitle('Remove from board');
    await deleteBtn.click();

    await expect(page.getByText('Task Alpha')).not.toBeVisible();

    await page.reload();
    await expect(page.getByText('Task Alpha')).not.toBeVisible();
    await expect(page.getByText('Task Beta')).toBeVisible();
  });

  test('Story 1 & UI: search and filter tasks', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Task Alpha')).toBeVisible();
    await expect(page.getByText('Task Beta')).toBeVisible();

    // Search for Alpha
    const searchInput = page.getByPlaceholder(/Filter tasks/);
    await searchInput.fill('Alpha');

    await expect(page.getByText('Task Alpha')).toBeVisible();
    await expect(page.getByText('Task Beta')).not.toBeVisible();

    // Clear search
    await searchInput.fill('');
    await expect(page.getByText('Task Beta')).toBeVisible();

    // Filter by PRs only
    const sourceSelect = page.locator('select');
    await sourceSelect.selectOption('github_pr');
    await expect(page.getByText('Task Beta')).toBeVisible();
    await expect(page.getByText('Task Alpha')).not.toBeVisible();
  });

  test('GitHub App OAuth API endpoints & status workflow', async ({ request }) => {
    // 1. Reset OAuth settings
    await request.post('/api/auth/github/disconnect');
    await request.post('/api/settings', {
      data: {
        githubClientId: '',
        githubClientSecret: '',
      },
    });

    // 2. Initial status: not configured, not connected
    const statusRes = await request.get('/api/auth/github/status');
    expect(statusRes.ok()).toBeTruthy();
    const statusData = await statusRes.json();
    expect(statusData).toEqual({
      isConfigured: false,
      isConnected: false,
      user: null,
    });

    // 3. Configure Client ID & Secret
    const saveSettingsRes = await request.post('/api/settings', {
      data: {
        githubClientId: 'test_client_id_123',
        githubClientSecret: 'test_client_secret_456',
        githubQueries: ['is:open is:pr assignee:@me'],
        autoArchiveClosed: true,
        syncIntervalMinutes: 20,
      },
    });
    expect(saveSettingsRes.ok()).toBeTruthy();

    // 4. Status is now configured
    const statusAfterConfig = await (await request.get('/api/auth/github/status')).json();
    expect(statusAfterConfig.isConfigured).toBe(true);
    expect(statusAfterConfig.isConnected).toBe(false);

    // 5. GET /api/auth/github/login returns redirect to GitHub OAuth
    const loginRes = await request.get('/api/auth/github/login', {
      maxRedirects: 0,
    });
    expect([302, 307]).toContain(loginRes.status());
    const location = loginRes.headers()['location'];
    expect(location).toContain('https://github.com/login/oauth/authorize');
    expect(location).toContain('client_id=test_client_id_123');
    expect(location).toContain('scope=repo%2Cread%3Auser');
    expect(location).toContain('state=');

    // Check state cookie is set
    const cookiesHeader = loginRes.headers()['set-cookie'];
    expect(cookiesHeader).toBeDefined();
    expect(cookiesHeader).toContain('github_oauth_state=');

    // 6. Callback with invalid state redirects to /?auth=error
    const callbackRes = await request.get('/api/auth/github/callback?code=abc&state=wrong_state', {
      maxRedirects: 0,
    });
    expect([302, 307]).toContain(callbackRes.status());
    expect(callbackRes.headers()['location']).toContain('/?auth=error');

    // 7. Disconnect endpoint
    const disconnectRes = await request.post('/api/auth/github/disconnect');
    expect(disconnectRes.ok()).toBeTruthy();
    const disconnectData = await disconnectRes.json();
    expect(disconnectData.success).toBe(true);
  });

  test('UI: Displays GitHub OAuth banners, settings, and handles auth callback states', async ({ page, request }) => {
    // Reset to disconnected state
    await request.post('/api/auth/github/disconnect');

    await page.goto('/');

    // Verify "Connect with GitHub" banner is visible when disconnected
    await expect(page.getByText('Connect your GitHub account')).toBeVisible();

    // Open Settings Modal
    await page.getByTitle(/Settings/).click();
    await expect(page.getByText('Configuration & Integrations')).toBeVisible();
    await expect(page.getByText('GitHub App / OAuth Integration')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. Iv1.1234567890abcdef')).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Visit /?auth=success and check success banner
    await page.goto('/?auth=success');
    await expect(page.getByText('Successfully connected to GitHub!')).toBeVisible();

    // Visit /?auth=error and check error banner
    await page.goto('/?auth=error&error=access_denied');
    await expect(page.getByText(/GitHub connection failed/)).toBeVisible();
  });

  test('UI: Displays connected GitHub user state and allows disconnect', async ({ page, request }) => {
    // 1. Configure auth with token and user profile
    await request.post('/api/settings', {
      data: {
        githubClientId: 'client_id_test',
        githubClientSecret: 'client_secret_test',
      },
    });

    // Directly set auth in DB for test simulation
    const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'notificurom.db');
    const sqlite = new Database(dbPath);
    const now = new Date().toISOString();
    const userJson = JSON.stringify({
      login: 'octocat',
      name: 'Mona Lisa Octocat',
      avatarUrl: 'https://github.com/octocat.png',
    });
    sqlite
      .prepare(
        "INSERT INTO settings (key, value, updated_at) VALUES ('github_access_token', 'gho_mock_token', ?) ON CONFLICT(key) DO UPDATE SET value='gho_mock_token', updated_at=?"
      )
      .run(now, now);
    sqlite
      .prepare(
        "INSERT INTO settings (key, value, updated_at) VALUES ('github_user', ?, ?) ON CONFLICT(key) DO UPDATE SET value=?, updated_at=?"
      )
      .run(userJson, now, userJson, now);
    sqlite.close();

    // 2. Open page and verify connected user is displayed
    await page.goto('/');

    // Verify disconnected banner is NOT visible
    await expect(page.getByText('Connect your GitHub account')).not.toBeVisible();

    // Verify navbar displays connected user
    await expect(page.getByText('@octocat')).toBeVisible();

    // 3. Open Settings Modal and verify connected status
    await page.getByTitle(/Connected as @octocat/).click();
    await expect(page.getByText('Configuration & Integrations')).toBeVisible();
    await expect(page.getByText('Connected', { exact: true })).toBeVisible();
    await expect(page.getByText('Mona Lisa Octocat')).toBeVisible();
    await expect(page.getByText('OAuth access active')).toBeVisible();

    // 4. Click Disconnect inside Settings Modal
    await page.getByRole('button', { name: 'Disconnect' }).click();
    await expect(page.getByText('Disconnected from GitHub.')).toBeVisible();
    await expect(page.getByText('Not Connected')).toBeVisible();

    // 5. Close settings and verify connected user badge is gone
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Connect your GitHub account')).toBeVisible();
  });
});
