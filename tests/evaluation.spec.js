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

async function site(page, { draft, courses, save, definitions = indicators } = {}) {
  const rows = courses ?? [course('first', '教师甲'), course('second', '教师乙'),
    course('done', '已提交教师', { completed: true, status: '已提交' }),
    course('rejected', '被驳回教师', { completed: true, status: '已评课(被驳回)' })];
  const submissions = [];
  await page.route('**/*', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.isNavigationRequest() && request.url() === url) {
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>评教测试</title><input id="overallRating" type="range" min="1" max="95" step="1" data-initial="1"><div id="evaluationModal" style="display:none"></div></html>' });
    }
    const reply = data => route.fulfill({ json: { success: true, data } });
    if (path.endsWith('/getSemesters')) return reply([{ xq: semester, iscurrent: true }, { xq: '2025-2026-2', iscurrent: false }]);
    if (path.endsWith('/getCourses')) return reply(rows);
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

async function preview(page) {
  await page.getByRole('button', { name: '快速评教', exact: true }).click();
  await page.getByLabel('满意度档位').selectOption('B');
  await page.getByLabel('综合评分').fill('90');
  await page.getByLabel('统一评语').fill('示例意见，仅用于自动化测试。');
  await page.getByRole('button', { name: '预览待评清单' }).click();
  await expect(page.getByRole('button', { name: '预览待评清单' })).toBeEnabled();
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
  await expect(list).toContainText('教学设计：一般满意，9 / 15（保留草稿）');
  await expect(list).toContainText('综合评分：82（保留草稿）');
  await expect(list).toContainText('我原先填写的意见');
  await expect(page.getByRole('button', { name: '确认并开始提交' })).toBeEnabled();
  expect(submissions).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evaluationState')))).toEqual(draft);
});

test('确认后逐条提交预览内容，核实成功并保留其他草稿，刷新不自动重发', async ({ page }) => {
  const draft = {
    ratings: { [`${semester}-first-design`]: 'C', [`${semester}-first-design_score`]: 9 },
    overallRatings: { [`semester-${semester}-course-first`]: '82' },
    comments: { [`semester-${semester}-course-first`]: '原有意见', 'semester-2025-2026-2-course-history': '历史草稿' },
  };
  const { submissions } = await site(page, { draft });
  await preview(page);
  await page.getByRole('button', { name: '确认并开始提交' }).click();
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
  await expect(page.getByRole('button', { name: '确认并开始提交' })).toBeDisabled();
  expect(submissions).toHaveLength(2);
});

test('停止后等待当前请求核实，不启动下一条', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const { submissions } = await site(page, { save: async ({ route, payload, rows }) => {
    await gate;
    Object.assign(rows.find(c => c.id === payload.xsxkxxid), { completed: true, status: '已提交' });
    await route.fulfill({ json: { success: true, data: {} } });
  } });
  await preview(page);
  await page.getByRole('button', { name: '确认并开始提交' }).click();
  await expect.poll(() => submissions.length).toBe(1);
  await page.getByRole('button', { name: '停止后续提交' }).click();
  release();
  await expect(page.getByRole('status')).toHaveText('已停止：1 / 2 个条目已核实提交成功。');
  expect(submissions).toHaveLength(1);
});

for (const failure of ['服务器拒绝', '网络中断', '回读仍未提交']) {
  test(`${failure}时停止并保留成功进度，不自动重试或提交后续条目`, async ({ page }) => {
    const { submissions } = await site(page, {
      courses: [course('first', '教师甲'), course('second', '教师乙'), course('third', '教师丙')],
      save: async ({ route, payload, rows }) => {
        if (payload.xsxkxxid === 'first') {
          Object.assign(rows[0], { completed: true, status: '已提交' });
          return route.fulfill({ json: { success: true, data: {} } });
        }
        if (failure === '网络中断') return route.abort('connectionreset');
        if (failure === '服务器拒绝') return route.fulfill({ json: { success: false, msg: '当前条目不可评价' } });
        return route.fulfill({ json: { success: true, data: {} } });
      },
    });
    await preview(page);
    await page.getByRole('button', { name: '确认并开始提交' }).click();
    await expect(page.getByRole('status')).toHaveText('已停止：1 / 3 个条目已核实提交成功。');
    await expect(page.getByRole('alert')).toContainText('请先刷新核实');
    await expect(page.getByRole('button', { name: '确认并开始提交' })).toBeDisabled();
    expect(submissions.map(s => s.xsxkxxid)).toEqual(['first', 'second']);
  });
}

test('确认前草稿变化会停止，重新预览才采用新内容', async ({ page }) => {
  const { submissions } = await site(page);
  await preview(page);
  await page.evaluate(key => localStorage.setItem('evaluationState', JSON.stringify({ comments: { [key]: '刚补充的意见' } })), `semester-${semester}-course-first`);
  await page.getByRole('button', { name: '确认并开始提交' }).click();
  await expect(page.getByRole('alert')).toContainText('草稿已变化');
  expect(submissions).toEqual([]);
  await page.getByRole('button', { name: '预览待评清单' }).click();
  await expect(page.getByRole('list')).toContainText('刚补充的意见');
});

test('预览后条目已被提交时停止，避免重新提交旧计划', async ({ page }) => {
  const { submissions, rows } = await site(page);
  await preview(page);
  Object.assign(rows[0], { completed: true, status: '已提交' });
  await page.getByRole('button', { name: '确认并开始提交' }).click();
  await expect(page.getByRole('alert')).toContainText('条目状态已变化');
  expect(submissions).toEqual([]);
});

test('未知题型不会生成可提交计划', async ({ page }) => {
  const { submissions } = await site(page, { definitions: [{ ...indicators[0], options: '非常符合-98,96,94;比较符合-88,86,84' }] });
  await preview(page);
  await expect(page.getByRole('alert')).toContainText('尚未支持的评价指标');
  await expect(page.getByRole('button', { name: '确认并开始提交' })).toBeDisabled();
  expect(submissions).toEqual([]);
});

test('有损坏草稿时停止，原始草稿不被改写', async ({ page }) => {
  const { submissions } = await site(page);
  await page.evaluate(() => localStorage.setItem('evaluationState', '{损坏的内容'));
  await preview(page);
  await expect(page.getByRole('status')).toHaveText('未生成提交计划。');
  await expect(page.getByRole('button', { name: '确认并开始提交' })).toBeDisabled();
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
  await page.getByLabel('统一评语').fill('更改后的意见');
  await expect(page.getByRole('button', { name: '确认并开始提交' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '快速评教', exact: true })).toBeFocused();
  expect(submissions).toEqual([]);
});
