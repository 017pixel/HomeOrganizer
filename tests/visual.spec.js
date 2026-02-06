const { test, expect } = require('@playwright/test');

async function stabilizeRuntime(page) {
  await page.addInitScript(() => {
    const fixedTime = new Date('2026-02-06T12:00:00.000+01:00').getTime();
    const OriginalDate = Date;
    const MockDate = class extends OriginalDate {
      constructor(...args) {
        if (args.length === 0) super(fixedTime);
        else super(...args);
      }
      static now() {
        return fixedTime;
      }
    };
    MockDate.parse = OriginalDate.parse;
    MockDate.UTC = OriginalDate.UTC;
    globalThis.Date = MockDate;

    let seed = 42;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    localStorage.setItem('gestureHelpDismissed', '1');
    localStorage.setItem('onboardingSeen', '1');
  });
}

async function blurActiveElement(page) {
  await page.evaluate(() => {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  });
}

test.beforeEach(async ({ page }) => {
  await stabilizeRuntime(page);
});

test('Plan (Dark)', async ({ page }) => {
  await page.goto('/');
  await blurActiveElement(page);
  await expect(page).toHaveScreenshot('plan-dark.png', { fullPage: true });
});

test('Onboarding Tutorial Flow', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('onboardingSeen');
    localStorage.setItem('gestureHelpDismissed', '1');
  });
  await page.goto('/');
  await expect(page.locator('#tutorial')).toBeVisible();
  await page.click('#tutorial-next');
  await page.waitForFunction(() => document.getElementById('tutorial-slides')?.style.transform.includes('-100%'));
  await page.click('#tutorial-next');
  await page.waitForFunction(() => document.getElementById('tutorial-slides')?.style.transform.includes('-200%'));
  await page.click('#tutorial-next');
  await expect(page.locator('#tutorial')).toBeHidden();
});

test('Aufgaben (Dark)', async ({ page }) => {
  await page.goto('/');
  await page.click('.tab[data-tab="tasks"]');
  await blurActiveElement(page);
  await expect(page).toHaveScreenshot('tasks-dark.png', { fullPage: true });
});

test('Einstellungen (Dark)', async ({ page }) => {
  await page.goto('/');
  await page.click('.tab[data-tab="settings"]');
  await blurActiveElement(page);
  await expect(page).toHaveScreenshot('settings-dark.png', { fullPage: true });
});

test('Task-Modal', async ({ page }) => {
  await page.goto('/');
  await page.click('.tab[data-tab="tasks"]');
  await page.click('#add-task');
  await expect(page.locator('#task-modal')).toBeVisible();
  await page.waitForTimeout(200);
  await blurActiveElement(page);
  await expect(page).toHaveScreenshot('task-modal.png', { fullPage: true });
});

test('Light Mode', async ({ page }) => {
  await page.goto('/');
  await page.click('.tab[data-tab="settings"]');
  await page.click('label[for="theme-toggle"]');
  await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light');
  await blurActiveElement(page);
  await expect(page).toHaveScreenshot('settings-light.png', { fullPage: true });
});
