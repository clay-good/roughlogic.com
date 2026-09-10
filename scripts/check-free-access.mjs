#!/usr/bin/env node
// v10 Phase A.2 free-access URL probe (spec-v10.md §3.2).
//
// Reads every tile's source-stamp string in ../citations.js, every
// `free_access_url` in scripts/sources-cycle.json, and every `free_access`
// string in data/*/*.json, and probes each free-access URL referenced
// (nfpa.org/freeaccess, codes.iccsafe.org,
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

import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CITATIONS = resolve(ROOT, "citations.js");
// The citation strings are the surface a READER follows. The cycle file's
// `free_access_url` is the surface a MAINTAINER follows to re-verify, and
// until 2026-09-09 nothing probed it: the NEC row pointed at
// nfpa.org/free-access, which 404s, while all 44 reader-facing NEC citations
// used nfpa.org/freeaccess, which resolves. The one URL nobody could see was
// the broken one. Probe both surfaces.
const CYCLE = resolve(ROOT, "scripts", "sources-cycle.json");
// The THIRD surface: each shard's own `free_access` prose, which is what the
// data files promise a reader can go and read. It went unprobed alongside the
// ledger until 2026-09-09, when the loan-limits shard turned out to be sending
// people to fhfa.gov/data/loan-limit-values -- a hard 404. FHFA moved that page
// to /data/conforming-loan-limit.
const DATA_DIR = resolve(ROOT, "data");

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

const UA = { "User-Agent": "roughlogic-free-access-probe/1.0 (maintenance)" };

// One request with its own 15 s budget. Publishers (icc, nfpa) are slow.
async function request(url, method) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  try {
    // NETWORK: this gate's whole job is to ask a publisher's server whether the
    // free-access URL a tile cites still answers 200. It is opt-in
    // (`npm run check:free-access`) and deliberately outside `npm run lint` and
    // the build, so nothing that produces dist/ depends on it.
    const r = await fetch(url, { method, redirect: "follow", signal: controller.signal, headers: UA });
    return { r, aborted: false };
  } catch (e) {
    return { error: e, aborted: controller.signal.aborted };
  } finally {
    clearTimeout(t);
  }
}

async function probe(url) {
  let { r, error, aborted } = await request(url, "HEAD");
  // Retry with GET on a 405/501, and ALSO when HEAD simply fails. ncei.noaa.gov
  // closes the connection on a HEAD -- curl -I gets a 200, node's fetch throws
  // "other side closed" -- so the probe reported two dead links against a host
  // the data pipeline downloads from every week. A probe that cries wolf on a
  // live publisher is worse than one that runs less often.
  const headRefused = !r || r.status === 405 || r.status === 501;
  if (headRefused && !aborted) {
    ({ r, error } = await request(url, "GET"));
  }
  if (!r) return { ok: false, status: 0, error: String(error && error.message ? error.message : error) };
  // A SOFT 404 answers 200 and redirects to a not-found page, so a status-code
  // probe calls it healthy. The AASHTO row's product-ID URL did exactly that
  // -- 200, final URL store.transportation.org/Common/NotFound -- and read as
  // OK for as long as anyone had been running this. Judge the destination, not
  // just the code.
  const softNotFound = SOFT_404.test(new URL(r.url, url).pathname);
  if (softNotFound) {
    return { ok: false, status: r.status, finalUrl: r.url, soft404: true };
  }
  return { ok: r.ok, status: r.status, finalUrl: r.url };
}

// Path segments a publisher uses for "this page is gone" while still answering
// 200. Matched against the FINAL url's path only, so a legitimate page about
// error handling at some deeper path is not caught by accident.
const SOFT_404 = /^\/(?:common\/)?(?:notfound|not-found|404|pagenotfound|page-not-found|error)\/?$/i;

// Hosts that answer 403 (or drop the connection) to any automated fetch
// regardless of whether the page is healthy. These are NOT suppressed -- a real
// regression here still has to be looked at -- but the line says so, because
// otherwise every run makes somebody re-diagnose a bot wall as a broken link.
// Each was opened in a browser on the date given and served its real page:
//   codes.iccsafe.org        2026-09-09  the I-Codes index
//   ssa.gov                  2026-09-09  "Contribution and Benefit Base"
//   beckman.com              2026-09-09  Beckman Coulter Life Sciences home
//   iupac.org                2026-09-09  redirects to publications.iupac.org
//   publications.iupac.org   2026-09-09  Cloudflare "performing security
//                                        verification" interstitial -- the host
//                                        is up and gating bots, not down
// Re-open any of these in a browser rather than trusting the list: a host that
// has genuinely gone away looks exactly the same from here.
const BOT_WALLED = new Set([
  "codes.iccsafe.org",
  "ssa.gov",
  "beckman.com",
  "iupac.org",
  "publications.iupac.org",
]);

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

