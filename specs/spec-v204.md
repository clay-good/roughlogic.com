# roughlogic.com Specification v204 -- Branch Connection Reinforcement (Area Replacement, ASME B31.1) (calc-pipefit.js, Group B, 1 New Tile)

> **Status: LANDED 2026-06-24 (package 0.82.0; part of catalog 653 -> 656). Batch spec-v204..v206 (plumbing/pipefitting -- the deferred
> process/specialized cluster: branch reinforcement, expansion guide spacing, medical gas demand).**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-pipefit.js`** (Group B); no new module, group, or dependency. Inherits spec.md through
> spec-v203.md.
>
> **The gap, and the evidence for it.** `pipe-pressure-rating` (v160) rates the wall of an unbroken pipe,
> but the moment a fitter cuts a branch opening into a pressurized run, that wall is interrupted and the
> metal removed must be made up nearby -- the area-replacement check of ASME B31.1 / B31.3. It is the
> calc that decides whether a fabricated tee needs a reinforcing pad or whether the excess wall already
> there is enough. The catalog rates the pipe and torques the flange but never checks the branch opening,
> so the "do I need a repad" question is answered by habit rather than the area balance.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The run and
branch outside diameters, nominal and required wall thicknesses, the effective opening `d1`, and the zone
half-width and height are a length (`L`, in); the replacement areas are `L^2` (in^2); the branch angle is
an angle; the adequacy result is boolean and the pad-area deficiency is `L^2`. The v18/v21 contract: any
non-finite input, a non-positive diameter or wall, a required wall not less than the nominal wall (no
excess to credit), or a branch angle outside (0, 90] returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the area-replacement relations by name; `editionNote` names **ASME B31.1 para
104.3.1 (and B31.3 304.3 for process)** and states that **the required thicknesses come from the pressure
design (see `pipe-pressure-rating`), the reinforcement zone limits and the weld/pad area follow the
code's figure, and the engineer of record and the AHJ govern** -- this is the area balance, not a stamped
branch-connection design.

## 2. The tile

### 2.1 `branch-reinforcement` -- Area Replacement for a Branch Opening

```
inputs:
  run_od_in     L   run (header) outside diameter, in
  run_wall_in   L   run nominal wall (after mill tolerance), in        (T_h)
  run_treq_in   L   run required wall for pressure, in                  (t_rh, from pipe-pressure-rating)
  branch_od_in  L   branch outside diameter, in
  branch_wall_in L  branch nominal wall, in                            (T_b)
  branch_treq_in L  branch required wall for pressure, in              (t_rb)
  beta_deg      angle  branch angle to the run (90 = perpendicular)

d1 = (branch_od_in - 2 x branch_wall_in) / sin(beta)        # effective opening in the run
A_required = run_treq_in x d1 x (2 - sin(beta))
d2 = max(d1, (branch_wall_in + run_wall_in + d1/2))         # reinforcement zone half-width
L4 = min(2.5 x run_wall_in, 2.5 x branch_wall_in)           # zone height up the branch (no pad)
A1 = (2 x d2 - d1) x (run_wall_in - run_treq_in)            # excess metal in the run
A2 = 2 x L4 x (branch_wall_in - branch_treq_in)             # excess metal in the branch
adequate    = (A1 + A2) >= A_required
pad_area    = max(0, A_required - (A1 + A2))                # reinforcing-pad area to add, if any
```

**Pinned worked example (excess wall is enough, no pad).** NPS 6 Sch 40 run (OD 6.625, wall 0.280, t_rh
0.10) with an NPS 2 Sch 40 branch (OD 2.375, wall 0.154, t_rb 0.034) at 90 deg: `d1 = 2.375 - 2 x 0.154 =
2.067 in`; `A_required = 0.10 x 2.067 x 1 = 0.207 in^2`; `d2 = 2.067`; `A1 = (2 x 2.067 - 2.067) x (0.280
- 0.10) = 2.067 x 0.180 = 0.372 in^2`. `A1 alone (0.372) >= 0.207` -> **adequate, no pad** (A2 adds
further margin).
**Cross-check (higher pressure needs a pad).** Same fitting but a pressure that drives `t_rh = 0.22 in`
(thin remaining excess): `A_required = 0.22 x 2.067 = 0.455 in^2`; `A1 = 2.067 x (0.280 - 0.22) = 0.124
in^2`; with `A2 ~ 0.072 in^2` the total 0.196 in^2 falls short -> **pad required, ~0.259 in^2** of added
reinforcement. The same opening flips from adequate to repad as the required wall climbs.

## 3. Wiring

A `tools-data.js` row (group `B`, trade `["pipefitting"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the area-replacement relations, `editionNote` naming ASME
B31.1 104.3.1 / B31.3 304.3 and the EOR-governs caveat); `test/fixtures/worked-examples.json` (adequate
example + pad-needed cross-check); `test/fixtures/compute-map.js` (`branch-reinforcement` ->
`computeBranchReinforcement` in `../../calc-pipefit.js`); `scripts/related-tiles.mjs` (->
`pipe-pressure-rating` / `branch-saddle-cutback` / `flange-rating`); `data/search/aliases.json`
("branch reinforcement", "area replacement", "reinforcing pad", "repad", "branch connection", "B31.1
104.3"); the id appended to the existing pipefit renderers declare in `app.js`; the `// dims:`
annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and
error seams (non-finite, diameter/wall <= 0, `run_treq >= run_wall`, beta outside (0,90]). Raise the
`calc-pipefit.js` size cap by ~20 percent if needed (dated comment). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block, the pad-needed path); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the area stack and the
adequate/pad verdict wrap on a phone); render-no-nan + a11y sweep, output read to the value (6 x 2 Sch 40,
t_rh 0.10 -> A1 0.372 >= A_req 0.207, adequate).

## 5. Roadmap position

Extends the process-piping pair (`pipe-pressure-rating`, this) and pairs with `branch-saddle-cutback`
(the same branch, laid out there and reinforced here). Additional B31.3 process allowables and a
full reinforcing-pad-with-weld area credit stay evidence-driven follow-ons.
