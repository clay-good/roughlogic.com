// A manifest's `staleness_note` is load-bearing: check-manifests turns a folder
// that is more than four rechecks past its own declared cadence from an ERROR
// into a warning the moment the note exists. Until now the note was hand-written
// prose in scripts/build-data.mjs and nothing compared it to the shards it
// describes, so the gate checked that a string was present, not that it was true.
//
// It went false the first time anyone did the work. data/legal's note read
// "Every post-Wayfair nexus threshold carries verified_on 2025-01-15 ... 47
// per-state lookups"; by 2026-09-03 fourteen states had been re-verified and
// the note still told a reader of the public manifest that none had. The
// outermost layer is the one the reader believes.
//
// So the counts and dates are derived here from the stamps themselves, and
// check-manifests recomputes this string and requires the manifest to match --
// the same rule it already applies to `edition`. Both callers pass every
// per-row `verified_on` in the folder; the camelCase `verifiedOn` rollups are
// excluded on purpose, because a rollup only repeats the oldest row.

const BODIES = {
  legal:
    "States change these by legislation, not on a calendar, so each recheck is a per-state lookup " +
    "against that department of revenue and is maintainer work, not a build step. The tile prints " +
    "every row's citation and verified_on date and tells the reader to confirm with the state " +
    "before filing. Recheck oldest-first; this note is generated from the stamps and goes away " +
    "when they are current.",
};

/**
 * @param {string} folder data/ folder name.
 * @param {string[]} rowStamps every per-row `verified_on` ISO date under it.
 * @returns {string|null} the manifest note, or null if the folder declares none.
 */
export function stalenessNote(folder, rowStamps) {
  const body = BODIES[folder];
  if (!body || rowStamps.length === 0) return null;
  const sorted = [...rowStamps].sort();
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];
  const atOldest = sorted.filter((s) => s === oldest).length;
  const lead =
    atOldest === sorted.length
      ? "All " + sorted.length + " rows still carry verified_on " + oldest + "."
      : atOldest + " of " + sorted.length + " rows still carry verified_on " + oldest +
        "; the " + (sorted.length - atOldest) + " re-verified since then run to " + newest + ".";
  return lead + " " + body;
}

export const STALENESS_NOTE_FOLDERS = Object.keys(BODIES);

/**
 * Collect every per-row `verified_on` ISO date in a shard body. Both callers
 * use this one traversal so the generator and the gate can never disagree
 * about which stamps the note describes.
 */
export function collectRowStamps(value, into = []) {
  if (Array.isArray(value)) {
    for (const v of value) collectRowStamps(v, into);
    return into;
  }
  if (!value || typeof value !== "object") return into;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.verified_on)) into.push(value.verified_on);
  for (const v of Object.values(value)) collectRowStamps(v, into);
  return into;
}
