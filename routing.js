// Routing and filter pure helpers. Extracted so they can be unit-tested
// without a DOM. app.js imports from here and applies the result to its
// state. The hash format follows spec section 11.5 exactly:
//   #               -> home
//   #home           -> home
//   #p=a,b,c        -> home + pinned
//   #toolId         -> tool view
//   #toolId?k=v&... -> tool view with calculator state

export function parseHashRoute(rawHash, validToolIds) {
  const raw = String(rawHash || "").replace(/^#/, "");
  const idSet = validToolIds instanceof Set ? validToolIds : new Set(validToolIds || []);
  if (!raw) return { route: { view: "home", id: null, params: {} } };
  // Bundle hash: home view, but the application layer will decode and apply.
  if (raw.startsWith("b=")) {
    return { route: { view: "home", id: null, params: {} }, bundle: raw.slice(2) };
  }
  // Home-view multi-key form: p=...&r=... (pinned and recents).
  if (raw.startsWith("p=") || raw.startsWith("r=")) {
    const result = { route: { view: "home", id: null, params: {} } };
    for (const part of raw.split("&")) {
      if (part.startsWith("p=")) result.pinned = decodeIdList(part.slice(2), idSet);
      else if (part.startsWith("r=")) result.recents = decodeIdList(part.slice(2), idSet);
    }
    return result;
  }
  const [idPart, queryPart] = raw.split("?");
  const id = idPart;
  let params = {};
  if (queryPart) {
    try { params = Object.fromEntries(new URLSearchParams(queryPart)); } catch { params = {}; }
  }
  if (id === "" || id === "home") return { route: { view: "home", id: null, params: {} } };
  if (idSet.has(id)) return { route: { view: "tool", id, params } };
  return { route: { view: "home", id: null, params: {} } };
}

// Generic id-list decoder (used for both pinned and recents).
export function decodeIdList(raw, validToolIds) {
  const idSet = validToolIds instanceof Set ? validToolIds : new Set(validToolIds || []);
  return String(raw || "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id && idSet.has(id));
}

// Backwards-compatible alias kept for the existing routing.test.js cases
// that reference decodePinnedList directly. New code should import
// `decodeIdList` instead.
export const decodePinnedList = decodeIdList;

export function toolMatches(tool, filters) {
  const { trade = "all", group = "all", query = "" } = filters || {};
  if (trade !== "all" && !tool.trades.includes(trade)) return false;
  if (group !== "all" && tool.group !== group) return false;
  if (query) {
    const q = String(query).toLowerCase();
    const hay = (tool.name + " " + tool.desc).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}
