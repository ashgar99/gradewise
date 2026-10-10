// Gradewise: UK degree classification calculator.
// Everything runs in the browser; nothing is uploaded.
(function () {
  var KEY = 'gradewise.v1';
  var $ = function (id) { return document.getElementById(id); };

  // Common UK degree structures: which years count, and how much.
  // Sources: university regulations such as Bristol's and Edinburgh's; always check your own handbook.
  var PRESETS = [
    { group: 'Three-year bachelor’s', items: [
      ['3-12', 'Years 2 and 3, weighted 1:2', [['Year 2', 33.3], ['Year 3', 66.7]]],
      ['3-13', 'Years 2 and 3, weighted 1:3', [['Year 2', 25], ['Year 3', 75]]],
      ['3-4060', 'Years 2 and 3, weighted 40:60', [['Year 2', 40], ['Year 3', 60]]],
      ['3-3070', 'Years 2 and 3, weighted 30:70', [['Year 2', 30], ['Year 3', 70]]],
      ['3-eq', 'Years 2 and 3, weighted equally', [['Year 2', 50], ['Year 3', 50]]],
      ['3-final', 'Final year only', [['Year 3', 100]]]
    ] },
    { group: 'Four-year bachelor’s with a year abroad or placement', items: [
      ['4a-12', 'Year away does not count, years 2 and 4 weighted 1:2', [['Year 2', 33.3], ['Year 4', 66.7]]],
      ['4a-13', 'Year away does not count, years 2 and 4 weighted 1:3', [['Year 2', 25], ['Year 4', 75]]],
      ['4a-4060', 'Year away does not count, years 2 and 4 weighted 40:60', [['Year 2', 40], ['Year 4', 60]]],
      ['4a-151075', 'Year away counts 10%, weighted 15:10:75', [['Year 2', 15], ['Year 3 (away)', 10], ['Year 4', 75]]],
      ['4a-301060', 'Year away counts 10%, weighted 30:10:60', [['Year 2', 30], ['Year 3 (away)', 10], ['Year 4', 60]]],
      ['4a-final', 'Final year only', [['Year 4', 100]]]
    ] },
    { group: 'Integrated master’s (MEng, MSci, MChem and similar)', items: [
      ['im4-104050', 'Four years, weighted 10:40:50', [['Year 2', 10], ['Year 3', 40], ['Year 4', 50]]],
      ['im4-203050', 'Four years, weighted 20:30:50', [['Year 2', 20], ['Year 3', 30], ['Year 4', 50]]],
      ['im4-204040', 'Four years, weighted 20:40:40', [['Year 2', 20], ['Year 3', 40], ['Year 4', 40]]],
      ['im5-10103050', 'Five years with a year away, weighted 10:10:30:50', [['Year 2', 10], ['Year 3 (away)', 10], ['Year 4', 30], ['Year 5', 50]]]
    ] },
    { group: 'Scottish honours', items: [
      ['sc-eq', 'Years 3 and 4, weighted equally', [['Year 3', 50], ['Year 4', 50]]],
      ['sc-4060', 'Years 3 and 4, weighted 40:60', [['Year 3', 40], ['Year 4', 60]]],
      ['sc-3070', 'Years 3 and 4, weighted 30:70', [['Year 3', 30], ['Year 4', 70]]],
      ['sc-final', 'Year 4 only, for example after a year abroad', [['Year 4', 100]]],
      ['sc-im', 'Integrated master’s, years 3, 4 and 5, weighted 20:30:50', [['Year 3', 20], ['Year 4', 30], ['Year 5', 50]]]
    ] },
    { group: 'Other', items: [['custom', 'Custom years and weights', null]] }
  ];
  function preset(id) {
    for (var g = 0; g < PRESETS.length; g++) for (var i = 0; i < PRESETS[g].items.length; i++) if (PRESETS[g].items[i][0] === id) return PRESETS[g].items[i];
    return null;
  }
  window.GradewisePresets = PRESETS;

  var BANDS = [
    { min: 70, name: 'First', short: 'a First', tone: 'good' },
    { min: 60, name: 'Upper second (2:1)', short: 'a 2:1', tone: '' },
    { min: 50, name: 'Lower second (2:2)', short: 'a 2:2', tone: 'warn' },
    { min: 40, name: 'Third', short: 'a Third', tone: 'warn' }
  ];
  var DEFAULT_RULES = { bounds: [70, 60, 50, 40] };
  var state = { scheme: '3-12', years: [], rules: JSON.parse(JSON.stringify(DEFAULT_RULES)) };
  function bounds() { return (state.rules && state.rules.bounds) || DEFAULT_RULES.bounds; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function round1(n) { return Math.round(n * 10) / 10; }
  function blankMods() { return [{ name: '', credits: 15, mark: '' }]; }

  // Switch structure, keeping modules you have already entered where the years match
  function usePreset(id) {
    var p = preset(id);
    state.scheme = id;
    if (!p || !p[2]) return;
    var old = state.years, used = {};
    // First keep years with the same name, then fill the rest from your latest years backwards
    var next = p[2].map(function (y) {
      for (var k = 0; k < old.length; k++) if (!used[k] && old[k].label === y[0]) { used[k] = true; return { label: y[0], weight: y[1], mods: old[k].mods }; }
      return { label: y[0], weight: y[1], mods: null };
    });
    var spare = old.map(function (o, k) { return k; }).filter(function (k) { return !used[k]; });
    for (var i = next.length - 1; i >= 0; i--) {
      if (next[i].mods) continue;
      var k = spare.pop();
      next[i].mods = k !== undefined ? old[k].mods : blankMods();
    }
    state.years = next;
  }

  function renderScheme() {
    $('scheme').innerHTML = PRESETS.map(function (g) {
      return '<optgroup label="' + esc(g.group) + '">' + g.items.map(function (it) {
        return '<option value="' + it[0] + '"' + (state.scheme === it[0] ? ' selected' : '') + '>' + esc(it[1]) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
    $('wrows').innerHTML = state.years.map(function (y, i) {
      return '<div class="wrow" data-y="' + i + '">' +
        '<input type="text" aria-label="Year name" data-yl value="' + esc(y.label) + '">' +
        '<div class="wpct"><input type="number" aria-label="Weight" data-yw min="0" max="100" step="0.1" value="' + esc(y.weight) + '"><span>%</span></div>' +
        '<button class="b icon" type="button" aria-label="Remove year" title="Remove" data-yd="' + i + '">&times;</button></div>';
    }).join('');
    weightNote();
  }
  function weightNote() {
    var total = state.years.reduce(function (s, y) { return s + (num(y.weight) || 0); }, 0);
    $('wsum').textContent = Math.abs(total - 100) < 0.5 ? 'The weights add up to 100%.' :
      'The weights add up to ' + round1(total) + '%. Gradewise scales them so they add up to 100%.';
  }

  function renderYears() {
    $('years').innerHTML = state.years.map(function (y, i) {
      return '<div class="year" data-y="' + i + '">' +
        '<div class="year-head"><h3>' + esc(y.label || 'Year') + ' <span class="wtag">' + esc(round1(num(y.weight) || 0)) + '%</span></h3><button class="b ghost" type="button" data-add="' + i + '">Add a module</button></div>' +
        '<div class="mods">' +
        '<div class="mod mod-head"><span>Module</span><span>Credits</span><span>Mark %</span><span></span></div>' +
        y.mods.map(function (m, j) {
          return '<div class="mod" data-i="' + j + '">' +
            '<input type="text" aria-label="Module name" data-k="name" placeholder="Module name" value="' + esc(m.name) + '">' +
            '<input type="number" aria-label="Credits" data-k="credits" min="0" step="5" value="' + esc(m.credits) + '">' +
            '<input type="number" aria-label="Mark" data-k="mark" min="0" max="100" step="0.1" placeholder="To come" value="' + esc(m.mark) + '">' +
            '<button class="b icon" type="button" aria-label="Remove module" title="Remove" data-del="' + j + '">&times;</button>' +
            '</div>';
        }).join('') +
        '</div></div>';
    }).join('');
  }

  function compute() {
    var wsum = 0, A = 0, B = 0, cur = 0, curW = 0, doneC = 0, totalC = 0;
    state.years.forEach(function (y) {
      var w = Math.max(0, num(y.weight) || 0);
      var T = 0, sum = 0, dc = 0;
      y.mods.forEach(function (m) {
        var c = num(m.credits); if (!c || c <= 0) return;
        T += c;
        var mk = num(m.mark);
        if (mk !== null) { sum += c * Math.min(100, Math.max(0, mk)); dc += c; }
      });
      totalC += T; doneC += dc;
      if (!w || !T) return;
      wsum += w;
      A += w * sum / T;
      B += w * (T - dc) / T;
      if (dc) { cur += w * (sum / dc); curW += w; }
    });
    return { current: curW ? cur / curW : null, A: wsum ? A / wsum : 0, B: wsum ? B / wsum : 0, ok: wsum > 0, doneC: doneC, totalC: totalC };
  }

  function band(avg) {
    for (var i = 0; i < BANDS.length; i++) if (avg >= BANDS[i].min) return BANDS[i];
    return null;
  }
  // Grade boundaries can come from your university's rules
  function applyBounds() { bounds().forEach(function (b, i) { var n = num(b); if (n !== null) BANDS[i].min = n; }); }

  function update() {
    applyBounds();
    var r = compute();
    $('done').textContent = r.doneC + ' of ' + r.totalC;
    if (r.current === null) {
      $('avg').innerHTML = '&ndash;';
      $('cls').textContent = 'Add your marks';
      $('cls').className = 'pill';
      $('marker').style.left = '0';
    } else {
      $('avg').textContent = round1(r.current).toFixed(1) + '%';
      var b = band(r.current);
      var near = BANDS.filter(function (x) { return r.current < x.min && x.min - r.current <= 2; })[0];
      $('cls').textContent = (b ? b.name : 'Below a pass') + (near ? ', borderline ' + near.short.replace('a ', '') : '');
      $('cls').className = 'pill ' + (b ? b.tone : 'bad');
      $('marker').style.left = 'calc(' + Math.min(100, Math.max(0, r.current)) + '% - 1px)';
    }
    var html = '';
    if (r.ok && r.totalC) {
      html = BANDS.map(function (b) {
        var label, tone, detail;
        if (r.B <= 0.0001) {
          var fin = r.A;
          label = fin >= b.min ? 'Achieved' : 'Not reached';
          tone = fin >= b.min ? 'good' : 'bad';
          detail = 'Final average ' + round1(fin).toFixed(1) + '%';
        } else {
          var need = (b.min - r.A) / r.B;
          if (need <= 0) { label = 'Secured'; tone = 'good'; detail = 'Even with zero on the rest'; }
          else if (need > 100) { label = 'Out of reach'; tone = 'bad'; detail = 'Would need over 100%'; }
          else { label = round1(need).toFixed(1) + '%'; tone = need <= 40 ? 'good' : need <= 70 ? '' : 'warn'; detail = 'Average needed on remaining modules'; }
        }
        return '<div class="target"><div><b>For ' + b.short + ' (' + b.min + '+)</b><small>' + detail + '</small></div><span class="pill ' + tone + '">' + label + '</span></div>';
      }).join('');
    } else {
      html = '<p class="note">Add your modules and credits to see what you need.</p>';
    }
    $('targets').innerHTML = html;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function sample() {
    state.years = [];
    usePreset('3-12');
    state.years[0].mods = [{ name: 'Theory and Method', credits: 30, mark: 64 }, { name: 'Regional Politics', credits: 30, mark: 68 }, { name: 'Language Year 2', credits: 30, mark: 71 }, { name: 'Elective', credits: 30, mark: 59 }];
    state.years[1].mods = [{ name: 'Dissertation', credits: 30, mark: '' }, { name: 'Advanced Language', credits: 30, mark: 72 }, { name: 'Translation', credits: 15, mark: 66 }, { name: 'Security Studies', credits: 15, mark: '' }, { name: 'Culture and Politics', credits: 30, mark: '' }];
    sync();
  }
  function sync() { renderScheme(); renderYears(); update(); }

  // Events: degree structure
  $('scheme').addEventListener('change', function () {
    if (this.value === 'custom') state.scheme = 'custom'; else usePreset(this.value);
    sync();
  });
  $('wrows').addEventListener('input', function (e) {
    var t = e.target, row = t.closest('.wrow');
    if (!row) return;
    var y = state.years[row.dataset.y];
    if (t.dataset.yl !== undefined) y.label = t.value;
    if (t.dataset.yw !== undefined) y.weight = t.value;
    state.scheme = 'custom';
    $('scheme').value = 'custom';
    weightNote(); renderYears(); update();
  });
  $('wrows').addEventListener('click', function (e) {
    var d = e.target.closest('[data-yd]');
    if (!d) return;
    state.years.splice(Number(d.dataset.yd), 1);
    state.scheme = 'custom';
    sync();
  });
  $('addyear').onclick = function () {
    var last = state.years[state.years.length - 1];
    var n = last && /(\d)/.exec(last.label) ? Number(/(\d)/.exec(last.label)[1]) + 1 : state.years.length + 1;
    state.years.push({ label: 'Year ' + n, weight: 0, mods: blankMods() });
    state.scheme = 'custom';
    sync();
    var rows = document.querySelectorAll('#wrows [data-yw]');
    rows[rows.length - 1].focus();
  };

  // Events: modules
  $('years').addEventListener('input', function (e) {
    var t = e.target, mod = t.closest('.mod'), yr = t.closest('.year');
    if (!mod || !t.dataset.k) return;
    state.years[yr.dataset.y].mods[mod.dataset.i][t.dataset.k] = t.value;
    update();
  });
  $('years').addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]'), del = e.target.closest('[data-del]');
    if (add) {
      var y = Number(add.dataset.add);
      state.years[y].mods.push({ name: '', credits: 15, mark: '' });
      renderYears(); update();
      var rows = document.querySelectorAll('.year[data-y="' + y + '"] .mod[data-i]');
      rows[rows.length - 1].querySelector('input').focus();
    } else if (del) {
      state.years[del.closest('.year').dataset.y].mods.splice(Number(del.dataset.del), 1);
      renderYears(); update();
    }
  });
  $('sample').onclick = sample;
  $('reset').onclick = function () { state.years = []; usePreset('3-12'); sync(); };

  // Restore from this device, including the older two-year format
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && Array.isArray(saved.years) && saved.years.length && Array.isArray(saved.years[0])) {
      var w = saved.w || [33, 67];
      var old = { '33,67': '3-12', '25,75': '3-13', '40,60': '3-4060', '50,50': '3-eq', '0,100': '3-final' }[saved.scheme] || 'custom';
      state.scheme = old;
      state.years = [{ label: 'Year 2', weight: w[0], mods: saved.years[0] }, { label: 'Year 3', weight: w[1], mods: saved.years[1] }];
      if (saved.rules && saved.rules.bounds) state.rules.bounds = saved.rules.bounds;
    } else if (saved && Array.isArray(saved.years) && saved.years.length && saved.years[0].mods) {
      state = saved;
      if (!state.rules || !state.rules.bounds) state.rules = JSON.parse(JSON.stringify(DEFAULT_RULES));
    } else usePreset('3-12');
  } catch (e) { state.years = []; usePreset('3-12'); }
  sync();
  if (window.GradewiseExtras) window.GradewiseExtras({ state: state, $: $, esc: esc, num: num, round1: round1, sync: sync, renderYears: renderYears, update: update, usePreset: usePreset, DEFAULT_RULES: DEFAULT_RULES });
})();
