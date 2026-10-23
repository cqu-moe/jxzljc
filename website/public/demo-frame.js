const semester = '2026-2027-1';
const courses = ['高等数学', '大学物理', '大学英语'].map((name, index) => ({
  id: `demo-${index}`, name, teacher: ['陈老师', '李老师', '王老师'][index],
  xq: semester, kcxz: '理论课', completed: false, progress: 0, status: '未评教',
}));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let automatic = false;
let initializing = true;
let suspended = true;
let started = false;
let playback;
const waits = new Set();

// One pausable clock drives typing, scene changes and simulated requests.
function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    // Leave time to read automatic steps; manual actions keep their original timing.
    let remaining = ms * (automatic ? 2.5 : 1), timer, since;
    const finish = () => { clearTimeout(timer); waits.delete(task); signal?.removeEventListener('abort', abort); };
    const abort = () => { finish(); reject(new DOMException('Playback interrupted', 'AbortError')); };
    const task = {
      resume() {
        if (timer !== undefined) return;
        since = performance.now();
        timer = setTimeout(() => { finish(); resolve(); }, remaining);
      },
      pause() {
        if (timer === undefined) return;
        clearTimeout(timer);
        remaining = Math.max(0, remaining - (performance.now() - since));
        timer = undefined;
      },
    };
    if (signal?.aborted) return abort();
    signal?.addEventListener('abort', abort, { once: true });
    waits.add(task);
    if (!automatic || !suspended) task.resume();
  });
}

async function demoFetch(path, options = {}) {
  path = new URL(path, location.href).pathname;
  await delay(path.endsWith('/saveEvaluation') ? 800 : 120);
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
  .demo-active { outline: 2px solid var(--ring); outline-offset: 3px; }
  .demo-options { position: fixed; z-index: 2; padding: var(--space-1); border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); color: var(--foreground); box-shadow: var(--shadow-popover); pointer-events: none; }
  .demo-options div { padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); min-height: 36px; font-size: var(--text-sm); }
  .demo-options .selected { background: var(--accent); font-weight: 500; }
  .demo-options .selected::after { content: '✓'; float: right; margin-left: var(--space-3); }

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

function syncPause(value) {
  suspended = value;
  for (const task of waits) automatic && suspended ? task.pause() : task.resume();
  for (const animation of root.getAnimations()) {
    if (automatic && suspended) animation.pause();
    else if (animation.playState === 'paused') animation.play();
  }
}

function takeOver() {
  if (automatic && !$('stop').hidden) $('stop').click();
  automatic = false;
  playback?.abort();
  syncPause(false);
  root.getAnimations().forEach(animation => animation.cancel());
  root.querySelector('.demo-options')?.remove();
  root.querySelectorAll('.demo-active').forEach(element => element.classList.remove('demo-active'));
  $('status').setAttribute('aria-live', 'polite');
  report('manual');
}

function animate(element, frames, options = {}) {
  if (reducedMotion.matches) return;
  const animation = element.animate(frames, { duration: 300, easing: 'cubic-bezier(0.19, 1, 0.22, 1)', ...options });
  if (suspended) animation.pause();
}

function reveal(element) {
  const content = root.querySelector('.content');
  const bounds = content.getBoundingClientRect(), field = element.getBoundingClientRect();
  if (field.top < bounds.top || field.bottom > bounds.bottom) content.scrollTop += field.top - bounds.top - 16;
  element.classList.add('demo-active');
}

async function type(element, text, signal) {
  reveal(element);
  if (reducedMotion.matches) {
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.classList.remove('demo-active');
    return;
  }
  element.value = '';
  // Invalidate the form once; intermediate demo characters only change the field value.
  element.dispatchEvent(new Event('input', { bubbles: true }));
  for (const character of text) {
    await delay(85, signal);
    element.value += character;
  }
  await delay(300, signal);
  element.classList.remove('demo-active');
}

