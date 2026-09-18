/* =========================================================
   STORE — the only part that touches storage.
   Swap these functions for fetch() calls to an Express API
   and the rest of the app keeps working unchanged.
   ========================================================= */
var Store = (function () {
  var KEY_USERS = "quizly:users";
  var KEY_QUIZZES = "quizly:quizzes";
  var KEY_ATTEMPTS = "quizly:attempts";
  var KEY_SESSION = "quizly:session";

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn("Storage unavailable, running in memory:", e);
      return fallback;
    }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.warn("Could not save:", e); }
  }
  function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // Not real security — a demo stand-in for a bcrypt hash on the server.
  function digest(text) {
    var h = 5381;
    for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return "d" + (h >>> 0).toString(16);
  }

  return {
    id: id,
    users:    function () { return read(KEY_USERS, []); },
    quizzes:  function () { return read(KEY_QUIZZES, []); },
    attempts: function () { return read(KEY_ATTEMPTS, []); },

    // TODO: replace with fetch("/api/auth/register", {method:"POST", ...})
    register: function (name, email, password) {
      var users = this.users();
      if (users.some(function (u) { return u.email === email.toLowerCase(); })) {
        throw new Error("An account with that email already exists.");
      }
      var user = { id: id(), name: name, email: email.toLowerCase(), pass: digest(password) };
      users.push(user);
      write(KEY_USERS, users);
      write(KEY_SESSION, user.id);
      return user;
    },
    // TODO: replace with fetch("/api/auth/login", ...)
    login: function (email, password) {
      var user = this.users().filter(function (u) {
        return u.email === email.toLowerCase() && u.pass === digest(password);
      })[0];
      if (!user) throw new Error("That email and password do not match an account.");
      write(KEY_SESSION, user.id);
      return user;
    },
    logout: function () { write(KEY_SESSION, null); },
    current: function () {
      var sid = read(KEY_SESSION, null);
      if (!sid) return null;
      return this.users().filter(function (u) { return u.id === sid; })[0] || null;
    },

    // TODO: replace with fetch("/api/quizzes", {method:"POST", ...})
    saveQuiz: function (quiz) {
      var all = this.quizzes();
      quiz.id = quiz.id || id();
      quiz.createdAt = Date.now();
      all.push(quiz);
      write(KEY_QUIZZES, all);
      return quiz;
    },
    deleteQuiz: function (quizId) {
      write(KEY_QUIZZES, this.quizzes().filter(function (q) { return q.id !== quizId; }));
    },
    quiz: function (quizId) {
      return this.quizzes().filter(function (q) { return q.id === quizId; })[0];
    },
    saveAttempt: function (attempt) {
      var all = this.attempts();
      attempt.id = id();
      attempt.takenAt = Date.now();
      all.push(attempt);
      write(KEY_ATTEMPTS, all);
      return attempt;
    },
    seed: function () {
      if (this.quizzes().length) return;
      var demoUser = { id: "seed-user", name: "Quizly team", email: "team@quizly.example", pass: "-" };
      var users = this.users();
      if (!users.some(function (u) { return u.id === "seed-user"; })) {
        users.push(demoUser); write(KEY_USERS, users);
      }
      write(KEY_QUIZZES, [
        {
          id: "seed-web", title: "Web development basics", authorId: "seed-user", authorName: "Quizly team",
          description: "Ten minutes of HTML, CSS and JavaScript fundamentals. A good warm-up before an interview.",
          createdAt: Date.now() - 86400000,
          questions: [
            { text: "Which CSS property controls the space inside an element's border?",
              options: ["margin", "padding", "gap", "outline"], correct: 1 },
            { text: "What does the querySelector method return when nothing matches?",
              options: ["An empty array", "undefined", "null", "It throws an error"], correct: 2 },
            { text: "Which HTML element is the right one for the main navigation links?",
              options: ["<div>", "<nav>", "<section>", "<aside>"], correct: 1 },
            { text: "In CSS Grid, what does 1fr mean?",
              options: ["One fixed rem", "One fraction of the free space", "The first row", "One frame"], correct: 1 },
            { text: "Which array method creates a new array with every item transformed?",
              options: ["forEach", "filter", "map", "reduce"], correct: 2 }
          ]
        },
        {
          id: "seed-git", title: "Git in everyday use", authorId: "seed-user", authorName: "Quizly team",
          description: "The handful of Git commands you actually reach for during an internship.",
          createdAt: Date.now() - 43200000,
          questions: [
            { text: "Which command stages every changed file in the current folder?",
              options: ["git commit -a", "git add .", "git push --all", "git stage"], correct: 1 },
            { text: "What does git clone do?",
              options: ["Copies a repository and its history locally", "Creates a new branch", "Deletes local changes", "Uploads your code"], correct: 0 },
            { text: "Which file tells Git what to ignore?",
              options: ["ignore.txt", ".gitconfig", ".gitignore", "README.md"], correct: 2 },
            { text: "What does git pull do?",
              options: ["Sends commits to the remote", "Fetches remote commits and merges them", "Reverts the last commit", "Lists branches"], correct: 1 }
          ]
        }
      ]);
    }
  };
})();

