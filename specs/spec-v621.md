# roughlogic.com Specification v621 -- Tapered Flocculation G Schedule (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`**
> (Group M, water/wastewater treatment bench); no new module, group, or dependency. Inherits spec.md through
> spec-v620.md.
>
> **The gap, and the evidence for it.** Spec-v575 (`flocculation-g-value`) names this tile as a deliberate
> follow-on: "a tapered-flocculation multi-stage G schedule," and the sibling's own note explains why the schedule
> matters -- "too high a G in the flocculation basin shears the floc apart." The single-basin tile returns one G
> for one power; real flocculation is **tapered** -- the water passes through two to four stages of *decreasing* G
> so the first stage builds many small flocs with vigorous mixing and each later stage lets them collide and grow
> without the shear that would tear them apart. The design question the single tile cannot answer: given the target
> G for each stage, how much mixing power does each stage need, and what is the composite Gt? The arithmetic is the
> same Camp-Stein relation the sibling validated, inverted -- `P = G^2 x mu x V` per stage -- with the identical
> water-viscosity-at-temperature table. The number that makes the point: a 3-stage 50 / 30 / 20 per-second taper in
> three 100 m^3 stages at 15 C needs **285 / 102 / 46 W** -- the last stage runs at a *sixth* of the first stage's
> power, exactly the gentle finish that grows settleable floc.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The per-stage volume
is `L^3` (m^3); the target G values and the composite G are `dimensionless` (per second, matching the sibling); the
per-stage and total power are power (`M L^2 T^-3`, W); the total detention time is `T` (min in, s internally) and
the composite Gt is `dimensionless`; the temperature is `dimensionless` (C, viscosity-table range 0-40). The
v18/v21 contract: any non-finite input, a non-positive stage volume or detention time, a temperature outside
0-40 C, or any non-positive stage G returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over
the Camp-Stein velocity gradient by name (Camp & Stein; Ten States Standards, matching the `flocculation-g-value`
sibling); `editionNote` prints `P_stage = G_stage^2 x mu(T) x V_stage`, `Gt = mean(G) x total_time`, notes that the
G values should **decrease** stage to stage (a tapered schedule) and that each should sit in the 10-100 per-second
flocculation band, and states that **cold water is more viscous so each stage needs more power for the same G,
merging rapid mix (G 500-1,000) into flocculation shears the floc, and the treatment-process design governs** -- a
design aid, not a process design.

## 2. The tile

### 2.1 `tapered-flocculation-g` -- The Power Each Stage of a Tapered Floc Train Needs

```
inputs:
  stage1_g_per_s     1/s   target G for stage 1 (highest)
  stage2_g_per_s     1/s   target G for stage 2
  stage3_g_per_s     1/s   target G for stage 3 (lowest); enter 0 to model a 2-stage train
  stage_volume_m3    m^3   volume of each (equal) stage
  water_temp_c       C     water temperature (0-40; sets viscosity)
  total_detention_min min  total detention across all stages

mu            = water dynamic viscosity at water_temp_c (table, Pa*s)
P_stage_i     = stage_i_g^2 x mu x stage_volume_m3          [W]
total_power_w = sum(P_stage_i)
mean_g        = mean of the active stage G values           [1/s]
gt_value      = mean_g x (total_detention_min x 60)         [-]
tapered       = each stage G strictly less than the previous
```

**Pinned worked example (a 3-stage taper).** Target G 50 / 30 / 20 per second, three 100 m^3 stages, 15 C
(mu = 1.138e-3 Pa*s), 30 min total detention: `P1 = 50^2 x 1.138e-3 x 100 = ` **284.5 W**,
`P2 = 30^2 x ... = ` **102.4 W**, `P3 = 20^2 x ... = ` **45.5 W**, `total = ` **432.4 W**; the schedule is tapered
(50 > 30 > 20), the mean G is 33.3 per second, and `Gt = 33.3 x 1800 = ` **60,000** -- squarely in the 10^4-10^5
band. **Cross-check (a 2-stage train, cold water).** G 40 / 20, stage-3 G = 0 (inactive), two 150 m^3 stages at
5 C (mu = 1.519e-3): `P1 = 40^2 x 1.519e-3 x 150 = ` **364.6 W**, `P2 = ` **91.1 W** -- the colder, more viscous
water pushes each stage's power up for the same G, exactly the winter penalty the sibling warns about.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water"]`, placed INSIDE the `// Group M: Water` .. `// Group N` comment
block beside `flocculation-g-value` -- the `citations.test.js` **Group M audit count bumps 31 -> 32**); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`tapered-flocculation-g` ->
`computeTaperedFlocculationG` in `../../calc-treatment.js`); `scripts/related-tiles.mjs` (->
`flocculation-g-value` / `flocculator-paddle-power` / `detention-time`); `data/search/aliases.json` ("tapered
flocculation", "flocculation g schedule", "multi stage flocculation", "floc stage power", plus question rows);
`TREATMENT_RENDERERS["tapered-flocculation-g"]` via the module's `_rPool` number-only factory (mirroring
`flocculation-g-value`), reusing the module's `_waterViscosity` helper, and the id added to the calc-treatment
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the 2-stage case (stage-3 G = 0), the
G^2-linear power scaling, the tapered flag, and the error seams (non-finite, non-positive volume / detention,
temperature out of 0-40, non-positive stage-1/2 G). The calc-treatment.js gzip cap (21000) is expected to hold
(verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block, the Group M audit count bump); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the
pinned example -> 284.5 / 102.4 / 45.5 W, Gt 60,000).

## 5. Roadmap position

Completes the flocculation cluster spec-v575 opened: `flocculation-g-value` gives one basin's G,
`flocculator-paddle-power` gives the paddle power from geometry, and this tile schedules the tapered multi-stage
train. No further flocculation follow-on is named; further Group M growth stays evidence-driven.
