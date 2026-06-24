# roughlogic.com Specification v201 -- Branch Saddle Cutback Template (calc-pipefit.js, Group B, 1 New Tile)

> **Status: LANDED 2026-06-24 (package 0.81.0; part of catalog 648 -> 653). Batch spec-v199..v203 (plumbing/pipefitting -- hydronic radiant,
> condensate return, and three fabrication/process layout tiles).** In-scope catalog expansion under the
> spec-v106 trades-only charter: the run-and-branch companion to the existing miter and wraparound layout
> tiles. Adds one tile to **`calc-pipefit.js`** (Group B); no new module, group, or dependency. Inherits
> spec.md through spec-v200.md.
>
> **The gap, and the evidence for it.** The catalog lays out a mitered elbow (`pipe-miter-cut`) and wraps
> a template for an angled cut (`pipe-template-wrap`), but the most common shop cut after those is the
> **saddle**: a branch pipe notched to sit on the curved side of a run pipe for a welded branch
> connection. The fitter marks the cutback around the branch end so it conforms to the run cylinder, and
> that contour is a fixed function of the two diameters. The catalog has the elbow and the angled cut but
> not the branch-on-run saddle, so the cut is laid out by eye or with a purchased paper template.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The branch
and run outside diameters and the cutback ordinates are a length (`L`, in); the station angle around the
branch is an angle (degrees); the ordinate table is a list of (angle, cutback) pairs. The v18/v21
contract: any non-finite input, a non-positive diameter, or a branch OD larger than the run OD (no saddle
geometry for an equal-or-larger branch by this method) returns `{ error }`; the contour uses the
guarded-real square root `sqrt(R^2 - (r sin theta)^2)`. Citation discipline (v19/v22): `GOVERNANCE.general`
over the cylinder-intersection contour by name; `editionNote` names the Pipe Fabrication Institute
layout practice and states that **this is the geometric branch contour for a 90-degree, same-centerline
branch; weld bevel, gap, and root face are added per the WPS, and a reducing or angled branch shifts the
contour** -- a fit-up aid, not a weld procedure.

## 2. The tile

### 2.1 `branch-saddle-cutback` -- Saddle Contour Ordinates for a Branch on a Run

```
inputs:
  branch_od_in   L   branch pipe outside diameter, in   (r = branch_od_in / 2)
  run_od_in      L   run pipe outside diameter, in       (R = run_od_in / 2)
  stations       dimensionless  number of marks per quarter (default 6 -> every 15 degrees)

# theta measured around the branch from the line of the run axis (heel/toe):
cutback(theta) = R - sqrt(R^2 - (r x sin theta)^2)        # guarded: r <= R
# theta = 0 (in line with the run): cutback 0 (branch meets the crown)
# theta = 90 (perpendicular to the run): cutback is maximum
max_cutback = R - sqrt(R^2 - r^2)
```

**Pinned worked example.** A 2 in branch (OD 2.375, r = 1.1875) on a 6 in run (OD 6.625, R = 3.3125), 90
degrees, same centerline: at the sides (theta = 90), `max_cutback = 3.3125 - sqrt(3.3125^2 - 1.1875^2) =
3.3125 - 3.092 = ` **0.22 in**; at the heel and toe (theta = 0, in line with the run) the cutback is
**0** (the branch reaches the run crown). The full ordinate table steps between the two.
**Cross-check (bigger run, flatter saddle).** The same 2 in branch on a 12 in run (R = 6.3125):
`max_cutback = 6.3125 - sqrt(6.3125^2 - 1.1875^2) = 6.3125 - 6.200 = 0.11 in`. A larger run is a flatter
surface, so the saddle is shallower; as the run diameter grows the cutback approaches zero.

## 3. Wiring

A `tools-data.js` row (group `B`, trade `["pipefitting"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the cylinder-intersection contour, `editionNote` naming the
PFI layout practice and the geometry-only / WPS-adds-bevel caveat); `test/fixtures/worked-examples.json`
(example + cross-check); `test/fixtures/compute-map.js` (`branch-saddle-cutback` ->
`computeBranchSaddleCutback` in `../../calc-pipefit.js`); `scripts/related-tiles.mjs` (->
`pipe-miter-cut` / `pipe-template-wrap` / `pipe-fitting-takeout`); `data/search/aliases.json`
("saddle cut", "branch saddle", "fish mouth", "pipe notch", "branch contour", "saddle template"); the id
appended to the existing pipefit renderers declare in `app.js`; the `// dims:` annotation; regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, the cross-check, and error
seams (non-finite, diameter <= 0, branch OD > run OD). Raise the `calc-pipefit.js` size cap by ~20 percent
if needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block, the branch-OD > run-OD error path); `npm run build` (one
new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the ordinate
table wraps and stays readable on a phone); render-no-nan + a11y sweep, output read to the value (2 in on
6 in -> 0.22 in max cutback).

## 5. Roadmap position

Completes the fabrication-layout trio (elbow miter, angled wrap, branch saddle) so a fitter lays out any
of the three common shop cuts in one group. A reducing- or angled-branch contour and a lateral (45-degree
branch) template stay evidence-driven follow-ons.
