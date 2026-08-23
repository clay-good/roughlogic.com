// Hash-state helper: wires every calculator's input region to the URL hash
// so calculator state is bookmarkable and shareable without localStorage,
// cookies, or any other client-side persistence (spec section 11.5).
//
// Two functions:
//   applyHashState(region, params): populate inputs/selects/checkboxes from
//     the parsed hash params at view startup.
//   wireHashState(region, toolId, opts): listen on the region and write the
//     current input state back to the URL via history.replaceState.
//
// v10 §G.1 hash-schema versioning: every newly-generated hash carries a
// leading `v=<HASH_SCHEMA_VERSION>` segment. Older hashes without `v=` are
// interpreted as v=1 (the current encoding), so deep-links shared before
// v10 continue to resolve unchanged. A future encoding change would add
// v=2 with parser routing on the version.

export const HASH_SCHEMA_VERSION = 1;
const HASH_VERSION_KEY = "v";
const PRIVATE_INPUT_TYPES = new Set(["password", "email", "tel", "file"]);
const PRIVATE_AUTOCOMPLETE_TOKENS = new Set([
  "name", "honorific-prefix", "given-name", "additional-name", "family-name",
  "honorific-suffix", "nickname", "username", "new-password", "current-password",
  "one-time-code", "organization-title", "organization", "street-address",
  "address-line1", "address-line2", "address-line3", "address-level1",
  "address-level2", "address-level3", "address-level4", "country", "country-name",
  "postal-code", "cc-name", "cc-given-name", "cc-additional-name", "cc-family-name",
  "cc-number", "cc-exp", "cc-exp-month", "cc-exp-year", "cc-csc", "cc-type",
  "transaction-currency", "transaction-amount", "language", "bday", "bday-day",
  "bday-month", "bday-year", "sex", "url", "photo", "tel", "tel-country-code",
  "tel-national", "tel-area-code", "tel-local", "tel-local-prefix", "tel-local-suffix",
  "tel-extension", "email", "impp",
]);

export function isPrivateControl(el) {
  if (!el) return false;
  if (el.dataset && el.dataset.reportSensitive === "true") return true;
  if (PRIVATE_INPUT_TYPES.has(String(el.type || "").toLowerCase())) return true;
  const tokens = String(el.getAttribute && el.getAttribute("autocomplete") || "")
    .toLowerCase().trim().split(/\s+/).filter(Boolean);
  return tokens.some((token) => PRIVATE_AUTOCOMPLETE_TOKENS.has(token));
}

export function applyHashState(region, params) {
  if (!region || !params) return;
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (k === HASH_VERSION_KEY) continue;
    let el;
    try { el = region.querySelector("#" + CSS.escape(k)); } catch { el = null; }
    if (!el || isPrivateControl(el)) continue;
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
    const hasInputs = Object.keys(params).length > 0;
    // v10 §G.1: prepend v=<schema> when there is any state to encode.
    // For an inputless tile we keep the bare `#toolId` so existing
    // bookmarks compare equal and we do not pollute history.
    const ordered = hasInputs
      ? { [HASH_VERSION_KEY]: String(HASH_SCHEMA_VERSION), ...params }
      : params;
    const qs = new URLSearchParams(ordered).toString();
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
    if (!el.id || ignore.has(el.id) || isPrivateControl(el)) continue;
    // Reserved: an element with id="v" would collide with the schema-version
    // key written by wireHashState. Reject up front; tile authors should
    // pick another id.
    if (el.id === HASH_VERSION_KEY) continue;
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
