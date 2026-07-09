# roughlogic.com Specification v547 -- Steel Floor Walking Vibration (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steel.js`**
> (Group E, the steel design bench); no new module, group, or dependency. Inherits spec.md through spec-v546.md.
>
> **The gap, and the evidence for it.** `steel-camber` handles dead-load deflection, but a long-span composite floor can
> pass every strength and deflection check and still bounce annoyingly when people walk on it -- a serviceability
> failure the bench cannot screen. AISC Design Guide 11 gives the walking-vibration check: the peak acceleration from a
> walker, `ap/g = P0 x e^(-0.35 fn) / (beta W)`, compared to an occupancy limit (0.5% of gravity for offices and
> residences, 1.5% for malls). The catch is counterintuitive: **stiffer is not automatically better**. The
> `e^(-0.35 fn)` term means low-frequency floors (roughly 4 to 8 Hz) resonate with the harmonics of a walking pace, so a
> floor tuned into that band accelerates more, not less. Damping (`beta`) and the effective panel weight (`W`) matter as
> much as the frequency. The tile takes the floor's natural frequency, effective weight, damping, and the walker force
> and occupancy limit, and returns the peak acceleration and the pass/fail -- the serviceability check strength alone
> misses.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The natural frequency is
`T^-1` (Hz); the effective panel weight and the constant walker force are forces (`M L T^-2`, in lb); the damping ratio,
the peak acceleration ratio `ap/g`, and the occupancy limit `ao/g` are `dimensionless`. The v18/v21 contract: any non-
finite input, a non-positive natural frequency, effective weight, or walker force, a damping ratio outside `(0, 1)`, or
a non-positive occupancy limit returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the DG11
relation by name (AISC Design Guide 11, 2nd ed.); `editionNote` names the **AISC Design Guide 11 walking-vibration
check**, prints `ap_over_g = P0 x e^(-0.35 x fn) / (beta x W)` with the pass test `ap/g <= ao/g`, lists the common
values (**P0 ~ 65 lb office, occupancy limit 0.5% office/residence and 1.5% mall**), and states that **stiffer is not
automatically better because the exponential term makes low-frequency floors (about 4 to 8 Hz) resonate with the walking
harmonic, damping and the effective panel weight matter as much as the frequency, the natural frequency comes from the
combined beam-plus-girder deflection, and a full DG11 evaluation and the engineer of record govern** -- a serviceability
screen, not the engineer of record.

## 2. The tile

### 2.1 `steel-floor-vibration` -- Why a Stiffer Floor Can Bounce More, Not Less

```
inputs:
  natural_freq_hz   Hz   floor first natural frequency fn
  effective_wt_lb   lb   effective panel weight W supporting the walker
  damping_ratio     -    modal damping ratio beta (0.02 bare, 0.03 furnished, 0.05 partitioned)
  walker_force_lb   lb   constant force amplitude P0 (65 office)
  limit_ratio       -    occupancy acceleration limit ao/g (0.005 office, 0.015 mall)

ap_over_g = walker_force_lb x e^(-0.35 x natural_freq_hz) / (damping_ratio x effective_wt_lb)   [-]
pass      = ap_over_g <= limit_ratio
```

**Pinned worked example (a long-span office bay: fn = 5 Hz, W = 30,000 lb, beta = 0.03, P0 = 65 lb, limit 0.5%).**
`ap/g = 65 x e^(-0.35 x 5) / (0.03 x 30,000) = 65 x 0.1738 / 900 = ` **0.0126**, i.e. **1.26% g** -- more than double
the 0.5% office limit, so this floor **fails** the walking check even though it is plenty strong: at 5 Hz it sits in the
resonant band. **Cross-check (raising the frequency out of the band fixes it).** Stiffen or shorten the span so
`fn = 8 Hz`: `ap/g = 65 x e^(-0.35 x 8) / 900 = 65 x 0.0608 / 900 = ` **0.44% g** -- now under the limit and it
**passes**, because the higher frequency escapes the walking harmonic, the exact behavior the exponential term captures.
The tile returns the peak acceleration ratio and the pass/fail.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "welding"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 5 Hz fail +
the 8 Hz pass cross-check); `test/fixtures/compute-map.js` (`steel-floor-vibration` -> `computeSteelFloorVibration` in
`../../calc-steel.js`); `scripts/related-tiles.mjs` (-> `steel-camber` / `joist-deflection` / `concrete-longterm-defl`);
`data/search/aliases.json` ("floor vibration", "walking vibration", "aisc design guide 11", "floor bounce", "peak
acceleration floor", "vibration serviceability", "annoying floor", "natural frequency floor"); the id appended to the
steel renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the exponential frequency term, the pass/fail flip between 5 and
8 Hz, the damping and weight scaling, and the error seams (non-finite, non-positive fn / W / P0, damping out of range,
non-positive limit). Hand-writes its renderer (mirroring the calc-steel.js `steel-camber` pattern). Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the ap/g / limit / pass stack wraps on a phone); render-no-nan + a11y on the new tile, output read
to the value (the 5 Hz example -> 1.26% g, fail).

## 5. Roadmap position

Adds the serviceability vibration check the steel bench lacked, beside `steel-camber` (deflection) and
`joist-deflection`. A natural-frequency-from-deflection helper (fn ~ 0.18 sqrt(g/delta)) and a rhythmic-activity
(aerobics) criterion are deliberate future follow-ons. Further Group E growth stays evidence-driven.
