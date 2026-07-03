# roughlogic.com Specification v286 -- Standard Hook Tension Development Length (ACI 318-19 25.4.3) (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.101.0; proposed 2026-07-02). Batch spec-v284..v286 (the reinforced-concrete member depth trio -- tied
> column (v284), punching shear (v285), the standard hook (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `rc-development-length` computes the straight-bar
> tension development length and ends "hooks ... are separate checks." Where a straight bar cannot fit -- a beam bar
> anchoring into a column, a bar terminating at a wall corner -- the detailer uses a standard 90 or 180 degree hook, whose
> development length `ldh` follows a different ACI equation. Adds one tile to the existing **`calc-concrete.js`** module
> (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v285.md.
>
> **The gap, and the evidence for it.** ACI 318-19 Eq. 25.4.3.1a gives the hooked-bar tension development length as
> `ldh = ( fy psi_e psi_r psi_o psi_c / (55 lambda sqrt(f'c)) ) db^1.5`, not less than `max(8 db, 6 in)`, where `psi_e`
> (epoxy), `psi_r` (confining reinforcement), `psi_o` (side cover), and `psi_c` (concrete strength,
> `psi_c = f'c/15,000 + 0.6` for `f'c < 6,000 psi`) are the 25.4.3.2 modification factors. For a #8 Grade 60 bar in
> 4,000 psi normalweight concrete with all modification factors at their base (uncoated, standard confinement and cover),
> `psi_c = 4,000/15,000 + 0.6 = 0.867` and `ldh = (60,000 x 0.867 / (55 x 1 x 63.25)) x 1.0^1.5 = 15.0 in` -- the embedment
> a beam bar needs into a column, and a number the old "hook = some multiple of db" rule of thumb never captured because it
> scales with `db^1.5`, not `db`. `rc-development-length` handles the straight bar; this tile handles the hook.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The bar diameter `db` is a
length (in); `fy` and `f'c` are stresses (psi); the modification factors `psi_e`, `psi_r`, `psi_o`, `psi_c` and the
lightweight factor `lambda` are dimensionless; the development length `ldh` is a length (in). The v18/v21 contract: any
non-finite input, or a bar diameter or strength at or below zero, returns `{ error }`; the `max(8 db, 6 in)` floor is
applied after the equation. Citation discipline (v19/v22): `GOVERNANCE.general` over the ACI 318-19 25.4.3 provisions by
name; `editionNote` names **the ACI 318-19 Eq. 25.4.3.1a `ldh = (fy psi_e psi_r psi_o psi_c / (55 lambda sqrt(f'c))) db^1.5`,
the 25.4.3.2 factors (`psi_e` 1.0/1.2/1.3 for coating, `psi_r`, `psi_o`, `psi_c = f'c/15,000 + 0.6` for `f'c < 6,000 psi`),
and the `max(8 db, 6 in)` minimum**, and states that **this returns the tension development length of a standard 90 or 180
degree hooked deformed bar -- it applies the modification factors as entered (defaulting to the base 1.0 values), assumes
`f'c <= 6,000 psi` for the `psi_c` form and normalweight concrete unless `lambda` is set, and does not cover headed bars
(25.4.4), compression development, or the hook geometry/bend-diameter detailing; and this is a design aid, not a substitute
for a licensed engineer's detailing** -- the structural engineer of record's stamped detailing governs.

## 2. The tile

### 2.1 `rc-hook-development` -- Standard Hook Tension Development Length (ACI 318-19 25.4.3)

```
inputs:
  db_in    in     bar diameter (0.5 #4, 0.625 #5, 0.75 #6, 0.875 #7, 1.0 #8, 1.128 #9)
  fy_psi   psi    steel yield strength
  fc_psi   psi    concrete compressive strength (<= 6000 for psi_c form)
  psi_e    -      epoxy factor (1.0 uncoated, 1.2/1.3 coated) default 1.0
  psi_r    -      confining-reinforcement factor (default 1.0)
  psi_o    -      side-cover/location factor (default 1.0)
  lambda   -      lightweight factor (default 1.0)

psi_c = (fc_psi < 6000) ? (fc_psi/15000 + 0.6) : 1.0
ldh   = ( fy_psi * psi_e * psi_r * psi_o * psi_c / (55 * lambda * sqrt(fc_psi)) ) * db_in^1.5
ldh   = max(ldh, 8*db_in, 6)                       ; apply the floor
```

**Pinned worked example (a #8 Grade 60 bar, 4,000 psi, all factors base).** `db = 1.0`, `fy = 60,000`, `fc = 4,000`, all
`psi = 1.0`, `lambda = 1`: `psi_c = 4,000/15,000 + 0.6 = 0.867`;
`ldh = (60,000 x 0.867 / (55 x 63.25)) x 1.0^1.5 = 52,020/3,479 = 15.0 in`, above the `max(8 x 1.0, 6) = 8 in` floor, so
`ldh = 15.0 in`. **Cross-check (a #5 bar, same concrete).** `db = 0.625`: the `db^1.5` term scales it,
`ldh = 15.0 x (0.625/1.0)^1.5 = 15.0 x 0.494 = 7.4 in`, above the `max(8 x 0.625, 6) = 6 in` floor, so `ldh = 7.4 in` -- a
smaller bar hooks in a third less length, the `db^1.5` dependence a linear rule of thumb gets wrong. The non-finite and
non-positive error paths bracket the result, and the floor governs for the smallest bars.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching `rc-development-length`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the ACI 318-19 25.4.3 provisions, `editionNote` naming
Eq. 25.4.3.1a, the `psi` factors, `psi_c = f'c/15,000 + 0.6`, and the `max(8 db, 6 in)` floor, plus the standard-hook,
base-factor, not-headed-bar caveats); `test/fixtures/worked-examples.json` (the #8 example + the #5 cross-check);
`test/fixtures/compute-map.js` (`rc-hook-development` -> `computeRcHookDevelopment` in `../../calc-concrete.js`);
`scripts/related-tiles.mjs` (-> `rc-development-length` / `rebar-lap-splice` / `rc-beam-flexure` / `rebar`);
`data/search/aliases.json` ("hook development length", "ldh", "hooked bar", "standard hook", "ACI 25.4.3", "90 degree hook
rebar", "bar anchorage hook", "rebar hook embedment", "development of standard hook"); the id appended to the existing
concrete renderers block in `app.js`; the `// dims:` annotation (`db` length, strengths stress, `psi` factors dimensionless,
`ldh` length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the `db^1.5`
scaling, the `psi_c` branch at 6,000 psi, the `max(8 db, 6 in)` floor, and the non-positive / non-finite error seams. No new
module; re-pin `calc-concrete.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the `db^1.5` and floor assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `psi_c` / `ldh` pair wraps on a
phone); render-no-nan + a11y sweep, output read to the value (#8 at 4,000 psi -> 15.0 in).

## 5. Roadmap position

Closes the reinforced-concrete member depth batch (v284..v286) in `calc-concrete.js`: column, punching shear, and the hook
now stand beside beam flexure, beam shear, and straight-bar development. Headed-bar development (25.4.4), compression
development length, and the hook bend-diameter/geometry detailing table are the deliberate next follow-ons once the trio
lands.
