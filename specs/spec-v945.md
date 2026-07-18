# roughlogic.com Specification v945 -- Motor RMS Horsepower for a Duty-Cycle Load (calc-motor.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-motor.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v944.md. Motor-sizing sweep, beside the accepted
> `motor-acceleration-time`, `motor-overload-sizing`, and `motor-shaft-torque` tiles.
>
> **The gap, and the evidence for it.** The motor module solves torque, overload, locked-rotor, fault, starting, and now
> acceleration time, but nothing sizes a motor for a REPEATING on/off (duty-cycle) load -- the RMS-horsepower method a
> motor tech uses to pick the smallest continuous motor that will not overheat on a cyclic machine (a punch press, a
> cyclic conveyor, a saw). Grep confirmed the only duty-cycle math in the catalog is the welder branch-circuit tiles
> (a different use). The number this settles: a 20 HP load for 10 s then a 20 s rest needs a **15.5 HP** continuous motor.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, since the formula squares horsepowers and takes a
square root), bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite
input, a non-positive run horsepower or run time, a negative idle horsepower or idle time, or a cooling factor below 1
(idle time cannot cool better than running) returns `{ error }`. Citation discipline (v19/v22): the RMS-horsepower
duty-cycle method by name (NEMA MG-1 duty-cycle practice), `GOVERNANCE.general`; the note states that heating goes as
horsepower squared (so the equivalent is a root-mean-square, not an average), that the idle/stopped time is divided by a
cooling factor K (~3 stopped, ~2 unloaded) for reduced self-cooling, and that the method sizes the THERMAL duty only --
the peak horsepower must separately fall within the motor's breakdown torque; the motor's thermal-damage curve, service
factor, and manufacturer duty (S1-S10) rating govern.

## 2. The tile

### 2.1 `motor-rms-hp` -- Motor RMS Horsepower for a Duty-Cycle Load

```
inputs:
  hp_run          working (run) load horsepower, default 20
  run_time_s      run duration (s), default 10
  hp_idle         idle / light-load horsepower (default 0)
  idle_time_s     idle / rest duration (s), default 20
  cooling_factor  idle-cooling factor K (>= 1; ~3 stopped, ~2 unloaded), default 3

rms_hp = sqrt( (hp_run^2 x run_time_s + hp_idle^2 x idle_time_s) / (run_time_s + idle_time_s / cooling_factor) )
```

**Pinned worked example.** 20 HP for 10 s, 0 HP idle for 20 s, K = 3:
`sqrt(20^2 x 10 / (10 + 20/3)) = sqrt(4000/16.667) = ` **15.49 HP**, so a 15 HP continuous motor is marginal and a 20 HP
is safe. Cross-check: with full cooling (K = 1) the effective idle time is longer, dropping the requirement to
`sqrt(4000/30) = ` **11.55 HP** -- worse idle cooling demands a larger motor; a non-zero idle load raises it further.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical", "machinist"]`, beside `motor-acceleration-time`); a
`tile-meta.js` `_TILES` entry (`A`); a `citations.js` entry (NEMA MG-1 duty-cycle RMS method, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the base example plus the full-cooling cross-check, pinning the RMS horsepower);
`test/fixtures/compute-map.js` (`motor-rms-hp` -> `computeMotorRmsHp`, module `../../calc-motor.js`);
`scripts/related-tiles.mjs` (-> `motor-shaft-torque` / `motor-operating-cost` / `motor-overload-sizing`);
`data/search/aliases.json` (5 collision-checked aliases: "motor rms horsepower", "rms hp motor", "duty cycle motor
sizing", "motor duty cycle hp", "intermittent duty motor"), then `node scripts/build-alias-shards.mjs`; a hand-written
renderer in the `MOTOR_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-motor
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the RMS heating equivalent, the cooling-factor and idle-load
monotonicity, the steady-load identity, and the error seams. The calc-motor.js gzip cap is watched at build (raised for
this tile). Home tile count 1,393 -> 1,394.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(20 HP / 10 s / 20 s rest / K 3 -> 15.5 HP_rms).

## 5. Roadmap position

Motor sizing beside `motor-acceleration-time`, serving the electrician / motor tech / machinist (electrical / machinist).
Deliberately a thermal-duty screen; the motor's thermal-damage curve, service factor, and manufacturer duty rating
govern, and the peak-vs-breakdown-torque check is separate. Stays evidence-driven. Continues the motor-sizing sweep at
1 new spec (v945).
