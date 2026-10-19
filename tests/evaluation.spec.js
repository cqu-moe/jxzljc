import { test, expect } from '@playwright/test';

const semester = '2026-2027-1';
const url = 'http://jxzljc.cqu.edu.cn/xspj/xspj/index/xspjindex';
const course = (id, teacher, extra = {}) => ({
  id, name: '示例课程', teacher, xq: semester, kcxz: '理论课',
  completed: false, progress: 0, status: '未评教', ...extra,
});
const indicators = [
  { id: 'design', title: '教学设计', description: '教学目标是否清楚', type: '选项问答', maxScore: '15', options: 'A;B;C;D;E' },
  { id: 'method', title: '教学方法', description: '讲授是否清楚', type: '选项问答', maxScore: '25', options: 'A;B;C;D;E' },
];

async function site(page, { draft, courses, save, readCourses, definitions = indicators } = {}) {
  const rows = courses ?? [course('first', '教师甲'), course('second', '教师乙'),
    course('done', '已提交教师', { completed: true, status: '已提交' }),
    course('rejected', '被驳回教师', { completed: true, status: '已评课(被驳回)' })];
  const submissions = [];
  await page.route('**/*', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.isNavigationRequest() && request.url() === url) {
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>评教测试</title><body style="margin:0;background:#f5f5f5"><input hidden id="overallRating" type="range" min="1" max="95" step="1" data-initial="1"><div id="evaluationModal" style="display:none"></div></html>' });
    }
    const reply = data => route.fulfill({ json: { success: true, data } });
    if (path.endsWith('/getSemesters')) return reply([{ xq: semester, iscurrent: true }, { xq: '2025-2026-2', iscurrent: false }]);
    if (path.endsWith('/getCourses')) return readCourses ? readCourses({ route, rows }) : reply(rows);
    if (path.endsWith('/getIndicators')) return reply(definitions);
    if (path.endsWith('/saveEvaluation') && request.method() === 'POST') {
      const payload = request.postDataJSON();
      submissions.push(payload);
      if (save) return save({ route, payload, rows });
      Object.assign(rows.find(c => c.id === payload.xsxkxxid), { completed: true, status: '已提交' });
      return reply({});
    }
    return route.abort();
  });
  await page.goto(url);
  if (draft) await page.evaluate(value => localStorage.setItem('evaluationState', JSON.stringify(value)), draft);
  await page.addScriptTag({ path: 'jxzljc.user.js' });
  return { submissions, rows };
}

async function preview(page, settingsScreenshot) {
  await page.getByRole('button', { name: '快速评教', exact: true }).click();
  await expect(page.getByRole('heading', { name: '待评清单', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: '预览待评清单' })).toHaveCount(0);
  await page.getByLabel('满意度档位').selectOption('B');
  await page.getByLabel('综合评分').fill('90');
  await page.getByLabel('统一评语').fill('示例意见，仅用于自动化测试。');
  if (settingsScreenshot) await page.screenshot({ path: settingsScreenshot });
  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByRole('status')).not.toContainText('正在读取');
}

test('预览按评教条目区分教师，保留已有草稿，并且确认前不提交', async ({ page }) => {
  const draft = {
    ratings: { [`${semester}-first-design`]: 'C', [`${semester}-first-design_score`]: 9 },
    overallRatings: { [`semester-${semester}-course-first`]: '82' },
    comments: { [`semester-${semester}-course-first`]: '我原先填写的意见' },
  };
  const { submissions } = await site(page, { draft });
  await preview(page);
  const list = page.getByRole('list', { name: '待评清单' });
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await expect(list).toContainText('教师甲');
  await expect(list).toContainText('教师乙');
  const first = list.getByRole('listitem').first();
  await expect(first.getByRole('combobox')).toHaveCount(0);
  await expect(first.getByRole('checkbox')).toBeChecked();
  await first.locator('summary').click();
  await expect(first.getByLabel('教学设计')).toHaveValue('C');
  await expect(first.getByLabel('综合评分')).toHaveValue('82');
  await expect(first.getByLabel('评语')).toHaveValue('我原先填写的意见');
  await expect(first.getByText('保留草稿', { exact: true })).toHaveCount(3);
  await expect(page.getByRole('button', { name: '开始刷课' })).toBeEnabled();
  expect(submissions).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evaluationState')))).toEqual(draft);
});

