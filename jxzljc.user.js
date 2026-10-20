// ==UserScript==
// @name         重庆大学快速评教
// @namespace    https://github.com/cqu-moe/jxzljc
// @version      0.3.3
// @license      MIT
// @updateURL    https://raw.githubusercontent.com/cqu-moe/jxzljc/main/jxzljc.user.js
// @downloadURL  https://raw.githubusercontent.com/cqu-moe/jxzljc/main/jxzljc.user.js
// @description  预览确认后批量评价当前学期待评条目，保留已有草稿。
// @match        *://jxzljc.cqu.edu.cn/xspj/xspj/index/xspjindex*
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==

(() => {
  'use strict';
  if (window.top !== window.self || document.getElementById('cqu-quick-evaluation')) return;

  const apiBase = '/xspj/xspj/index';
  const grades = { A: ['非常满意', 1], B: ['满意', 0.8], C: ['一般满意', 0.6], D: ['不满意', 0.4], E: ['非常不满意', 0.2] };
  const host = document.createElement('div');
  host.id = 'cqu-quick-evaluation';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      /* cqu-theme:start */
:host {
  color-scheme: light dark;
  --font-sans:
    'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei',
    sans-serif;
  --font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-title: 1.75rem;
  --text-display: 2.25rem;
  --radius: 0.5rem;
  --radius-sm: 0.375rem;
  --radius-lg: 0.75rem;
  --content-reading: 48rem;
  --content-standard: 75rem;
  --content-compact: 64rem;
  --content-wide: 90rem;
  --sidebar-width: 15rem;
  --ease-out: cubic-bezier(0.19, 1, 0.22, 1);
  --duration-feedback: 150ms;
  --background: oklch(0.985 0 0);
  --foreground: oklch(0.24 0 0);
  --surface: oklch(1 0 0);
  --muted: oklch(0.958 0 0);
  --muted-foreground: oklch(0.46 0 0);
  --border: oklch(0 0 0 / 0.1);
  --input: oklch(0.6 0 0);
  --ring: oklch(0.5 0 0);
  --primary: oklch(0.22 0 0);
  --primary-foreground: oklch(0.99 0 0);
  --destructive: oklch(0.49 0.18 25);
  --destructive-foreground: oklch(1 0 0);
  --success: oklch(0.4 0.1 155);
  --warning: oklch(0.45 0.09 70);
  --link: oklch(0.46 0.16 255);
  --overlay: oklch(0.15 0 0 / 0.35);
  --shadow-popover: 0 8px 30px oklch(0.2 0 0 / 0.12);
  --shadow-card: 0 1px 2px oklch(0 0 0 / 0.04), 0 2px 4px oklch(0 0 0 / 0.02);
  --card: var(--surface);
  --card-foreground: var(--foreground);
  --popover: var(--surface);
  --popover-foreground: var(--foreground);
  --secondary: var(--muted);
  --secondary-foreground: var(--foreground);
  --accent: var(--muted);
  --accent-foreground: var(--foreground);
}
:host([data-theme='dark']) {
  color-scheme: dark;
  --background: oklch(0.235 0 0);
  --foreground: oklch(0.93 0 0);
  --surface: oklch(0.265 0 0);
  --muted: oklch(0.305 0 0);
  --muted-foreground: oklch(0.735 0 0);
  --border: oklch(0.37 0 0);
  --input: oklch(0.56 0 0);
  --ring: oklch(0.7 0 0);
  --primary: oklch(0.93 0 0);
  --primary-foreground: oklch(0.235 0 0);
  --destructive: oklch(0.74 0.14 25);
  --destructive-foreground: oklch(0.2 0 0);
  --success: oklch(0.77 0.105 155);
  --warning: oklch(0.8 0.1 70);
  --link: oklch(0.78 0.1 255);
  --overlay: oklch(0.12 0 0 / 0.6);
  --shadow-popover: 0 8px 30px oklch(0.1 0 0 / 0.35);
  --shadow-card: 0 1px 2px oklch(0 0 0 / 0.12);
}
@media (prefers-color-scheme: dark) {
  :host(:not([data-theme])) {
    --background: oklch(0.235 0 0);
    --foreground: oklch(0.93 0 0);
    --surface: oklch(0.265 0 0);
    --muted: oklch(0.305 0 0);
    --muted-foreground: oklch(0.735 0 0);
    --border: oklch(0.37 0 0);
    --input: oklch(0.56 0 0);
    --ring: oklch(0.7 0 0);
    --primary: oklch(0.93 0 0);
    --primary-foreground: oklch(0.235 0 0);
    --destructive: oklch(0.74 0.14 25);
    --destructive-foreground: oklch(0.2 0 0);
    --success: oklch(0.77 0.105 155);
    --warning: oklch(0.8 0.1 70);
    --link: oklch(0.78 0.1 255);
    --overlay: oklch(0.12 0 0 / 0.6);
    --shadow-popover: 0 8px 30px oklch(0.1 0 0 / 0.35);
    --shadow-card: 0 1px 2px oklch(0 0 0 / 0.12);
  }
}
:host([data-theme='light']) {
  color-scheme: light;
}
      /* cqu-theme:end */
      :host { font: var(--text-base)/1.6 var(--font-sans); color: var(--foreground); }
      *, *::before, *::after { box-sizing: border-box; }
      button, input, select, textarea { font: inherit; }
      button { min-height: 44px; padding: var(--space-2) var(--space-4); border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); color: var(--foreground); font-size: var(--text-sm); font-weight: 500; cursor: pointer; touch-action: manipulation; }
      button:disabled { color: var(--muted-foreground); background: var(--muted); cursor: not-allowed; }
      :is(button, input, select, textarea, summary, #records):focus-visible { outline: 2px solid var(--ring); outline-offset: 3px; }
      .primary:not(:disabled) { color: var(--primary-foreground); background: var(--primary); border-color: var(--primary); }
      @media (hover: hover) { button:not(:disabled):hover { background: var(--accent); } .primary:not(:disabled):hover { background: color-mix(in oklab, var(--primary) 85%, var(--surface)); } }
      button:not(:disabled):active { background: var(--muted); }
      .primary:not(:disabled):active { background: color-mix(in oklab, var(--primary) 80%, var(--surface)); }
      #launch { position: fixed; bottom: max(var(--space-6), env(safe-area-inset-bottom)); right: var(--space-6); z-index: 2147483646; box-shadow: var(--shadow-popover); }
      dialog { width: min(56rem, calc(100vw - var(--space-8))); height: min(48rem, calc(100dvh - var(--space-8))); max-width: none; max-height: calc(100dvh - var(--space-8)); margin: auto; padding: 0; border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--foreground); background: var(--background); box-shadow: var(--shadow-popover); overflow: hidden; }
      dialog[open] { display: flex; flex-direction: column; }
      dialog::backdrop { background: var(--overlay); }
      header { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-4); padding: var(--space-6); background: var(--surface); border-bottom: 1px solid var(--border); }
      header, footer { flex: none; }
      header > div { min-width: 0; }
      #close { flex-shrink: 0; }
      h2, h3, p { margin: 0; }
      h2 { font-size: var(--text-title); font-weight: 600; line-height: 1.3; }
      h3 { font-size: var(--text-base); font-weight: 600; }
      .eyebrow { font-size: var(--text-xs); color: var(--muted-foreground); margin-bottom: var(--space-2); }
      .description { color: var(--muted-foreground); font-size: var(--text-sm); margin-top: var(--space-2); }
      .content { flex: 1; padding: var(--space-6); display: grid; grid-template-columns: minmax(0, 1fr); align-content: start; gap: var(--space-6); min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
      .content:has(#progress-step:not([hidden])) { grid-template-rows: auto minmax(7rem, 1fr); }
      .section-heading { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-3); }
      .card { border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); box-shadow: var(--shadow-card); padding: var(--space-5); }
      fieldset { margin: 0; border: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-5); min-width: 0; }
      label, .field { display: grid; gap: var(--space-2); font-size: var(--text-sm); font-weight: 500; align-content: start; }
      .wide { grid-column: 1 / -1; }
      input, select, textarea { width: 100%; min-width: 0; min-height: 44px; padding: var(--space-2) var(--space-3); border: 1px solid var(--input); border-radius: var(--radius); color: var(--foreground); background: var(--surface); font-size: max(16px, var(--text-base)); font-weight: 400; }
      :is(input, textarea)::placeholder { color: var(--muted-foreground); opacity: 1; }
      :is(input, select, textarea):disabled { background: var(--muted); color: var(--muted-foreground); cursor: not-allowed; }
      @supports (appearance: base-select) {
        select, select::picker(select) { appearance: base-select; }
        select { align-items: center; cursor: pointer; }
        select::picker(select) { padding: var(--space-1); margin-block: var(--space-1); border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); color: var(--foreground); box-shadow: var(--shadow-popover); max-height: min(24rem, 60dvh); overflow-y: auto; }
        select::picker-icon { content: ''; width: 8px; height: 8px; margin-inline-end: var(--space-1); border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; color: var(--muted-foreground); transform: rotate(45deg); }
        select:open::picker-icon { transform: rotate(225deg); }
        option { min-height: 44px; padding: var(--space-2) var(--space-3); border-radius: var(--radius); font: inherit; gap: var(--space-3); }
        option:checked { background: var(--muted); font-weight: 500; }
        option:is(:hover, :focus-visible) { background: var(--accent); outline: 2px solid var(--ring); outline-offset: -2px; }
        option::checkmark { order: 1; margin-left: auto; color: var(--foreground); }
        option[value=""] { color: var(--muted-foreground); }
      }
      textarea { resize: vertical; min-height: 6rem; }
      .muted { color: var(--muted-foreground); font-size: var(--text-sm); font-weight: 400; }
      .count { color: var(--muted-foreground); font-size: var(--text-sm); font-variant-numeric: tabular-nums; }
      #empty { padding: var(--space-8) var(--space-4); text-align: center; border: 1px dashed var(--border); border-radius: var(--radius-lg); }
      #empty strong { display: block; font-size: var(--text-sm); font-weight: 500; margin-bottom: var(--space-2); }
      #selection { margin-bottom: var(--space-2); }
      .checkbox { display: flex; align-items: center; min-height: 44px; gap: var(--space-2); cursor: pointer; }
      input[type="checkbox"] { appearance: auto; width: 20px; height: 20px; min-height: 0; padding: 0; margin: 0; accent-color: var(--primary); cursor: inherit; }
      .course-select { position: absolute; top: var(--space-2); left: var(--space-2); width: 44px; justify-content: center; z-index: 1; }
      .checkbox:has(input:disabled) { cursor: not-allowed; }
      ol { list-style: none; padding: 0; margin: 0; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); }
      ol:empty { display: none; }
      li { position: relative; overflow-wrap: anywhere; min-width: 0; }
      li + li { border-top: 1px solid var(--border); }
      summary { display: flex; align-items: center; gap: var(--space-3); min-height: 60px; padding: var(--space-3) var(--space-4) var(--space-3) calc(44px + var(--space-4)); cursor: pointer; border-radius: var(--radius); list-style: none; touch-action: manipulation; }
      summary::-webkit-details-marker { display: none; }
      summary::after { content: ''; width: 8px; height: 8px; flex: none; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(-45deg); }
      details[open] > summary::after { transform: rotate(45deg); }
      @media (hover: hover) { summary:hover { background: var(--muted); } }
      .course-name { display: flex; align-items: baseline; gap: var(--space-2); flex: 1; min-width: 0; font-size: var(--text-sm); font-weight: 500; }
      .course-title { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
      .teacher { flex-shrink: 0; max-width: 40%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--muted-foreground); font-size: var(--text-xs); font-weight: 400; }
      details[open] .course-name { display: block; }
      details[open] :is(.course-title, .teacher) { display: block; max-width: none; white-space: normal; overflow: visible; }
      .editor { padding: var(--space-4); border-top: 1px solid var(--border); }
      .field-error { color: var(--destructive); font-size: var(--text-sm); font-weight: 400; }
      [aria-invalid="true"] { border-color: var(--destructive); }
      .result { font-size: var(--text-xs); color: var(--muted-foreground); background: var(--muted); border-radius: var(--radius-sm); padding: var(--space-1) var(--space-2); }
      .result[data-state="success"] { color: var(--success); }
      .result[data-state="error"] { color: var(--destructive); }
      #records-step { display: flex; flex-direction: column; min-height: 0; max-height: min(16rem, 32dvh); }
      #records { min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
      #records li { padding: var(--space-3) var(--space-4); display: grid; align-content: center; }
      .record-name { font-size: var(--text-sm); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
      .record-detail { display: flex; align-items: baseline; gap: var(--space-2); }
      #records .teacher { flex: 1; min-width: 0; max-width: none; }
      #records .result { flex: none; padding: 0; background: none; }
      .progress-heading { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2); margin: var(--space-6) 0 var(--space-3); }
      #percent { font-size: var(--text-display); line-height: 1; font-weight: 600; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
      .progress-track { height: var(--space-3); background: var(--muted); border-radius: var(--radius); overflow: hidden; }
      .progress-fill { height: 100%; background: var(--primary); transform: scaleX(0); transform-origin: left; overflow: hidden; }
      .progress-fill::after { content: ''; display: block; height: 100%; background: linear-gradient(90deg, transparent, var(--primary-foreground), transparent); opacity: 0; }
      .progress-current { display: flex; align-items: baseline; gap: var(--space-2); margin-top: var(--space-5); }
      .activity-dot { width: var(--space-2); height: var(--space-2); flex: none; border-radius: var(--radius); background: var(--primary); }
      #current-course { min-width: 0; overflow-wrap: anywhere; font-size: var(--text-sm); }
      #progress-step[data-state="complete"] :is(#percent, #progress-title) { color: var(--success); }
      #progress-step[data-state="error"] #progress-title { color: var(--destructive); }
      @media (prefers-reduced-motion: no-preference) {
        :host([data-motion="on"]) .progress-fill { transition: transform 280ms var(--ease-out); }
        :host([data-motion="on"]) #progress-step[data-state="running"] .progress-fill::after { animation: sweep 1.4s linear infinite; }
        :host([data-motion="on"]) #progress-step[data-state="running"] .activity-dot { animation: pulse 1.2s ease-in-out infinite; }
        :host([data-motion="on"]) #records li:first-child { animation: record-enter 180ms var(--ease-out); }
        :host([data-motion="on"]) button { transition: transform var(--duration-feedback) var(--ease-out); }
        :host([data-motion="on"]) button:not(:disabled):active { transform: scale(0.97); }
      }
      @keyframes sweep { from { transform: translateX(-100%); opacity: 0.1; } 50% { opacity: 0.35; } to { transform: translateX(100%); opacity: 0.1; } }
      @keyframes pulse { 50% { opacity: 0.35; } }
      @keyframes record-enter { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      footer { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--space-3); padding: var(--space-4) var(--space-6); border-top: 1px solid var(--border); background: var(--surface); }
      .feedback { display: grid; gap: var(--space-3); max-height: min(10rem, 25dvh); overflow-y: auto; }
      #status, #error { font-size: var(--text-sm); white-space: pre-wrap; overflow-wrap: anywhere; }
      #error { color: var(--destructive); border-left: 2px solid var(--destructive); padding-left: var(--space-3); }
      #error:empty { display: none; }
      .actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-2); }
      [hidden] { display: none !important; }
      @media (max-width: 540px) {
        dialog { width: calc(100vw - var(--space-4)); height: min(48rem, calc(100dvh - var(--space-4))); max-height: calc(100dvh - var(--space-4)); }
        header, .content { padding: var(--space-4); }
        header { gap: var(--space-2); }
        h2 { font-size: var(--text-xl); }
        fieldset { grid-template-columns: 1fr; }
        .course-name { display: grid; gap: 0; }
        .teacher { max-width: none; }
        .card { padding: var(--space-4); }
        footer { grid-template-columns: minmax(0, 1fr); padding: var(--space-3) var(--space-4) max(var(--space-3), env(safe-area-inset-bottom)); }
        #launch { right: var(--space-4); bottom: max(var(--space-4), env(safe-area-inset-bottom)); }
      }
      @media (max-height: 540px) { .eyebrow, header .description { display: none; } header, footer { padding: var(--space-2) var(--space-4); } .actions { display: flex; } }
    </style>
    <button id="launch" class="primary">快速评教</button>
    <dialog aria-labelledby="title" aria-describedby="dialog-description">
      <header>
        <div><p class="eyebrow">重庆大学 · 学生评教</p><h2 id="title">快速评教</h2><p class="description" id="dialog-description">01 填写设置 · 02 核对预览 · 03 提交评价</p></div>
        <button id="close" aria-label="关闭快速评教">关闭</button>
      </header>
      <div class="content">
        <section id="settings-step" aria-labelledby="settings-title">
          <div class="section-heading"><h3 id="settings-title" tabindex="-1">统一评价设置</h3><span class="count">第 1 步</span></div>
          <form id="settings">
            <fieldset class="card" aria-labelledby="settings-title">
              <label>满意度档位<select id="grade" required><option value="">请选择满意度</option></select></label>
              <div class="field"><label for="overall">综合评分</label><input id="overall" type="number" step="1" required aria-describedby="score-help"><p class="muted" id="score-help">按网站允许的范围填写</p></div>
              <label class="wide">统一评语<textarea id="comment" rows="3" placeholder="填写你的意见与建议，可留空"></textarea></label>
              <p class="muted wide">已有评分和评语会保留。下一步可选择课程、逐门调整；修改统一设置会重置逐课修改。</p>
            </fieldset>
          </form>
        </section>
        <section id="progress-step" class="card" aria-labelledby="progress-title" hidden>
          <h3 id="progress-title" tabindex="-1">正在提交评价</h3>
          <div class="progress-heading"><strong id="percent" aria-hidden="true">0%</strong><span id="progress-count" class="count"></span></div>
          <div id="progress-bar" class="progress-track" role="progressbar" aria-label="已核实评价进度" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"><div id="progress-fill" class="progress-fill"></div></div>
          <div class="progress-current"><span class="activity-dot" aria-hidden="true"></span><p id="current-course">尚未开始提交课程</p></div>
          <p id="progress-phase" class="description">服务器核实成功后计入进度。</p>
        </section>
        <section id="records-step" aria-labelledby="records-title" hidden>
          <div class="section-heading"><h3 id="records-title">提交记录</h3><span class="count">最新在上 · 滚动查看</span></div>
          <ol id="records" aria-label="提交记录" tabindex="0"></ol>
        </section>
        <section id="preview-step" aria-labelledby="list-title" hidden>
          <div class="section-heading"><h3 id="list-title" tabindex="-1">待评清单</h3><span class="count" id="count"></span></div>
          <div id="empty" hidden><strong>当前学期没有待评条目</strong><p class="muted">已提交和非待评状态的条目不会列入清单。</p></div>
          <form id="evaluation" novalidate>
            <label id="selection" class="checkbox" hidden><input id="select-all" type="checkbox">全选待评课程</label>
            <ol id="list" aria-label="待评清单"></ol>
          </form>
        </section>
      </div>
      <footer>
        <div class="feedback">
          <p id="status" role="status" aria-live="polite">填写后进入下一步，核对课程与评价内容。</p>
          <p id="error" role="alert"></p>
        </div>
        <div class="actions">
          <button class="primary" id="next" type="submit" form="settings">下一步</button>
          <button id="back" hidden>上一步</button>
          <button class="primary" id="confirm" type="submit" form="evaluation" hidden disabled>开始刷课</button>
          <button id="stop" class="primary" hidden>停止后续提交</button>
          <button id="refresh" class="primary" hidden>刷新课程列表</button>
        </div>
      </footer>
    </dialog>`;
  document.body.append(host);
  const $ = id => root.getElementById(id);
  const dialog = root.querySelector('dialog');
  const fieldset = root.querySelector('fieldset');
  for (const [value, [label]] of Object.entries(grades)) $('grade').add(new Option(label, value));
  let plan = null;
  let busy = false;
  let stopping = false;
  let step = 'settings';
  let stepAnimation;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  host.dataset.motion = 'off';
  root.addEventListener('pointerdown', () => { host.dataset.motion = reducedMotion.matches ? 'off' : 'on'; });
  root.addEventListener('keydown', () => { host.dataset.motion = 'off'; stepAnimation?.cancel(); });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) stepAnimation?.cancel(); });

  function showStep(next) {
    const backwards = next === 'settings';
    step = next;
    $('settings-step').hidden = step !== 'settings';
    $('preview-step').hidden = step !== 'preview';
    $('progress-step').hidden = step !== 'progress';
    $('records-step').hidden = step !== 'progress';
    $('selection').hidden = step !== 'preview' || !plan?.items.length;
    lock(busy);
    const content = root.querySelector('.content');
    content.scrollTop = 0;
    stepAnimation?.cancel();
    if (host.dataset.motion === 'on' && !reducedMotion.matches) {
      stepAnimation = content.animate([
        { opacity: 0, transform: `translateX(${backwards ? -12 : 12}px)` },
        { opacity: 1, transform: 'translateX(0)' },
      ], { duration: 180, easing: 'cubic-bezier(0.19, 1, 0.22, 1)' });
    }
    $(step === 'settings' ? 'settings-title' : step === 'preview' ? 'list-title' : 'progress-title').focus({ preventScroll: true });
  }

  function updateProgress(completed, total) {
    $('percent').textContent = `${Math.round(completed / total * 100)}%`;
    $('progress-count').textContent = `${completed} / ${total} 门已核实`;
    $('progress-bar').setAttribute('aria-valuemax', String(total));
    $('progress-bar').setAttribute('aria-valuenow', String(completed));
    $('progress-bar').setAttribute('aria-valuetext', `${completed} / ${total} 门已核实提交成功`);
    $('progress-fill').style.transform = `scaleX(${completed / total})`;
  }

  function startRecord(course) {
    const row = document.createElement('li');
    const name = paragraph(row, course.name, 'record-name');
    name.title = course.name;
    const detail = document.createElement('div');
    detail.className = 'record-detail';
    paragraph(detail, course.teacher, 'teacher').title = course.teacher;
    const result = paragraph(detail, '正在核对…', 'result');
    row.append(detail);
    $('records').prepend(row);
    $('records').scrollTo({ top: 0, behavior: 'instant' });
    return result;
  }

  function lock(value) {
    busy = value;
    fieldset.disabled = value;
    $('next').disabled = value;
    $('next').hidden = step !== 'settings';
    $('next').textContent = value ? '正在读取…' : '下一步';
    $('back').disabled = value;
    $('back').hidden = step !== 'preview';
    $('close').disabled = value;
    $('refresh').disabled = value;
    $('refresh').hidden = step !== 'progress' || value;
    $('stop').hidden = step !== 'progress' || !value;
    const selected = plan?.items.some(item => item.selected);
    $('confirm').disabled = value || !selected;
    $('confirm').hidden = step !== 'preview';
    for (const control of $('evaluation').querySelectorAll('fieldset, input[type="checkbox"]')) control.disabled = value || !plan;
    $('settings').setAttribute('aria-busy', String(value));
  }

  function fail(message) { throw new Error(message); }

  async function api(endpoint, payload) {
    const response = await fetch(apiBase + endpoint, {
      credentials: 'same-origin', redirect: 'error', cache: 'no-store',
      signal: AbortSignal.timeout(20000),
      ...(payload ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {}),
    });
    if (!response.ok) fail(`网站请求失败（HTTP ${response.status}），请检查登录状态。`);
    const result = await response.json();
    if (result.success !== true) fail(typeof result.msg === 'string' ? result.msg : '网站未确认请求成功。');
    return result.data;
  }

  async function currentSemester() {
    const data = await api('/getSemesters');
    if (!Array.isArray(data)) fail('无法识别学期数据。');
    const current = data.filter(s => s.iscurrent === true || s.isCurrent === true);
    if (current.length !== 1 || typeof current[0].xq !== 'string' || !current[0].xq) fail('无法确定当前学期。');
    return current[0].xq;
  }

  async function courses(semester) {
    const data = await api('/getCourses?xq=' + encodeURIComponent(semester));
    if (!Array.isArray(data) || data.some(c => !c || typeof c.id !== 'string' || !c.id || c.xq !== semester || typeof c.completed !== 'boolean' || typeof c.status !== 'string')) fail('课程数据格式发生变化，请停止使用并更新脚本。');
    if (new Set(data.map(c => c.id)).size !== data.length) fail('课程数据包含重复条目。');
    return data;
  }

  const pending = c => c.completed === false && c.status === '未评教';

  function limits() {
    const input = document.getElementById('overallRating');
    if (!input || input.type !== 'range') fail('未找到网站综合评分控件，请等待页面加载完成。');
    const result = { min: Number(input.min), max: Number(input.max), initial: Number(input.dataset.initial) };
    if (!Number.isInteger(result.min) || !Number.isInteger(result.max) || result.min < 0 || result.max > 100 || result.min >= result.max || !Number.isFinite(result.initial) || input.step !== '1') fail('综合评分规则发生变化。');
    return result;
  }

  function draftData(raw) {
    const draft = raw === null ? {} : JSON.parse(raw);
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) fail('评价草稿无法读取，已停止以保护原内容。');
    for (const key of ['ratings', 'overallRatings', 'comments']) {
      if (draft[key] !== undefined && (!draft[key] || typeof draft[key] !== 'object' || Array.isArray(draft[key]))) fail('评价草稿格式发生变化，已停止以保护原内容。');
    }
    return draft;
  }

  async function definitions(type) {
    if (typeof type !== 'string' || !type) fail('课程类型缺失。');
    const data = await api('/getIndicators?courseType=' + encodeURIComponent(type));
    // shortcut: 仅支持实测的 A–E 选择题，学校更换题型时重新适配。
    if (!Array.isArray(data) || !data.length || data.some(i => !i || typeof i.id !== 'string' || !i.id || typeof i.title !== 'string' || i.type !== '选项问答' || i.options !== 'A;B;C;D;E' || !Number.isFinite(Number(i.maxScore)) || Number(i.maxScore) <= 0 || Number(i.maxScore) > 100) || new Set(data.map(i => i.id)).size !== data.length) fail('发现尚未支持的评价指标或选项，请手动评价。');
    return data;
  }

  function prepare(course, indicators, semester, draft, preset, range) {
    if (typeof course.name !== 'string' || typeof course.teacher !== 'string') fail('课程名称或教师信息缺失。');
    const key = `semester-${semester}-course-${course.id}`;
    const fields = indicators.map(indicator => {
      const ratingKey = `${semester}-${course.id}-${indicator.id}`;
      const saved = draft.ratings?.[ratingKey];
      const preserved = saved !== undefined;
      const grade = preserved ? saved : preset.grade;
      if (!Object.hasOwn(grades, grade)) fail(`${course.name}：已有指标评分无法识别，未覆盖草稿。`);
      const score = Number(indicator.maxScore) * grades[grade][1];
      const savedScore = draft.ratings?.[ratingKey + '_score'];
      if (preserved && savedScore !== undefined && Number(savedScore) !== score) fail(`${course.name}：草稿分数与当前指标权重不一致。`);
      return { indicator, grade, score, preserved };
    });
    const savedOverall = draft.overallRatings?.[key];
    const hasOverall = savedOverall !== undefined && savedOverall !== '' && Number(savedOverall) !== 0 && Number(savedOverall) !== range.initial;
    const overall = hasOverall ? Number(savedOverall) : preset.overall;
    if (!Number.isInteger(overall) || overall < range.min || overall > range.max || overall === range.initial) fail(`${course.name}：综合评分超出网站范围，未覆盖已有评分。`);
    const savedComment = draft.comments?.[key];
    if (savedComment !== undefined && typeof savedComment !== 'string') fail(`${course.name}：已有评语无法识别。`);
    const hasComment = Boolean(savedComment?.trim());
    return {
      course, fields, hasOverall, hasComment, selected: true,
      payload: { xsxkxxid: course.id, overallRating: String(overall), comment: hasComment ? savedComment : preset.comment, ratings: fields.map(f => ({ zbid: f.indicator.id, score: f.score })) },
    };
  }

  function paragraph(parent, text, className) {
    const p = document.createElement('p');
    p.textContent = text;
    if (className) p.className = className;
    parent.append(p);
    return p;
  }

  function updateSelection() {
    const count = plan.items.filter(item => item.selected).length;
    $('count').textContent = `已选 ${count} / ${plan.items.length}`;
    $('select-all').checked = count > 0 && count === plan.items.length;
    $('select-all').indeterminate = count > 0 && count < plan.items.length;
    $('status').textContent = count ? `${plan.semester}：点击「开始刷课」将提交已选 ${count} 门课程的评价。` : (plan.items.length ? '尚未选择课程，请勾选要评价的条目。' : `${plan.semester}：0 个待评条目，无需提交。`);
    lock(busy);
  }

  function showPlan(items, range) {
    $('list').replaceChildren();
    $('selection').hidden = !items.length;
    $('empty').hidden = items.length > 0;
    if (!items.length) $('empty').innerHTML = '<strong>当前学期没有待评条目</strong><p class="muted">已提交和非待评状态的条目不会列入清单。</p>';
    for (const [index, item] of items.entries()) {
      const li = document.createElement('li');
      const name = `${item.course.name} · ${item.course.teacher}`;
      const selection = document.createElement('label');
      selection.className = 'checkbox course-select';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.setAttribute('aria-label', `评价 ${name}`);
      selection.append(checkbox);
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      const heading = document.createElement('span');
      heading.className = 'course-name';
      const courseTitle = document.createElement('span');
      courseTitle.className = 'course-title';
      courseTitle.textContent = item.course.name;
      const teacher = document.createElement('span');
      teacher.className = 'teacher';
      teacher.textContent = item.course.teacher;
      heading.append(courseTitle, teacher);
      summary.append(heading);
      const score = document.createElement('span');
      score.className = 'result';
      summary.append(score);
      const editor = document.createElement('fieldset');
      editor.className = 'editor';
      editor.setAttribute('aria-label', `${name}的评价内容`);
      details.append(summary, editor);
      li.append(selection, details);
      const updateSummary = () => { score.textContent = item.selected ? (item.payload.overallRating ? `${item.payload.overallRating} 分` : '待填写') : '本次不评'; };
      checkbox.addEventListener('change', () => {
        item.selected = checkbox.checked;
        updateSummary();
        updateSelection();
      });
      for (const f of item.fields) {
        const label = document.createElement('label');
        const title = document.createElement('span');
        title.textContent = f.indicator.title;
        const select = document.createElement('select');
        for (const [value, [text, weight]] of Object.entries(grades)) select.add(new Option(`${text} · ${Number(f.indicator.maxScore) * weight} / ${f.indicator.maxScore}`, value));
        select.value = f.grade;
        label.append(title, select);
        const source = paragraph(label, f.preserved ? '保留草稿' : '来自统一设置', 'muted');
        if (f.indicator.description) paragraph(label, f.indicator.description, 'muted');
        select.addEventListener('change', () => {
          f.grade = select.value;
          f.score = Number(f.indicator.maxScore) * grades[f.grade][1];
          item.payload.ratings = item.fields.map(field => ({ zbid: field.indicator.id, score: field.score }));
          source.textContent = '本次修改';
        });
        editor.append(label);
      }
      const overallLabel = document.createElement('label');
      const overallTitle = document.createElement('span');
      overallTitle.textContent = '综合评分';
      const overall = document.createElement('input');
      overall.type = 'number';
      overall.min = $('overall').min;
      overall.max = String(range.max);
      overall.step = '1';
      overall.required = true;
      overall.value = item.payload.overallRating;
      overallLabel.append(overallTitle, overall);
      const overallSource = paragraph(overallLabel, item.hasOverall ? '保留草稿' : '来自统一设置', 'muted');
      const error = paragraph(overallLabel, `请输入 ${overall.min}–${range.max} 范围内的整数，不能使用网站初始值 ${range.initial}。`, 'field-error');
      error.id = `course-error-${index}`;
      error.hidden = true;
      overall.setAttribute('aria-describedby', error.id);
      item.validate = () => {
        const value = Number(overall.value);
        const valid = overall.value !== '' && overall.checkValidity() && value !== range.initial;
        overall.setAttribute('aria-invalid', String(!valid));
        error.hidden = valid;
        return valid;
      };
      item.focusInvalid = () => { details.open = true; overall.focus(); };
      overall.addEventListener('blur', item.validate);
      overall.addEventListener('input', () => {
        item.payload.overallRating = overall.value === '' ? '' : String(Number(overall.value));
        overallSource.textContent = '本次修改';
        updateSummary();
        if (overall.getAttribute('aria-invalid') === 'true') item.validate();
      });
      const commentLabel = document.createElement('label');
      commentLabel.className = 'wide';
      const commentTitle = document.createElement('span');
      commentTitle.textContent = '评语';
      const comment = document.createElement('textarea');
      comment.rows = 3;
      comment.value = item.payload.comment;
      commentLabel.append(commentTitle, comment);
      const commentSource = paragraph(commentLabel, item.hasComment ? '保留草稿' : '来自统一设置，可留空', 'muted');
      comment.addEventListener('input', () => {
        item.payload.comment = comment.value;
        commentSource.textContent = '本次修改';
      });
      editor.append(overallLabel, commentLabel);
      updateSummary();
      $('list').append(li);
    }
  }

  $('select-all').addEventListener('change', () => {
    const checked = $('select-all').checked;
    for (const checkbox of $('list').querySelectorAll('input[type="checkbox"]')) {
      checkbox.checked = checked;
      checkbox.dispatchEvent(new Event('change'));
    }
  });

  $('launch').addEventListener('click', () => {
    dialog.showModal();
    try {
      const range = limits();
      $('overall').min = String(range.min === range.initial ? range.min + 1 : range.min);
      $('overall').max = String(range.max);
      $('overall').placeholder = `${$('overall').min}–${range.max}`;
      $('score-help').textContent = `网站允许 ${$('overall').min}–${range.max} 分`;
    } catch (error) { $('error').textContent = error.message; }
  });
  $('close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  $('back').addEventListener('click', () => {
    if (busy || step !== 'preview') return;
    showStep('settings');
    $('error').textContent = '';
    $('status').textContent = '课程选择与逐课编辑已保留；修改统一设置后会重新生成。';
  });
  $('settings').addEventListener('input', () => {
    plan = null;
    $('list').replaceChildren();
    $('selection').hidden = true;
    $('error').textContent = '';
    $('status').textContent = '填写后进入下一步，核对课程与评价内容。';
    lock(busy);
  });
  $('settings').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || step !== 'settings') return;
    if (plan) {
      showStep('preview');
      updateSelection();
      return;
    }
    lock(true);
    $('error').textContent = '';
    $('status').textContent = '正在读取当前学期、待评条目和草稿…';
    try {
      const modal = document.getElementById('evaluationModal');
      if (modal && getComputedStyle(modal).display !== 'none') fail('请先关闭网站的单门评教窗口，保存当前草稿后再预览。');
      const range = limits();
      const preset = { grade: $('grade').value, overall: Number($('overall').value), comment: $('comment').value };
      if (!Object.hasOwn(grades, preset.grade)) fail('请选择满意度档位。');
      const semester = await currentSemester();
      const rows = (await courses(semester)).filter(pending);
      const draftRaw = localStorage.getItem('evaluationState');
      const draft = draftData(draftRaw);
      const byType = new Map();
      const items = [];
      for (const course of rows) {
        if (!byType.has(course.kcxz)) byType.set(course.kcxz, await definitions(course.kcxz));
        items.push(prepare(course, byType.get(course.kcxz), semester, draft, preset, range));
      }
      plan = { semester, items, draftRaw, reviewedAt: Date.now() };
      showPlan(items, range);
      updateSelection();
      showStep('preview');
    } catch (error) {
      $('status').textContent = '未生成提交计划。';
      $('error').textContent = `${error.message}\n处理后点击「下一步」重试，已填写的设置会保留。`;
    } finally { lock(false); }
  });

  $('refresh').addEventListener('click', () => location.reload());
  $('stop').addEventListener('click', () => {
    stopping = true;
    $('stop').disabled = true;
    $('progress-title').textContent = '正在停止';
    $('progress-step').dataset.state = 'stopped';
    $('status').textContent = '正在停止；如已发出提交请求，将先核实当前条目的结果。';
  });
  $('evaluation').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || step !== 'preview' || !plan) return;
    const selected = plan.items.filter(item => item.selected);
    if (!selected.length) return;
    const invalid = selected.find(item => !item.validate());
    if (invalid) { invalid.focusInvalid(); return; }
    const batch = { ...plan, items: selected };
    plan = null;
    lock(true);
    stopping = false;
    $('stop').disabled = false;
    $('error').textContent = '';
    $('status').textContent = '正在核对当前学期与课程状态…';
    $('progress-step').dataset.state = 'running';
    updateProgress(0, batch.items.length);
    showStep('progress');
    $('stop').focus({ preventScroll: true });
    let completed = 0;
    let active = null;
    let result = null;
    let sent = false;
    try {
      if (await currentSemester() !== batch.semester) fail('当前学期已变化，请重新预览。');
      for (const item of batch.items) {
        if (stopping) break;
        active = item;
        result = startRecord(item.course);
        $('current-course').textContent = `${item.course.name} · ${item.course.teacher}`;
        $('progress-phase').textContent = '正在核对课程状态…';
        sent = false;
        if (localStorage.getItem('evaluationState') !== batch.draftRaw) fail('草稿已变化，请重新预览，避免覆盖新填写的内容。');
        const latest = (await courses(batch.semester)).find(c => c.id === item.course.id);
        if (stopping) { result.textContent = '未提交'; break; }
        if (!latest || !pending(latest) || latest.kcxz !== item.course.kcxz || latest.teacher !== item.course.teacher || latest.name !== item.course.name) fail('条目状态已变化，请重新预览。');
        if (localStorage.getItem('evaluationState') !== batch.draftRaw) fail('草稿已变化，请重新预览。');
        result.textContent = '正在提交…';
        $('progress-phase').textContent = '正在提交评价，核实成功后计入进度。';
        $('status').textContent = `正在提交：${item.course.name} · ${item.course.teacher}（已完成 ${completed} / ${batch.items.length}）`;
        sent = true;
        await api('/saveEvaluation', { ...item.payload, pjsj: Math.max(0, Math.round((Date.now() - batch.reviewedAt) / 1000)) });
        result.textContent = '正在核实…';
        $('progress-phase').textContent = '正在向服务器核实提交结果…';
        const saved = (await courses(batch.semester)).find(c => c.id === item.course.id);
        if (!saved?.completed || saved.status === '未评教' || !saved.status) fail('服务器尚未显示已提交，结果未确认。');
        result.textContent = '已核实提交成功';
        result.dataset.state = 'success';
        completed++;
        updateProgress(completed, batch.items.length);
      }
      $('progress-step').dataset.state = stopping ? 'stopped' : 'complete';
      $('progress-title').textContent = stopping ? '已停止' : '全部评价已完成';
      $('progress-phase').textContent = stopping ? '已停止后续提交。刷新后重新核对剩余课程。' : '所有已选课程均已核实提交成功。';
      $('status').textContent = `${stopping ? '已停止' : '完成'}：${completed} / ${batch.items.length} 个条目已核实提交成功。`;
    } catch (error) {
      $('progress-step').dataset.state = 'error';
      $('progress-title').textContent = '提交已停止';
      $('progress-phase').textContent = '进度仅包含已核实成功的课程，请先刷新核实。';
      if (result) {
        result.textContent = sent ? '结果未确认' : '未提交';
        result.dataset.state = 'error';
      }
      $('status').textContent = `已停止：${completed} / ${batch.items.length} 个条目已核实提交成功。`;
      $('error').textContent = `${active ? `${active.course.name} · ${active.course.teacher}：` : ''}${error.message}${sent ? '\n请求可能已到达服务器；请先刷新核实，再决定是否重新预览。' : ''}`;
    } finally {
      lock(false);
      $('refresh').focus({ preventScroll: true });
    }
  });
})();
