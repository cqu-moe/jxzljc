const installSources = document.querySelector('.install-sources');
installSources.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !installSources.open) return;
  installSources.open = false;
  installSources.querySelector('summary').focus();
});
for (const type of ['pointerdown', 'focusin']) document.addEventListener(type, event => {
  if (!installSources.contains(event.target)) installSources.open = false;
});
installSources.addEventListener('click', event => {
  if (!event.target.closest('a')) return;
  installSources.open = false;
  installSources.querySelector('summary').focus();
});

const scene = document.querySelector('.product-scene');
const frame = document.getElementById('demo-frame');
const playback = document.getElementById('demo-playback');
const status = document.querySelector('.demo-toolbar span');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let automatic = !reducedMotion.matches;
let visible = false;
let hovered = matchMedia('(hover: hover)').matches && scene.matches(':hover');
let userPaused = false;
const send = message => frame.contentWindow.postMessage({ type: 'evaluation-demo', ...message }, '*');
function update() {
  const paused = userPaused || hovered || !visible || document.hidden;
  send({ action: 'configure', automatic, paused });
  status.textContent = !automatic ? '示例数据 · 点击试一试' : userPaused ? '示例数据 · 已暂停' : hovered ? '示例数据 · 移开继续' : '示例数据 · 悬停暂停';
  playback.textContent = !automatic ? '重播演示' : userPaused ? '继续演示' : '暂停演示';
}
addEventListener('message', event => {
  if (event.source !== frame.contentWindow || event.data?.type !== 'evaluation-demo') return;
  if (event.data.state === 'manual') automatic = false;
  if (event.data.state === 'ready') playback.disabled = false;
  update();
});
playback.addEventListener('click', () => {
  if (!automatic) {
    automatic = true;
    userPaused = false;
    send({ action: 'restart' });
  } else userPaused = !userPaused;
  update();
});
scene.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; update(); } });
scene.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') { hovered = false; update(); } });
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting && entry.intersectionRatio >= .5;
  update();
}, { threshold: .5 }).observe(frame);
document.addEventListener('visibilitychange', update);
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) automatic = false; update(); });
playback.hidden = false;
frame.src = '/demo.html';
frame.hidden = false;
document.querySelector('.demo-fallback').hidden = true;
