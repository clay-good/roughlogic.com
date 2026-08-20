# spec-v1340.md — query-fill: one extractor for the whole catalog

> Status: **SHIPPED (2026-08-20).** Part of [scope-one-box](scope-one-box.md). Depends on [v1339](spec-v1339.md).
> New browser module + a checked-in query corpus. No tile added, no compute changed, nothing
> visible. Catalog stays **1,709**.

## Why

`data/search/slots.json` turns typed quantities into a prefilled tile and covers **49 tiles**.
[v1339](spec-v1339.md) put the descriptors for **1,331** tiles in the browser's reach. This spec
is the code that spends them.

It is the substrate for v1341–v1344 and it ships **invisible**: nothing on screen changes, the
whole thing is unit-tested against a checked-in corpus, and it is live and CI-verified before any
pixel moves. That sequencing is the one thing sophiewell called out as having earned its keep.

## The contract

```
queryFill(query, rows) -> { filled: {key: value}, missing: [key], unmatched: [fragment] }
```

`rows` is a tile's v1339 shard entry. It **never routes and never computes** — v1341 and v1342 own
those. `filled` keys are field keys, which in this catalog are also DOM ids and hash-state params,
so one object serves all three.

| Step | Rule |
|---|---|
| **1. Normalize** | Rewrite the compound forms a tradesperson writes as one token into the long form the matcher reads. This is the roughlogic-specific half and it is listed in full below. |
| **2. Number fields** | Find `<field term> <number> <unit?>` using terms derived from the row's label lead plus a trade-shorthand table. **Name-then-value wins outright**; the reverse order is consulted only when nothing matched, because in a run of readings (`length 40 width 20 depth 6`) it manufactures a false hit for every one. |
| **3. Unit agreement** | A number whose unit canonicalizes to a different family than the field's is **refused, not converted by guess**. Same family converts (`150 ft` into an `(in)` field). No unit on either side is a soft match, allowed only when nothing else claims the fragment. |
| **4. Select fields** | Word-valued options match directly against `row.o`. A numeric or single-letter option needs the field's own name beside it (`schedule 40`, `type L`) — a bare `40` is not a value. |
| **5. Ambiguity veto** | One field with two readings, or one fragment claimed by two fields, fills **neither** — unless one reading is strictly better corroborated. **A wrong prefill is worse than no prefill.** |
| **6. Missing** | Every field left unfilled is reported in declaration order, so v1342 can ask for the first one. |

Deterministic table lookup and regex throughout. No model, no network, no storage.

## The normalizations, which are where the trades differ from medicine

sophiewell rewrote `120/80` and `5'10`. This catalog's compound forms are different and there are
more of them. Each is a real spelling a tradesperson types:

| Typed | Rewritten to |
|---|---|
| `8'6"` , `8 ft 6 in` | `length 8.5 ft` |
| `3-1/2"` , `3 1/2 in` | `3.5 in` |
| `12/2` (roof pitch) | `rise 12 in run 12 in` — **only** in a pitch context; otherwise it is a fraction |
| `12awg` , `#12` , `12 ga` | `wire size 12 awg` |
| `120/240v` | `voltage 240 v` |
| `2x6` , `2 x 6` | `nominal width 2 in nominal depth 6 in` |
| `3/4"` | `0.75 in` |
| `1/2 in pipe` | `pipe size 0.5 in` |

**`12/2` is the sharp one.** It is a roof pitch, a fraction, and a cable spec (`12/2 NM-B`)
depending on context. Where the tile's own fields do not disambiguate it, **fill nothing** — a
misread pitch is a wrong rafter length.

`extractQuantities()` in `search-discovery.js` already parses `{value, unit}` pairs including
glued units and fractions, and it is shared with the MCP server. **Reuse it; do not write a second
number parser.** The normalizations run *before* it, as a query rewrite, exactly as sophiewell
found was smaller than reaching into the existing parsers.

## Measured

Every indexed tile's own worked example, re-phrased as a query and fed back through the
extractor. The phrasing strips digits out of the label first, because a reader says *"design
rainfall 4 in/hr"*, never *"design rainfall, 100-yr / 1-hr 4 in/hr"* -- leaving them in measures
the extractor against a query built to trap it.

| | |
|---|---|
| Tiles measured | 1,330 |
| Every value recovered | 598 (45.0%) |
| Some recovered | 638 (48.0%) |
| None recovered | 94 (7.1%) |
| **Fields recovered** | **3,163 / 5,069 (62.4%)** |
| **Tiles with a WRONG value** | **0 (0.00%)** |

The last row is the only one that matters, and it is zero across 5,069 fields. sophiewell's
equivalent measurement had two. Recovery is lower than its 90.1%, and that is expected: 36.7% of
this catalog's indexed fields declare no unit at all, so they can only be reached by name.

**The 4-character term floor was verified, not assumed.** Lowering it to 3 to pick up trade words
like `run` and `gap` made recovery *worse* -- 61.6% -- because the extra short terms create more
ambiguity and the veto fires more often. The floor stays at 4.

## Four bugs the measurement caught

The first pass reported 12 tiles with a wrong value. Ten were artifacts of the synthetic query;
the other two were real, and so were two more found on the way.

