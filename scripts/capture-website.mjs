// Screenshots of the shipped userscript; every request is fulfilled locally or aborted.
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const output = new URL('website/public/demo/', root);
await mkdir(output, { recursive: true });
const source = await readFile(new URL('jxzljc.user.js', root), 'utf8');
const url = 'https://evaluation.example.invalid/xspj/xspj/index/xspjindex';
const semester = '2026-2027-1';
const browser = await chromium.launch();
try {
  for (const width of [608, 320]) for (const colorScheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width, height: 640 }, colorScheme, reducedMotion: 'reduce', deviceScaleFactor: 2, serviceWorkers: 'block' });
    const courses = ['高等数学', '大学物理', '大学英语'].map((name, index) => ({ id: `example-${index}`, name, teacher: '示例教师', xq: semester, kcxz: '理论课', completed: false, progress: 0, status: '未评教' }));
    let submissions = 0;
    await page.route('**/*', async route => {
      const request = route.request();
      if (request.isNavigationRequest() && request.url() === url) return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>合成评教截图</title><body><input hidden id="overallRating" type="range" min="1" max="95" step="1" data-initial="1"><div id="evaluationModal" style="display:none"></div></body></html>' });
      const path = new URL(request.url()).pathname;
      const reply = data => route.fulfill({ json: { success: true, data } });
      if (path.endsWith('/getSemesters')) return reply([{ xq: semester, iscurrent: true }]);
      if (path.endsWith('/getCourses')) return reply(courses);
      if (path.endsWith('/getIndicators')) return reply([
        { id: 'design', title: '教学设计', description: '教学目标是否清楚', type: '选项问答', maxScore: '15', options: 'A;B;C;D;E' },
        { id: 'method', title: '教学方法', description: '讲授是否清楚', type: '选项问答', maxScore: '25', options: 'A;B;C;D;E' },
      ]);
      if (path.endsWith('/saveEvaluation') && request.method() === 'POST') {
        const row = courses.find(course => course.id === request.postDataJSON().xsxkxxid);
        if (!row) throw new Error('Unexpected synthetic course');
        Object.assign(row, { completed: true, status: '已提交' });
        submissions++;
        return reply({});
      }
      return route.abort();
    });
    await page.goto(url);
    await page.addScriptTag({ content: source });
    await page.getByRole('button', { name: '快速评教', exact: true }).click();
    await page.getByLabel('满意度档位').selectOption('B');
    await page.getByLabel('综合评分').fill('90');
    await page.getByLabel('统一评语').fill('示例评语：讲解清楚，希望增加课堂练习。');
    const shot = async name => page.getByRole('dialog').screenshot({ path: fileURLToPath(new URL(`${name}${width === 320 ? '-mobile' : ''}-${colorScheme}.png`, output)), animations: 'disabled' });
    await shot('settings');
    await page.getByRole('button', { name: '下一步' }).click();
    await expect(page.getByRole('status')).toContainText('已选 3 门课程');
    await page.getByRole('listitem').first().locator('summary').click();
    await expect(page.getByRole('listitem').first().getByLabel('教学设计')).toBeVisible();
    await shot('preview');
    await page.getByRole('button', { name: '开始评教' }).click();
    await expect(page.getByRole('status')).toHaveText('完成：3 / 3 个条目已核实提交成功。');
    expect(submissions).toBe(3);
    await shot('progress');
    await page.close();
  }
  await writeFile(new URL('source.json', output), JSON.stringify({ userscriptSha256: createHash('sha256').update(source).digest('hex'), version: source.match(/^\/\/ @version\s+(\S+)/m)[1], command: 'npm run capture:website', scope: 'Actual userscript UI; synthetic data; all network requests intercepted; no school requests.' }, null, 2) + '\n');
  console.log('Twelve desktop/mobile screenshots captured from actual userscript with synthetic responses.');
} finally {
  await browser.close();
}
