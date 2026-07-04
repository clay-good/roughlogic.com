# roughlogic.com Specification v401 -- Spur Gear Tooth Geometry (Diametral Pitch) (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Third and final tile of the fabrication shop-math trio (v399 tolerance stack -> v400 cone
> flat pattern -> v401 spur-gear geometry). `gear-cascade` computes ratios and output RPM through a gear train, but never the
> tooth dimensions -- the pitch, outside, and root diameters a machinist needs to cut or inspect a spur gear.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A spur gear's dimensions all follow from its diametral
> pitch `Pd` (teeth per inch of pitch diameter) and its tooth count `N`: the pitch diameter is `PD = N/Pd`, the outside
> diameter `OD = (N+2)/Pd`, the addendum `1/Pd`, the dedendum `1.25/Pd`, the whole depth `2.25/Pd`, and the root diameter
> `(N-2.5)/Pd`; a meshing pair sits at center distance `(N1+N2)/(2*Pd)`. `gear-cascade` gives ratios only. This adds the
> tooth-geometry tile to the existing **`calc-machining.js`** module (Group K); no new group, trade, or dependency. Inherits
> spec.md through spec-v400.md.
>
> **The gap, and the evidence for it.** A `10` diametral-pitch gear with `40` teeth has `PD = 40/10 = 4.000 in`,
> `OD = (40+2)/10 = 4.200 in`, addendum `0.100 in`, dedendum `0.125 in`, whole depth `0.225 in`, and root diameter
> `(40-2.5)/10 = 3.750 in`; meshed with a `20`-tooth pinion the center distance is `(40+20)/(2*10) = 3.000 in`. No tile does
> this; a machinist blanking or inspecting a gear had `gear-cascade` for the ratio but nothing for the cutting dimensions.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The diametral pitch `Pd` is
an inverse length (teeth/in, handled dimensionlessly per the v14 convention) and the tooth counts are dimensionless; the
pitch, outside, root diameters, tooth depths, and center distance are lengths (in). The v18/v21 contract: any non-finite
input, or a non-positive diametral pitch or tooth count, returns `{ error }`; the tile assumes a standard full-depth
`20 deg` involute tooth (the common proportions) and reports the pitch/outside/root diameters, addendum, dedendum, whole
depth, circular pitch, and the meshing center distance when a second tooth count is given. Citation discipline (v19/v22):
`GOVERNANCE.general` over spur-gear proportions by name; `editionNote` names **the Machinery's Handbook / AGMA full-depth
spur-gear proportions: `PD = N/Pd`, `OD = (N+2)/Pd`, addendum `1/Pd`, dedendum `1.25/Pd`, whole depth `2.25/Pd`, root
`(N-2.5)/Pd`, circular pitch `pi/Pd`, and center distance `(N1+N2)/(2*Pd)`**, and states that **this returns standard
full-depth involute tooth dimensions for cutting or inspection, that stub or non-standard systems use different addendum
constants, and that it is a shop aid, not a substitute for the gear drawing or an AGMA rating**.

## 2. The tile

### 2.1 `spur-gear-geometry` -- Spur Gear Tooth Geometry (Diametral Pitch)

```
inputs:
  diametral_pitch  1/in   teeth per inch of pitch diameter (Pd)
  teeth            -      number of teeth (N)
  mating_teeth     -      teeth on the mating gear (optional, for center distance)

pitch_dia   = teeth / diametral_pitch
outside_dia = (teeth + 2) / diametral_pitch
addendum    = 1 / diametral_pitch
dedendum    = 1.25 / diametral_pitch
whole_depth = 2.25 / diametral_pitch
root_dia    = (teeth - 2.5) / diametral_pitch
center_dist = (teeth + mating_teeth) / (2 * diametral_pitch)
```

**Pinned worked example (Pd 10, N 40, mating 20).** `PD = 4.000 in`, `OD = 4.200 in`, addendum `0.100 in`, dedendum
`0.125 in`, whole depth `0.225 in`, root `3.750 in`, center distance `3.000 in`. **Cross-check (a finer pitch).** At
`Pd = 20`, `N = 40`, `PD = 2.000 in` and `OD = 2.100 in` -- a finer pitch halves every dimension, smaller teeth for the same
count. A non-positive pitch or tooth count takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machinist"]`, near `gear-cascade` / `cutting-speed-rpm`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, Machinery's Handbook / AGMA spur-gear proportions,
`editionNote` naming the `PD`/`OD`/addendum/dedendum/whole-depth/root/center-distance relations and the full-depth
assumption); `test/fixtures/worked-examples.json` (the Pd-10 example + the finer-pitch cross-check);
`test/fixtures/compute-map.js` (`spur-gear-geometry` -> `computeSpurGearGeometry` in `../../calc-machining.js`);
`scripts/related-tiles.mjs` (-> `gear-cascade` / `cutting-speed-rpm` / `dividing-head` / `bolt-circle`);
`data/search/aliases.json` ("spur gear geometry", "gear tooth dimensions", "diametral pitch gear", "pitch diameter gear",
"gear addendum dedendum", "outside diameter gear", "gear center distance", "gear cutting dimensions", "root diameter gear");
the id appended to the existing machining renderers block in `app.js`; the `// dims:` annotation (Pd/teeth dimensionless,
diameters/depths length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
finer-pitch scaling, and the non-positive / non-finite error seams. No new module; re-pin `calc-machining.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the diameter/depth set wraps on a phone); render-no-nan + a11y
sweep, output read to the value (Pd 10, N 40 -> PD 4.000, OD 4.200, root 3.750 in).

## 5. Roadmap position

Closes the fabrication shop-math trio: v399 stacks tolerances, v400 develops a cone blank, and v401 lays out gear teeth --
three shop-floor layout and inspection tools. A module (metric) gear-geometry mode and a Lewis-form-factor bending-stress
tile are the deliberate next follow-ons.