test('勾选与逐课修改共同决定提交内容，展开收起和取消勾选不丢编辑', async ({ page }) => {
  const draft = {
    ratings: { [`${semester}-second-design`]: 'C', [`${semester}-second-design_score`]: 9 },
    overallRatings: { [`semester-${semester}-course-second`]: '82' },
    comments: { [`semester-${semester}-course-second`]: '原有草稿' },
  };
  const { submissions } = await site(page, { draft });
  await preview(page);
  const rows = page.getByRole('listitem');
  const second = rows.nth(1);
  const all = page.getByRole('checkbox', { name: '全选待评课程' });
  const confirm = page.getByRole('button', { name: '开始刷课' });
  await all.uncheck();
  await expect(rows.getByRole('checkbox').nth(0)).not.toBeChecked();
  await expect(rows.getByRole('checkbox').nth(1)).not.toBeChecked();
  await expect(confirm).toBeDisabled();
  await all.check();
  await expect(rows.getByRole('checkbox').nth(0)).toBeChecked();
  await expect(rows.getByRole('checkbox').nth(1)).toBeChecked();
  await rows.first().getByRole('checkbox').uncheck();
  await expect(all).toBeChecked({ indeterminate: true });
  await expect(page.getByRole('status')).toContainText('已选 1 门课程');
  await second.locator('summary').focus();
  await page.keyboard.press('Enter');
  await second.getByLabel('教学设计').selectOption('D');
  await second.getByLabel('综合评分').fill('8.3e1');
  await second.getByLabel('评语').fill('为教师乙单独填写的意见');
  await second.locator('summary').click();
  await second.getByRole('checkbox').uncheck();
  await expect(confirm).toBeDisabled();
  await second.getByRole('checkbox').focus();
  await page.keyboard.press('Space');
  await second.locator('summary').click();
  await expect(second.getByLabel('教学设计')).toHaveValue('D');
  await expect(second.getByLabel('综合评分')).toHaveValue('8.3e1');
  await expect(second.getByLabel('评语')).toHaveValue('为教师乙单独填写的意见');
  await page.getByRole('button', { name: '上一步' }).click();
  await expect(page.getByLabel('统一评语')).toBeVisible();
  await expect(page.getByRole('list')).toBeHidden();
  await page.getByRole('button', { name: '下一步' }).click();
  await expect(second.getByLabel('评语')).toHaveValue('为教师乙单独填写的意见');
  await expect(rows.first().getByRole('checkbox')).not.toBeChecked();
  expect(submissions).toEqual([]);
  await confirm.click();
  await expect(page.getByRole('status')).toHaveText('完成：1 / 1 个条目已核实提交成功。');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '1');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  expect(submissions.map(({ pjsj, ...payload }) => payload)).toEqual([
    { xsxkxxid: 'second', overallRating: '83', comment: '为教师乙单独填写的意见', ratings: [{ zbid: 'design', score: 6 }, { zbid: 'method', score: 20 }] },
  ]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evaluationState')))).toEqual(draft);
  await expect(page.getByRole('list', { name: '待评清单' })).toBeHidden();
  await expect(page.getByRole('list', { name: '提交记录' }).getByRole('listitem')).toHaveCount(1);
});

test('校验所有已选课程后才提交，收起的错误会展开定位，未选课程不阻塞', async ({ page }) => {
  const { submissions } = await site(page);
  await preview(page);
  const second = page.getByRole('listitem').nth(1);
  const confirm = page.getByRole('button', { name: '开始刷课' });
  await second.locator('summary').click();
  const score = second.getByLabel('综合评分');
  for (const value of ['', '1', '96', '82.5']) {
    await score.fill(value);
    await second.locator('summary').click();
    await confirm.click();
    await expect(score).toBeFocused();
    await expect(score).toHaveAttribute('aria-invalid', 'true');
    await expect(second.getByText(/请输入 2–95/)).toBeVisible();
    expect(submissions).toEqual([]);
  }
  await score.fill('84');
  await expect(score).toHaveAttribute('aria-invalid', 'false');
  await score.fill('');
  await second.getByRole('checkbox').uncheck();
  await confirm.click();
  await expect(page.getByRole('status')).toHaveText('完成：1 / 1 个条目已核实提交成功。');
  expect(submissions.map(payload => payload.xsxkxxid)).toEqual(['first']);
});

