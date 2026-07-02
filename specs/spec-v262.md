# roughlogic.com Specification v262 -- Cantilever Retaining Wall Stability: Overturning, Sliding, and Bearing (calc-geotech.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-02, package 0.95.0; was PROPOSED 2026-07-02). Batch spec-v260..v262 (the geotechnical foundation-and-earth-retaining trio). This spec
> closes the batch: it takes the Rankine thrust of v261 and the toe-bearing check of v260 and runs the three global-
> stability limit states a cantilever retaining wall must pass.)**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog counts a segmental wall's blocks
> (`retaining-wall-block`, which explicitly punts anything over 4 ft to an engineered design) and now computes the lateral
> thrust (`lateral-earth-pressure`, v261) and the soil's bearing capacity (`soil-bearing-capacity`, v260), but nothing ties
> them into the stability check that decides whether a cast-in-place cantilever wall tips, slides, or overloads its toe.
> Adds one tile to the **`calc-geotech.js`** Group E cluster; no new group, trade, or dependency. Inherits spec.md through
> spec-v261.md.
>
> **The gap, and the evidence for it.** A cantilever retaining wall fails in three ways, and every design checks all three:
> it overturns about its toe, it slides on its base, and it overstresses the soil under the toe. Each is a ratio of
> resistance to demand. The overturning factor of safety is the restoring moment of the wall stem, base slab, and the soil
> riding on the heel (each weight times its arm to the toe) divided by the overturning moment of the Rankine active thrust
> (`Pa x H/3`); the sliding factor of safety is the base friction `mu x sum(V)` divided by that same thrust; and the toe
> bearing follows from the resultant eccentricity `e = B/2 - (Mr - Mo)/sum(V)` through `q = (sum(V)/B)(1 +/- 6e/B)`. IBC
> 1807.2.3 sets the minimum factor of safety at 1.5 against both sliding and overturning, and standard practice designs the
> overturning check to 2.0. A 10 ft wall on a 6 ft base with a 1 ft toe, retaining a `phi = 30`, 110 pcf backfill, comes
> out at 3.4 against overturning, 1.7 against sliding, and a peak toe pressure of about 1.7 ksf -- passing, with the margins
> a designer reads to decide whether the heel is long enough. The catalog has the load and the bearing but never the check
> that spends them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The wall height `H`, base
width `B`, base thickness `t_base`, stem thickness `t_stem`, and toe length are lengths (ft); the soil unit weight
`gamma_s` and concrete unit weight `gamma_c` are forces per volume (pcf); the friction angle `phi` is an angle carried as
dimensionless; the base friction coefficient `mu` and the factors of safety are dimensionless; the surcharge `q` is a
stress (psf); the vertical resultant `sum(V)` is a force per unit length (lb/ft); the moments are a moment per unit length
(ft-lb/ft); the eccentricity `e` is a length (ft); the toe pressures `q_max`, `q_min` are stresses (psf). The v18/v21
contract: any non-finite input, a height, base width, thickness, or unit weight at or below zero, a negative toe or
surcharge, a friction angle at/below 0 or at/above 50, a friction coefficient at or below zero, or a geometry where the
toe plus stem thickness meets or exceeds the base width (no heel), returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the stability checks by name; `editionNote` names **the standard cantilever-retaining-wall
global-stability checks -- overturning `FS_ot = Mr / Mo`, sliding `FS_sl = mu sum(V) / Pa`, and toe bearing
`q = (sum(V)/B)(1 +/- 6e/B)` with Rankine active pressure -- as compiled in Das, Principles of Foundation Engineering, and
NAVFAC DM-7.02, against the IBC 1807.2.3 minimum factor of safety of 1.5 for both sliding and overturning**, gives `gamma_c`
a default of **150 pcf (reinforced concrete)**, `mu` a default of **0.5 (a common base-friction value; use `tan(phi_base)`
or the geotechnical report)**, and the target factors of safety defaults of **2.0 overturning / 1.5 sliding**, and states
that **this is a global-stability check of a level, cohesionless, dry backfill on a level base with the wall stem, base,
and heel soil idealized as rectangles -- it does not check the internal reinforced-concrete design of the stem or base
(see the ACI batch v257..v259 for those member checks), does not credit passive resistance at the toe (conservatively
neglected), does not apply seismic (Mononobe-Okabe) pressure or a sloped or submerged backfill, and reports gross toe
pressure the user must compare against the allowable bearing from `soil-bearing-capacity` (v260); take the geometry from
the drawings and the soil parameters from the geotechnical report; and this is a design aid, not a substitute for a
licensed engineer's design** -- the engineer of record's stamped design governs.