async function choose(select, value, signal) {
  reveal(select);
  const menu = document.createElement('div');
  menu.className = 'demo-options';
  menu.setAttribute('aria-hidden', 'true');
  const choices = [...select.options].filter(option => option.value);
  for (const option of choices) {
    const row = document.createElement('div');
    row.textContent = option.textContent;
    if (option.value === select.value) row.className = 'selected';
    menu.append(row);
  }
  const bounds = select.getBoundingClientRect();
  menu.style.width = `${bounds.width}px`;
  menu.style.left = `${bounds.left}px`;
  root.append(menu);
  menu.style.top = `${Math.max(8, Math.min(bounds.bottom + 6, innerHeight - menu.offsetHeight - 8))}px`;
  animate(menu, [{ opacity: 0, transform: 'translateY(-4px) scale(.98)' }, { opacity: 1, transform: 'none' }]);
  await delay(400, signal);
  [...menu.children].forEach((row, index) => row.classList.toggle('selected', choices[index].value === value));
  await delay(450, signal);
  select.value = value;
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
  menu.remove();
  select.classList.remove('demo-active');
}

async function press(button, signal) {
  animate(button, [{ transform: 'scale(1)' }, { transform: 'scale(.97)' }, { transform: 'scale(1)' }]);
  await delay(150, signal);
  button.click();
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

async function play() {
  playback = new AbortController();
  const signal = playback.signal;
  host.dataset.motion = reducedMotion.matches ? 'off' : 'on';
  $('status').setAttribute('aria-live', 'off');
  animate(dialog, [{ opacity: 0 }, { opacity: 1 }]);
  await delay(250, signal);
  await choose($('grade'), 'B', signal);
  await type($('overall'), '90', signal);
  await type($('comment'), '讲解清楚，希望多一些课堂练习。', signal);
  await press($('next'), signal);
  await idle();
  await delay(700, signal);
  const first = root.querySelector('#list details');
  first.open = true;
  animate(first.querySelector('fieldset'), [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }]);
  await delay(300, signal);
  await choose(first.querySelector('select'), 'A', signal);
  await delay(500, signal);
  first.open = false;
  root.querySelector('.content').scrollTop = 0;
  await delay(500, signal);
  await press($('confirm'), signal);
  await idle();
  await delay(1800, signal);
  animate(dialog, [{ opacity: 1 }, { opacity: 0 }], { fill: 'forwards' });
  await delay(180, signal);
  // A fresh iframe document resets the real script and releases its event listeners.
  location.replace('/demo.html');
}

root.addEventListener('pointerdown', event => { if (event.isTrusted) takeOver(); }, { capture: true });
root.addEventListener('keydown', event => { if (event.isTrusted) takeOver(); }, { capture: true });
root.addEventListener('focusin', event => {
  if (!initializing && automatic && event.target.matches('button, input, select, textarea, summary')) takeOver();
});
root.addEventListener('click', event => {
  if (!event.target.closest('#close, #refresh')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  takeOver();
  location.replace('/demo.html');
}, { capture: true });
$('close').textContent = '重置';
$('close').setAttribute('aria-label', '重置演示');
$('refresh').textContent = '再试一次';

addEventListener('message', event => {
  if (event.source !== parent || event.data?.type !== 'evaluation-demo') return;
  if (event.data.action === 'restart') location.replace('/demo.html');
  if (event.data.action !== 'configure') return;
  if (!started) {
    started = true;
    automatic = event.data.automatic;
    syncPause(event.data.paused);
    start().catch(failed);
  } else {
    if (!event.data.automatic && automatic) takeOver();
    syncPause(event.data.paused);
  }
});

function failed(error) {
  if (error.name === 'AbortError') return;
  takeOver();
  $('error').textContent = `演示暂时不可用，请点击重置。${error.message}`;
}

async function start() {
  $('launch').click();
  initializing = false;
  if (automatic) await play();
}
report('ready');
