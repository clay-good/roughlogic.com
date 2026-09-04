#!/usr/bin/env node
// Ranking measurement harness.
//
// Search ranking changes are easy to "improve" and hard to verify: a tweak that
// fixes the query in front of you can quietly cost a hundred others, and there
// is no way to see it by reading. This measures rankTools -- the ranker BOTH
// doors use, the browser search box and the MCP agent door -- against three
// ground truths, none of them invented here:
//
//   aliases  every curated phrase in data/search/aliases.json should reach the
//            tile a human mapped it to. This is the strongest signal in the
//            repo: 21,000 rows of recorded human intent.
//   names    every tile should rank first for its own name.
//   ids      every tile should rank first for its own id, hyphens as spaces.
//   asked    the phrasing README's very first instruction teaches -- "Type the
//            job the way you'd say it" -- around each tile's own name. Its
//            ground truth is not invented either: a tile that already ranks
//            first for its bare name must still rank first when the words a
//            person actually types surround it. Tiles that miss on the bare
//            name are excluded, so this measures the OPENER and nothing else.
//            It read 100% the day it was written, which is the point: the
//            primary documented path was working and NOTHING measured it, so a
//            tokenizer change that stopped stripping "how many" would have
//            broken it while all three sets above stayed green -- none of them
//            carries a question word.
//
// Run it before and after any change to search-discovery.js and compare all
// three. A change that raises one and lowers another is a trade, and the
// numbers are how you see the price. The exact-id bonus (2026-08-29) was
// rewritten after this harness showed the first version buying 94 id matches
// with 15 curated alias rows.
//
//   node scripts/measure-ranking.mjs            # the three rates
//   node scripts/measure-ranking.mjs --misses   # plus every failing row
//
// Two things this harness has already earned its keep by REJECTING, both of
// which read as obvious improvements and both of which measured worse:
//
//   Alias terms are unique; their normalized forms are not. Stopword stripping
//   collapses "wire size", "what wire size", "what size wire" and "best wire
//   size" all to the single key "wire", and aliasIndex() hands that key to
//   whichever row appears FIRST in the file. That is "best wire size" ->
//   thread-measure-wire, so an electrician typing "wire size" gets a
//   machinist's three-wire thread-measurement tool while three curated rows
//   saying otherwise lose their bonus silently. 45 keys collide onto different
//   targets this way, costing 49 curated rows.
//
//   Fix 1, no bonus when rows disagree: aliases 20,928 -> 20,917, ids +4. Worse.
//   Fix 2, bonus to the target the most rows name: aliases -> 20,921, ids +2.
//   Also worse. File order is a bad tiebreak and both replacements were worse
//   than it, so neither shipped.
//
//   Direction words. "to" and "from" are STOPWORDS, so an inverse pair collapses
//   onto one query: "conductivity to tds" and "tds from conductivity" reduce to
//   the same two words in a different order, and 15 of the alias misses below
//   are a forward/inverse sibling picked the wrong way round. The direction word
//   was the only thing saying which number the reader wanted, and tiles are
//   named the same way the query is phrased -- "TDS from Conductivity",
//   "Chimney Height for Draft" put their OUTPUT first -- so the hint is easy to
//   extract: in "A to B" the answer is B, in "B from A" the answer is B.
//
//   Extracting it works. Using it does not. Placed as a TIEBREAK (the only
//   placement that cannot hurt a row decided on real signal) it moves none of
//   those 15, because they are not ties: "conductivity to tds" normalizes to
//   "conductivity tds", which is an exact alias term for the OTHER sibling, and
//   the verbatim-alias key sorts far above any tiebreak. These rows are the
//   normalized-alias-collision class described above wearing a different hat,
//   not a direction problem, and the two fixes tried for that collision both
//   measured worse. Promoting the hint above the verbatim-alias key would mean
//   a heuristic overriding recorded human intent, which is the wrong trade.
//   Measured 2026-09-04; not shipped.
//
// The residue is not all defect, either. Reading the 97 alias misses, a good
// share are cases where the ranker's answer looks better than the curated one
// ("occupant load" returns the tile named Occupant Load; the alias points
// elsewhere), so some of that 0.46% is the alias file, not the ranker. Treat
// the alias rate as a REGRESSION guard, not a score to maximise.
//
// A gap these three sets do NOT cover, and one attempt to cover it that failed.
//
// Conversational queries whose distinctive word is absent from the catalog rank
// badly and nothing here sees it. "furnace size for a 2000 square foot house"
// returns Roofing Squares: the query normalizes to furnace|2000|square|feet|
// house, "square" is a strong name match for Roofing Squares, and the word
// "furnace" appears nowhere in manual-j-heating's name, description or aliases.
// No weighting scheme fixes that -- there is no link to promote. It is a
// vocabulary gap, and curated aliases are the mechanism for it. Note the near
// misses: "how much concrete for a 24x24 garage slab" IS a curated alias for
// `concrete`, but "how much concrete for a 10x12 slab" does not inherit it,
// because the verbatim bonus needs the whole normalized phrase to match.
//
// The obvious way to measure that generalization -- perturb the numbers in
// every alias phrase and require the target to survive -- does not work, and is
// recorded here so it is not rebuilt. It scores 82.04% of 1,615 rows, but the
// residue is mostly the perturbation being wrong rather than the ranker: "60
// degree thread depth", "4-20ma scaling", "260/280 ratio", "50 to 1 mix" and
// "118 degree point" all carry numbers that IDENTIFY the calculator rather than
// feed it, so changing them should change the answer. Separating identifying
// numbers from quantities is a judgement call per row, which makes this a
// curation task, not a derivable ground truth.
//
// A third rejected change, and the one that came closest.
//
// Ties are common and the alphabetical fallback settles them by accident: "how
// much concrete for a 10x12 slab" gives EVERY concrete tile coverage 2 and
// score 5 ("concrete" on the name, "slab" on an alias), so dozens tie and the
// answer came out in name order, with the tile actually named Concrete Volume
// nowhere near the top. Breaking those ties by how much of the tile's own name
// the query accounted for fixes it, and after two refinements -- an exact-id
// match wins the tie, then a committed alias, then the share -- all three
// numbers here improved at once: aliases 20,928 -> 20,934, names 1,800 ->
// 1,801, ids 1,781 -> 1,782 with top-3 reaching 1,804 of 1,804.
//
// It still did not ship. A different guard caught it: test/unit/mcp-catalog.js
// asserts that nonsense is NO_MATCH and never a confident pointer (spec-v1344),
// and reordering the tie surfaced a tile that answers "what is the meaning of
// life" with hepa-filter-life. Every scoring input was unchanged -- only the
// order of equal-scoring rows moved -- so the ranking is not more wrong, but
// the nonsense guard turns out to be sensitive to tie order, and a confident
// pointer for a nonsense question is worse than a mediocre one for a real
// query. Anyone retrying this needs to make the NO_MATCH decision robust to tie
// order FIRST; the three numbers above say the rest of the idea is sound.
//
// Deterministic, offline, read-only. Not a gate: it reports, it does not fail.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHOW_MISSES = process.argv.includes("--misses");

