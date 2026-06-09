import { defineConfig, devices } from '@playwright/test';

const backendUrl = process.env.E2E_BACKEND_URL ?? 'http://127.0.0.1:3000';
const frontendUrl = process.env.E2E_FRONTEND_URL ?? 'http://127.0.0.1:5173';
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
const reuseExistingServer = process.env.E2E_REUSE_EXISTING_SERVER === '1';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: frontendUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(browserChannel ? { channel: browserChannel } : {}),
      },
    },
  ],
  webServer: [
    {
      command: 'bundle exec rails db:drop db:create db:migrate db:seed && bundle exec rails server -b 127.0.0.1 -p 3000',
      cwd: '../backend',
      env: {
        RAILS_ENV: 'test',
        ADMIN_EMAIL: 'admin@example.com',
        ADMIN_PASSWORD: 'password',
        FRONTEND_ORIGIN: frontendUrl,
      },
      url: `${backendUrl}/up`,
      timeout: 120_000,
      reuseExistingServer,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173',
      cwd: '../frontend',
      env: {
        VITE_API_BASE_URL: backendUrl,
      },
      url: frontendUrl,
      timeout: 120_000,
      reuseExistingServer,
    },
  ],
});
