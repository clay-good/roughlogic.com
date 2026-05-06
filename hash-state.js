// Hash-state helper: wires every calculator's input region to the URL hash
// so calculator state is bookmarkable and shareable without localStorage,
// cookies, or any other client-side persistence (spec section 11.5).
//
// Two functions:
//   applyHashState(region, params): populate inputs/selects/checkboxes from
//     the parsed hash params at view startup.
//   wireHashState(region, toolId, opts): listen on the region and write the
//     current input state back to the URL via history.replaceState.

export function applyHashState(region, params) {
  if (!region || !params) return;
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    let el;
    try { el = region.querySelector("#" + CSS.escape(k)); } catch { el = null; }
    if (!el) continue;
    if (el.type === "checkbox") {
      el.checked = (v === "1" || v === "true");
    } else {
      el.value = String(v);
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export function wireHashState(region, toolId, opts = {}) {
  if (!region || !toolId) return;
  const ignore = opts.ignore || new Set();
  let timer = 0;
  const flush = () => {
    const params = collectParams(region, ignore);
    const qs = new URLSearchParams(params).toString();
    const newHash = "#" + toolId + (qs ? "?" + qs : "");
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, "", newHash);
    }
  };
  const onInput = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(flush, 100);
  };
  region.addEventListener("input", onInput);
  region.addEventListener("change", onInput);
}

function collectParams(region, ignore) {
  const params = {};
  for (const el of region.querySelectorAll("input, select, textarea")) {
    if (!el.id || ignore.has(el.id)) continue;
    let v;
    if (el.type === "checkbox") {
      v = el.checked ? "1" : "0";
    } else if (el.type === "button" || el.type === "submit" || el.type === "reset") {
      continue;
    } else {
      v = el.value;
    }
    if (v === "" || v === undefined || v === null) continue;
    params[el.id] = v;
  }
  return params;
}
