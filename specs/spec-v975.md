# roughlogic.com Specification v975 -- Slab Load-Transfer Dowel Schedule (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v974.md. Concrete-flatwork sweep, beside the
> accepted `control-joint-spacing` and `concrete-sawcut-footage` tiles.
>
> **The gap, and the evidence for it.** The catalog places control joints and saw cuts, but nothing counts the smooth
> LOAD-TRANSFER dowels a flatwork crew orders for those joints. Grep confirmed the only "dowel" tiles are bonded
> structural bars (rc-shear-friction, compression-dev-length, wood-bolt) -- a different mechanism. The number this
> settles: a 40 ft joint at 12 in on center takes **40 dowels**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, a count from ft and in), bounds-fuzzer, worked-example
registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive joint length / slab
thickness / spacing, a negative edge clearance, or fewer than 1 joint returns `{ error }`. Citation discipline (v19/v22):
the dowel schedule by name (ACI 302.1R / ACI 360R), `GOVERNANCE.general`; the note stresses that these are smooth,
greased, movement-permitting dowels (not bonded bars), that the diameter ~ t/8 is an advisory the ACI 302.1R table
governs, and that misaligned dowels lock the joint and crack the slab -- the structural drawings and engineer of record
govern.

## 2. The tile

### 2.1 `slab-dowel-schedule` -- Slab Load-Transfer Dowel Schedule (ACI 302)

```
inputs:
  joint_length_ft   joint length (ft), default 40
  slab_thickness_in slab thickness (in), default 6
  dowel_spacing_in  dowel spacing (in o.c.), default 12
  edge_clearance_in edge clearance (in), default 6
  num_joints        number of dowelled joints, default 5

dowels_per_joint  = floor((joint_length_ft x 12 - 2 x edge_clearance_in) / dowel_spacing_in) + 1
total_dowels      = dowels_per_joint x round(num_joints)
dowel_diameter_in = slab_thickness_in / 8   (advisory; ACI 302.1R table governs)
```

**Pinned worked example.** 40 ft joint, 6 in slab, 12 in o.c., 6 in edge clearance, 5 joints: per joint = `floor((480-12)
/12) + 1 = floor(39) + 1 = ` **40**, total = `40 x 5 = ` **200**, dowel diameter = `6/8 = ` **0.75 in**. Cross-check: a
tighter **8 in** spacing raises the count to `floor(468/8) + 1 = 58 + 1 = ` **59** per joint.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction"]`, beside `concrete-stair-volume`); a `tile-
meta.js` `_TILES` entry (`E`); a `citations.js` entry (ACI 302.1R / 360R, `GOVERNANCE.general`); `test/fixtures/worked-
examples.json` (the base example plus the tighter-spacing cross-check, pinning the counts and diameter); `test/fixtures/
compute-map.js` (`slab-dowel-schedule` -> `computeSlabDowelSchedule`, module `../../calc-concrete.js`); `scripts/related-
tiles.mjs` (-> `control-joint-spacing` / `concrete-sawcut-footage` / `rc-shear-friction`); `data/search/aliases.json` (5
collision-checked aliases: "slab dowels", "load transfer dowels", "dowel schedule", "concrete joint dowels", "dowel
count"), then `node scripts/build-alias-shards.mjs`; the tile is rendered by the `_simpleRenderer` factory in the
`CONCRETE_RENDERERS` map, and the id added to the calc-concrete declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the per-joint and total counts and diameter, the tighter-spacing / thicker-slab / longer-joint directions, and
the error seams. The calc-concrete.js gzip cap and the Group E group shell are watched at build. Home tile count 1,423 ->
1,424.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(40 ft / 6 in / 12 in / 6 in / 5 -> 40 per joint, 200 total).

## 5. Roadmap position

Concrete flatwork beside `control-joint-spacing`, serving the flatwork/concrete crew (concrete / construction).
Deliberately the dowel count with a t/8 size advisory; the ACI 302.1R dowel size/length/spacing table, the alignment
requirement (dowel basket), the structural drawings, ACI 360R, and the engineer of record govern. Stays evidence-driven.
Continues the concrete-flatwork sweep at 1 new spec (v975).
