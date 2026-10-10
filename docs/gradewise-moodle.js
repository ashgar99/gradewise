// Gradewise: marks imported from Moodle, your university's rules and late penalties.
// Everything runs in the browser; nothing is uploaded.
window.GradewiseExtras = function (g) {
  var state = g.state, $ = g.$, esc = g.esc, num = g.num, round1 = g.round1;
  var LIBS = {
    pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    pdfjsWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
  };
  function save() { try { localStorage.setItem('gradewise.v1', JSON.stringify(state)); } catch (e) {} }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  // ---------- Late penalties ----------

  function workingDaysLate(due, submitted) {
    var d = new Date(due), end = new Date(submitted), n = 0;
    if (!(end > d)) return 0;
    while (d < end) {
      d.setDate(d.getDate() + 1);
      var day = d.getDay();
      if (day !== 0 && day !== 6) n++;
    }
    return Math.max(1, n);
  }
  function daysLate(item) {
    if (!item.lateHours) return 0;
    if (state.rules.per === 'working' && item.due && item.submitted) return workingDaysLate(item.due, item.submitted);
    return Math.ceil(item.lateHours / 24);
  }
  function hasRules() { var r = state.rules; return num(r.amt) !== null || num(r.zero) !== null || num(r.cap) !== null || num(r.floor) !== null; }
  // Returns { mark, text } for a late item
  function penalty(item) {
    var days = daysLate(item), r = state.rules, mark = num(item.mark);
    var dayWord = r.per === 'working' ? 'working day' : 'day';
    if (!days) return null;
    var head = plural(days, dayWord) + ' late';
    if (mark === null) return { mark: null, text: head + '.' };
    if (!hasRules()) return { mark: mark, text: head + '. Add your late penalty rules below to see the penalty.' };
    var zero = num(r.zero), amt = num(r.amt), cap = num(r.cap), floor = num(r.floor);
    if (zero !== null && days > zero) return { mark: 0, text: head + ', more than ' + plural(zero, dayWord) + ', so the mark becomes 0.' };
    var out = mark, parts = [];
    if (amt !== null && amt > 0) {
      var cut = r.unit === 'percent' ? mark * amt / 100 * days : amt * days;
      out = Math.max(0, mark - cut);
      parts.push((r.unit === 'percent' ? amt + '% of the mark' : plural(amt, 'mark')) + ' per ' + dayWord + ' takes off ' + round1(cut) + ' marks');
    }
    if (floor !== null && mark >= floor && out < floor) { out = floor; parts.push('a passing mark cannot drop below ' + floor); }
    if (cap !== null && out > cap) { out = cap; parts.push('late work is capped at ' + cap); }
    return { mark: round1(out), text: head + (parts.length ? ': ' + parts.join(', and ') : '') + '. ' + round1(mark) + ' becomes ' + round1(out) + '.' };
  }
  function effective(item) {
    var m = num(item.mark);
    if (m === null) return null;
    if (item.applyPenalty) { var p = penalty(item); if (p && p.mark !== null) return p.mark; }
    return m;
  }
  // Module mark from its assessments: weighted if weights are known, otherwise equal
  function moduleMark(mod) {
    var marked = mod.items.filter(function (it) { return effective(it) !== null; });
    if (!marked.length) return { mark: null, note: 'No marks released yet.' };
    var weighted = marked.every(function (it) { return num(it.weight) !== null && num(it.weight) > 0; });
    var sum = 0, wsum = 0;
    marked.forEach(function (it) { var w = weighted ? num(it.weight) : 1; sum += w * effective(it); wsum += w; });
    var all = marked.length === mod.items.length;
    var note = (weighted ? 'Weighted by each assessment’s weight.' : 'No weights shown on Moodle, so assessments count equally. Enter weights to change this.') +
      (all ? '' : ' Based on ' + marked.length + ' of ' + mod.items.length + ' assessments so far.');
    return { mark: round1(sum / wsum), note: note, complete: all };
  }

  // ---------- Import from Moodle ----------

  function readImport() {
    var m = /#import=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (!m) return;
    try {
      var b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      var bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var data = JSON.parse(new TextDecoder().decode(bytes));
      if (!data || !data.modules) throw new Error('empty');
      var years = {};
      data.modules.forEach(function (mod) { years[mod.year] = true; });
      var sorted = Object.keys(years).sort();
      // Most recent year with marks is the final year, the one before is the second year
      var map = {};
      sorted.forEach(function (y, i) { map[y] = i === sorted.length - 1 ? '1' : i === sorted.length - 2 ? '0' : '-1'; });
      data.map = map;
      data.modules.forEach(function (mod) { mod.items.forEach(function (it) { it.applyPenalty = false; }); });
      state.imp = data;
      save();
    } catch (e) {
      console.error(e);
      alertBox('Gradewise could not read the marks from Moodle. Please click the bookmark again.');
    }
    // Remove the marks from the address bar and history
    history.replaceState(null, '', location.pathname + location.search + '#app');
  }
  function alertBox(text) { var n = $('import-msg'); if (n) { n.hidden = false; n.textContent = text; } }

  function renderReview() {
    var box = $('review');
    var data = state.imp;
    if (!data) { box.hidden = true; return; }
    box.hidden = false;
    var years = {};
    data.modules.forEach(function (mod, i) { (years[mod.year] = years[mod.year] || []).push(i); });
    var when = new Date(data.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    var html = '<h3>Your marks from Moodle</h3><p class="lead">Imported from ' + esc(data.site) + ' on ' + when + '. Check each module, then choose which year counts as your second and final year.</p>';
    Object.keys(years).sort().reverse().forEach(function (y) {
      html += '<div class="ygroup"><div class="year-head"><h3>' + esc(y) + '</h3><div class="field sm" style="flex:0 0 190px"><label>Counts as</label><select data-ymap="' + esc(y) + '">' +
        [['1', 'Final year'], ['0', 'Second year'], ['-1', 'Does not count']].map(function (o) { return '<option value="' + o[0] + '"' + (data.map[y] === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
        '</select></div></div>';
      years[y].forEach(function (mi) {
        var mod = data.modules[mi], mm = moduleMark(mod);
        html += '<div class="imod" data-m="' + mi + '"><div class="imod-head"><b>' + esc(mod.name) + '</b>' +
          '<label class="cred">Credits <input type="number" min="0" step="5" data-mk="credits" value="' + esc(mod.credits || '') + '" placeholder="15"></label>' +
          '<span class="pill">' + (mm.mark === null ? 'No marks yet' : mm.mark.toFixed(1) + '%') + '</span>' +
          '<button class="b icon" type="button" data-delmod="' + mi + '" aria-label="Remove module" title="Remove">&times;</button></div>' +
          '<div class="items"><div class="item item-head"><span>Assessment</span><span>Weight %</span><span>Mark %</span><span></span></div>' +
          mod.items.map(function (it, ii) {
            var p = penalty(it), sim = num(it.similarity);
            var info = [];
            if (it.kind === 'turnitin') info.push('Turnitin' + (sim !== null ? ', ' + sim + '% similarity' : ''));
            if (it.submitted) info.push('Submitted ' + new Date(it.submitted).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
            var late = p ? '<div class="late"><span class="pill warn">Late</span><span class="why">' + esc(p.text) + '</span>' +
              (p.mark !== null && hasRules() ? ' <label class="check sm"><input type="checkbox" data-pen="' + ii + '"' + (it.applyPenalty ? ' checked' : '') + '><span>Apply this penalty</span></label>' : '') + '</div>' : '';
            return '<div class="item" data-i="' + ii + '">' +
              '<input type="text" data-ik="name" aria-label="Assessment" value="' + esc(it.name) + '">' +
              '<input type="number" data-ik="weight" aria-label="Weight" min="0" max="100" step="1" placeholder="Equal" value="' + esc(it.weight == null ? '' : it.weight) + '">' +
              '<input type="number" data-ik="mark" aria-label="Mark" min="0" max="100" step="0.1" placeholder="To come" value="' + esc(it.mark == null ? '' : it.mark) + '">' +
              '<button class="b icon" type="button" data-delitem="' + ii + '" aria-label="Remove assessment" title="Remove">&times;</button>' +
              (info.length ? '<small class="info">' + esc(info.join(' · ')) + '</small>' : '') + late +
              '</div>';
          }).join('') +
          '</div><div class="imod-foot"><button class="b ghost" type="button" data-additem="' + mi + '">Add an assessment</button><span class="note">' + esc(mm.note) + '</span></div></div>';
      });
      html += '</div>';
    });
    html += '<p class="note">Moodle sometimes shows marks that already include a late penalty. Only apply a penalty if your mark has not already been reduced.</p>' +
      '<div class="actions"><button class="b primary" id="use" type="button">Use these marks</button><button class="b ghost" id="discard" type="button">Clear the import</button></div>';
    box.innerHTML = html;
  }

  function useMarks() {
    var data = state.imp, out = [[], []];
    data.modules.forEach(function (mod) {
      var y = data.map[mod.year];
      if (y !== '0' && y !== '1') return;
      var mm = moduleMark(mod);
      out[Number(y)].push({ name: mod.name, credits: num(mod.credits) || 15, mark: mm.mark === null ? '' : mm.mark });
    });
    [0, 1].forEach(function (y) { if (!out[y].length) out[y].push({ name: '', credits: 15, mark: '' }); });
    state.years = out;
    g.renderYears(); g.update();
    document.getElementById('years').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  var review = $('review');
  review.addEventListener('input', function (e) {
    var t = e.target, imod = t.closest('.imod'), data = state.imp;
    if (!imod) return;
    var mod = data.modules[imod.dataset.m];
    if (t.dataset.mk) mod[t.dataset.mk] = t.value;
    var item = t.closest('.item');
    if (item && t.dataset.ik) {
      var v = t.value;
      mod.items[item.dataset.i][t.dataset.ik] = t.dataset.ik === 'name' ? v : (v === '' ? null : Number(v));
    }
    save();
    if (t.dataset.ik !== 'name') refreshModule(imod, mod);
  });
  function refreshModule(imod, mod) {
    var mm = moduleMark(mod), pill = imod.querySelector('.imod-head .pill');
    pill.textContent = mm.mark === null ? 'No marks yet' : mm.mark.toFixed(1) + '%';
    imod.querySelector('.imod-foot .note').textContent = mm.note;
  }
  review.addEventListener('change', function (e) {
    var t = e.target, data = state.imp;
    if (t.dataset.ymap) { data.map[t.dataset.ymap] = t.value; save(); return; }
    if (t.dataset.pen !== undefined) {
      var imod = t.closest('.imod'), mod = data.modules[imod.dataset.m];
      mod.items[t.dataset.pen].applyPenalty = t.checked;
      save(); refreshModule(imod, mod);
    }
  });
  review.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    var data = state.imp;
    if (t.id === 'use') return useMarks();
    if (t.id === 'discard') { state.imp = null; save(); renderReview(); return; }
    if (t.dataset.additem !== undefined) {
      data.modules[t.dataset.additem].items.push({ name: 'New assessment', kind: 'manual', weight: null, mark: null });
      save(); renderReview();
      var rows = review.querySelectorAll('.imod[data-m="' + t.dataset.additem + '"] .item[data-i]');
      var input = rows[rows.length - 1].querySelector('input'); input.focus(); input.select();
      return;
    }
    if (t.dataset.delitem !== undefined) {
      var imod = t.closest('.imod');
      data.modules[imod.dataset.m].items.splice(Number(t.dataset.delitem), 1);
      save(); renderReview(); return;
    }
    if (t.dataset.delmod !== undefined) { data.modules.splice(Number(t.dataset.delmod), 1); save(); renderReview(); }
  });

  // ---------- Your university's rules ----------

  var NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30 };
  function toNum(s) { s = String(s).toLowerCase(); return NUMBERS[s] !== undefined ? NUMBERS[s] : Number(s); }
  var NUM = '(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen|fifteen|twenty|thirty)';

  function findRules(text) {
    var found = [], seen = {};
    var sentences = text.replace(/\r/g, '').split(/(?<=[.;!?])\s+|\n{1,}/).map(function (x) { return x.replace(/\s+/g, ' ').trim(); }).filter(function (x) { return x.length > 8 && x.length < 600; });
    function add(key, value, label, quote) { if (seen[key]) return; seen[key] = true; found.push({ key: key, value: value, label: label, quote: quote, use: true }); }
    sentences.forEach(function (s) {
      var late = /\blate|deduct|penal|deadline|extension/i.test(s), m;
      // Late penalty per day
      if (late && (m = /(\d+(?:\.\d+)?)\s*(%|per\s?cent|percentage points?|marks?)\b[^.]{0,90}?\b(?:per|each|every|a|for each|for every)\s+(working\s+|calendar\s+)?day/i.exec(s))) {
        var unit = /mark|point/i.test(m[2]) || /of the (?:available|maximum|total|full) mark/i.test(s) ? 'marks' : /of the (?:mark|grade) (?:awarded|achieved|obtained|given)|of the (?:student|original)/i.test(s) ? 'percent' : 'marks';
        var per = m[3] && /working/i.test(m[3]) ? 'working' : /working day/i.test(s) ? 'working' : 'calendar';
        add('penalty', { amt: Number(m[1]), unit: unit, per: per }, 'Deduct ' + (unit === 'percent' ? m[1] + '% of the mark' : m[1] + ' marks') + ' per ' + (per === 'working' ? 'working day' : 'day') + ' late', s);
      }
      // Mark becomes zero after a number of days
      if (late && ((m = new RegExp('(?:after|more than|beyond|over|exceeding|later than)\\s+' + NUM + '\\s+(working\\s+|calendar\\s+)?days?[^.]{0,140}?(?:zero|\\b0\\s*%|mark of 0|not be marked|not be accepted|not be assessed|will fail|a fail)', 'i').exec(s)) ||
          (m = new RegExp('(?:zero|\\b0\\s*%|mark of 0)[^.]{0,100}?(?:after|more than|beyond|over|exceeding)\\s+' + NUM + '\\s+(working\\s+|calendar\\s+)?days?', 'i').exec(s)))) {
        add('zero', toNum(m[1]), 'Late work gets 0 after ' + toNum(m[1]) + ' ' + (m[2] && /working/i.test(m[2]) ? 'working days' : 'days'), s);
      }
      // Penalties never take a passing mark below the pass mark
      if (late && (m = /(?:not|never)\s+(?:reduce|take|bring)[^.]{0,60}?below\s+(?:the pass mark|a pass|(\d{2}))/i.exec(s))) {
        var floor = m[1] ? Number(m[1]) : 40;
        add('floor', floor, 'Penalties never take a passing mark below ' + floor, s);
      }
      // Late work capped at a mark
      if (late && (m = /(?:capped|limited|restricted)\s+(?:at|to)\s+(?:a (?:maximum )?mark of\s+|the pass mark(?: of)?\s*)?(\d{2})?/i.exec(s))) {
        var cap = m[1] ? Number(m[1]) : (/pass mark/i.test(s) ? 40 : null);
        if (cap !== null) add('cap', cap, 'Late work is capped at ' + cap, s);
      }
      // Year weightings
      if (/weight|count|contribut|ratio/i.test(s)) {
        var roles = { second: null, final: null }, rx = /(\d{1,3}(?:\.\d+)?)\s*%[^.%]{0,60}?\b(second|final|third|fourth|level\s*[456]|year\s*[234]|stage\s*[234]|part\s*ii)\b|\b(second|final|third|fourth|level\s*[456]|year\s*[234]|stage\s*[234])\b(?:\s*year)?[^.%\d]{0,60}?(\d{1,3}(?:\.\d+)?)\s*%/gi, w;
        while ((w = rx.exec(s))) {
          var val = Number(w[1] || w[4]), who = (w[2] || w[3]).toLowerCase().replace(/\s+/g, ' ');
          var role = /second|level 5|year 2|stage 2|part ii/.test(who) ? 'second' : 'final';
          if (val > 0 && val <= 100 && roles[role] === null) roles[role] = val;
        }
        if ((m = /\b(1|one)\s*:\s*(2|3|two|three)\b/i.exec(s)) && roles.second === null) { var r2 = toNum(m[2]); roles.second = round1(100 / (1 + r2)); roles.final = round1(100 * r2 / (1 + r2)); }
        if (roles.second !== null && roles.final !== null) add('weights', [roles.second, roles.final], 'Second year ' + roles.second + '%, final year ' + roles.final + '%', s);
        else if (roles.final === 100) add('weights', [0, 100], 'Final year only', s);
      }
      // Classification boundaries
      var names = [['first(?:[- ]class)?', 0], ['upper second|2[.:]1', 1], ['lower second|2[.:]2', 2], ['third(?:[- ]class)?', 3]];
      names.forEach(function (n) {
        var a = new RegExp('\\b(?:' + n[0] + ')\\b(?: class)?(?: honours)?[^.\\d]{0,40}?(\\d{2})(?:\\.0+)?\\s*%?\\s*(?:and|or|\\+|-|to|\\u2013)', 'i').exec(s) ||
          new RegExp('(\\d{2})(?:\\.0+)?\\s*%?\\s*(?:and above|or above|or more|\\+|-\\s*\\d{2,3}|to \\d{2,3})[^.]{0,25}?\\b(?:' + n[0] + ')\\b', 'i').exec(s);
        if (a && Number(a[1]) >= 30 && Number(a[1]) <= 85) add('bound' + n[1], Number(a[1]), ['First', '2:1', '2:2', 'Third'][n[1]] + ' from ' + a[1] + '%', s);
      });
    });
    return found;
  }

  function loadScript(src) {
    return new Promise(function (ok, fail) {
      if (document.querySelector('script[data-src="' + src + '"]')) return ok();
      var s = document.createElement('script');
      s.src = src; s.dataset.src = src; s.onload = ok;
      s.onerror = function () { fail(new Error('Could not load a reader for this file. Check your internet connection.')); };
      document.head.appendChild(s);
    });
  }
  function textOf(file) {
    if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
      return loadScript(LIBS.pdfjs).then(function () {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = LIBS.pdfjsWorker;
        return file.arrayBuffer();
      }).then(function (buf) { return window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise; }).then(function (pdf) {
        var pages = [], chain = Promise.resolve();
        for (var i = 1; i <= pdf.numPages; i++) (function (i) {
          chain = chain.then(function () { return pdf.getPage(i); }).then(function (p) { return p.getTextContent(); }).then(function (tc) {
            pages.push(tc.items.map(function (it) { return it.str + (it.hasEOL ? '\n' : ''); }).join(''));
          });
        })(i);
        return chain.then(function () { return pages.join('\n'); });
      });
    }
    if (/\.docx$/i.test(file.name)) {
      var saved = window.define; // keep any page loader from claiming JSZip
      return loadScript(LIBS.jszip).then(function () { window.define = saved; return window.JSZip.loadAsync(file); }).then(function (z) {
        return z.file('word/document.xml').async('string');
      }).then(function (xml) {
        var doc = new DOMParser().parseFromString(xml, 'application/xml');
        var W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
        return [].map.call(doc.getElementsByTagNameNS(W, 'p'), function (p) {
          return [].map.call(p.getElementsByTagNameNS(W, 't'), function (t) { return t.textContent; }).join('');
        }).join('\n');
      });
    }
    return file.text();
  }

  var found = [];
  function renderFound(fileName) {
    var box = $('found');
    if (!found.length) {
      box.innerHTML = '<p class="note">' + (fileName ? 'No rules were recognised in ' + esc(fileName) + '. ' : '') + 'You can still enter them below by hand.</p>';
      return;
    }
    box.innerHTML = '<p class="lbl" style="margin:18px 0 8px">Gradewise found these rules' + (fileName ? ' in ' + esc(fileName) : '') + '. Untick any that are wrong.</p>' +
      found.map(function (f, i) {
        return '<label class="rule"><input type="checkbox" data-use="' + i + '"' + (f.use ? ' checked' : '') + '><span><b>' + esc(f.label) + '</b><q>' + esc(f.quote.length > 260 ? f.quote.slice(0, 257) + '...' : f.quote) + '</q></span></label>';
      }).join('') +
      '<div class="actions"><button class="b primary" id="apply-rules" type="button">Use these rules</button></div>';
  }
  function applyRules() {
    var r = state.rules;
    found.forEach(function (f) {
      if (!f.use) return;
      if (f.key === 'penalty') { r.amt = f.value.amt; r.unit = f.value.unit; r.per = f.value.per; }
      if (f.key === 'zero') r.zero = f.value;
      if (f.key === 'cap') r.cap = f.value;
      if (f.key === 'floor') r.floor = f.value;
      if (f.key === 'weights') { state.scheme = 'custom'; state.w = f.value.slice(); g.sync(); }
      if (/^bound/.test(f.key)) r.bounds[Number(f.key.slice(5))] = f.value;
    });
    syncRules(); save(); renderReview(); g.update();
    $('rules-status').textContent = 'Rules applied. Check the fields below and the weighting above.';
  }
  function syncRules() {
    var r = state.rules;
    $('lp-amt').value = r.amt; $('lp-unit').value = r.unit; $('lp-per').value = r.per;
    $('lp-zero').value = r.zero; $('lp-cap').value = r.cap; $('lp-floor').value = r.floor || '';
    r.bounds.forEach(function (b, i) { $('b' + i).value = b; });
  }
  function scan(promise, name) {
    $('rules-status').textContent = 'Reading ' + (name || 'your text') + '...';
    promise.then(function (text) {
      found = findRules(text || '');
      $('rules-status').textContent = '';
      renderFound(name);
    }).catch(function (e) { $('rules-status').textContent = e.message || 'Could not read that file.'; });
  }

  $('rfile').addEventListener('change', function () { if (this.files[0]) scan(textOf(this.files[0]), this.files[0].name); });
  var drop = $('rdrop');
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { var f = e.dataTransfer.files[0]; if (f) scan(textOf(f), f.name); });
  $('rfind').onclick = function () { scan(Promise.resolve($('rtext').value), ''); };
  $('found').addEventListener('change', function (e) { var i = e.target.dataset.use; if (i !== undefined) found[i].use = e.target.checked; });
  $('found').addEventListener('click', function (e) { if (e.target.id === 'apply-rules') applyRules(); });
  ['lp-amt', 'lp-unit', 'lp-per', 'lp-zero', 'lp-cap', 'lp-floor', 'b0', 'b1', 'b2', 'b3'].forEach(function (id) {
    $(id).addEventListener('input', function () {
      var r = state.rules, v = this.value;
      if (id === 'lp-amt') r.amt = v; else if (id === 'lp-unit') r.unit = v; else if (id === 'lp-per') r.per = v;
      else if (id === 'lp-zero') r.zero = v; else if (id === 'lp-cap') r.cap = v; else if (id === 'lp-floor') r.floor = v;
      else r.bounds[Number(id.slice(1))] = v;
      save(); renderReview(); g.update();
    });
  });

  readImport();
  syncRules();
  renderReview();
  if (state.imp && /#app/.test(location.hash)) setTimeout(function () { $('review').scrollIntoView({ block: 'start' }); }, 50);
};
