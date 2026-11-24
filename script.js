/*!
 * NileScholar runtime fixes, kept separate from the page's main script.
 *
 * HOW TO USE
 *   Add this ONE line to your page, after the original </script> and before </body>:
 *     <script src="nilescholar-fixes.js"></script>
 *   (or paste this whole file inside a second <script>...</script> in the same spot).
 *   It must load AFTER the original script, because it overrides that script's functions at runtime.
 *   To undo everything, remove that one line.
 *
 * WHAT IT FIXES
 *   1. Honesty: adds an "unofficial / sample content" notice, removes invented ratings, download
 *      counts, file sizes, page counts, "verified" and "PDF" claims, invented author credits,
 *      the unverified motto, and false "will be notified / published" messages.
 *   2. Accessibility: dialog semantics, Escape / backdrop close, focus trap and focus return,
 *      visible focus rings, labels, aria-pressed / aria-current / aria-expanded, status toast,
 *      better contrast for small grey text, reduced-motion support.
 *   3. Bugs: CGPA class is judged on the rounded value, invalid saved GPA rows are repaired,
 *      the shelf badge ignores missing items, contributed items stay visible in "All Nigerian Unis".
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var wrap = function (name, make) {
    var orig = window[name];
    if (typeof orig === 'function') window[name] = make(orig);
  };
  var isCustom = function (item) { return String(item && item.id).indexOf('custom-') === 0; };
  var ready = false;

  /* ------------------------------------------------------------------ */
  /* 0. CSS: focus rings, contrast, reduced motion, notice banner         */
  /* ------------------------------------------------------------------ */
  var style = document.createElement('style');
  style.textContent = [
    /* Visible on both light and dark backgrounds; beats Tailwind's focus:outline-none */
    ':focus-visible{outline:2px solid #fff!important;outline-offset:0!important;box-shadow:0 0 0 4px #2E52B5!important}',
    /* Small grey text: slate-400 (about 2.6:1) -> slate-500 (about 4.8:1). Extra specificity keeps hover colours working. */
    'body .text-slate-400{color:#64748b}',
    'input::placeholder,textarea::placeholder{color:#64748b;opacity:1}',
    'body .text-\\[11px\\]{font-size:12px}',
    '@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}.animate-fade-up{animation:none!important}*{transition-duration:.01ms!important}}',
    '#ns-notice{background:#FEF3C7;color:#78350F;border-bottom:1px solid #FCD34D;padding:8px 16px;font-size:13px;line-height:1.45;text-align:center}'
  ].join('\n');
  document.head.appendChild(style);

  /* ------------------------------------------------------------------ */
  /* 1. Honesty: notice banner, wording, sample data                      */
  /* ------------------------------------------------------------------ */
  var notice = document.createElement('div');
  notice.id = 'ns-notice';
  notice.setAttribute('role', 'note');
  notice.innerHTML = '<strong>Independent student project.</strong> Not run or endorsed by Nile University of Nigeria. ' +
    'Built-in catalogue entries are illustrative samples; this page does not host official study files. ' +
    'Verify sources before relying on or citing any material. Contributions are stored on this device only.';
  document.body.insertBefore(notice, document.body.firstChild);

  function replaceText(from, to) {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && node.parentElement.closest('script,style')) continue;
      if (node.nodeValue.trim() === from) node.nodeValue = node.nodeValue.replace(from, to);
    }
  }

  replaceText('Verified Study Packs', 'Illustrative entries');
  replaceText('Full Nile & NUC Coverage', 'Illustrative catalogue');
  replaceText('< 3 MB', 'Text only');
  replaceText('Compressed Mobile PDFs', 'Small .txt study packs');
  replaceText('External PDF Link (Optional)', 'External Resource Link (Optional)');
  replaceText('Request Missing Textbook / PQ', 'Note a Missing Textbook / PQ');
  replaceText('Share / Publish Study Material', 'Add Study Material (this device only)');

  var facCount = $('stat-faculty-count');
  if (facCount && facCount.nextSibling) facCount.nextSibling.nodeValue = ' Subject areas';

  var heroSub = $('hero-subtitle');
  if (heroSub) heroSub.textContent = 'Browse sample lecture packs and exam-prep notes across nine subject areas. ' +
    'Lightweight, fast, and built for studying on or off campus.';

  /* Remove the unverified motto and its separator */
  Array.prototype.slice.call(document.querySelectorAll('span')).forEach(function (s) {
    if (s.textContent.indexOf('Build Your Success') !== -1 && s.children.length === 0) {
      var prev = s.previousElementSibling;
      if (prev && prev.textContent.trim() === '|') prev.remove();
      s.remove();
    }
  });

  Array.prototype.slice.call(document.querySelectorAll('#view-contribute p')).forEach(function (p) {
    if (p.textContent.indexOf('immediately added') !== -1) {
      p.textContent = 'Add your own notes to your personal library. Items are saved in this browser on this device only. ' +
        'Other students cannot see them, because NileScholar has no server yet.';
    }
  });

  var citeBtn = document.querySelector('[onclick="copyCitation()"]');
  if (citeBtn) citeBtn.textContent = 'Copy Reference Note';
  var readerDownloadBtn = document.querySelector('[onclick="downloadCurrentResource()"]');
  if (readerDownloadBtn) readerDownloadBtn.textContent = 'Download Sample Notes (.txt)';
  var dsBtn = $('data-saver-btn');
  if (dsBtn) dsBtn.title = 'Removes decorative background graphics';

  /* Sorting: only options based on real data (no fake ratings, downloads or sizes) */
  var sortSel = $('sort-by');
  if (sortSel) sortSel.innerHTML = '<option value="code">Sort: Course code (A\u2013Z)</option>' +
    '<option value="title">Sort: Title (A\u2013Z)</option>';

  /* Invented author credits -> neutral label (mutates the data at runtime only) */
  if (typeof DEFAULT_RESOURCES !== 'undefined') {
    DEFAULT_RESOURCES.forEach(function (r) { r.author = 'Illustrative sample entry'; r.sample = true; });
  }

  wrap('showToast', function (orig) {
    return function (msg) {
      return orig(String(msg).replace('published to NileScholar Library!', 'added to your library on this device only.'));
    };
  });

  /* Cards: drop fake rating/downloads/size strip; add accessible names */
  wrap('createResourceCardHTML', function (orig) {
    return function (item, shelf) {
      var tpl = document.createElement('template');
      tpl.innerHTML = orig(item, shelf);
      var strip = tpl.content.querySelector('div.font-mono.border-t');
      if (strip) strip.innerHTML = '<span>Sample entry</span><span>' + (isCustom(item) ? 'Added by you' : 'Illustrative') + '</span>';
      var bm = tpl.content.querySelector('button[onclick^="toggleBookmark"]');
      if (bm) {
        var saved = state.shelf.some(function (s) { return s.id === item.id; });
        bm.setAttribute('aria-label', (saved ? 'Remove ' : 'Save ') + item.code + ' ' + (saved ? 'from' : 'to') + ' study shelf');
        bm.setAttribute('aria-pressed', String(saved));
      }
      var downloadBtn = tpl.content.querySelector('button[onclick^="downloadResource"]');
      if (downloadBtn) {
        Array.prototype.forEach.call(downloadBtn.childNodes, function (node) {
          if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) node.nodeValue = '\n                Sample Notes\n              ';
        });
      }
      tpl.content.querySelectorAll('svg').forEach(function (s) { s.setAttribute('aria-hidden', 'true'); });
      return tpl.innerHTML;
    };
  });

  window.copyCitation = async function () {
    var item = state.resources.find(function (r) { return r.id === state.currentReaderId; });
    if (!item) return;
    var note = item.title + ' [' + item.code + ']. ' +
      (isCustom(item) ? 'Student-contributed material' : 'Illustrative sample entry') +
      ', NileScholar (unofficial student project). Confirm the original source before citing.';
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(note);
      showToast('Reference note copied. This is sample content, so check the real source before citing.');
    } catch (err) {
      console.error('Unable to copy the reference note.', err);
      showToast('Could not copy. Check clipboard permissions and try again.');
    }
  };

  window.downloadResource = function (id) {
    var item = state.resources.find(function (r) { return r.id === id; });
    if (!item) return;
    var notes = (new DOMParser().parseFromString(item.sampleContent || '', 'text/html').body.textContent || '')
      .replace(/\s+\n/g, '\n').trim();
    var content = [
      '============================================================',
      'NILESCHOLAR STUDY NOTES (SAMPLE CONTENT)',
      'Independent student project. Not an official Nile University document.',
      '============================================================',
      'Course Code : ' + item.code,
      'Title       : ' + item.title,
      'Source      : ' + item.author,
      'Subject     : ' + item.faculty + ' (' + item.level + ')',
      'Type        : ' + item.type,
      '------------------------------------------------------------',
      '\nOVERVIEW:',
      item.summary,
      '\nTOPICS:'
    ].concat((item.toc || []).map(function (t) { return '  - ' + t; }),
      ['\nNOTES:', notes, '\n============================================================']).join('\n');
    var url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = item.code.replace(/\s+/g, '_') + '_Sample_Notes.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Downloaded ' + item.code + ' sample notes');
  };

  /* Contribute form: be honest about what it does */
  window.toggleContribMode = function () {
    var request = $('contrib-mode').value === 'request';
    $('upload-extra-fields').classList.toggle('hidden', request);
    $('contrib-submit-btn').textContent = request ? 'Note this request' : 'Add to my library (this device only)';
  };
  window.toggleContribMode();

  wrap('handleContribute', function (orig) {
    return function (e) {
      if ($('contrib-mode').value === 'request') {
        e.preventDefault();
        var code = $('contrib-code').value.trim().toUpperCase();
        $('contribute-form').reset();
        window.toggleContribMode();
        showToast('Request for ' + code + ' was not saved or sent, because NileScholar has no server yet. Ask your course rep or the library.');
        switchTab('library');
        return;
      }
      return orig(e);
    };
  });

  /* ------------------------------------------------------------------ */
  /* 2. Library logic: filtering, sorting, reset, shelf badge             */
  /* ------------------------------------------------------------------ */
  window.applyFilters = function () {
    var q = $('search-input').value.trim().toLowerCase();
    var level = $('filter-level').value;
    var type = $('filter-type').value;
    var sortBy = $('sort-by').value;
    $('clear-search-btn').classList.toggle('hidden', !q);

    var items = state.resources.filter(function (i) {
      var inScope = state.campusScope === 'nile' || i.scope === 'all' || isCustom(i);
      var inFaculty = state.selectedFaculty === 'All Faculties' || i.faculty === state.selectedFaculty;
      var inLevel = level === 'All' || i.level === level;
      var inType = type === 'All' || i.type === type;
      var inQuery = !q || [i.code, i.title, i.author, i.faculty, i.type, i.summary]
        .some(function (f) { return String(f).toLowerCase().indexOf(q) !== -1; });
      return inScope && inFaculty && inLevel && inType && inQuery;
    });

    items.sort(function (a, b) {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return a.code.localeCompare(b.code, undefined, { numeric: true });
    });
    renderResourceGrid(items);
  };

  window.resetAllFilters = function () {
    $('search-input').value = '';
    $('filter-level').value = 'All';
    $('filter-type').value = 'All';
    $('sort-by').value = 'code';
    state.selectedFaculty = 'All Faculties';
    renderFacultyPills();
    applyFilters();
  };

  window.updateShelfBadges = function () {
    var count = state.shelf.filter(function (s) {
      return state.resources.some(function (r) { return r.id === s.id; });
    }).length;
    $('shelf-count-badge').textContent = count;
    $('mobile-shelf-count').textContent = count;
  };

  /* ------------------------------------------------------------------ */
  /* 3. CGPA: rounded classification, repaired saved rows                 */
  /* ------------------------------------------------------------------ */
  (function repairSavedGpa() {
    try {
      var raw = JSON.parse(localStorage.getItem('ns_gpa'));
      if (!Array.isArray(raw)) return;
      var valid = function (n, lo, hi) { return n !== null && n !== '' && Number.isFinite(Number(n)) && Number(n) >= lo && Number(n) <= hi; };
      var rows = raw.filter(function (c) { return c && valid(c.units, 1, 6) && valid(c.grade, 0, 5); })
        .map(function (c) { return { code: String(c.code == null ? '' : c.code), units: Number(c.units), grade: Number(c.grade) }; });
      state.gpaCourses = rows.length ? rows : DEFAULT_GPA_COURSES.map(function (c) { return { code: c.code, units: c.units, grade: c.grade }; });
    } catch (err) {
      console.warn('Unable to repair saved CGPA rows; keeping the page defaults.', err);
    }
  })();

  window.calculateCGPA = function () {
    var semUnits = 0, semPoints = 0;
    state.gpaCourses.forEach(function (c) {
      semUnits += Number(c.units);
      semPoints += Number(c.units) * Number(c.grade);
    });
    var semGpa = semUnits > 0 ? semPoints / semUnits : 0;
    var prevUnits = Math.max(0, Number($('prev-units').value) || 0);
    var prevCgpa = Math.min(5, Math.max(0, Number($('prev-cgpa').value) || 0));
    var totalUnits = semUnits + prevUnits;
    var cgpa = totalUnits > 0 ? (semPoints + prevUnits * prevCgpa) / totalUnits : 0;
    var shown = Math.round(cgpa * 100) / 100;       /* classify exactly what the student sees */

    $('semester-gpa-val').textContent = semGpa.toFixed(2);
    $('total-cgpa-val').textContent = shown.toFixed(2);
    $('total-units-text').textContent = totalUnits + ' total units';

    var cls = 'Pass / Probation';
    if (shown >= 4.50) cls = 'First Class Honours';
    else if (shown >= 3.50) cls = 'Second Class Upper (2:1)';
    else if (shown >= 2.40) cls = 'Second Class Lower (2:2)';
    else if (shown >= 1.50) cls = 'Third Class Honours';
    $('degree-class-badge').textContent = cls;
  };

  wrap('renderGpaRows', function (orig) {
    return function () {
      orig();
      Array.prototype.slice.call($('gpa-rows').children).forEach(function (row, i) {
        var n = i + 1;
        var input = row.querySelector('input[type="text"]');
        var selects = row.querySelectorAll('select');
        var remove = row.querySelector('button');
        if (input) input.setAttribute('aria-label', 'Course ' + n + ' code');
        if (selects[0]) selects[0].setAttribute('aria-label', 'Course ' + n + ' credit units');
        if (selects[1]) selects[1].setAttribute('aria-label', 'Course ' + n + ' grade');
        if (remove) remove.setAttribute('aria-label', 'Remove course ' + n);
      });
    };
  });
  wrap('addGpaRow', function (orig) {
    return function () {
      orig();
      var inputs = $('gpa-rows').querySelectorAll('input[type="text"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    };
  });
  wrap('removeGpaRow', function (orig) {
    return function (idx) {
      orig(idx);
      var inputs = $('gpa-rows').querySelectorAll('input[type="text"]');
      var next = inputs[Math.min(idx, inputs.length - 1)];
      (next || $('prev-units')).focus();
    };
  });

  /* ------------------------------------------------------------------ */
  /* 4. Accessibility: semantics, state attributes, labels                */
  /* ------------------------------------------------------------------ */
  var setAttrs = function (el, attrs) {
    if (!el) return;
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
  };

  setAttrs($('search-input'), { 'aria-label': 'Search by course code, title or author' });
  setAttrs($('filter-level'), { 'aria-label': 'Filter by level' });
  setAttrs($('filter-type'), { 'aria-label': 'Filter by material type' });
  setAttrs($('sort-by'), { 'aria-label': 'Sort results' });
  setAttrs($('toast'), { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
  setAttrs($('timer-display'), { role: 'timer' });
  setAttrs($('faculty-pills'), { role: 'group', 'aria-label': 'Filter by subject area' });
  setAttrs($('clear-search-btn'), { 'aria-label': 'Clear search' });
  setAttrs($('mobile-menu'), { id: 'mobile-menu' });
  var menuBtn = document.querySelector('button[aria-label="Toggle Menu"]');
  setAttrs(menuBtn, { 'aria-expanded': 'false', 'aria-controls': 'mobile-menu' });
  Array.prototype.slice.call(document.querySelectorAll('#reader-modal button[title]')).forEach(function (b) {
    b.setAttribute('aria-label', b.getAttribute('title'));
  });

  /* Connect every <label> to the control that follows it */
  var uid = 0;
  function associateLabels() {
    Array.prototype.slice.call(document.querySelectorAll('label:not([for])')).forEach(function (label) {
      var el = label.nextElementSibling;
      while (el && !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el = el.nextElementSibling;
      if (!el) return;
      if (!el.id) el.id = 'ns-field-' + (++uid);
      label.setAttribute('for', el.id);
    });
  }
  associateLabels();
  document.querySelectorAll('svg').forEach(function (s) { s.setAttribute('aria-hidden', 'true'); });

  wrap('toggleMobileMenu', function (orig) {
    return function () {
      orig();
      if (menuBtn) menuBtn.setAttribute('aria-expanded', String(!$('mobile-menu').classList.contains('hidden')));
    };
  });

  wrap('renderFacultyPills', function (orig) {
    return function () {
      orig();
      Array.prototype.slice.call($('faculty-pills').querySelectorAll('button')).forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.textContent.trim() === state.selectedFaculty));
      });
    };
  });

  wrap('applyCampusScopeUI', function (orig) {
    return function () {
      orig();
      $('scope-nile').setAttribute('aria-pressed', String(state.campusScope === 'nile'));
      $('scope-nigeria').setAttribute('aria-pressed', String(state.campusScope === 'nigeria'));
    };
  });

  wrap('setTimerMode', function (orig) {
    return function (minutes, label) {
      orig(minutes, label);
      document.querySelectorAll('.timer-mode-btn').forEach(function (b) {
        b.setAttribute('aria-pressed', String(Number(b.dataset.min) === minutes));
      });
    };
  });

  wrap('switchTab', function (orig) {
    return function (tab) {
      orig(tab);
      document.querySelectorAll('.nav-tab').forEach(function (b) {
        if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
      });
      if (ready) {            /* do not steal focus on first load */
        var heading = document.querySelector('#view-' + tab + ' h1, #view-' + tab + ' h2');
        if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      }
    };
  });

  /* ------------------------------------------------------------------ */
  /* 5. Reader modal: dialog semantics, Escape, backdrop, focus trap      */
  /* ------------------------------------------------------------------ */
  var lastFocus = null;
  var modal = $('reader-modal');
  var dialog = $('reader-container');

  wrap('openReader', function (orig) {
    return function (id) {
      lastFocus = document.activeElement;
      orig(id);
      if (modal.classList.contains('hidden')) return;
      setAttrs(dialog, { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'reader-title', tabindex: '-1' });

      var body = $('reader-body');
      var h1 = body.querySelector('h1');                 /* the page already has an h1 */
      if (h1) {
        var h2 = document.createElement('h2');
        h2.className = h1.className;
        h2.textContent = h1.textContent;
        h1.replaceWith(h2);
      }
      var item = state.resources.find(function (r) { return r.id === id; });
      var meta = body.querySelector('p.opacity-75');      /* replaces invented pages / MB */
      if (meta && item) meta.textContent = isCustom(item)
        ? 'Added by you on this device. Not reviewed.'
        : 'Source: illustrative sample entry. Not a real publication.';

      var close = dialog.querySelector('[aria-label="Close reader"]');
      if (close) close.focus();
    };
  });

  wrap('closeReader', function (orig) {
    return function () {
      orig();
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
      else {
        var h = document.querySelector('main h1, main h2');
        if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
      }
    };
  });

  modal.addEventListener('click', function (e) { if (e.target === modal) closeReader(); });

  document.addEventListener('keydown', function (e) {
    if (modal.classList.contains('hidden')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeReader(); return; }
    if (e.key !== 'Tab') return;
    var focusable = Array.prototype.slice.call(dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(function (el) { return !el.disabled && el.offsetParent !== null; });
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ------------------------------------------------------------------ */
  /* 6. Re-apply attributes after the original init has run               */
  /* ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    renderFacultyPills();
    applyCampusScopeUI();
    renderGpaRows();
    calculateCGPA();
    updateShelfBadges();
    setTimerMode(25, 'Focus Session');
    associateLabels();
    ready = true;
  });
})();