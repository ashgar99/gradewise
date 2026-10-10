// Gradewise for Moodle: your degree classification, worked out from your Moodle marks
// Reads your assignment grades, Turnitin grades, due dates and submission times
// from Moodle 4, plus assessment weights from the gradebook where your university
// shows them. It applies your university's rules, including late penalties, and
// shows your classification so far, all in a panel on the page.
// Nothing is uploaded. Your regulations are read in your browser.
// https://github.com/ashgar99/gradewise (MIT licence)

(async () => {
  if (document.getElementById('gradewise-root')) return;
  const GRADEWISE = 'https://ashgar99.github.io/gradewise/';

  // Panel UI, kept in a shadow root so Moodle's styles cannot affect it
  const host = document.createElement('div');
  host.id = 'gradewise-root';
  host.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:2147483647;';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      .panel { width: 320px; max-height: calc(100vh - 48px); overflow-y: auto; box-sizing: border-box; padding: 20px; border-radius: 18px; background: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.16); color: #1d1d1f;
        font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
      .title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px; }
      .dot { width: 18px; height: 18px; border-radius: 50%; background: linear-gradient(135deg, #ffc53d, #e08a00); }
      .x { background: none; border: 0; color: #86868b; font-size: 22px; line-height: 1; cursor: pointer; padding: 0 2px; }
      .x:hover { color: #1d1d1f; }
      .module { color: #6e6e73; font-size: 13px; margin-bottom: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .status { font-weight: 500; margin-bottom: 10px; }
      .bar { height: 6px; border-radius: 3px; background: #ececf0; overflow: hidden; }
      .fill { height: 100%; width: 0; background: #e08a00; border-radius: 3px; transition: width 0.3s ease; }
      .meta { display: flex; justify-content: space-between; gap: 12px; margin-top: 10px; font-size: 12px; color: #6e6e73; min-height: 17px; }
      .file { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; }
      .action { margin-top: 16px; width: 100%; padding: 10px; border: 0; border-radius: 999px; background: #f2f2f5; color: #1d1d1f; font: inherit; font-weight: 500; cursor: pointer; }
      .action:hover { background: #e8e8ed; }
      .action.go { background: #c97a00; color: #fff; }
      .action.go:hover { background: #b46d00; }
      .panel.error .fill { background: #e5484d; }
      .ask { font-weight: 500; margin-bottom: 14px; }
      .opt { display: block; width: 100%; margin-top: 8px; padding: 10px; border: 0; border-radius: 999px; background: #f2f2f5; color: #1d1d1f; font: inherit; font-weight: 500; cursor: pointer; }
      .opt:hover { background: #e8e8ed; }
      .opt:focus-visible { outline: 2px solid #c97a00; outline-offset: 2px; }
      .opt.first { background: #c97a00; color: #fff; }
      .opt.first:hover { background: #b46d00; }
      .note { margin-top: 10px; font-size: 12px; color: #6e6e73; }
      .panel.wide { width: 400px; }
      .big { display: flex; align-items: baseline; gap: 10px; margin: 2px 0 4px; }
      .big b { font-size: 34px; font-weight: 600; letter-spacing: -0.5px; }
      .pill { display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #f2f2f5; color: #1d1d1f; }
      .pill.amber { background: #fff1d6; color: #8a5300; }
      .pill.late { background: #fff1d6; color: #8a5300; }
      .sub { color: #6e6e73; font-size: 12px; }
      .need { margin-top: 12px; display: grid; gap: 6px; }
      .need div { display: flex; justify-content: space-between; font-size: 13px; }
      .need span:last-child { font-weight: 600; }
      h4 { margin: 20px 0 8px; font-size: 13px; font-weight: 600; color: #1d1d1f; }
      .yr { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 6px; font-size: 13px; }
      select, .in { font: inherit; font-size: 13px; color: #1d1d1f; background: #f2f2f5; border: 0; border-radius: 8px; padding: 6px 8px; }
      select:focus, .in:focus { outline: 2px solid #c97a00; outline-offset: 0; }
      .in { width: 52px; text-align: right; }
      .in.name { width: auto; flex: 1 1 auto; min-width: 0; text-align: left; }
      .mod { border-radius: 12px; background: #fafafb; box-shadow: inset 0 0 0 1px #ececf0; margin-top: 8px; }
      .mod > button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 12px; border: 0; background: none; font: inherit; color: inherit; text-align: left; cursor: pointer; }
      .mod > button .n { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
      .mod > button .m { font-weight: 600; font-size: 13px; }
      .mod > button .c { color: #86868b; font-size: 12px; }
      .mod .body { padding: 0 12px 12px; }
      .row { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
      .row .x { font-size: 18px; }
      .lbl { display: flex; gap: 6px; font-size: 11px; color: #86868b; margin-top: 4px; }
      .lbl span:first-child { flex: 1 1 auto; }
      .lbl span:not(:first-child) { width: 52px; text-align: right; }
      .lbl span:last-child { width: 18px; }
      .lateinfo { font-size: 12px; color: #6e6e73; margin: 4px 0 2px; }
      .lateinfo label { display: flex; align-items: center; gap: 6px; margin-top: 4px; color: #1d1d1f; cursor: pointer; }
      .small { margin-top: 8px; padding: 6px 12px; border: 0; border-radius: 999px; background: #f2f2f5; font: inherit; font-size: 12px; font-weight: 500; cursor: pointer; }
      .small:hover { background: #e8e8ed; }
      .note2 { font-size: 12px; color: #6e6e73; margin-top: 6px; }
      details { margin-top: 16px; border-top: 1px solid #ececf0; padding-top: 12px; }
      summary { cursor: pointer; font-weight: 600; font-size: 13px; }
      .rule { display: flex; gap: 8px; align-items: flex-start; margin-top: 8px; font-size: 12px; cursor: pointer; }
      .rule b { display: block; font-size: 13px; }
      .rule q { display: block; color: #6e6e73; margin-top: 2px; }
      .grid { display: grid; grid-template-columns: 1fr auto; gap: 6px 10px; align-items: center; font-size: 13px; margin-top: 8px; }
      .drop { display: block; margin-top: 10px; padding: 14px; border-radius: 12px; background: #fafafb; box-shadow: inset 0 0 0 1px #ececf0; text-align: center; font-size: 13px; color: #6e6e73; cursor: pointer; }
      .drop:hover { background: #f2f2f5; }
      [hidden] { display: none !important; }
    </style>
    <div class="panel" role="status" aria-live="polite">
      <div class="head"><div class="title"><span class="dot"></span>Gradewise</div><button class="x" aria-label="Close">&times;</button></div>
      <div class="module"></div>
      <div class="choose" hidden><div class="ask">Which marks would you like?</div><div class="opts"></div></div>
      <div class="work">
        <div class="status">Getting ready...</div>
        <div class="bar"><div class="fill"></div></div>
        <div class="meta"><span class="count"></span><span class="file"></span></div>
        <p class="note keep" hidden>Keep this tab open while your marks are collected.</p>
      </div>
      <div class="results" hidden></div>
      <button class="action go" hidden>Save to Gradewise</button>
      <button class="action main">Cancel</button>
    </div>`;

  const $ = s => shadow.querySelector(s);
  const ui = {
    status: t => { $('.status').textContent = t; },
    progress: p => { $('.fill').style.width = Math.max(0, Math.min(100, p)) + '%'; },
    count: t => { $('.count').textContent = t; },
    file: t => { $('.file').textContent = t; },
    scope: t => { $('.module').textContent = t; }
  };
  let cancelled = false;
  let finished = false;
  const close = () => host.remove();
  const finish = (message, state) => {
    finished = true;
    $('.keep').hidden = true;
    ui.status(message);
    ui.file('');
    if (state) $('.panel').classList.add(state);
    $('.main').textContent = 'Close';
  };
  $('.x').onclick = () => { cancelled = true; close(); };
  $('.main').onclick = () => {
    if (finished || !$('.choose').hidden) return close();
    cancelled = true;
    ui.status('Cancelling...');
  };
  const check = () => { if (cancelled) throw new Error('cancelled'); };

  const choose = options => new Promise(ok => {
    $('.work').hidden = true;
    $('.choose').hidden = false;
    $('.main').hidden = true;
    options.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'opt' + (i === 0 ? ' first' : '');
      b.textContent = o.label;
      b.onclick = () => { $('.choose').hidden = true; $('.work').hidden = false; $('.main').hidden = false; $('.keep').hidden = false; ok(o.value); };
      $('.opts').appendChild(b);
    });
  });

  // Helpers
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();
  const getDoc = async url => new DOMParser().parseFromString(await (await fetch(url, { credentials: 'include' })).text(), 'text/html');
  const main = doc => doc.querySelector('#region-main') || doc.body || doc;
  const ajax = async (methodname, args) => {
    const res = await fetch(`${M.cfg.wwwroot}/lib/ajax/service.php?sesskey=${M.cfg.sesskey}&info=${methodname}`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ index: 0, methodname, args }])
    });
    const out = await res.json();
    if (!Array.isArray(out) || out[0].error) throw new Error((out[0] && out[0].exception && out[0].exception.message) || 'Moodle did not respond');
    return out[0].data;
  };
  const cmidOf = href => { const m = /[?&]id=(\d+)/.exec(href || ''); return m ? m[1] : null; };
  const pct = s => { const m = /(-?\d+(?:\.\d+)?)\s*%/.exec(s || ''); return m ? Number(m[1]) : null; };
  // "68.00 / 100.00", "73/100" or "68.00" (out of 100)
  const score = s => {
    const m = /(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(s || '');
    if (m && Number(m[2]) > 0) return Math.round(Number(m[1]) / Number(m[2]) * 1000) / 10;
    const p = pct(s);
    return p;
  };
  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  // Moodle and Turnitin dates: "Friday, 13 February 2026, 11:59 PM", "13 Feb 2026 - 23:59", "19/02/26, 23:28"
  const when = s => {
    s = clean(s);
    let m = /(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})/.exec(s);
    if (m) { const y = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]); return new Date(y, m[2] - 1, m[1], m[4], m[5]).toISOString(); }
    m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*,?\s+(\d{4})(?:[,\s-]+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i.exec(s);
    if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
      let h = Number(m[4] || 23), min = Number(m[5] || 59);
      if (m[6]) { h = h % 12 + (/pm/i.test(m[6]) ? 12 : 0); }
      return new Date(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]), h, min).toISOString();
    }
    return null;
  };
  const rowValue = (root, label) => {
    for (const th of root.querySelectorAll('th, td.cell.c0')) {
      if (clean(th.textContent).toLowerCase() === label) return th.nextElementSibling || th.parentElement.querySelector('td:last-child');
    }
    return null;
  };
  // Academic year from a module's start date, or from codes such as A25-26 in its name
  const yearOf = c => {
    const n = /\bA?(\d{2})[-/](\d{2})\b/.exec(c.fullname || '');
    if (n && Number(n[2]) === (Number(n[1]) + 1) % 100) return `20${n[1]}-${n[2]}`;
    if (c.startdate) {
      const d = new Date(c.startdate * 1000), y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
      return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
    }
    return 'Unknown year';
  };

  // ---------- Working out your classification ----------

  const num = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
  const r1 = n => Math.round(n * 10) / 10;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const st = { modules: [], map: {}, w: [33, 67], open: {}, found: [],
    rules: { amt: '', unit: 'marks', per: 'calendar', zero: '', cap: '', floor: '', bounds: [70, 60, 50, 40] } };
  const NAMES = ['a First', 'a 2:1', 'a 2:2', 'a Third'];
  const CLASS = ['First', '2:1', '2:2', 'Third'];

  const workingDays = (due, sub) => {
    const d = new Date(due), end = new Date(sub);
    let n = 0;
    while (d < end) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n++; }
    return Math.max(1, n);
  };
  const daysLate = it => !it.lateHours ? 0 : st.rules.per === 'working' && it.due && it.submitted ? workingDays(it.due, it.submitted) : Math.ceil(it.lateHours / 24);
  const hasRules = () => ['amt', 'zero', 'cap', 'floor'].some(k => num(st.rules[k]) !== null);
  const penalty = it => {
    const days = daysLate(it), r = st.rules, mark = num(it.mark), unit = r.per === 'working' ? 'working day' : 'day';
    if (!days) return null;
    const head = `${plural(days, unit)} late`;
    if (mark === null || !hasRules()) return { mark: null, text: head + (mark === null ? '.' : '. Add your late penalty rules to see the penalty.') };
    const zero = num(r.zero), amt = num(r.amt), cap = num(r.cap), floor = num(r.floor);
    if (zero !== null && days > zero) return { mark: 0, text: `${head}, more than ${plural(zero, unit)}, so the mark becomes 0.` };
    let out = mark;
    const why = [];
    if (amt) { const cut = r.unit === 'percent' ? mark * amt / 100 * days : amt * days; out = Math.max(0, mark - cut); why.push(`minus ${r1(cut)}`); }
    if (floor !== null && mark >= floor && out < floor) { out = floor; why.push(`not below ${floor}`); }
    if (cap !== null && out > cap) { out = cap; why.push(`capped at ${cap}`); }
    return { mark: r1(out), text: `${head}: ${why.join(', ')}. ${r1(mark)} becomes ${r1(out)}.` };
  };
  const effective = it => { const m = num(it.mark); if (m === null) return null; if (it.apply) { const p = penalty(it); if (p && p.mark !== null) return p.mark; } return m; };
  const moduleMark = mod => {
    const marked = mod.items.filter(it => effective(it) !== null);
    if (!marked.length) return null;
    const weighted = marked.every(it => num(it.weight) > 0);
    let sum = 0, ws = 0;
    marked.forEach(it => { const w = weighted ? num(it.weight) : 1; sum += w * effective(it); ws += w; });
    return r1(sum / ws);
  };
  const compute = () => {
    let wsum = 0, A = 0, B = 0, cur = 0, curW = 0;
    [0, 1].forEach(y => {
      const w = Math.max(0, num(st.w[y]) || 0);
      let T = 0, sum = 0, dc = 0;
      st.modules.filter(m => st.map[m.year] === String(y)).forEach(m => {
        const c = num(m.credits) || 15, mk = moduleMark(m);
        T += c;
        if (mk !== null) { sum += c * mk; dc += c; }
      });
      if (!w || !T) return;
      wsum += w; A += w * sum / T; B += w * (T - dc) / T;
      if (dc) { cur += w * sum / dc; curW += w; }
    });
    return { cur: curW ? cur / curW : null, A: wsum ? A / wsum : 0, B: wsum ? B / wsum : 0, ok: wsum > 0 };
  };

  // ---------- Your university's rules ----------

  const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fourteen: 14, fifteen: 15, twenty: 20 };
  const toNum = x => NUMW[String(x).toLowerCase()] !== undefined ? NUMW[String(x).toLowerCase()] : Number(x);
  const NUM = '(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|fourteen|fifteen|twenty)';
  const findRules = text => {
    const found = [], seenKey = {};
    const add = (key, value, label, quote) => { if (!seenKey[key]) { seenKey[key] = 1; found.push({ key, value, label, quote, use: true }); } };
    text.replace(/\r/g, '').split(/(?<=[.;!?])\s+|\n+/).map(x => x.replace(/\s+/g, ' ').trim()).filter(x => x.length > 8 && x.length < 600).forEach(s => {
      const late = /\blate|deduct|penal|deadline|extension/i.test(s);
      let m;
      if (late && (m = /(\d+(?:\.\d+)?)\s*(%|per\s?cent|percentage points?|marks?)\b[^.]{0,90}?\b(?:per|each|every|a|for each|for every)\s+(working\s+|calendar\s+)?day/i.exec(s))) {
        const unit = /of the (?:mark|grade) (?:awarded|achieved|obtained|given)|of the (?:student|original)/i.test(s) && !/mark|point/i.test(m[2]) ? 'percent' : 'marks';
        const per = /working/i.test(m[3] || '') || /working day/i.test(s) ? 'working' : 'calendar';
        add('penalty', { amt: Number(m[1]), unit, per }, `Deduct ${unit === 'percent' ? m[1] + '% of the mark' : m[1] + ' marks'} per ${per === 'working' ? 'working day' : 'day'} late`, s);
      }
      if (late && ((m = new RegExp('(?:after|more than|beyond|over|exceeding|later than)\\s+' + NUM + '\\s+(working\\s+|calendar\\s+)?days?[^.]{0,140}?(?:zero|\\b0\\s*%|mark of 0|not be marked|not be accepted|not be assessed|will fail|a fail)', 'i').exec(s)) ||
          (m = new RegExp('(?:zero|\\b0\\s*%|mark of 0)[^.]{0,100}?(?:after|more than|beyond|over|exceeding)\\s+' + NUM + '\\s+(working\\s+|calendar\\s+)?days?', 'i').exec(s)))) {
        add('zero', toNum(m[1]), `Late work gets 0 after ${toNum(m[1])} ${/working/i.test(m[2] || '') ? 'working days' : 'days'}`, s);
      }
      if (late && (m = /(?:not|never)\s+(?:reduce|take|bring)[^.]{0,60}?below\s+(?:the pass mark|a pass|(\d{2}))/i.exec(s))) add('floor', m[1] ? Number(m[1]) : 40, `A passing mark never drops below ${m[1] || 40}`, s);
      if (late && (m = /(?:capped|limited|restricted)\s+(?:at|to)\s+(?:a (?:maximum )?mark of\s+|the pass mark(?: of)?\s*)?(\d{2})?/i.exec(s))) {
        const cap = m[1] ? Number(m[1]) : /pass mark/i.test(s) ? 40 : null;
        if (cap !== null) add('cap', cap, `Late work is capped at ${cap}`, s);
      }
      if (/weight|count|contribut|ratio/i.test(s)) {
        const roles = { second: null, final: null };
        const rx = /(\d{1,3}(?:\.\d+)?)\s*%[^.%]{0,60}?\b(second|final|third|fourth|level\s*[456]|year\s*[234]|stage\s*[234])\b|\b(second|final|third|fourth|level\s*[456]|year\s*[234]|stage\s*[234])\b(?:\s*year)?[^.%\d]{0,60}?(\d{1,3}(?:\.\d+)?)\s*%/gi;
        let w;
        while ((w = rx.exec(s))) {
          const val = Number(w[1] || w[4]), who = (w[2] || w[3]).toLowerCase().replace(/\s+/g, ' ');
          const role = /second|level 5|year 2|stage 2/.test(who) ? 'second' : 'final';
          if (val > 0 && val <= 100 && roles[role] === null) roles[role] = val;
        }
        if ((m = /\b(1|one)\s*:\s*(2|3|two|three)\b/i.exec(s)) && roles.second === null) { const k = toNum(m[2]); roles.second = r1(100 / (1 + k)); roles.final = r1(100 * k / (1 + k)); }
        if (roles.second !== null && roles.final !== null) add('weights', [roles.second, roles.final], `Second year ${roles.second}%, final year ${roles.final}%`, s);
      }
      [['first(?:[- ]class)?', 0], ['upper second|2[.:]1', 1], ['lower second|2[.:]2', 2], ['third(?:[- ]class)?', 3]].forEach(([n, i]) => {
        const a = new RegExp('\\b(?:' + n + ')\\b(?: class)?(?: honours)?[^.\\d]{0,40}?(\\d{2})(?:\\.0+)?\\s*%?\\s*(?:and|or|\\+|-|to|\\u2013)', 'i').exec(s) ||
          new RegExp('(\\d{2})(?:\\.0+)?\\s*%?\\s*(?:and above|or above|or more|\\+|-\\s*\\d{2,3}|to \\d{2,3})[^.]{0,25}?\\b(?:' + n + ')\\b', 'i').exec(s);
        if (a && Number(a[1]) >= 30 && Number(a[1]) <= 85) add('bound' + i, Number(a[1]), `${CLASS[i]} from ${a[1]}%`, s);
      });
    });
    return found;
  };
  const loadScript = src => new Promise((ok, fail) => {
    const saved = window.define;
    window.define = undefined; // keep Moodle's loader from claiming the library
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => { window.define = saved; ok(); };
    s.onerror = () => { window.define = saved; fail(new Error('Could not load a reader for this file.')); };
    document.head.appendChild(s);
  });
  const textOf = async file => {
    if (/\.pdf$/i.test(file.name)) {
      if (!window.pdfjsLib) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) pages.push((await (await pdf.getPage(i)).getTextContent()).items.map(it => it.str + (it.hasEOL ? '\n' : '')).join(''));
      return pages.join('\n');
    }
    if (/\.docx$/i.test(file.name)) {
      if (!window.JSZip) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
      const xml = await (await window.JSZip.loadAsync(file)).file('word/document.xml').async('string');
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
      return [...doc.getElementsByTagNameNS(W, 'p')].map(p => [...p.getElementsByTagNameNS(W, 't')].map(t => t.textContent).join('')).join('\n');
    }
    return file.text();
  };

  // ---------- The result view ----------

  const showResults = modules => {
    st.modules = modules;
    const years = [...new Set(modules.map(m => m.year))].sort();
    years.forEach((y, i) => { st.map[y] = i === years.length - 1 ? '1' : i === years.length - 2 ? '0' : '-1'; });
    modules.forEach(m => m.items.forEach(it => { it.apply = false; }));
    finished = true;
    $('.keep').hidden = true;
    $('.work').hidden = true;
    $('.panel').classList.add('wide');
    $('.results').hidden = false;
    $('.go').hidden = false;
    $('.main').textContent = 'Close';
    render();
  };

  const render = () => {
    const r = compute(), b = st.rules.bounds.map(Number);
    const cls = r.cur === null ? null : b.findIndex(x => r.cur >= x);
    let h = '';
    h += `<div class="sub">Weighted average so far</div><div class="big"><b>${r.cur === null ? '&ndash;' : r1(r.cur).toFixed(1) + '%'}</b>` +
      `<span class="pill amber">${r.cur === null ? 'No marks yet' : cls === -1 ? 'Below a pass' : CLASS[cls]}</span></div>`;
    if (r.ok && r.B > 0.0001) {
      h += '<div class="need">' + b.map((x, i) => {
        const need = (x - r.A) / r.B;
        return `<div><span>Needed for ${NAMES[i]}</span><span>${need <= 0 ? 'Secured' : need > 100 ? 'Out of reach' : r1(need).toFixed(1) + '%'}</span></div>`;
      }).join('') + '</div><div class="note2">Average needed across the credits still to come.</div>';
    }
    h += '<h4>Years</h4>' + Object.keys(st.map).sort().reverse().map(y => `<div class="yr"><span>${esc(y)}</span><select data-year="${esc(y)}">` +
      [['1', 'Final year'], ['0', 'Second year'], ['-1', 'Does not count']].map(([v, t]) => `<option value="${v}"${st.map[y] === v ? ' selected' : ''}>${t}</option>`).join('') + '</select></div>').join('') +
      `<div class="yr"><span>Weighting, second : final</span><span><input class="in" data-w="0" value="${esc(st.w[0])}"> : <input class="in" data-w="1" value="${esc(st.w[1])}"></span></div>`;
    h += '<h4>Modules</h4>' + st.modules.map((m, mi) => {
      const mk = moduleMark(m), open = st.open[mi], late = m.items.some(it => it.lateHours);
      let body = '';
      if (open) {
        body = `<div class="body"><div class="row"><span class="sub" style="flex:1">Credits</span><input class="in" data-m="${mi}" data-mk="credits" value="${esc(m.credits || '')}" placeholder="15"></div>` +
          '<div class="lbl"><span>Assessment</span><span>Weight</span><span>Mark</span><span></span></div>' +
          m.items.map((it, ii) => {
            const p = penalty(it);
            const extra = [it.similarity != null ? `Turnitin, ${it.similarity}% similarity` : '', it.submitted ? 'submitted ' + new Date(it.submitted).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''].filter(Boolean).join(', ');
            return `<div class="row"><input class="in name" data-m="${mi}" data-i="${ii}" data-ik="name" value="${esc(it.name)}">` +
              `<input class="in" data-m="${mi}" data-i="${ii}" data-ik="weight" value="${esc(it.weight == null ? '' : it.weight)}" placeholder="=">` +
              `<input class="in" data-m="${mi}" data-i="${ii}" data-ik="mark" value="${esc(it.mark == null ? '' : it.mark)}" placeholder="-">` +
              `<button class="x" data-del="${mi}.${ii}" aria-label="Remove">&times;</button></div>` +
              (extra ? `<div class="lateinfo">${esc(extra)}</div>` : '') +
              (p ? `<div class="lateinfo"><span class="pill late">Late</span> ${esc(p.text)}${p.mark !== null ? `<label><input type="checkbox" data-pen="${mi}.${ii}"${it.apply ? ' checked' : ''}>Apply this penalty</label>` : ''}</div>` : '');
          }).join('') +
          `<button class="small" data-add="${mi}">Add an assessment</button>` +
          (m.items.every(it => num(it.weight) > 0) ? '' : '<div class="note2">Weights not shown on Moodle, so assessments count equally until you enter them.</div>') + '</div>';
      }
      return `<div class="mod"><button data-open="${mi}"><span class="n">${esc(m.name)}</span>${late ? '<span class="pill late">Late</span>' : ''}<span class="m">${mk === null ? '&ndash;' : mk.toFixed(1)}</span></button>${body}</div>`;
    }).join('');
    h += `<details${st.rulesOpen ? ' open' : ''}><summary>Your university's rules</summary>` +
      '<label class="drop">Upload your degree regulations (PDF, Word or text)<input type="file" accept=".pdf,.docx,.txt" hidden data-rfile></label>' +
      `<div class="note2" data-rstatus>${esc(st.rstatus || '')}</div>` +
      (st.found.length ? st.found.map((f, i) => `<label class="rule"><input type="checkbox" data-use="${i}"${f.use ? ' checked' : ''}><span><b>${esc(f.label)}</b><q>${esc(f.quote.slice(0, 220))}</q></span></label>`).join('') + '<button class="small" data-apply>Use these rules</button>' : '') +
      '<div class="grid">' +
      `<span>Late penalty per day</span><span><input class="in" data-r="amt" value="${esc(st.rules.amt)}" placeholder="0"> <select data-r="unit"><option value="marks"${st.rules.unit === 'marks' ? ' selected' : ''}>marks</option><option value="percent"${st.rules.unit === 'percent' ? ' selected' : ''}>% of mark</option></select></span>` +
      `<span>Count</span><span><select data-r="per"><option value="calendar"${st.rules.per === 'calendar' ? ' selected' : ''}>every day</option><option value="working"${st.rules.per === 'working' ? ' selected' : ''}>working days</option></select></span>` +
      `<span>Mark becomes 0 after (days)</span><input class="in" data-r="zero" value="${esc(st.rules.zero)}">` +
      `<span>Late work capped at</span><input class="in" data-r="cap" value="${esc(st.rules.cap)}">` +
      `<span>A passing mark never drops below</span><input class="in" data-r="floor" value="${esc(st.rules.floor)}">` +
      CLASS.map((c, i) => `<span>${c} from</span><input class="in" data-b="${i}" value="${esc(st.rules.bounds[i])}">`).join('') +
      '</div><div class="note2">Moodle marks sometimes already include a late penalty. Only apply one if your mark has not been reduced.</div></details>';
    $('.results').innerHTML = h;
  };

  // Typing updates the numbers without rebuilding the field you are typing in
  const refresh = () => {
    const focused = shadow.activeElement;
    const key = focused && [...focused.attributes].filter(a => a.name.startsWith('data-')).map(a => `[${a.name}="${a.value}"]`).join('');
    render();
    if (key) { const el = $('.results').querySelector(key); if (el) { el.focus(); if (el.setSelectionRange && el.type !== 'number') el.setSelectionRange(el.value.length, el.value.length); } }
  };
  $('.results').addEventListener('input', e => {
    const t = e.target, d = t.dataset;
    if (d.ik) { const it = st.modules[d.m].items[d.i]; it[d.ik] = d.ik === 'name' ? t.value : (t.value === '' ? null : t.value); if (d.ik === 'name') return; }
    else if (d.mk) st.modules[d.m][d.mk] = t.value;
    else if (d.w) st.w[d.w] = t.value;
    else if (d.r) st.rules[d.r] = t.value;
    else if (d.b) st.rules.bounds[d.b] = t.value;
    else return;
    refresh();
  });
  $('.results').addEventListener('change', async e => {
    const t = e.target, d = t.dataset;
    if (d.year) { st.map[d.year] = t.value; render(); }
    else if (d.pen) { const [m, i] = d.pen.split('.'); st.modules[m].items[i].apply = t.checked; render(); }
    else if (d.use !== undefined) st.found[d.use].use = t.checked;
    else if (d.rfile !== undefined && t.files[0]) {
      st.rulesOpen = true;
      st.rstatus = `Reading ${t.files[0].name}...`; render();
      try {
        st.found = findRules(await textOf(t.files[0]));
        st.rstatus = st.found.length ? 'Gradewise found these rules. Untick any that are wrong.' : 'No rules were recognised. You can enter them below.';
      } catch (err) { st.rstatus = err.message; }
      render();
    }
  });
  $('.results').addEventListener('click', e => {
    const t = e.target.closest('button, summary');
    if (!t) return;
    const d = t.dataset;
    if (t.tagName === 'SUMMARY') { st.rulesOpen = !t.parentElement.open; return; }
    if (d.open !== undefined) { st.open[d.open] = !st.open[d.open]; render(); }
    else if (d.add !== undefined) { st.modules[d.add].items.push({ name: 'New assessment', weight: null, mark: null }); render(); }
    else if (d.del) { const [m, i] = d.del.split('.'); st.modules[m].items.splice(i, 1); render(); }
    else if (d.apply !== undefined) {
      st.found.filter(f => f.use).forEach(f => {
        if (f.key === 'penalty') Object.assign(st.rules, f.value);
        else if (f.key === 'weights') st.w = f.value.slice();
        else if (/^bound/.test(f.key)) st.rules.bounds[Number(f.key.slice(5))] = f.value;
        else st.rules[f.key] = f.value;
      });
      st.found = []; st.rstatus = 'Rules applied. Check them below.'; render();
    }
  });
  // Hand the finished marks to the Gradewise page, in the part of the address never sent to a server
  $('.go').onclick = () => {
    const years = [[], []];
    st.modules.forEach(m => { const y = st.map[m.year]; if (y === '0' || y === '1') { const mk = moduleMark(m); years[y].push({ name: m.name, credits: num(m.credits) || 15, mark: mk === null ? '' : mk }); } });
    const data = { v: 2, years, w: st.w.map(Number), bounds: st.rules.bounds.map(Number) };
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    let bin = '';
    bytes.forEach(x => { bin += String.fromCharCode(x); });
    window.open(`${GRADEWISE}#import=${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`, '_blank', 'noopener');
  };

  try {
    if (!window.M || !M.cfg || !M.cfg.wwwroot) {
      ui.progress(100);
      return finish('Open any page on your Moodle site while logged in, then click the bookmark again.', 'error');
    }

    const bodyCourse = (document.body.className.match(/\bcourse-(\d+)\b/) || [])[1];
    const courseId = Number(M.cfg.courseId || bodyCourse || 0);
    const inModule = courseId > 1;

    ui.status('Finding your modules');
    const enrolled = [];
    const seen = new Set();
    for (const classification of ['all', 'hidden']) {
      try {
        const data = await ajax('core_course_get_enrolled_courses_by_timeline_classification', { classification, limit: 0, offset: 0, sort: 'fullname' });
        (data.courses || []).forEach(c => { if (!seen.has(c.id)) { seen.add(c.id); enrolled.push(c); } });
      } catch (e) { if (classification === 'all' && !inModule) throw e; }
    }
    const options = [];
    if (inModule) options.push({ value: 'module', label: 'This module' });
    if (enrolled.length) options.push({ value: 'all', label: 'All modules' });
    if (!options.length) {
      ui.progress(100);
      return finish('No modules were found on your account.', 'error');
    }
    const scope = await choose(options);
    check();
    let courses = enrolled;
    if (scope === 'module') {
      const c = enrolled.find(x => Number(x.id) === courseId) || { id: courseId, fullname: clean(document.title) };
      courses = [c];
      ui.scope(clean(c.fullname));
    } else {
      ui.scope(`All modules (${courses.length})`);
    }

    // Turnitin keeps its own submissions table, loaded through Moodle
    const tiiPost = async data => {
      const res = await fetch(`${M.cfg.wwwroot}/mod/turnitintooltwo/ajax.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams(data)
      });
      return res.ok ? res.text() : '';
    };

    const modules = [];
    let items = 0;
    for (let i = 0; i < courses.length; i++) {
      check();
      const c = courses[i];
      const name = clean(c.fullname);
      ui.status('Collecting your marks');
      ui.count(`Module ${i + 1} of ${courses.length}`);
      ui.file(name);
      ui.progress(5 + (i / courses.length) * 90);
      const mod = { name, short: clean(c.shortname), year: yearOf(c), credits: Number((/(\d+)\s*Cr\b/i.exec(name) || [])[1]) || null, total: null, items: [] };
      const byCm = new Map();

      // 1. The gradebook, if your university shows it: weights and released marks
      try {
        const g = await getDoc(`${M.cfg.wwwroot}/grade/report/user/index.php?id=${c.id}`);
        g.querySelectorAll('table.user-grade tr').forEach(tr => {
          const nameCell = tr.querySelector('.column-itemname');
          if (!nameCell) return;
          const label = clean(nameCell.textContent);
          const grade = tr.querySelector('.column-percentage') ? pct(tr.querySelector('.column-percentage').textContent) : score(tr.querySelector('.column-grade') && tr.querySelector('.column-grade').textContent);
          if (/course total/i.test(label)) { if (grade !== null) mod.total = grade; return; }
          const link = nameCell.querySelector('a[href*="/mod/"]');
          if (!link) return;
          const w = tr.querySelector('.column-weight') ? pct(tr.querySelector('.column-weight').textContent) : null;
          const item = { name: label, kind: /turnitintooltwo/.test(link.href) ? 'turnitin' : /\/mod\/assign\//.test(link.href) ? 'assignment' : 'other', weight: w, mark: grade };
          byCm.set(cmidOf(link.href), item);
          mod.items.push(item);
        });
      } catch (e) { console.warn('Gradewise could not read the gradebook for', name, e); }

      const take = (cmid, label, kind) => {
        if (byCm.has(cmid)) return byCm.get(cmid);
        const item = { name: label, kind, weight: null, mark: null };
        byCm.set(cmid, item);
        mod.items.push(item);
        return item;
      };

      // 2. Moodle assignments: grade, due date and whether it was late
      try {
        const idx = await getDoc(`${M.cfg.wwwroot}/mod/assign/index.php?id=${c.id}`);
        const links = [...new Map([...main(idx).querySelectorAll('a[href*="/mod/assign/view.php?id="]')].map(a => [cmidOf(a.href), a])).values()];
        for (const a of links) {
          check();
          const item = take(cmidOf(a.href), clean(a.textContent), 'assignment');
          ui.file(item.name);
          const doc = main(await getDoc(a.href));
          const due = rowValue(doc, 'due date');
          const status = rowValue(doc, 'submission status');
          const remaining = rowValue(doc, 'time remaining');
          const modified = rowValue(doc, 'last modified');
          const fb = doc.querySelector('.feedback') || doc;
          const grade = rowValue(fb, 'grade');
          if (item.mark === null && grade) item.mark = score(grade.textContent);
          if (due) item.due = when(due.textContent);
          if (status && /submitted|graded/i.test(status.textContent) && modified) item.submitted = when(modified.textContent);
          const late = remaining && /submitted\s+(.+?)\s+late/i.exec(remaining.textContent);
          if (late) {
            const d = /(\d+)\s*day/.exec(late[1]), h = /(\d+)\s*hour/.exec(late[1]), m = /(\d+)\s*min/.exec(late[1]);
            item.lateHours = (d ? Number(d[1]) * 24 : 0) + (h ? Number(h[1]) : 0) + (m ? Number(m[1]) / 60 : 0);
          }
        }
      } catch (e) { console.warn('Gradewise could not read assignments for', name, e); }

      // 3. Turnitin assignments: grade, similarity, due date and submission time
      try {
        const idx = await getDoc(`${M.cfg.wwwroot}/mod/turnitintooltwo/index.php?id=${c.id}`);
        const links = [...new Map([...main(idx).querySelectorAll('a[href*="/mod/turnitintooltwo/view.php?id="]')].map(a => [cmidOf(a.href), a])).values()];
        for (const a of links) {
          check();
          const cmid = cmidOf(a.href);
          ui.file(clean(a.textContent));
          const doc = await getDoc(`${M.cfg.wwwroot}/mod/turnitintooltwo/view.php?id=${cmid}`);
          const assignment = clean(doc.querySelector('#assignment_id') && doc.querySelector('#assignment_id').textContent);
          if (!assignment) continue;
          // Parts table: title, start date, due date, post date, marks available
          const dues = {};
          doc.querySelectorAll('table tr').forEach(tr => {
            const cells = [...tr.querySelectorAll('td')].map(td => clean(td.textContent));
            if (cells.length >= 4 && when(cells[2])) dues[cells[0]] = when(cells[2]);
          });
          const parts = [...new Set([...doc.querySelectorAll('[id^="tabs-"], table.mod_turnitintooltwo_submissions_data_table[id]')]
            .map(el => (el.id.match(/(\d+)$/) || [])[1]).filter(Boolean))];
          const dueList = Object.values(dues);
          for (const [n, part] of parts.entries()) {
            let rows = [];
            try {
              rows = JSON.parse(await tiiPost({ action: 'get_submissions', assignment, part, start: 0, refresh_requested: 0, request_source: 'initial_load', total: 0, sesskey: M.cfg.sesskey })).aaData || [];
            } catch (e) { rows = []; }
            for (const cells of rows) {
              const row = document.createElement('div');
              row.innerHTML = (Array.isArray(cells) ? cells : Object.values(cells)).join('</div><div>');
              row.querySelectorAll('noscript, form, input, script').forEach(el => el.remove());
              const title = clean(row.querySelector('.submission_title') && row.querySelector('.submission_title').textContent);
              if (!title && !row.querySelector('[id^="downloadoriginal_"]')) continue;
              const label = clean(a.textContent) + (parts.length > 1 ? ` (part ${n + 1})` : '');
              const item = parts.length > 1 ? take(`${cmid}-${part}`, label, 'turnitin') : take(cmid, label, 'turnitin');
              item.kind = 'turnitin';
              item.title = title;
              const g = clean((row.querySelector('.grade') ? row.querySelector('.grade').textContent : '') + (row.querySelector('.grademark_grade') ? row.querySelector('.grademark_grade').textContent : ''));
              if (item.mark === null && /\d/.test(g)) item.mark = score(g);
              const sim = row.querySelector('.origreport_score');
              if (sim && /\d/.test(sim.textContent)) item.similarity = pct(sim.textContent);
              const sub = [...row.children].map(x => clean(x.textContent)).find(t => /^\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}/.test(t));
              if (sub) item.submitted = when(sub);
              item.due = dueList[n] || dueList[0] || null;
              if (row.querySelector('.late_submission') && item.submitted && item.due) item.lateHours = Math.max(0, (new Date(item.submitted) - new Date(item.due)) / 36e5);
            }
          }
        }
      } catch (e) { console.warn('Gradewise could not read Turnitin for', name, e); }

      // Work out lateness from dates where Moodle did not state it
      mod.items.forEach(it => {
        if (it.lateHours === undefined && it.due && it.submitted) {
          const h = (new Date(it.submitted) - new Date(it.due)) / 36e5;
          if (h > 0) it.lateHours = h;
        }
        if (it.lateHours !== undefined) it.lateHours = Math.round(it.lateHours * 10) / 10;
      });
      mod.items = mod.items.filter(it => it.mark !== null || it.submitted || it.due);
      if (mod.items.length) { modules.push(mod); items += mod.items.length; }
    }

    if (!modules.length) {
      ui.progress(100);
      return finish('No marked or submitted assessments were found.', 'error');
    }
    ui.progress(100);
    showResults(modules);
  } catch (e) {
    if (cancelled) finish('Cancelled. Nothing was collected.');
    else { console.error(e); finish(`Something went wrong: ${e.message}`, 'error'); }
  }
})();
