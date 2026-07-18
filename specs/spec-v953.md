# roughlogic.com Specification v953 -- Crane Load Radius and Boom-Tip Height from Boom Geometry (calc-rigging.js, Group Z, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`** (Group Z),
> no new module, group, or dependency. Inherits spec.md through spec-v952.md. Crane lift-planning sweep, beside the
> accepted `crane-net-capacity`, `crane-outrigger-reaction`, and `crane-lift-quick` tiles.
>
> **The gap, and the evidence for it.** The crane suite deducts capacity, checks outrigger reactions, and figures ground
> bearing -- but every one of those takes the load RADIUS as an input, and nothing derives it. The operator reads a boom
> ANGLE off the boom-angle indicator; the load chart is indexed by radius. Grep confirmed no boom-geometry tile. The
> number this settles: a 30 ft boom at 60 degrees puts the hook at a **19 ft radius**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, since the trig mixes lengths and a degree angle),
bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a
non-positive boom length or target radius, a boom angle outside 0-90 degrees, or a negative offset/height returns
`{ error }`; a target radius beyond the boom's reach is FLAGGED (target_reachable false, angle null), not an error, since
the forward radius/height outputs stay valid. Citation discipline (v19/v22): the boom-geometry relations by name,
`GOVERNANCE.rigging`; the note states plainly that this is RIGID-boom geometry -- boom deflection under load, rope
stretch, and an out-of-level machine all INCREASE the real radius and cut capacity -- and that the load chart, the
load-moment indicator, and a qualified operator/lift director govern the rated capacity.

## 2. The tile

### 2.1 `crane-load-radius-boom` -- Crane Load Radius and Boom-Tip Height from Boom Geometry

```
inputs:
  boom_length_ft        boom length (ft), default 30
  boom_angle_deg        boom angle from horizontal (deg, 0-90), default 60
  boom_foot_offset_ft   boom-foot horizontal offset from the center of rotation (ft), default 4
  boom_foot_height_ft   boom-foot height above ground (ft), default 6
  target_radius_ft      a target load radius for the inverse (ft), default 25

load_radius_ft            = boom_foot_offset_ft + boom_length_ft x cos(boom_angle_deg)
boom_tip_height_ft        = boom_foot_height_ft + boom_length_ft x sin(boom_angle_deg)
angle_for_target_radius   = acos((target_radius_ft - boom_foot_offset_ft) / boom_length_ft)  [flagged if out of reach]
```

**Pinned worked example.** 30 ft boom at 60 degrees, foot 4 ft out and 6 ft up: radius = `4 + 30 cos60 = ` **19 ft**,
tip height = `6 + 30 sin60 = ` **31.98 ft**, and the angle for a 25 ft radius is `acos((25-4)/30) = acos(0.7) = ` **45.57
degrees**. Cross-check: lowering the same boom to 45 degrees swings the hook out to `4 + 30 cos45 = ` **25.21 ft** -- a
lower boom means a longer radius and a lower tip, exactly the trade the operator watches.

## 3. Wiring

A `tools-data.js` row (group `Z`, trades `["rigging"]`, beside `crane-outrigger-reaction`); a `tile-meta.js` `_TILES`
entry (`Z`); a `citations.js` entry (crane boom geometry, `GOVERNANCE.rigging`); `test/fixtures/worked-examples.json`
(the 60-degree example plus the 45-degree cross-check, pinning the radius, tip height, and inverse angle);
`test/fixtures/compute-map.js` (`crane-load-radius-boom` -> `computeCraneLoadRadiusBoom`, module `../../calc-
rigging.js`); `scripts/related-tiles.mjs` (-> `crane-net-capacity` / `crane-lift-quick` / `crane-outrigger-reaction`);
`data/search/aliases.json` (5 collision-checked aliases: "crane load radius", "boom angle radius", "load radius from
boom angle", "boom tip height", "crane boom geometry"), then `node scripts/build-alias-shards.mjs`; a hand-written
renderer in the `RIGGING_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-rigging
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the radius and tip height, the inverse angle, the lower-boom
trade, the out-of-reach flag, the horizontal-boom case, and the error seams. The calc-rigging.js gzip cap and the Group Z
group shell are watched at build (cap raised for this tile). Home tile count 1,401 -> 1,402.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(30 ft / 60 deg -> 19 ft radius, 31.98 ft tip).

## 5. Roadmap position

Crane lift planning beside `crane-net-capacity`, serving the crane operator / rigger / lift director (rigging).
Deliberately rigid-boom geometry; boom deflection, rope stretch, out-of-level, the load chart, and the load-moment
indicator govern the rated capacity at radius. Feeds the crane capacity/outrigger/ground-bearing tiles, which take the
radius this derives. Stays evidence-driven. Continues the crane lift-planning sweep at 1 new spec (v953).
