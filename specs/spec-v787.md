# roughlogic.com Specification v787 -- Draft Beer Line Balancing (calc-kitchen.js, Group O, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`** (Group O),
> no new module, group, or dependency. Inherits spec.md through spec-v786.md. Explore sweep #21 (entry 2).
>
> **The gap, and the evidence for it.** Every bar and kegerator owner fights foamy or slow pours, and the fix is a
> **balanced beer line**: the tubing length whose restriction exactly absorbs the applied CO2 pressure against the rise
> and faucet. No tile does it. `line = (applied_pressure - 0.5 x rise - 1) / R`. The number this settles: a **12 psi**
> system with a **4 ft** rise on **3/16" vinyl** (3.0 psi/ft) needs `(12 - 2 - 1)/3 = ` **3.0 ft** of line. Grep confirmed
> no beer-line / keg / draught tile exists (`beer` hits only `beer-lambert` in the lab module and a pour-cost note).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group O
kitchen siblings (`kitchen-sanitizer-ppm`, `drink-abv-dilution`): the applied pressure carries `M L^-1 T^-2`, the rise
carries `L`, the tubing type is dimensionless, and the balanced line length carries `L`. The tubing restriction is a
tabulated material property (psi/ft) selected by size, the same pattern the sanitizer-band and dilution tiles use. The
v18/v21 contract: a non-finite input (via `_finiteGuard`), an unknown tubing type, or a non-positive applied pressure
returns `{ error }`; a non-positive computed length is returned with a `balanced: false` flag and a rebalance note (not
an error, since it is a real diagnostic). Citation discipline (v19/v22): draft-beer line balancing by name (Brewers
Association Draught Beer Quality Manual), `GOVERNANCE.general` matching the siblings; the note states the system-balance
basis (applied pressure = line + rise + faucet), that the applied pressure is set to the carbonation level first, that
the restriction values are nominal at cellar temperature, and that the pour rate should be measured and the line trimmed.

## 2. The tile

### 2.1 `draft-beer-line-balance` -- Draft Beer Line Balancing

```
inputs:
  applied_pressure_psi   CO2 regulator pressure (= the beer's carbonation level)
  rise_ft                vertical rise, keg to faucet (ft)
  tubing_type            3/16" vinyl (3.0) | 1/4" vinyl (0.85) | 3/16" barrier (2.2) | 5/16" vinyl (0.4)

R           = restriction of the chosen tubing (psi/ft)
line_length = (applied_pressure_psi - 0.5 x rise_ft - 1) / R
balanced    = line_length > 0
```

**Pinned worked example.** 12 psi, 4 ft rise, 3/16" vinyl (R = 3.0): `line = (12 - 0.5x4 - 1)/3.0 = (12 - 2 - 1)/3 = ` **3.0
ft**. A less-restrictive 1/4" vinyl (0.85 psi/ft) needs a much longer line (about 10.6 ft) for the same pressure; a taller
rise shortens the balanced length. If the applied pressure barely exceeds the rise plus the ~1 psi faucet allowance, no
positive length balances it (`balanced: false`), which flags an under-pressured or over-restricted system.

## 3. Wiring

A `tools-data.js` row (group `O`, trades `["kitchen", "food-service"]`) beside `overrun-percent` (Group O is not
exact-count-audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (Brewers Association, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`draft-beer-line-balance` ->
`computeDraftBeerLineBalance`); `scripts/related-tiles.mjs` (-> `pour-cost` / `drink-abv-dilution` /
`kitchen-sanitizer-ppm`); `data/search/aliases.json` (5 collision-checked aliases: "beer line balancing", "kegerator
line length", "foamy draft beer fix", ...); the calc-kitchen `KITCHEN_RENDERERS` map entry via the `_r` renderer factory
with a tubing select, and the id added to the calc-kitchen declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the
example, the tubing monotonicity, the under-pressured branch, and the error seams. The calc-kitchen.js gzip cap is
unchanged (the addition fits under the current cap). Verify at build, including `check-shells`. Lazy-loaded, absent from
home first paint. Home tile count 1,235 -> 1,236.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (12 psi, 4 ft, 3/16" vinyl -> 3.0 ft).

## 5. Roadmap position

Adds the draft-system tuning calc every bar and kegerator owner needs -- beer-line balancing -- to the kitchen /
food-service bench, beside the sanitizer and cocktail-dilution tiles. Continues Explore sweep #21 (lightning
rolling-sphere protection queued next). A keg-CO2-carbonation-pressure tile (set pressure from style and temperature) is
the natural companion; it stays evidence-driven.
