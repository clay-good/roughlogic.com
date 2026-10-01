// The v6 prose-lint's cap and its exemption list, split out of build-data.mjs
// so a test can hold the list to the shards on disk without importing a script
// whose last line is `await buildAll()`.
//
// An exemption is a standing permission for one key to hold unbounded text.
// Four of them named keys that appear in no shard at all -- `summary`,
// `summaries`, `partial_payment_rule`, `self_help_warning` -- so they granted
// permission to nothing and would have granted it silently to whatever claimed
// those names later. test/unit/prose-lint-exemptions.test.js now fails when an
// exempt key is absent from every shard.

export const PROSE_LINT_THRESHOLD = 140;
// Keys whose values are intentionally narrative (original plain-English
// summaries, attribution / source / notes lines) and therefore exempt from
// the prose-length cap. Keep this list small; the default is to lint.
// Folders knowingly past the refresh_cadence they declare. check-manifests warns
// from one cadence period and fails at four unless the manifest says why, so a
// row here is a promise being kept honestly rather than quietly broken.
// The note's counts and dates are derived from the shard stamps in
// scripts/staleness-notes.mjs, not asserted here. The hand-written version went
// false the day the first fourteen states were re-verified and kept telling
// readers of the public manifest that none had been. check-manifests recomputes
// the same string and requires the manifest to match.

export const PROSE_LINT_EXEMPT_KEYS = new Set([
  "source", "license", "notes", "attribution", "description",
  "edition",
  // A disclosure that qualifies the value sitting next to it, in the same
  // category as `notes` and `attribution`: the 2025 Section 179 row has to
  // carry the OBBBA acquisition-date window, because the single bonus_pct
  // beside it is wrong for property placed in service before 2025-01-20.
  "bonus_note",
  // Same category: the per-state nexus rows carry a one-sentence disclosure of
  // how their two thresholds combine (New York and Connecticut require BOTH) or
  // of the act that repealed one of them. The bare `combine` value beside it is
  // the machine-readable form; this is the sentence a reader needs.
  "combine_note",
  // Original plain-English summaries by the project author (these shards
  // exist precisely to hold prose; they are explicitly cited as MIT-
  // licensed original creative work).
  "hand_signals", "osha_top10", "loto_steps",
  "defensible_space", "storm_shelter", "triage",
  // Formula-glossing keys: the values describe what the variables in a
  // named public formula stand for. Not prose paste-ins.
  "iso_needed_fire_flow",
  // v5 shard prose-fields: short attribution / explanatory strings that
  // describe what each shard contains or how to access it. Not prose
  // paste-ins; each is one sentence authored by the project.
  "note", "free_access",
]);

// The shard scan itself lives here too, so test/unit/prose-lint-shards.test.js
// runs it on every `npm test`. Until 2026-10-01 it ran only inside
// build-data.mjs -- the monthly Data Refresh -- so two over-long strings hand-
// edited into shards on 2026-09-25 passed every local gate and failed the
// refresh a week later.
// Shard paths whose entire bodies are intentionally prose (original
// plain-English summary shards). The lint scans these files only for
// the prose-length signal already exempted via PROSE_LINT_EXEMPT_KEYS;
// no full-shard skip is needed today, but the hook is here for future
// summary shards added by audit PRs.
export const PROSE_LINT_EXEMPT_SHARDS = new Set([
  // v5 utility 271 glossary: every value under `terms` is intentionally a
  // one-paragraph plain-English definition by the project author. The
  // tooltip rendering depends on the prose form. MIT-licensed creative work.
  "cross/glossary.json",
]);

export function lintProseInShard(folder, file, body) {
  const errors = [];
  const shardPath = folder + "/" + file;
  if (PROSE_LINT_EXEMPT_SHARDS.has(shardPath)) return errors;
  // Any string under a parent named "summaries" (the dictionary of
  // per-tile original plain-English summaries) is exempt. The
  // immediate-parent check below covers most fields; the ancestor-aware
  // check here covers the summaries object whose own keys are tile ids.
  const ancestorIsSummaries = (path) => {
    for (let i = path.length - 2; i >= 0; i--) {
      if (path[i] === "summaries") return true;
    }
    return false;
  };
  const walk = (val, path) => {
    if (val === null || val === undefined) return;
    if (typeof val === "string") {
      if (val.length > PROSE_LINT_THRESHOLD) {
        const lastKey = path[path.length - 1];
        if (typeof lastKey === "string" && PROSE_LINT_EXEMPT_KEYS.has(lastKey)) return;
        if (ancestorIsSummaries(path)) return;
        // Tolerate concatenated tokens: anything with no whitespace is not
        // prose (e.g., a long base64 hash, a long URL, a long enum string).
        if (!/\s/.test(val)) return;
        errors.push(folder + "/" + file + " at " + path.join(".") + ": string of length " + val.length + " (threshold " + PROSE_LINT_THRESHOLD + ") - looks like prose paste-in: " + JSON.stringify(val.slice(0, 80)) + "...");
      }
      return;
    }
    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) walk(val[i], path.concat([i]));
      return;
    }
    if (typeof val === "object") {
      for (const k of Object.keys(val)) walk(val[k], path.concat([k]));
    }
  };
  walk(body, []);
  return errors;
}