test('确认后逐条提交预览内容，核实成功并保留其他草稿，刷新不自动重发', async ({ page }) => {
  const draft = {
    ratings: { [`${semester}-first-design`]: 'C', [`${semester}-first-design_score`]: 9 },
    overallRatings: { [`semester-${semester}-course-first`]: '82' },
    comments: { [`semester-${semester}-course-first`]: '原有意见', 'semester-2025-2026-2-course-history': '历史草稿' },
  };
  const { submissions } = await site(page, { draft });
  await preview(page);
  await page.getByRole('button', { name: '开始刷课' }).click();
  await expect(page.getByRole('status')).toHaveText('完成：2 / 2 个条目已核实提交成功。');
  expect(submissions.map(({ pjsj, ...payload }) => payload)).toEqual([
    { xsxkxxid: 'first', overallRating: '82', comment: '原有意见', ratings: [{ zbid: 'design', score: 9 }, { zbid: 'method', score: 20 }] },
    { xsxkxxid: 'second', overallRating: '90', comment: '示例意见，仅用于自动化测试。', ratings: [{ zbid: 'design', score: 12 }, { zbid: 'method', score: 20 }] },
  ]);
  expect(submissions.every(s => Number.isInteger(s.pjsj) && s.pjsj >= 0 && s.pjsj < 10)).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evaluationState')))).toEqual(draft);
  await page.reload();
  await page.addScriptTag({ path: 'jxzljc.user.js' });
  await preview(page);
  await expect(page.getByRole('status')).toContainText('0 个待评条目');
  await expect(page.getByRole('button', { name: '开始刷课' })).toBeDisabled();
  expect(submissions).toHaveLength(2);
});

test('停止后等待当前请求核实，不启动下一条', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 640 });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const { submissions } = await site(page, { save: async ({ route, payload, rows }) => {
    await gate;
    Object.assign(rows.find(c => c.id === payload.xsxkxxid), { completed: true, status: '已提交' });
    await route.fulfill({ json: { success: true, data: {} } });
  } });
  await preview(page);
  await page.getByRole('button', { name: '开始刷课' }).click();
  await expect.poll(() => submissions.length).toBe(1);
  await expect(page.getByRole('checkbox', { name: '全选待评课程' })).toBeHidden();
  await expect(page.getByRole('list', { name: '待评清单' })).toBeHidden();
  const records = page.getByRole('list', { name: '提交记录' });
  await expect(records.getByRole('listitem')).toHaveCount(1);
  await expect(records).toContainText('正在提交…');
  await expect(records.locator('input, select, textarea, summary')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '停止后续提交' })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('submitting.png') });
  await page.getByRole('button', { name: '停止后续提交' }).click();
  release();
  await expect(page.getByRole('status')).toHaveText('已停止：1 / 2 个条目已核实提交成功。');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '2');
  expect(submissions).toHaveLength(1);
  await expect(records).toContainText('已核实提交成功');
});

