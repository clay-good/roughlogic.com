# roughlogic.com Specification v278 -- Motor Running Overload Protection (NEC 430.32) (calc-motor.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.99.0; proposed 2026-07-02). Batch spec-v278..v280 (the NEC conductor-and-overcurrent-sizing trio --
> the three device-and-conductor sizing rules the existing catalog references but does not compute: the motor running
> overload (this spec, the companion 430.32 that `motor-branch-protection` explicitly defers), the dwelling service-
> entrance conductor at 83% (v279), and the continuous-load breaker-and-conductor at 125% (v280).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog sizes the motor branch-circuit short-
> circuit/ground-fault device (`motor-branch-protection`, NEC 430.52) but that tile ends with "Overload is sized separately
> (430.32)" -- the running overload it defers is exactly this gap. Adds one tile to the existing **`calc-motor.js`** module
> (Group A); no new group, trade, or dependency. Inherits spec.md through spec-v277.md.
>
> **The gap, and the evidence for it.** Motor protection is two devices: a branch-circuit short-circuit/ground-fault device
> (430.52, sized on the table FLC, which `motor-branch-protection` computes) and a running overload device (430.32, sized on
> the motor's nameplate FLA). Per NEC 430.32(A)(1), a continuous-duty motor over 1 hp takes an overload rated at 125% of the
> nameplate full-load current when the marked service factor is at least 1.15 or the marked temperature rise is not over
> 40 degC, and 115% otherwise; 430.32(C) then permits raising the trip to 140% (or 130%) of nameplate FLA if the motor will
> not start or carry its load at the lower value. For a 10 hp, 230 V, three-phase motor with a nameplate FLA of 26 A and a
> 1.15 service factor, the overload is `26 * 1.25 = 32.5 A`, with a 430.32(C) ceiling of `26 * 1.40 = 36.4 A` -- the setting
> an electrician dials into the overload relay or the heater table they select, a different current from the branch device.
> `motor-branch-protection` sizes the branch device off the table FLC; this tile sizes the overload off the nameplate FLA.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The motor nameplate full-load
current `fla` is a current (A); the service factor `sf` and the marked temperature rise `rise_C` (degC) select the multiplier;
the overload setting and the 430.32(C) ceiling are currents (A). The v18/v21 contract: any non-finite input or a nameplate
FLA at or below zero returns `{ error }`; the multiplier is chosen by the 430.32(A)(1) rule (125%/140% when `sf >= 1.15` or
`rise_C <= 40`, else 115%/130%). Citation discipline (v19/v22): `GOVERNANCE.general` over the NEC 430.32 overload rule by
name; `editionNote` names **the NEC 2023 430.32(A)(1) running-overload sizing -- 125% of nameplate FLA for a motor with a
marked service factor of 1.15 or greater or a marked temperature rise of 40 degC or less, 115% otherwise -- and the
430.32(C) permission to raise the trip to 140%/130% of FLA where the motor will not start**, and states that **this returns
the separate-overload-device rating on the motor nameplate FLA (not the table FLC the branch device uses), applies to a
continuous-duty motor over 1 hp, and does not cover the 430.32(B) small-motor rules, the 430.36 fuse-as-overload case, the
thermally protected or inherent-protector cases, or the branch short-circuit/ground-fault device (that is 430.52,
`motor-branch-protection`); and this is a design aid, not a substitute for the installing electrician and the AHJ** -- the
authority having jurisdiction governs.

## 2. The tile

### 2.1 `motor-overload-sizing` -- Motor Running Overload Protection (NEC 430.32)

```
inputs:
  fla_A     A      motor nameplate full-load current
  sf        -      marked service factor (e.g. 1.0, 1.15, 1.25)
  rise_C    degC   marked temperature rise (e.g. 40; blank if unmarked)

hi_class = (sf >= 1.15) OR (rise_C <= 40)     ; the 430.32(A)(1) higher-multiplier class
mult     = hi_class ? 1.25 : 1.15             ; base overload multiplier
mult_max = hi_class ? 1.40 : 1.30             ; 430.32(C) ceiling if it will not start
ol_A     = fla_A * mult                       ; overload setting, A
ol_max_A = fla_A * mult_max                   ; maximum permitted overload, A
```

**Pinned worked example (a 10 hp, 230 V, 3-phase motor, FLA 26 A, SF 1.15).** `fla = 26`, `sf = 1.15`, `rise_C = 40`:
`hi_class = true` (SF at 1.15); `ol = 26 * 1.25 = 32.5 A`; the 430.32(C) ceiling `ol_max = 26 * 1.40 = 36.4 A`. The
electrician sets the overload at 32.5 A and may raise it toward 36.4 A only if the motor trips on a normal start.
**Cross-check (an unmarked SF-1.0 motor, rise over 40 degC).** Same `fla = 26`, `sf = 1.0`, `rise_C = 55`: `hi_class = false`;
`ol = 26 * 1.15 = 29.9 A`; ceiling `ol_max = 26 * 1.30 = 33.8 A` -- the lower class, since neither the service-factor nor the
temperature-rise condition is met. The non-finite and `fla_A <= 0` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, matching `motor-branch-protection`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the NEC 430.32 overload rule, `editionNote` naming the 125%/115% base
and 140%/130% ceiling on nameplate FLA, and the continuous-duty-over-1hp, separate-device, not-430.52 caveats);
`test/fixtures/worked-examples.json` (the SF-1.15 example + the SF-1.0 cross-check); `test/fixtures/compute-map.js`
(`motor-overload-sizing` -> `computeMotorOverloadSizing` in `../../calc-motor.js`); `scripts/related-tiles.mjs` (->
`motor-branch-protection` / `motor-fla` / `motor-branch-from-nameplate` / `motor-feeder-multiple`);
`data/search/aliases.json` ("motor overload", "overload relay sizing", "NEC 430.32", "running overload", "overload heater
size", "motor thermal overload", "125 percent FLA", "overload setpoint", "service factor overload"); the id appended to the
existing motor renderers block in `app.js`; the `// dims:` annotation (`fla`/`ol`/`ol_max` current, `sf` dimensionless,
`rise_C` temperature); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
class-selection branch (SF and rise both drive it), the 140%/130% ceiling, and the `fla_A <= 0` / non-finite error seams. No
new module; re-pin `calc-motor.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the class-selection assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `ol` / `ol_max` pair with the
multiplier note wraps on a phone); render-no-nan + a11y sweep, output read to the value (26 A SF-1.15 -> 32.5 A overload,
36.4 A ceiling).

## 5. Roadmap position

Opens the NEC conductor-and-overcurrent-sizing batch (v278..v280) and closes the overload gap `motor-branch-protection`
names: branch device (430.52) and overload (430.32) are now both computed. The dwelling service-entrance conductor at 83%
(310.12) is v279; the continuous-load breaker and conductor at 125% (210.20/215.3) is v280. The 430.32(B) small-motor
rules and the 430.6 table-FLC-versus-nameplate-FLA distinction are the deliberate next follow-ons once the trio lands.
