# roughlogic.com Specification v501 -- Crosswind and Headwind Component (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, "Mechanic -- Auto, Marine, Aviation"); no new module, group, or dependency. Trade `["mechanic"]`. Inherits
> spec.md through spec-v500.md.
>
> **The gap, and the evidence for it.** Beside `density-altitude` (spec-v500), the other go / no-go number before a
> takeoff or landing is the wind split: how much of the reported wind is crosswind (across the runway, checked against
> the aircraft's maximum demonstrated crosswind) and how much is headwind (down the runway, which shortens the roll).
> Group K has no tile for it. The catch is that the split is not intuitive: a wind "20 kt, 30 degrees off" is only 10 kt
> of crosswind but 17 kt of headwind, and pilots routinely misjudge which number is large. Two more traps the tile
> makes explicit: the value checked against the crosswind limit is the **gust**, not the steady wind, and a quartering
> wind more than 90 degrees off the nose becomes a **tailwind** -- it still adds crosswind while erasing the headwind
> margin, the setup that overruns a runway. The tile takes the runway heading, the wind direction and speed (and an
> optional gust), and returns the crosswind and headwind components with a tailwind flag and a check against the
> demonstrated crosswind.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The wind speed, gust,
crosswind, and headwind are speeds (`L T^-1`, worked in knots); the runway and wind directions and the wind angle are
angles (in degrees, carried as `dimensionless`, the established convention as the lint has no angle base). The v18/v21
contract: any non-finite input, a negative wind speed or gust, a gust below the steady wind, or a direction outside
`0-360` returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the wind-component relations by
name (the FAA vector method, the POH crosswind chart); `editionNote` names the **runway wind-component resolution**,
prints `angle = |wind_dir - runway_heading|` (folded to `0-180`), `crosswind = speed x sin(angle)`, and
`headwind = speed x cos(angle)` (a negative headwind is a tailwind), and states that **the crosswind checked against the
aircraft's maximum demonstrated crosswind should use the gust value, a wind more than 90 degrees off the runway is a
tailwind that adds crosswind while removing the headwind margin, the demonstrated crosswind is a capability figure not a
regulatory limit, and the pilot in command and the flight manual govern** -- a planning aid, not a clearance.

## 2. The tile

### 2.1 `crosswind-component` -- The Wind Split Pilots Misjudge (and the Gust That Actually Counts)

```
inputs:
  runway_heading_deg   deg   runway magnetic heading (e.g. 360 for runway 36)
  wind_dir_deg         deg   wind direction (from)
  wind_speed_kt        kt    steady wind speed
  gust_kt              kt    gust speed (0 = no gust reported)
  max_demo_xwind_kt    kt    aircraft maximum demonstrated crosswind (0 = skip check)

angle       = fold(|wind_dir - runway_heading|, to 0..180 deg)
crosswind   = wind_speed x sin(angle)                          [kt]
headwind    = wind_speed x cos(angle)                          [kt]   (negative = tailwind)
gust_xwind  = (gust > 0 ? gust : wind_speed) x sin(angle)      [kt]   the value checked against the limit
tailwind    = angle > 90                                       [bool]
exceeds     = max_demo > 0 and gust_xwind > max_demo           [bool]
```

**Pinned worked example (runway 36 / heading 360, wind from 030 at 20 kt).** The angle is `|030 - 360| = 330`, folded
to `30 deg`. The crosswind is `20 x sin(30) = ` **10.0 kt** and the headwind is `20 x cos(30) = ` **17.3 kt** -- most of
that "20 kt off the nose" is headwind, and only half is the crosswind a pilot checks. **Cross-check (a quartering
tailwind flips the margin).** Keep the wind at 20 kt but from `150` (a wind now behind the runway-36 direction): the
angle is `|150 - 360| = 210`, folded to `150 deg`; `crosswind = 20 x sin(150) = 10.0 kt` again, but
`headwind = 20 x cos(150) = ` **-17.3 kt** -- a 17 kt **tailwind**, the `tailwind` flag set, and the same crosswind with
none of the runway-shortening headwind. The tile returns the crosswind, the headwind (signed), the gust crosswind, the
tailwind flag, and whether the demonstrated crosswind is exceeded.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the headwind example + the
quartering-tailwind cross-check); `test/fixtures/compute-map.js` (`crosswind-component` -> `computeCrosswindComponent`
in `../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `density-altitude` / `aircraft-weight-balance` /
`wind-chill`); `data/search/aliases.json` ("crosswind component", "headwind component", "runway wind", "max
demonstrated crosswind", "tailwind", "wind angle", "gust crosswind", "quartering wind"); the id appended to the mechanic
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the sin/cos split at 0/90/180 degrees, the tailwind flag above 90 degrees, the gust-driven
exceedance check, and the error seams (non-finite, negative speed/gust, gust < steady, direction out of range). Hand-
writes its renderer (mirroring the calc-mechanic.js pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the crosswind / headwind / gust stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the runway-36 example -> 10.0 kt crosswind, 17.3 kt headwind).

## 5. Roadmap position

Pairs with `density-altitude` to give Group K the two pre-takeoff go / no-go numbers. A runway-selection helper (which
of two reciprocal runways gives the best headwind and least crosswind for a given wind) and a gust-factor takeoff-speed
additive are deliberate future follow-ons. Further Group K growth stays evidence-driven.
