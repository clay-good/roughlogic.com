# roughlogic.com Specification v122 -- Motor Shaft Torque from Horsepower and Speed (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v121..v128.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one electrical tile from the first-principles rotational-power
> identity, public physics, manufacturer governed, redo-not-harm. Adds one tile to
> **`calc-electrical.js`** (Group A); no new module, group, or dependency. Inherits spec.md through
> spec-v121.md.
>
> **The gap, and the evidence for it.** The catalog gives motor full-load current
> (`motor-fla`, `motor-branch-from-nameplate`) and running speed (`motor-synchronous-speed-slip`,
> v121) but never the shaft torque -- the number that decides coupling, belt, gearbox, and VFD
> torque-limit selection, and that a tech needs when matching a replacement motor to a driven load.
> The horsepower-speed-torque triangle is bread-and-butter motor math with no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Horsepower is power (`M L^2 T^-3`), speed is `T^-1`, torque is `M L^2 T^-2` (force x radius). The
bundled 5252 constant (= 33,000 ft-lb/min per HP divided by 2 pi) carries the rev/min-to-rad/s and
HP-to-ft-lb/min unit bridge and is an annotated editable field. The v18/v21 contract: any non-
finite input, a non-positive speed, or both (or neither) of horsepower and torque supplied, returns
`{ error }`; the single division is by a guarded-positive speed. Citation discipline (v19/v22):
`GOVERNANCE.general` over T = 5252 x HP / RPM (with the 5252 derivation noted); the motor nameplate
and driven-load data govern the design torque.

## 2. The tile

### 2.1 `motor-shaft-torque` -- Shaft Torque, Horsepower, and Speed (two-way solver)

```
inputs:
  rpm            T^-1           shaft speed
  hp             M L^2 T^-3     mechanical horsepower (leave blank to solve from torque)
  torque_lbft    M L^2 T^-2     shaft torque (leave blank to solve from hp)

if hp given:      torque_lbft = 5252 x hp / rpm
if torque given:  hp          = torque_lbft x rpm / 5252
```

Exactly one of `hp` or `torque_lbft` is supplied; the tile solves for the other and echoes the
power = torque x angular-speed identity.

**Pinned worked example.** 10 HP at 1750 rpm (a 4-pole motor at full load):
`torque = 5252 x 10 / 1750 = 30.0 lb-ft`. **Cross-check (inverse path):** 30 lb-ft at 3500 rpm:
`hp = 30 x 3500 / 5252 = 20.0 HP` -- doubling the speed at the same torque doubles the horsepower,
the expected reciprocal of torque falling as speed rises at constant power. The nameplate and the
driven load govern the service-factor margin.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the T = 5252 HP / RPM identity and inverse, the 5252
constant and its 33,000 / 2 pi derivation listed, `editionNote` single-edition first-principles);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`motor-shaft-torque` -> `computeMotorShaftTorque` in `../../calc-electrical.js`);
`scripts/related-tiles.mjs` (-> `motor-synchronous-speed-slip` / `motor-fla` /
`motor-operating-cost`); `data/search/aliases.json` ("motor torque", "shaft torque", "horsepower to
torque", "5252", "torque from hp"); the id appended to the existing `ELECTRICAL_RENDERERS` declare
in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the example, cross-check, and error seams (non-finite,
rpm <= 0, both-or-neither of hp/torque supplied). Raise the `calc-electrical.js` size cap by ~20
percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the torque line and the
power-identity echo wrap on a phone); render-no-nan + a11y sweep, output read to the value (10 HP /
1750 rpm -> 30.0 lb-ft; inverse 30 lb-ft / 3500 rpm -> 20.0 HP).

## 5. Roadmap position

Second of the motor-performance family (speed v121, torque, operating cost v123). Further Group A
growth stays evidence-driven.
