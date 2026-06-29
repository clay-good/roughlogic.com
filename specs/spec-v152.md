# roughlogic.com Specification v152 -- Smoke Residue Type and Cleaning Method Screen (calc-restoration.js, Group D, 1 New Tile)

> **Status: LANDED (2026-06-29, package 0.85.0; was PROPOSED 2026-06-23). Vetted-novel subset of the fire & smoke restoration batch. Batch spec-v151..v156.** In-scope catalog expansion under the
> spec-v106 trades-only charter: the reference screen that maps an observed smoke residue to its
> cleaning method, the decision every fire job turns on before a sponge or solvent is chosen. Adds one
> tile to **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits spec.md
> through spec-v151.md.
>
> **The gap, and the evidence for it.** The cleaning takeoff (v147) assumes dry sponging, but that is
> only correct for one residue type. Fire restoration sorts residues into dry, wet, protein,
> fuel-oil/puffback, and synthetic, and each demands a different method -- dry sponging the dry residue,
> wet cleaning and solvents the smeary wet and synthetic, degreasing and heavy deodorization the
> near-invisible protein, specialty solvents the oily furnace puffback. Choosing the wrong method sets
> the residue or wastes the trip. The catalog has reference screens for water classes and smoke
> reading, but none for residue-driven method selection.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. This is a
reference/screen tile in the family of `water-classes` and `thermal-delta-t`: the single input is a
residue selector and the outputs are descriptive guidance strings, so there are no dimensioned numeric
outputs (`dimensionless` selector in, structured text out). The v18/v21 contract: an unrecognized
residue selector returns `{ error }`; there is no arithmetic. Citation discipline (v19/v22):
`GOVERNANCE.general` over the residue-type / cleaning-method mapping, by name; `editionNote` names
ANSI/IICRC S700 and states that **a test-clean of an inconspicuous area governs the final method** and
that solvent selection and substrate compatibility are the cleaner's call -- this is a screen that
narrows the method, not a procedure.

## 2. The tile

### 2.1 `smoke-residue-method` -- Residue Type and Cleaning Method

```
input:
  residue_type  dimensionless selector: "dry" | "wet" | "protein" | "fueloil" | "synthetic"

# deterministic lookup -> { source, appearance, method, deodorization_note, caution }
dry        -> fast hot fire; dry powdery residue;        dry-sponge first, then dry/wet clean;  lightest
wet        -> slow smoldering fire; smeary sticky residue; wet clean + solvents, agitate;        sets if rubbed dry
protein    -> kitchen / stovetop; near-invisible film, strong odor; degrease + heavy deodorization; do NOT dry-sponge
fueloil    -> furnace puffback; oily black residue;      specialty petroleum solvents;           ventilate, PPE
synthetic  -> burning plastics; smeary black, acidic;    wet clean, neutralize, corrosion check;  time-sensitive on metals
```

**Pinned worked example.** `residue_type = "dry"` -> "fast, hot fire; dry, powdery residue; dry-sponge
first then dry/wet cleaning; the lightest residue to remove." This is the case the soot-cleaning
takeoff (v147) assumes.
**Cross-check (a residue that breaks the default).** `residue_type = "protein"` -> "kitchen source;
near-invisible greasy film with intense odor; degrease and deodorize aggressively; do not dry-sponge"
-- the opposite method from the dry case, the trap a count-only takeoff would walk into. A test-clean
confirms the method; this screen narrows it.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the residue/method mapping, `editionNote` naming ANSI/IICRC
S700, the test-clean-governs caveat, and the screen-not-procedure scope); `test/fixtures/worked-
examples.json` (example + cross-check, asserting the returned method strings);
`test/fixtures/compute-map.js` (`smoke-residue-method` -> `computeSmokeResidueMethod` in
`../../calc-restoration.js`); `scripts/related-tiles.mjs` (-> `soot-cleaning-takeoff` /
`ozone-shock-treatment` / `ppe`); `data/search/aliases.json` ("smoke residue", "wet smoke", "dry
smoke", "protein residue", "puffback", "cleaning method"); the id appended to the existing
`RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation (selector-in, text-out);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning each of the five
selectors and the unrecognized-selector error seam. Raise the `calc-restoration.js` size cap by ~20
percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the five-selector fuzzer block); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the method and
caution strings wrap on a phone); render-no-nan + a11y sweep, output read to the value (dry -> dry-
sponge method; protein -> degrease, do not dry-sponge).

## 5. Roadmap position

Sits ahead of the cleaning takeoff (v147) and deodorization tiles (v148, v153) as the method gate of
the fire family. Further Group D growth stays evidence-driven.
