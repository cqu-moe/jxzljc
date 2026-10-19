// ==UserScript==
// @name         重庆大学快速评教
// @namespace    https://github.com/cqu-moe/jxzljc
// @version      0.1.0
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
      :host { font: 15px/1.6 system-ui, sans-serif; color: #172033; }
      * { box-sizing: border-box; }
      button, input, select, textarea { font: inherit; }
      button { cursor: pointer; border: 1px solid #bcc6d6; border-radius: 8px; padding: 8px 14px; background: #fff; color: #172033; }
      button:disabled { cursor: default; opacity: .5; }
      button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid #3273dc; outline-offset: 2px; }
      .primary { color: #fff; background: #245bb4; border-color: #245bb4; }
      #launch { position: fixed; bottom: 24px; right: 24px; z-index: 2147483646; box-shadow: 0 3px 12px #0002; }
      dialog { color: #172033; background: #fff; width: min(760px, calc(100vw - 24px)); max-height: calc(100dvh - 32px); padding: 24px; border: 1px solid #cbd2dd; border-radius: 12px; overflow: auto; }
      dialog::backdrop { background: #14203988; }
      header, footer { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
      h2 { margin: 0; font-size: 21px; }
      h3 { margin: 0 0 4px; font-size: 16px; }
      p { margin: 8px 0; }
      fieldset { margin: 16px 0; padding: 0; border: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; min-width: 0; }
      label { display: grid; gap: 4px; }
      .wide { grid-column: 1 / -1; }
      input, select, textarea { width: 100%; min-width: 0; padding: 8px; border: 1px solid #aebace; border-radius: 6px; color: #172033; background: #fff; }
      textarea { resize: vertical; }
      ol { padding-left: 24px; }
      li { padding: 12px 0; border-top: 1px solid #e0e5ed; overflow-wrap: anywhere; }
      .comment { white-space: pre-wrap; }
      .muted { color: #546176; font-size: 13px; }
      #status { white-space: pre-wrap; }
      #error { color: #a62222; white-space: pre-wrap; }
      .result { font-weight: 600; }
      [hidden] { display: none !important; }
      @media (max-width: 440px) { dialog { padding: 16px; } fieldset { grid-template-columns: 1fr; } #launch { right: 12px; bottom: 12px; } }
    </style>
    <button id="launch" class="primary">快速评教</button>
    <dialog aria-labelledby="title">
      <header><h2 id="title">快速评教</h2><button id="close" aria-label="关闭快速评教">关闭</button></header>
      <p>只处理当前学期未提交的条目。保留已有内容，只补空白。</p>
      <form id="settings">
        <fieldset>
          <label>满意度档位<select id="grade" required><option value="">请选择</option></select></label>
          <label>综合评分<input id="overall" type="number" step="1" required></label>
          <label class="wide">统一评语<textarea id="comment" rows="3" placeholder="填写你的意见与建议，可留空"></textarea></label>
        </fieldset>
        <button class="primary" id="preview" type="submit">预览待评清单</button>
      </form>
      <p id="status" role="status" aria-live="polite"></p>
      <p id="error" role="alert"></p>
      <ol id="list" aria-label="待评清单"></ol>
      <footer>
        <button id="confirm" class="primary" disabled>确认并开始提交</button>
        <button id="stop" hidden>停止后续提交</button>
        <button id="refresh" hidden>刷新课程列表</button>
      </footer>
      <p class="muted">请核对每项实际提交内容。一次只在一个标签页运行；刷新后须重新预览确认。</p>
    </dialog>`;
  document.body.append(host);
  const $ = id => root.getElementById(id);
  const dialog = root.querySelector('dialog');
  const fieldset = root.querySelector('fieldset');
  for (const [value, [label]] of Object.entries(grades)) $('grade').add(new Option(label, value));
  let plan = null;
  let busy = false;
  let stopping = false;

  function lock(value) {
    busy = value;
    fieldset.disabled = value;
    $('preview').disabled = value;
    $('close').disabled = value;
    $('refresh').disabled = value;
    $('confirm').disabled = value || !plan?.items.length;
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
      course, fields, hasOverall, hasComment,
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

  function showPlan(items) {
    $('list').replaceChildren();
    for (const item of items) {
      const li = document.createElement('li');
      const heading = document.createElement('h3');
      heading.textContent = `${item.course.name} · ${item.course.teacher}`;
      li.append(heading);
      for (const f of item.fields) {
        paragraph(li, `${f.indicator.title}：${grades[f.grade][0]}，${f.score} / ${f.indicator.maxScore}${f.preserved ? '（保留草稿）' : ''}`);
        paragraph(li, f.indicator.description || '', 'muted');
      }
      paragraph(li, `综合评分：${item.payload.overallRating}${item.hasOverall ? '（保留草稿）' : ''}`);
      paragraph(li, `评语${item.hasComment ? '（保留草稿）' : ''}：${item.payload.comment || '（留空）'}`, 'comment');
      item.result = paragraph(li, '待确认', 'result');
      $('list').append(li);
    }
  }

  $('launch').addEventListener('click', () => {
    dialog.showModal();
    try {
      const range = limits();
      $('overall').min = String(range.min === range.initial ? range.min + 1 : range.min);
      $('overall').max = String(range.max);
      $('overall').placeholder = `${$('overall').min}–${range.max}`;
    } catch (error) { $('error').textContent = error.message; }
  });
  $('close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  $('settings').addEventListener('input', () => {
    plan = null;
    $('confirm').disabled = true;
    $('list').replaceChildren();
    $('status').textContent = '设置已改变，请重新预览。';
  });
  $('settings').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    plan = null;
    lock(true);
    $('error').textContent = '';
    $('status').textContent = '正在读取当前学期、待评条目和草稿…';
    $('list').replaceChildren();
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
      showPlan(items);
      $('status').textContent = `${semester}：${items.length} 个待评条目。${items.length ? '请逐项核对后确认提交。' : '无需提交。'}`;
    } catch (error) {
      $('status').textContent = '未生成提交计划。';
      $('error').textContent = error.message;
    } finally { lock(false); }
  });

  $('refresh').addEventListener('click', () => location.reload());
  $('stop').addEventListener('click', () => {
    stopping = true;
    $('stop').disabled = true;
    $('status').textContent = '正在停止；如已发出提交请求，将先核实当前条目的结果。';
  });
  $('confirm').addEventListener('click', async () => {
    if (busy || !plan?.items.length) return;
    const batch = plan;
    plan = null;
    lock(true);
    stopping = false;
    $('stop').disabled = false;
    $('error').textContent = '';
    $('stop').hidden = false;
    let completed = 0;
    let active = null;
    let sent = false;
    try {
      if (await currentSemester() !== batch.semester) fail('当前学期已变化，请重新预览。');
      for (const item of batch.items) {
        if (stopping) break;
        active = item;
        sent = false;
        if (localStorage.getItem('evaluationState') !== batch.draftRaw) fail('草稿已变化，请重新预览，避免覆盖新填写的内容。');
        const latest = (await courses(batch.semester)).find(c => c.id === item.course.id);
        if (stopping) break;
        if (!latest || !pending(latest) || latest.kcxz !== item.course.kcxz || latest.teacher !== item.course.teacher || latest.name !== item.course.name) fail('条目状态已变化，请重新预览。');
        if (localStorage.getItem('evaluationState') !== batch.draftRaw) fail('草稿已变化，请重新预览。');
        item.result.textContent = '正在提交…';
        $('status').textContent = `正在提交：${item.course.name} · ${item.course.teacher}（已完成 ${completed} / ${batch.items.length}）`;
        sent = true;
        await api('/saveEvaluation', { ...item.payload, pjsj: Math.max(0, Math.round((Date.now() - batch.reviewedAt) / 1000)) });
        item.result.textContent = '正在核实提交结果…';
        const saved = (await courses(batch.semester)).find(c => c.id === item.course.id);
        if (!saved?.completed || saved.status === '未评教' || !saved.status) fail('服务器尚未显示已提交，结果未确认。');
        item.result.textContent = `已核实提交成功 · ${saved.status}`;
        completed++;
      }
      $('status').textContent = `${stopping ? '已停止' : '完成'}：${completed} / ${batch.items.length} 个条目已核实提交成功。`;
    } catch (error) {
      if (active) active.result.textContent = sent ? '结果未确认，请先刷新核实' : '未提交';
      $('status').textContent = `已停止：${completed} / ${batch.items.length} 个条目已核实提交成功。`;
      $('error').textContent = `${active ? `${active.course.name} · ${active.course.teacher}：` : ''}${error.message}${sent ? '\n请求可能已到达服务器；请先刷新核实，再决定是否重新预览。' : ''}`;
    } finally {
      $('stop').hidden = true;
      $('refresh').hidden = false;
      lock(false);
    }
  });
})();
