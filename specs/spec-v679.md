# roughlogic.com Specification v679 -- Chamber Volume for a Target Compression Ratio (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K,
> mechanic), no new module, group, or dependency. Inherits spec.md through spec-v678.md.
>
> **The gap, and the evidence for it.** Spec-v8 (`displacement-cr`) runs engine geometry forward: given the chamber,
> gasket, deck, and dome volumes, it returns the static compression ratio. The engine-builder's question is the inverse
> -- **what chamber volume (or how much to mill the head / how large a piston dish) do I need to hit a target CR**. The
> forward tile makes you guess chamber volumes and re-read the CR; the inverse solves it directly. From
> `CR = (cylinder_cc + TDC_volume) / TDC_volume`, `TDC_volume = cylinder_cc / (CR - 1)`, and
> `chamber = TDC_volume - gasket - deck + dome`. The number this settles: a 4.0 x 3.48 in cylinder (716.7 cc) targeting
> 10.73:1 needs a **64.0 cc** chamber; drop the target to a pump-gas 9.0:1 and the chamber grows to **79.9 cc**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`displacement-cr` sibling: the bore, stroke, gasket, and deck dimensions are `L` (in), the chamber and dome/dish volumes
are `L^3` (cc), and the target CR is `dimensionless`. It reuses the sibling's cylinder / gasket / deck cc formulas and
the `16.387` cc-per-in^3 constant. The v18/v21 contract: any non-finite input, a non-positive bore or stroke, a target
CR at or below 1, or a target so high that the required chamber volume would be zero or negative, returns `{ error }`.
Citation discipline (v19/v22): the static compression-ratio identity solved for the chamber volume, by name; the note
states that **this is how much cc the head chambers must measure (or how much to mill, or how large a dished/domed piston
to run -- a dome subtracts volume and raises CR, a dish adds it), a target CR too high for the geometry is rejected, this
is static CR only (no dynamic CR, cam timing, or quench), and cc'ing the actual chambers and the engine builder
govern**.

## 2. The tile

### 2.1 `chamber-cc-for-cr` -- Chamber Volume for a Target Compression Ratio

```
inputs:
  bore_in, stroke_in         in    cylinder bore and stroke (> 0)
  target_cr                  -     target static compression ratio (> 1)
  gasket_bore_in, gasket_thickness_in, deck_clearance_in   in
  dome_dish_cc               cc    piston dome (-) / dish (+)

cylinder_cc = pi/4 x bore^2 x stroke x 16.387
TDC_volume  = cylinder_cc / (target_cr - 1)
chamber_cc  = TDC_volume - gasket_cc - deck_cc + dome_dish_cc
```

**Pinned worked example (a small-block V8).** bore 4.0, stroke 3.48, target 10.73:1, gasket bore 4.1 x 0.040, deck
0.005, dome 0: cylinder = 716.7 cc, `TDC = 716.7 / 9.73 = 73.66 cc`, `chamber = 73.66 - 8.65 - 1.03 = ` **64.0 cc**;
feeding 64 cc back through `displacement-cr` returns 10.73:1, the input. **Cross-check (a pump-gas target).** Same
cylinder targeting 9.0:1: `TDC = 716.7 / 8 = 89.59 cc`, `chamber = ` **79.9 cc** -- a lower CR needs a bigger chamber.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`) placed in the LATER Group K section beside `engine-fuel-burn-gph`,
NOT beside `displacement-cr` in the original block -- the Group K audit-coverage test asserts exactly 12 ids in the
`// Group K: Mechanic`..`// Group L` block, so the row must stay out of it; a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (compression-ratio identity solved for chamber, `GOVERNANCE.general` matching the sibling, the note
per §1); `test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`chamber-cc-for-cr` ->
`computeChamberCcForCr` in `../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `displacement-cr` /
`volumetric-efficiency` / `hp-from-torque`, and the forward tile links back); `data/search/aliases.json` ("chamber
volume for a target compression ratio", "how much to mill the head for compression", "cc the heads for a target cr",
plus adjacent rows); the calc-mechanic RENDERERS map entry `"chamber-cc-for-cr": renderChamberCcForCr` via the module's
`_simpleRenderer` factory (mirroring `displacement-cr`) and the id added to the calc-mechanic declare list in `app.js`;
the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning both examples, the lower-CR-bigger-chamber check, the round-trip through
`computeDisplacementCR` (including a domed piston), and the error seams. The calc-mechanic.js gzip cap is expected to
hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 64.0 cc chamber for 10.73:1).

## 5. Roadmap position

Pairs the forward engine tile (`displacement-cr`, CR from chamber) with its inverse (chamber from a target CR), the two
halves of the compression-build question. Further Group K growth stays evidence-driven.