async function main() {
  const text = await readFile(CITATIONS, "utf8");
  const fromCitations = extractFreeAccessRefs(text);

  // The cycle file's URLs are already absolute and are not limited to the
  // tracked hosts -- a ledger row may cite any publisher -- so take them
  // whole rather than re-extracting them by host.
  const cycle = JSON.parse(await readFile(CYCLE, "utf8"));
  const fromCycle = [];
  for (const row of [...(cycle.standards || []), ...(cycle.annual_figures || [])]) {
    const u = row.free_access_url;
    if (typeof u === "string" && /^https?:\/\//.test(u)) fromCycle.push(u);
  }

  // Third surface: each shard's own `free_access` prose. These are free-form
  // strings ("FHFA: fhfa.gov/data/conforming-loan-limit. HUD FHA: ..."), so
  // pull host+path substrings the way the citation strings are parsed, but
  // without the tracked-host restriction -- a shard may name any publisher.
  const fromShards = [];
  for (const folder of await readdir(DATA_DIR, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    for (const name of await readdir(resolve(DATA_DIR, folder.name))) {
      if (!name.endsWith(".json")) continue;
      let body;
      try {
        body = JSON.parse(await readFile(resolve(DATA_DIR, folder.name, name), "utf8"));
      } catch {
        continue;
      }
      const fa = body && typeof body.free_access === "string" ? body.free_access : "";
      if (!fa) continue;
      for (const m of fa.matchAll(/(?:https?:\/\/)?(?:www\.)?([a-z0-9][a-z0-9.-]*\.[a-z]{2,})(\/[^\s;,()"']*)?/gi)) {
        const host = m[1];
        // A bare sentence-ending word is not a host; require a known TLD shape
        // and drop trailing sentence punctuation from the path.
        const path = (m[2] || "").replace(/[.,;:'")\]]+$/, "");
        fromShards.push("https://" + host + path);
      }
    }
  }

  const urls = [...new Set([...fromCitations, ...fromCycle, ...fromShards])];
  if (urls.length === 0) {
    console.log("free-access probe: no tracked URLs found in citations.js, sources-cycle.json or data/.");
    return;
  }
  console.log(
    "free-access probe: checking " + urls.length + " unique URL(s) -- " + fromCitations.length +
      " from citations.js across " + TRACKED_HOSTS.length + " tracked hosts, " + fromCycle.length +
      " free_access_url(s) from sources-cycle.json, " + new Set(fromShards).size +
      " from shard free_access strings in data/.",
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

  // --strict exits non-zero when something is ACTUALLY broken, so a scheduled
  // run can go red on a dead link without a publisher's bot wall making it red
  // every month forever. Without the flag this stays advisory, which is why it
  // is outside `npm run lint`: a publisher's outage should not block a release.
  const strict = process.argv.includes("--strict");

  let warnCount = 0;
  let brokenCount = 0;
  for (const r of results) {
    if (r.ok) {
      const note = r.finalUrl && r.finalUrl !== r.url ? " -> " + r.finalUrl : "";
      console.log("OK   " + r.status + " " + r.url + note);
    } else {
      warnCount += 1;
      let detail = r.error ? " (" + r.error + ")" : "";
      let walled = false;
      if (r.soft404) {
        detail = " (SOFT 404: answered " + r.status + " but landed on " + r.finalUrl + ")";
      } else if ((r.status === 403 || r.status === 0) && BOT_WALLED.has(hostOf(r.url))) {
        walled = true;
        detail += " (known bot wall on this host: it 403s any automated fetch. Confirm in a browser" +
          " before treating this as a broken link -- and if the browser also fails, it is real.)";
      }
      if (!walled) brokenCount += 1;
      console.warn("WARN " + (r.status || "ERR") + " " + r.url + detail);
    }
  }
  console.log(
    "free-access probe: " + (results.length - warnCount) + " OK / " + warnCount + " WARN (" +
      brokenCount + " not explained by a known bot wall).",
  );
  if (warnCount > 0) {
    console.log(
      "Append a manual review entry to scripts/sources.md per spec-v10 §3.2.",
    );
  }
  if (strict && brokenCount > 0) {
    console.error(
      "free-access probe --strict: " + brokenCount + " URL(s) look genuinely broken. " +
        "A bot-walled host is annotated above and does not count; anything else is a link a reader " +
        "or a maintainer would follow to nothing. Fix the URL at its source -- citations.js, the " +
        "sources-cycle.json row, or the shard's free_access -- and re-run.",
    );
    process.exitCode = 1;
  }
}

await main();