test('20门课程的记录窗口随空间伸缩，最新在上且历史可滚动，新课程自动回到顶部', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark' });
  let releaseEighteen;
  let releaseNineteen;
  const eighteenth = new Promise(resolve => { releaseEighteen = resolve; });
  const nineteenth = new Promise(resolve => { releaseNineteen = resolve; });
  const courses = Array.from({ length: 20 }, (_, i) => course(String(i + 1), `示例教师 ${i + 1}`, {
    name: `示例课程 ${i + 1}：${i >= 17 ? '较长的课程名称用于核对多课程提交时的窄屏显示' : '课程评价'}`,
  }));
  const { submissions } = await site(page, { courses, save: async ({ route, payload, rows }) => {
    if (payload.xsxkxxid === '18') await eighteenth;
    if (payload.xsxkxxid === '19') await nineteenth;
    Object.assign(rows.find(row => row.id === payload.xsxkxxid), { completed: true, status: '已提交' });
    await route.fulfill({ json: { success: true, data: {} } });
  } });
  await preview(page);
  await page.getByRole('button', { name: '开始刷课' }).click();
  await expect.poll(() => submissions.length).toBe(18);
  const records = page.getByRole('region', { name: '提交记录' }).getByRole('list');
  const rows = records.getByRole('listitem');
  await expect(rows).toHaveCount(18);
  await expect(rows.first()).toContainText('示例教师 18');
  await expect(rows.first()).toContainText('正在提交…');
  await expect(rows.nth(1)).toContainText('示例教师 17');
  await expect(rows.nth(1)).toContainText('已核实提交成功');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '17');
  const heights = [];
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 740 });
    await records.scrollIntoViewIfNeeded();
    const size = await records.evaluate(el => ({
      viewport: el.clientHeight, row: el.firstElementChild.getBoundingClientRect().height,
      scroll: el.scrollHeight, width: el.clientWidth, contentWidth: el.scrollWidth,
    }));
    heights.push(size.viewport);
    expect(size.viewport).toBeGreaterThanOrEqual(size.row);
    expect(size.viewport).toBeLessThanOrEqual(256);
    expect(size.scroll).toBeGreaterThan(size.viewport);
    expect(size.contentWidth).toBe(size.width);
    await expect(rows.first()).toBeInViewport();
    await expect(rows.last()).not.toBeInViewport();
    await expect(page.getByRole('button', { name: '停止后续提交' })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`many-courses-${width}.png`) });
  }
  expect(heights[0]).toBeGreaterThan(heights[1]);
  await records.focus();
  await page.keyboard.press('End');
  await expect.poll(() => records.evaluate(el => el.scrollHeight - el.clientHeight - el.scrollTop)).toBe(0);
  await expect(rows.last()).toBeInViewport();
  await expect(rows.last()).toContainText('示例教师 1');
  releaseEighteen();
  await expect.poll(() => submissions.length).toBe(19);
  await expect(rows.first()).toContainText('示例教师 19');
  await expect(rows.nth(1)).toContainText('示例教师 18');
  await expect(records).toBeFocused();
  await expect.poll(() => records.evaluate(el => el.scrollTop)).toBe(0);
  await expect(rows.first()).toBeInViewport();
  await expect(rows.last()).not.toBeInViewport();
  releaseNineteen();
  await expect(page.getByRole('status')).toHaveText('完成：20 / 20 个条目已核实提交成功。');
  await expect(rows).toHaveCount(20);
  await expect(rows.first()).toContainText('示例教师 20');
  await expect(rows.first()).toContainText('已核实提交成功');
  expect(submissions.map(payload => payload.xsxkxxid)).toEqual(courses.map(c => c.id));
});

for (const colorScheme of ['light', 'dark']) {
  test(`${colorScheme}下拉菜单适配主题和窄屏，鼠标与键盘选择保留表单行为`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme });
    const { submissions } = await site(page);
    await page.getByRole('button', { name: '快速评教', exact: true }).click();
    const grade = page.getByLabel('满意度档位');
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await grade.click();
      const option = page.getByRole('option', { name: '满意', exact: true });
      await expect(option).toBeVisible();
      const box = await option.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      const picker = await grade.evaluate(el => {
        const style = getComputedStyle(el, '::picker(select)');
        return { background: style.backgroundColor, radius: parseFloat(style.borderRadius) };
      });
      expect(picker.radius).toBeGreaterThan(0);
      expect(picker.background).toBe(colorScheme === 'dark' ? 'oklch(0.265 0 0)' : 'oklch(1 0 0)');
      await page.screenshot({ path: testInfo.outputPath(`select-${colorScheme}-${width}.png`) });
      await option.click();
      await expect(grade).toHaveValue('B');
      await expect(grade).toBeFocused();
    }
    await grade.press('Space');
    await expect(page.getByRole('option', { name: '满意', exact: true })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(grade).toHaveValue('C');
    await grade.press('Space');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('option', { name: '满意', exact: true })).toBeHidden();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(grade).toBeFocused();
    await page.getByLabel('综合评分').fill('90');
    await page.getByRole('button', { name: '下一步' }).click();
    const first = page.getByRole('listitem').first();
    await first.locator('summary').click();
    await first.getByLabel('教学设计').click();
    await first.getByRole('option', { name: '不满意 · 6 / 15', exact: true }).click();
    await expect(first.getByLabel('教学设计')).toHaveValue('D');
    expect(submissions).toEqual([]);
    await page.getByRole('button', { name: '开始刷课' }).click();
    await expect(page.getByRole('status')).toHaveText('完成：2 / 2 个条目已核实提交成功。');
    expect(submissions[0].ratings).toEqual([{ zbid: 'design', score: 6 }, { zbid: 'method', score: 15 }]);
  });
}

