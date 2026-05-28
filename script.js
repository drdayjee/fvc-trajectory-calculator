/*
 * Early FVC Trajectory Probability Calculator
 *
 * The calculation logic is a direct, coefficient-for-coefficient port of the
 * validated Excel spreadsheet. Coefficients are written here exactly as in
 * the workbook; do not round, truncate, or simplify them.
 */

(function () {
  "use strict";

  // ---- DOM references ----
  var form     = document.getElementById("calc-form");
  var fvc0In   = document.getElementById("fvc0");
  var fvctIn   = document.getElementById("fvct");
  var monthsIn = document.getElementById("months");
  var calcBtn  = document.getElementById("calc-btn");
  var resetBtn = document.getElementById("reset-btn");

  var fvc0Err   = document.getElementById("fvc0-error");
  var fvctErr   = document.getElementById("fvct-error");
  var monthsErr = document.getElementById("months-error");

  var outFvc0   = document.getElementById("out-fvc0");
  var outFvct   = document.getElementById("out-fvct");
  var outMonths = document.getElementById("out-months");
  var outDelta  = document.getElementById("out-delta");
  var outTraj   = document.getElementById("out-traj");
  var outConf   = document.getElementById("out-conf");

  var pDec = [
    document.getElementById("p1-dec"),
    document.getElementById("p2-dec"),
    document.getElementById("p3-dec"),
    document.getElementById("p4-dec")
  ];
  var pPct = [
    document.getElementById("p1-pct"),
    document.getElementById("p2-pct"),
    document.getElementById("p3-pct"),
    document.getElementById("p4-pct")
  ];
  var rowEls = [
    document.getElementById("row-t1"),
    document.getElementById("row-t2"),
    document.getElementById("row-t3"),
    document.getElementById("row-t4")
  ];

  // ---- Core calculation ----
  // Inputs:
  //   FVC0         baseline FVC % predicted (number)
  //   FVCt         follow-up FVC % predicted (number)
  //   timeMonths   3 or 6 (number)
  // Returns an object with deltaFVC, p[1..4] (1-indexed convenience), trajectory, confidence.
  function calculate(FVC0, FVCt, timeMonths) {
    var deltaFVC = FVCt - FVC0;
    var I6 = (timeMonths === 6) ? 1 : 0;

    // Linear predictors — copy of B8, B9, B10 in the Excel workbook.
    var eta2 = 24.63242 - 0.2562213 * FVC0 - 0.1645991 * deltaFVC - 0.4688967 * I6;
    var eta3 = 41.25459 - 0.4780181 * FVC0 - 0.3346374 * deltaFVC - 0.6440946 * I6;
    var eta4 = 54.83436 - 0.7264913 * FVC0 - 0.4979110 * deltaFVC - 0.6359341 * I6;

    // Numerically stable softmax against trajectory 1 (reference = 0).
    var maxeta = Math.max(0, eta2, eta3, eta4);
    var e1 = Math.exp(0    - maxeta);
    var e2 = Math.exp(eta2 - maxeta);
    var e3 = Math.exp(eta3 - maxeta);
    var e4 = Math.exp(eta4 - maxeta);
    var denom = e1 + e2 + e3 + e4;

    var p1 = e1 / denom;
    var p2 = e2 / denom;
    var p3 = e3 / denom;
    var p4 = e4 / denom;

    var probs = [p1, p2, p3, p4];
    var maxIdx = 0;
    for (var i = 1; i < 4; i++) {
      if (probs[i] > probs[maxIdx]) maxIdx = i;
    }
    var maxP = probs[maxIdx];

    var confidence;
    if (maxP >= 0.7) confidence = "High-confidence";
    else if (maxP >= 0.5) confidence = "Probable";
    else confidence = "Uncertain";

    return {
      deltaFVC: deltaFVC,
      probs: probs,
      trajectoryIndex: maxIdx,            // 0..3
      trajectoryLabel: "Trajectory " + (maxIdx + 1),
      confidence: confidence,
      maxP: maxP
    };
  }

  // ---- Validation ----
  // Returns { valid, FVC0, FVCt, months, errors } where errors maps field -> message.
  function readAndValidate(showErrors) {
    var errors = {};
    var fvc0Raw   = fvc0In.value.trim();
    var fvctRaw   = fvctIn.value.trim();
    var monthsRaw = monthsIn.value.trim();

    var FVC0   = fvc0Raw === "" ? NaN : Number(fvc0Raw);
    var FVCt   = fvctRaw === "" ? NaN : Number(fvctRaw);
    var months = monthsRaw === "" ? NaN : Number(monthsRaw);

    if (fvc0Raw === "") {
      errors.fvc0 = "Required.";
    } else if (!isFinite(FVC0)) {
      errors.fvc0 = "Enter a numeric value.";
    }

    if (fvctRaw === "") {
      errors.fvct = "Required.";
    } else if (!isFinite(FVCt)) {
      errors.fvct = "Enter a numeric value.";
    }

    if (monthsRaw === "") {
      errors.months = "Required.";
    } else if (months !== 3 && months !== 6) {
      errors.months = "Interval must be exactly 3 or 6 months.";
    }

    if (showErrors) renderErrors(errors);

    return {
      valid: Object.keys(errors).length === 0,
      FVC0: FVC0,
      FVCt: FVCt,
      months: months,
      errors: errors
    };
  }

  function renderErrors(errors) {
    setFieldError(fvc0In,   fvc0Err,   errors.fvc0);
    setFieldError(fvctIn,   fvctErr,   errors.fvct);
    setFieldError(monthsIn, monthsErr, errors.months);
  }

  function setFieldError(inputEl, errorEl, msg) {
    if (msg) {
      errorEl.textContent = msg;
      inputEl.setAttribute("aria-invalid", "true");
    } else {
      errorEl.textContent = "";
      inputEl.removeAttribute("aria-invalid");
    }
  }

  // ---- Output rendering ----
  function fmtNumber(n, decimals) {
    if (n === null || n === undefined || !isFinite(n)) return "—";
    return n.toFixed(decimals);
  }
  function fmtSigned(n, decimals) {
    if (!isFinite(n)) return "—";
    return (n > 0 ? "+" : "") + n.toFixed(decimals);
  }
  function fmtPct(p) {
    return (p * 100).toFixed(2) + "%";
  }
  // Probabilities shown to 6 decimal places, per spec.
  var PROB_DECIMALS = 6;

  function renderResults(r, inputs) {
    outFvc0.textContent   = fmtNumber(inputs.FVC0, 2);
    outFvct.textContent   = fmtNumber(inputs.FVCt, 2);
    outMonths.textContent = inputs.months + " months";
    outDelta.textContent  = fmtSigned(r.deltaFVC, 2);

    for (var i = 0; i < 4; i++) {
      pDec[i].textContent = r.probs[i].toFixed(PROB_DECIMALS);
      pPct[i].textContent = fmtPct(r.probs[i]);
      rowEls[i].classList.toggle("winner", i === r.trajectoryIndex);
    }

    outTraj.textContent = r.trajectoryLabel;
    outConf.textContent = r.confidence;
  }

  function clearResults() {
    outFvc0.textContent   = "—";
    outFvct.textContent   = "—";
    outMonths.textContent = "—";
    outDelta.textContent  = "—";
    for (var i = 0; i < 4; i++) {
      pDec[i].textContent = "—";
      pPct[i].textContent = "—";
      rowEls[i].classList.remove("winner");
    }
    outTraj.textContent = "—";
    outConf.textContent = "—";
  }

  // ---- Event handlers ----
  function onSubmit(e) {
    e.preventDefault();
    var v = readAndValidate(true);
    if (!v.valid) {
      clearResults();
      var firstBad = v.errors.fvc0 ? fvc0In : (v.errors.fvct ? fvctIn : monthsIn);
      firstBad.focus();
      return;
    }
    var r = calculate(v.FVC0, v.FVCt, v.months);
    renderResults(r, v);
  }

  function onLiveChange() {
    // Live recalc only when everything is valid; otherwise just clear errors silently
    // for the field being edited but do not recompute.
    var v = readAndValidate(false);
    if (v.valid) {
      var r = calculate(v.FVC0, v.FVCt, v.months);
      renderResults(r, v);
    } else {
      clearResults();
    }
  }

  function onFieldBlur() {
    // Re-validate visibly on blur once the user has touched a field.
    readAndValidate(true);
  }

  function onReset() {
    form.reset();
    renderErrors({});
    clearResults();
    fvc0In.focus();
  }

  // Wire up
  form.addEventListener("submit", onSubmit);
  resetBtn.addEventListener("click", onReset);
  [fvc0In, fvctIn, monthsIn].forEach(function (el) {
    el.addEventListener("input",  onLiveChange);
    el.addEventListener("change", onLiveChange);
    el.addEventListener("blur",   onFieldBlur);
  });

  // Expose for manual console testing / external test harnesses.
  window.FVCTraj = { calculate: calculate };
})();