/* =========================================================
   APP — routing and views
   ========================================================= */
var App = (function () {
  var view = document.getElementById("view");
  var state = { route: "home", quizId: null, index: 0, answers: [], lastAttempt: null };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function when(ts) {
    var days = Math.floor((Date.now() - ts) / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    return days + " days ago";
  }

  function go(route, quizId) {
    state.route = route;
    if (quizId) state.quizId = quizId;
    window.scrollTo(0, 0);
    render();
  }

  function chrome() {
    var user = Store.current();
    document.getElementById("whoami").textContent = user ? user.name : "";
    document.getElementById("logoutBtn").classList.toggle("hidden", !user);
    document.getElementById("loginBtn").classList.toggle("hidden", !!user);
    document.getElementById("navMine").classList.toggle("hidden", !user);
  }

  function render() {
    chrome();
    var views = {
      home: home, browse: browse, create: create, auth: auth,
      take: take, results: results, mine: mine
    };
    view.innerHTML = (views[state.route] || home)();
    if (state.route === "create") Builder.mount();
  }

  /* ---------- HOME ---------- */
  function home() {
    var quizzes = Store.quizzes();
    var questionCount = quizzes.reduce(function (n, q) { return n + q.questions.length; }, 0);
    return '' +
      '<section class="hero">' +
        '<h1>Write a quiz in five minutes. Share it in one.</h1>' +
        '<p>Build a quiz from your own questions, send people the link, and let them see their score the moment they finish.</p>' +
        '<div class="actions">' +
          '<button class="btn btn-lg" onclick="App.go(\'create\')">Create a quiz</button>' +
          '<button class="btn-ghost btn-lg" onclick="App.go(\'browse\')">Take a quiz</button>' +
        '</div>' +
        '<div class="stats">' +
          '<div><b>' + quizzes.length + '</b><span>quizzes published</span></div>' +
          '<div><b>' + questionCount + '</b><span>questions written</span></div>' +
          '<div><b>' + Store.attempts().length + '</b><span>attempts recorded</span></div>' +
        '</div>' +
      '</section>' +
      '<div class="page-head"><div><h2>Recently added</h2><p>The newest quizzes from everyone using Quizly.</p></div>' +
      '<div class="spacer"></div><button class="btn-ghost" onclick="App.go(\'browse\')">See all</button></div>' +
      quizGrid(quizzes.slice().sort(function (a, b) { return b.createdAt - a.createdAt; }).slice(0, 4));
  }

  function quizGrid(list) {
    if (!list.length) {
      return '<div class="card empty">No quizzes yet. <button class="btn" onclick="App.go(\'create\')">Write the first one</button></div>';
    }
    return '<div class="grid two">' + list.map(function (q) {
      return '<article class="card quiz-card">' +
        '<div class="row"><span class="pill">' + q.questions.length + ' questions</span>' +
        '<span class="meta">by ' + esc(q.authorName) + ' · ' + when(q.createdAt) + '</span></div>' +
        '<h3>' + esc(q.title) + '</h3>' +
        '<p>' + esc(q.description || "No description.") + '</p>' +
        '<div class="row"><button class="btn" onclick="App.start(\'' + q.id + '\')">Start quiz</button></div>' +
      '</article>';
    }).join("") + '</div>';
  }

  /* ---------- BROWSE ---------- */
  function browse() {
    var list = Store.quizzes().slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    return '<div class="page-head"><div><h2>All quizzes</h2><p>' + list.length + ' available right now.</p></div>' +
      '<div class="spacer"></div><input type="text" id="q" placeholder="Search by title" style="max-width:240px" oninput="App.filter(this.value)"></div>' +
      '<div id="results">' + quizGrid(list) + '</div>';
  }

  function filter(text) {
    var needle = text.toLowerCase().trim();
    var list = Store.quizzes().filter(function (q) {
      return !needle || q.title.toLowerCase().indexOf(needle) > -1 || (q.description || "").toLowerCase().indexOf(needle) > -1;
    });
    document.getElementById("results").innerHTML = quizGrid(list);
  }

  /* ---------- AUTH ---------- */
  function auth() {
    return '<div style="max-width:420px;margin-inline:auto">' +
      '<div class="card">' +
        '<h2 style="margin-bottom:6px">Log in</h2>' +
        '<p class="note" style="margin-bottom:18px">You need an account to publish a quiz or keep your scores. Anyone can take a quiz without one.</p>' +
        '<div id="authError"></div>' +
        '<div class="field"><label for="aName">Name <span class="note">(new accounts only)</span></label><input id="aName" type="text" placeholder="Ritika Sahni"></div>' +
        '<div class="field"><label for="aEmail">Email</label><input id="aEmail" type="email" placeholder="you@example.com"></div>' +
        '<div class="field"><label for="aPass">Password</label><input id="aPass" type="password" placeholder="At least 6 characters"></div>' +
        '<div style="display:flex;gap:10px;margin-top:6px">' +
          '<button class="btn" onclick="App.doAuth(\'login\')">Log in</button>' +
          '<button class="btn-ghost" onclick="App.doAuth(\'register\')">Create account</button>' +
        '</div>' +
        '<p class="note" style="margin:16px 0 0">Accounts are stored in this browser only. In the full version this is an Express route writing to MongoDB.</p>' +
      '</div></div>';
  }

  function doAuth(mode) {
    var name = (document.getElementById("aName").value || "").trim();
    var email = (document.getElementById("aEmail").value || "").trim();
    var pass = document.getElementById("aPass").value || "";
    var box = document.getElementById("authError");
    box.innerHTML = "";
    try {
      if (!email || !pass) throw new Error("Enter your email and password.");
      if (mode === "register") {
        if (!name) throw new Error("Enter your name to create an account.");
        if (pass.length < 6) throw new Error("Use a password of at least 6 characters.");
        Store.register(name, email, pass);
      } else {
        Store.login(email, pass);
      }
      go("home");
    } catch (err) {
      box.innerHTML = '<div class="error-msg">' + esc(err.message) + '</div>';
    }
  }

  function logout() { Store.logout(); go("home"); }

  /* ---------- CREATE ---------- */
  function create() {
    if (!Store.current()) {
      return '<div class="card empty"><h2>Log in to publish a quiz</h2>' +
        '<p>Your quizzes are saved to your account so you can find them later.</p>' +
        '<button class="btn" onclick="App.go(\'auth\')">Log in or sign up</button></div>';
    }
    return '<div class="page-head"><div><h2>Create a quiz</h2><p>Add your questions, mark the correct option, then publish.</p></div></div>' +
      '<div id="builderError"></div>' +
      '<div class="card stack">' +
        '<div class="field"><label for="qTitle">Quiz title</label><input id="qTitle" type="text" placeholder="JavaScript fundamentals"></div>' +
        '<div class="field" style="margin:0"><label for="qDesc">Description</label><textarea id="qDesc" placeholder="What is this quiz about, and who is it for?"></textarea></div>' +
      '</div>' +
      '<h3 style="margin:26px 0 12px">Questions</h3>' +
      '<div id="questions"></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">' +
        '<button class="btn-ghost" onclick="Builder.addQuestion()">Add another question</button>' +
        '<button class="btn" onclick="Builder.publish()">Publish quiz</button>' +
      '</div>';
  }

  /* ---------- TAKE ---------- */
  function start(quizId) {
    state.quizId = quizId;
    state.index = 0;
    state.answers = [];
    go("take");
  }

  function take() {
    var quiz = Store.quiz(state.quizId);
    if (!quiz) return '<div class="card empty">That quiz no longer exists.</div>';
    var q = quiz.questions[state.index];
    var total = quiz.questions.length;
    var picked = state.answers[state.index];
    var letters = ["A", "B", "C", "D", "E", "F"];

    return '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">' +
        '<b>' + esc(quiz.title) + '</b>' +
        '<span class="note">Question ' + (state.index + 1) + ' of ' + total + '</span>' +
      '</div>' +
      '<div class="progress"><i style="width:' + ((state.index) / total * 100) + '%"></i></div>' +
      '<p class="qtext">' + esc(q.text) + '</p>' +
      '<div class="options">' +
        q.options.map(function (opt, i) {
          return '<button class="option" aria-pressed="' + (picked === i) + '" onclick="App.pick(' + i + ')">' +
            '<kbd>' + letters[i] + '</kbd><span>' + esc(opt) + '</span></button>';
        }).join("") +
      '</div>' +
      '<div style="display:flex;gap:10px;justify-content:space-between">' +
        '<button class="btn-ghost" onclick="App.prev()" ' + (state.index === 0 ? "disabled" : "") + '>Back</button>' +
        '<button class="btn" onclick="App.next()" ' + (picked === undefined ? "disabled" : "") + '>' +
          (state.index === total - 1 ? "Finish and see score" : "Next question") +
        '</button>' +
      '</div></div>';
  }

  function pick(i) { state.answers[state.index] = i; render(); }
  function prev() { if (state.index > 0) { state.index--; render(); } }

  function next() {
    var quiz = Store.quiz(state.quizId);
    if (state.index < quiz.questions.length - 1) { state.index++; render(); return; }

    var correct = 0;
    quiz.questions.forEach(function (q, i) { if (state.answers[i] === q.correct) correct++; });
    var user = Store.current();
    state.lastAttempt = {
      quizId: quiz.id, quizTitle: quiz.title,
      userId: user ? user.id : null, userName: user ? user.name : "Guest",
      answers: state.answers.slice(), score: correct, total: quiz.questions.length
    };
    Store.saveAttempt(state.lastAttempt);
    go("results");
  }

  /* ---------- RESULTS ---------- */
  function results() {
    var a = state.lastAttempt;
    var quiz = Store.quiz(a.quizId);
    var pct = Math.round(a.score / a.total * 100);
    var passed = pct >= 60;

    return '<div class="card">' +
      '<div class="score">' +
        '<div class="note">' + esc(a.quizTitle) + '</div>' +
        '<div class="big">' + a.score + '<span style="font-size:1.4rem;color:var(--muted)">/' + a.total + '</span></div>' +
        '<div class="verdict ' + (passed ? "pass" : "fail") + '">' + pct + '% · ' + (passed ? "Passed" : "Below the 60% pass mark") + '</div>' +
      '</div>' +
      '<div class="review">' +
        quiz.questions.map(function (q, i) {
          var right = a.answers[i] === q.correct;
          return '<div class="item ' + (right ? "right" : "wrong") + '">' +
            '<b>' + (i + 1) + '. ' + esc(q.text) + '</b>' +
            (right
              ? '<span class="correct">Correct — ' + esc(q.options[q.correct]) + '</span>'
              : '<span class="yours">You chose: ' + esc(a.answers[i] !== undefined ? q.options[a.answers[i]] : "nothing") + '</span>' +
                '<span class="correct">Correct answer: ' + esc(q.options[q.correct]) + '</span>') +
          '</div>';
        }).join("") +
      '</div>' +
      '<div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap">' +
        '<button class="btn" onclick="App.start(\'' + quiz.id + '\')">Try again</button>' +
        '<button class="btn-ghost" onclick="App.go(\'browse\')">Take another quiz</button>' +
      '</div></div>';
  }

  /* ---------- MY ACTIVITY ---------- */
  function mine() {
    var user = Store.current();
    if (!user) return '<div class="card empty"><h2>Log in to see your activity</h2><button class="btn" onclick="App.go(\'auth\')">Log in</button></div>';

    var myQuizzes = Store.quizzes().filter(function (q) { return q.authorId === user.id; });
    var myAttempts = Store.attempts().filter(function (a) { return a.userId === user.id; }).reverse();

    return '<div class="page-head"><div><h2>' + esc(user.name) + '</h2><p>' + esc(user.email) + '</p></div></div>' +
      '<div class="card" style="margin-bottom:18px">' +
        '<h3 style="margin-bottom:12px">Quizzes you published</h3>' +
        (myQuizzes.length
          ? '<table><thead><tr><th>Title</th><th>Questions</th><th>Created</th><th></th></tr></thead><tbody>' +
            myQuizzes.map(function (q) {
              return '<tr><td>' + esc(q.title) + '</td><td>' + q.questions.length + '</td><td>' + when(q.createdAt) + '</td>' +
                '<td style="text-align:right"><button class="btn-danger" onclick="App.removeQuiz(\'' + q.id + '\')">Delete</button></td></tr>';
            }).join("") + '</tbody></table>'
          : '<p class="note" style="margin:0">Nothing yet. <button class="btn-quiet" onclick="App.go(\'create\')">Create a quiz</button></p>') +
      '</div>' +
      '<div class="card">' +
        '<h3 style="margin-bottom:12px">Your attempts</h3>' +
        (myAttempts.length
          ? '<table><thead><tr><th>Quiz</th><th>Score</th><th>When</th></tr></thead><tbody>' +
            myAttempts.map(function (a) {
              return '<tr><td>' + esc(a.quizTitle) + '</td><td>' + a.score + '/' + a.total +
                ' (' + Math.round(a.score / a.total * 100) + '%)</td><td>' + when(a.takenAt) + '</td></tr>';
            }).join("") + '</tbody></table>'
          : '<p class="note" style="margin:0">You have not taken a quiz yet.</p>') +
      '</div>';
  }

  function removeQuiz(qid) {
    if (!window.confirm("Delete this quiz? Attempts will stay in the history.")) return;
    Store.deleteQuiz(qid);
    render();
  }

  return {
    go: go, render: render, filter: filter, doAuth: doAuth, logout: logout,
    start: start, pick: pick, prev: prev, next: next, removeQuiz: removeQuiz, esc: esc
  };
})();

/* =========================================================
   BUILDER — the quiz creation form
   ========================================================= */
var Builder = (function () {
  var questions = [];

  function blank() { return { text: "", options: ["", "", "", ""], correct: 0 }; }

  function mount() {
    if (!questions.length) questions = [blank()];
    draw();
  }

  function draw() {
    var host = document.getElementById("questions");
    if (!host) return;
    host.innerHTML = questions.map(function (q, qi) {
      return '<div class="qblock">' +
        '<header><b>Question ' + (qi + 1) + '</b><div class="spacer"></div>' +
          (questions.length > 1 ? '<button class="btn-danger" onclick="Builder.removeQuestion(' + qi + ')">Remove</button>' : '') +
        '</header>' +
        '<div class="field"><label>Question text</label>' +
          '<input type="text" value="' + App.esc(q.text) + '" placeholder="What does CSS stand for?" ' +
          'oninput="Builder.setText(' + qi + ', this.value)"></div>' +
        '<label>Options — tick the correct one</label>' +
        q.options.map(function (opt, oi) {
          return '<div class="opt-row">' +
            '<input type="text" value="' + App.esc(opt) + '" placeholder="Option ' + (oi + 1) + '" ' +
            'oninput="Builder.setOption(' + qi + ',' + oi + ', this.value)">' +
            '<label><input type="radio" name="correct' + qi + '" ' + (q.correct === oi ? "checked" : "") +
            ' onchange="Builder.setCorrect(' + qi + ',' + oi + ')"> correct</label>' +
          '</div>';
        }).join("") +
      '</div>';
    }).join("");
  }

  function setText(qi, v) { questions[qi].text = v; }
  function setOption(qi, oi, v) { questions[qi].options[oi] = v; }
  function setCorrect(qi, oi) { questions[qi].correct = oi; }
  function addQuestion() { questions.push(blank()); draw(); window.scrollTo(0, document.body.scrollHeight); }
  function removeQuestion(qi) { questions.splice(qi, 1); draw(); }

  function publish() {
    var box = document.getElementById("builderError");
    var title = document.getElementById("qTitle").value.trim();
    var desc = document.getElementById("qDesc").value.trim();
    box.innerHTML = "";

    function fail(msg) {
      box.innerHTML = '<div class="error-msg">' + msg + '</div>';
      window.scrollTo(0, 0);
      return false;
    }

    if (!title) return fail("Give the quiz a title.");
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      if (!q.text.trim()) return fail("Question " + (i + 1) + " has no text.");
      var filled = q.options.filter(function (o) { return o.trim(); });
      if (filled.length < 2) return fail("Question " + (i + 1) + " needs at least two options.");
      if (!q.options[q.correct] || !q.options[q.correct].trim()) {
        return fail("Question " + (i + 1) + ": the option marked correct is empty.");
      }
    }

    var user = Store.current();
    var clean = questions.map(function (q) {
      var kept = [], correct = 0;
      q.options.forEach(function (o, i) {
        if (o.trim()) { if (i === q.correct) correct = kept.length; kept.push(o.trim()); }
      });
      return { text: q.text.trim(), options: kept, correct: correct };
    });

    var quiz = Store.saveQuiz({
      title: title, description: desc, questions: clean,
      authorId: user.id, authorName: user.name
    });
    questions = [];
    App.start(quiz.id);
  }

  return {
    mount: mount, setText: setText, setOption: setOption, setCorrect: setCorrect,
    addQuestion: addQuestion, removeQuestion: removeQuestion, publish: publish
  };
})();

Store.seed();
App.render();
