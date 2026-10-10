// Gradewise: UK degree classification calculator.
// Everything runs in the browser; nothing is uploaded.
(function () {
  var KEY = 'gradewise.v1';
  var $ = function (id) { return document.getElementById(id); };
  var YEARS = ['Second year', 'Final year'];
  var BANDS = [
    { min: 70, name: 'First', short: 'a First', tone: 'good' },
    { min: 60, name: 'Upper second (2:1)', short: 'a 2:1', tone: '' },
    { min: 50, name: 'Lower second (2:2)', short: 'a 2:2', tone: 'warn' },
    { min: 40, name: 'Third', short: 'a Third', tone: 'warn' }
  ];
  var state = { scheme: '33,67', w: [33, 67], years: [[], []] };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function round1(n) { return Math.round(n * 10) / 10; }

  function renderYears() {
    $('years').innerHTML = YEARS.map(function (title, y) {
      var mods = state.years[y];
      return '<div class="year" data-y="' + y + '">' +
        '<div class="year-head"><h3>' + title + '</h3><button class="b ghost" type="button" data-add="' + y + '">Add a module</button></div>' +
        '<div class="mods">' +
        '<div class="mod mod-head"><span>Module</span><span>Credits</span><span>Mark %</span><span></span></div>' +
        mods.map(function (m, i) {
          return '<div class="mod" data-i="' + i + '">' +
            '<input type="text" aria-label="Module name" data-k="name" placeholder="Module name" value="' + esc(m.name) + '">' +
            '<input type="number" aria-label="Credits" data-k="credits" min="0" step="5" value="' + esc(m.credits) + '">' +
            '<input type="number" aria-label="Mark" data-k="mark" min="0" max="100" step="0.1" placeholder="To come" value="' + esc(m.mark) + '">' +
            '<button class="b icon" type="button" aria-label="Remove module" title="Remove" data-del="' + i + '">&times;</button>' +
            '</div>';
        }).join('') +
        '</div></div>';
    }).join('');
  }

  function compute() {
    var wsum = 0, A = 0, B = 0, cur = 0, curW = 0, doneC = 0, totalC = 0;
    state.years.forEach(function (mods, y) {
      var w = Math.max(0, num(state.w[y]) || 0);
      var T = 0, sum = 0, dc = 0;
      mods.forEach(function (m) {
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
    return {
      current: curW ? cur / curW : null,
      A: wsum ? A / wsum : 0,
      B: wsum ? B / wsum : 0,
      ok: wsum > 0,
      doneC: doneC, totalC: totalC
    };
  }

  function band(avg) {
    for (var i = 0; i < BANDS.length; i++) if (avg >= BANDS[i].min) return BANDS[i];
    return null;
  }

  function update() {
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

  function blank() { return [[{ name: '', credits: 15, mark: '' }], [{ name: '', credits: 15, mark: '' }]]; }

  function sample() {
    state.scheme = '33,67'; state.w = [33, 67];
    state.years = [
      [{ name: 'Theory and Method', credits: 30, mark: 64 }, { name: 'Regional Politics', credits: 30, mark: 68 }, { name: 'Language Year 2', credits: 30, mark: 71 }, { name: 'Elective', credits: 30, mark: 59 }],
      [{ name: 'Dissertation', credits: 30, mark: '' }, { name: 'Advanced Language', credits: 30, mark: 72 }, { name: 'Translation', credits: 15, mark: 66 }, { name: 'Security Studies', credits: 15, mark: '' }, { name: 'Culture and Politics', credits: 30, mark: '' }]
    ];
    sync(); renderYears(); update();
  }

  function sync() {
    $('scheme').value = state.scheme;
    $('w1').value = state.w[0]; $('w2').value = state.w[1];
    var custom = state.scheme === 'custom';
    $('w1').disabled = !custom; $('w2').disabled = !custom;
  }

  // Events
  $('scheme').addEventListener('change', function () {
    state.scheme = this.value;
    if (this.value !== 'custom') state.w = this.value.split(',').map(Number);
    sync(); update();
  });
  ['w1', 'w2'].forEach(function (id, i) { $(id).addEventListener('input', function () { state.w[i] = this.value; update(); }); });
  $('years').addEventListener('input', function (e) {
    var t = e.target, mod = t.closest('.mod'), yr = t.closest('.year');
    if (!mod || !t.dataset.k) return;
    state.years[yr.dataset.y][mod.dataset.i][t.dataset.k] = t.value;
    update();
  });
  $('years').addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]'), del = e.target.closest('[data-del]');
    if (add) {
      var y = Number(add.dataset.add);
      state.years[y].push({ name: '', credits: 15, mark: '' });
      renderYears(); update();
      var rows = document.querySelectorAll('.year[data-y="' + y + '"] .mod[data-i]');
      rows[rows.length - 1].querySelector('input').focus();
    } else if (del) {
      var yr = del.closest('.year').dataset.y;
      state.years[yr].splice(Number(del.dataset.del), 1);
      renderYears(); update();
    }
  });
  $('sample').onclick = sample;
  $('reset').onclick = function () { state = { scheme: '33,67', w: [33, 67], years: blank() }; sync(); renderYears(); update(); };

  // Restore from this device
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.years && saved.years.length === 2) state = saved;
    else state.years = blank();
  } catch (e) { state.years = blank(); }
  sync(); renderYears(); update();
})();
