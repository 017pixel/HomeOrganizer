const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  snapshotDir: './tests/__screenshots__',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    channel: 'chromium',
    baseURL: 'http://127.0.0.1:4174',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npx http-server . -p 4174 -c-1',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});

