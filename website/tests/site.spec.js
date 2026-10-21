import { test, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4187';
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
});

for (const colorScheme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
  test(`${width}px ${colorScheme}: readable layout, assets, controls and screenshot switching`, async ({ page }) => {
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page).toHaveTitle(/快速评教/);
    await expect(page.locator('#hero-title')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const name of ['填写设置', '核对预览', '提交进度']) {
      const button = page.getByRole('button', { name });
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      const picture = page.locator(`#${await button.getAttribute('aria-controls')}`);
      await expect(picture).toBeVisible();
      await expect.poll(() => picture.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      expect(await picture.locator('img').evaluate(img => img.currentSrc)).toContain(`${width <= 600 ? '-mobile' : ''}-${colorScheme}.png`);
    }
    await page.getByRole('button', { name: '核对预览' }).click();
    await page.getByRole('link', { name: '开始安装', exact: true }).click();
    await expect(page.locator('.steps li').first()).toContainText('安装油猴 Tampermonkey');
    await page.getByText('Chrome / Edge 提示需要执行用户脚本的权限？', { exact: true }).click();
    await expect(page.getByRole('link', { name: '查看油猴官方图文说明' })).toBeVisible();
    const badTargets = await page.locator('a, button, summary').evaluateAll(nodes => nodes.filter(node => node.getBoundingClientRect().width && getComputedStyle(node).visibility !== 'hidden').filter(node => { const r = node.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map(node => node.textContent.trim()));
    expect(badTargets).toEqual([]);
    await page.getByText('没有出现「快速评教」按钮怎么办？', { exact: true }).click();
    await expect(page.locator('.faq details[open]')).toContainText('用户脚本执行权限');
    expect(failures).toEqual([]);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `website/.qa/hero-${width}-${colorScheme}.png` });
    await page.screenshot({ path: `website/.qa/home-${width}-${colorScheme}.png`, fullPage: true });
  });
}

test('installation destinations, keyboard controls and theme changes survive reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: '前往油猴官网', exact: true })).toHaveAttribute('href', 'https://www.tampermonkey.net/');
  await expect(page.getByRole('link', { name: '从 Greasy Fork 安装', exact: true })).toHaveAttribute('href', 'https://greasyfork.org/zh-CN/scripts/601134');
  await expect(page.getByRole('link', { name: '从 GitHub 安装', exact: true })).toHaveAttribute('href', 'https://raw.githubusercontent.com/cqu-moe/jxzljc/main/jxzljc.user.js');
  await expect(page.getByRole('link', { name: '打开学生评教系统', exact: true })).toHaveAttribute('href', 'http://jxzljc.cqu.edu.cn/xspj/xspj/index/xspjindex');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '跳到正文' })).toBeFocused();
  const step = page.getByRole('button', { name: '填写设置' });
  await step.focus();
  await page.keyboard.press('Enter');
  await expect(step).toHaveAttribute('aria-pressed', 'true');
  expect(await step.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  const summary = page.locator('.faq summary').first();
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.faq details').first()).toHaveAttribute('open', '');
  for (const colorScheme of ['dark', 'light']) {
    await page.emulateMedia({ colorScheme });
    await expect.poll(() => page.locator('.brand img').evaluate(img => img.currentSrc)).toContain(colorScheme === 'dark' ? 'logo-dark.svg' : 'logo.svg');
    const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.reload();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(before);
  }
});

test('installation and FAQ work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  await page.goto(base);
  await page.getByRole('link', { name: '开始安装', exact: true }).click();
  await expect(page.locator('#install-title')).toBeVisible();
  await expect(page.getByRole('link', { name: '从 Greasy Fork 安装', exact: true })).toBeVisible();
  await page.locator('.faq summary').first().click();
  await expect(page.locator('.faq details').first()).toHaveAttribute('open', '');
  await context.close();
});

// Read rendered colors: a stronger theme selector once silently removed the brand palette.
test('brand color and readable text survive theme stylesheet precedence', async ({ page }) => {
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    const colors = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d');
      const rgb = value => { ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const style = selector => getComputedStyle(document.querySelector(selector));
      return {
        brand: rgb(style('h1 span').color),
        background: rgb(style('body').backgroundColor),
        foreground: rgb(style('body').color),
        muted: rgb(style('.hero-detail').color),
        scene: rgb(style('.product-scene').backgroundColor),
        caption: rgb(style('figcaption').color),
        note: rgb(style('.scene-note').color),
        selected: rgb(style('.demo-switch [aria-pressed="true"]').color),
        button: rgb(style('.button').backgroundColor),
        buttonText: rgb(style('.button').color),
      };
    });
    const luminance = rgb => rgb.map(value => { const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
    const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    for (const color of [colors.brand, colors.button]) {
      expect(color[2] - color[0]).toBeGreaterThan(50);
      expect(color[2] - color[1]).toBeGreaterThan(30);
    }
    for (const [text, background] of [['foreground', 'background'], ['muted', 'background'], ['note', 'background'], ['brand', 'background'], ['buttonText', 'button'], ['caption', 'scene'], ['selected', 'scene']]) expect(contrast(colors[text], colors[background])).toBeGreaterThanOrEqual(4.5);
  }
});