const { TOOLS } = await import(resolve(ROOT, "tools-data.js"));
const { normalizeQuery, rankTools } = await import(resolve(ROOT, "search-discovery.js"));
const aliases = JSON.parse(await readFile(resolve(ROOT, "data", "search", "aliases.json"), "utf8")).aliases;

const idSet = new Set(TOOLS.map((t) => t.id));
const idByName = new Map(TOOLS.map((t) => [t.name, t.id]));

function rank(phrase) {
  // normalizeQuery returns { tokens, raw }, NOT an array. Passing the object
  // straight through scores every row zero and reports a confident, empty
  // baseline -- which is exactly what it did the first time.
  const tokens = normalizeQuery(phrase).tokens;
  if (!tokens || !tokens.length) return null;
  const ranked = rankTools(tokens, TOOLS, aliases, { limit: 3 });
  return ranked.map((r) => (r.tool ? r.tool.id : r.id));
}

function measure(label, rows) {
  let n = 0, top1 = 0, top3 = 0;
  const misses = [];
  for (const { phrase, target } of rows) {
    const got = rank(phrase);
    if (!got || !got.length) continue;
    n++;
    if (got[0] === target) top1++;
    else misses.push({ phrase, target, got: got[0] });
    if (got.includes(target)) top3++;
  }
  const pct = (x) => (n ? ((x / n) * 100).toFixed(2) : "0.00");
  console.log(
    `${label.padEnd(8)} ${String(n).padStart(6)} rows | top-1 ${String(top1).padStart(6)} (${pct(top1)}%) | top-3 ${String(top3).padStart(6)} (${pct(top3)}%)`,
  );
  return misses;
}