## 2. The tile

### 2.1 `retaining-wall-stability` -- Cantilever Retaining Wall Stability (Overturning, Sliding, Bearing)

```
inputs:
  h_ft      ft    total wall height (top of stem to underside of base)
  b_ft      ft    base slab width (toe to heel)
  t_base    ft    base slab thickness
  t_stem    ft    stem thickness
  toe_ft    ft    toe length (front of base to front of stem)
  gamma_s   pcf   retained soil unit weight (default 110)
  gamma_c   pcf   concrete unit weight (default 150)
  phi       deg   soil friction angle
  mu        -     base sliding friction coefficient (default 0.5)
  q         psf   surcharge on backfill (default 0)

heel    = b_ft - toe_ft - t_stem                      ; heel length, ft (error if <= 0)
h_stem  = h_ft - t_base                                ; stem height, ft
Ka      = (1 - sin(phi*pi/180)) / (1 + sin(phi*pi/180))
; --- resisting (vertical weights and their arms to the toe) ---
W_stem  = gamma_c * t_stem * h_stem;   a_stem = toe_ft + t_stem/2
W_base  = gamma_c * b_ft   * t_base;   a_base = b_ft/2
W_soil  = gamma_s * heel   * h_stem;   a_soil = toe_ft + t_stem + heel/2
W_surch = q * heel;                    a_surch= a_soil
sumV    = W_stem + W_base + W_soil + W_surch           ; lb/ft
Mr      = W_stem*a_stem + W_base*a_base + W_soil*a_soil + W_surch*a_surch   ; ft-lb/ft
; --- overturning (Rankine active thrust) ---
Pa_soil = 0.5 * Ka * gamma_s * h_ft^2;   Pa_surch = Ka * q * h_ft
Mo      = Pa_soil*(h_ft/3) + Pa_surch*(h_ft/2)        ; ft-lb/ft
Pa      = Pa_soil + Pa_surch
; --- the three checks ---
FS_ot   = Mr / Mo
FS_sl   = mu * sumV / Pa
x_bar   = (Mr - Mo) / sumV                             ; resultant location from toe, ft
e       = b_ft/2 - x_bar                               ; eccentricity, ft
q_max   = (sumV / b_ft) * (1 + 6*e/b_ft)              ; toe pressure, psf
q_min   = (sumV / b_ft) * (1 - 6*e/b_ft)              ; heel pressure, psf (uplift flagged if < 0)
```

