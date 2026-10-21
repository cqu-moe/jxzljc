import { test, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4187';
async function preparePreview(demo) {
  await demo.getByLabel('满意度档位').selectOption('B');
  await demo.locator('#overall').fill('90');
  await demo.locator('#comment').fill('讲解清楚，希望多一些课堂练习。');
  await demo.getByRole('button', { name: '下一步', exact: true }).click();
  await expect(demo.getByText('已选 3 / 3', { exact: true })).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
});

for (const colorScheme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
  test(`${width}px ${colorScheme}: readable layout, assets, controls and interactive demo`, async ({ page }) => {
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page).toHaveTitle(/快速评教/);
    await expect(page.locator('#hero-title')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const demo = page.frameLocator('#demo-frame');
    await preparePreview(demo);
    await expect(demo.getByText('已选 3 / 3', { exact: true })).toBeVisible();
    await demo.locator('#list summary').first().click();
    await expect(demo.getByLabel('教学设计').first()).toBeVisible();
    expect(await demo.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await demo.getByLabel('教学设计').first().selectOption('A');
    await demo.locator('#list summary').first().click();
    await expect(demo.getByRole('button', { name: '开始评教', exact: true })).toBeInViewport();
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
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('link', { name: '前往油猴官网', exact: true })).toHaveAttribute('href', 'https://www.tampermonkey.net/');
  await expect(page.getByRole('link', { name: '从 Greasy Fork 安装', exact: true })).toHaveAttribute('href', 'https://greasyfork.org/zh-CN/scripts/601134');
  await expect(page.getByRole('link', { name: '从 GitHub 安装', exact: true })).toHaveAttribute('href', 'https://raw.githubusercontent.com/cqu-moe/jxzljc/main/jxzljc.user.js');
  await expect(page.getByRole('link', { name: '打开学生评教系统', exact: true })).toHaveAttribute('href', 'http://jxzljc.cqu.edu.cn/xspj/xspj/index/xspjindex');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '跳到正文' })).toBeFocused();
  const demo = page.frameLocator('#demo-frame');
  await preparePreview(demo);
  const back = demo.getByRole('button', { name: '上一步', exact: true });
  await back.focus();
  await page.keyboard.press('Enter');
  await expect(demo.getByLabel('满意度档位')).toBeVisible();
  expect(await demo.locator('#settings-title').evaluate(el => el === el.getRootNode().activeElement)).toBe(true);
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
        selected: rgb(style('#demo-playback').color),
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


test('demo edits, selection, submission and reset stay local', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  const demo = page.frameLocator('#demo-frame');
  await preparePreview(demo);
  await demo.getByRole('checkbox', { name: '评价 大学英语 · 王老师' }).uncheck();
  await demo.locator('#list summary').first().click();
  const course = demo.getByRole('group', { name: '高等数学 · 陈老师的评价内容' });
  await course.getByLabel('综合评分').fill('93');
  await course.getByLabel('教学设计').selectOption('A');
  await course.getByLabel('评语').fill('例题很有帮助。');
  await expect(course.getByLabel('综合评分')).toHaveValue('93');
  await demo.getByRole('button', { name: '上一步', exact: true }).click();
  await demo.getByRole('button', { name: '下一步', exact: true }).click();
  await expect(course.getByLabel('评语')).toHaveValue('例题很有帮助。');
  await expect(demo.getByText('已选 2 / 3', { exact: true })).toBeVisible();
  await demo.getByRole('button', { name: '开始评教', exact: true }).click();
  await expect(demo.getByRole('status')).toHaveText('完成：2 / 2 个条目已核实提交成功。');
  await expect(demo.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  await expect(demo.locator('#records')).toContainText('高等数学');
  await expect(demo.locator('#records')).not.toContainText('大学英语');
  await demo.getByRole('button', { name: '再试一次', exact: true }).click();
  await expect(demo.getByRole('heading', { name: '统一评价设置' })).toBeVisible();
  await expect(demo.locator('#overall')).toHaveValue('');
  await preparePreview(demo);
  const frame = page.frame({ url: `${base}/demo.html` });
  expect(await frame.evaluate(() => {
    try { return parent.document.title; } catch (error) { return error.name; }
  })).toBe('SecurityError');
  expect(await frame.evaluate(async () => {
    try { await window.fetch('/xspj/xspj/index/getCourses'); return 'allowed'; } catch { return 'blocked'; }
  })).toBe('blocked');
  expect(requests.filter(url => new URL(url).origin !== base || url.includes('/xspj/'))).toEqual([]);
});

test('autoplay types, selects and repeats complete flows without moving page focus', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const demo = page.frameLocator('#demo-frame');
  await expect(demo.getByRole('heading', { name: '统一评价设置' })).toBeVisible();
  await expect(demo.locator('.demo-options')).toBeVisible();
  await page.waitForTimeout(1000);
  expect(await demo.locator('.demo-options').isVisible()).toBe(true);
  await expect(demo.getByLabel('满意度档位')).toHaveValue('B');
  await expect.poll(() => demo.locator('#comment').inputValue()).toMatch(/^讲解清楚/);
  const typed = (await demo.locator('#comment').inputValue()).length;
  await page.waitForTimeout(1000);
  const later = (await demo.locator('#comment').inputValue()).length;
  expect(later).toBeGreaterThan(typed);
  expect(later - typed).toBeLessThanOrEqual(6);
  expect(later).toBeLessThan('讲解清楚，希望多一些课堂练习。'.length);
  for (let cycle = 0; cycle < 2; cycle++) {
    await expect(demo.getByRole('status')).toHaveText('完成：3 / 3 个条目已核实提交成功。', { timeout: 45000 });
    expect(await page.evaluate(() => ({ y: scrollY, focused: document.activeElement.tagName }))).toEqual({ y: 0, focused: 'BODY' });
    await expect(demo.getByRole('heading', { name: '统一评价设置' })).toBeVisible({ timeout: 8000 });
  }
});

