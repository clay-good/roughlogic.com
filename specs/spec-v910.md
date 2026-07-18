# roughlogic.com Specification v910 -- Knurling Blank Diameter for Clean Tracking (calc-machining.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v909.md. Machinist setup-math sweep, mirroring the
> accepted `tap-drill-size` first-principles thread-geometry precedent.
>
> **The gap, and the evidence for it.** The catalog has the machinist's thread bench (`thread-pitch`, `tap-drill-size`,
> `cutting-speed-rpm`) but nothing sizes the **blank before a knurl**. Grep confirmed no knurl tile. A circular-pitch
> (TPI) knurl double-tracks unless the blank circumference is a whole number of teeth. The number this settles: a 0.750
> in target at a 21 TPI knurl wants **49 teeth**, so the blank is turned to **0.7427 in** (0.0073 in under nominal).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the accepted
`tap-drill-size` thread-geometry tile: the target diameter, blank diameter, and adjustment carry `L`, the knurl pitch
carries `L^-1` (teeth per inch), and the tooth count is dimensionless. The v18/v21 contract: a non-finite or non-positive
target diameter or knurl TPI, or a diameter too small for one tooth, returns `{ error }`. Citation discipline (v19/v22):
the knurl tracking rule by name (teeth = round(pi x D x TPI); blank = teeth / (pi x TPI); adjustment = blank - target),
`GOVERNANCE.general`; the note states that a circular-pitch knurl tracks cleanly only when the blank circumference is a
whole number of tooth pitches, that the adjustment is signed and always within half a tooth pitch, that this is the TPI
(teeth-per-inch) knurl form, and that diametral-pitch knurls and the knurl maker's tracking chart govern the finished
pattern.

## 2. The tile

### 2.1 `knurl-blank-diameter` -- Knurling Blank Diameter for Clean Tracking

```
inputs:
  target_diameter_in  finished (nominal) diameter (in)
  knurl_tpi           knurl pitch (teeth per inch)

teeth            = round( pi x target_diameter_in x knurl_tpi )   [error if < 1]
blank_diameter_in = teeth / (pi x knurl_tpi)
adjustment_in    = blank_diameter_in - target_diameter_in
```

**Pinned worked example.** 0.750 in target at 21 TPI:
`teeth = round(pi x 0.75 x 21) = round(49.48) = ` **49**; `blank = 49 / (pi x 21) = ` **0.7427 in**;
`adjustment = 0.7427 - 0.750 = ` **-0.0073 in** (turn 0.0073 in under). Cross-check: a 1.000 in target at 33 TPI is
`round(pi x 1.0 x 33) = round(103.67) = ` **104 teeth**, `blank = 104 / (pi x 33) = ` **1.0032 in** (turn 0.0032 in
over) -- the adjustment flips sign and stays within half a tooth pitch either way.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machining", "mechanic"]`, beside `keyseat-key-size`); a `tile-meta.js`
`_TILES` entry (`K`); a `citations.js` entry (knurl tracking rule, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the cross-check, pinning teeth and blank diameter);
`test/fixtures/compute-map.js` (`knurl-blank-diameter` -> `computeKnurlBlankDiameter`, module `../../calc-machining.js`);
`scripts/related-tiles.mjs` (-> `cutting-speed-rpm` / `tap-drill-size` / `decimal-to-fraction`);
`data/search/aliases.json` (5 collision-checked aliases: "knurl blank diameter", "knurl tracking", "knurl blank size",
"blank for knurling", "knurl pitch diameter"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in
the `MACHINING_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-machining declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the teeth, blank diameter, signed adjustment, half-tooth
bound, and the error seams (non-positive diameter / TPI, non-finite). The calc-machining.js gzip cap is watched at build.
Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint.
Home tile count 1,358 -> 1,359.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(round(pi x 0.75 x 21) -> 49 teeth, blank 0.7427 in).

## 5. Roadmap position

Machinist setup-math beside `tap-drill-size` and `cutting-speed-rpm`, serving the machinist / mechanic (machining /
mechanic). Deliberately geometry; the knurl maker's tracking chart governs the finished pattern. Stays evidence-driven.
Continues the material / setup sweep at 1 new spec (v910).
