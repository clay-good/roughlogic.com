# roughlogic.com Specification v394 -- Minimum Flexural Reinforcement As,min (ACI 318-19 9.6.1.2) (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.138.0; proposed 2026-07-03). Second tile of the concrete design-details trio (v393 T-beam flange -> v394 minimum
> flexural steel -> v395 crack-control spacing). `rc-beam-flexure` computes a beam's moment capacity from a given steel
> area, but never enforces the code floor: a lightly reinforced beam can fail more abruptly than a plain one, so ACI sets a
> minimum flexural reinforcement the catalog does not check.**
> In-scope catalog expansion under the spec-v106 trades-only charter. To keep a beam from failing suddenly the instant it
> cracks, ACI 318-19 §9.6.1.2 requires a minimum tension steel area `As,min = max(3*sqrt(f'c)/fy, 200/fy) * bw * d`. The
> `3*sqrt(f'c)` term governs for higher-strength concrete and the flat `200` term for `f'c` below about `4444 psi`.
> `rc-beam-flexure` reports `Mn` for whatever `As` you give it; it never tells you the steel is below the code minimum. This
> adds the minimum-steel tile to the existing **`calc-concrete.js`** module (Group E); no new group, trade, or dependency.
> Inherits spec.md through spec-v393.md.
>
> **The gap, and the evidence for it.** A `12 in` by `20 in`-effective-depth beam of `4000 psi` concrete with Grade 60 steel
> needs `As,min = max(3*sqrt(4000)/60000, 200/60000) * 12 * 20 = max(0.00316, 0.00333) * 240 = 0.00333 * 240 = 0.80 in^2` --
> the `200/fy` term governs at this strength. Move to `5000 psi` and `3*sqrt(5000)/60000 = 0.00354` overtakes `200/fy`, so
> `As,min = 0.00354 * 240 = 0.85 in^2`. No tile does this; a beam designed only with `rc-beam-flexure` could quietly sit
> below the code floor.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The specified strength `f'c`
and the yield strength `fy` are pressures (psi); the web width `bw` and effective depth `d` are lengths (in); the minimum
steel area is an area (in^2). The v18/v21 contract: any non-finite input, or a non-positive `f'c`, `fy`, `bw`, or `d`,
returns `{ error }`; the tile reports both candidate ratios, which one governs, and the resulting `As,min`, and notes the
§9.6.1.3 exemption (a beam with `As` at least one-third greater than required by analysis need not meet the minimum).
Citation discipline (v19/v22): `GOVERNANCE.general` over the ACI minimum flexural reinforcement by name; `editionNote` names
**ACI 318-19 §9.6.1.2, `As,min = max(3*sqrt(f'c)/fy, 200/fy) * bw * d`, the `3*sqrt(f'c)` term governing above about
`4444 psi` and the `200` term below, and the §9.6.1.3 one-third-excess exemption**, and states that **this returns the
lower bound on tension flexural steel that prevents a sudden post-cracking failure, that it is a minimum (strength may
require more), and that it is a design aid, not a substitute for the engineer of record**.

## 2. The tile

### 2.1 `concrete-beam-min-flexural-steel` -- Minimum Flexural Reinforcement As,min (ACI 318-19)

```
inputs:
  fc_psi   psi   specified compressive strength f'c
  fy_psi   psi   reinforcement yield strength
  bw_in    in    web width
  d_in     in    effective depth to tension steel

ratio = max( 3*sqrt(fc_psi)/fy_psi , 200/fy_psi )
as_min_in2 = ratio * bw_in * d_in
```

**Pinned worked example (4000 psi, Grade 60, 12 in x 20 in).** `3*sqrt(4000)/60000 = 0.00316`, `200/60000 = 0.00333`;
the flat term governs, so `As,min = 0.00333*12*20 = 0.80 in^2`. **Cross-check (higher-strength concrete).** At `5000 psi`,
`3*sqrt(5000)/60000 = 0.00354 > 0.00333`, so the square-root term governs and `As,min = 0.00354*240 = 0.85 in^2`. A
non-positive input takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete"]`, beside `rc-beam-flexure`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, ACI 318-19 §9.6.1.2, `editionNote` naming the `max(3*sqrt(f'c)/fy, 200/fy)*bw*d`
relation, the governing-term crossover, and the one-third-excess exemption); `test/fixtures/worked-examples.json` (the
200/fy-governs example + the 3-sqrt-governs cross-check); `test/fixtures/compute-map.js`
(`concrete-beam-min-flexural-steel` -> `computeConcreteBeamMinFlexuralSteel` in `../../calc-concrete.js`);
`scripts/related-tiles.mjs` (-> `rc-beam-flexure` / `t-beam-effective-flange-width` / `concrete-shrinkage-temperature-steel`
/ `rc-doubly-reinforced`); `data/search/aliases.json` ("minimum flexural reinforcement", "As min beam", "3 sqrt fc over fy",
"200 bw d over fy", "aci 9.6.1.2", "minimum steel beam", "min rebar flexure", "concrete beam minimum steel", "flexural
minimum"); the id appended to the existing concrete renderers block in `app.js`; the `// dims:` annotation (strengths
pressure, dims length, area area); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the governing-term crossover, and the non-positive / non-finite error seams. No new module; re-pin
`calc-concrete.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the crossover assertion, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the ratio / As,min pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (4000/60000/12/20 -> 0.80 in^2, 200/fy governs).

## 5. Roadmap position

The middle of the concrete design-details trio: it sets the lower steel bound for the T-beam section `t-beam-effective-
flange-width` (v393) defines, and `concrete-crack-control-spacing` (v395) then checks how that steel is distributed. A
maximum-reinforcement / minimum-tension-strain (`epsilon_t >= 0.004`) tension-controlled check is the deliberate next
follow-on.
