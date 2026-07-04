# roughlogic.com Specification v470 -- Minimum Roof Snow Load (ASCE 7 7.3.4) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-04). Third and final tile of the snow-load-provisions trio (v468 rain-on-snow surcharge ->
> v469 sliding snow -> v470 minimum roof snow). `snow-load` computes the flat-roof snow from the ground snow and the
> coefficients, but on a low-slope roof a separate minimum can govern, and no tile applies it.**
> In-scope catalog expansion under the spec-v106 trades-only charter. On low-slope roofs, ASCE 7 §7.3.4 enforces a minimum
> snow load so a light exposure or thermal factor cannot drop the design below a floor: `pm = Is * pg` when the ground snow
> `pg` is `20 psf` or less, and `pm = 20 * Is` when `pg` is over `20 psf`, with `Is` the snow importance factor. The design
> load is the greater of the computed flat-roof snow and this minimum. `snow-load` never applies the floor. This adds the
> minimum tile to the existing **`calc-construction.js`** module (Group E); no new group, trade, or dependency. Inherits
> spec.md through spec-v469.md.
>
> **The gap, and the evidence for it.** In a `pg = 15 psf` region (`<= 20`) at `Is = 1.0`, the minimum is `pm = 1.0 * 15 =
> 15 psf`, so a computed flat-roof snow below `15 psf` is raised to it. In a `pg = 30 psf` region the minimum caps at
> `pm = 20 * 1.0 = 20 psf`; an essential facility (`Is = 1.1`) in a `pg = 25 psf` region gets `pm = 20 * 1.1 = 22 psf`. No
> tile does this; a designer could unknowingly design below the code minimum.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The ground snow, the computed
flat-roof snow, and the minimum are pressures (psf); the importance factor is dimensionless. The v18/v21 contract: any
non-finite input, or a non-positive ground snow or importance factor, returns `{ error }`; the tile applies the two-branch
minimum and, when a computed flat-roof snow is given, reports the governing (greater) design value. Citation discipline
(v19/v22): `GOVERNANCE.general` over the ASCE 7 minimum snow load by name; `editionNote` names **ASCE 7 §7.3.4, the minimum
roof snow load `pm = Is * pg` for `pg <= 20 psf` and `pm = 20 * Is` for `pg > 20 psf`, `Is` the snow importance factor
(Table 1.5-2), that it applies to low-slope roofs (slope less than `15 degrees`), and that the design load is the greater of
the computed flat-roof snow and this minimum**, and states that **this returns the minimum roof snow load and the governing
value, that it does not apply where other provisions (drift, sliding) already govern, and that it is a design aid, not a
substitute for the engineer of record**.

## 2. The tile

### 2.1 `minimum-roof-snow` -- Minimum Roof Snow Load (ASCE 7 7.3.4)

```
inputs:
  pg_psf        psf   ground snow load
  importance    -     snow importance factor Is (Table 1.5-2)
  pf_computed   psf   computed flat-roof snow load (optional, for the governing value)

pm = (pg_psf <= 20) ? importance * pg_psf : 20 * importance
governing = max(pm, pf_computed)
```

**Pinned worked example (pg 15 psf, Is 1.0).** `pm = 1.0 * 15 = 15 psf` (the `pg <= 20` branch). **Cross-check (deep snow
and an essential facility).** At `pg = 30 psf`, `Is = 1.0`, the minimum caps at `pm = 20 * 1.0 = 20 psf`; at `pg = 25 psf`,
`Is = 1.1`, `pm = 20 * 1.1 = 22 psf`. The design load is the greater of this minimum and the computed flat-roof snow. A
non-positive ground snow or importance factor takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, beside `snow-load`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, ASCE 7 §7.3.4, `editionNote` naming the two-branch minimum, the
importance factor, and the low-slope/governing notes); `test/fixtures/worked-examples.json` (the pg-15 example + the deep-
snow and essential-facility cross-checks); `test/fixtures/compute-map.js` (`minimum-roof-snow` -> `computeMinimumRoofSnow`
in `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `snow-load` / `rain-on-snow-surcharge` /
`sliding-snow-load` / `snow-drift-load`); `data/search/aliases.json` ("minimum roof snow", "minimum snow load", "asce
7.3.4", "pm snow", "snow load minimum", "Is pg snow", "roof snow floor", "low slope snow minimum", "snow importance
factor"); the id appended to the existing construction renderers block in `app.js`; the `// dims:` annotation (loads
pressure, importance dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the three
cases, the two-branch switch, the governing value, and the non-positive / non-finite error seams. No new module; re-pin
`calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+3 fixtures, the new fuzzer block, the two-branch switch, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the pm / governing output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (pg 15, Is 1.0 -> 15 psf).

## 5. Roadmap position

Closes the snow-load-provisions trio: v468 rain-on-snow, v469 sliding, and v470 the minimum floor, rounding out ASCE 7
Chapter 7 beyond the balanced load and the drift. A partial-loading / unbalanced-load pattern tile is the deliberate next
follow-on.
