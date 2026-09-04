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