| | |
|---|---|
| **A conversion silently truncated the reader's precision** | `toFixed(6)` turned `0.015452412` into `0.015452` on `boring-bar-max-overhang`. A same-unit value now returns the reader's own string untouched, and a real conversion keeps 12 significant digits. |
| **A select's name bled into a number field** | `lv-dc-drop` has a `System voltage` select beside a `Device min voltage` field. Selects were excluded from the name contest, which left the number field as the sole match for the word "voltage" and it took the 12. Selects now compete for a name even though they are filled separately -- a fragment two fields can claim fills neither, and a select is a field. |
| **A rewrite shredded a value the tile names verbatim** | `lumber-spans` has a `nominal_size` select whose options are literally `2x4`, `2x6`, `2x10`. The nominal-lumber rewrite turned `2x10` into `nominal width 2 in nominal depth 10 in`, and the injected `2` filled the tile's tributary-width field. `rewriteQuery` now takes a protect set of the tile's own option values: **a tile that names a value verbatim always outranks a rewrite of it.** |
| **A dropped unit letter put 100 into a °F field** | `ambient 100 c` -- `extractQuantities` only reads single-letter units when glued, so the ` c` vanished and the bare 100 filled a field measured in °F. Temperature is now rewritten explicitly, and a **bare** `c`/`f` only counts inside a temperature context, so Hazen-Williams `c 130` is still left alone. |

## What shipped differently

- **`extractQuantities` gained an opt-in `withIndex`.** Name-then-value needs positions, and the
  returned shape is asserted by `deepEqual` in `test/unit/search-discovery.test.js` and relied on
  by `mapSlots`. An optional second argument adds `index`/`end` without touching the existing
  contract -- one parser, no breakage.
- **An exact unit match breaks a same-family tie.** `3 in` on a tile holding a depth in inches and
  a width in feet is not genuinely ambiguous: the reader wrote inches. Same-family fields only
  compete when nothing matches the unit exactly, and then one must still win alone.
- **An unreadable unit now blocks a unit-bearing field.** If the reader attached a unit we cannot
  parse, refusing is right -- we do not know whether it agrees. A short list of prose words
  (`long`, `wide`, `of`, `at`) is exempt, since `40 ft long` must still work.
- **A short label is kept whole.** The 4-character floor erased `AWG` and `Rise` entirely, leaving
  those fields unfillable by name.

## Gotchas

- **Negation is the sharp edge on booleans and selects.** `no insulation`, `without a vent`,
  `unheated` must never assert the positive. Where the negation window is uncertain, fill nothing.
- **Label leads are guidance as often as they are names.** v1339 already strips the trailing unit;
  strip digits too before deriving terms, or a label like *"Bolt strength (psi, A307 = 36000)"*
  contributes `36000` as a search term. Apply a 4-character floor, the same one the tool pages use.
- **Two-letter tokens never fill a field.** They are how a tool gets named, not how a value gets
  given.
- **`(C)` is not Celsius** — v1339 already refuses it, and nothing here may re-introduce it.
- A unit spelling that appears on both sides of the query (`ft` in `40 ft by 20 ft`) is not
  ambiguity; it is two values for two fields. Ambiguity is one *fragment* claimed twice.
- Fetch the shard through `bucketFor()` from `field-bucket.js`. Never build the filename inline —
  that is the whole reason the module exists.
- Lazy: fetch on first use, cache per session, **never at first paint**. `check-home-payload` is
  at 57.7% of a 100 KB budget and this must not move it.

## Not in scope

- **`slots.json`'s 49 templates stay and keep winning where they fire.** They carry hand-verified
  unit spellings the generic path cannot claim. `queryFill` is the fallback for the other 1,282
  indexed tiles and never overrides a template hit. Folding them together is a later question,
  worth asking only once the generic path has proven equal on all 49.
- Requiredness. `missing` here means "unfilled", not "required" — there is no `required` flag in
  the registry. [v1342](spec-v1342.md) derives the real thing.

## Where it lives

- `query-fill.js` — **new.** `queryFill()`, `normalizeQuery()` (the rewrites above), `loadFields()`,
  the unit-family conversion table, the trade-shorthand table, and the negation window.
- `field-units.js` — gains the conversion factors. It already holds canonicalization; families and
  factors belong beside them, not in a second table that can disagree.
- `test/fixtures/queries.txt` — **new.** Checked-in phrasings, one per line, with the tile and the
  fields each should produce.
- `scripts/build.mjs`, `sw.js` — `query-fill.js` in FILES and SHELL_ASSETS.

## The corpus replaces telemetry

The home page says no tracking and that stays true. Failed queries are diagnosed by running the
extractor over `test/fixtures/queries.txt`, never by recording what anyone typed. With a large
share of traffic apparently being agents, query logging would look especially cheap and useful
here — which is exactly why the decision is made once, in writing, now.

## Proof

- `test/unit/query-fill.test.js` — every normalization above; unit-family agreement and refusal;
  name-then-value beating value-then-name; both veto directions; corroboration breaking a tie; a
  bare number filling nothing; two-letter tokens filling nothing; `missing` order; and the
  ambiguous `12/2` filling nothing without context.
- **A whole-catalog measurement, reported in the commit**: every tile's own worked example
  re-phrased as a query and fed back through the extractor. The row that matters is
  **tiles with a WRONG value**, and the bar is that it rounds to zero — across 4,953 fields
  sophiewell's extractor was either right or blank on all but two.
- Full chain green: `lint` (43 gates), `test:unit`, `check-home-payload`.
