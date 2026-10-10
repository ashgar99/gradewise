// Gradewise for Moodle: collect your marks and open them in Gradewise
// Reads your assignment grades, Turnitin grades, due dates and submission times
// from Moodle 4, plus assessment weights from the gradebook where your university
// shows them, then opens Gradewise with everything filled in.
// Nothing is uploaded: the marks travel in the address after the # sign, which
// browsers never send to a server, and Gradewise removes them as soon as it opens.
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
      .panel { width: 320px; padding: 20px; border-radius: 18px; background: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.16); color: #1d1d1f;
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
      <button class="action go" hidden>Open in Gradewise</button>
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

    // Hand everything to Gradewise in the part of the address that is never sent to a server
    const data = { v: 1, site: location.hostname, at: new Date().toISOString(), modules };
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    const url = `${GRADEWISE}#import=${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
    ui.progress(100);
    finish(`Done. Found ${items} assessment${items === 1 ? '' : 's'} in ${modules.length} module${modules.length === 1 ? '' : 's'}.`, 'done');
    const go = $('.go');
    go.hidden = false;
    go.onclick = () => { window.open(url, '_blank', 'noopener'); close(); };
  } catch (e) {
    if (cancelled) finish('Cancelled. Nothing was collected.');
    else { console.error(e); finish(`Something went wrong: ${e.message}`, 'error'); }
  }
})();