test('hover freezes typing and resumes from the same character; editing takes control', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const demo = page.frameLocator('#demo-frame');
  const comment = demo.locator('#comment');
  await expect.poll(() => comment.inputValue(), { timeout: 10000 }).toMatch(/^讲解/);
  await page.locator('#preview').hover({ position: { x: 8, y: 8 } });
  await expect(page.getByText('示例数据 · 移开继续', { exact: true })).toBeVisible();
  await page.waitForTimeout(200);
  const paused = await comment.inputValue();
  await page.waitForTimeout(1000);
  await expect(comment).toHaveValue(paused);
  await page.mouse.move(0, 0);
  await expect.poll(() => comment.inputValue()).not.toBe(paused);
  expect((await comment.inputValue()).startsWith(paused)).toBe(true);
  await demo.locator('#overall').fill('88');
  await comment.fill('保留我的修改。');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1800);
  await expect(demo.locator('#overall')).toHaveValue('88');
  await expect(comment).toHaveValue('保留我的修改。');
  await expect(page.getByRole('button', { name: '重播演示' })).toBeVisible();
});

test('hover freezes simulated submission too; the pause button stays paused after pointer leaves', async ({ page }) => {
  test.setTimeout(45000);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const demo = page.frameLocator('#demo-frame');
  await expect(demo.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1', { timeout: 45000 });
  await page.locator('#preview').hover({ position: { x: 8, y: 8 } });
  await page.waitForTimeout(200);
  const progress = await demo.getByRole('progressbar').getAttribute('aria-valuenow');
  const status = await demo.getByRole('status').textContent();
  await page.waitForTimeout(1400);
  await expect(demo.getByRole('progressbar')).toHaveAttribute('aria-valuenow', progress);
  await expect(demo.getByRole('status')).toHaveText(status);
  await page.getByRole('button', { name: '暂停演示' }).click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1000);
  await expect(demo.getByRole('progressbar')).toHaveAttribute('aria-valuenow', progress);
  await page.getByRole('button', { name: '继续演示' }).click();
  await page.mouse.move(0, 0);
  await expect(demo.getByRole('status')).toHaveText('完成：3 / 3 个条目已核实提交成功。', { timeout: 12000 });
});

test('reduced motion starts with static empty settings', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const demo = page.frameLocator('#demo-frame');
  await expect(demo.getByRole('heading', { name: '统一评价设置' })).toBeVisible();
  await page.waitForTimeout(2000);
  await expect(demo.locator('#grade')).toHaveValue('');
  await expect(demo.locator('#overall')).toHaveValue('');
  await expect(page.getByRole('button', { name: '重播演示' })).toBeVisible();
});

test('playback freezes outside the viewport and resumes when visible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const demo = page.frameLocator('#demo-frame');
  await expect.poll(() => demo.locator('#comment').inputValue(), { timeout: 10000 }).toMatch(/^讲解/);
  await page.getByRole('link', { name: '开始安装', exact: true }).click();
  await page.waitForTimeout(200);
  const paused = await demo.locator('#comment').inputValue();
  await page.waitForTimeout(1500);
  await expect(demo.locator('#comment')).toHaveValue(paused);
  await page.mouse.move(0, 0);
  await page.locator('#preview').scrollIntoViewIfNeeded();
  await expect(demo.getByText('已选 3 / 3', { exact: true })).toBeVisible({ timeout: 10000 });
});


test('reset clears the demo and stays on the first step', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const demo = page.frameLocator('#demo-frame');
  await preparePreview(demo);
  await demo.getByRole('button', { name: '重置演示' }).click();
  await expect(demo.getByRole('heading', { name: '统一评价设置' })).toBeVisible();
  await expect(demo.locator('#grade')).toHaveValue('');
  await expect(demo.locator('#overall')).toHaveValue('');
  await expect(demo.locator('#comment')).toHaveValue('');
  await expect(demo.getByRole('button', { name: '下一步', exact: true })).toBeEnabled();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(2000);
  await expect(demo.getByRole('heading', { name: '统一评价设置' })).toBeVisible();
});

test('taking control during submission stops after the pending course without an error', async ({ page }) => {
  test.setTimeout(45000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const demo = page.frameLocator('#demo-frame');
  await expect(demo.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0', { timeout: 45000 });
  await demo.getByRole('button', { name: '停止后续提交', exact: true }).click();
  await expect(demo.getByRole('status')).toContainText('已停止');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(2500);
  await expect(demo.getByRole('status')).toContainText('已停止');
  await expect(demo.locator('#error')).toBeEmpty();
  await expect(page.getByRole('button', { name: '重播演示' })).toBeVisible();
  expect(errors).toEqual([]);
});
