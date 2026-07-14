# roughlogic.com Specification v686 -- Fan Max Airflow from Motor Power (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvac.js`** (Group C,
> HVAC), no new module, group, or dependency. Inherits spec.md through spec-v685.md.
>
> **The gap, and the evidence for it.** Spec-v20 (`fan-motor-bhp`) runs the fan-power relation forward: given an airflow
> and static, it returns the brake horsepower. The troubleshooting question a service tech asks is the inverse -- **how
> much air can this installed motor move against the system static**. The forward tile makes you guess airflows and
> re-read the BHP against the motor rating; the inverse solves it directly. From `BHP = (CFM x TSP) / (6356 x
> fan_efficiency)`, `CFM_max = 6356 x BHP x fan_efficiency / TSP`, and a nameplate (motor) HP converts to brake HP first
> with the drive efficiency (`BHP = motor_hp x drive_efficiency`). The number this settles: a **1.94 BHP** fan at 65%
> against **2 in wc** moves about **4,000 CFM**; raise the static to **3 in wc** and the same motor moves only **2,670
> CFM** -- airflow falls as the static rises, which is why a dirty filter or a throttled damper cuts the CFM.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`fan-motor-bhp` sibling: the power is `dimensionless` (hp, as the sibling labels it), the total static pressure is
`M L^-1 T^-2` (in wc), the efficiencies are `dimensionless`, and the returned airflow is `L^3 T^-1` (CFM). It reuses the
sibling's `6356` unit constant. The v18/v21 contract: any non-finite input, a non-positive power or static, an unknown
power basis, or an efficiency outside (0, 1] returns `{ error }`. Citation discipline (v19/v22): the AMCA/ASHRAE
fan-power relation solved for airflow, by name and `GOVERNANCE.mechanical` matching the sibling; the note states that
**a nameplate HP converts to brake HP with the drive efficiency, airflow falls as the static rises, this is the POWER
CEILING (the delivered airflow is set by where the system curve crosses the fan curve, so treat it as the maximum a
motor can support, not a guaranteed delivery), the TSP is the total (external + internal) static at the duty point, and
the fan curve and motor data govern**.

## 2. The tile

### 2.1 `fan-motor-max-airflow` -- Fan Max Airflow from Motor Power

```
inputs:
  power_hp       hp     motor (nameplate) or brake power (> 0)
  power_basis    -      motor (convert with drive efficiency) or brake
  tsp_inwc       in wc  total static pressure (> 0)
  eta_fan        -      fan total efficiency (0-1)
  eta_drive      -      drive/belt efficiency (0-1)

BHP = (power_basis == "motor" ? power_hp x eta_drive : power_hp)
CFM_max = 6356 x BHP x eta_fan / tsp_inwc
```

**Pinned worked example (a 2 HP fan).** BHP = 1.936, TSP = 2.0 in wc, eta_fan = 0.65:
`CFM_max = 6356 x 1.936 x 0.65 / 2.0 = ` **4,000 CFM**; feeding 4,000 CFM at 2.0 in wc through `fan-motor-bhp` returns
1.936 BHP, the input. **Cross-check (a higher static).** Same fan against 3.0 in wc:
`CFM_max = 6356 x 1.936 x 0.65 / 3.0 = ` **2,666 CFM** -- the higher static leaves less power for airflow, so the same
motor moves a third less air.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `fan-motor-bhp`; Group C has no exact-count audit block, so
no count bump -- only a citation entry is required, which this adds); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (fan-power relation solved for airflow, `GOVERNANCE.mechanical` matching the sibling, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`fan-motor-max-airflow` ->
`computeFanMotorMaxAirflow` in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `fan-motor-bhp` /
`fan-affinity-laws` / `duct-sizing` / `cfm-per-ton`, and the forward tile links back); `data/search/aliases.json` ("max
airflow from motor power", "how much cfm can a motor push", "airflow ceiling for a fan motor", plus adjacent rows);
`HVAC_RENDERERS["fan-motor-max-airflow"]` via a hand-written renderer with a power-basis `makeSelect` (the select feeds
the compute, satisfying check-dead-inputs) and the id added to the calc-hvac declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js`
block pinning both examples, the motor/brake basis, the higher-static-less-airflow check, the round-trip through
`computeFanMotorBhp`, and the error seams. The calc-hvac.js gzip cap and the HVAC group-shell cap are expected to hold
(verify at build, including `check-shells`). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs` and
`check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit; render +
output read to the value (the pinned example -> 4,000 CFM for a 1.94 BHP fan at 2 in wc).

## 5. Roadmap position

Pairs the forward fan tile (`fan-motor-bhp`, power from airflow) with its inverse (max airflow from power), the two
halves of the fan-motor question. Further Group C growth stays evidence-driven.
