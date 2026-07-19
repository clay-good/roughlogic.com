# roughlogic.com Specification v990 -- Radiator EDR to Heat Output (calc-pipefit.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-pipefit.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v989.md. Beside `boiler-horsepower` and
> `steam-boiler-blowdown` in the steam/hydronic family.
>
> **The gap, and the evidence for it.** `boiler-horsepower` converts a boiler's nameplate rating INTO an EDR (steam
> basis, 139 sq ft/BHP), but nothing goes the other way -- from the radiators counted in a building to the heat load
> and boiler size, on either steam OR hot water, with the sizing pickup. Grep confirmed no EDR-to-output tile. The
> number this settles: 320 sq ft EDR on steam is **76,800 BTU/hr**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, BTU/hr from sq ft and a ratio), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive EDR or
EDR constant, or a negative pickup returns `{ error }`. Citation discipline (v19/v22): the EDR heat-output conversion
by name (Hydronics Institute / I=B=R basis), `GOVERNANCE.general`; the note gives the 240 (steam) / 150 (hot water)
constants and the ~0.33 / ~0.15 pickup factors, distinguishes it from the steam-only `boiler-horsepower` conversion,
and stresses that the radiator EDR, the real piping and pickup, and the boiler's I=B=R net rating govern.

## 2. The tile

### 2.1 `radiator-edr-output` -- Radiator EDR to Heat Output

```
inputs:
  edr_sqft       connected EDR (sq ft), default 320
  system_k       EDR heat constant (BTU/hr per sq ft): 240 steam, 150 hot water, default 240
  pickup_factor  I=B=R boiler pickup (0.33 steam, 0.15 hot water), default 0.33

heat_output_btu_hr  = edr_sqft x system_k
gross_boiler_btu_hr = heat_output_btu_hr x (1 + pickup_factor)
```

**Pinned worked example.** 320 sq ft EDR on steam (k 240), 0.33 pickup: `Q = 320 x 240 = ` **76,800 BTU/hr**; gross
boiler `= 76,800 x 1.33 = ` **102,144 BTU/hr**, selected by its NET steam rating. Cross-check: 360 sq ft EDR on hot
water (k 150), 0.15 pickup: `Q = 360 x 150 = ` **54,000 BTU/hr**; gross `= 54,000 x 1.15 = ` **62,100 BTU/hr**.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["pipefitting", "plumbing"]`, beside `boiler-horsepower`); a `tile-meta.js`
`_TILES` entry (`B`); a `citations.js` entry (Hydronics Institute / I=B=R EDR conversion, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the steam base plus the hot-water cross-check, pinning the heat output and gross
boiler); `test/fixtures/compute-map.js` (`radiator-edr-output` -> `computeRadiatorEdrOutput`, module
`../../calc-pipefit.js`); `scripts/related-tiles.mjs` (-> `boiler-horsepower` / `manual-j-heating` /
`steam-boiler-blowdown`); `data/search/aliases.json` (5 collision-checked aliases: "radiator edr", "edr", "equivalent
direct radiation", "radiator heat output", "edr to btu"), then `node scripts/build-alias-shards.mjs`; a hand-written
renderer in the `PIPEFIT_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-pipefit declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the steam-vs-hot-water and
zero-pickup directions, the linear EDR scaling, and the error seams. The calc-pipefit.js gzip cap and the Group B group
shell are watched at build (cap raised for this tile). Home tile count 1,438 -> 1,439.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(320 sq ft x 240 -> 76,800 BTU/hr, 102,144 gross).

## 5. Roadmap position

Steam/hydronic heating beside `boiler-horsepower`, serving the steamfitter / heating contractor (pipefitting,
plumbing). Deliberately the counting-radiators direction with the sizing pickup; the actual radiator EDR, the real
piping and pickup, and the boiler's I=B=R net rating govern the selection. Stays evidence-driven. Continues the
steam/hydronic sweep at 1 new spec (v990).
