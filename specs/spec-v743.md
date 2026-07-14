# roughlogic.com Specification v743 -- PV Max Ambient Temperature for a Target Power (calc-solar.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-solar.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v742.md. Explore sweep #13 (entry 9).
>
> **The gap, and the evidence for it.** The `pv-cell-temperature-power` tile runs the NOCT derate forward: from an ambient
> temperature it returns the temperature-derated power. The design question is the inverse -- **the highest ambient
> temperature a module still makes a target power**, since a negative power coefficient means a hotter cell makes less.
> From `P = P_stc x (1 + gamma/100 x (T_cell - 25))`, `T_cell = 25 + (P/P_stc - 1) x 100/gamma`, then from
> `T_cell = T_amb + (NOCT - 20) x G/800`, `T_amb_max = T_cell - (NOCT - 20) x G/800`. The number this settles: a **400 W**
> module holding **358 W** at **800 W/m^2** tops out at **30 C** air (55 C cell).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`pv-cell-temperature-power` sibling: the target and STC power are `M L^2 T^-3` (W), the irradiance is `M T^-3` (W/m^2), the
NOCT and returned temperatures are `T` (C), and gamma is dimensionless. It reuses the sibling's NOCT cell-temperature and
power-derate model, solved for the ambient temperature. The v18/v21 contract: any non-finite input, a non-positive target
power, STC power, irradiance, or NOCT, or a **non-negative gamma** (a real module's power coefficient is negative -- a
hotter cell makes less power, and a non-negative value has no physical max-ambient solution) returns `{ error }`. Citation
discipline (v19/v22): the derate model solved for the ambient, `GOVERNANCE.general` matching the sibling; the note states
that this is a **ceiling** (above it the module falls below the target), that cells run **well above air temperature** in
sun so the max ambient is below the cell temperature, that a target **above the STC nameplate** gives a max ambient below a
25 C cell (a cold-day-only output), and that it is the **temperature derate only** with the datasheet governing.

## 2. The tile

### 2.1 `pv-max-ambient-for-power` -- PV Max Ambient Temperature for a Target Power

```
inputs:
  target_power_W   M L^2 T^-3    target power output (W, > 0)
  P_stc_W          M L^2 T^-3    module STC power (W, > 0)
  G_wm2            M T^-3        plane-of-array irradiance (W/m^2, > 0)
  NOCT_C           T             nominal operating cell temperature (C, > 0; default 45)
  gamma            dimensionless power temperature coefficient (%/C, < 0; default -0.35)

max_cell_C    = 25 + (target_power_W / P_stc_W - 1) x 100 / gamma
max_ambient_C = max_cell_C - (NOCT_C - 20) x G_wm2 / 800
```

**Pinned worked example.** target = 358 W, P_stc = 400 W, G = 800 W/m^2, NOCT = 45, gamma = -0.35:
`max_cell = 25 + (358/400 - 1) x 100 / (-0.35) = 25 + (-0.105)(-285.7) = 55 C`,
`max_ambient = 55 - (45 - 20) x 800/800 = ` **30 C**. Feeding 30 C back through `pv-cell-temperature-power` returns 358 W,
the target. A looser 340 W target lifts the max ambient to about 42 C.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar","electrical"]`) placed beside `pv-cell-temperature-power` (Group A is
not exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (derate model solved for the ambient,
`GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`pv-max-ambient-for-power` -> `computePvMaxAmbientForPower`);
`scripts/related-tiles.mjs` (-> `pv-cell-temperature-power` / `pv-performance-ratio` / `pv-energy-yield`);
`data/search/aliases.json` (5 collision-checked question aliases: "max ambient for pv power", "pv max temperature", ...);
the calc-solar `SOLAR_RENDERERS` map entry via a hand-written renderer (five number fields) and the id added to the
calc-solar declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computePvCellTemperaturePower` across a target/STC/irradiance/NOCT/gamma sweep, the lower-target-higher-ambient
monotonicity, and the error seams (including the non-negative-gamma guard). The calc-solar.js gzip cap (raised to 28000 B
in this spec) covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint.
Home tile count 1,191 -> 1,192.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 30 C max air for a 358 W
target on a 400 W module at 800 W/m^2).

## 5. Roadmap position

Pairs the forward PV tile (`pv-cell-temperature-power`, power from the ambient) with its inverse (the max ambient for a
power), the two halves of the temperature-derate question. Continues Explore sweep #13; further Group A solar growth stays
evidence-driven.
