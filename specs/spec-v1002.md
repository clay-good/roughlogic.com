# roughlogic.com Specification v1002 -- Alcohol by Volume from Gravity (calc-kitchen.js, Group O, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`** (Group O),
> no new module, group, or dependency. Inherits spec.md through spec-v1001.md. Beside `drink-abv-dilution` and
> `draft-beer-line-balance` in the beverage cluster.
>
> **The gap, and the evidence for it.** `drink-abv-dilution` computes a finished cocktail's ABV after ice melt, but
> nothing gives the FERMENTATION ABV from gravity readings -- the number a brewer or vintner computes every batch. Grep
> confirmed no gravity/ABV tile. The number this settles: a 1.055 -> 1.012 beer is **5.6% ABV**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, a percent from gravities), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, an original gravity not
greater than 1.000, a non-positive final gravity, or a final gravity not below the original returns `{ error }`.
Citation discipline (v19/v22): the gravity-to-ABV formula by name (standard homebrew practice; Papazian),
`GOVERNANCE.general` (matching the other beverage tiles); the note explains the 131.25 approximation (drifts high on
strong brews), apparent attenuation, and that a temperature-corrected hydrometer/refractometer and, for a sold product,
the TTB/lab method govern the label.

## 2. The tile

### 2.1 `abv-from-gravity` -- Alcohol by Volume from Gravity

```
inputs:
  original_gravity  original (starting) specific gravity, default 1.055
  final_gravity     final (ending) specific gravity, default 1.012

abv_pct                   = (original_gravity - final_gravity) x 131.25
apparent_attenuation_pct  = 100 x (original_gravity - final_gravity) / (original_gravity - 1)
```

**Pinned worked example.** OG 1.055, FG 1.012: `ABV = (1.055 - 1.012) x 131.25 = 0.043 x 131.25 = ` **5.64%**;
`attenuation = 0.043 / 0.055 = ` **78.2%**. Cross-check: a stronger wort, OG 1.065, FG 1.010: `ABV = 0.055 x 131.25 = `
**7.22%**; `attenuation = 0.055 / 0.065 = ` **84.6%**.

## 3. Wiring

A `tools-data.js` row (group `O`, trades `["food-service", "kitchen"]`, beside `drink-abv-dilution`); a `tile-meta.js`
`_TILES` entry (`O`); a `citations.js` entry (Papazian homebrew ABV formula, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the base beer plus the stronger-wort cross-check, pinning ABV and attenuation);
`test/fixtures/compute-map.js` (`abv-from-gravity` -> `computeAbvFromGravity`, module `../../calc-kitchen.js`);
`scripts/related-tiles.mjs` (-> `drink-abv-dilution` / `draft-beer-line-balance` / `brine-cure`);
`data/search/aliases.json` (5 collision-checked aliases: "abv", "alcohol by volume", "abv from gravity", "brewing abv",
"gravity abv"), then `node scripts/build-alias-shards.mjs`; the tile is rendered by the `_r` factory in the
`KITCHEN_RENDERERS` map, and the id added to the calc-kitchen declare list in `app.js`; the `// dims:` annotation
directly above the compute; the Group O citation-coverage audit count bumped; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the bigger-drop / lower-FG directions, and the
error seams. The calc-kitchen.js gzip cap and the Group O group shell are watched at build. Home tile count 1,450 ->
1,451.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group O count bump);
`npm run build`; `node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs`
post-build; `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((1.055 - 1.012) x 131.25 -> 5.64%).

## 5. Roadmap position

Brewing beside `drink-abv-dilution`, serving the brewer / vintner (food-service). Deliberately the working estimate;
the 131.25 factor is an approximation, and a temperature-corrected hydrometer or refractometer -- and for a sold
product the TTB or laboratory method -- govern the label alcohol content. Stays evidence-driven. Continues the culinary
sweep at 1 new spec (v1002).
