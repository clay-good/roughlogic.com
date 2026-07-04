# roughlogic.com Specification v468 -- Rain-on-Snow Surcharge (ASCE 7-22 7.10) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of a snow-load-provisions trio (v468 rain-on-snow surcharge -> v469 sliding
> snow -> v470 minimum roof snow). `snow-load` gives the balanced flat-roof snow and `snow-drift-load` the leeward drift, but
> neither adds the rain-on-snow surcharge that catches the extra weight of rain soaking into a low-slope roof's snowpack.**
> In-scope catalog expansion under the spec-v106 trades-only charter. On a nearly flat roof, rain falling on snow cannot drain
> and adds weight. ASCE 7-22 §7.10 adds a rain-on-snow surcharge to the balanced snow load where the ground snow `pg` is
> `20 psf` or less and the roof slope is low (less than `W/50` in degrees, roughly under `1/2 in` per ft): `8 psf` in ASCE
> 7-22 (it was `5 psf` in 7-16 and earlier). `snow-load` never applies it. This adds the surcharge tile to the existing
> **`calc-construction.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v467.md.
>
> **The gap, and the evidence for it.** A low-slope roof with a `15 psf` balanced snow load in a `pg = 18 psf` (`<= 20`)
> region gets an `8 psf` rain-on-snow surcharge, for `23 psf` total under ASCE 7-22 (it would be `20 psf` under the older
> `5 psf` surcharge). Where the ground snow exceeds `20 psf`, the surcharge does not apply -- deep snow country does not add
> it. No tile does this; a designer had the balanced load but not the rain-on-snow addition.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The flat-roof snow load, the
ground snow, the surcharge, and the total are pressures (psf); the roof slope is an angle (deg, handled dimensionlessly).
The v18/v21 contract: any non-finite input, or a non-positive flat-roof snow load, returns `{ error }`; the surcharge
applies only when `pg <= 20 psf` and the slope is low, and the tile reports whether the surcharge applies and the resulting
total. Citation discipline (v19/v22): `GOVERNANCE.general` over the ASCE 7 rain-on-snow surcharge by name; `editionNote`
names **ASCE 7-22 §7.10, the rain-on-snow surcharge of `8 psf` (ASCE 7-22; `5 psf` in 7-16 and earlier) added to the
balanced snow load, the conditions (`pg <= 20 psf` and a low slope, less than `W/50` degrees), and that it applies only to
the balanced load case**, and states that **this returns the rain-on-snow surcharge and the total, that the slope and
ground-snow conditions gate it, and that it is a design aid, not a substitute for the engineer of record**.

## 2. The tile

### 2.1 `rain-on-snow-surcharge` -- Rain-on-Snow Surcharge (ASCE 7-22 7.10)

```
inputs:
  pf_psf          psf   balanced flat-roof snow load
  pg_psf          psf   ground snow load
  slope_deg       deg   roof slope
  eave_to_ridge_ft ft   horizontal eave-to-ridge distance W
  surcharge_psf   psf   surcharge value (default 8 for ASCE 7-22)

applies = (pg_psf <= 20) AND (slope_deg < eave_to_ridge_ft/50)
total   = pf_psf + (applies ? surcharge_psf : 0)
```

**Pinned worked example (pf 15 psf, pg 18 psf, low slope).** surcharge applies (`pg <= 20`), so `total = 15 + 8 = 23 psf`
under ASCE 7-22 (it would be `20 psf` under the older `5 psf`). **Cross-check (deep-snow region).** At `pg = 25 psf` the
surcharge does not apply, so the total stays `15 psf`. A non-positive flat-roof snow load takes the error path; the
non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, beside `snow-load` / `snow-drift-load`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, ASCE 7-22 §7.10, `editionNote` naming the
`8 psf` (7-22) / `5 psf` (7-16) surcharge, the `pg <= 20` and low-slope conditions);
`test/fixtures/worked-examples.json` (the applies example + the deep-snow cross-check); `test/fixtures/compute-map.js`
(`rain-on-snow-surcharge` -> `computeRainOnSnowSurcharge` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (->
`snow-load` / `snow-drift-load` / `sliding-snow-load` / `minimum-roof-snow`); `data/search/aliases.json` ("rain on snow",
"rain-on-snow surcharge", "asce 7.10", "snow surcharge", "5 psf rain snow", "8 psf rain snow", "low slope snow", "snow load
surcharge", "roof rain snow"); the id appended to the existing construction renderers block in `app.js`; the `// dims:`
annotation (loads pressure, slope dimensionless, W length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the applies condition, and the non-positive / non-finite error seams. No new module; re-pin
`calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the applies condition, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the surcharge / total output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (pf 15, pg 18 -> 23 psf).

## 5. Roadmap position

Opens the snow-load-provisions trio: `sliding-snow-load` (v469) and `minimum-roof-snow` (v470) continue the ASCE 7 Chapter 7
provisions. An unbalanced-gable-snow (§7.6.1) mode is the deliberate next follow-on.
