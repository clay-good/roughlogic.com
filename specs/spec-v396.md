# roughlogic.com Specification v396 -- Hydraulic Pump Drive Horsepower (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of a fluid-power / cooling trio (v396 pump drive HP -> v397 hydraulic motor
> torque and speed -> v398 cooling-system coolant flow). `hydraulic-cylinder` sizes an actuator's force and speed; nothing
> sizes the prime mover -- the engine or electric-motor horsepower it takes to drive the pump that feeds the system.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A hydraulic power unit needs a prime mover big enough
> to turn its pump at the working flow and pressure. The input horsepower is `HP = GPM * PSI / (1714 * efficiency)`, where
> `1714` is the fluid-power unit constant and the overall efficiency accounts for volumetric and mechanical losses. The
> catalog sizes cylinders but never the drive power. This adds the pump-drive tile to the existing **`calc-mechanic.js`**
> module (Group K); no new group, trade, or dependency. Inherits spec.md through spec-v395.md.
>
> **The gap, and the evidence for it.** A pump moving `10 GPM` at `2000 psi` at `85%` overall efficiency needs
> `HP = 10 * 2000 / (1714 * 0.85) = 13.7 HP` at the shaft; the ideal fluid power (at `100%`) is `10 * 2000 / 1714 = 11.7 HP`,
> so the `2.0 HP` difference is the loss the prime mover must also cover. No tile does this; a mechanic sizing an HPU motor
> or a PTO had no drive-power number.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The flow is a volumetric flow
(GPM); the pressure is a pressure (psi); the efficiency is dimensionless; the horsepower is a power (hp). The v18/v21
contract: any non-finite input, or a non-positive flow, pressure, or efficiency, returns `{ error }`; the efficiency is
constrained to `(0, 1]` (a value above 1 is flagged), and the tile reports both the ideal fluid horsepower (`efficiency = 1`)
and the input drive horsepower. Citation discipline (v19/v22): `GOVERNANCE.general` over hydraulic drive power by name;
`editionNote` names **the fluid-power relation `HP = GPM * PSI / (1714 * efficiency)`, the `1714` unit constant
(`= 231 in^3/gal * ... / 33000 ft-lb/min-hp`), the ideal fluid horsepower `GPM * PSI / 1714`, and overall efficiency as the
product of volumetric and mechanical efficiencies (about `0.80` to `0.90` typical)**, and states that **this returns the
prime-mover horsepower to drive the pump at the working flow and pressure, that peak pressure (relief setting) governs the
worst case, and that it is a sizing aid, not a substitute for the pump and motor manufacturer data**.

## 2. The tile

### 2.1 `hydraulic-pump-horsepower` -- Hydraulic Pump Drive Horsepower

```
inputs:
  gpm         gpm   pump flow
  psi         psi   working (or relief) pressure
  efficiency  -     overall pump efficiency (default 0.85)

fluid_hp = gpm * psi / 1714
input_hp = gpm * psi / (1714 * efficiency)
```

**Pinned worked example (10 GPM, 2000 psi, 0.85 efficiency).** `fluid_hp = 10*2000/1714 = 11.7 HP`;
`input_hp = 11.7/0.85 = 13.7 HP` -- size the prime mover to `13.7 HP` (round up to a standard motor). **Cross-check (ideal
vs real).** At `efficiency = 1.0` the input equals the fluid power `11.7 HP`; the `2.0 HP` gap is the pump loss. A
non-positive flow, pressure, or efficiency takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`, beside `hydraulic-cylinder`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, hydraulic drive power, `editionNote` naming `HP = GPM*PSI/(1714*eff)`, the 1714
constant, and the efficiency range); `test/fixtures/worked-examples.json` (the drive-HP example + the ideal cross-check);
`test/fixtures/compute-map.js` (`hydraulic-pump-horsepower` -> `computeHydraulicPumpHorsepower` in `../../calc-mechanic.js`);
`scripts/related-tiles.mjs` (-> `hydraulic-cylinder` / `hydraulic-motor-torque-speed` / `vbelt-drive` / `hp-from-torque`);
`data/search/aliases.json` ("hydraulic pump horsepower", "pump drive hp", "hydraulic hp", "1714 gpm psi", "hpu motor
sizing", "hydraulic power unit hp", "pump input power", "fluid power horsepower", "gpm psi horsepower"); the id appended to
the existing mechanic renderers block in `app.js`; the `// dims:` annotation (GPM flow, PSI pressure, HP power, efficiency
dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
efficiency-1 identity, and the non-positive / non-finite error seams. No new module; re-pin `calc-mechanic.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the fluid / input HP pair wraps on a phone); render-no-nan +
a11y sweep, output read to the value (10 GPM, 2000 psi, 0.85 -> 13.7 HP).

## 5. Roadmap position

Opens the fluid-power / cooling trio: `hydraulic-motor-torque-speed` (v397) is the actuator this pump drives, and
`cooling-system-flow` (v398) sizes the coolant loop that carries away the heat these systems make. A relief-cracking heat-
generation tile (lost HP into oil temperature rise) is the deliberate next follow-on.
