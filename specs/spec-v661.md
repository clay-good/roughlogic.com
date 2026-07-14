# roughlogic.com Specification v661 -- Injector Max Horsepower Capacity (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic), no new module, group, or dependency. Inherits spec.md through spec-v660.md.
>
> **The gap, and the evidence for it.** The `injector-size` tile (spec-v323) sizes injectors for a target power.
> The reverse is what a tuner with a set of injectors already in hand asks: "how much power will these support?"
> Inverting `inj_lbh = HP x BSFC / (n_cyl x duty)` gives `HP_max = inj_lbh x n_cyl x duty / BSFC`. First-principles;
> the constants (10.5 cc/min conversion, default BSFC 0.50, default duty 0.80) are already in the sibling. The
> pinned example: eight **31.25 lb/h** injectors at 80% duty and BSFC 0.50 support **400 hp**; the same injectors
> on boost (BSFC 0.60) fall to 333 hp.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The injector flow and
total fuel are `M T^-1`, the flow-unit selection is `dimensionless`, the injector count and duty are
`dimensionless`, the BSFC is `T^2 L^-2`, and the max power is `M L^2 T^-3`. The `10.5` cc/min conversion, the default
BSFC 0.50, and the default 80% duty are the same ones `injector-size` already uses. The v18/v21 contract: any
non-finite numeric input, a non-positive flow or BSFC, a non-integer or sub-1 injector count, or a duty outside
`(0, 1]` returns `{ error }`. Citation discipline (v19/v22): the injector-sizing relation solved for the power, the
inverse of the injector-size tile, by name; the note states that **HP_max = inj_lbh x n_cyl x duty / BSFC, the same
injectors support less power as BSFC rises with boost, and it is port injection with the entered BSFC** -- the
engine's measured fueling and the tuner's judgment govern.

## 2. The tile

### 2.1 `injector-max-hp` -- The Power a Fuel-Injector Set Supports

```
inputs:
  inj_flow    lb/h or cc/min   injector static flow (> 0)
  flow_unit   -                "lbh" | "ccmin"
  n_cyl       -                injector count (integer >= 1)
  duty        -                maximum duty cycle (0 < duty <= 1; default 0.80)
  bsfc        lb/hp-h          brake-specific fuel consumption (> 0; 0.50 NA, 0.55-0.65 boost)

inj_lbh   = flow_unit == "ccmin" ? inj_flow / 10.5 : inj_flow
total_lbh = inj_lbh x n_cyl x duty
hp_max    = total_lbh / bsfc
```

**Pinned worked example.** `31.25 lb/h`, `8 injectors`, `duty 0.80`, `BSFC 0.50`:
`total = 31.25 x 8 x 0.80 = 200 lb/h`, `HP_max = 200 / 0.50 = ` **400 hp** -- the exact inverse of the injector-size
example (400 hp -> 31.25 lb/h).
**Cross-check (boost caps power).** The same injectors at BSFC 0.60 support `200 / 0.60 = ` **333 hp** -- a richer
tune drops the ceiling.
**Cross-check (cc/min input).** 328.125 cc/min (= 31.25 lb/h) yields the same 400 hp.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`, beside `injector-size`); a `tile-meta.js` `_TILES` entry;
a `citations.js` entry (injector sizing inverted, the note per §1); `test/fixtures/worked-examples.json` (the pinned
example plus the boost cross-check); `test/fixtures/compute-map.js` (`injector-max-hp` -> `computeInjectorMaxHp`);
`scripts/related-tiles.mjs` (<-> `injector-size`, `volumetric-efficiency`, `hp-from-torque`, `displacement-cr`);
`data/search/aliases.json` ("injector max hp", "injector power capacity", "how much power can my injectors support",
plus question rows, all collision-checked); `MECHANIC_RENDERERS["injector-max-hp"]` via the `_simpleRenderer`
factory (a lb/h vs cc/min select; field DOM ids = the input keys) and the id added to the calc-mechanic declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the example, the exact inverse round-trip through `computeInjectorSize`, the
BSFC scaling, the cc/min conversion, and the error seams. The Group K citation-audit test parses only the original
`// Group K: Mechanic` tools-data block (which this later-section tile is not part of), so no count bump. The two
`index.html` home-count spots go 1,109 -> 1,110 (check-readme-counts gates them). The calc-mechanic.js gzip cap
(raised to 39000 in spec-v660) is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 400 hp).

## 5. Roadmap position

Completes the injector pair: `injector-size` (target power -> injector flow) and now `injector-max-hp` (injector
flow -> supported power), exact inverses through the same lb/h = HP x BSFC / (n_cyl x duty) relation. Further Group
K growth stays evidence-driven.
