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
//   2. Posture weakening: someone relaxes script-src for anything beyond the
//      one reviewed Turnstile origin, or connect-src for an external API,
//      quietly expanding the reporting exception into general network access.
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
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

// Pull the `content="..."` of the <meta http-equiv="Content-Security-Policy">.
// The content is double-quoted and the CSP itself uses single quotes
// ('self', 'sha256-...'), so capture everything up to the closing ".
function metaCsp(html) {
  const m = html.match(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content="([^"]+)"/i);
  return m ? m[1] : null;
}

// The edge security headers docs/threat-model.md commits to, with the values it
// commits to. Kept beside the CSP check because they are the same posture and
// the same hand-maintained file.
const REQUIRED_EDGE_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()",
  "X-DNS-Prefetch-Control": "off",
};

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

function isAllowedReportingOrigin(dir, tok) {
  return tok === TURNSTILE_ORIGIN && (dir === "script-src" || dir === "frame-src");
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

  // The CSP is not the only security header _headers carries, and it was the
  // only one anything checked. docs/threat-model.md commits to the rest by name
  // -- "Referrer-Policy: no-referrer", "X-Frame-Options: DENY", a
  // Permissions-Policy that disables camera, microphone, geolocation, payment,
  // USB and accelerometer -- and deployment.md and the launch checklist repeat
  // them. A documented control nothing asserts is a control until someone edits
  // the file.
  //
  // Exact values, not merely presence: `X-Frame-Options: SAMEORIGIN` would pass
  // a presence check while granting exactly what the threat model refuses.
  for (const [name, value] of Object.entries(REQUIRED_EDGE_HEADERS)) {
    const line = headers.match(new RegExp("^\\s*" + name + ":\\s*(.+)$", "mi"));
    if (!line) {
      errors.push(`_headers: no ${name} line. docs/threat-model.md commits to it.`);
    } else if (line[1].trim() !== value) {
      errors.push(`_headers: ${name} is "${line[1].trim()}", expected "${value}" (docs/threat-model.md).`);
    }
  }

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
      // 2b. script-src is self + the hash + the exact Turnstile host. The
      // report client loads it only after an intentional click.
      for (const tok of scriptSrc) {
        if (tok === "'self'" || tok === TURNSTILE_ORIGIN || /^'sha256-/.test(tok)) continue;
        errors.push(`${label}: script-src carries a disallowed token '${tok}' (only 'self', Turnstile, and the boot-script sha256 are allowed).`);
      }
    }

    const frameSrc = dirs["frame-src"] || [];
    if (JSON.stringify(frameSrc) !== JSON.stringify([TURNSTILE_ORIGIN])) {
      errors.push(`${label}: frame-src must be exactly ${TURNSTILE_ORIGIN} for the report dialog (got ${JSON.stringify(frameSrc)}).`);
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
        if (isExternalOrigin(tok) && !isAllowedReportingOrigin(dir, tok)) {
          errors.push(`${label}: ${dir} references an external origin '${tok}' -- the CSP must stay self-only (no CDN, font host, analytics, or API).`);
        }
      }
    }
  }

  // docs/threat-model.md T3 transcribes the CSP for a reader auditing the
  // site. That transcription said `script-src 'self'` alone and named no
  // frame-src for the three months after the Turnstile exception landed, so a
  // reviewer reading it concluded the site permits no third-party script.
  // Assert every directive the live policy carries, and every external origin
  // in it, is named in that document -- prose stays prose, but nothing in the
  // policy can go unmentioned.
  const threat = await readFile(resolve(ROOT, "docs", "threat-model.md"), "utf8");
  for (const [dir, toks] of Object.entries(cspHeader ? parseCsp(cspHeader) : {})) {
    if (dir === "report-uri" || dir === "report-to") continue;
    if (!threat.includes("`" + dir + " ") && !threat.includes("`" + dir + "`")) {
      errors.push(
        "docs/threat-model.md does not name the `" + dir + "` directive that _headers sets. " +
        "A CSP a reader cannot see in the threat model is a control they cannot audit.");
    }
    for (const tok of toks) {
      if (!isExternalOrigin(tok) || tok.startsWith("'")) continue;
      if (!threat.includes(tok)) {
        errors.push(
          "docs/threat-model.md does not name the external origin " + tok + " that _headers allows in " +
          dir + ". Every third party the policy admits has to be visible in the threat model.");
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
    Object.keys(REQUIRED_EDGE_HEADERS).length + " edge security headers match docs/threat-model.md; " +
    "default-src / connect-src / object-src locked to self/none; only the reviewed Turnstile script/frame origin is external; " +
    "and every directive and external origin in the live policy is named in docs/threat-model.md.",
  );
}

main().catch((e) => {
  console.error("check-csp: unexpected error", e);
  process.exit(1);
});
