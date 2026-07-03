# roughlogic.com Specification v317 -- Radial Chip Thinning Feed Compensation (calc-machining.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.112.0; proposed 2026-07-02). Batch spec-v317..v319 (the machining depth trio -- the cutting-geometry
> effects the speeds-and-feeds tile never captures: radial chip thinning at light radial engagement (this spec), boring-bar
> deflection and the length-to-diameter chatter limit (v318), and the ballnose scallop height from stepover (v319).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `cutting-speed-rpm` computes feed from RPM, flutes,
> and chip load, but at light radial engagement the actual chip is thinner than the programmed feed per tooth, and a machinist
> who does not compensate runs the tool far below its capability (and rubs instead of cuts). The catalog has no chip-thinning
> tile. Adds one tile to the existing **`calc-machining.js`** module (Group K); no new group, trade, or dependency. Inherits
> spec.md through spec-v316.md.
>
> **The gap, and the evidence for it.** When the radial width of cut `ae` is less than half the cutter diameter `D`, the
> maximum chip thickness is less than the feed per tooth `fz`, by the radial chip thinning factor
> `RCTF = 1/(2 sqrt((ae/D) - (ae/D)^2))`. To restore the intended chip load, the programmed feed per tooth is raised to
> `fz_prog = fz_target x RCTF`. At half immersion (`ae/D = 0.5`) `RCTF = 1.0` (no thinning), but at a light 10% radial
> engagement `RCTF = 1/(2 sqrt(0.1 - 0.01)) = 1.667`, so the programmed feed can be two-thirds higher for the same chip
> thickness -- the difference between a light finishing pass that rubs and one that cuts cleanly, and the whole basis of
> high-feed and trochoidal milling. `cutting-speed-rpm` gives `fz`; this tile corrects it for the engagement.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The radial width of cut `ae`
and cutter diameter `D` are lengths (in); their ratio and the chip thinning factor `RCTF` are dimensionless; the target and
programmed feed per tooth `fz` are lengths (in/tooth). The v18/v21 contract: any non-finite input, a diameter or engagement
at or below zero, or `ae >= D` (a full slot, no thinning) is handled -- `RCTF = 1.0` at and above half immersion, and an
`ae >= D` returns `RCTF = 1.0` with a note. Citation discipline (v19/v22): `GOVERNANCE.general` over the radial-chip-thinning
geometry by name; `editionNote` names **the radial chip thinning factor `RCTF = 1/(2 sqrt((ae/D) - (ae/D)^2))` for
`ae < D/2`, the compensated feed `fz_prog = fz_target x RCTF`, and `RCTF = 1.0` at half immersion and above, as compiled in
the modern milling / Machinery's Handbook references**, and states that **this returns the radial chip thinning factor and
compensated feed -- it is the radial (not axial/lead-angle) thinning, applies to `ae < D/2` (above which no compensation is
needed), and does not itself cap the result against the machine's feed limit, the tool's maximum chip load, or the spindle
power (`spindle-power-torque`); and this is a shop aid** -- the tool manufacturer's recommended chip load and the machine
govern.

## 2. The tile

### 2.1 `radial-chip-thinning` -- Radial Chip Thinning Feed Compensation

```
inputs:
  ae_in     in         radial width of cut
  D_in      in         cutter diameter
  fz_target in/tooth   target (recommended) chip load per tooth

r = ae_in / D_in
RCTF = (r < 0.5) ? 1/(2*sqrt(r - r^2)) : 1.0        ; radial chip thinning factor
fz_prog = fz_target * RCTF                          ; compensated feed per tooth
```

**Pinned worked example (a 10% radial engagement).** `ae/D = 0.1`, `fz_target = 0.004 in/tooth`:
`RCTF = 1/(2 sqrt(0.1 - 0.01)) = 1/(2 x 0.3) = 1.667`; `fz_prog = 0.004 x 1.667 = 0.0067 in/tooth` -- the programmed feed
runs two-thirds higher to hold the intended chip thickness. **Cross-check (a quarter engagement, and half immersion).** At
`ae/D = 0.25`, `RCTF = 1/(2 sqrt(0.25 - 0.0625)) = 1.155` (a 15% bump); at `ae/D = 0.5`, `RCTF = 1.0` exactly -- no thinning
at half immersion, the crossover where compensation stops. The non-finite and non-positive error paths bracket the result,
and `ae >= D/2` returns `RCTF = 1.0`.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machinist","mechanic"]`, matching `cutting-speed-rpm`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the radial-chip-thinning geometry, `editionNote` naming
`RCTF = 1/(2 sqrt((ae/D) - (ae/D)^2))`, `fz_prog = fz_target RCTF`, the half-immersion crossover, and the radial-only,
no-machine-cap caveats); `test/fixtures/worked-examples.json` (the 10% example + the quarter/half cross-check);
`test/fixtures/compute-map.js` (`radial-chip-thinning` -> `computeRadialChipThinning` in `../../calc-machining.js`);
`scripts/related-tiles.mjs` (-> `cutting-speed-rpm` / `material-removal-rate` / `spindle-power-torque` /
`ballnose-scallop-height`); `data/search/aliases.json` ("chip thinning", "radial chip thinning", "RCTF", "trochoidal
milling feed", "light radial engagement", "chip load compensation", "high feed milling", "stepover feed", "milling feed
adjustment"); the id appended to the existing machining renderers block in `app.js`; the `// dims:` annotation (`ae`/`D`/
`fz` length, `RCTF`/ratio dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the half-immersion `RCTF = 1` crossover, the `ae >= D/2` clamp, and the non-positive / non-finite error seams. No
new module; re-pin `calc-machining.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the crossover assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `RCTF` / `fz_prog` pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (ae/D 0.1 -> RCTF 1.667, fz 0.0067).

## 5. Roadmap position

Opens the machining depth batch (v317..v319) in `calc-machining.js`, correcting the feed the speeds-and-feeds tile
computes. Boring-bar deflection (v318) and the ballnose scallop (v319) follow. The axial (lead-angle) chip thinning, a
high-feed-mill lead-geometry factor, and a chain into `cutting-speed-rpm` that caps the compensated feed at the machine
limit are the deliberate next follow-ons once the trio lands.
