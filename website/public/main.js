const scene = document.querySelector('.product-scene');
const frame = document.getElementById('demo-frame');
const playback = document.getElementById('demo-playback');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let ready = false;
let visible = false;
let touched = false;
let playing = false;
const send = action => frame.contentWindow.postMessage({ type: 'evaluation-demo', action }, '*');
function autoplay() {
  if (!ready || !visible || touched || document.hidden || reducedMotion.matches) return;
  touched = true;
  send('autoplay');
}
function pause() { touched = true; send('pause'); }
addEventListener('message', event => {
  if (event.source !== frame.contentWindow || event.data?.type !== 'evaluation-demo') return;
  if (event.data.state === 'paused' || event.data.state === 'complete') touched = true;
  if (event.data.state === 'ready') {
    ready = true;
    playback.disabled = false;
    autoplay();
  }
  playing = event.data.state === 'playing';
  playback.textContent = playing ? '暂停演示' : event.data.state === 'complete' ? '重播演示' : '播放演示';
});
playback.addEventListener('click', () => { touched = true; send(playing ? 'pause' : 'play'); });
frame.addEventListener('pointerenter', pause);
scene.addEventListener('pointerdown', event => { if (!event.target.closest('#demo-playback')) pause(); });
scene.addEventListener('keydown', event => { if (!event.target.closest('#demo-playback')) pause(); });
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting && entry.intersectionRatio >= .5;
  if (visible) autoplay();
  else if (playing) pause();
}, { threshold: .5 }).observe(frame);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) pause(); });
document.querySelector('.demo-toolbar').hidden = false;
frame.src = '/demo.html';
frame.hidden = false;
document.querySelector('.demo-fallback').hidden = true;
