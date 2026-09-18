(function () {
  "use strict";

  /* ---------- State ---------- */
  var state = {
    current: "0",     // what the user is typing
    stored: null,     // the left-hand number, as a Number
    operator: null,   // "+", "-", "*", "/"
    justEvaluated: false,
    error: false
  };
  var history = [];

  var outEl = document.getElementById("out");
  var memoEl = document.getElementById("memo");
  var screenEl = document.getElementById("screen");
  var listEl = document.getElementById("historyList");
  var emptyNote = document.getElementById("emptyNote");

  var SYMBOL = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  /* ---------- Helpers ---------- */
  function format(numberLike) {
    var n = Number(numberLike);
    if (!isFinite(n)) return "Error";
    // Keep long decimals readable without lying about the value.
    var rounded = Math.round(n * 1e10) / 1e10;
    if (Math.abs(rounded) >= 1e12 || (rounded !== 0 && Math.abs(rounded) < 1e-6)) {
      return rounded.toExponential(6);
    }
    return String(rounded);
  }

  function render() {
    outEl.textContent = state.error ? "Cannot divide by zero" : state.current;
    screenEl.classList.toggle("error", state.error);

    if (state.error) {
      memoEl.textContent = "Press AC to start again";
    } else if (state.stored !== null && state.operator) {
      memoEl.textContent = format(state.stored) + " " + SYMBOL[state.operator];
    } else {
      memoEl.innerHTML = "&nbsp;";
    }

    // Highlight the operator that is waiting for a second number.
    var ops = document.querySelectorAll("[data-op]");
    for (var i = 0; i < ops.length; i++) {
      var isActive = !state.error && state.operator === ops[i].dataset.op && state.justEvaluated !== true && state.awaitingSecond === true;
      ops[i].setAttribute("aria-pressed", isActive ? "true" : "false");
    }
  }

  function reset() {
    state.current = "0";
    state.stored = null;
    state.operator = null;
    state.justEvaluated = false;
    state.awaitingSecond = false;
    state.error = false;
    render();
  }

  /* ---------- Input ---------- */
  function inputDigit(d) {
    if (state.error) return;
    if (state.justEvaluated || state.awaitingSecond) {
      state.current = d;
      state.justEvaluated = false;
      state.awaitingSecond = false;
    } else if (state.current === "0") {
      state.current = d;
    } else if (state.current.replace("-", "").replace(".", "").length < 14) {
      state.current += d;
    }
    render();
  }

  function inputDecimal() {
    if (state.error) return;
    if (state.justEvaluated || state.awaitingSecond) {
      state.current = "0.";
      state.justEvaluated = false;
      state.awaitingSecond = false;
    } else if (state.current.indexOf(".") === -1) {
      state.current += ".";
    }
    render();
  }

  function backspace() {
    if (state.error) return reset();
    if (state.justEvaluated) return;
    state.current = state.current.length > 1 ? state.current.slice(0, -1) : "0";
    if (state.current === "-" ) state.current = "0";
    render();
  }

  function toggleSign() {
    if (state.error || state.current === "0") return;
    state.current = state.current.charAt(0) === "-"
      ? state.current.slice(1)
      : "-" + state.current;
    render();
  }

  function percent() {
    if (state.error) return;
    // 50 + 10% means 10% of 50; a bare 10% means 0.1
    var value = parseFloat(state.current) / 100;
    if (state.stored !== null && (state.operator === "+" || state.operator === "-")) {
      value = state.stored * (parseFloat(state.current) / 100);
    }
    state.current = format(value);
    state.justEvaluated = false;
    render();
  }

  /* ---------- Maths ---------- */
  function compute(a, b, op) {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b === 0 ? null : a / b;
      default:  return b;
    }
  }

  function chooseOperator(op) {
    if (state.error) return;

    // Pressing two operators in a row just swaps the pending one.
    if (state.awaitingSecond && state.operator) {
      state.operator = op;
      render();
      return;
    }

    var typed = parseFloat(state.current);

    if (state.stored === null) {
      state.stored = typed;
    } else if (state.operator) {
      var result = compute(state.stored, typed, state.operator);
      if (result === null) return fail();
      pushHistory(format(state.stored) + " " + SYMBOL[state.operator] + " " + format(typed), format(result));
      state.stored = result;
      state.current = format(result);
    }

    state.operator = op;
    state.awaitingSecond = true;
    state.justEvaluated = false;
    render();
  }

  function equals() {
    if (state.error || state.operator === null || state.stored === null) return;

    var typed = parseFloat(state.current);
    var result = compute(state.stored, typed, state.operator);
    if (result === null) return fail();

    pushHistory(format(state.stored) + " " + SYMBOL[state.operator] + " " + format(typed), format(result));
    state.current = format(result);
    state.stored = null;
    state.operator = null;
    state.awaitingSecond = false;
    state.justEvaluated = true;
    render();
  }

  function fail() {
    state.error = true;
    state.stored = null;
    state.operator = null;
    state.awaitingSecond = false;
    render();
  }

  /* ---------- History ---------- */
  function pushHistory(expression, answer) {
    history.push({ expression: expression, answer: answer });
    if (history.length > 40) history.shift();
    drawHistory();
  }

  function drawHistory() {
    listEl.innerHTML = "";
    emptyNote.style.display = history.length ? "none" : "block";

    for (var i = 0; i < history.length; i++) {
      var item = history[i];
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.style.cssText = "background:none;height:auto;padding:0;text-align:left;width:100%;font-family:inherit";
      btn.innerHTML = "<span>" + item.expression + "</span><b>" + item.answer + "</b>";
      btn.dataset.answer = item.answer;
      btn.addEventListener("click", reuse);
      li.appendChild(btn);
      listEl.appendChild(li);
    }
  }

  function reuse(event) {
    if (state.error) reset();
    state.current = event.currentTarget.dataset.answer;
    state.justEvaluated = true;
    state.awaitingSecond = false;
    render();
  }

  document.getElementById("clearHistory").addEventListener("click", function () {
    history = [];
    drawHistory();
  });

  /* ---------- Wiring the buttons ---------- */
  document.querySelector(".pad").addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.num !== undefined) return inputDigit(button.dataset.num);
    if (button.dataset.op !== undefined) return chooseOperator(button.dataset.op);

    switch (button.dataset.action) {
      case "decimal": return inputDecimal();
      case "clear":   return reset();
      case "back":    return backspace();
      case "sign":    return toggleSign();
      case "percent": return percent();
      case "equals":  return equals();
    }
  });

  /* ---------- Keyboard ---------- */
  document.addEventListener("keydown", function (event) {
    var k = event.key;

    if (k >= "0" && k <= "9") { inputDigit(k); flash("[data-num='" + k + "']"); return; }
    if (k === "." || k === ",") { inputDecimal(); return; }
    if (k === "+" || k === "-" || k === "*" || k === "/") {
      chooseOperator(k); flash("[data-op='" + k + "']"); return;
    }
    if (k === "x" || k === "X") { chooseOperator("*"); return; }
    if (k === "Enter" || k === "=") { event.preventDefault(); equals(); flash("[data-action='equals']"); return; }
    if (k === "Backspace") { backspace(); return; }
    if (k === "Escape") { reset(); return; }
    if (k === "%") { percent(); return; }
  });

  function flash(selector) {
    var el = document.querySelector(selector);
    if (!el) return;
    el.style.background = "var(--key-hi)";
    setTimeout(function () { el.style.background = ""; }, 110);
  }

  reset();
  drawHistory();
})();
