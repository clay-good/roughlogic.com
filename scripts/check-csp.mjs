#!/usr/bin/env node
// spec-v48: Content-Security-Policy integrity gate.
//
// The CSP is the runtime mechanism behind the headline promise -- "0
// trackers, 0 LLM calls, works offline." It locks every resource to
// 'self' and pins the one inline boot script by sha256. That hash is
// maintained BY HAND in two places (the <meta> CSP in index.html and the
// edge `Content-Security-Policy` line in _headers), per the comment above
// the boot script. Two silent-failure modes this gate closes:
//
//   1. Hash drift: edit the boot script, forget to recompute the sha256.
//      The <meta> CSP would block the boot script -- but only a flash of
//      un-themed paint, easy to miss -- and the edge _headers CSP is not
//      exercised by the local Playwright suite at all (those headers only
//      apply at the Cloudflare edge), so a drift there ships silently.
//   2. Posture weakening: someone relaxes script-src to allow a CDN, or
//      connect-src to allow an external API, quietly breaking the
//      no-external-network guarantee.
//
// This gate recomputes the boot-script hash and asserts BOTH CSPs carry
// it, and that the security-critical directives stay locked to 'self'
// with no external origin. Deterministic, offline, no build needed, so
// it runs in the `npm run lint` chain.
//
// Standalone Node 20 script using only built-ins. Reads files; does not
// run the build.

import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Pull the `content="..."` of the <meta http-equiv="Content-Security-Policy">.
// The content is double-quoted and the CSP itself uses single quotes
// ('self', 'sha256-...'), so capture everything up to the closing ".
function metaCsp(html) {
  const m = html.match(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content="([^"]+)"/i);
  return m ? m[1] : null;
}

// Pull the `Content-Security-Policy:` value from the _headers file.
function headerCsp(text) {
  const m = text.match(/Content-Security-Policy:\s*(.+)/i);
  return m ? m[1].trim() : null;
}

// Pull the `"Content-Security-Policy": "..."` value the local dev server
// (scripts/dev.mjs) sends. It is meant to mirror the edge _headers CSP so
// local Playwright runs see the same policy production does; if the boot
// hash is dropped here the two CSPs combine and block the boot script.
function devCsp(text) {
  const m = text.match(/"Content-Security-Policy":\s*"([^"]+)"/);
  return m ? m[1].trim() : null;
}

// Split a CSP string into a { directive: [tokens] } map.
function parseCsp(csp) {
  const out = {};
  for (const part of csp.split(";")) {
    const toks = part.trim().split(/\s+/).filter(Boolean);
    if (toks.length === 0) continue;
    out[toks[0]] = toks.slice(1);
  }
  return out;
}

// A token is "external" if it names a host or scheme rather than a CSP
// keyword ('self' / 'none' / 'unsafe-*'), a data: URI, or a sha/nonce hash.
function isExternalOrigin(tok) {
  if (/^'(self|none|unsafe-inline|unsafe-eval|strict-dynamic)'$/.test(tok)) return false;
  if (/^'(sha256|sha384|sha512|nonce)-/.test(tok)) return false;
  if (tok === "data:" || tok === "blob:" || tok === "mediastream:") return false;
  return true; // anything else (a host, http(s):, *, a wildcard domain) is external
}

async function main() {
  const errors = [];
  const html = await readFile(resolve(ROOT, "index.html"), "utf8");
  const headers = await readFile(resolve(ROOT, "_headers"), "utf8");
  const dev = await readFile(resolve(ROOT, "scripts/dev.mjs"), "utf8");

  // 1. Exactly one bare inline <script> (the boot script). Strip HTML
  // comments first -- one of them literally contains the text "<script>".
  const noComments = html.replace(/<!--[\s\S]*?-->/g, "");
  const inline = [...noComments.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (inline.length !== 1) {
    errors.push(`expected exactly 1 bare inline <script> (the hashed boot script) in index.html, found ${inline.length}. If you added another, hash it and add it to the CSP and to this gate.`);
  }
  const expected = inline.length === 1
    ? "'sha256-" + createHash("sha256").update(inline[0], "utf8").digest("base64") + "'"
    : null;

  const cspMeta = metaCsp(html);
  const cspHeader = headerCsp(headers);
  const cspDev = devCsp(dev);
  if (!cspMeta) errors.push("no <meta http-equiv=\"Content-Security-Policy\"> found in index.html.");
  if (!cspHeader) errors.push("no Content-Security-Policy line found in _headers.");
  if (!cspDev) errors.push("no Content-Security-Policy header found in scripts/dev.mjs.");

  for (const [label, csp] of [["index.html <meta>", cspMeta], ["_headers", cspHeader], ["scripts/dev.mjs", cspDev]]) {
    if (!csp) continue;
    const dirs = parseCsp(csp);

    // 2. The boot-script hash is present in script-src in both files.
    if (expected) {
      const scriptSrc = dirs["script-src"] || [];
      if (!scriptSrc.includes(expected)) {
        errors.push(`${label}: script-src does not carry the current boot-script hash ${expected}. Recompute it (sha256 of the inline <script>) and update BOTH index.html and _headers.`);
      }
      // 2b. script-src must be exactly 'self' + the hash -- no host, no 'unsafe-inline'/'unsafe-eval'.
      for (const tok of scriptSrc) {
        if (tok === "'self'" || /^'sha256-/.test(tok)) continue;
        errors.push(`${label}: script-src carries a disallowed token '${tok}' (only 'self' and the boot-script sha256 are allowed).`);
      }
    }

    // 3. The locked-down directives behind "0 trackers / works offline".
    for (const dir of ["default-src", "connect-src", "object-src"]) {
      if (!dirs[dir]) { errors.push(`${label}: missing ${dir} directive.`); continue; }
    }
    if (dirs["default-src"] && JSON.stringify(dirs["default-src"]) !== JSON.stringify(["'self'"])) {
      errors.push(`${label}: default-src must be exactly 'self' (got ${JSON.stringify(dirs["default-src"])}).`);
    }
    if (dirs["connect-src"] && JSON.stringify(dirs["connect-src"]) !== JSON.stringify(["'self'"])) {
      errors.push(`${label}: connect-src must be exactly 'self' to keep the no-external-network promise (got ${JSON.stringify(dirs["connect-src"])}).`);
    }
    if (dirs["object-src"] && JSON.stringify(dirs["object-src"]) !== JSON.stringify(["'none'"])) {
      errors.push(`${label}: object-src must be exactly 'none' (got ${JSON.stringify(dirs["object-src"])}).`);
    }

    // 4. No external origin in ANY directive (only keywords / data: / hashes).
    for (const [dir, toks] of Object.entries(dirs)) {
      for (const tok of toks) {
        if (isExternalOrigin(tok)) {
          errors.push(`${label}: ${dir} references an external origin '${tok}' -- the CSP must stay self-only (no CDN, font host, analytics, or API).`);
        }
      }
    }
  }

  if (errors.length) {
    console.error("check-csp FAILED:");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(
    "check-csp OK: boot-script sha256 " + expected + " matches script-src in index.html <meta>, _headers, and scripts/dev.mjs; " +
    "default-src / connect-src / object-src locked to self/none; no external origin in any directive.",
  );
}

main().catch((e) => {
  console.error("check-csp: unexpected error", e);
  process.exit(1);
});
