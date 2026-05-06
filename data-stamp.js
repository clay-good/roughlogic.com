// Data source stamps per spec section 11.7.
//
// For reference-style utilities (those that read bundled data rather than
// computing from first principles), every view displays the source dataset
// and its version date directly on the page:
//
//   Source: <dataset name>, <version>, fetched <date>
//
// First-principles calculators cite the underlying physics in their
// inline citation and do not use this helper.
//
// All fetches are same-origin and pass through the service worker cache.

const manifestCache = new Map();

export async function fetchManifest(folder) {
  if (manifestCache.has(folder)) return manifestCache.get(folder);
  const promise = (async () => {
    try {
      const resp = await fetch("data/" + folder + "/manifest.json", { cache: "default" });
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    }
  })();
  manifestCache.set(folder, promise);
  return promise;
}

// Append a source line to `parent`. `source` shape:
//   { folder: "hvac", shard: "refrigerants.json", label: "Refrigerant P-T tables" }
// label is optional; if omitted we fall back to the manifest's per-shard
// `name` field, then to the shard filename.
export async function stampDataSource(parent, source) {
  if (!parent || !source || !source.folder) return;
  const manifest = await fetchManifest(source.folder);
  const p = document.createElement("p");
  p.className = "data-source-stamp";
  if (!manifest) {
    p.textContent = "Source: " + (source.label || source.shard || source.folder) + " (manifest unavailable)";
    parent.appendChild(p);
    return;
  }
  const shardEntry = (manifest.shards || []).find((s) => s.file === source.shard);
  const label = source.label || (shardEntry && shardEntry.name) || source.shard || source.folder;
  const version = manifest.version || "unknown";
  const fetched = manifest.fetched || version;
  p.textContent = "Source: " + label + ", version " + version + ", fetched " + fetched + ".";
  parent.appendChild(p);
}

// Read the global build-info.json and update the footer data-version line.
export async function stampFooterVersion() {
  const el = document.getElementById("data-version");
  if (!el) return;
  // Prefer build-info.json (build timestamp). Fall back to a manifest version.
  let label = null;
  try {
    const r = await fetch("build-info.json", { cache: "default" });
    if (r.ok) {
      const j = await r.json();
      if (j && j.built) label = j.built.slice(0, 10);
    }
  } catch { /* fall through */ }
  if (!label) {
    const m = await fetchManifest("physical-constants");
    if (m && m.version) label = m.version;
  }
  el.textContent = "Data version: " + (label || "dev");
}
