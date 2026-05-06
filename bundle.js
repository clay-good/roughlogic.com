// Project Bundle (utility 121).
//
// A bundle is a JSON document that captures the user's pinned set,
// recents ring, and a per-tool input map. It can be encoded into a
// long #b=<base64url> URL hash for sharing, or downloaded as a JSON
// file via a same-origin Blob URL. CSP is not relaxed; Blob URLs are
// same-origin and acceptable.

export const BUNDLE_VERSION = 1;
export const BUNDLE_MAX_BYTES = 32 * 1024;

function toBase64Url(s) {
  // s is a UTF-8 string. Use TextEncoder + Uint8Array to base64url.
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = (typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64"));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s) {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = (typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary"));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeBundle(state) {
  const bundle = {
    version: BUNDLE_VERSION,
    pinned: Array.isArray(state.pinned) ? state.pinned.slice() : [],
    recents: Array.isArray(state.recents) ? state.recents.slice() : [],
    inputs: state.inputs && typeof state.inputs === "object" ? state.inputs : {},
  };
  return JSON.stringify(bundle);
}

export function encodeBundleHash(state) {
  const json = encodeBundle(state);
  return "b=" + toBase64Url(json);
}

export function decodeBundle(text) {
  if (typeof text !== "string") return { error: "Bundle must be a string." };
  let raw = text.trim();
  if (raw.startsWith("#")) raw = raw.slice(1);
  if (raw.startsWith("b=")) raw = raw.slice(2);
  // Heuristic: if it parses as JSON directly, treat as raw JSON; else try base64url.
  let json = raw;
  if (!raw.startsWith("{")) {
    try { json = fromBase64Url(raw); } catch { return { error: "Malformed base64url." }; }
  }
  // Size cap before parsing to avoid pathological JSON expansion.
  if (json.length > BUNDLE_MAX_BYTES) return { error: "Bundle exceeds 32 KB cap." };
  let obj;
  try { obj = JSON.parse(json); } catch { return { error: "Malformed JSON." }; }
  if (!obj || typeof obj !== "object") return { error: "Bundle must be a JSON object." };
  if (obj.version !== BUNDLE_VERSION) return { error: "Unsupported bundle version." };
  return {
    version: obj.version,
    pinned: Array.isArray(obj.pinned) ? obj.pinned.filter((x) => typeof x === "string") : [],
    recents: Array.isArray(obj.recents) ? obj.recents.filter((x) => typeof x === "string") : [],
    inputs: obj.inputs && typeof obj.inputs === "object" ? obj.inputs : {},
  };
}

// Filter a decoded bundle's id arrays against the live tool registry so
// stale or hostile ids never reach state.
export function sanitizeBundle(bundle, validToolIds) {
  const valid = validToolIds instanceof Set ? validToolIds : new Set(validToolIds || []);
  const inputs = {};
  for (const [k, v] of Object.entries(bundle.inputs || {})) {
    if (valid.has(k) && v && typeof v === "object") inputs[k] = v;
  }
  return {
    version: bundle.version,
    pinned: (bundle.pinned || []).filter((id) => valid.has(id)),
    recents: (bundle.recents || []).filter((id) => valid.has(id)),
    inputs,
  };
}
