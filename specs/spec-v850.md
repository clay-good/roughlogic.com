# roughlogic.com Specification v850 -- Roofing Nail Count by Wind Zone (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v849.md. Roofing install-ops sweep, beside
> `roofing-squares` and `ridge-cap-fasteners`.
>
> **The gap, and the evidence for it.** `roofing-squares` counts bundles but nothing counts the **nails**, where the wind
> zone drives the nailing pattern (four per shingle standard, six on steep or high-wind roofs). Grep confirmed no shingle-
> nail / roofing-fastener-count tile. The number this settles: a 30-square roof at 80 shingles per square, six-nailed for
> high wind, takes **14,400 nails** -- about **103 lb** of 1-1/4 in roofing nails -- half again the standard four-nail
> pattern's order.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
roofing siblings (`roofing-squares`, `ridge-cap-fasteners`): the squares, shingles-per-square, nails-per-shingle, and
nails-per-pound are dimensionless counts, and the nail weight carries `M`. The v18/v21 contract: a non-finite or
non-positive squares, shingles-per-square, nails-per-shingle, or nails-per-pound returns `{ error }`. Citation discipline
(v19/v22): the fastener-count identity by name (nails = squares x shingles-per-square x nails-per-shingle; weight = nails
/ nails-per-pound), `GOVERNANCE.general`; the note states that the nails-per-shingle comes from the manufacturer and the
wind zone (IRC and most manufacturers require six on steep or high-wind roofs and along the eaves, four elsewhere), that
the shingles-per-square depends on the product (about 80 for three-tab, 64 for many architectural shingles), and that this
counts field fasteners, not the ridge and hip caps (`ridge-cap-fasteners`).

## 2. The tile

### 2.1 `shingle-nails` -- Roofing Nail Count by Wind Zone

```
inputs:
  squares             roof area (squares)
  shingles_per_square shingles per square (count, default 80)
  nails_per_shingle   nails per shingle (count, default 4)
  nails_per_lb        nails per pound (count, default 140)

nails_total    = squares * shingles_per_square * nails_per_shingle
nail_weight_lb = nails_total / nails_per_lb
```

**Pinned worked example.** Squares 30, 80 shingles/square, 6 nails/shingle (high wind), 140 nails/lb:
`nails = 30 * 80 * 6 = ` **14,400**; `weight = 14400 / 140 = ` **102.9 lb**. Cross-check: the standard four-nail pattern is
`30 * 80 * 4 = ` **9,600 nails** (68.6 lb) -- the nailing pattern, set by the wind zone, is the lever, and the eaves and
rakes get the six-nail pattern regardless.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["roofing", "carpentry"]`, inside the `// Group E` construction block beside
`roofing-squares`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (nails = squares x shingles/sq x nails/shingle, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned high-wind example plus the standard-pattern cross-check);
`test/fixtures/compute-map.js` (`shingle-nails` -> `computeShingleNails`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `roofing-squares` / `ridge-cap-fasteners` / `metal-roof-panels`);
`data/search/aliases.json` (5 collision-checked aliases: "shingle nails", "roofing nail count", "roof fastener count",
"nails per square roofing", "roofing nail pounds"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring
the `roofing-squares` renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the nail count, the weight, and the error seams (non-positive
squares, shingles-per-square, nails-per-shingle, nails-per-lb). The calc-construction.js gzip cap is watched at build.
Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint.
Home tile count 1,298 -> 1,299.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(30 * 80 * 6 -> 14,400 nails, 102.9 lb).

## 5. Roadmap position

Roofing install-ops tile beside `roofing-squares` (bundles) and `ridge-cap-fasteners`, serving the roofer (roofing /
carpentry). Stays evidence-driven; the manufacturer and wind zone set the pattern.
