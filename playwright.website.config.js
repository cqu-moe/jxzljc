import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './website/tests',
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:4187', browserName: 'chromium', serviceWorkers: 'block' },
  webServer: { command: 'npm run dev:website', url: 'http://127.0.0.1:4187', reuseExistingServer: false },
});