**Pinned worked example (a 10 ft cantilever wall, 6 ft base).** `H = 10`, `t_base = 1`, `t_stem = 1`, `toe = 1`, `B = 6`,
`gamma_s = 110`, `gamma_c = 150`, `phi = 30` (`Ka = 0.333`), `mu = 0.5`, `q = 0`: `heel = 6 - 1 - 1 = 4 ft`,
`h_stem = 9 ft`. Weights and arms: stem `150 x 1 x 9 = 1,350 lb/ft` at `1.5 ft` (`M = 2,025`), base `150 x 6 x 1 = 900` at
`3.0 ft` (`M = 2,700`), heel soil `110 x 4 x 9 = 3,960` at `4.0 ft` (`M = 15,840`); `sum(V) = 6,210 lb/ft`,
`Mr = 20,565 ft-lb/ft`. Thrust `Pa = 0.5 x 0.333 x 110 x 100 = 1,833 lb/ft` at `3.33 ft`, `Mo = 6,111 ft-lb/ft`. Then
`FS_ot = 20,565 / 6,111 = ` **3.37** (>= 2.0, pass); `FS_sl = 0.5 x 6,210 / 1,833 = 3,105 / 1,833 = ` **1.69**
(>= 1.5, pass); `x_bar = (20,565 - 6,111)/6,210 = 2.33 ft`, `e = 3.0 - 2.33 = 0.67 ft` (< `B/6 = 1.0`, resultant in the
middle third, no heel uplift); `q_max = (6,210/6)(1 + 6 x 0.67/6) = 1,035 x 1.672 = ` **1,731 psf** toe,
`q_min = 1,035 x 0.328 = 340 psf` heel. The 1,731 psf toe pressure is comfortably under the 7,335 psf allowable the v260
sand example returned -- the wall passes all three limit states. **Cross-check (the same wall with a 300 psf surcharge).**
`q = 300`: the surcharge adds `W_surch = 300 x 4 = 1,200 lb/ft` at `4.0 ft` (helping resist) but `Pa_surch = 0.333 x 300 x
10 = 999 lb/ft` at `5.0 ft` (`Mo` climbs to `6,111 + 4,995 = 11,106`); `FS_ot` drops to `(20,565 + 4,800)/11,106 = 2.28`
and `FS_sl` to `0.5 x 7,410 / 2,832 = 1.31` -- now **failing** the 1.5 sliding target. The surcharge is the case that most
often governs, and the tile shows why: it loads the driving side harder than it helps the resisting side, so a wall that
passes dry can fail loaded, which is exactly the check a designer runs before signing off on a parking surcharge behind
the wall.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["construction","carpentry"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the overturning / sliding / bearing checks, `editionNote` naming Das / NAVFAC DM-7.02 and the
IBC 1807.2.3 minimum 1.5 factor of safety, with the rectangular-idealization, no-internal-member-design, no-passive-toe,
no-seismic, level-dry-cohesionless-backfill, compare-toe-pressure-to-v260, and design-aid caveats);
`test/fixtures/worked-examples.json` (the dry 10 ft example + the 300 psf surcharge cross-check that flips sliding to
fail); `test/fixtures/compute-map.js` (`retaining-wall-stability` -> `computeRetainingWallStability` in
`../../calc-geotech.js`); `scripts/related-tiles.mjs` (-> `lateral-earth-pressure` / `soil-bearing-capacity` /
`retaining-wall-block`); `data/search/aliases.json` ("retaining wall stability", "overturning factor of safety", "sliding
factor of safety", "cantilever retaining wall", "will the wall tip", "toe pressure", "wall sliding check", "resisting
moment"); the id appended to the geotech renderers declare in `app.js`; the `// dims:` annotation (lengths, unit weights
force/length^3, `phi`/`mu`/FS dimensionless, `q` pressure, `sumV` force/length, moments force, pressures pressure);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite,
non-positive height / base / thicknesses / unit weights / `mu`, negative toe / surcharge, `phi` out of (0,50), and the
`toe + t_stem >= b_ft` no-heel guard). Add / update the `calc-geotech.js` size in the `check:module-sizes` allowlist
(dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths incl. the no-heel guard, the surcharge case that flips `FS_sl` below
1.5); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit
(the FS_ot / FS_sl / e / q_max / q_min stack wraps on a phone); render-no-nan + a11y sweep, output read to the value
(10 ft dry wall -> FS_ot 3.37, FS_sl 1.69, q_max 1,731 psf).

## 5. Roadmap position

Closes the geotechnical foundation-and-earth-retaining batch (v260..v262). The stability check spends the Rankine thrust of
`lateral-earth-pressure` (v261) and hands its toe pressure to `soil-bearing-capacity` (v260) for the allowable-bearing
comparison, completing the earth-retaining loop the way the ACI trio (v257..v259) completed the reinforced-concrete member
loop. A gravity / masonry-wall variant, passive-toe credit, a Mononobe-Okabe seismic-pressure increment, a sloped-backfill
Rankine form, and a global (deep-seated) slope-stability companion are the deliberate next follow-ons; with this trio
landed the geotech cluster stands complete beside the steel-member, reinforced-concrete, and building-code clusters in
Group E.
