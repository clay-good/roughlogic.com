# roughlogic.com Specification v358 -- Weld Travel Speed for a Target Heat Input (calc-fab.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v356..v358 (the welding-process trio -- dilution (v356),
> passes/arc-time (v357), the travel speed for a target heat input (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `weld-heat-input` computes the heat input from the
> voltage, current, and a given travel speed, but a welder qualifying to a WPS works the problem backward -- what travel
> speed hits the target heat input the procedure allows? Too slow overheats (grain growth, distortion, soft HAZ); too fast
> underheats (hard HAZ, lack of fusion). The catalog cannot solve for that speed. Adds one tile to the existing
> **`calc-fab.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v357.md.
>
> **The gap, and the evidence for it.** Heat input is `HI = (60 x V x I x eta)/(1000 x TS)` (kJ/in, `TS` in in/min, `eta`
> the process efficiency), so the travel speed that hits a target heat input is `TS = (60 x V x I x eta)/(1000 x HI)`. For
> GMAW at 24 V, 200 A, `eta = 0.80`, to hold a 40 kJ/in maximum, `TS = (60 x 24 x 200 x 0.80)/(1000 x 40) = 5.8 in/min` --
> the minimum travel speed to stay at or under the heat-input limit (slower exceeds it). Loosen the limit to 25 kJ/in and
> the welder may travel up to `9.2 in/min` -- faster travel, less heat, the lever a procedure uses to control the HAZ. The
> heat-input tile checks a given pass; this tile sets the speed to meet the spec.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The arc voltage `V` is a
voltage (V); the current `I` is a current (A); the process efficiency `eta` is a dimensionless fraction; the target heat
input `HI` is an energy per length (kJ/in); the travel speed `TS` is a speed (in/min). The v18/v21 contract: any non-finite
input, or a voltage, current, efficiency, or heat input at or below zero, returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the heat-input relation by name; `editionNote` names **the heat input
`HI = (60 V I eta)/(1000 TS)` (kJ/in), the travel-speed inverse `TS = (60 V I eta)/(1000 HI)`, the process efficiencies
(`eta ~ 0.6-0.7 GTAW, 0.8 GMAW/FCAW, 0.9-1.0 SAW`), and that a lower travel speed raises heat input, per AWS D1.1 / the
welding references**, and states that **this returns the travel speed for a target heat input -- it uses the entered process
efficiency (arc/thermal efficiency `eta`; some codes report heat input without it, so match the WPS convention), gives the
speed that meets the heat-input limit exactly (travel at or above it to stay under a maximum), and does not verify the
resulting bead geometry, HAZ hardness, or the deposition/pass count (`weld-passes-arc-time`); and this is a procedure aid**
-- the qualified WPS/PQR governs.

## 2. The tile

### 2.1 `weld-travel-speed` -- Weld Travel Speed for a Target Heat Input

```
inputs:
  V_volts    V        arc voltage
  I_amps     A        welding current
  eta        -        arc efficiency (0.8 GMAW, 0.65 GTAW, 0.9 SAW)
  HI_kjin    kJ/in    target heat input

TS = (60 * V_volts * I_amps * eta) / (1000 * HI_kjin)       ; travel speed, in/min
(check: HI at this TS = (60 V I eta)/(1000 TS) == HI target)
```

**Pinned worked example (GMAW 24 V, 200 A, eta 0.80, target 40 kJ/in).**
`TS = (60 x 24 x 200 x 0.80)/(1000 x 40) = 230,400/40,000 = 5.76 in/min` -- travel at or above this to hold the heat input
at or under 40 kJ/in. **Cross-check (a tighter 25 kJ/in limit).** `TS = 230,400/25,000 = 9.22 in/min` -- a lower heat-input
ceiling forces a faster travel, the inverse relationship (`TS` up, `HI` down) that lets a welder trade travel speed for HAZ
control. Slowing to 4 in/min at the same amps and volts would push the heat input to `230,400/(1000 x 4)... = 57.6 kJ/in`,
over both limits. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding","fabrication"]`, matching `weld-heat-input`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the heat-input relation, `editionNote` naming
`TS = (60 V I eta)/(1000 HI)`, the efficiencies, the slower-is-hotter behavior, and the enter-eta/match-WPS-convention,
not-bead-geometry caveats); `test/fixtures/worked-examples.json` (the 40 kJ/in example + the 25 kJ/in cross-check);
`test/fixtures/compute-map.js` (`weld-travel-speed` -> `computeWeldTravelSpeed` in `../../calc-fab.js`);
`scripts/related-tiles.mjs` (-> `weld-heat-input` / `weld-passes-arc-time` / `weld-preheat-fuel` / `carbon-equivalent`);
`data/search/aliases.json` ("weld travel speed", "travel speed heat input", "heat input travel speed", "WPS travel speed",
"kJ/in travel speed", "welding speed calculator", "heat input control", "travel speed for heat input", "arc travel
speed"); the id appended to the existing fab renderers block in `app.js`; the `// dims:` annotation (`V` voltage, `I`
current, `eta` dimensionless, `HI` energy/length, `TS` speed); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the inverse relationship, the round-trip heat-input check, and the
non-positive / non-finite error seams. No new module; re-pin `calc-fab.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the round-trip assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `TS` output wraps on a phone); render-no-nan +
a11y sweep, output read to the value (24 V, 200 A, 40 kJ/in -> 5.76 in/min).

## 5. Roadmap position

Closes the welding-process batch (v356..v358) in `calc-fab.js`: dilution, passes/arc-time, and the travel-speed-for-heat-
input now round out the process side beside the strength, cost, and deposition tiles. A minimum-travel-speed-for-a-heat-
input-window (min and max), a preheat/interpass chain into `weld-preheat-fuel`, and a HAZ-hardness estimate from the heat
input and carbon equivalent are the deliberate next follow-ons once the trio lands.
