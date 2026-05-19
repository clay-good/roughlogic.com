#!/usr/bin/env node
// spec-v14 §12 Phase H audit-trail lint (scaffolding).
//
// Walks docs/audit-trail.md and asserts every active non-exempt group
// (A through Y minus the I-letter skip in the catalog, minus H and Q
// which are reference-only and exempt per spec-v14 §12.1) appears
// either in a completed review section or in the open-solicitations
// block. The lint is the per-group coverage gate the v14 close-out
// names in §17 launch gate 8.
//
// Behavior:
//   FAIL (exit 1):
//     - docs/audit-trail.md missing or unreadable.
//     - A group surfaces in CITATIONS/TOOLS but is not in either the
//       exempt list (H, Q), the open-solicitations block, or a
//       completed review section.
//   WARN (does not fail; scaffolding):
//     - A group appears only in the open-solicitations block (no
//       completed review yet). This is the current state for most
//       groups at the v14 close-out; the warning graduates to error
//       once spec-v14 §17 launch gate 8 closes.
//     - A completed review is more than 100 days old (the v6 quarterly
//       cadence is 90 days; 100 days is the grace window per
//       spec-v14 §18.3).
//
// Pure read-and-report; no network, no mutation. Wired into
// `npm run lint`.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP_JS = resolve(ROOT, "app.js");
const AUDIT_TRAIL = resolve(ROOT, "docs", "audit-trail.md");

// Per spec-v14 §12.1: H References and Q Historical are exempt
// (reference-only tiles use the v6 source-stamp recheck cadence
// instead of a per-group review). Every other active group needs
// either a completed review or an open solicitation.
const EXEMPT_GROUPS = new Set(["H", "Q"]);

async function loadActiveGroups() {
  // Extract every distinct `group: "X"` token from app.js.
  const text = await readFile(APP_JS, "utf8");
  const groups = new Set();
  for (const m of text.matchAll(/\bgroup:\s*"([A-Z])"/g)) groups.add(m[1]);
  return groups;
}

async function main() {
  const activeGroups = await loadActiveGroups();
  const auditText = await readFile(AUDIT_TRAIL, "utf8");

  // Per-group surfaces. A group `G` is "named in audit-trail" if any
  // of these patterns appears:
  //   - `Group G ` (the standalone form),
  //   - `, G <CapName>` (the compact comma-list form the v0.14
  //     credential list uses: `Group A Electrical, B Plumbing, ...`),
  //   - `Group G (` (the parenthesized-name form).
  // The credential-list under the v0.14 open-solicitations header
  // carries every group name; a completed-review section would
  // reference the group letter explicitly per the spec-v10 §I.3
  // template.
  const namedInAuditTrail = new Set();
  for (const g of activeGroups) {
    const patterns = [
      new RegExp("\\bGroup\\s" + g + "\\b"),
      new RegExp("\\bGroup\\s" + g + "\\s*\\("),
      new RegExp(",\\s*" + g + "\\s+[A-Z][a-zA-Z]+"),
    ];
    if (patterns.some((p) => p.test(auditText))) namedInAuditTrail.add(g);
  }

  // Detect completed reviews by looking for a YYYY-MM-DD dated header
  // under the 2026+ year sections (we ignore the "Open solicitations"
  // and "Template" subsections). The completed-review pattern per the
  // §I.3 template is `### YYYY-MM-DD <reviewer>` or similar; we
  // approximate by counting `### ` headers under `## 20YY` that do
  // not contain the word "Open solicitations" or "Template".
  const completedReviews = [];
  const yearSections = auditText.split(/^## (?=20\d{2}$)/m).slice(1);
  for (const section of yearSections) {
    for (const m of section.matchAll(/^###\s+(.+)$/gm)) {
      const header = m[1].trim();
      if (header.startsWith("Open solicitations")) continue;
      if (header.startsWith("Template")) continue;
      completedReviews.push(header);
    }
  }

  const errors = [];
  const warnings = [];

  for (const g of activeGroups) {
    if (EXEMPT_GROUPS.has(g)) continue;
    if (!namedInAuditTrail.has(g)) {
      errors.push(
        "active group '" + g + "' is not named in docs/audit-trail.md " +
        "(neither in the v0.14 open-solicitations block nor in any " +
        "completed review section); spec-v14 §12 requires per-group coverage.",
      );
    }
  }

  console.log(
    "audit-trail: " + activeGroups.size + " active group(s); " +
    [...activeGroups].filter((g) => !EXEMPT_GROUPS.has(g)).length + " non-exempt; " +
    namedInAuditTrail.size + " named in audit-trail; " +
    completedReviews.length + " completed-review section(s).",
  );

  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error(
      "v14 audit-trail lint FAILED with " + errors.length + " missing group(s).",
    );
    process.exit(1);
  }
  // Scaffolding: every non-exempt active group appears in the v14
  // open-solicitations block (the spec-v14 §12 close-out seeds the
  // table with the credential list); the per-group completed-review
  // status is tracked by maintainers in audit-trail.md, not by this
  // lint. The lint upgrades to "warn if no completed review within
  // 100 days" once spec-v14 §17 launch gate 8 closes.
  console.log(
    "v14 audit-trail lint OK (every non-exempt group named; per-group completed-review " +
    "tracking lands with spec-v14 §17 launch gate 8 closeout).",
  );
}

await main();
