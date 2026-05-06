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

const FOLDERS = [
  "physical-constants", "electrical", "plumbing", "hvac",
  "restoration", "construction", "fire", "crosswalks", "summaries",
];

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
  for (const folder of FOLDERS) {
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
