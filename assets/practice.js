/* Practice app for LearnSpanishForAll.
   Vanilla JS. Progress is always saved to localStorage; when the user is
   signed in (Appwrite configured in assets/appwrite-config.js), the same
   state is mirrored to one Appwrite row per user. */
(function () {
  "use strict";

  var root = document.getElementById("practice-app");
  if (!root) return;

  var CUR = window.CURRICULUM;
  if (!CUR || !CUR.subjects || !CUR.subjects.length) {
    root.innerHTML =
      '<div class="pa-card pa-notice">The practice curriculum has not been generated yet. / El currículo aún no se generó. ' +
      "Run <code>py scripts/build_curriculum.py</code> and rebuild the site.</div>";
    return;
  }

  var GOAL = CUR.goalDays;
  var STORAGE_KEY = "learn-spanish-for-all-practice-v1";
  var REVIEW_QUESTIONS = 2; // bonus spaced-review checks from earlier days
  var TEST_SECONDS = 180; // max 3 minutes
  var TEST_MAX_QUESTIONS = 5;
  var GRADE_POINTS = { correct: 100, mostly_correct: 60, incorrect: 0 };

  /* v1 topic emphasis — remaps which subject feels "featured" without regenerating days. */
  var TOPIC_FOCUS = [
    { id: "balanced", label: "Balanced path / Camino equilibrado", match: null },
    { id: "travel", label: "Travel & going out / Viajes", match: /travel|places|food|weather/i },
    { id: "conversation", label: "Conversation basics / Conversación", match: /greetings|identity|family|likes/i },
    { id: "daily-life", label: "Daily life / Vida diaria", match: /routines|home|food|shopping|numbers/i },
    { id: "grammar-bridge", label: "Grammar bridge / Puente gramatical", match: /routines|places|past|plans|likes/i }
  ];

  /* Normalize a day to the task+check shape. Older quiz/apply/MCQ days still work. */
  function normalizeCheck(q) {
    if (!q) return null;
    if (q.rubric && !q.choices) return q;
    if (q.choices && typeof q.answer === "number") {
      var right = q.choices[q.answer] || "";
      return {
        q: q.q,
        rubric: "A strong answer should capture this idea: " + right +
          (q.explain ? " Additional guidance: " + q.explain : ""),
        exemplar: right + (q.explain ? " — " + q.explain : "")
      };
    }
    return q;
  }

  function normalizeDay(day) {
    if (!day) return day;
    var checks = (day.check || day.quiz || []).map(normalizeCheck).filter(Boolean);
    if (day.task && day.check && day.check[0] && day.check[0].rubric && !day.check[0].choices) {
      return day;
    }
    return {
      focus: day.focus,
      review: day.review,
      task: day.task || {
        do: day.apply || "Practice today's idea with your own study material for a few minutes.",
        capture: "Write what you did and what you noticed.",
        minutes: 8
      },
      check: checks
    };
  }

  /* ---------------- state ---------------- */

  function newState() {
    return {
      startedAt: null,
      completedDays: [],
      log: {},
      testLog: [],
      topicFocus: "balanced",
      updatedAt: 0
    };
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  var state = loadLocal() || newState();
  if (!state.testLog) state.testLog = [];
  if (!state.topicFocus) state.topicFocus = "balanced";

  function mergeStates(a, b) {
    var days = {};
    (a.completedDays || []).concat(b.completedDays || []).forEach(function (d) {
      days[d] = true;
    });
    var merged = newState();
    merged.completedDays = Object.keys(days)
      .map(Number)
      .sort(function (x, y) { return x - y; });
    if (a.startedAt && b.startedAt) {
      merged.startedAt = a.startedAt < b.startedAt ? a.startedAt : b.startedAt;
    } else {
      merged.startedAt = a.startedAt || b.startedAt;
    }
    var older = (a.updatedAt || 0) <= (b.updatedAt || 0) ? a : b;
    var newer = older === a ? b : a;
    merged.log = {};
    Object.keys(older.log || {}).forEach(function (k) { merged.log[k] = older.log[k]; });
    Object.keys(newer.log || {}).forEach(function (k) { merged.log[k] = newer.log[k]; });
    merged.topicFocus = newer.topicFocus || older.topicFocus || "balanced";
    merged.testLog = mergeTestLogs(older.testLog || [], newer.testLog || []);
    merged.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
    return merged;
  }

  function mergeTestLogs(a, b) {
    var map = {};
    a.concat(b).forEach(function (t) {
      if (!t || !t.id) return;
      var prev = map[t.id];
      if (!prev || (t.at || 0) >= (prev.at || 0)) map[t.id] = t;
    });
    return Object.keys(map)
      .map(function (k) { return map[k]; })
      .sort(function (x, y) { return (y.at || 0) - (x.at || 0); })
      .slice(0, 60);
  }

  function save() {
    state.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage full or blocked; cloud sync may still work */ }
    pushCloud();
  }

  /* ---------------- appwrite ---------------- */

  var cfg = window.APPWRITE_CONFIG || null;
  var aw = null;
  var user = null;
  var syncMsg = "";
  var authView = "login";
  var recoveryUserId = null;
  var recoverySecret = null;
  var viewRoot = root;
  var calCursor = new Date();
  calCursor.setDate(1);
  calCursor.setHours(0, 0, 0, 0);
  var tutorMessages = [];
  var tutorBusy = false;
  var tutorDraft = "";
  var testTimerId = null;

  try {
    var recoveryParams = new URLSearchParams(window.location.search);
    var rid = recoveryParams.get("userId");
    var rsecret = recoveryParams.get("secret");
    if (rid && rsecret) {
      authView = "reset";
      recoveryUserId = rid;
      recoverySecret = rsecret;
    }
  } catch (e) { /* ignore bad URL */ }

  try {
    if (cfg && window.Appwrite) {
      var client =
        (window.APPWRITE && window.APPWRITE.client) ||
        new Appwrite.Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId);
      aw = {
        client: client,
        account: (window.APPWRITE && window.APPWRITE.account) || new Appwrite.Account(client),
        tables: new Appwrite.TablesDB(client),
        functions: new Appwrite.Functions(client),
        databases: (window.APPWRITE && window.APPWRITE.databases) || new Appwrite.Databases(client)
      };
    }
  } catch (e) {
    console.warn("[Practice] Appwrite SDK incompatible — continuing local-only.", e);
    aw = null;
  }

  var pingMsg = "Checking Appwrite… / Verificando Appwrite…";
  document.addEventListener("appwrite:ping", function (ev) {
    var d = ev.detail || {};
    pingMsg = d.ok
      ? "Appwrite ping OK · Conexión lista"
      : "Appwrite ping failed · Falló el ping" + (d.error ? " (" + d.error + ")" : "");
    if (!session) render();
  });
  if (window.APPWRITE_PING) {
    pingMsg = window.APPWRITE_PING.ok
      ? "Appwrite ping OK · Conexión lista"
      : "Appwrite ping failed · Falló el ping";
  }

  function pullCloud() {
    if (!aw || !user) return Promise.resolve();
    return aw.tables
      .getRow({ databaseId: cfg.databaseId, tableId: cfg.tableId, rowId: user.$id })
      .then(function (row) {
        var remote;
        try { remote = JSON.parse(row.data); } catch (e) { remote = null; }
        if (remote) {
          state = mergeStates(state, remote);
          if (!state.testLog) state.testLog = [];
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
        }
        syncMsg = "Progress synced.";
      })
      .catch(function (err) {
        if (err && err.code === 404) {
          return createCloudRow();
        }
        syncMsg = "Couldn't load cloud progress: " + (err.message || err);
      });
  }

  function createCloudRow() {
    var P = Appwrite.Permission, R = Appwrite.Role;
    return aw.tables
      .createRow({
        databaseId: cfg.databaseId,
        tableId: cfg.tableId,
        rowId: user.$id,
        data: { data: JSON.stringify(state) },
        permissions: [
          P.read(R.user(user.$id)),
          P.update(R.user(user.$id)),
          P.delete(R.user(user.$id))
        ]
      })
      .then(function () { syncMsg = "Progress synced."; })
      .catch(function (err) {
        syncMsg = "Couldn't create cloud save: " + (err.message || err);
      });
  }

  function pushCloud() {
    if (!aw || !user) return;
    aw.tables
      .updateRow({
        databaseId: cfg.databaseId,
        tableId: cfg.tableId,
        rowId: user.$id,
        data: { data: JSON.stringify(state) }
      })
      .then(function () { syncMsg = "Progress synced."; renderSyncLine(); })
      .catch(function (err) {
        if (err && err.code === 404) {
          createCloudRow().then(renderSyncLine);
        } else {
          syncMsg = "Sync failed: " + (err.message || err);
          renderSyncLine();
        }
      });
  }

  /* ---------------- curriculum helpers ---------------- */

  function dayEntry(n) {
    var idx = n - 1;
    for (var i = 0; i < CUR.subjects.length; i++) {
      var s = CUR.subjects[i];
      if (idx < s.days.length) {
        return {
          subject: s,
          day: normalizeDay(s.days[idx]),
          subjectDay: idx + 1,
          subjectIndex: i
        };
      }
      idx -= s.days.length;
    }
    return null;
  }

  function currentDay() {
    var done = {};
    (state.completedDays || []).forEach(function (d) { done[d] = true; });
    for (var i = 1; i <= GOAL; i++) {
      if (!done[i]) return i;
    }
    return GOAL + 1;
  }

  function isDayCompleted(n) {
    return (state.completedDays || []).indexOf(n) !== -1;
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function dateKey(d) {
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function parseDateKey(key) {
    var parts = String(key || "").split("-");
    if (parts.length !== 3) return null;
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return isNaN(d.getTime()) ? null : d;
  }

  function daysBetween(aKey, bKey) {
    var a = parseDateKey(aKey);
    var b = parseDateKey(bKey);
    if (!a || !b) return null;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function streak() {
    var dates = practicedDateSet();
    var count = 0;
    var cursor = new Date();
    if (!dates[todayKey()]) cursor.setDate(cursor.getDate() - 1);
    for (;;) {
      var key = dateKey(cursor);
      if (!dates[key]) break;
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  function practicedDateSet() {
    var dates = {};
    Object.keys(state.log || {}).forEach(function (k) {
      if (state.log[k] && state.log[k].date) dates[state.log[k].date] = true;
    });
    (state.testLog || []).forEach(function (t) {
      if (t && t.date) dates[t.date] = true;
    });
    return dates;
  }

  function reviewQuestions(beforeDay) {
    var pool = [];
    for (var d = 1; d < beforeDay; d++) {
      var e = dayEntry(d);
      if (!e) continue;
      (e.day.check || []).forEach(function (q) {
        pool.push({ q: q, from: e.subject.title, bucket: null, planDay: d });
      });
    }
    var picked = [];
    while (picked.length < REVIEW_QUESTIONS && pool.length) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return picked;
  }

  function scoreFromGrades(grades) {
    var list = (grades || []).filter(function (g) { return GRADE_POINTS[g] !== undefined; });
    if (!list.length) return null;
    var sum = 0;
    list.forEach(function (g) { sum += GRADE_POINTS[g]; });
    return Math.round(sum / list.length);
  }

  function overallGradeSummary() {
    var rows = [];
    Object.keys(state.log || {}).forEach(function (k) {
      var entry = state.log[k];
      if (!entry || !entry.grades) return;
      var score = scoreFromGrades(entry.grades);
      if (score === null) return;
      rows.push({
        day: Number(k),
        date: entry.date || "",
        score: score,
        tallies: entry.tallies || {},
        total: entry.total || entry.grades.length
      });
    });
    rows.sort(function (a, b) { return a.day - b.day; });
    var overall = null;
    if (rows.length) {
      var sum = 0;
      rows.forEach(function (r) { sum += r.score; });
      overall = Math.round(sum / rows.length);
    }
    return { rows: rows, overall: overall };
  }

  /* Spaced buckets: material completed ~1 day, ~7 days, ~30 days ago. */
  function spacedBucketPools() {
    var today = todayKey();
    var buckets = {
      day: { label: "1 day prior / 1 día antes", target: 1, items: [] },
      week: { label: "1 week prior / 1 semana antes", target: 7, items: [] },
      month: { label: "1 month prior / 1 mes antes", target: 30, items: [] }
    };
    Object.keys(state.log || {}).forEach(function (k) {
      var entry = state.log[k];
      if (!entry || !entry.date) return;
      var age = daysBetween(entry.date, today);
      if (age === null || age < 1) return;
      var planDay = Number(k);
      var e = dayEntry(planDay);
      if (!e) return;
      var checks = (e.day.check || []).map(function (q) {
        return { q: q, from: e.subject.title, planDay: planDay, age: age };
      });
      if (!checks.length) return;
      // Prefer exact targets; allow nearby windows so sparse calendars still work.
      if (age >= 1 && age <= 2) {
        checks.forEach(function (c) { buckets.day.items.push(Object.assign({}, c, { bucket: "day" })); });
      }
      if (age >= 5 && age <= 9) {
        checks.forEach(function (c) { buckets.week.items.push(Object.assign({}, c, { bucket: "week" })); });
      }
      if (age >= 25 && age <= 35) {
        checks.forEach(function (c) { buckets.month.items.push(Object.assign({}, c, { bucket: "month" })); });
      }
    });
    return buckets;
  }

  function pickFromPool(pool, n) {
    var copy = pool.slice();
    var out = [];
    while (out.length < n && copy.length) {
      out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    return out;
  }

  function buildPracticeTestQuestions() {
    var buckets = spacedBucketPools();
    var picked = [];
    ["day", "week", "month"].forEach(function (key) {
      pickFromPool(buckets[key].items, 2).forEach(function (item) {
        if (picked.length < TEST_MAX_QUESTIONS) picked.push(item);
      });
    });
    // If a bucket is empty, fill from any completed prior material so the test still runs.
    if (picked.length < 3) {
      var fallback = [];
      Object.keys(state.log || {}).forEach(function (k) {
        var planDay = Number(k);
        var e = dayEntry(planDay);
        if (!e) return;
        (e.day.check || []).forEach(function (q) {
          fallback.push({
            q: q,
            from: e.subject.title,
            planDay: planDay,
            bucket: "review",
            age: daysBetween(state.log[k].date, todayKey())
          });
        });
      });
      pickFromPool(fallback, TEST_MAX_QUESTIONS - picked.length).forEach(function (item) {
        picked.push(item);
      });
    }
    // De-dupe by question text
    var seen = {};
    return picked.filter(function (item) {
      var key = (item.q && item.q.q) || "";
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    }).slice(0, TEST_MAX_QUESTIONS);
  }

  function practiceTestAvailability() {
    var buckets = spacedBucketPools();
    var completed = (state.completedDays || []).length;
    return {
      buckets: buckets,
      canStart: completed >= 1,
      dayCount: buckets.day.items.length,
      weekCount: buckets.week.items.length,
      monthCount: buckets.month.items.length
    };
  }

  /* ---------------- tiny DOM helper ---------------- */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k === "onclick") node.addEventListener("click", attrs[k]);
        else if (k === "onchange") node.addEventListener("change", attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function emphasize(text) {
    var span = document.createElement("span");
    text.split(/(\*[^*]+\*)/g).forEach(function (part) {
      if (part.length > 2 && part[0] === "*" && part[part.length - 1] === "*") {
        var em = document.createElement("em");
        em.textContent = part.slice(1, -1);
        span.appendChild(em);
      } else if (part) {
        span.appendChild(document.createTextNode(part));
      }
    });
    return span;
  }

  /* ---------------- views ---------------- */

  var session = null;

  function clearTestTimer() {
    if (testTimerId) {
      clearInterval(testTimerId);
      testTimerId = null;
    }
  }

  function render() {
    root.innerHTML = "";
    var shell = el("div", { class: "pa-shell" });
    viewRoot = el("div", { class: "pa-main" });
    var tutorHost = el("aside", { class: "pa-tutor-host", "aria-label": "Spanish tutor" });
    shell.appendChild(viewRoot);
    shell.appendChild(tutorHost);
    root.appendChild(shell);

    if (session) renderSession();
    else renderDashboard();
    viewRoot.appendChild(renderAccountPanel());
    renderTutor(tutorHost);
  }

  function renderSyncLine() {
    var line = document.getElementById("pa-sync-line");
    if (line) line.textContent = syncMsg;
  }

  function renderDashboard() {
    var done = state.completedDays.length;
    var day = currentDay();
    var pct = Math.min(100, Math.round((done / GOAL) * 100));
    if (!state.topicFocus) state.topicFocus = "balanced";
    var gradeSummary = overallGradeSummary();

    var headerStats = [
      stat(done, "sessions / sesiones"),
      stat(streak(), "day streak / racha")
    ];
    if (gradeSummary.overall !== null) {
      headerStats.push(stat(gradeSummary.overall + "%", "overall grade / nota"));
    }

    var header = el("div", { class: "pa-card pa-dash" }, [
      el("div", { class: "pa-dash-top" }, [
        el("div", {}, [
          el("div", { class: "pa-kicker", text: done >= GOAL ? "Plan complete / Plan completo" : "Day " + day + " of " + GOAL + " · Día " + day + " de " + GOAL }),
          el("div", { class: "pa-big", text: done >= GOAL ? "You did it. / Lo lograste." : (dayEntry(day) ? dayEntry(day).subject.title : "") })
        ]),
        el("div", { class: "pa-stats" }, headerStats)
      ]),
      el("div", { class: "pa-bar" }, [el("div", { class: "pa-bar-fill", style: "width:" + pct + "%" })]),
      el("div", { class: "pa-bar-label", text: pct + "% of the flexible plan · del plan flexible" }),
      el("p", { class: "pa-small pa-muted", id: "pa-ping-line", text: pingMsg })
    ]);

    viewRoot.appendChild(header);
    viewRoot.appendChild(renderTopicFocus());
    viewRoot.appendChild(renderPracticeTestCard());
    viewRoot.appendChild(renderGradesOverview(gradeSummary));
    viewRoot.appendChild(renderPracticeCalendar());

    if (done >= GOAL) {
      viewRoot.appendChild(el("div", { class: "pa-card pa-notice" }, [
        el("p", { text: "All " + GOAL + " sessions are complete. Retry any day below anytime. / Las " + GOAL + " sesiones están hechas. Puedes repetir cualquier día abajo." })
      ]));
    } else {
      var entry = dayEntry(day);
      var alreadyToday = sessionDoneToday();
      var focusNote = topicFocusNote(entry && entry.subject);
      var cta = el("div", { class: "pa-card pa-today" }, [
        el("div", { class: "pa-kicker", text: "Today's session · 15–20 minutes / Sesión de hoy · 15–20 minutos" }),
        el("h3", { text: entry.day.focus }),
        el("p", { class: "pa-muted", text: entry.subject.title + " - day " + entry.subjectDay + " of " + entry.subject.days.length }),
        focusNote ? el("p", { class: "pa-small", text: focusNote }) : null,
        el("p", { class: "pa-small pa-muted", text: "Do the Spanish task aloud/on paper, then write your checks. / Haz la tarea en voz alta o en papel; luego escribe las comprobaciones." }),
        el("button", {
          class: "pa-btn pa-btn-primary",
          text: alreadyToday ? "Start another session (Day " + day + ")" : "Start Day " + day + " · Empezar día " + day,
          onclick: function () { startSession(); }
        }),
        alreadyToday
          ? el("p", { class: "pa-muted pa-small", text: "You already finished a session today. Another advances the plan; retries below do not. / Ya terminaste hoy. Otra sesión avanza el plan; reintentar abajo no." })
          : null
      ]);
      viewRoot.appendChild(cta);
    }

    viewRoot.appendChild(renderSubjectGrid());
  }

  function renderPracticeTestCard() {
    var avail = practiceTestAvailability();
    var kids = [
      el("div", { class: "pa-kicker", text: "Spaced practice test · ≤ 3 min / Prueba espaciada" }),
      el("h3", { text: "Quick check of what stuck" }),
      el("p", {
        class: "pa-small pa-muted",
        text: "Pulls checks from material you finished about a day, a week, and a month ago — the same spacing idea from the course. Does not move your day plan. / Usa lo hecho ~1 día, ~1 semana y ~1 mes atrás. No mueve tu plan."
      }),
      el("div", { class: "pa-bucket-row" }, [
        bucketChip("Day / Día", avail.dayCount),
        bucketChip("Week / Semana", avail.weekCount),
        bucketChip("Month / Mes", avail.monthCount)
      ])
    ];

    if (!avail.canStart) {
      kids.push(el("p", {
        class: "pa-muted pa-small",
        text: "Complete at least one practice day first. / Completa al menos un día de práctica primero."
      }));
    } else {
      kids.push(el("button", {
        class: "pa-btn pa-btn-primary",
        text: "Start 3-minute test · Empezar prueba",
        onclick: function () { startPracticeTest(); }
      }));
      if (!avail.dayCount && !avail.weekCount && !avail.monthCount) {
        kids.push(el("p", {
          class: "pa-muted pa-small",
          text: "Exact day/week/month windows are empty right now — the test will review any completed material. / Las ventanas exactas están vacías; la prueba repasará material ya hecho."
        }));
      }
    }

    var recent = (state.testLog || []).slice(0, 3);
    if (recent.length) {
      kids.push(el("div", { class: "pa-test-recent" }, [
        el("div", { class: "pa-small pa-muted", text: "Recent tests / Pruebas recientes" })
      ].concat(recent.map(function (t) {
        return el("div", {
          class: "pa-test-recent-row",
          text: (t.date || "") + " · " + (t.score != null ? t.score + "%" : "—") +
            " · " + (t.answered || 0) + "/" + (t.total || 0) + " answered"
        });
      }))));
    }

    return el("div", { class: "pa-card pa-test-card" }, kids);
  }

  function bucketChip(label, count) {
    return el("div", { class: "pa-bucket-chip" + (count ? " pa-bucket-ready" : "") }, [
      el("strong", { text: String(count) }),
      el("span", { text: label })
    ]);
  }

  function renderGradesOverview(summary) {
    summary = summary || overallGradeSummary();
    var kids = [
      el("div", { class: "pa-kicker", text: "Grades by day / Notas por día" }),
      el("h3", { text: "How your completed days scored" })
    ];
    if (!summary.rows.length) {
      kids.push(el("p", {
        class: "pa-muted pa-small",
        text: "Finish a session with graded checks to see scores here. / Completa una sesión con comprobaciones calificadas para ver notas."
      }));
      return el("div", { class: "pa-card" }, kids);
    }

    kids.push(el("p", {
      class: "pa-grade-overall",
      text: "Overall average / Promedio: " + summary.overall + "%"
    }));
    kids.push(el("p", {
      class: "pa-muted pa-small",
      text: "Scoring: correct 100% · mostly correct 60% · not correct 0%."
    }));

    var list = el("div", { class: "pa-grade-list" });
    summary.rows.slice().reverse().slice(0, 12).forEach(function (row) {
      var entry = dayEntry(row.day);
      list.appendChild(el("div", { class: "pa-grade-row" }, [
        el("div", { class: "pa-grade-day", text: "Day " + row.day }),
        el("div", { class: "pa-grade-meta" }, [
          el("div", { text: entry ? entry.day.focus : ("Plan day " + row.day) }),
          el("div", {
            class: "pa-muted pa-small",
            text: (row.date || "—") + " · " +
              (row.tallies.correct || 0) + " ✓ · " +
              (row.tallies.mostly_correct || 0) + " ~ · " +
              (row.tallies.incorrect || 0) + " ✗"
          })
        ]),
        el("div", {
          class: "pa-grade-pct " + gradePctClass(row.score),
          text: row.score + "%"
        })
      ]));
    });
    kids.push(list);
    if (summary.rows.length > 12) {
      kids.push(el("p", {
        class: "pa-muted pa-small",
        text: "Showing the 12 most recent graded days. / Mostrando los 12 días más recientes."
      }));
    }
    return el("div", { class: "pa-card" }, kids);
  }

  function gradePctClass(score) {
    if (score >= 80) return "pa-grade-pct-high";
    if (score >= 50) return "pa-grade-pct-mid";
    return "pa-grade-pct-low";
  }

  function renderPracticeCalendar() {
    var practiced = practicedDateSet();
    var year = calCursor.getFullYear();
    var month = calCursor.getMonth();
    var monthName = calCursor.toLocaleString(undefined, { month: "long", year: "numeric" });
    var firstDow = new Date(year, month, 1).getDay(); // 0 Sun
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var today = todayKey();

    var startBound = null;
    if (state.startedAt) {
      startBound = parseDateKey(dateKey(new Date(state.startedAt)));
    }
    Object.keys(practiced).forEach(function (k) {
      var d = parseDateKey(k);
      if (!d) return;
      if (!startBound || d < startBound) startBound = d;
    });

    var head = el("div", { class: "pa-cal-head" }, [
      el("button", {
        class: "pa-btn pa-btn-ghost pa-btn-small",
        text: "←",
        onclick: function () {
          calCursor.setMonth(calCursor.getMonth() - 1);
          render();
        }
      }),
      el("div", { class: "pa-cal-title", text: monthName }),
      el("button", {
        class: "pa-btn pa-btn-ghost pa-btn-small",
        text: "→",
        onclick: function () {
          calCursor.setMonth(calCursor.getMonth() + 1);
          render();
        }
      })
    ]);

    var grid = el("div", { class: "pa-cal-grid" });
    ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach(function (d) {
      grid.appendChild(el("div", { class: "pa-cal-dow", text: d }));
    });

    for (var i = 0; i < firstDow; i++) {
      grid.appendChild(el("div", { class: "pa-cal-cell pa-cal-empty" }));
    }

    for (var dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      var cellDate = new Date(year, month, dayNum);
      var key = dateKey(cellDate);
      var isFuture = key > today;
      var beforeStart = startBound ? key < dateKey(startBound) : false;
      var did = !!practiced[key];
      var classes = "pa-cal-cell";
      var title = key;
      if (key === today) classes += " pa-cal-today";
      if (isFuture || beforeStart) {
        classes += " pa-cal-out";
      } else if (did) {
        classes += " pa-cal-done";
        title += " · practiced";
      } else {
        classes += " pa-cal-miss";
        title += " · no practice";
      }
      grid.appendChild(el("div", {
        class: classes,
        title: title,
        text: String(dayNum)
      }));
    }

    var legend = el("div", { class: "pa-cal-legend" }, [
      el("span", { class: "pa-cal-leg pa-cal-done", text: "Practiced / Hecho" }),
      el("span", { class: "pa-cal-leg pa-cal-miss", text: "Missed / Sin práctica" }),
      el("span", { class: "pa-cal-leg pa-cal-today", text: "Today / Hoy" })
    ]);

    return el("div", { class: "pa-card" }, [
      el("div", { class: "pa-kicker", text: "Practice calendar / Calendario" }),
      el("h3", { text: "Days you practiced" }),
      el("p", {
        class: "pa-muted pa-small",
        text: "Exact calendar days with a finished session or spaced test since you started. / Días exactos con sesión o prueba desde que empezaste."
      }),
      head,
      grid,
      legend
    ]);
  }

  function renderTopicFocus() {
    var select = el("select", {
      class: "pa-select",
      onchange: function (e) {
        state.topicFocus = e.target.value;
        save();
        render();
      }
    });
    TOPIC_FOCUS.forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.label;
      if ((state.topicFocus || "balanced") === t.id) opt.selected = true;
      select.appendChild(opt);
    });
    return el("div", { class: "pa-card" }, [
      el("div", { class: "pa-kicker", text: "Focus (v1) / Enfoque" }),
      el("p", { class: "pa-small pa-muted", text: "Choose what you want to emphasize. The day plan stays intact; matching subjects are highlighted. Free-text AI program builder is v2. / Elige un énfasis. El plan diario se mantiene; se destacan temas relacionados. El constructor AI libre es v2." }),
      select
    ]);
  }

  function topicFocusNote(subject) {
    var focus = TOPIC_FOCUS.find(function (t) { return t.id === (state.topicFocus || "balanced"); });
    if (!focus || !focus.match || !subject) return "";
    if (focus.match.test(subject.id) || focus.match.test(subject.title)) {
      return "Matches your focus · Coincide con tu enfoque: " + focus.label;
    }
    return "Staying on the core path today; your focus will shine on matching units. / Hoy sigues el camino base; tu enfoque brilla en unidades relacionadas.";
  }

  function stat(value, label) {
    return el("div", { class: "pa-stat" }, [
      el("div", { class: "pa-stat-num", text: String(value) }),
      el("div", { class: "pa-stat-label", text: label })
    ]);
  }

  function sessionDoneToday() {
    var t = todayKey();
    return Object.keys(state.log).some(function (k) {
      return state.log[k] && state.log[k].date === t;
    });
  }

  function renderSubjectGrid() {
    var offset = 0;
    var next = currentDay();
    var panels = CUR.subjects.map(function (s, subjectIndex) {
      var startDay = offset + 1;
      var endDay = offset + s.days.length;
      var doneInSubject = state.completedDays.filter(function (d) {
        return d >= startDay && d <= endDay;
      }).length;
      var isCurrent = next >= startDay && next <= endDay && next <= GOAL;
      var isComplete = doneInSubject === s.days.length;
      var statusLabel = isComplete ? "Complete" : (isCurrent ? "Current" : (doneInSubject ? "In progress" : "Upcoming"));
      var statusClass = isComplete ? "pa-status-done" : (isCurrent ? "pa-status-current" : (doneInSubject ? "pa-status-progress" : "pa-status-upcoming"));

      var dayRows = [];
      for (var i = 0; i < s.days.length; i++) {
        var globalDay = startDay + i;
        var focus = (normalizeDay(s.days[i]).focus) || ("Day " + (i + 1));
        var completed = isDayCompleted(globalDay);
        var isNext = globalDay === next && next <= GOAL;
        var logEntry = state.log[globalDay];
        var dayScore = logEntry ? scoreFromGrades(logEntry.grades) : null;
        var statusPill = completed
          ? el("span", {
            class: "pa-pill pa-pill-done",
            text: dayScore !== null ? ("Done · " + dayScore + "%") : "Done"
          })
          : (isNext
            ? el("span", { class: "pa-pill pa-pill-next", text: "Up next" })
            : el("span", { class: "pa-pill pa-pill-locked", text: "Locked" }));

        var action = null;
        if (completed) {
          action = el("button", {
            class: "pa-btn pa-btn-ghost pa-btn-small",
            text: "Retry day",
            onclick: (function (d) {
              return function () { startSession(d, { retry: true }); };
            })(globalDay)
          });
        } else if (isNext) {
          action = el("button", {
            class: "pa-btn pa-btn-primary pa-btn-small",
            text: "Start day",
            onclick: function () { startSession(); }
          });
        }

        dayRows.push(el("div", {
          class: "pa-day-row" + (completed ? " pa-day-done" : "") + (isNext ? " pa-day-next" : "")
        }, [
          el("div", { class: "pa-day-index", text: String(i + 1).padStart(2, "0") }),
          el("div", { class: "pa-day-meta" }, [
            el("div", { class: "pa-day-focus", text: focus }),
            el("div", { class: "pa-day-sub", text: "Plan day " + globalDay + " of " + GOAL })
          ]),
          statusPill,
          action || el("span", { class: "pa-day-spacer" })
        ]));
      }

      var summary = el("summary", { class: "pa-accordion-summary" }, [
        el("div", { class: "pa-accordion-left" }, [
          el("span", { class: "pa-accordion-part", text: "Subject " + (subjectIndex + 1) }),
          el("span", { class: "pa-accordion-title", text: s.title }),
          el("a", {
            class: "pa-accordion-lesson",
            href: s.lesson,
            text: "Lesson page",
            onclick: function (ev) { ev.stopPropagation(); }
          })
        ]),
        el("div", { class: "pa-accordion-right" }, [
          el("span", { class: "pa-status " + statusClass, text: statusLabel }),
          el("span", { class: "pa-accordion-count", text: doneInSubject + " / " + s.days.length }),
          el("span", { class: "pa-accordion-chevron", "aria-hidden": "true", text: "" })
        ])
      ]);

      var body = el("div", { class: "pa-accordion-body" }, [
        el("div", { class: "pa-bar pa-bar-mini" }, [
          el("div", { class: "pa-bar-fill", style: "width:" + Math.round((doneInSubject / s.days.length) * 100) + "%" })
        ]),
        el("p", {
          class: "pa-muted pa-small pa-accordion-hint",
          text: isComplete
            ? "All days in this subject are done. Retry any day below for spaced practice."
            : (isCurrent
              ? "This is your current subject. Start the highlighted day, or retry anything you've already finished."
              : (doneInSubject
                ? "You've started this subject. Completed days can be retried; later days unlock as you progress."
                : "These days unlock when your plan reaches this subject."))
        }),
        el("div", { class: "pa-day-list" }, dayRows)
      ]);

      var details = el("details", {
        class: "pa-accordion" + (isCurrent ? " pa-accordion-current" : "")
      }, [summary, body]);
      if (isCurrent) details.open = true;

      offset += s.days.length;
      return details;
    });

    return el("div", { class: "pa-subject-panel" }, [
      el("div", { class: "pa-subject-panel-head" }, [
        el("h2", { class: "pa-section-title", text: "Subjects & retry" }),
        el("p", { class: "pa-muted pa-small", text: "Expand a subject to see its 10 practice days. Retry finished days anytime — your plan position stays put." })
      ]),
      el("div", { class: "pa-accordion-list" }, panels)
    ]);
  }

  /* ---------------- session flow ---------------- */

  function startSession(dayNumber, opts) {
    opts = opts || {};
    clearTestTimer();
    if (typeof dayNumber !== "number" || !isFinite(dayNumber)) {
      dayNumber = currentDay();
      opts = {};
    }
    var entry = dayEntry(dayNumber);
    if (!entry) return;
    var isRetry = !!opts.retry || isDayCompleted(dayNumber);
    if (!isRetry && dayNumber !== currentDay()) {
      dayNumber = currentDay();
      entry = dayEntry(dayNumber);
      isRetry = false;
      if (!entry) return;
    }
    var questions = (entry.day.check || []).map(function (q) {
      return { q: q, from: null, bucket: null, planDay: dayNumber };
    }).concat(reviewQuestions(dayNumber));
    session = {
      mode: "day",
      dayNumber: dayNumber,
      entry: entry,
      questions: questions,
      qIndex: 0,
      grades: [],
      work: "",
      isRetry: isRetry,
      phase: "review"
    };
    if (!state.startedAt) { state.startedAt = new Date().toISOString(); save(); }
    render();
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startPracticeTest() {
    clearTestTimer();
    var questions = buildPracticeTestQuestions();
    if (!questions.length) {
      window.alert("No completed material to test yet. Finish a practice day first.");
      return;
    }
    session = {
      mode: "test",
      dayNumber: null,
      entry: null,
      questions: questions,
      qIndex: 0,
      grades: [],
      work: "",
      isRetry: false,
      phase: "check",
      startedAtMs: Date.now(),
      endsAtMs: Date.now() + TEST_SECONDS * 1000,
      timedOut: false
    };
    if (!state.startedAt) { state.startedAt = new Date().toISOString(); save(); }
    render();
    startTestTicker();
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startTestTicker() {
    clearTestTimer();
    testTimerId = setInterval(function () {
      if (!session || session.mode !== "test") {
        clearTestTimer();
        return;
      }
      var left = Math.max(0, session.endsAtMs - Date.now());
      var node = document.getElementById("pa-test-timer");
      if (node) node.textContent = formatMs(left);
      if (left <= 0) {
        clearTestTimer();
        session.timedOut = true;
        completePracticeTest();
      }
    }, 250);
  }

  function formatMs(ms) {
    var s = Math.ceil(ms / 1000);
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ":" + String(r).padStart(2, "0");
  }

  function canGoBack() {
    if (!session || session.phase === "done") return false;
    if (session.mode === "test") return session.qIndex > 0;
    if (session.phase === "review") return false;
    if (session.phase === "task") return true;
    if (session.phase === "check") return true;
    return false;
  }

  function goBackStep() {
    if (!session || !canGoBack()) return;
    if (session.mode === "test") {
      if (session.qIndex > 0) {
        session.qIndex--;
        render();
        startTestTicker();
      }
      return;
    }
    if (session.phase === "task") {
      session.phase = "review";
      render();
      return;
    }
    if (session.phase === "check") {
      if (session.qIndex > 0) {
        session.qIndex--;
      } else {
        session.phase = "task";
      }
      render();
    }
  }

  function renderSession() {
    var s = session;
    if (s.mode === "test") {
      renderTestSession();
      return;
    }

    var steps = { review: 1, task: 2, check: 3, done: 3 };
    var labels = { review: "Concept cue", task: "Do the practice", check: "Check your work", done: "Done" };
    var headKids = [
      el("div", { class: "pa-kicker", text: (s.isRetry ? "Retry · " : "") + "Day " + s.dayNumber + " of " + GOAL + " - " + s.entry.subject.title }),
      s.phase !== "done" ? el("div", { class: "pa-step-label", text: "Step " + steps[s.phase] + " of 3 · " + labels[s.phase] }) : null
    ];
    var actions = el("div", { class: "pa-session-actions" });
    if (canGoBack()) {
      actions.appendChild(el("button", {
        class: "pa-btn pa-btn-ghost pa-btn-small",
        text: "← Back / Atrás",
        onclick: function () { goBackStep(); }
      }));
    }
    actions.appendChild(el("button", {
      class: "pa-btn pa-btn-ghost pa-exit",
      text: "Exit session",
      onclick: function () { clearTestTimer(); session = null; render(); }
    }));
    headKids.push(actions);

    var head = el("div", { class: "pa-session-head" }, headKids);
    viewRoot.appendChild(head);
    if (s.isRetry && s.phase === "review") {
      viewRoot.appendChild(el("div", { class: "pa-card pa-notice" }, [
        el("p", { text: "This is a retry of a day you already completed. Your plan progress stays where it is — you're just practicing again." })
      ]));
    }

    if (s.phase === "review") renderReview();
    else if (s.phase === "task") renderTask();
    else if (s.phase === "check") renderCheck();
    else renderDone();
  }

  function renderTestSession() {
    var s = session;
    var left = Math.max(0, s.endsAtMs - Date.now());
    var head = el("div", { class: "pa-session-head" }, [
      el("div", { class: "pa-kicker", text: "Spaced practice test / Prueba espaciada" }),
      s.phase !== "done"
        ? el("div", { class: "pa-step-label", text: "Check " + Math.min(s.qIndex + 1, s.questions.length) + " of " + s.questions.length })
        : null,
      el("div", { class: "pa-test-timer", id: "pa-test-timer", text: formatMs(left) }),
      el("div", { class: "pa-session-actions" }, [
        canGoBack()
          ? el("button", {
            class: "pa-btn pa-btn-ghost pa-btn-small",
            text: "← Back / Atrás",
            onclick: function () { goBackStep(); }
          })
          : null,
        el("button", {
          class: "pa-btn pa-btn-ghost pa-exit",
          text: "Exit test",
          onclick: function () {
            clearTestTimer();
            session = null;
            render();
          }
        })
      ])
    ]);
    viewRoot.appendChild(head);

    if (s.phase === "done") {
      renderTestDone();
      return;
    }

    viewRoot.appendChild(el("div", { class: "pa-card pa-notice" }, [
      el("p", {
        text: "Answer from memory. The tutor on the side will not give away answers. / Responde de memoria. El tutor no revelará respuestas."
      })
    ]));
    renderCheck();
    startTestTicker();
  }

  function renderReview() {
    var s = session;
    viewRoot.appendChild(el("div", { class: "pa-card" }, [
      el("h3", { text: s.entry.day.focus }),
      el("p", { class: "pa-review" }, [emphasize(s.entry.day.review)]),
      el("p", { class: "pa-small" }, [
        el("a", { href: s.entry.subject.lesson, text: "Read the full lesson: " + s.entry.subject.title })
      ]),
      el("div", { class: "pa-auth-buttons" }, [
        el("button", {
          class: "pa-btn pa-btn-primary",
          text: "Start today's practice task",
          onclick: function () { s.phase = "task"; render(); }
        })
      ])
    ]));
  }

  function renderTask() {
    var s = session;
    var task = s.entry.day.task || {};
    var mins = task.minutes || 8;
    var area = el("textarea", {
      class: "pa-textarea",
      rows: "6",
      placeholder: task.capture || "Write your attempt here…"
    });
    area.value = s.work || "";
    area.addEventListener("input", function () { s.work = area.value; });

    viewRoot.appendChild(el("div", { class: "pa-card" }, [
      el("div", { class: "pa-kicker", text: "Do this now · about " + mins + " minutes" }),
      el("h3", { text: "Today's practice task" }),
      el("p", { class: "pa-review" }, [emphasize(task.do || "")]),
      el("p", { class: "pa-muted pa-small", text: "Use your own study material. The check step will ask about what you just did — so do the work first." }),
      el("label", { class: "pa-label", text: task.capture || "Capture your attempt" }),
      area,
      el("div", { class: "pa-auth-buttons" }, [
        el("button", {
          class: "pa-btn pa-btn-ghost",
          text: "← Back / Atrás",
          onclick: function () { goBackStep(); }
        }),
        el("button", {
          class: "pa-btn pa-btn-primary",
          text: "I've done the task — check me",
          onclick: function () {
            s.work = area.value;
            if (!s.work.trim()) {
              if (!window.confirm("You haven't written anything yet. Continue to the check anyway?")) return;
            }
            s.phase = "check";
            render();
          }
        })
      ])
    ]));
  }

  function gradeLabel(grade) {
    if (grade === "correct") return "Correct";
    if (grade === "mostly_correct") return "Mostly correct";
    return "Not correct";
  }

  function gradeClass(grade) {
    if (grade === "correct") return "pa-grade-correct";
    if (grade === "mostly_correct") return "pa-grade-mostly";
    return "pa-grade-incorrect";
  }

  function callGradeFunction(payload) {
    if (!aw || !cfg || !cfg.functionId) {
      return Promise.reject(new Error("AI grading is not configured yet."));
    }
    if (!user) {
      return Promise.reject(new Error("Sign in to get AI feedback on your written answers."));
    }
    payload = Object.assign({ mode: "grade" }, payload || {});
    return aw.functions
      .createExecution({
        functionId: cfg.functionId,
        body: JSON.stringify(payload),
        xasync: false,
        path: "/",
        method: "POST",
        headers: { "content-type": "application/json" }
      })
      .then(function (exec) {
        var status = exec.responseStatusCode || exec.statusCode;
        var raw = exec.responseBody || "";
        var data;
        try { data = JSON.parse(raw); } catch (e) {
          throw new Error("Grader returned an unreadable response.");
        }
        if (status && status >= 400) {
          throw new Error(data.error || "Grading failed (" + status + ").");
        }
        if (data.error) throw new Error(data.error);
        if (!data.grade) throw new Error("Grader did not return a grade.");
        return data;
      });
  }

  function callTutorFunction(payload) {
    if (!aw || !cfg || !cfg.functionId) {
      return Promise.reject(new Error("AI tutor is not configured yet."));
    }
    if (!user) {
      return Promise.reject(new Error("Sign in to use the Spanish tutor."));
    }
    payload = Object.assign({ mode: "tutor" }, payload || {});
    return aw.functions
      .createExecution({
        functionId: cfg.functionId,
        body: JSON.stringify(payload),
        xasync: false,
        path: "/",
        method: "POST",
        headers: { "content-type": "application/json" }
      })
      .then(function (exec) {
        var status = exec.responseStatusCode || exec.statusCode;
        var raw = exec.responseBody || "";
        var data;
        try { data = JSON.parse(raw); } catch (e) {
          throw new Error("Tutor returned an unreadable response.");
        }
        if (status && status >= 400) {
          throw new Error(data.error || "Tutor failed (" + status + ").");
        }
        if (data.error) throw new Error(data.error);
        if (!data.reply) throw new Error("Tutor did not return a reply.");
        return data;
      });
  }

  function bucketLabel(item) {
    if (!item) return "";
    if (item.bucket === "day") return " · 1 day prior";
    if (item.bucket === "week") return " · 1 week prior";
    if (item.bucket === "month") return " · 1 month prior";
    if (item.from) return " · spaced review from " + item.from;
    return "";
  }

  function renderCheck() {
    var s = session;
    var item = s.questions[s.qIndex];
    var q = item.q;
    var draftKey = "checkDraft" + s.qIndex;
    if (s[draftKey] === undefined) s[draftKey] = "";

    var kids = [];
    if (s.mode !== "test" && s.work && s.work.trim()) {
      kids.push(el("details", { class: "pa-work-recall" }, [
        el("summary", { text: "Your attempt from the practice task" }),
        el("pre", { class: "pa-work-text", text: s.work })
      ]));
    }

    kids.push(
      el("div", {
        class: "pa-quiz-meta",
        text: "Check " + (s.qIndex + 1) + " of " + s.questions.length + bucketLabel(item)
      }),
      el("h3", { class: "pa-question", text: q.q }),
      el("p", {
        class: "pa-muted pa-small",
        text: s.mode === "test"
          ? "Timed test — write briefly. Llama grades when you submit. / Prueba cronometrada — responde breve."
          : "Write your answer in your own words. An open-source model (Llama via Groq) will grade it as correct, mostly correct, or not correct."
      })
    );

    var area = el("textarea", {
      class: "pa-textarea",
      rows: s.mode === "test" ? "4" : "5",
      placeholder: "Type your answer here…"
    });
    area.value = s[draftKey];
    area.addEventListener("input", function () { s[draftKey] = area.value; });
    kids.push(area);

    var statusLine = el("p", { class: "pa-muted pa-small", id: "pa-grade-status" });
    var feedbackBox = el("div", { class: "pa-feedback" });
    var actions = el("div", { class: "pa-auth-buttons" });

    function setBusy(b) {
      area.disabled = b;
      actions.querySelectorAll("button").forEach(function (btn) { btn.disabled = b; });
    }

    function advanceAfterGrade(result) {
      s.grades[s.qIndex] = result.grade;
      s.qIndex++;
      if (s.qIndex >= s.questions.length) {
        if (s.mode === "test") completePracticeTest();
        else completeSession();
      } else {
        render();
        if (s.mode === "test") startTestTicker();
      }
    }

    function showResult(result) {
      feedbackBox.innerHTML = "";
      feedbackBox.appendChild(el("div", {
        class: "pa-grade-badge " + gradeClass(result.grade),
        text: gradeLabel(result.grade)
      }));
      feedbackBox.appendChild(el("p", {
        class: "pa-explain " + (result.grade === "incorrect" ? "pa-explain-wrong" : "pa-explain-right"),
        text: result.feedback || ""
      }));

      actions.innerHTML = "";
      if (s.mode !== "test") {
        actions.appendChild(el("button", {
          class: "pa-btn pa-btn-ghost",
          text: "Retry this check",
          onclick: function () {
            s.grades[s.qIndex] = undefined;
            render();
          }
        }));
      }
      actions.appendChild(el("button", {
        class: "pa-btn pa-btn-primary",
        text: s.qIndex + 1 < s.questions.length
          ? (s.mode === "test" ? "Next / Siguiente" : "Continue to next check")
          : (s.mode === "test" ? "Finish test" : "Finish session"),
        onclick: function () { advanceAfterGrade(result); }
      }));
    }

    // Restore prior grade UI if user navigated back to a graded check.
    if (s.grades[s.qIndex]) {
      showResult({ grade: s.grades[s.qIndex], feedback: s["feedback" + s.qIndex] || "Previously graded." });
    } else {
      actions.appendChild(el("button", {
        class: "pa-btn pa-btn-ghost",
        text: "← Back / Atrás",
        onclick: function () { goBackStep(); }
      }));
      actions.appendChild(el("button", {
        class: "pa-btn pa-btn-primary",
        text: "Submit for AI grading",
        onclick: function () {
          var answer = (area.value || "").trim();
          s[draftKey] = area.value;
          if (!answer) {
            statusLine.textContent = "Write an answer before submitting.";
            statusLine.className = "pa-error";
            return;
          }
          if (s.mode === "test" && Date.now() >= s.endsAtMs) {
            s.timedOut = true;
            completePracticeTest();
            return;
          }
          statusLine.className = "pa-muted pa-small";
          statusLine.textContent = "Grading with Llama (Groq)…";
          setBusy(true);
          callGradeFunction({
            question: q.q,
            rubric: q.rubric,
            exemplar: q.exemplar || "",
            userAnswer: answer,
            focus: (s.entry && s.entry.day && s.entry.day.focus) || "Spaced practice test",
            taskWork: s.work || ""
          })
            .then(function (result) {
              statusLine.textContent = "";
              setBusy(false);
              s["feedback" + s.qIndex] = result.feedback || "";
              showResult(result);
            })
            .catch(function (err) {
              setBusy(false);
              statusLine.className = "pa-error";
              statusLine.textContent = (err && err.message) || "Grading failed.";
            });
        }
      }));
    }

    kids.push(statusLine, feedbackBox, actions);
    viewRoot.appendChild(el("div", { class: "pa-card" }, kids));
  }

  function completeSession() {
    var s = session;
    var wasAlreadyDone = isDayCompleted(s.dayNumber);
    if (!wasAlreadyDone) {
      state.completedDays.push(s.dayNumber);
      state.completedDays.sort(function (a, b) { return a - b; });
    }
    var tallies = { correct: 0, mostly_correct: 0, incorrect: 0 };
    (s.grades || []).forEach(function (g) { if (tallies[g] !== undefined) tallies[g]++; });
    var prev = state.log[s.dayNumber] || {};
    state.log[s.dayNumber] = {
      date: todayKey(),
      grades: s.grades.slice(),
      tallies: tallies,
      total: s.questions.length,
      work: (s.work || "").slice(0, 2000),
      retryCount: (prev.retryCount || 0) + (wasAlreadyDone || s.isRetry ? 1 : 0),
      lastWasRetry: !!(wasAlreadyDone || s.isRetry)
    };
    save();
    s.phase = "done";
    render();
  }

  function completePracticeTest() {
    clearTestTimer();
    var s = session;
    if (!s || s.mode !== "test") return;
    var tallies = { correct: 0, mostly_correct: 0, incorrect: 0 };
    var answered = 0;
    (s.grades || []).forEach(function (g) {
      if (tallies[g] !== undefined) {
        tallies[g]++;
        answered++;
      }
    });
    var score = scoreFromGrades(s.grades);
    var record = {
      id: "t-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      at: Date.now(),
      date: todayKey(),
      score: score,
      tallies: tallies,
      answered: answered,
      total: s.questions.length,
      timedOut: !!s.timedOut,
      buckets: s.questions.map(function (q) { return q.bucket || "review"; })
    };
    state.testLog = [record].concat(state.testLog || []).slice(0, 60);
    save();
    s.phase = "done";
    s.lastTest = record;
    render();
  }

  function renderDone() {
    var s = session;
    var next = currentDay();
    var tallies = { correct: 0, mostly_correct: 0, incorrect: 0 };
    (s.grades || []).forEach(function (g) { if (tallies[g] !== undefined) tallies[g]++; });
    var score = scoreFromGrades(s.grades);
    var summary = tallies.correct + " correct · " + tallies.mostly_correct + " mostly · " + tallies.incorrect + " not correct" +
      (score !== null ? " · " + score + "%" : "");
    var msg;
    if (s.isRetry) {
      msg = "Retry complete. Your plan is still on Day " + Math.min(next, GOAL) + " — this practice didn't change your progress.";
    } else if (next > GOAL) {
      msg = "That was the final session of the plan. Extraordinary work. You can retry any day from the subject list.";
    } else if (tallies.incorrect === 0) {
      msg = "Solid checks. See you tomorrow for Day " + next + ".";
    } else {
      msg = "Session complete — use the feedback on the weaker answers tomorrow. Day " + next + " is next.";
    }
    viewRoot.appendChild(el("div", { class: "pa-card pa-done" }, [
      el("div", { class: "pa-done-mark", text: "\u2713" }),
      el("h3", { text: s.isRetry ? "Day " + s.dayNumber + " retry complete" : "Day " + s.dayNumber + " complete" }),
      el("p", { text: summary + ". " + msg }),
      el("p", { class: "pa-muted pa-small", text: "Current streak: " + streak() + " day" + (streak() === 1 ? "" : "s") + "." }),
      el("div", { class: "pa-auth-buttons" }, [
        el("button", { class: "pa-btn pa-btn-primary", text: "Back to overview", onclick: function () { session = null; render(); } }),
        el("button", {
          class: "pa-btn pa-btn-ghost",
          text: "Retry this day again",
          onclick: function () { startSession(s.dayNumber, { retry: true }); }
        })
      ])
    ]));
  }

  function renderTestDone() {
    var s = session;
    var record = s.lastTest || {};
    var tallies = record.tallies || { correct: 0, mostly_correct: 0, incorrect: 0 };
    viewRoot.appendChild(el("div", { class: "pa-card pa-done" }, [
      el("div", { class: "pa-done-mark", text: record.timedOut ? "⏱" : "\u2713" }),
      el("h3", { text: record.timedOut ? "Time's up — test saved" : "Practice test complete" }),
      el("p", {
        text: (record.score != null ? record.score + "% · " : "") +
          (tallies.correct || 0) + " correct · " +
          (tallies.mostly_correct || 0) + " mostly · " +
          (tallies.incorrect || 0) + " not correct · " +
          (record.answered || 0) + "/" + (record.total || 0) + " answered"
      }),
      el("p", {
        class: "pa-muted pa-small",
        text: "This test does not change your day-plan position. Come back tomorrow for another spaced check."
      }),
      el("div", { class: "pa-auth-buttons" }, [
        el("button", {
          class: "pa-btn pa-btn-primary",
          text: "Back to overview",
          onclick: function () { session = null; render(); }
        }),
        el("button", {
          class: "pa-btn pa-btn-ghost",
          text: "Take another test",
          onclick: function () { startPracticeTest(); }
        })
      ])
    ]));
  }

  /* ---------------- Spanish tutor sidebar ---------------- */

  function activeQuestionText() {
    if (!session || session.phase !== "check") return "";
    var item = session.questions[session.qIndex];
    return (item && item.q && item.q.q) || "";
  }

  function renderTutor(host) {
    var panel = el("div", { class: "pa-tutor" });
    panel.appendChild(el("div", { class: "pa-tutor-head" }, [
      el("div", { class: "pa-kicker", text: "Spanish tutor / Tutor" }),
      el("h3", { text: "Ask Llama" }),
      el("p", {
        class: "pa-muted pa-small",
        text: "Translations, why a phrase works, alternatives — but it will not give away practice answers."
      })
    ]));

    var thread = el("div", { class: "pa-tutor-thread", id: "pa-tutor-thread" });
    if (!tutorMessages.length) {
      thread.appendChild(el("div", {
        class: "pa-tutor-bubble pa-tutor-assistant",
        text: "Hola — ask me to translate a phrase, explain a conjugation, or compare options. I will not solve your practice checks for you."
      }));
    } else {
      tutorMessages.forEach(function (m) {
        thread.appendChild(el("div", {
          class: "pa-tutor-bubble " + (m.role === "user" ? "pa-tutor-user" : "pa-tutor-assistant"),
          text: m.content
        }));
      });
    }
    panel.appendChild(thread);

    var status = el("p", { class: "pa-muted pa-small", id: "pa-tutor-status" });
    var area = el("textarea", {
      class: "pa-textarea pa-tutor-input",
      rows: "3",
      placeholder: "e.g. Why say «tengo hambre» and not «soy hambre»?"
    });
    area.value = tutorDraft;
    area.addEventListener("input", function () { tutorDraft = area.value; });

    var send = el("button", {
      class: "pa-btn pa-btn-primary pa-btn-small",
      text: tutorBusy ? "Thinking…" : "Ask tutor",
      onclick: function () { sendTutorMessage(area, status); }
    });
    if (tutorBusy) send.disabled = true;

    var clear = el("button", {
      class: "pa-btn pa-btn-ghost pa-btn-small",
      text: "Clear chat",
      onclick: function () {
        tutorMessages = [];
        tutorDraft = "";
        render();
      }
    });

    panel.appendChild(status);
    panel.appendChild(area);
    panel.appendChild(el("div", { class: "pa-auth-buttons" }, [send, clear]));

    if (!user) {
      panel.appendChild(el("p", {
        class: "pa-muted pa-small",
        text: "Sign in below to chat with the tutor (same Llama/Groq path as grading)."
      }));
    }

    host.appendChild(panel);
    thread.scrollTop = thread.scrollHeight;
  }

  function sendTutorMessage(area, status) {
    var text = (area.value || "").trim();
    if (!text || tutorBusy) return;
    tutorDraft = "";
    tutorMessages.push({ role: "user", content: text });
    tutorBusy = true;
    render();

    var history = tutorMessages.slice(0, -1).map(function (m) {
      return { role: m.role, content: m.content };
    });

    callTutorFunction({
      message: text,
      history: history,
      activeQuestion: activeQuestionText(),
      phase: session ? session.phase : "dashboard",
      sessionMode: session ? session.mode : "none"
    })
      .then(function (data) {
        tutorMessages.push({ role: "assistant", content: data.reply });
        tutorBusy = false;
        render();
      })
      .catch(function (err) {
        tutorBusy = false;
        tutorMessages.push({
          role: "assistant",
          content: "Sorry — " + ((err && err.message) || "tutor unavailable.")
        });
        render();
      });
  }

  /* ---------------- account panel ---------------- */

  function recoveryRedirectUrl() {
    return new URL(location.pathname, location.href).href;
  }

  function clearRecoveryParams() {
    try {
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, "", location.pathname + (location.hash || ""));
      }
    } catch (e) { /* ignore */ }
    recoveryUserId = null;
    recoverySecret = null;
  }

  function authFailMessage(err) {
    var msg = (err && err.message) || "Something went wrong. Please try again.";
    if (/networkerror|failed to fetch|load failed|network request failed/i.test(msg)) {
      msg =
        "Could not reach Appwrite from " + location.origin +
        ". In the Appwrite console, add a Web platform for hostname \"" +
        location.hostname +
        "\" (Overview → Platforms), then try again.";
    }
    return msg;
  }

  function renderAccountPanel() {
    var panel = el("div", { class: "pa-card pa-account" });
    panel.appendChild(el("h2", { class: "pa-section-title", text: "Account & sync" }));

    if (!cfg) {
      panel.appendChild(el("p", { class: "pa-muted", text: "Cloud sync isn't set up yet - your progress is saved in this browser only. Once the Appwrite project is configured (assets/appwrite-config.js), you'll be able to create an account and sync progress across devices." }));
      return panel;
    }
    if (!window.Appwrite) {
      panel.appendChild(el("p", { class: "pa-muted", text: "The Appwrite SDK failed to load (offline?). Progress is being saved in this browser and will sync next time you're online and signed in." }));
      return panel;
    }

    if (user) {
      panel.appendChild(el("p", {}, [
        document.createTextNode("Signed in as "),
        el("strong", { text: user.email || user.name || user.$id }),
        document.createTextNode(". Progress syncs to the cloud. Written checks and the Spanish tutor use Llama via Groq.")
      ]));
      panel.appendChild(el("p", { class: "pa-muted pa-small", id: "pa-sync-line", text: syncMsg }));
      panel.appendChild(el("button", {
        class: "pa-btn pa-btn-ghost",
        text: "Sign out",
        onclick: function () {
          aw.account.deleteSession({ sessionId: "current" }).finally(function () {
            user = null;
            syncMsg = "";
            authView = "login";
            render();
          });
        }
      }));
      return panel;
    }

    var errLine = el("p", { class: "pa-error" });
    var okLine = el("p", { class: "pa-ok" });

    function busy(b) {
      panel.querySelectorAll("button, input").forEach(function (n) { n.disabled = b; });
    }

    function afterAuth() {
      return aw.account.get().then(function (u) {
        user = u;
        syncMsg = "Syncing\u2026";
        authView = "login";
        return pullCloud();
      }).then(function () {
        save();
        render();
      });
    }

    function fail(err) {
      busy(false);
      okLine.textContent = "";
      errLine.textContent = authFailMessage(err);
    }

    if (authView === "forgot" || authView === "forgot-sent") {
      panel.appendChild(el("p", {
        class: "pa-muted",
        text: authView === "forgot-sent"
          ? "If an account exists for that email, Appwrite sent a reset link. Open it on this device to choose a new password."
          : "Enter the email for your Practice account. We'll email a reset link that brings you back here."
      }));
      var resetEmail = el("input", {
        class: "pa-input",
        type: "email",
        placeholder: "Email",
        autocomplete: "email"
      });
      var sendReset = el("button", {
        class: "pa-btn pa-btn-primary",
        text: "Send reset link",
        onclick: function () {
          errLine.textContent = "";
          okLine.textContent = "";
          var addr = resetEmail.value.trim();
          if (!addr) {
            errLine.textContent = "Enter your email address.";
            return;
          }
          busy(true);
          aw.account.createRecovery({ email: addr, url: recoveryRedirectUrl() })
            .then(function () {
              busy(false);
              authView = "forgot-sent";
              render();
            })
            .catch(fail);
        }
      });
      panel.appendChild(el("div", { class: "pa-auth-form" }, [
        resetEmail,
        el("div", { class: "pa-auth-buttons" }, [sendReset]),
        okLine,
        errLine,
        el("div", { class: "pa-auth-links" }, [
          el("button", {
            class: "pa-link-btn",
            text: "Back to sign in",
            onclick: function () { authView = "login"; render(); }
          })
        ])
      ]));
      return panel;
    }

    if (authView === "reset" || authView === "reset-done") {
      if (authView === "reset-done") {
        panel.appendChild(el("p", { class: "pa-ok", text: "Password updated. You can sign in with your new password." }));
        panel.appendChild(el("button", {
          class: "pa-btn pa-btn-primary",
          text: "Go to sign in",
          onclick: function () { authView = "login"; render(); }
        }));
        return panel;
      }

      panel.appendChild(el("p", { class: "pa-muted", text: "Choose a new password for your Practice account (at least 8 characters)." }));
      var newPass = el("input", {
        class: "pa-input",
        type: "password",
        placeholder: "New password (8+ characters)",
        autocomplete: "new-password"
      });
      var confirmPass = el("input", {
        class: "pa-input",
        type: "password",
        placeholder: "Confirm new password",
        autocomplete: "new-password"
      });
      var savePass = el("button", {
        class: "pa-btn pa-btn-primary",
        text: "Update password",
        onclick: function () {
          errLine.textContent = "";
          okLine.textContent = "";
          if (!newPass.value || newPass.value.length < 8) {
            errLine.textContent = "Password must be at least 8 characters.";
            return;
          }
          if (newPass.value !== confirmPass.value) {
            errLine.textContent = "Passwords do not match.";
            return;
          }
          if (!recoveryUserId || !recoverySecret) {
            errLine.textContent = "This reset link is incomplete. Request a new one from Sign in.";
            return;
          }
          busy(true);
          aw.account.updateRecovery({
            userId: recoveryUserId,
            secret: recoverySecret,
            password: newPass.value
          })
            .then(function () {
              clearRecoveryParams();
              authView = "reset-done";
              render();
            })
            .catch(fail);
        }
      });
      panel.appendChild(el("div", { class: "pa-auth-form" }, [
        newPass,
        confirmPass,
        el("div", { class: "pa-auth-buttons" }, [savePass]),
        errLine,
        el("div", { class: "pa-auth-links" }, [
          el("button", {
            class: "pa-link-btn",
            text: "Back to sign in",
            onclick: function () {
              clearRecoveryParams();
              authView = "login";
              render();
            }
          })
        ])
      ]));
      return panel;
    }

    panel.appendChild(el("p", { class: "pa-muted", text: "Sign in to sync progress, unlock AI grading, and use the Spanish tutor. Until then, progress stays in this browser." }));

    var email = el("input", { class: "pa-input", type: "email", placeholder: "Email", autocomplete: "email" });
    var password = el("input", { class: "pa-input", type: "password", placeholder: "Password (8+ characters)", autocomplete: "current-password" });

    var signIn = el("button", {
      class: "pa-btn pa-btn-primary",
      text: "Sign in",
      onclick: function () {
        errLine.textContent = "";
        okLine.textContent = "";
        busy(true);
        aw.account.createEmailPasswordSession({ email: email.value.trim(), password: password.value })
          .then(afterAuth)
          .catch(fail);
      }
    });

    var signUp = el("button", {
      class: "pa-btn pa-btn-ghost",
      text: "Create account",
      onclick: function () {
        errLine.textContent = "";
        okLine.textContent = "";
        busy(true);
        aw.account.create({ userId: Appwrite.ID.unique(), email: email.value.trim(), password: password.value })
          .then(function () {
            return aw.account.createEmailPasswordSession({ email: email.value.trim(), password: password.value });
          })
          .then(afterAuth)
          .catch(fail);
      }
    });

    panel.appendChild(el("div", { class: "pa-auth-form" }, [
      email,
      password,
      el("div", { class: "pa-auth-buttons" }, [signIn, signUp]),
      okLine,
      errLine,
      el("div", { class: "pa-auth-links" }, [
        el("button", {
          class: "pa-link-btn",
          text: "Forgot password?",
          onclick: function () { authView = "forgot"; render(); }
        })
      ])
    ]));
    return panel;
  }

  /* ---------------- boot ---------------- */

  function boot() {
    if (aw) {
      aw.account.get()
        .then(function (u) {
          user = u;
          syncMsg = "Syncing\u2026";
          return pullCloud();
        })
        .catch(function () { user = null; })
        .finally(render);
    } else {
      render();
    }
  }

  boot();
})();
