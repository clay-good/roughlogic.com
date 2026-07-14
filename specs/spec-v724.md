# roughlogic.com Specification v724 -- Press-Brake Max Bendable Thickness (calc-shop.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`** (Group E), no
> new module, group, or dependency. Inherits spec.md through spec-v723.md. Sweep-11 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `press-brake-tonnage` tile runs the air-bend rule forward: from a
> thickness it returns the tonnage a bend needs. The everyday shop question is the inverse -- **the thickest material a
> given press can air-bend**. From `total_tons = 575 x (UTS/60) x T^2 / V x L`, solving for T gives
> `T = sqrt( total_tons x V / (575 x (UTS/60) x L) )`. The number this settles: a **100-ton** press with a **0.5 in**
> V-die over a **4 ft** bend in mild steel tops out at **~0.147 in**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`press-brake-tonnage` sibling: the thickness, V-die opening, and bend length are `L` (in, in, ft) and the tonnage and
tensile strength are dimensionless. It reuses the sibling's published 575 mild-steel air-bend constant, the strength
scaling, and the 8 x T recommended-die advisory. The v18/v21 contract: any non-finite input, or a non-positive tonnage,
V-die opening, bend length, or tensile strength returns `{ error }`. Citation discipline (v19/v22): the air-bend tonnage
rule solved for the thickness, `GOVERNANCE.general` matching the sibling, empirical method as published in press-brake
tonnage charts / Machinery's Handbook; the note states that **this is air bending only -- bottoming and coining need
several times the tonnage -- that a die opening near 8 x T keeps the part on the die shoulders (a wider die lowers the
tonnage but opens the radius), and the die maker's tonnage chart governs the final setup**.

## 2. The tile

### 2.1 `press-brake-max-thickness` -- Press-Brake Max Bendable Thickness

```
inputs:
  available_tonnage_tons   dimensionless   press capacity (> 0)
  die_opening_in           L               V-die opening (> 0)
  bend_length_ft           L               bend length (> 0)
  uts_ksi                  dimensionless   ultimate tensile strength (> 0, default 60)

max_thickness_in = sqrt( available_tonnage_tons x die_opening_in / (575 x (uts_ksi/60) x bend_length_ft) )
recommended_die_in = 8 x max_thickness_in
```

**Pinned worked example.** tonnage = 100, V = 0.5 in, L = 4 ft, mild steel (UTS 60):
`T = sqrt(100 x 0.5 / (575 x 1 x 4)) = sqrt(50 / 2300) = ` **0.147 in**; feeding 0.147 in back through
`press-brake-tonnage` at the same die/length/strength returns 100 tons, the input. Stronger stainless (UTS 90) drops the
max to ~0.120 in.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["fabrication","sheet-metal"]`) placed beside `press-brake-tonnage` (Group E is
un-audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (air-bend rule solved for the thickness,
`GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`press-brake-max-thickness` -> `computePressBrakeMaxThickness`);
`scripts/related-tiles.mjs` (-> `press-brake-tonnage` / `bend-allowance` / `min-bend-radius` / `metal-weight`);
`data/search/aliases.json` (5 collision-checked question aliases: "thickest material my press brake can bend", "how thick
can a 100 ton brake bend", ...); the calc-shop `SHOP_RENDERERS` map entry via a hand-written NON-exported renderer (four
number fields, a recommended-die readout) and the id added to the calc-shop declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js`
block pinning the example, the round-trip through `computePressBrakeTonnage` across a tonnage/die/strength sweep, the
stronger-material-thinner-bend monotonicity, and the error seams. The calc-shop.js gzip cap (raised to 24500 B in
spec-v721) is expected to hold. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home
tile count 1,172 -> 1,173.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 0.147 in for a 100-ton
press with a 0.5 in die over a 4 ft bend in mild steel).

## 5. Roadmap position

Pairs the forward tonnage tile (`press-brake-tonnage`, tonnage from a thickness) with its inverse (thickness from a
tonnage), the two halves of the press-capacity question. Further Group E shop-math growth stays evidence-driven.
