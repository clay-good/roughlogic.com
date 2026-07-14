# roughlogic.com Specification v795 -- Coordinated Turn Radius and Rate (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K,
> the aviation cluster), no new module, group, or dependency. Inherits spec.md through spec-v794.md. Explore sweep #22
> (entry 4).
>
> **The gap, and the evidence for it.** The second aviation-cluster tile: pilots size a turn with the **coordinated-turn
> radius**, and no tile does it. The balanced-turn force balance gives `tan(bank) = V^2/(g x radius)`, so `radius = 0.08854
> x airspeed(kt)^2 / tan(bank)`. The number this settles: **120 kt** at **30 deg** bank is a **2,208 ft** radius (0.36
> nm) at **5.25 deg/s**. Grep confirmed no aviation turn-radius / bank-angle tile exists (`truck-off-tracking` has a
> turn_radius input for trucks, a different quantity).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group K
aviation siblings (`glidepath-descent-rate`, `crosswind-component`): the airspeed carries `L T^-1`, the bank angle is
dimensionless, the turn radius carries `L`, and the rate of turn carries `T^-1` (per second). The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive airspeed, or a bank angle outside `(0, 90)` returns `{ error }`.
Citation discipline (v19/v22): coordinated-turn radius and rate by name (FAA Airplane Flying Handbook; classical
flight-dynamics balanced-turn relation), `GOVERNANCE.general` matching the siblings; the note derives the force balance,
states that the radius depends only on airspeed and bank (not weight or aircraft type), that speed enters squared, and
that a standard-rate turn is 3 deg/s.

## 2. The tile

### 2.1 `turn-radius-bank` -- Coordinated Turn Radius and Rate

```
inputs:
  airspeed_kt      true airspeed (kt)
  bank_angle_deg   bank angle (deg)

v_fps            = airspeed_kt x 1.68781
turn_radius_ft   = v_fps^2 / (32.174 x tan(bank)) = 0.08854 x airspeed_kt^2 / tan(bank)
rate_of_turn_deg_s = (v_fps / turn_radius_ft) x 180/pi
```

**Derivation.** In a coordinated level turn the horizontal lift component supplies the centripetal force: `L sin(phi) = m
V^2 / R` and `L cos(phi) = m g`; dividing gives `tan(phi) = V^2/(g R)`, so `R = V^2/(g tan phi)`. Converting V from knots
to ft/s (x 1.68781) with g = 32.174 gives the constant `1.68781^2 / 32.174 = 0.08854`.

**Pinned worked example.** 120 kt, 30 deg: `R = 0.08854 x 14400 / tan(30) = 1275.0 / 0.57735 = ` **2,208 ft** (0.36 nm);
`rate = ` **5.25 deg/s**. Airspeed enters squared (double it -> 4x radius); more bank tightens the turn; the rate is
above the 3 deg/s standard rate.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`) beside `glidepath-descent-rate`; a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (FAA AFH, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example,
two pinned outputs); `test/fixtures/compute-map.js` (`turn-radius-bank` -> `computeTurnRadiusBank`);
`scripts/related-tiles.mjs` (-> `glidepath-descent-rate` / `crosswind-component` / `density-altitude`);
`data/search/aliases.json` (5 collision-checked aliases: "coordinated turn radius", "standard rate turn bank angle",
...); the calc-mechanic `MECHANIC_RENDERERS` map entry via the `_simpleRenderer` factory (non-exported, so no
DOM-sentinel row) and the id added to the calc-mechanic declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the
radius, the rate, the V-squared scaling, and the error seams. The calc-mechanic.js gzip cap (raised to 52 KB in v794) is
unchanged. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,243 ->
1,244.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (120 kt, 30 deg -> 2,208 ft, 5.25 deg/s).

## 5. Roadmap position

The second of the sweep-22 aviation cluster on the mechanic bench. A climb-gradient rate-of-climb tile is the last
queued cluster entry, under the raised calc-mechanic cap. Stays evidence-driven.
