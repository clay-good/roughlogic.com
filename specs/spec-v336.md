# roughlogic.com Specification v336 -- Minimum Crest Vertical Curve Length for Stopping Sight Distance (AASHTO) (calc-civil.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v335..v337 (the roadway geometric-design trio -- superelevation
> (v335), the minimum vertical-curve length for sight distance (this spec), the horizontal sightline offset (v337)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `vertical-curve` computes elevations along a parabolic
> curve and its high/low point, but not the minimum curve length a crest needs so a driver can see far enough to stop -- the
> AASHTO sight-distance control that governs how flat a hill crest must be. Adds one tile to the existing **`calc-civil.js`**
> module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v335.md.
>
> **The gap, and the evidence for it.** On a crest vertical curve the sightline is limited by the pavement, so AASHTO sets
> the minimum length `L` from the algebraic grade change `A` (percent) and the stopping sight distance `S` (ft): when
> `S <= L`, `L = A S^2 / 2158`; when `S > L`, `L = 2 S - 2158/A`, where the `2158` embeds the driver eye height (3.5 ft) and
> object height (2.0 ft). For a crest joining a +2% to a -3% grade (`A = 5`) at a 570 ft SSD (60 mph), the `S <= L` form
> gives `L = 5 x 570^2 / 2158 = 753 ft` -- the minimum crest length, and the number that decides whether a hill must be cut
> down. A gentler `A = 3` grade change yields a governing `L = 2 x 570 - 2158/3 = 421 ft` from the `S > L` branch. The
> vertical-curve tile draws the curve; this tile sizes it for sight.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The algebraic grade
difference `A` is a dimensionless percentage (`|g2 - g1|`); the sight distance `S` and the minimum curve length `L` are
lengths (ft); the sight-distance constant (2158 for SSD crest, or 2800 for passing) is embedded. The v18/v21 contract: any
non-finite input, or an `A` or `S` at or below zero, returns `{ error }`; both branch forms are evaluated and the governing
one selected by the `S` vs `L` comparison. Citation discipline (v19/v22): `GOVERNANCE.general` over the AASHTO crest-curve
sight-distance relations by name; `editionNote` names **the AASHTO Green Book crest vertical-curve minimums
`L = A S^2 / 2158` for `S <= L` and `L = 2 S - 2158/A` for `S > L`, the `2158` constant from a 3.5 ft eye and 2.0 ft object
height, the `K = L/A` rate-of-vertical-curvature form, and the sag-curve headlight/comfort controls as separate cases**,
and states that **this returns the minimum crest vertical-curve length for the entered stopping sight distance -- it is the
crest SSD control (passing sight distance uses a larger constant, and sag curves use headlight/comfort/drainage criteria),
takes the SSD as entered (from `stopping-sight-distance` at the design speed), and does not check the drainage-maximum
`K = 167` or the appearance minimum; and this is a design aid, not a substitute for a licensed civil engineer's design** --
the engineer of record and the AASHTO / state DOT manual govern.

## 2. The tile

### 2.1 `vertical-curve-sight-distance` -- Minimum Crest Vertical Curve Length for SSD (AASHTO)

```
inputs:
  A_pct    %     algebraic grade difference |g2 - g1| (percent)
  S_ft     ft    stopping sight distance
  C        -     sight constant (default 2158 SSD crest; 2800 passing)

L_1 = A_pct * S_ft^2 / C                          ; assume S <= L
L   = (S_ft <= L_1) ? L_1 : (2*S_ft - C/A_pct)    ; governing minimum length
K   = L / A_pct                                    ; rate of vertical curvature
```

**Pinned worked example (a +2% to -3% crest, A = 5, at 570 ft SSD).** `A = 5`, `S = 570`:
`L_1 = 5 x 570^2 / 2158 = 5 x 324,900 / 2158 = 753 ft`; since `S = 570 <= 753`, the `S <= L` form governs, `L = 753 ft`,
`K = 753/5 = 151 ft/%`. **Cross-check (a gentler A = 3 crest).** `L_1 = 3 x 324,900 / 2158 = 452 ft`; now `S = 570 > 452`,
so the `S > L` branch governs: `L = 2 x 570 - 2158/3 = 1,140 - 719 = 421 ft`, `K = 140` -- the branch switch when the sight
distance exceeds the curve, and a shorter minimum than the naive first form suggested. The non-finite and non-positive
error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["surveying","civil"]`, matching `vertical-curve`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the AASHTO crest relations, `editionNote` naming both branch forms,
the 2158 constant, the `K` form, and the crest-SSD-only, sag-separate, no-drainage-max caveats);
`test/fixtures/worked-examples.json` (the A5 example + the A3 branch-switch cross-check); `test/fixtures/compute-map.js`
(`vertical-curve-sight-distance` -> `computeVerticalCurveSightDistance` in `../../calc-civil.js`);
`scripts/related-tiles.mjs` (-> `vertical-curve` / `stopping-sight-distance` / `superelevation` /
`horizontal-sightline-offset`); `data/search/aliases.json` ("vertical curve length", "crest curve sight distance", "K
value", "AASHTO vertical curve", "minimum curve length", "sight distance crest", "rate of vertical curvature", "hill crest
sight", "SSD vertical curve"); the id appended to the existing civil renderers block in `app.js`; the `// dims:` annotation
(`A` percent, `S`/`L` length, `K` length/percent); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the `S` vs `L` branch switch, the `K` form, and the non-positive / non-finite error seams. No new
module; re-pin `calc-civil.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the branch-switch assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `L` / `K` outputs wrap on a phone);
render-no-nan + a11y sweep, output read to the value (A 5, S 570 -> L 753 ft).

## 5. Roadmap position

Middle of the roadway geometric-design batch (v335..v337) in `calc-civil.js`, adding the sight-distance length control to
the vertical-curve elevation tile. The horizontal sightline offset (v337) follows. The sag-curve headlight/comfort/drainage
controls, the passing-sight-distance constant, and a design-speed-to-SSD chain from `stopping-sight-distance` are the
deliberate next follow-ons once the trio lands.
