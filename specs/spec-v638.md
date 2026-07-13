# roughlogic.com Specification v638 -- Sag Vertical Curve Comfort and Drainage Criteria (calc-civil.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-civil.js`** (Group E,
> civil), no new module, group, or dependency. Inherits spec.md through spec-v637.md.
>
> **The gap, and the evidence for it.** Spec-v636 (`sag-vertical-curve`) sizes a sag curve for the governing headlight
> stopping-sight-distance control, and its own citation hands the rest off explicitly: "the comfort criterion
> `L = A V^2 / 46.5` and drainage `K <= 167` are separate checks," and it closed by naming them as "separate, simpler
> checks a future tile could add if evidence warrants." Those are the AASHTO Green Book's two other sag controls. The
> **comfort** criterion `L = A V^2 / 46.5` (A the algebraic grade difference in percent, V the design speed in mph, L
> the length in ft) is the length that holds the vertical (centripetal) acceleration on the sag to about 1 ft/s^2. The
> **drainage** maximum `K <= 167` bounds the curve from the other side: a curve too flat drains poorly, and 167
> corresponds to reaching a 0.30% minimum grade within 50 ft of the low point (`50/0.30 = 166.7`), so the drainage-max
> length is `167 A`. Neither shipped tile returns either. The number this settles: a 4% grade break at a 60 mph design
> speed needs at least a **310 ft** sag curve (K **77.4**) for comfort and no more than **668 ft** for drainage -- the
> two companions the headlight tile deliberately left for this one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`sag-vertical-curve` headlight sibling: the grade difference is `dimensionless` (percent), the design speed is a
velocity `L T^-1`, and the lengths and the rate of vertical curvature K are `L` (ft, and ft per percent as the sag
sibling labels K). The comfort constant `46.5` embeds the AASHTO ~1 ft/s^2 vertical-acceleration limit with V in mph
and L in ft (the same class of Green Book design constant the headlight tile bakes into its 400/3.5); the drainage
maximum `167` embeds the 0.30% minimum grade within 50 ft of the low point (`50/0.30 = 166.7`). The v18/v21 contract:
any non-finite input, or a non-positive grade difference or design speed, returns `{ error }`, matching the headlight
sibling. Citation discipline (v19/v22): AASHTO A Policy on Geometric Design of Highways and Streets (the Green Book),
sag comfort and drainage criteria, by name; the note states that **these two criteria bracket the acceptable length,
the headlight stopping-sight-distance criterion (the separate `sag-vertical-curve` tile) is the governing sag control
for stopping and typically the most restrictive, and a licensed civil engineer's design governs**.

## 2. The tile

### 2.1 `sag-vertical-curve-comfort` -- Sag Curve Comfort and Drainage Lengths

```
inputs:
  A_pct   %    algebraic grade difference |g2 - g1| (> 0)
  V_mph   mph  design speed (> 0)

L = A x V_mph^2 / 46.5                            [ft]   (comfort minimum length)
K = L / A = V_mph^2 / 46.5                        [ft per %]
L_drainage_max = 167 x A                          [ft]   (drainage maximum, curbed sections)
drainage_ok = (K <= 167)
```

**Pinned worked example (a 4% sag at 60 mph).** A = 4%, V = 60 mph: `L = 4 x 60^2 / 46.5 = 14400/46.5 = ` **309.7 ft**,
`K = 309.7/4 = 3600/46.5 = ` **77.4 ft/%**, `L_drainage_max = 167 x 4 = ` **668 ft**; K 77.4 <= 167 so the comfort
length drains fine. **Cross-check (a sharper break, faster road).** A = 6%, V = 70 mph: `L = 6 x 70^2 / 46.5 =
29400/46.5 = ` **632.3 ft**, `K = 4900/46.5 = ` **105.4 ft/%** -- note K depends only on the design speed (`V^2/46.5`),
not on the grade break. Only an unrealistic design speed above ~88 mph (`sqrt(167 x 46.5)`) would push the comfort
length past the drainage maximum; in the normal range the comfort length is only about half the headlight length.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["surveying", "civil"]`, beside `sag-vertical-curve`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (AASHTO Green Book sag comfort + drainage criteria, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`sag-vertical-curve-comfort` ->
`computeSagVerticalCurveComfort` in `../../calc-civil.js`); `scripts/related-tiles.mjs` (-> `sag-vertical-curve` /
`vertical-curve-sight-distance` / `stopping-sight-distance` / `superelevation`); `data/search/aliases.json` ("sag
vertical curve comfort", "sag curve comfort criterion", "sag vertical curve drainage", "sag curve drainage criterion",
plus adjacent and question rows); `CIVIL_RENDERERS["sag-vertical-curve-comfort"]` via a hand-written renderer (the
module's `makeNumber` / `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring
`sag-vertical-curve`) and the id added to the calc-civil declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + derivations; a `bounds-fuzzer.test.js` block pinning both
examples, the V-only K dependence, the drainage flag, and the error seams (non-finite, non-positive A / V). Group E has
no exact audit-count assertion and the mechanical-governance test is an explicit list, so no count bump. The
calc-civil.js gzip cap is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one
new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to
the value (the pinned example -> comfort L 309.7 ft, K 77.4 ft/%, drainage max 668 ft).

## 5. Roadmap position

Completes the sag-curve control set spec-v337 and spec-v636 opened: the crest tile controls for crest SSD, the
headlight tile for the governing sag stopping control, and this one for the comfort and drainage sag criteria the
headlight citation named. The AASHTO sag control set is now closed. Further Group E growth stays evidence-driven.
