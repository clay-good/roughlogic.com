// Startup integrity check (spec section 7).
//
// Fetches data/integrity.json (a build-time sidecar produced by
// scripts/build-data.mjs) and verifies the SHA-256 hash of each per-folder
// manifest.json against the expected value. On mismatch, the affected
// dataset is added to a list and a non-blocking banner is shown so the
// user is aware that one or more bundled datasets do not match the build.
//
// SubtleCrypto is available in any secure context. If unavailable (e.g.,
// http://localhost without SubtleCrypto polyfill), the check is skipped
// rather than failing closed.

// The set of folders to verify is the set of manifests recorded in
// data/integrity.json. Reading the key list from the sidecar (rather
// than maintaining a parallel hardcoded list here) means a new data
// shard added to the build pipeline is automatically integrity-checked
// at runtime without a follow-up edit to this file.

export async function verifyManifestIntegrity() {
  if (!globalThis.crypto || !crypto.subtle || typeof crypto.subtle.digest !== "function") {
    return { skipped: true, mismatches: [] };
  }

  let expected;
  try {
    const r = await fetch("data/integrity.json", { cache: "no-cache" });
    if (!r.ok) return { skipped: true, mismatches: [], reason: "no-integrity-json" };
    expected = await r.json();
  } catch {
    return { skipped: true, mismatches: [], reason: "no-integrity-json" };
  }
  if (!expected || !expected.manifests) return { skipped: true, mismatches: [] };

  const mismatches = [];
  for (const folder of Object.keys(expected.manifests)) {
    const want = expected.manifests[folder];
    if (!want) continue;
    let text;
    try {
      const r = await fetch("data/" + folder + "/manifest.json", { cache: "no-cache" });
      if (!r.ok) { mismatches.push({ folder, reason: "missing" }); continue; }
      text = await r.text();
    } catch {
      mismatches.push({ folder, reason: "fetch-failed" });
      continue;
    }
    const got = await sha256Hex(text);
    if (got !== want) {
      mismatches.push({ folder, reason: "hash-mismatch", expected: want, got });
    }
  }

  if (mismatches.length > 0) {
    showIntegrityBanner(mismatches);
    console.error("integrity: " + mismatches.length + " manifest(s) failed verification", mismatches);
  }
  return { skipped: false, mismatches };
}

// Per-shard verification. The startup pass above only proves each folder's
// manifest.json is the one the build produced; it never looks at the shards,
// so an altered data file with an untouched manifest used to load unnoticed.
// verifyShard closes that: the caller hands over the exact text it fetched and
// the manifest's recorded hash decides. Non-blocking, like the startup pass --
// refusing the data would turn a stale service-worker cache into a dead
// calculator. scripts/check-integrity-coverage.mjs keeps the recorded hash set
// complete; docs/threat-model.md has the history.
const manifestCache = new Map();

async function loadManifest(folder) {
  if (!manifestCache.has(folder)) {
    manifestCache.set(folder, (async () => {
      try {
        const r = await fetch("data/" + folder + "/manifest.json", { cache: "default" });
        if (!r.ok) return null;
        return JSON.parse(await r.text());
      } catch {
        return null;
      }
    })());
  }
  return manifestCache.get(folder);
}

export async function verifyShard(folder, file, text) {
  if (!globalThis.crypto || !crypto.subtle || typeof crypto.subtle.digest !== "function") {
    return { skipped: true, ok: true };
  }
  const m = await loadManifest(folder);
  // No recorded hash is not a failure: inventing a mismatch would banner the
  // innocent. The coverage gate is what makes the recorded set complete.
  const want = m && m.hashes && m.hashes[file];
  if (!want) return { skipped: true, ok: true };
  const got = await sha256Hex(text);
  if (got === want) return { skipped: false, ok: true };
  const mismatch = { folder, file, reason: "shard-hash-mismatch", expected: want, got };
  showIntegrityBanner([{ folder: folder + "/" + file, reason: "shard-hash-mismatch" }]);
  console.error("integrity: shard failed verification", mismatch);
  return { skipped: false, ok: false, mismatch };
}

async function sha256Hex(s) {
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const h = bytes[i].toString(16);
    out += h.length === 1 ? "0" + h : h;
  }
  return out;
}

function showIntegrityBanner(mismatches) {
  if (document.getElementById("integrity-banner")) return;
  const main = document.getElementById("main") || document.body;
  const banner = document.createElement("div");
  banner.id = "integrity-banner";
  banner.setAttribute("role", "alert");
  banner.className = "integrity-banner";
  const list = mismatches.map((m) => m.folder + " (" + m.reason + ")").join(", ");
  banner.textContent = "Data integrity check failed for: " + list + ". Calculators using these datasets may be unreliable. Reload the page; if the issue persists, file an issue at github.com/clay-good/roughlogic.com.";
  main.insertBefore(banner, main.firstChild);
}
