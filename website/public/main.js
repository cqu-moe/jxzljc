const installSources = document.querySelector('.install-sources');
const installTrigger = installSources.querySelector('summary');
const installMenu = installSources.querySelector('.install-menu');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let closeTimer;
installSources.dataset.state = 'closed';
installMenu.inert = true;
const closeMenu = animated => {
  if (installSources.dataset.state === 'closing') return;
  clearTimeout(closeTimer);
  if (!installSources.open) {
    installSources.dataset.state = 'closed';
    return;
  }
  if (!animated) {
    installSources.open = false;
    installSources.dataset.state = 'instant';
    installMenu.inert = true;
    return;
  }
  installSources.dataset.state = 'closing';
  installMenu.inert = true;
  closeTimer = setTimeout(() => {
    installSources.open = false;
    installSources.dataset.state = 'closed';
  }, 120);
};
const openMenu = animated => {
  clearTimeout(closeTimer);
  installSources.dataset.state = animated ? 'open' : 'instant';
  installSources.open = true;
  installMenu.inert = false;
};
installTrigger.addEventListener('click', event => {
  event.preventDefault();
  const animated = event.detail > 0;
  if (installSources.open && installSources.dataset.state !== 'closing') closeMenu(animated);
  else openMenu(animated);
});
installSources.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !installSources.open) return;
  closeMenu(false);
  installTrigger.focus();
});
for (const type of ['pointerdown', 'focusin']) document.addEventListener(type, event => {
  if (!installSources.contains(event.target)) closeMenu(type === 'pointerdown');
});
installSources.addEventListener('click', event => {
  if (!event.target.closest('a')) return;
  closeMenu(event.detail > 0);
  installTrigger.focus();
});

const installLink = document.getElementById('install-script');
const installGuide = document.getElementById('install-guide');
let managerConfirmed = false;
try { managerConfirmed = localStorage.getItem('userscript-manager-confirmed') === '1'; } catch {}
installLink.addEventListener('click', event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  // shortcut: manager signals are host-limited; keep manual confirmation until a cross-site detection API exists.
  const manager = window.external?.Tampermonkey || window.external?.Violentmonkey || window.external?.FireMonkey;
  if (manager || managerConfirmed) return;
  event.preventDefault();
  closeMenu(false);
  installGuide.dataset.motion = event.detail ? 'animated' : 'instant';
  installGuide.showModal();
});
document.getElementById('install-guide-continue').addEventListener('click', () => {
  managerConfirmed = true;
  try { localStorage.setItem('userscript-manager-confirmed', '1'); } catch {}
  installGuide.close();
});
installGuide.querySelector('button').addEventListener('click', event => {
  installGuide.dataset.motion = event.detail ? 'animated' : 'instant';
  installGuide.close();
});
installGuide.addEventListener('click', event => {
  if (event.target !== installGuide) return;
  const rect = installGuide.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) installGuide.close();
});
installGuide.addEventListener('cancel', () => { installGuide.dataset.motion = 'instant'; });
installGuide.addEventListener('close', () => installLink.focus({ preventScroll: true }));

const scene = document.querySelector('.product-scene');
const frame = document.getElementById('demo-frame');
const playback = document.getElementById('demo-playback');
const status = document.querySelector('.demo-toolbar span');
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
