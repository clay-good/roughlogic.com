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
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = resolve(ROOT, "data");
const CYCLE_PATH = resolve(ROOT, "scripts", "sources-cycle.json");
const CADENCE_PATH = resolve(ROOT, "scripts", "refresh-cadence.json");
const LEDGER_PATH = resolve(ROOT, "docs", "citation-freshness-ledger.md");

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

  // How long an "acknowledged-stale" re-stamp is good for. The ledger's own
  // words are "a quarterly re-verify action", so a quarter.
  const RESTAMP_MAX_DAYS = 92;

  // spec-v22 §6 (CF-03): a passed `next_expected` demands either a new edition
  // (the row advanced so next_expected is in the future) or an explicit
  // "verified, not yet released" re-stamp via `last_verified` >= next_expected.
  // An un-re-stamped passed date is a freshness blind spot and fails the gate.
  // The gate below fails the moment `next_expected` passes -- which means the
  // build goes red at a UTC midnight with no commit behind it, and whoever is
  // next at the keyboard inherits it as a surprise. That has happened: see the
  // 2026-09-01 CF-03 red. A date this file already knows about should not be
  // able to ambush anyone, so a row whose date is close and whose re-stamp will
  // not cover it warns first, for the whole quarter before it is due.
  const WARN_AHEAD_DAYS = 92;
  for (const s of standards) {
    const next = parseDateLoose(s.next_expected);
    if (next && next >= today) {
      const daysAway = daysBetween(today, next);
      if (daysAway <= WARN_AHEAD_DAYS) {
        const verified = parseDateLoose(s.last_verified);
        // A re-stamp only silences the failure if it is dated on or after the
        // due date AND still inside the re-verify cadence when that date lands.
        const covered = verified && verified >= next && daysBetween(verified, next) <= RESTAMP_MAX_DAYS;
        if (!covered) {
          warnings.push(
            "sources-cycle.json: '" + s.name + "' is due in " + daysAway + " days (" + s.next_expected +
              "), and " + (s.last_verified ? "its re-stamp " + s.last_verified + " will not cover that date" :
                "it carries no 'last_verified' at all") +
              ". Confirm the edition and either advance the row or re-stamp, before the date turns the build red."
          );
        }
      }
      continue; // not yet due
    }
    if (!next) continue;
    const verified = parseDateLoose(s.last_verified);
    if (!verified || verified < next) {
      errors.push(
        "sources-cycle.json: '" + s.name + "' next_expected " + s.next_expected +
          " has passed with no re-stamp. Confirm a new edition (advance the row) or add " +
          "'last_verified' >= next_expected (the 'verified, not yet released' acknowledgement) per spec-v22 CF-03."
      );
      continue;
    }
    // A re-stamp that never expires is a row silenced forever. On 2026-06-05
    // four rows were acknowledged-stale with a "re-verify each quarter" note;
    // three months later nothing had asked again, and two of the three ASHRAE
    // standards had in fact published their 2025 editions while the ledger
    // still called 2022 current. The acknowledgement buys a quarter -- the
    // cadence the ledger itself promises -- not silence. Advance the row on
    // publication, or re-stamp with today's date and say what was checked.
    const age = daysBetween(verified, today);
    if (age > RESTAMP_MAX_DAYS) {
      errors.push(
        "sources-cycle.json: '" + s.name + "' is acknowledged-stale on a re-stamp " + age +
          " days old (" + s.last_verified + "), past the " + RESTAMP_MAX_DAYS +
          "-day re-verify cadence docs/citation-freshness-ledger.md promises. Confirm the current edition " +
          "and either advance the row or re-stamp 'last_verified' with what you checked."
      );
    }
  }

  // spec-v22 §5 / §6 (CF-02): ledger-completeness. Every tracked source must
  // have a row in docs/citation-freshness-ledger.md so a source can never roll
  // past its date unnoticed. The ledger row is keyed by the source `id`.
  // Only required when there are tracked standards to account for (a minimal
  // fixture with no standards has nothing to ledger).
  if (standards.length > 0) {
    if (!existsSync(LEDGER_PATH)) {
      errors.push("docs/citation-freshness-ledger.md not found; spec-v22 §5 requires a ledger row per tracked source.");
    } else {
      const ledger = await readFile(LEDGER_PATH, "utf8");
      for (const s of standards) {
        if (!ledger.includes("`" + s.id + "`")) {
          errors.push("citation-freshness-ledger.md: tracked source '" + s.id + "' (" + s.name + ") has no ledger row (spec-v22 §5 ledger-completeness).");
        }
      }
    }
  }

  // spec-v12 Phase H.2: per-folder refresh cadence. Falls back to the
  // legacy flat 365-day staleness window if a folder is not in the map.
  let cadenceByFolder = {};
  if (existsSync(CADENCE_PATH)) {
    const cadence = JSON.parse(await readFile(CADENCE_PATH, "utf8"));
    for (const row of cadence.folders || []) {
      if (row && typeof row.folder === "string" && Number.isFinite(row.max_age_days)) {
        cadenceByFolder[row.folder] = { max_age_days: row.max_age_days, cadence: row.cadence };
      }
    }
  }

  const folders = (await readdir(DATA, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  // Surface any folder on disk that is not in the cadence map (so a new
  // shard added without a cadence entry is noticed at lint time rather
  // than getting the legacy 365-day fallback silently).
  for (const folder of folders) {
    if (!cadenceByFolder[folder] && existsSync(resolve(DATA, folder, "manifest.json"))) {
      warnings.push(
        "data/" + folder + "/manifest.json: no entry in scripts/refresh-cadence.json. " +
          "Falling back to legacy 365-day staleness window. Add a row to refresh-cadence.json " +
          "naming the folder's cadence per spec-v12 §H.2."
      );
    }
  }

  // Collected for the CF-06 reachability check below: a tracked standard has to
  // appear in at least one of these to be checked at all.
  const manifestEditions = [];

  for (const folder of folders) {
    const manifestPath = resolve(DATA, folder, "manifest.json");
    if (!existsSync(manifestPath)) continue;
    const m = JSON.parse(await readFile(manifestPath, "utf8"));
    const where = "data/" + folder + "/manifest.json";
    if (typeof m.edition === "string") manifestEditions.push(m.edition);

    if (!m.edition || typeof m.edition !== "string" || m.edition.length === 0) {
      errors.push(where + ": missing 'edition' string.");
      continue;
    }
    if (!isIsoDate(m.asOf)) {
      errors.push(where + ": missing or invalid 'asOf' ISO date.");
      continue;
    }

    // spec-v12 §H.2: inline refresh_cadence on the manifest must match the
    // central scripts/refresh-cadence.json row. The inline field is the
    // user-facing stamp; the central file remains the schema source.
    if (cadenceByFolder[folder]) {
      const expected = cadenceByFolder[folder].cadence;
      if (!m.refresh_cadence) {
        errors.push(
          where +
            ": missing 'refresh_cadence' field. Per spec-v12 §H.2 every manifest inlines the cadence (" +
            expected +
            " for this folder)."
        );
      } else if (m.refresh_cadence !== expected) {
        errors.push(
          where +
            ": 'refresh_cadence' = '" +
            m.refresh_cadence +
            "' does not match scripts/refresh-cadence.json ('" +
            expected +
            "'). Keep the inline stamp in sync with the central schema."
        );
      }
    }

    // spec-v12 Phase H.2: per-folder cadence-aware staleness window.
    // Replaces the flat 365-day rule with 2*cadence so a single missed
    // refresh window does not noise the lint. A folder without a cadence
    // entry warns above and falls back to 365 days.
    const cadenceInfo = cadenceByFolder[folder];
    const maxAgeDays = cadenceInfo ? cadenceInfo.max_age_days : 365;
    const asOf = parseDateLoose(m.asOf);
    if (asOf && daysBetween(asOf, today) > maxAgeDays) {
      const cadenceLabel = cadenceInfo ? cadenceInfo.cadence : "default-365d";
      warnings.push(
        where +
          ": 'asOf' " +
          m.asOf +
          " is more than " +
          maxAgeDays +
          " days old (" +
          daysBetween(asOf, today) +
          " days; cadence " +
          cadenceLabel +
          "). Refresh per spec-v6 §6 / spec-v12 §H.2."
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

  // A citation may not tell the reader it is using "the current tax year" or
  // "the current fiscal year" over a table that is fixed at build time. The
  // mileage tile said exactly that while data/crosswalks/irs-mileage.json
  // carried the 2024 rate and the crosswalks manifest recorded it as "IRS 2024
  // standard mileage rate" -- two statements in one repo, one of them false, on
  // a page a reader could take a reimbursement figure off. The per-diem tile
  // said "current fiscal year" over an FY2026 table that stops being current on
  // 2026-10-01 without a character changing.
  //
  // A fixed table has to name its year. "Current" is only honest where the
  // value is computed, not bundled.
  // Deliberately narrow, after a first cut that over-reported four ways.
  //
  //   - Only a CALENDAR period -- "current tax year", "current fiscal year",
  //     "current year". "current edition" is a publication that rolls on its
  //     own cycle, which is what sources-cycle.json and CF-03 above are for,
  //     and the MACRS tables it covers are statutory rather than annual.
  //   - Not a DIRECTIVE. "See irs.gov/forms-pubs for the current edition" tells
  //     the reader where to find it; that is the opposite of claiming the
  //     bundled copy is it.
  //   - Not where the citation also names a year, which is disclosure.
  // Loaded here, not at module scope: this script is copied into a bare fixture
  // root by its own unit tests, where citations.js does not exist and a
  // top-level import would kill it before any manifest is read. Missing is
  // reported rather than skipped silently -- a check that quietly stops running
  // is the thing the rest of this file exists to prevent.
  let CITATIONS = null;
  try {
    ({ CITATIONS } = await import(pathToFileURL(resolve(ROOT, "citations.js")).href));
  } catch {
    warnings.push("citations.js was not readable from " + ROOT + "; the edition-currency check did not run.");
  }
  const CURRENCY_CLAIM = /\bcurrent\s+(tax\s+year|fiscal\s+year|year)\b/i;
  const DIRECTIVE = /\b(see|at|from|check)\b[^.]*\bcurrent\s+(tax\s+year|fiscal\s+year|year)\b/i;
  for (const [id, entry] of Object.entries(CITATIONS || {})) {
    // `edition` only. `editionNote` is where the reasoning lives, including
    // sentences about this very rule, and holding it to the rule would forbid
    // explaining the rule.
    const text = entry && entry.edition;
    if (typeof text !== "string") continue;
    if (!CURRENCY_CLAIM.test(text)) continue;
    if (DIRECTIVE.test(text)) continue;
    if (/\b(19|20)\d{2}\b/.test(text)) continue; // names a year as well; that is disclosure, not a claim
    errors.push(
      "citations.js: '" + id + "' edition claims " + JSON.stringify(text) +
        ". A bundled table cannot promise it is current -- name the year or fiscal year it ships " +
        "(the manifest already records it), or the page is wrong the day the source updates."
    );
  }

  // CF-06 (2026-09-03): a tracked standard whose match_terms hit no manifest
  // edition is INERT. The staleness loop above only ever reads manifest
  // `edition` strings, so such a row sits in the ledger looking like coverage
  // and checks nothing. Six of thirteen were in that state, and they were the
  // most-cited standards on the site: IMC (54 citation-side mentions), the FDA
  // Food Code (62), the AASHTO Green Book (80), ASHRAE 90.1 (29). Four of them
  // were citing a superseded edition with no manifest disclosure at all --
  // "IMC 2021 Section 603", "ASHRAE 62.2-2019", "IFC 2021 Table B105.1" --
  // while the identical situation for IPC / IFGC / IRC / IBC was disclosed.
  // A reader of a plumbing tile was told the current edition is newer; a reader
  // of an HVAC tile was not.
  //
  // So a row must be reachable, or say why it is not. `citation_only: true`
  // with a reason is the escape hatch, for a standard the site cites but no
  // bundled shard holds data from -- there is no manifest for it to appear in,
  // and pretending otherwise would mean editing an edition string to satisfy a
  // gate rather than to inform a reader.
  for (const s of standards) {
    const reachable = (s.match_terms || []).some((t) =>
      manifestEditions.some((e) => e.includes(t)),
    );
    if (reachable) continue;
    if (s.citation_only) {
      if (!s.citation_only_reason) {
        errors.push(
          "sources-cycle.json: '" + (s.name || s.id) + "' is marked citation_only " +
            "but carries no citation_only_reason. Say why no manifest names it.",
        );
      }
      continue;
    }
    errors.push(
      "sources-cycle.json: '" + (s.name || s.id) + "' matches no manifest 'edition' string " +
        "(match_terms " + JSON.stringify(s.match_terms || []) + "), so the edition-staleness " +
        "check above never runs for it -- the row looks like coverage and checks nothing. " +
        "Either name the edition in the manifest of the folder whose data it governs, or set " +
        "citation_only: true with a citation_only_reason.",
    );
  }

  // CF-07 (2026-09-03): a manifest that names a tracked standard must name that
  // standard's CURRENT edition, not just some edition. CF-03 above warns about
  // this only once a full cycle has elapsed, which for a code on a three-year
  // cycle means a manifest can advertise a superseded "current published
  // edition" for three years.
  //
  // That is not hypothetical either. The hvac and fire manifests gained their
  // disclosures on the morning of 2026-09-03 saying IMC 2024 and IFGC 2024 were
  // current; ICC's own Digital Codes site published the 2027 IMC and 2027 IFGC,
  // and the sentence was stale by that afternoon. Nothing tied the disclosure
  // to the ledger, so nothing noticed. All 11 manifest/standard pairs satisfy
  // this today, so it lands as a hard error with no backlog.
  for (const folderEdition of manifestEditions) {
    for (const s of standards) {
      if (!(s.match_terms || []).some((t) => folderEdition.includes(t))) continue;
      if (!s.current_edition) continue;
      if (folderEdition.includes(String(s.current_edition))) continue;
      errors.push(
        "a data manifest names '" + (s.name || s.id) + "' but not its current edition '" +
          s.current_edition + "'. A manifest that discloses which edition it bundles has to " +
          "name the one it is behind, or the disclosure goes stale the day the publisher moves.",
      );
    }
  }

  // CF-04 (2026-09-02): the bundled federal dollar figures that reprice every
  // year on a known calendar. The standards rows above track EDITIONS; nothing
  // tracked these, and on one day five of them were wrong -- the IRS mileage
  // rate two tax years old, Section 179 and bonus depreciation still on a
  // repealed statute, the SSA wage base $900 low, the FHFA/HUD loan limits a
  // whole cycle behind under a `year: 2026` stamp, and the GSA M&IE tiers three
  // fiscal years behind. Each shard carried a recent `verified_on`. A stamped
  // verification date is not evidence anything was verified, so ask the calendar
  // instead: when did the publisher last speak, and was the value looked at
  // after that?
  //
  // Warns from the publication date and fails only once a SECOND publication has
  // come and gone, so a row is a full cycle behind before it can turn the build
  // red -- a date this file already knows about should not ambush anyone at a
  // UTC midnight, the same reasoning CF-03 carries above.
  const annual = cycle.annual_figures || [];
  if (annual.length === 0) {
    warnings.push("sources-cycle.json carries no 'annual_figures' rows; the annual-figure recheck calendar is not being applied.");
  }
  for (const f of annual) {
    const month = Number(f.publishes_month);
    if (!(month >= 1 && month <= 12)) {
      errors.push("sources-cycle.json: annual figure '" + (f.id || "?") + "' has no valid publishes_month.");
      continue;
    }
    const verified = parseDateLoose(f.last_verified);
    if (!verified) {
      errors.push("sources-cycle.json: annual figure '" + (f.name || f.id) + "' carries no 'last_verified'.");
      continue;
    }
    // Most recent publication on or before today, and the one before that.
    let lastPub = new Date(Date.UTC(today.getUTCFullYear(), month - 1, 1));
    if (lastPub > today) lastPub = new Date(Date.UTC(today.getUTCFullYear() - 1, month - 1, 1));
    const priorPub = new Date(Date.UTC(lastPub.getUTCFullYear() - 1, month - 1, 1));
    const iso = (d) => d.toISOString().slice(0, 10);
    if (verified < priorPub) {
      errors.push(
        "sources-cycle.json: '" + (f.name || f.id) + "' has published twice (" + iso(priorPub) + ", " +
          iso(lastPub) + ") since it was last verified " + f.last_verified + ". The bundled value in " +
          (f.where || "its shard") + " is at least a full cycle behind; re-verify against " +
          (f.publisher || "the publisher") + " and re-stamp."
      );
      continue;
    }
    if (verified < lastPub) {
      warnings.push(
        "sources-cycle.json: '" + (f.name || f.id) + "' published its current figures around " + iso(lastPub) +
          "; the bundled value was last verified " + f.last_verified + ". Re-verify against " +
          (f.publisher || "the publisher") + " and re-stamp before it turns the build red."
      );
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