test('进度只在回读核实后增长，完成后到达100%并停止动效', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
  let releaseReadback;
  let releaseSecond;
  let verifying = false;
  const readbackGate = new Promise(resolve => { releaseReadback = resolve; });
  const secondGate = new Promise(resolve => { releaseSecond = resolve; });
  const { submissions } = await site(page, {
    readCourses: async ({ route, rows }) => {
      if (rows[0].completed && !verifying) { verifying = true; await readbackGate; }
      await route.fulfill({ json: { success: true, data: rows } });
    },
    save: async ({ route, payload, rows }) => {
      if (payload.xsxkxxid === 'second') await secondGate;
      Object.assign(rows.find(row => row.id === payload.xsxkxxid), { completed: true, status: '已提交' });
      await route.fulfill({ json: { success: true, data: {} } });
    },
  });
  await preview(page);
  await page.getByRole('button', { name: '开始刷课' }).click();
  await expect.poll(() => verifying).toBe(true);
  const progress = page.getByRole('progressbar');
  await expect(progress).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByText('正在向服务器核实提交结果…')).toBeVisible();
  await expect(page.getByRole('button', { name: '上一步' })).toBeHidden();
  releaseReadback();
  await expect.poll(() => submissions.length).toBe(2);
  await expect(progress).toHaveAttribute('aria-valuenow', '1');
  await expect(progress).toHaveAttribute('aria-valuemax', '2');
  await expect(page.getByText('50%', { exact: true })).toBeVisible();
  await expect.poll(() => progress.evaluate(el => el.parentElement.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('progress-dark.png') });
  await page.setViewportSize({ width: 390, height: 740 });
  await expect(progress).toBeInViewport();
  await expect(page.getByRole('button', { name: '停止后续提交' })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('progress-dark-mobile.png') });
  releaseSecond();
  await expect(page.getByRole('status')).toHaveText('完成：2 / 2 个条目已核实提交成功。');
  await expect(progress).toHaveAttribute('aria-valuenow', '2');
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '刷新课程列表' })).toBeFocused();
  await expect.poll(() => progress.evaluate(el => el.parentElement.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
});

for (const mode of ['减少动态效果', '键盘']) {
  test(`${mode}下分步切换和提交进度不播放位移动画`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: mode === '减少动态效果' ? 'reduce' : 'no-preference' });
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const { submissions } = await site(page, { save: async ({ route, payload, rows }) => {
      await gate;
      Object.assign(rows.find(row => row.id === payload.xsxkxxid), { completed: true, status: '已提交' });
      await route.fulfill({ json: { success: true, data: {} } });
    } });
    await preview(page);
    const start = page.getByRole('button', { name: '开始刷课' });
    if (mode === '键盘') { await start.focus(); await page.keyboard.press('Enter'); }
    else await start.click();
    await expect.poll(() => submissions.length).toBe(1);
    expect(await page.getByRole('dialog').evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
    const stop = page.getByRole('button', { name: '停止后续提交' });
    await stop.focus();
    await page.keyboard.press('Enter');
    release();
    await expect(page.getByRole('status')).toHaveText('已停止：1 / 2 个条目已核实提交成功。');
  });
}

for (const failure of ['服务器拒绝', '网络中断', '回读仍未提交', '长服务器错误']) {
  test(`${failure}时停止并保留成功进度，不自动重试或提交后续条目`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 740 });
    await page.emulateMedia({ colorScheme: 'dark' });
    const { submissions } = await site(page, {
      courses: [course('first', '教师甲'), course('second', '教师乙'), course('third', '教师丙')],
      save: async ({ route, payload, rows }) => {
        if (payload.xsxkxxid === 'first') {
          Object.assign(rows[0], { completed: true, status: '已提交' });
          return route.fulfill({ json: { success: true, data: {} } });
        }
        if (failure === '网络中断') return route.abort('connectionreset');
        if (failure === '长服务器错误') return route.fulfill({ json: { success: false, msg: '服务器详细错误说明。'.repeat(100) } });
        if (failure === '服务器拒绝') return route.fulfill({ json: { success: false, msg: '当前条目不可评价' } });
        return route.fulfill({ json: { success: true, data: {} } });
      },
    });
    await preview(page);
    await page.getByRole('button', { name: '开始刷课' }).click();
    await expect(page.getByRole('status')).toHaveText('已停止：1 / 3 个条目已核实提交成功。');
    await expect(page.getByRole('alert')).toContainText('请先刷新核实');
    await expect(page.getByRole('button', { name: '开始刷课' })).toBeHidden();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '3');
    expect(submissions.map(s => s.xsxkxxid)).toEqual(['first', 'second']);
    const records = page.getByRole('list', { name: '提交记录' }).getByRole('listitem');
    await expect(records).toHaveCount(2);
    await expect(records.first()).toContainText('教师乙');
    await expect(records.first()).toContainText('结果未确认');
    await expect(records.nth(1)).toContainText('已核实提交成功');
    await expect(page.getByRole('button', { name: '刷新课程列表' })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('failed.png') });
  });
}

