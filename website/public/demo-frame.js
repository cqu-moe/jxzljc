const semester = '2026-2027-1';
const courses = ['高等数学', '大学物理', '大学英语'].map((name, index) => ({
  id: `demo-${index}`, name, teacher: ['陈老师', '李老师', '王老师'][index],
  xq: semester, kcxz: '理论课', completed: false, progress: 0, status: '未评教',
}));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let automatic = false;
let initializing = true;
let sequence = 0;

async function demoFetch(path, options = {}) {
  path = new URL(path, location.href).pathname;
  await delay(path.endsWith('/saveEvaluation') ? 900 : 120);
  let data;
  switch (path) {
    case '/xspj/xspj/index/getSemesters': data = [{ xq: semester, iscurrent: true }]; break;
    case '/xspj/xspj/index/getCourses': data = courses; break;
    case '/xspj/xspj/index/getIndicators': data = [
      { id: 'design', title: '教学设计', description: '教学目标是否清楚', type: '选项问答', maxScore: '15', options: 'A;B;C;D;E' },
      { id: 'method', title: '教学方法', description: '讲授是否清楚', type: '选项问答', maxScore: '25', options: 'A;B;C;D;E' },
    ]; break;
    case '/xspj/xspj/index/saveEvaluation': {
      const payload = JSON.parse(options.body);
      const course = courses.find(item => item.id === payload.xsxkxxid);
      if (options.method !== 'POST' || !course) throw new Error('无法识别示例课程');
      Object.assign(course, { completed: true, status: '已提交' });
      data = {};
      break;
    }
    default: throw new Error('演示不支持此请求');
  }
  return Response.json({ success: true, data });
}

mountEvaluationDemo(demoFetch);
const host = document.getElementById('cqu-quick-evaluation');
const root = host.shadowRoot;
const $ = id => root.getElementById(id);
const dialog = root.querySelector('dialog');
const style = document.createElement('style');
style.textContent = `
  dialog { position: relative; inset: auto; width: 100%; height: 100dvh; max-height: none; margin: 0; box-shadow: none; }
  #launch { display: none; }
`;
root.append(style);
// Embedded opening and automatic steps must never take page focus.
dialog.showModal = () => dialog.setAttribute('open', '');
for (const element of root.querySelectorAll('[tabindex="-1"], #stop, #refresh')) {
  const focus = element.focus.bind(element);
  element.focus = options => { if (!automatic && !initializing) focus(options); };
}

function report(state) {
  parent.postMessage({ type: 'evaluation-demo', state }, '*');
}

function pause() {
  sequence++;
  if (automatic && !$('stop').hidden) $('stop').click();
  automatic = false;
  $('status').setAttribute('aria-live', 'polite');
  root.getAnimations().forEach(animation => animation.cancel());
  report('paused');
}

function idle() {
  return new Promise((resolve, reject) => {
    const check = () => {
      if ($('settings').getAttribute('aria-busy') === 'true') return;
      observer.disconnect();
      if ($('error').textContent) reject(new Error($('error').textContent));
      else resolve();
    };
    const observer = new MutationObserver(check);
    observer.observe($('settings'), { attributes: true, attributeFilter: ['aria-busy'] });
    check();
  });
}

async function play(wait) {
  automatic = true;
  const current = ++sequence;
  report('playing');
  $('status').setAttribute('aria-live', 'off');
  const next = async ms => { await delay(ms); return automatic && current === sequence; };
  if (!await next(wait)) return;
  host.dataset.motion = reducedMotion.matches ? 'off' : 'on';
  $('back').click();
  if (!await next(2200)) return;
  $('next').click();
  await idle();
  if (!await next(1600)) return;
  const first = root.querySelector('#list details');
  first.open = true;
  if (!await next(1800)) return;
  const score = first.querySelector('input[type="number"]');
  score.value = '92';
  score.dispatchEvent(new Event('input', { bubbles: true }));
  if (!await next(1800)) return;
  first.open = false;
  if (!await next(1200)) return;
  $('confirm').click();
  await idle();
  if (!automatic || current !== sequence) return;
  automatic = false;
  $('status').setAttribute('aria-live', 'polite');
  report('complete');
}

root.addEventListener('pointerdown', event => { if (event.isTrusted) pause(); }, { capture: true });
root.addEventListener('keydown', event => { if (event.isTrusted) pause(); }, { capture: true });
root.addEventListener('focusin', () => { if (!initializing && automatic) pause(); });
root.addEventListener('click', event => {
  if (!event.target.closest('#close, #refresh')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  pause();
  location.replace('/demo.html');
}, { capture: true });
$('close').textContent = '重置';
$('close').setAttribute('aria-label', '重置演示');
$('refresh').textContent = '再试一次';

addEventListener('message', event => {
  if (event.source !== parent || event.data?.type !== 'evaluation-demo') return;
  if (event.data.action === 'pause') pause();
  if (event.data.action === 'autoplay' && !initializing && !reducedMotion.matches) play(4500).catch(failed);
  if (event.data.action === 'play') location.replace('/demo.html?play');
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) pause(); });

function failed(error) {
  pause();
  $('error').textContent = `演示暂时不可用，请点击重置。${error.message}`;
}

async function start() {
  $('launch').click();
  $('grade').value = 'B';
  $('overall').value = '90';
  $('comment').value = '讲解清楚，希望多一些课堂练习。';
  if (location.search !== '?play') {
    $('next').click();
    await idle();
  }
  initializing = false;
  report('ready');
  if (location.search === '?play') await play(0);
}
start().catch(failed);
