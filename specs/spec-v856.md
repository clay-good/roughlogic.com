# roughlogic.com Specification v856 -- Solder and Flux per Sweat-Joint Takeoff (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v855.md. Plumbing install-ops sweep.
>
> **The gap, and the evidence for it.** Nothing takes off the **solder** for a copper rough-in -- the wire consumed per
> sweat joint and the spools to buy. Grep confirmed no solder tile. The wire weight is pure geometry (a length of solid
> wire of known diameter and density). The number this settles: 200 three-quarter-inch joints at about three-quarters of
> an inch of 1/8 in solid wire each is **0.55 lb** of solder (one spool), and a 2,000-joint job of 1 in pipe is over
> **7 lb**, so eight spools.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group B
plumbing takeoff siblings: the joint count and spool count are dimensionless, the wire length per joint and wire diameter
carry `L`, the solder density is `M L^-3`, the weight per inch is `M L^-1`, and the solder weight is `M`. The v18/v21
contract: a non-finite or non-positive joint count, wire length per joint, wire diameter, solder density, or spool weight
returns `{ error }`. Citation discipline (v19/v22): the solder-weight identity by name (weight per inch = pi/4 x diameter^2
x density; solder = joints x wire per joint x weight per inch), `GOVERNANCE.general`; the note states that the wire length
per joint is a field rule of thumb (roughly the pipe diameter in inches of 1/8 in solid wire) that varies with cup depth
and technique, that lead-free solder runs about 0.30 lb/in^3, and that the crew buys spools with a spare.

## 2. The tile

### 2.1 `solder-joint-quantity` -- Solder and Flux per Sweat-Joint Takeoff

```
inputs:
  joints                joints to sweat (count)
  wire_in_per_joint     solder wire consumed per joint (in, default 0.75)
  wire_dia_in           solder wire diameter (in, default 0.125)
  solder_density_lb_in3 solder density (lb/in^3, default 0.30)
  spool_lb              spool weight (lb, default 1)

w_per_in   = (PI/4) * wire_dia_in^2 * solder_density_lb_in3
solder_lb  = joints * wire_in_per_joint * w_per_in
spools     = ceil(solder_lb / spool_lb)
```

**Pinned worked example.** Joints 200, 0.75 in/joint, 1/8 in wire, 0.30 lb/in^3, 1 lb spools:
`w/in = (PI/4)*0.125^2*0.30 = ` **0.003682 lb/in**; `solder = 200*0.75*0.003682 = ` **0.55 lb**; `spools = ceil(0.55/1) = `
**1**. Cross-check: a 2,000-joint job of 1 in pipe (1 in wire per joint) is `2000*1*0.003682 = ` **7.36 lb** -> **8 spools**
-- the joint count and pipe size together drive it.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`, inside the `// Group B` plumbing block) -- the Group B
citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`B`); a `citations.js` entry (weight/in = pi/4 x
dia^2 x density; solder = joints x wire x weight/in, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the
pinned example plus the larger-job cross-check); `test/fixtures/compute-map.js` (`solder-joint-quantity` ->
`computeSolderJointQuantity`, module `../../calc-plumbing.js`); `scripts/related-tiles.mjs` (-> `pipe-volume` /
`pipe-insulation-takeoff` / `pipe-expansion-loop`); `data/search/aliases.json` (5 collision-checked aliases: "solder per
joint", "sweat joint solder", "copper solder takeoff", "solder wire quantity", "plumbing solder spools"); a hand-written
renderer in the `PLUMBING_RENDERERS` map mirroring a simple output renderer (non-exported, so no DOM-sentinel dims row),
and the id added to the calc-plumbing declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the weight per inch, the
solder weight, the spool count, and the error seams (non-positive joints, wire per joint, diameter, density, spool
weight). The calc-plumbing.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,304 -> 1,305.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group B audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((PI/4)*0.125^2*0.30 * 200 * 0.75 -> 0.55 lb).

## 5. Roadmap position

Opens the plumbing install-ops vein, serving the plumber / pipefitter (plumbing). Next candidate: pipe insulation
takeoff. Stays evidence-driven; field technique governs the wire per joint.