test('确认前草稿变化会停止，重新预览才采用新内容', async ({ page }) => {
  const { submissions } = await site(page);
  await preview(page);
  await page.evaluate(key => localStorage.setItem('evaluationState', JSON.stringify({ comments: { [key]: '刚补充的意见' } })), `semester-${semester}-course-first`);
  await page.getByRole('button', { name: '开始刷课' }).click();
  await expect(page.getByRole('alert')).toContainText('草稿已变化');
  expect(submissions).toEqual([]);
  await expect(page.getByRole('list', { name: '提交记录' })).toContainText('未提交');
  await page.getByRole('button', { name: '刷新课程列表' }).click();
  await page.addScriptTag({ path: 'jxzljc.user.js' });
  await preview(page);
  await page.getByRole('listitem').first().locator('summary').click();
  await expect(page.getByRole('listitem').first().getByLabel('评语')).toHaveValue('刚补充的意见');
});

test('预览后条目已被提交时停止，避免重新提交旧计划', async ({ page }) => {
  const { submissions, rows } = await site(page);
  await preview(page);
  Object.assign(rows[0], { completed: true, status: '已提交' });
  await page.getByRole('button', { name: '开始刷课' }).click();
  await expect(page.getByRole('alert')).toContainText('条目状态已变化');
  expect(submissions).toEqual([]);
});

test('未知题型不会生成可提交计划', async ({ page }) => {
  const { submissions } = await site(page, { definitions: [{ ...indicators[0], options: '非常符合-98,96,94;比较符合-88,86,84' }] });
  await preview(page);
  await expect(page.getByRole('alert')).toContainText('尚未支持的评价指标');
  await expect(page.getByRole('button', { name: '开始刷课' })).toBeHidden();
  expect(submissions).toEqual([]);
});

test('有损坏草稿时停止，原始草稿不被改写', async ({ page }) => {
  const { submissions } = await site(page);
  await page.evaluate(() => localStorage.setItem('evaluationState', '{损坏的内容'));
  await preview(page);
  await expect(page.getByRole('status')).toHaveText('未生成提交计划。');
  await expect(page.getByRole('button', { name: '开始刷课' })).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('evaluationState'))).toBe('{损坏的内容');
  expect(submissions).toEqual([]);
});

test('小屏可操作且重复加载只保留一个入口，文本不会被执行，关闭后焦点回到入口', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const { submissions } = await site(page, { courses: [course('first', '<img src=x onerror="window.injected=true">')] });
  await page.addScriptTag({ path: 'jxzljc.user.js' });
  await expect(page.getByRole('button', { name: '快速评教', exact: true })).toHaveCount(1);
  await preview(page);
  await expect(page.getByRole('list')).toContainText('<img src=x');
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  const bounds = await page.getByRole('dialog').boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(360);
  await page.getByRole('button', { name: '上一步' }).click();
  await page.getByLabel('统一评语').fill('更改后的意见');
  await expect(page.getByRole('button', { name: '开始刷课' })).toBeHidden();
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('listitem').first().locator('summary').click();
  await expect(page.getByRole('listitem').first().getByLabel('评语')).toHaveValue('更改后的意见');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '快速评教', exact: true })).toBeFocused();
  expect(submissions).toEqual([]);
});

