// Gradewise: marks sent from the Gradewise bookmark on Moodle, and your university's rules.
// Everything runs in the browser; nothing is uploaded.
window.GradewiseExtras = function (g) {
  var state = g.state, $ = g.$, esc = g.esc, num = g.num, round1 = g.round1;
  var LIBS = {
    pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    pdfjsWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
  };
  function save() { try { localStorage.setItem('gradewise.v1', JSON.stringify(state)); } catch (e) {} }

  // ---------- Marks from the Gradewise bookmark ----------

  function readImport() {
    var m = /#import=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (!m) return false;
    try {
      var b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      var bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var data = JSON.parse(new TextDecoder().decode(bytes));
      if (!data || !data.years) throw new Error('empty');
      state.years = [0, 1].map(function (y) { return data.years[y] && data.years[y].length ? data.years[y] : [{ name: '', credits: 15, mark: '' }]; });
      if (data.w) { state.scheme = 'custom'; state.w = data.w; }
      if (data.bounds) state.rules.bounds = data.bounds;
      save(); g.sync(); g.renderYears(); syncRules(); g.update();
    } catch (e) {
      console.error(e);
    }
    // Remove the marks from the address bar and history
    history.replaceState(null, '', location.pathname + location.search + '#app');
    return true;
  }

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
    found = found.filter(function (f) { return f.key === 'weights' || /^bound/.test(f.key); });
    if (!found.length) {
      box.innerHTML = '<p class="note">' + (fileName ? 'No weightings or grade boundaries were recognised in ' + esc(fileName) + '. ' : '') + 'You can still enter them by hand.</p>';
      return;
    }
    box.innerHTML = '<p class="lbl" style="margin:18px 0 8px">Gradewise found these rules' + (fileName ? ' in ' + esc(fileName) : '') + '. Untick any that are wrong.</p>' +
      found.map(function (f, i) {
        return '<label class="rule"><input type="checkbox" data-use="' + i + '"' + (f.use ? ' checked' : '') + '><span><b>' + esc(f.label) + '</b><q>' + esc(f.quote.length > 260 ? f.quote.slice(0, 257) + '...' : f.quote) + '</q></span></label>';
      }).join('') +
      '<div class="actions"><button class="b primary" id="apply-rules" type="button">Use these rules</button></div>';
  }
  function applyRules() {
    found.forEach(function (f) {
      if (!f.use) return;
      if (f.key === 'weights') { state.scheme = 'custom'; state.w = f.value.slice(); g.sync(); }
      if (/^bound/.test(f.key)) state.rules.bounds[Number(f.key.slice(5))] = f.value;
    });
    syncRules(); save(); g.update();
    $('rules-status').textContent = 'Rules applied. Check the boundaries below and the weighting above.';
  }
  function syncRules() { state.rules.bounds.forEach(function (b, i) { $('b' + i).value = b; }); }
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
  ['b0', 'b1', 'b2', 'b3'].forEach(function (id) {
    $(id).addEventListener('input', function () { state.rules.bounds[Number(id.slice(1))] = this.value; save(); g.update(); });
  });

  syncRules();
  if (readImport()) setTimeout(function () { $('years').scrollIntoView({ block: 'start' }); }, 50);
};
