# roughlogic.com Specification v297 -- Snow Drift Surcharge at a Roof Step or Parapet (ASCE 7 Ch. 7) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.105.0; proposed 2026-07-02). Batch spec-v296..v298 (the ASCE 7 wind-and-snow load depth trio -- C&C
> pressure (v296), the snow drift surcharge (this spec), the MWFRS pressure (v298)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `snow-load` returns the balanced flat-roof load `Pf`,
> but drifting snow piling against a higher roof, a parapet, or a rooftop unit adds a triangular surcharge that routinely
> doubles or triples the local load and collapses lower roofs -- the ASCE 7 §7.7/§7.8 drift the flat-roof tile never adds.
> Adds one tile to the existing **`calc-construction.js`** module (Group E); no new group, trade, or dependency. Inherits
> spec.md through spec-v296.md.
>
> **The gap, and the evidence for it.** ASCE 7 §7.7 takes the drift height as
> `hd = 0.43 (lu)^(1/3) (pg + 10)^(1/4) - 1.5` (for a leeward drift, `lu` the upwind fetch in ft, `pg` the ground snow in
> psf, `hd` in ft), the snow density as `gamma = 0.13 pg + 14 <= 30 pcf`, and the peak drift surcharge as `pd = hd gamma`
> over a drift width `w = 4 hd` (when `hd <= hc`), riding on top of the balanced load. For a leeward drift with a 100 ft
> upwind roof and `pg = 30 psf`, `gamma = 17.9 pcf`, `hd = 0.43 (100)^(1/3) (40)^(1/4) - 1.5 = 3.52 ft`, `w = 14.1 ft`,
> and `pd = 3.52 x 17.9 = 63 psf` of surcharge at the wall -- on top of the ~21 psf balanced load, a local peak near 84 psf
> that a lower roof framed for the balanced load alone never saw coming. `snow-load` gives the balanced load; this tile
> gives the drift that piles on it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The upwind fetch `lu` and the
drift height `hd` and width `w` are lengths (ft); the ground snow load `pg` and the peak drift surcharge `pd` are pressures
(psf); the snow density `gamma` is a unit weight (pcf). The v18/v21 contract: any non-finite input, or a fetch or ground
snow at or below zero, returns `{ error }`; a negative `hd` from the `- 1.5` term is floored at zero (no drift). Citation
discipline (v19/v22): `GOVERNANCE.general` over the ASCE 7 Chapter 7 drift provisions by name; `editionNote` names **the
ASCE 7-22 §7.7 leeward drift height `hd = 0.43 (lu)^(1/3) (pg + 10)^(1/4) - 1.5`, the §7.7.1 density
`gamma = 0.13 pg + 14 <= 30 pcf`, the surcharge `pd = hd gamma`, and the drift width `w = 4 hd` when `hd <= hc`**, and
states that **this returns the leeward-drift surcharge height, width, and peak load at a roof step or wall -- it uses the
leeward form (the windward drift uses `0.75 hd` and a different fetch), assumes `hd <= hc` (the full-height-triangle case;
when the drift reaches the upper roof the width becomes `w = 4 hd^2/hc <= 8 hc`), and does not add the balanced load beneath
it (`snow-load`), the sliding-snow surcharge (§7.9), or the unbalanced gable case (§7.6.1); and this is a design aid, not a
substitute for the engineer of record** -- the structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `snow-drift-load` -- Snow Drift Surcharge at a Roof Step or Parapet (ASCE 7 Ch. 7)

```
inputs:
  lu_ft    ft     upwind fetch (length of the upper/source roof)
  pg_psf   psf    ground snow load
  hc_ft    ft     clear height from the balanced snow to the top of the step (optional)

gamma = min(0.13*pg_psf + 14, 30)                             ; snow density, pcf
hd    = max(0.43 * lu_ft^(1/3) * (pg_psf + 10)^(1/4) - 1.5, 0); leeward drift height, ft
w     = (hc_ft == null OR hd <= hc_ft) ? 4*hd : min(4*hd^2/hc_ft, 8*hc_ft)  ; drift width, ft
pd    = hd * gamma                                            ; peak drift surcharge, psf
```

**Pinned worked example (a leeward drift, 100 ft upwind roof, pg = 30 psf).** `lu = 100`, `pg = 30`: `gamma = 0.13 x 30 + 14 = 17.9 pcf`;
`hd = 0.43 (100)^(1/3) (40)^(1/4) - 1.5 = 0.43 x 4.642 x 2.515 - 1.5 = 5.02 - 1.5 = 3.52 ft`; `w = 4 x 3.52 = 14.1 ft`;
`pd = 3.52 x 17.9 = 63.0 psf` of surcharge at the wall, tapering to zero over the 14.1 ft width. **Cross-check (a heavier
50 psf ground snow).** `gamma = 0.13 x 50 + 14 = 20.5 pcf`; `hd = 0.43 (100)^(1/3) (60)^(1/4) - 1.5 = 0.43 x 4.642 x 2.783 - 1.5 = 4.06 ft`;
`pd = 4.06 x 20.5 = 83.2 psf` -- a two-thirds heavier snow zone drives the surcharge up by a third, the reason ground-snow
maps drive the drift, not just the balanced load. The non-finite and non-positive error paths bracket the result, and the
`- 1.5` term correctly yields no drift for a very short fetch.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry","construction","roofing"]`, matching `snow-load`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the ASCE 7 Ch. 7 drift provisions, `editionNote` naming
`hd = 0.43 (lu)^(1/3)(pg+10)^(1/4) - 1.5`, `gamma = 0.13 pg + 14 <= 30`, `pd = hd gamma`, `w = 4 hd`, and the leeward,
`hd <= hc`, no-balanced-load caveats); `test/fixtures/worked-examples.json` (the 30 psf example + the 50 psf cross-check);
`test/fixtures/compute-map.js` (`snow-drift-load` -> `computeSnowDriftLoad` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `snow-load` / `rain-load-ponding` / `asce7-load-combinations` / `wind-cc-pressure`);
`data/search/aliases.json` ("snow drift", "drift surcharge", "roof step snow", "parapet snow drift", "ASCE 7 chapter 7",
"leeward drift", "hd drift height", "snow pile lower roof", "drift load"); the id appended to the existing construction
renderers block in `app.js`; the `// dims:` annotation (`lu`/`hd`/`w`/`hc` length, `pg`/`pd` pressure, `gamma` unit weight);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the `gamma` 30 pcf cap, the
`hd` floor at zero, the `w` two-branch, and the non-positive / non-finite error seams. No new module; re-pin
`calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the `gamma`-cap and `hd`-floor assertions); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `gamma` / `hd` / `w` / `pd`
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (100 ft, 30 psf -> hd 3.52 ft, 63 psf).

## 5. Roadmap position

Middle of the ASCE 7 wind-and-snow load depth batch (v296..v298) in `calc-construction.js`, adding the drift surcharge the
flat-roof tile could not. The MWFRS pressure (v298) follows. The windward-drift `0.75 hd` case, the sliding-snow surcharge
(§7.9), and the unbalanced-gable distribution (§7.6.1) are the deliberate next follow-ons once the trio lands.
