// Input validity helper (spec section 11.2).
//
// "Invalid inputs display a brief plain-text reason in the same field; the
// previous valid output remains visible with a strikethrough until the
// input is valid."
//
// We delegate validity to the browser's HTML5 checkValidity() so the
// constraints already declared on the inputs (type="number", min/max/step,
// required) drive the experience without per-calculator wiring. When any
// input fails checkValidity, the output region gains the .output-stale
// class (CSS strikes through values), an aria-invalid attribute is set on
// the offending input, and a brief reason is rendered next to it. When
// every input is valid again, both reasons and strikethrough are cleared.

const REASON_CLASS = "validity-reason";
const STALE_CLASS = "output-stale";

export function wireValidity(inputRegion, outputRegion) {
  if (!inputRegion || !outputRegion) return () => {};

  const check = () => {
    let anyInvalid = false;
    const inputs = inputRegion.querySelectorAll("input, select, textarea");
    for (const el of inputs) {
      if (typeof el.checkValidity !== "function") continue;
      // Skip controls without constraints (no min/max/step/pattern/required).
      if (!hasConstraints(el)) {
        el.removeAttribute("aria-invalid");
        clearReason(el);
        continue;
      }
      const ok = el.checkValidity();
      if (!ok) {
        anyInvalid = true;
        el.setAttribute("aria-invalid", "true");
        renderReason(el, el.validationMessage || "Invalid value");
      } else {
        el.removeAttribute("aria-invalid");
        clearReason(el);
      }
    }
    outputRegion.classList.toggle(STALE_CLASS, anyInvalid);
  };

  inputRegion.addEventListener("input", check);
  inputRegion.addEventListener("change", check);
  // Initial pass picks up any preloaded URL params that violate constraints.
  check();

  return () => {
    inputRegion.removeEventListener("input", check);
    inputRegion.removeEventListener("change", check);
  };
}

function hasConstraints(el) {
  if (el.required) return true;
  if (el.type === "number" || el.type === "range") {
    if (el.min !== "" || el.max !== "" || (el.step && el.step !== "any")) return true;
  }
  if (el.pattern) return true;
  if (el.minLength > 0 || el.maxLength > 0) return true;
  return false;
}

function renderReason(el, text) {
  const host = reasonHost(el);
  if (!host) return;
  let reason = host.querySelector("." + REASON_CLASS);
  if (!reason) {
    reason = document.createElement("span");
    reason.className = REASON_CLASS;
    reason.setAttribute("role", "status");
    host.appendChild(reason);
  }
  reason.textContent = text;
}

function clearReason(el) {
  const host = reasonHost(el);
  if (!host) return;
  const reason = host.querySelector("." + REASON_CLASS);
  if (reason) reason.remove();
}

function reasonHost(el) {
  // Place the reason inside the field wrapper if there is one, otherwise
  // alongside the input.
  return el.closest(".field") || el.parentElement;
}
