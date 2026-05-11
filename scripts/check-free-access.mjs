#!/usr/bin/env node
// v10 Phase A.2 free-access URL probe (spec-v10.md §3.2).
//
// Reads every tile's source-stamp string in ../citations.js and probes
// any free-access URL referenced (nfpa.org/freeaccess, codes.iccsafe.org,
// ecfr.gov, epa.gov, fda.gov, ashrae.org, ncei.noaa.gov, faa.gov,
// awc.org, etc.). Verifies each URL responds 200.
//
// Opt-in: invoked via `npm run check:free-access`. Not part of `npm run
// lint`; a free-access URL going 4xx may be temporary or may indicate
// the publisher has restructured their site, neither of which should
// block a release.
//
// Behavior:
//   - Probes each unique host+path with HTTP HEAD; falls back to GET
//     when the server rejects HEAD.
//   - 200-class: PASS, no action.
//   - 3xx redirect: PASS, but logs the final URL (publisher likely
//     reorganized; the citation may want a refresh).
//   - 4xx / 5xx / network error: WARN, logged for follow-up. The
//     spec instructs maintainers to append a manual review entry to
//     scripts/sources.md when a probe fails.
//
// Per-host rate limit: 1 request at a time per host; 250 ms between
// requests to the same host. We are not running this in CI; the budget
// is friendliness to publishers.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CITATIONS = resolve(ROOT, "citations.js");

// Hosts the spec-v10 §3.2 example list calls out. We probe any URL
// that lands under one of these hosts. The match is host-suffix so
// `www.nfpa.org/freeaccess` and `nfpa.org/freeaccess` both qualify.
const TRACKED_HOSTS = [
  "nfpa.org",
  "codes.iccsafe.org",
  "ecfr.gov",
  "epa.gov",
  "fda.gov",
  "ashrae.org",
  "ncei.noaa.gov",
  "faa.gov",
  "awc.org",
  "irs.gov",
];

// URLs in citations.js are bare (no protocol), per the citation-discipline
// convention. We extract `host[/path]` substrings ending at a non-URL
// character (space, comma, semicolon, period followed by space, double
// quote, paren). The trailing-period stripping is important because
// citation strings end with a sentence period.
function extractFreeAccessRefs(text) {
  const refs = new Set();
  // Build a regex that matches any tracked host followed by an optional
  // path, terminated by whitespace / quote / closing punctuation.
  const hostAlt = TRACKED_HOSTS.map((h) => h.replace(/\./g, "\\.")).join("|");
  const re = new RegExp(
    "(?:https?://)?(?:www\\.)?(" + hostAlt + ")(/[A-Za-z0-9._~:/?#\\[\\]@!$&'()*+,;=-]*)?",
    "g",
  );
  for (const m of text.matchAll(re)) {
    let url = (m[0] || "").trim();
    // Strip trailing punctuation that almost always belongs to the
    // surrounding sentence rather than the URL.
    url = url.replace(/[.,;:'")\]]+$/, "");
    // Skip obvious noise (a bare hostname with no path is still a valid
    // free-access entry but we de-dup at host+path).
    if (!url) continue;
    // Add an https:// scheme if missing; that's the canonical form for
    // a probe.
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    refs.add(url);
  }
  return [...refs].sort();
}

async function probe(url) {
  // node fetch with a short-ish timeout. Some publishers (icc, nfpa)
  // are slow; allow 15 s.
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  try {
    let r = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "roughlogic-free-access-probe/1.0 (maintenance)" },
    });
    if (r.status === 405 || r.status === 501) {
      // HEAD not allowed; retry with GET.
      r = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "roughlogic-free-access-probe/1.0 (maintenance)" },
      });
    }
    return { ok: r.ok, status: r.status, finalUrl: r.url };
  } catch (e) {
    return { ok: false, status: 0, error: String(e && e.message ? e.message : e) };
  } finally {
    clearTimeout(t);
  }
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

async function main() {
  const text = await readFile(CITATIONS, "utf8");
  const urls = extractFreeAccessRefs(text);
  if (urls.length === 0) {
    console.log("free-access probe: no tracked URLs found in citations.js.");
    return;
  }
  console.log(
    "free-access probe: checking " + urls.length + " unique URL(s) across " + TRACKED_HOSTS.length + " tracked hosts.",
  );

  // Group by host so we can space requests to the same host.
  const byHost = new Map();
  for (const u of urls) {
    const h = hostOf(u);
    if (!byHost.has(h)) byHost.set(h, []);
    byHost.get(h).push(u);
  }

  const results = [];
  for (const [, list] of byHost) {
    for (let i = 0; i < list.length; i++) {
      const u = list[i];
      const r = await probe(u);
      results.push({ url: u, ...r });
      if (i < list.length - 1) await new Promise((res) => setTimeout(res, 250));
    }
  }

  let warnCount = 0;
  for (const r of results) {
    if (r.ok) {
      const note = r.finalUrl && r.finalUrl !== r.url ? " -> " + r.finalUrl : "";
      console.log("OK   " + r.status + " " + r.url + note);
    } else {
      warnCount += 1;
      const detail = r.error ? " (" + r.error + ")" : "";
      console.warn("WARN " + (r.status || "ERR") + " " + r.url + detail);
    }
  }
  console.log(
    "free-access probe: " + (results.length - warnCount) + " OK / " + warnCount + " WARN.",
  );
  if (warnCount > 0) {
    console.log(
      "Append a manual review entry to scripts/sources.md per spec-v10 §3.2.",
    );
  }
}

await main();
