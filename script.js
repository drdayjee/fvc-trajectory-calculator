(function () {
  "use strict";

  // Coefficients — preserved exactly from the original model
  // eta_k = b0_k + b1_k*FVC0 + b2_k*dFVC + b3_k*I(interval=6)
  var COEFS = {
    eta2: { b0: 24.63242, b1: -0.2562213, b2: -0.1645991, b3: -0.4688967 },
    eta3: { b0: 41.25459, b1: -0.4780181, b2: -0.3346374, b3: -0.6440946 },
    eta4: { b0: 54.83436, b1: -0.7264913, b2: -0.4979110, b3: -0.6359341 }
  };

  var $ = function (id) { return document.getElementById(id); };

  var form = $("calc-form");
  var fvc0El = $("fvc0");
  var fvctEl = $("fvct");
  var intervalEl = $("interval");
  var emptyState = $("empty-state");
  var resultsBody = $("results-body");

  function setError(inputEl, errorElId, msg) {
    var errEl = document.getElementById(errorElId);
    if (msg) {
      inputEl.classList.add("invalid");
      inputEl.setAttribute("aria-invalid", "true");
      errEl.textContent = msg;
    } else {
      inputEl.classList.remove("invalid");
      inputEl.removeAttribute("aria-invalid");
      errEl.textContent = "";
    }
  }

  function validate() {
    var ok = true;
    var fvc0 = parseFloat(fvc0El.value);
    var fvct = parseFloat(fvctEl.value);
    var interval = intervalEl.value;

    if (isNaN(fvc0) || fvc0 < 10 || fvc0 > 200) {
      setError(fvc0El, "fvc0-error", "Enter a baseline FVC value between 10 and 200.");
      ok = false;
    } else {
      setError(fvc0El, "fvc0-error", "");
    }

    if (isNaN(fvct) || fvct < 10 || fvct > 200) {
      setError(fvctEl, "fvct-error", "Enter a follow-up FVC value between 10 and 200.");
      ok = false;
    } else {
      setError(fvctEl, "fvct-error", "");
    }

    if (interval !== "3" && interval !== "6") {
      setError(intervalEl, "interval-error", "Select an interval of 3 or 6 months.");
      ok = false;
    } else {
      setError(intervalEl, "interval-error", "");
    }

    return ok ? { fvc0: fvc0, fvct: fvct, interval: parseInt(interval, 10) } : null;
  }

  function compute(fvc0, fvct, interval) {
    var dFVC = fvct - fvc0;
    var ind6 = interval === 6 ? 1 : 0;

    var eta1 = 0; // reference category
    var eta2 = COEFS.eta2.b0 + COEFS.eta2.b1 * fvc0 + COEFS.eta2.b2 * dFVC + COEFS.eta2.b3 * ind6;
    var eta3 = COEFS.eta3.b0 + COEFS.eta3.b1 * fvc0 + COEFS.eta3.b2 * dFVC + COEFS.eta3.b3 * ind6;
    var eta4 = COEFS.eta4.b0 + COEFS.eta4.b1 * fvc0 + COEFS.eta4.b2 * dFVC + COEFS.eta4.b3 * ind6;

    var maxEta = Math.max(eta1, eta2, eta3, eta4);
    var e1 = Math.exp(eta1 - maxEta);
    var e2 = Math.exp(eta2 - maxEta);
    var e3 = Math.exp(eta3 - maxEta);
    var e4 = Math.exp(eta4 - maxEta);
    var denom = e1 + e2 + e3 + e4;

    var probs = [e1 / denom, e2 / denom, e3 / denom, e4 / denom];
    var maxP = Math.max.apply(null, probs);
    var predicted = probs.indexOf(maxP) + 1;

    var confidence;
    if (maxP >= 0.7) confidence = "High-confidence";
    else if (maxP >= 0.5) confidence = "Probable";
    else confidence = "Indeterminate";

    return {
      dFVC: dFVC,
      probs: probs,
      maxP: maxP,
      predicted: predicted,
      confidence: confidence
    };
  }

  function fmtFVC(v) {
    return Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1);
  }
  function fmtProb(p) { return p.toFixed(5); }
  function fmtPct(p) { return (p * 100).toFixed(1) + "%"; }

  function render(inputs, r) {
    emptyState.hidden = true;
    resultsBody.hidden = false;

    $("out-fvc0").textContent = fmtFVC(inputs.fvc0);
    $("out-fvct").textContent = fmtFVC(inputs.fvct);
    $("out-interval").textContent = inputs.interval + " months";

    var dStr = (r.dFVC > 0 ? "+" : "") + (Number.isInteger(r.dFVC) ? r.dFVC.toFixed(0) : r.dFVC.toFixed(1));
    $("out-dfvc").textContent = dStr;

    var predCard = $("prediction-card");
    predCard.classList.remove("t1", "t2", "t3", "t4");
    predCard.classList.add("t" + r.predicted);
    $("predicted-traj").textContent = "Trajectory " + r.predicted;

    var chip = $("confidence-chip");
    chip.classList.remove("high", "mid", "low");
    if (r.confidence === "High-confidence") chip.classList.add("high");
    else if (r.confidence === "Probable") chip.classList.add("mid");
    else chip.classList.add("low");
    chip.textContent = r.confidence;

    for (var i = 1; i <= 4; i++) {
      $("pct-" + i).textContent = fmtProb(r.probs[i - 1]) + "  (" + fmtPct(r.probs[i - 1]) + ")";
      $("bar-" + i).style.width = (r.probs[i - 1] * 100).toFixed(2) + "%";
    }

    var items = document.querySelectorAll(".prob-list li");
    items.forEach(function (li) {
      li.classList.toggle("winner", parseInt(li.getAttribute("data-traj"), 10) === r.predicted);
    });
  }

  function clearResults() {
    resultsBody.hidden = true;
    emptyState.hidden = false;
    [fvc0El, fvctEl, intervalEl].forEach(function (el) {
      el.classList.remove("invalid");
      el.removeAttribute("aria-invalid");
    });
    ["fvc0-error", "fvct-error", "interval-error"].forEach(function (id) {
      document.getElementById(id).textContent = "";
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var inputs = validate();
    if (!inputs) return;
    var r = compute(inputs.fvc0, inputs.fvct, inputs.interval);
    render(inputs, r);
  });

  form.addEventListener("reset", function () {
    setTimeout(clearResults, 0);
  });

  [fvc0El, fvctEl, intervalEl].forEach(function (el) {
    el.addEventListener("input", function () {
      var idMap = { fvc0: "fvc0-error", fvct: "fvct-error", interval: "interval-error" };
      var errId = idMap[el.id];
      if (errId) {
        el.classList.remove("invalid");
        el.removeAttribute("aria-invalid");
        document.getElementById(errId).textContent = "";
      }
    });
  });
})();
