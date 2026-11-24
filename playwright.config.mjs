import { defineConfig, devices } from '@playwright/test';

const app = process.env.MENTEAFIADA_E2E_APP === '1';
const profiles = [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['tablet', { ...devices['iPad Mini'], defaultBrowserType: 'chromium', viewport: { width: 768, height: 1024 } }],
  ['smartphone', { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } }],
];

export default defineConfig({
  testDir: './tests',
  testMatch: app ? ['e2e/**/*.spec.js', 'visual/**/*.spec.js'] : 'browser/**/*.spec.js',
  workers: 1,
  outputDir: app ? 'test-results/app' : 'test-results/browser',
  updateSnapshots: 'none',
  reporter: [['list'], ['html', { open: 'never' }]],
  snapshotPathTemplate: '{testDir}/visual/baselines/{platform}/{projectName}/{testFileName}/{arg}{ext}',
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css' } },
  use: {
    browserName: 'chromium',
    channel: 'msedge',
    headless: true,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    colorScheme: 'light',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--disable-extensions', '--disable-sync', '--no-first-run'] },
    ...(app && { baseURL: 'http://127.0.0.1:4317', serviceWorkers: 'block' }),
  },
  projects: profiles.map(([name, options]) => ({ name, use: options })),
  ...(app && {
    webServer: {
      command: 'node scripts/run-e2e.mjs server',
      port: 4317,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  }),
});
