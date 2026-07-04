# roughlogic.com Specification v442 -- Radiant Floor Heat Output (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Second tile of the HVAC energy-recovery trio (v441 ERV total enthalpy -> v442 radiant
> floor output -> v443 economizer enthalpy changeover). `radiant-loop-sizing` sizes the tubing footage and flow but states
> it does not do the panel surface-temperature design; this tile fills exactly that gap -- the heat a warm floor gives off
> and the surface temperature a load requires.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A heated floor emits, by the ASHRAE radiant-panel
> relation, about `q = 2 * (T_surface - T_room)^1.1` Btu/hr per ft^2, so the required mean surface temperature for a design
> load inverts to `T_surface = T_room + (q/2)^(1/1.1)`. Comfort caps the floor near `85 deg F` (ASHRAE 55), which sets the
> maximum output a bare floor can deliver. `radiant-loop-sizing` explicitly leaves the panel surface-temperature design out;
> this adds it to the existing **`calc-hvac.js`** module (Group C); no new group, trade, or dependency. Inherits spec.md
> through spec-v441.md.
>
> **The gap, and the evidence for it.** A floor at `85 deg F` in a `70 deg F` room emits `q = 2 * (85 - 70)^1.1 = 39.3
> Btu/hr-ft^2`, right at the comfort limit -- so a room needing more than that per square foot cannot be heated by the floor
> alone. Drop the surface to `80 deg F` and the output falls to `2 * 10^1.1 = 25.2 Btu/hr-ft^2`. To deliver a `30 Btu/hr-ft^2`
> load the floor must run `T_surface = 70 + (30/2)^(1/1.1) = 81.9 deg F`, comfortably under the cap. No tile does this;
> `radiant-loop-sizing` sized the pipe but not the panel.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The surface and room
temperatures are temperatures (deg F); the heat output is a heat flux (Btu/hr-ft^2). The v18/v21 contract: any non-finite
input, or a surface temperature at or below the room temperature (no heating), returns `{ error }`; the tile computes the
output from a surface temperature or the required surface temperature from a target output, and flags a surface temperature
above the `~85 deg F` comfort limit. Citation discipline (v19/v22): `GOVERNANCE.general` over the radiant panel output by
name; `editionNote` names **the ASHRAE Fundamentals radiant-panel relation `q = 2 * (T_surface - T_room)^1.1` Btu/hr-ft^2
(combined radiant and natural convection from a heated floor), the inverse `T_surface = T_room + (q/2)^(1/1.1)`, and the
ASHRAE 55 floor-surface comfort limit near `85 deg F`**, and states that **this returns the floor heat output and required
surface temperature, that the constant is a floor-heating approximation (walls/ceilings differ), and that it is a design
aid, not a substitute for a full radiant panel design**.

## 2. The tile

### 2.1 `radiant-floor-output` -- Radiant Floor Heat Output

```
inputs:
  mode          -   surface_to_q | q_to_surface
  t_surface_f   F   floor mean surface temperature (mode surface_to_q)
  t_room_f      F   room air temperature
  q_target      Btu/hr-ft^2   target output (mode q_to_surface)

surface_to_q:  q = 2 * (t_surface_f - t_room_f)^1.1
q_to_surface:  t_surface = t_room_f + (q_target/2)^(1/1.1)
comfort_ok = t_surface <= 85
```

**Pinned worked example (85 deg F floor, 70 deg F room).** `q = 2 * (85-70)^1.1 = 39.3 Btu/hr-ft^2`, at the comfort limit.
**Cross-check (find the surface for a load).** For `q = 30 Btu/hr-ft^2`, `T_surface = 70 + (30/2)^(1/1.1) = 81.9 deg F`,
under the `85 deg F` cap; and at `80 deg F` the floor gives only `25.2 Btu/hr-ft^2`. A surface at or below room temperature
takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `radiant-loop-sizing`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the ASHRAE radiant panel relation, `editionNote` naming `q = 2*(Ts-Tr)^1.1`, the
inverse, and the comfort limit); `test/fixtures/worked-examples.json` (the surface-to-q example + the q-to-surface
cross-check); `test/fixtures/compute-map.js` (`radiant-floor-output` -> `computeRadiantFloorOutput` in `../../calc-hvac.js`);
`scripts/related-tiles.mjs` (-> `radiant-loop-sizing` / `hydronic-gpm-deltat` / `erv-total-enthalpy-recovery` /
`degree-day-energy`); `data/search/aliases.json` ("radiant floor output", "radiant panel heat", "floor heating btu",
"radiant floor surface temperature", "heated floor output", "radiant panel", "floor heat flux", "warm floor btu", "radiant
comfort limit"); the id appended to the existing HVAC renderers block in `app.js`; the `// dims:` annotation (temperatures
T, output heat flux); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
comfort-limit flag, and the surface-below-room / non-finite error seams. No new module; re-pin `calc-hvac.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the comfort-limit flag, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the q / surface output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (85 F floor, 70 F room -> 39.3 Btu/hr-ft^2).

## 5. Roadmap position

The middle of the HVAC energy-recovery trio: `erv-total-enthalpy-recovery` (v441) and `economizer-enthalpy-changeover`
(v443) bracket it. A downward-loss and a cooling-panel (ceiling) output mode are the deliberate next follow-ons.
