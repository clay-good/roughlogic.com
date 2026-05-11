#!/usr/bin/env node
// v10 Phase A.1 citation-freshness lint (spec-v10.md §3.1).
//
// Reads:
//   - data/<folder>/manifest.json `edition` and `asOf` fields.
//   - scripts/sources-cycle.json: per-standard current edition, cycle in
//     years, next-expected release, and (for date-bounded models like the
//     NOAA World Magnetic Model) the expiration date.
//
// Behavior:
//   WARN (does not fail):
//     - A manifest's `edition` string mentions a tracked standard but does
//       not contain that standard's current_edition token; emit when the
//       gap between current_release and today is more than one full
//       cycle_years.
//     - A manifest's `asOf` is more than 365 days old.
//     - A WMM (or other date-bounded model) bundle is within 6 months of
//       its expiration date.
//   FAIL (exit 1):
//     - Any manifest is missing `edition` or `asOf` (this is also caught
//       by check-manifests.mjs; we surface it here for completeness so
//       running this lint alone is meaningful).
//     - A WMM (or other date-bounded model) bundle is past its
//       expiration date.
//
// Pure read-and-report; no network, no mutation.
//
// CI integration: invoked by `npm run lint` after check-manifests.

import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = resolve(ROOT, "data");
const CYCLE_PATH = resolve(ROOT, "scripts", "sources-cycle.json");

const errors = [];
const warnings = [];

function isIsoDate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function parseDateLoose(s) {
  // Accepts YYYY-MM-DD or YYYY-MM. Returns Date at first of month/day UTC.
  if (!s) return null;
  const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m1) return new Date(Date.UTC(+m1[1], +m1[2] - 1, +m1[3]));
  const m2 = /^(\d{4})-(\d{2})$/.exec(s);
  if (m2) return new Date(Date.UTC(+m2[1], +m2[2] - 1, 1));
  return null;
}

async function main() {
  if (!existsSync(CYCLE_PATH)) {
    console.error("ERROR: scripts/sources-cycle.json not found.");
    process.exit(1);
  }
  const cycle = JSON.parse(await readFile(CYCLE_PATH, "utf8"));
  const standards = cycle.standards || [];
  const today = new Date();

  const folders = (await readdir(DATA, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const folder of folders) {
    const manifestPath = resolve(DATA, folder, "manifest.json");
    if (!existsSync(manifestPath)) continue;
    const m = JSON.parse(await readFile(manifestPath, "utf8"));
    const where = "data/" + folder + "/manifest.json";

    if (!m.edition || typeof m.edition !== "string" || m.edition.length === 0) {
      errors.push(where + ": missing 'edition' string.");
      continue;
    }
    if (!isIsoDate(m.asOf)) {
      errors.push(where + ": missing or invalid 'asOf' ISO date.");
      continue;
    }

    // asOf staleness (>365d).
    const asOf = parseDateLoose(m.asOf);
    if (asOf && daysBetween(asOf, today) > 365) {
      warnings.push(
        where +
          ": 'asOf' " +
          m.asOf +
          " is more than 365 days old (" +
          daysBetween(asOf, today) +
          " days). Refresh per spec-v6 §6 quarterly recheck cadence."
      );
    }

    // Edition staleness against tracked standards.
    for (const s of standards) {
      const matched = (s.match_terms || []).some((t) => m.edition.includes(t));
      if (!matched) continue;
      const carriesCurrent = m.edition.includes(s.current_edition);
      const released = parseDateLoose(s.current_release);
      if (!carriesCurrent && released) {
        const ageDays = daysBetween(released, today);
        const cycleDays = (s.cycle_years || 3) * 365;
        if (ageDays > cycleDays) {
          warnings.push(
            where +
              ": references '" +
              s.name +
              "' but does not name current edition '" +
              s.current_edition +
              "' (released " +
              s.current_release +
              ", cycle " +
              s.cycle_years +
              "y). Consider rolling per docs/edition-rollover.md."
          );
        }
      }

      // Date-bounded model expiration (WMM-style). Always check, even if
      // the manifest already names the current edition; an expired bundle
      // must be replaced.
      if (s.expires_on) {
        const expires = parseDateLoose(s.expires_on);
        if (expires) {
          const daysToExpiry = daysBetween(today, expires);
          if (daysToExpiry < 0) {
            errors.push(
              where +
                ": cites '" +
                s.name +
                "' coefficient bundle past expiration (" +
                s.expires_on +
                "). Bundle must be replaced before release."
            );
          } else if (daysToExpiry < 183) {
            warnings.push(
              where +
                ": '" +
                s.name +
                "' bundle expires in " +
                daysToExpiry +
                " days (" +
                s.expires_on +
                "). Plan refresh."
            );
          }
        }
      }
    }
  }

  for (const w of warnings) console.warn("WARN: " + w);
  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error(
      "v10 citation-freshness lint FAILED with " + errors.length + " errors (" + warnings.length + " warnings)."
    );
    process.exit(1);
  }
  console.log(
    "v10 citation-freshness lint OK (" + warnings.length + " warnings, 0 errors)."
  );
}

await main();
