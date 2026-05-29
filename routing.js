// Routing and filter pure helpers. Extracted so they can be unit-tested
// without a DOM. app.js imports from here and applies the result to its
// state. The hash format is:
//   #               -> home
//   #home           -> home
//   #toolId         -> tool view
//   #toolId?k=v&... -> tool view with calculator state
//
// The home-view pinned form (#p=...) was retired with the home tile grid;
// pre-existing #p= / #r= links fall through to the unknown-id case below
// and route to home, so old shared links still resolve.

export function parseHashRoute(rawHash, validToolIds) {
  const raw = String(rawHash || "").replace(/^#/, "");
  const idSet = validToolIds instanceof Set ? validToolIds : new Set(validToolIds || []);
  if (!raw) return { route: { view: "home", id: null, params: {} } };
  // Bundle hash: home view, but the application layer will decode and apply.
  if (raw.startsWith("b=")) {
    return { route: { view: "home", id: null, params: {} }, bundle: raw.slice(2) };
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