for (const colorScheme of ['light', 'dark']) {
  for (const width of [320, 390, 768, 1440]) {
    test(`${width}px / ${colorScheme}：长内容重排、操作可达且触屏尺寸充足`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await site(page, { courses: [course('first', '教师甲'), course('second', '教师乙', { name: '长课程名称与连续标识' + 'CourseIdentifier'.repeat(6) })] });
      await preview(page, testInfo.outputPath('settings.png'));
      const dialog = page.getByRole('dialog');
      const layout = await dialog.evaluate(node => {
        const box = node.getBoundingClientRect();
        const controls = [...node.querySelectorAll('button, input, select, textarea, summary')].filter(el => el.checkVisibility());
        return {
          x: box.x, right: box.right, bottom: box.bottom, viewport: innerWidth,
          overflow: [...node.querySelectorAll('*')].filter(el => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== 'inline' && getComputedStyle(el).textOverflow !== 'ellipsis' && el.clientWidth > 0).map(el => ({ tag: el.tagName, className: el.className, visible: el.checkVisibility(), width: el.clientWidth, scrollWidth: el.scrollWidth })),
          controls: controls.map(el => { const rect = (el.type === 'checkbox' ? el.closest('label') : el).getBoundingClientRect(); return { height: rect.height, width: rect.width }; }),
          inputFonts: [...node.querySelectorAll('input, select, textarea')].map(el => parseFloat(getComputedStyle(el).fontSize)),
          color: getComputedStyle(node).backgroundColor,
        };
      });
      expect(layout.x).toBeGreaterThanOrEqual(0);
      expect(layout.right).toBeLessThanOrEqual(width);
      expect(layout.bottom).toBeLessThanOrEqual(900);
      expect(layout.overflow).toEqual([]);
      expect(layout.controls.every(c => c.height >= 44 && c.width >= 44)).toBe(true);
      expect(layout.inputFonts.every(size => size >= 16)).toBe(true);
      expect(layout.color).toBe(colorScheme === 'dark' ? 'oklch(0.235 0 0)' : 'oklch(0.985 0 0)');
      await expect(page.getByRole('button', { name: '开始刷课' })).toBeInViewport();
      await expect(page.getByRole('heading', { name: '待评清单', exact: true })).toBeInViewport();
      await page.screenshot({ path: testInfo.outputPath('preview-start.png') });
      const last = page.getByRole('listitem').last();
      expect((await last.boundingBox()).height).toBeLessThanOrEqual(72);
      await last.locator('summary').click();
      const title = last.getByText('长课程名称与连续标识' + 'CourseIdentifier'.repeat(6), { exact: true });
      await expect(title).toHaveCSS('white-space', 'normal');
      await last.getByLabel('综合评分').scrollIntoViewIfNeeded();
      await expect(page.getByRole('button', { name: '开始刷课' })).toBeInViewport();
      await page.screenshot({ path: testInfo.outputPath('preview.png') });
      expect(await dialog.evaluate(node => [...node.querySelectorAll('*')].some(el => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== 'inline' && el.clientWidth > 0))).toBe(false);
    });
  }
}

test('主题随系统即时更新，刷新仍正确且不修改学校页面的主题', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await site(page);
  await page.getByRole('button', { name: '快速评教', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'oklch(0.985 0 0)');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'oklch(0.235 0 0)');
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBeNull();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.reload();
  await page.addScriptTag({ path: 'jxzljc.user.js' });
  await page.getByRole('button', { name: '快速评教', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'oklch(0.235 0 0)');
});

test('键盘校验、慢加载和空清单均可理解，关闭恢复焦点', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await site(page, { courses: [], readCourses: async ({ route }) => {
    await gate;
    return route.fulfill({ json: { success: true, data: [] } });
  } });
  const launcher = page.getByRole('button', { name: '快速评教', exact: true });
  await launcher.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByLabel('满意度档位')).toBeFocused();
  await page.getByLabel('满意度档位').selectOption('B');
  await page.getByLabel('综合评分').fill('96');
  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByLabel('综合评分')).toBeFocused();
  await page.getByLabel('综合评分').fill('90');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('正在读取');
  await expect(page.getByRole('button', { name: '正在读取…', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '开始刷课' })).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  release();
  await expect(page.getByText('当前学期没有待评条目', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始刷课' })).toBeDisabled();
  await page.getByRole('button', { name: '关闭快速评教' }).focus();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    // Native dialog may yield focus to browser chrome, but never to the underlying page.
    expect(await page.getByRole('dialog').evaluate(node => node.contains(node.getRootNode().activeElement) || (node.getRootNode().activeElement === null && document.activeElement === document.body))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(launcher).toBeFocused();
});
