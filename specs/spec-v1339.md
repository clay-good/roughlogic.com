# spec-v1339.md — The field index

> Status: **SHIPPED (2026-08-20).** Part of [scope-one-box](scope-one-box.md).
> New build step, two new shared modules, 21 generated shards. No tile added,
> no compute touched, no pixel moved. Catalog stays **1,709**.

## Why

`data/search/slots.json` turns numbers typed in a search query into a prefilled tile, and it
works. It covers **49 tiles**. The catalog has 1,709.

Every one of those 49 is hand-written: a row per tile, a hand-picked list of unit spellings per
input id, verified by `check-slots` against the renderer source. At that rate the other 1,660 are
never getting done — so `voltage drop 120v 150 ft` lands prefilled and
`asphalt 2400 sq ft 3 in deep` lands on an empty form, and which one you get is luck.

The metadata to do this generically looks like it lives in 57 `calc-*.js` modules. It does not.
It already exists in machine-readable form: the declarative renderers carry `render.schema.inputs`,
and `test/fixtures/bespoke-schemas.js` carries the statically-extracted equivalent for the
hand-written ones. Between them that is **7,322 field descriptors across 1,330 tiles** — the key,
the human label, the kind, and the allowed values of every input the catalog renders. Nothing in
the browser reads a byte of it.

## What it does

`scripts/build-field-index.mjs` projects those descriptors into `data/fields/<bucket>.json`.

| | |
|---|---|
| `d` | the field key — which in this catalog is **also the DOM input id**, so a filled field and a hash-state param are the same string |
| `l` | the label lead: the human text with its trailing unit stripped |
| `k` | `number` / `select` / `checkbox` / `text` |
| `u` | the canonical unit the label declares, **omitted when it declares none** |
| `o` | a select's allowed values |

**Sharded by tile group**, reusing the `aliases-<letter>.json` convention already in place: the
browser knows a tile's group from `TOOLS` before it wants that tile's fields, so it derives the
filename with no manifest fetch, and the service worker pre-caches by the same pattern.

```
21 shards · 1,330 tiles · 5,366 fields · 93.2 KB gzip total · largest 16.5 KB
```

## The unit lives in the label, and the label is only sometimes a unit

sophiewell's descriptors carry `unit: "kg"`. Ours carry `label: "Length one-way (ft)"`. The
trailing-parenthesis convention is already governed (`docs/unit-notation-in-labels.md`) and
already linted (`check-us-defaults`), so it is parseable — but a survey of **every** label in the
catalog turned up **1,107 distinct trailing tokens**, and only the head of that distribution is
units:

| Head — real units | Tail — guidance addressed to the reader |
|---|---|
| `in` ×723, `ft` ×514, `lb` ×156, `%` ×133, `psi` ×131, `°F` ×117, `ft²` ×96 | `in; 0 = none`, `ft, optional`, `1.0 NW, 0.75 LW`, `psi, A307 = 36000`, `leave 0 to solve`, `0-1` |

So `unitFromLabel` is deliberately narrow and refuses by default: take the trailing parenthesis
only if it closes the label, keep the first comma- or semicolon-delimited segment, and accept it
**only** if that segment is a known unit. `ft, optional` → `ft`. `1.0 NW, 0.75 LW` → nothing.

**3,397 of 5,366 fields (63.3%) resolve a unit.** The rest carry none, which is the correct
answer, not a gap: a field with no declared unit simply cannot be matched by unit agreement.

### The trap that would have shipped a wrong number

**A bare `(C)` is not Celsius.** In this catalog it is as often a coefficient — Hazen-Williams C,
Manning's C — as a temperature. A permissive parser would have routed a pipe-roughness value into
a temperature field, or the reverse. Only the degree-marked spellings (`°C`, `°F`, `deg C`)
resolve to a temperature; bare `C` and bare `F` resolve to nothing. There is a test pinning it.

## Group E had to be split, and the cap held

Group E (Electrical) holds 2,305 field descriptors, a third of the catalog's, and gzips to
**31.7 KB** as one shard — over the 24 KB per-shard cap. The builder failed the build and said so,
which is what the cap is for.

The fix is the split, not a bigger cap: `SPLIT_GROUPS` in `field-bucket.js` divides E
alphabetically on the tile id, giving `e-1` (210 tiles, 16.4 KB) and `e-2` (212 tiles, 16.5 KB).
Alphabetical because it is stable — adding a tile never relocates an existing one.

**`field-bucket.js` is imported by both the writer and the reader.** A disagreement about a
filename between the build step and the browser is a silent 404 that degrades prefill to nothing
and looks like the feature simply not working. One module, one rule, no way to drift.

## What is deliberately not in the index

- **Fields with no label — 1,956 of them, and 379 tiles entirely.** Those tiles degrade to
  compute-parameter introspection, where the descriptor is `area_ft2` and no human text. Matching
  a query against a machine key is guessing. They are omitted, and they keep working exactly as
  they do today.
- **A `required` flag.** sophiewell's registry has one; ours does not, and inventing it from
  `default` being absent would be a guess dressed as data. v1342's ask card needs it, and v1342
  derives it honestly — by blanking one field at a time and seeing whether the compute still
  answers.

## Where it lives

- `field-units.js` — **new.** `canonicalUnit()`, `unitFromLabel()`, `labelLead()`, and the
  spelling table covering both what labels write and what a person types.
- `field-bucket.js` — **new.** `bucketFor()`, `allBuckets()`, `SPLIT_GROUPS`.
- `scripts/build-field-index.mjs` — **new.** Writes the shards and `data/fields/manifest.json`.
- `sw.js` — the 21 shards, the manifest, and the two new modules in the precache lists.
- `package.json` — `build-field-index --check` joins the lint chain as the **42nd** gate.
- `docs/data-sources.md` — the `data/fields/*.json` section the free-access lint requires.
- `README.md` — the gate count, 41 → 42.

## Gotchas

- **The manifest's `asOf` is a literal, not `new Date()`.** A generated file whose contents track
  the clock fails its own `--check` gate the next morning. Bump `EDITION_DATE` deliberately.
- **Hashes are `"pending"`,** the same convention the generated alias shards use. A pinned hash on
  a derived file churns on every source change; `--check` is what actually holds these honest, and
  `verify-integrity` reads `scripts/expected-hashes.json`, which does not list them.
- **The two new root modules had to go in `build.mjs` FILES *and* `sw.js` SHELL_ASSETS.** The
  enumeration gate caught them, which is exactly the omission class it was written for after a
  fresh deploy once 404'd `v5-platform.js`. They ship now rather than in v1340 so the precache
  list does not churn twice; `check-dist` still reports the same 3 pre-existing orphan warnings.
- Do not add a `data/fields/` entry to `expected-hashes.json`. These regenerate.

## Proof

- `test/unit/field-index.test.js` — **10 tests, green.** Unit spelling folding; every refusal case
  (`NW`, `0-1`, `A307 = 36000`, a bare `C`, a mid-label parenthesis); label-lead stripping;
  `bucketFor` stability and its agreement with `allBuckets`; and a sweep asserting every shard on
  disk parses, carries no duplicate key, holds a non-empty label on every row, canonicalizes every
  unit it stores, and **lands in the bucket the reader's own rule computes for it**.
- `node scripts/build-field-index.mjs --check` — clean, and verified to fail on hand-edited drift.
- Full chain green: `lint` (42 gates), `test:unit` (**6,184**), `build` (1,988 files),
  `check:dist`, `check:shells`, `check:home-payload` (57.7% of budget — the shards are lazy and
  add nothing to first paint).
