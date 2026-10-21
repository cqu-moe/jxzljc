import { test, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4187';
test.beforeEach(async ({ context, page }) => {
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('unknown manager: guide precedes download, traps focus and restores it on dismissal', async ({ page }) => {
  const downloads = [];
  page.context().on('request', request => { if (request.url().endsWith('/jxzljc.user.js')) downloads.push(request.url()); });
  await page.goto('/#install');
  const install = page.locator('#install-script');
  const guide = page.getByRole('dialog', { name: '先准备好脚本管理器' });
  await install.focus();
  await page.keyboard.press('Enter');
  await expect(guide).toBeVisible();
  const getManager = guide.getByRole('link', { name: '安装 Tampermonkey' });
  await expect(getManager).toBeFocused();
  await expect(getManager).toHaveAttribute('href', 'https://www.tampermonkey.net/');
  await page.keyboard.press('Tab');
  await expect(guide.getByRole('link', { name: '已安装，继续' })).toBeFocused();
  await page.keyboard.press('Tab');
  // Native dialogs allow a stop in browser chrome, but never on the inert background.
  expect(await guide.evaluate(el => document.activeElement === document.body || el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Tab');
  await expect(guide.getByRole('button', { name: '关闭安装提示' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(guide.getByRole('link', { name: '已安装，继续' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(guide).not.toBeVisible();
  await expect(install).toBeFocused();
  await install.click();
  await guide.getByRole('button', { name: '关闭安装提示' }).click();
  await expect(guide).not.toBeVisible();
  await install.click();
  await page.mouse.click(8, 8);
  await expect(guide).not.toBeVisible();
  expect(downloads).toEqual([]);
});

for (const manager of ['Tampermonkey', 'Violentmonkey', 'FireMonkey']) {
  test(`${manager} public signal: native install link opens without a guide`, async ({ page }) => {
    await page.addInitScript(name => { window.external[name] = { version: 'test' }; }, manager);
    await page.goto('/#install');
    const popupPromise = page.waitForEvent('popup');
    await page.locator('#install-script').click();
    const popup = await popupPromise;
    await popup.waitForURL(`${base}/jxzljc.user.js`);
    await expect(page.locator('#install-guide')).not.toBeVisible();
    await popup.close();
  });
}

for (const storageAvailable of [true, false]) {
  test(`manual confirmation continues installation with storage ${storageAvailable ? 'available' : 'blocked'}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (!storageAvailable) await page.addInitScript(() => {
      Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    });
    await page.goto('/#install');
    await page.locator('#install-script').click();
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: '已安装，继续' }).click();
    const popup = await popupPromise;
    await popup.waitForURL(`${base}/jxzljc.user.js`);
    await popup.close();
    await expect(page.locator('#install-guide')).not.toBeVisible();
    if (storageAvailable) await page.reload();
    const nextPopupPromise = page.waitForEvent('popup');
    await page.locator('#install-script').click();
    const nextPopup = await nextPopupPromise;
    await nextPopup.waitForURL(`${base}/jxzljc.user.js`);
    await nextPopup.close();
    await expect(page.locator('#install-guide')).not.toBeVisible();
    expect(errors).toEqual([]);
  });
}

for (const [width, colorScheme] of [[320, 'dark'], [1440, 'light']]) {
  test(`install guide fits ${width}px ${colorScheme} with accessible targets`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('/#install');
    await page.locator('#install-script').click();
    const guide = page.locator('#install-guide');
    await expect(guide).toBeVisible();
    await expect(guide).toHaveCSS('opacity', '1');
    expect(await guide.evaluate(el => {
      const r = el.getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && el.scrollWidth <= el.clientWidth;
    })).toBe(true);
    expect(await guide.locator('a, button').evaluateAll(nodes => nodes.every(node => {
      const r = node.getBoundingClientRect();
      return r.width >= 44 && r.height >= 44;
    }))).toBe(true);
    await expect(guide).toHaveCSS('transform', 'none');
    await page.screenshot({ path: `website/.qa/install-guide-${width}-${colorScheme}.png` });
  });
}