const aliasRows = [];
for (const row of aliases) {
  if (!row || typeof row.term !== "string" || typeof row.target !== "string") continue;
  const target = idSet.has(row.target) ? row.target : idByName.get(row.target);
  if (target) aliasRows.push({ phrase: row.term, target });
}

// Openers taken from the README's own worked phrasings and the four example
// questions the home view offers, not from what happened to pass.
// Three shapes, not a longer list: a leading question word, a leading article,
// and a trailing noun. Any tokenizer change that stopped stripping filler shows
// on all three, and the harness is already the slowest thing in the repo -- five
// forms over every name-winner pushed a full run past five minutes.
const ASK_FORMS = [
  (n) => "how many " + n,
  (n) => "what is the " + n,
  (n) => n + " calculator",
];

// Rows for the `asked` set, over every `stride`-th tile. A tile that does not
// already win on its bare name is skipped: this set measures what the opener
// costs, and a name that never won cannot lose.
export function askedRows(stride = 1) {
  const rows = [];
  for (let i = 0; i < TOOLS.length; i += stride) {
    const t = TOOLS[i];
    if ((rank(t.name) || [])[0] !== t.id) continue;
    for (const form of ASK_FORMS) rows.push({ phrase: form(t.name), target: t.id });
  }
  return rows;
}

// Returns the phrasings that lose a tile it already won on its bare name.
export function measureAsked(stride = 1) {
  const misses = [];
  for (const { phrase, target } of askedRows(stride)) {
    const got = rank(phrase);
    if (!got || got[0] !== target) misses.push({ phrase, target, got: got ? got[0] : null });
  }
  return misses;
}

// The full asked sweep costs about as much as the other three sets combined,
// so it is opt-in here and the unit test pins a strided sample instead. Default
// runtime is unchanged from before this set existed.
const WITH_ASKED = process.argv.includes("--asked");

// Importing this module must not run the sweep: test/unit pins the `asked` set
// through measureAsked() and would otherwise pay for all three others first.
const RUN_AS_CLI = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (RUN_AS_CLI) {
const all = {
  aliases: measure("aliases", aliasRows),
  names: measure("names", TOOLS.map((t) => ({ phrase: t.name, target: t.id }))),
  ids: measure("ids", TOOLS.map((t) => ({ phrase: t.id.replace(/-/g, " "), target: t.id }))),
};
if (WITH_ASKED) all.asked = measure("asked", askedRows());
else console.log("asked    (skipped; pass --asked for the question-phrasing sweep)");

if (SHOW_MISSES) {
  for (const [label, misses] of Object.entries(all)) {
    console.log(`\n--- ${label}: ${misses.length} miss(es) ---`);
    for (const m of misses) console.log(`  "${m.phrase}" -> ${m.got} (want ${m.target})`);
  }
} else {
  const total = Object.values(all).reduce((a, m) => a + m.length, 0);
  console.log(`\n${total} miss(es) across the three sets; re-run with --misses to list them.`);
}
}
