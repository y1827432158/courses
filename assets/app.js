/* 课程导航 — 无依赖静态页 */
(function () {
  'use strict';

  var STORE_THEME = 'courses.theme';
  var THEMES = ['auto', 'light', 'dark'];

  var state = {
    course: null,
    query: '',
    filter: 'all',
    open: {}          // session code -> drawer open?
  };

  var root = document.getElementById('root');
  var tabsEl = document.getElementById('courseTabs');
  var searchEl = document.getElementById('searchInput');
  var themeBtn = document.getElementById('themeBtn');

  /* ---------- 工具 ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* 把命中的关键词包进 <mark>，输入已转义 */
  function hl(text, q) {
    var safe = esc(text);
    if (!q) return safe;
    var idx = safe.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return safe;
    return safe.slice(0, idx) + '<mark>' + safe.slice(idx, idx + q.length) +
           '</mark>' + safe.slice(idx + q.length);
  }

  function link(cls, href, icon, label, count) {
    var a = document.createElement('a');
    a.className = cls;
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = '<span class="ic">' + icon + '</span>' + esc(label) +
      (count != null ? ' <span class="n">' + count + '</span>' : '');
    return a;
  }

  function dead(cls, icon, label, count) {
    var s = document.createElement('span');
    s.className = cls + ' off';
    s.innerHTML = '<span class="ic">' + icon + '</span>' + esc(label) +
      (count != null ? ' <span class="n">' + count + '</span>' : '');
    return s;
  }

  /* ---------- 主题 ---------- */
  function applyTheme(mode) {
    var r = document.documentElement;
    r.setAttribute('data-theme-mode', mode);
    if (mode === 'auto') r.removeAttribute('data-theme');
    else r.setAttribute('data-theme', mode);
    try { localStorage.setItem(STORE_THEME, mode); } catch (e) {}
  }

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(STORE_THEME); } catch (e) {}
    applyTheme(THEMES.indexOf(saved) >= 0 ? saved : 'auto');
  }

  themeBtn.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme-mode') || 'auto';
    applyTheme(THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length]);
  });

  /* ---------- 载入课程数据 ---------- */
  function loadCourse(file) {
    return new Promise(function (resolve, reject) {
      var id = file.replace(/^.*\//, '').replace(/\.js$/, '');
      if (window.COURSE_ && window.COURSE_[id]) return resolve(window.COURSE_[id]);
      var s = document.createElement('script');
      s.src = file;
      s.onload = function () {
        var data = window.COURSE_ && window.COURSE_[id];
        data ? resolve(data) : reject(new Error('数据文件未注册：' + file));
      };
      s.onerror = function () { reject(new Error('无法载入：' + file)); };
      document.head.appendChild(s);
    });
  }

  /* ---------- 哈希路由 ---------- */
  function currentId() {
    var m = /^#\/(.+)$/.exec(location.hash);
    return m ? decodeURIComponent(m[1]) : null;
  }

  /* ---------- 渲染：课程标签 ---------- */
  function renderTabs(courses, activeId) {
    tabsEl.innerHTML = '';
    courses.forEach(function (c) {
      var a = el('a', 'tab');
      a.href = '#/' + c.id;
      a.innerHTML = '<span>' + (c.emoji || '📘') + '</span><span>' + esc(c.code || c.id) + '</span>';
      if (c.id === activeId) a.setAttribute('aria-current', 'page');
      tabsEl.appendChild(a);
    });
  }

  /* ---------- 渲染：统计 ---------- */
  function stats(course) {
    var s = course.sessions || [];
    var nLec = s.filter(function (x) { return x.kind === 'lecture'; }).length;
    var nSl = s.filter(function (x) { return x.slides; }).length;
    var nVd = s.filter(function (x) { return x.video; }).length;
    var nPaper = s.reduce(function (a, x) {
      return a + (x.readings || []).length + (x.references || []).length;
    }, 0);
    return [
      [nLec, '讲次'], [nSl, '课件'], [nVd, '录播'], [nPaper, '论文条目']
    ];
  }

  /* ---------- 渲染：单讲 ---------- */
  function sessionNode(s, q) {
    var wrap = el('article', 'lec' + (s.kind === 'break' ? ' is-break' : ''));

    var head = el('div', 'lec-head');
    head.appendChild(el('span', 'lec-code', s.code));

    var body = el('div', 'lec-body');
    var h = el('h3', 'lec-title');
    h.innerHTML = hl(s.title, q);
    body.appendChild(h);

    var sub = el('p', 'lec-sub');
    sub.appendChild(el('span', null, s.date));
    if (s.lecturer) sub.appendChild(el('span', 'lecturer', '👤 ' + s.lecturer));
    if (s.kind === 'break') sub.appendChild(el('span', null, '停课'));
    body.appendChild(sub);

    var acts = el('div', 'lec-actions');
    if (s.slides) acts.appendChild(link('mini', s.slides, '📄', '课件'));
    else acts.appendChild(dead('mini', '📄', '课件'));

    if (s.video) acts.appendChild(link('mini', s.video, '▶', '录播'));
    else acts.appendChild(dead('mini', '▶', '录播'));

    var nR = (s.readings || []).length, nF = (s.references || []).length;
    if (nR + nF) {
      var btn = el('button', 'mini');
      btn.type = 'button';
      btn.innerHTML = '<span class="ic">📖</span>阅读 <span class="n">' + (nR + nF) + '</span>';
      btn.setAttribute('aria-expanded', state.open[s.code] ? 'true' : 'false');
      if (state.open[s.code]) btn.classList.add('on');
      body.appendChild(acts);

      var drawer = buildDrawer(s, q);
      drawer.hidden = !state.open[s.code];

      btn.addEventListener('click', function () {
        var open = drawer.hidden;
        drawer.hidden = !open;
        state.open[s.code] = open;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.classList.toggle('on', open);
      });

      head.appendChild(body);
      wrap.appendChild(head);
      wrap.appendChild(drawer);
      return wrap;
    }

    body.appendChild(acts);
    head.appendChild(body);
    wrap.appendChild(head);
    return wrap;
  }

  function buildDrawer(s, q) {
    var d = el('div', 'drawer');
    if ((s.readings || []).length) {
      d.appendChild(el('h4', null, '必读 · ' + s.readings.length));
      d.appendChild(refList(s.readings, '', q));
    }
    if ((s.references || []).length) {
      var wide = s.references.length > 8;
      d.appendChild(el('h4', null, '延伸参考 · ' + s.references.length));
      d.appendChild(refList(s.references, wide ? 'refs-cols' : '', q));
    }
    return d;
  }

  function refList(items, cls, q) {
    var ul = el('ul', 'refs' + (cls ? ' ' + cls : ''));
    items.forEach(function (r) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = r.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML = hl(r.label, q);
      li.appendChild(a);
      if (/^https?:\/\//.test(r.url) && /arxiv\.org/.test(r.url)) {
        var t = el('span', 'tag', 'arXiv');
        li.appendChild(t);
      }
      ul.appendChild(li);
    });
    return ul;
  }

  /* ---------- 渲染：主视图 ---------- */
  function render() {
    var course = state.course;
    if (!course) return;

    var q = state.query.trim();
    var frag = document.createDocumentFragment();

    /* hero */
    var hero = el('section', 'hero');
    var top = el('div', 'hero-top');
    top.appendChild(el('span', 'hero-emoji', course.emoji || '📘'));

    var titleBox = el('div');
    var t = el('h1', 'hero-title');
    t.innerHTML = '<span class="code">' + esc(course.code) + '</span> · ' + esc(course.name);
    titleBox.appendChild(t);
    var meta = el('p', 'hero-meta');
    meta.textContent = [course.school_zh, course.school, course.term].filter(Boolean).join(' · ');
    titleBox.appendChild(meta);
    if ((course.instructors || []).length) {
      var ins = el('p', 'hero-meta');
      ins.textContent = '授课：' + course.instructors.join('、');
      titleBox.appendChild(ins);
    }
    top.appendChild(titleBox);
    hero.appendChild(top);

    if (course.note) hero.appendChild(el('p', 'hero-note', course.note));

    var links = el('div', 'links-row');
    (course.links || []).forEach(function (l) {
      links.appendChild(link('chip', l.url, '🔗', l.label));
    });
    hero.appendChild(links);
    frag.appendChild(hero);

    /* 统计 */
    var st = el('div', 'stats');
    stats(course).forEach(function (pair) {
      var d = el('div', 'stat');
      d.appendChild(el('b', null, String(pair[0])));
      d.appendChild(el('span', null, pair[1]));
      st.appendChild(d);
    });
    frag.appendChild(st);

    /* 筛选 + 讲次 */
    var sec = el('section', 'section');
    var stTitle = el('h2', 'section-title');
    stTitle.innerHTML = '课程表 <span class="count">共 ' + (course.sessions || []).length + ' 个课次</span>';
    sec.appendChild(stTitle);

    var filters = el('div', 'filters');
    [['all', '全部'], ['slides', '有课件'], ['video', '有录播'], ['todo', '待更新'], ['papers', '有论文']]
      .forEach(function (f) {
        var b = el('button', 'filter', f[1]);
        b.type = 'button';
        b.setAttribute('aria-pressed', state.filter === f[0] ? 'true' : 'false');
        b.addEventListener('click', function () {
          state.filter = f[0];
          render();
        });
        filters.appendChild(b);
      });
    sec.appendChild(filters);

    var listBox = el('div');
    var shown = 0;
    groupByModule(filterSessions(course.sessions, q)).forEach(function (grp) {
      var m = el('div', 'module');
      if (grp.name) {
        var nm = el('h3', 'module-name');
        nm.appendChild(el('span', null, grp.name));
        nm.appendChild(el('span', 'count', grp.items.length + ' 讲'));
        m.appendChild(nm);
      }
      grp.items.forEach(function (s) {
        shown++;
        m.appendChild(sessionNode(s, q));
      });
      listBox.appendChild(m);
    });

    if (!shown) {
      var e = el('div', 'empty');
      e.innerHTML = '<b>没有匹配的讲次</b>换个关键词，或把筛选切回「全部」。';
      listBox.appendChild(e);
    }
    sec.appendChild(listBox);
    frag.appendChild(sec);

    /* 作业 */
    if ((course.assignments || []).length) {
      var as = el('section', 'section');
      var at = el('h2', 'section-title');
      at.innerHTML = '作业 <span class="count">' + course.assignments.length + ' 份</span>';
      as.appendChild(at);
      var cards = el('div', 'cards');
      course.assignments.forEach(function (a) {
        var c = el('div', 'card');
        var hd = el('div', 'card-head');
        hd.appendChild(el('h4', null, 'A' + a.n + ' · ' + a.title));
        var d = el('span', 'due', '官方截止 ' + a.due);
        if (a.due < new Date().toISOString().slice(0, 10)) d.classList.add('past');
        hd.appendChild(d);
        c.appendChild(hd);
        if (a.desc) c.appendChild(el('p', null, a.desc));
        if (a.repo) {
          var lr = el('div', 'links-row');
          lr.appendChild(link('chip', a.repo, '📦', '仓库'));
          c.appendChild(lr);
        }
        cards.appendChild(c);
      });
      as.appendChild(cards);
      frag.appendChild(as);
    }

    /* 其他资源 */
    var extraGroups = [
      ['中文字幕 / 配音', course.cn_subs],
      ['镜像与整理', course.extra_links]
    ].filter(function (g) { return (g[1] || []).length; });

    if (extraGroups.length) {
      var es = el('section', 'section');
      es.appendChild(el('h2', 'section-title', '其他资源'));
      extraGroups.forEach(function (g) {
        var c = el('div', 'card');
        c.appendChild(el('h4', null, g[0]));
        var lr = el('div', 'links-row');
        g[1].forEach(function (l) { lr.appendChild(link('chip', l.url, '🔗', l.label)); });
        c.appendChild(lr);
        es.appendChild(c);
      });
      frag.appendChild(es);
    }

    /* 评分构成 */
    if ((course.grading || []).length) {
      var gs = el('section', 'section');
      gs.appendChild(el('h2', 'section-title', '评分构成（选课学生）'));
      var wrapT = el('div', 'grade-wrap');
      var tb = document.createElement('table');
      tb.className = 'grade-table';
      tb.innerHTML = '<thead><tr><th>项目</th><th class="w">占比</th><th>形式</th></tr></thead>';
      var tbody = document.createElement('tbody');
      course.grading.forEach(function (g) {
        var tr = document.createElement('tr');
        tr.appendChild(el('td', null, g.component));
        tr.appendChild(el('td', 'w', g.weight));
        tr.appendChild(el('td', null, g.format));
        tbody.appendChild(tr);
      });
      tb.appendChild(tbody);
      wrapT.appendChild(tb);
      gs.appendChild(wrapT);
      frag.appendChild(gs);
    }

    /* 页脚 */
    var f = el('footer', 'foot');
    f.innerHTML =
      '数据取自课程官方站点，抓取时间 2026-10-10。录播与课件随学期推进陆续放出，' +
      '标「待更新」的讲次表示官方尚未发布。<br>' +
      '新增课程：复制 <code>data/cmu-11-768.js</code> 改成你的课程，' +
      '再在 <code>data/courses.js</code> 的列表里加一行即可。';
    frag.appendChild(f);

    root.innerHTML = '';
    root.appendChild(frag);
  }

  /* ---------- 筛选与分组 ---------- */
  function matches(s, q) {
    if (!q) return true;
    var hay = [s.title, s.date, s.code, s.lecturer || '', s.module || ''].join(' ');
    if (hay.toLowerCase().indexOf(q.toLowerCase()) >= 0) return true;
    return (s.readings || []).concat(s.references || []).some(function (r) {
      return r.label.toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
  }

  function filterSessions(sessions, q) {
    return (sessions || []).filter(function (s) {
      if (!matches(s, q)) return false;
      switch (state.filter) {
        case 'slides': return !!s.slides;
        case 'video': return !!s.video;
        case 'todo': return s.kind === 'lecture' && !s.slides;
        case 'papers': return (s.readings || []).length + (s.references || []).length > 0;
        default: return true;
      }
    });
  }

  function groupByModule(sessions) {
    var order = [], map = {};
    sessions.forEach(function (s) {
      var k = s.module || '';
      if (!map[k]) { map[k] = []; order.push(k); }
      map[k].push(s);
    });
    return order.map(function (k) { return { name: k, items: map[k] }; });
  }

  /* ---------- 路由与启动 ---------- */
  function boot() {
    initTheme();

    var idx = (window.COURSE_INDEX && window.COURSE_INDEX.courses) || [];
    if (!idx.length) {
      root.innerHTML = '<div class="empty"><b>还没有课程</b>' +
        '编辑 <code>data/courses.js</code> 添加第一门课。</div>';
      return;
    }

    var id = currentId();
    if (!idx.some(function (c) { return c.id === id; })) id = idx[0].id;

    var entry = idx.filter(function (c) { return c.id === id; })[0];
    renderTabs(idx, id);

    loadCourse(entry.file).then(function (course) {
      state.course = course;
      document.title = course.code + ' · ' + course.name + ' — 课程导航';
      render();
    }).catch(function (err) {
      root.innerHTML = '<div class="empty"><b>载入失败</b>' + esc(err.message) +
        '<br>如果是在本地双击打开的，请改用 <code>python -m http.server</code> 起一个服务。</div>';
    });
  }

  window.addEventListener('hashchange', function () {
    var idx = (window.COURSE_INDEX && window.COURSE_INDEX.courses) || [];
    var id = currentId();
    var entry = idx.filter(function (c) { return c.id === id; })[0];
    if (!entry) return;
    if (state.course && state.course.id === id) { renderTabs(idx, id); return; }
    renderTabs(idx, id);
    loadCourse(entry.file).then(function (course) {
      state.course = course;
      state.open = {};
      document.title = course.code + ' · ' + course.name + ' — 课程导航';
      render();
      window.scrollTo(0, 0);
    });
  });

  var t;
  searchEl.addEventListener('input', function () {
    clearTimeout(t);
    var v = searchEl.value;
    t = setTimeout(function () { state.query = v; render(); }, 120);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== searchEl) {
      e.preventDefault();
      searchEl.focus();
      searchEl.select();
    } else if (e.key === 'Escape' && document.activeElement === searchEl) {
      searchEl.value = '';
      state.query = '';
      searchEl.blur();
      render();
    }
  });

  boot();
})();
