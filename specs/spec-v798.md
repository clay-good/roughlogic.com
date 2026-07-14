# roughlogic.com Specification v798 -- Flat Glass Lite Weight (calc-finish.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v797.md. Explore sweep #23 (entry 2).
>
> **The gap, and the evidence for it.** Glaziers and carpenters size a glass lift by its **weight**, and no tile does it
> (`metal-weight` covers alloys only; the one `glass` hit repo-wide is `window-solar-heat-gain`, an SHGC load). Glass is
> density x volume: soda-lime float runs ~13.0 lb/ft^2 per inch of thickness. The number this settles: a **60 x 40 in**
> lite of **1/4"** glass is **16.7 ft^2** and **54 lb** -- past the ~50 lb one-person limit. Grep confirmed no glass-weight
> / lite-weight / glazing tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
finish siblings (`deck-board-takeoff`, `gutter-downspout`): the width, height, and thickness carry `L`, the pane count is
dimensionless, the area carries `L^2`, the weight carries `M`, and the weight per square foot carries `M L^-2`. The
v18/v21 contract: a non-finite input (via `_finiteGuard`), a non-positive width, height, or thickness, or a pane count
below 1 returns `{ error }`. Citation discipline (v19/v22): flat glass lite weight by name (NGA Glazing Manual
glass-weight table; ASTM C1036 flat glass), `GOVERNANCE.general` matching the siblings; the note states the density x
volume basis, the soda-lime SG 2.50 / 156.1 lb/ft^3 / ~13.0 lb/ft^2-per-inch constant, that tempering does not change
the weight, that an IGU is the sum of its lites, that the ~50 lb one-person limit sizes the lift, and the honest ~1%
material tolerance (published tables run 13.0-13.1) -- a physical-property tolerance, not a formula-convention split.

## 2. The tile

### 2.1 `glass-weight` -- Flat Glass Lite Weight

```
inputs:
  width_in, height_in   lite dimensions (in)
  thickness_in          glass thickness (in, e.g. 0.25 for 1/4")
  panes                 identical panes (1 lite; 2 for an equal IGU)

area_ft2       = width_in x height_in / 144
weight_per_ft2 = 156.1 x thickness_in / 12        (~13.0 lb/ft^2 per inch)
weight_lb      = area_ft2 x weight_per_ft2 x panes
two_person     = weight_lb > 50
```

**Pinned worked example.** 60 x 40 in, 1/4" (0.25"), 1 pane: `area = 2400/144 = ` **16.67 ft^2**; `weight = 156.1 x 16.67
x 0.25/12 = ` **54.2 lb** (the NGA table's 3.27 lb/ft^2 x 16.67 = 54.5, within 1%), flagged for a two-person lift.
Weight is linear in thickness and in pane count.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry"]`) beside `deck-board-takeoff`; a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (NGA / ASTM C1036, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example,
two pinned outputs); `test/fixtures/compute-map.js` (`glass-weight` -> `computeGlassWeight`);
`scripts/related-tiles.mjs` (-> `metal-weight` / `deck-board-takeoff` / `gutter-downspout`); `data/search/aliases.json`
(5 collision-checked aliases: "glass weight", "how much does a glass lite weigh", "can one person lift this glass", ...);
the calc-finish `FINISH_RENDERERS` map entry via the `_simpleRenderer` factory (non-exported, so no DOM-sentinel row) and
the id added to the calc-finish declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the weight, the per-sqft,
the two-person flag, the thickness/panes linearity, and the error seams. The tile keeps trades `["carpentry"]` (not a new
"glazing" trade) to avoid minting a new trade-group shell. The calc-finish.js gzip cap is unchanged (the addition fits
under the current cap). Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile
count 1,246 -> 1,247.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (60 x 40 in, 1/4" -> 54.2 lb).

## 5. Roadmap position

Adds the glass-handling weight check to the finish / carpentry bench. Continues Explore sweep #23 (an aggregate
fineness-modulus tile and a water-cementitious-ratio tile are the remaining, weaker survivors). The catalog is now very
saturated; the next batch will likely need a fresh sweep into a less-mined trade domain.
