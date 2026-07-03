# roughlogic.com Specification v312 -- Stadia Tacheometry (Distance and Elevation from a Stadia Interval) (calc-survey.js, Group P, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.110.0; proposed 2026-07-02). Batch spec-v311..v313 (the field-surveying depth trio -- differential
> leveling (v311), stadia tacheometry (this spec), taping corrections (v313)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog has pacing (`pacing-distance`) and
> coordinate reduction but no stadia tacheometry -- the classic instrument method of reading a distance and elevation
> difference from the stadia interval on a rod, still used with transits and total-station stadia and for topo checks. Adds
> one tile to the existing **`calc-survey.js`** module (Group P); no new group, trade, or dependency. Inherits spec.md
> through spec-v311.md.
>
> **The gap, and the evidence for it.** With an instrument constant `K = 100`, the horizontal distance from a stadia
> interval `s` (the rod reading between the upper and lower stadia hairs) at a vertical angle `theta` is `H = K s cos^2(theta)`,
> and the vertical distance is `V = K s cos(theta) sin(theta) = (K s/2) sin(2 theta)`; the point's elevation is
> `HI + V - rod-center`. For a stadia interval of 1.50 ft at a 5 degree elevation angle, `H = 100 x 1.50 x cos^2 5 = 148.9 ft`
> and `V = 100 x 1.50 x cos 5 sin 5 = 13.0 ft` -- the distance and rise a topographer reads without a tape, and on a level
> sight (`theta = 0`) the familiar `H = 100 s = 150 ft` with no rise. The coordinate tiles reduce measured distances; this
> tile produces them from the rod.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The stadia interval `s`, the
horizontal distance `H`, the vertical distance `V`, the instrument height, and the rod center reading are lengths (ft); the
vertical angle `theta` is an angle (degrees, converted to radians); the stadia interval factor `K` is dimensionless
(default 100). The v18/v21 contract: any non-finite input, a stadia interval at or below zero, or a vertical angle outside
`-90 < theta < 90` returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the stadia-reduction
formulas by name; `editionNote` names **the stadia horizontal distance `H = K s cos^2(theta)`, the vertical distance
`V = K s cos(theta) sin(theta) = (K s/2) sin(2 theta)`, the elevation `= HI + V - rod-center`, and the standard interval
factor `K = 100` (stadia constant `C ~ 0` for internal-focusing instruments), as compiled in the surveying references**,
and states that **this returns the reduced horizontal distance, vertical distance, and elevation from a stadia reading -- it
assumes an internal-focusing instrument (`C = 0`; add `C cos theta` / `C` for an external-focusing stadia constant), takes
the vertical angle from the horizontal, and does not correct for earth curvature/refraction over long sights or for a rod
not held plumb; and this is a computational aid** -- the instrument's stadia constants and the field procedure govern.

## 2. The tile

### 2.1 `stadia-distance` -- Stadia Tacheometry (Distance and Elevation)

```
inputs:
  s_ft      ft     stadia interval (upper hair - lower hair rod reading)
  theta_deg deg    vertical angle from horizontal (+ up)
  K         -      stadia interval factor (default 100)
  hi_ft     ft     height of instrument (optional, for elevation)
  rod_ft    ft     rod center reading (optional, for elevation)
  sta_elev  ft     instrument-station elevation (optional)

t = theta_deg * pi/180
H = K * s_ft * cos(t)^2                          ; horizontal distance, ft
V = K * s_ft * cos(t) * sin(t)                   ; vertical distance, ft
elev = sta_elev + hi_ft + V - rod_ft             ; target elevation (if provided)
```

**Pinned worked example (a 1.50 ft stadia interval at a +5 degree angle).** `s = 1.50`, `theta = 5`, `K = 100`:
`H = 100 x 1.50 x cos^2 5 = 150 x 0.99240 = 148.86 ft`; `V = 100 x 1.50 x cos 5 sin 5 = 150 x 0.08682 = 13.02 ft`. With a
station elevation of 500.00, `HI = 4.50`, and a rod center of `5.20`, the target elevation is
`500.00 + 4.50 + 13.02 - 5.20 = 512.32 ft`. **Cross-check (a level sight).** `theta = 0`: `H = 100 x 1.50 = 150.0 ft`,
`V = 0` -- the flat-sight case where stadia reduces to the bare `K s` distance and no rise, confirming the `cos^2` and
`sin(2 theta)` terms. The non-finite, `s <= 0`, and out-of-range-angle error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `P`, trades `["surveying","field"]`, matching the survey tiles); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the stadia formulas, `editionNote` naming `H = K s cos^2 theta`,
`V = (K s/2) sin 2 theta`, `K = 100`, and the internal-focusing, no-curvature, plumb-rod caveats);
`test/fixtures/worked-examples.json` (the inclined example + the level-sight cross-check); `test/fixtures/compute-map.js`
(`stadia-distance` -> `computeStadiaDistance` in `../../calc-survey.js`); `scripts/related-tiles.mjs` (->
`differential-leveling` / `pacing-distance` / `slope-from-level` / `traverse-closure`); `data/search/aliases.json`
("stadia", "tacheometry", "stadia interval", "stadia distance", "K s cos squared", "transit stadia", "topo stadia", "rod
interval distance", "stadia elevation"); the id appended to the existing survey renderers block in `app.js`; the `// dims:`
annotation (lengths ft, `theta` angle, `K` dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the level-sight `V = 0` identity, the `sin(2 theta)` form of `V`, and the `s <= 0` /
out-of-range-angle / non-finite error seams. No new module; re-pin `calc-survey.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the level-sight assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `H` / `V` / `elev` stack wraps on a phone);
render-no-nan + a11y sweep, output read to the value (1.50 ft at 5 deg -> 148.86 ft H, 13.02 ft V).

## 5. Roadmap position

Middle of the field-surveying depth batch (v311..v313) in `calc-survey.js`, adding tacheometry beside leveling and pacing.
Taping corrections (v313) follow. The external-focusing stadia constant `C`, an earth-curvature/refraction correction for
long sights, and a beaman-arc/subtense-bar variant are the deliberate next follow-ons once the trio lands.
