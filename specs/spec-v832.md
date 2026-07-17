# roughlogic.com Specification v832 -- Restrained-Joint Length at a Pipe Bend (calc-earthwork.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v831.md. Underground-utility sweep, the restrained-
> joint alternative to the existing `thrust-block-sizing` / `thrust-block-max-pressure` tiles.
>
> **The gap, and the evidence for it.** The catalog sizes concrete **thrust blocks** but nothing gives the **restrained-
> joint length** -- the run of restrained pipe on each side of a bend that mobilizes enough soil friction to hold the
> thrust when a block will not fit. Grep confirmed no restrained-joint / restrained-length tile. The number this settles:
> a 12-in main at 150 psi through a 90-degree bend throws **24,000 lb** of thrust, so at 600 lb/ft of soil resistance the
> crew must restrain about **40 ft** each side of the fitting -- and a gentler 45-degree bend needs only half that.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the thrust-block
siblings: the pipe outside diameter carries `L`, the pressure `M L^-1 T^-2`, the bend angle is dimensionless (degrees),
the unit resistance is force-per-length `M T^-2`, the thrust is a force `M L T^-2`, and the restrained length is `L`. The
v18/v21 contract: a non-finite or non-positive pipe diameter, pressure, or unit resistance returns `{ error }`; a bend
angle outside 0-180 (exclusive) returns `{ error }`. Citation discipline (v19/v22): the thrust and restrained-length
identity by name (thrust = 2 x pressure x area x sin(bend/2); length each side = thrust / unit resistance),
`GOVERNANCE.general`; the note states that the unit soil resistance (pipe friction plus fitting bearing per foot) comes
from the restraint manufacturer's tables (EBAA / AWWA M41) with the site soil parameters entered here, that this is the
alternative to a thrust block, and that the engineer and AHJ govern.

## 2. The tile

### 2.1 `restrained-pipe-length` -- Restrained-Joint Length at a Pipe Bend

```
inputs:
  pipe_od_in         pipe outside diameter (in)
  pressure_psi       design (test) pressure (psi)
  bend_angle_deg     horizontal bend angle (degrees)
  unit_resistance_plf soil resistance per foot of restrained pipe (lb/ft)

area_in2            = (PI/4) * pipe_od_in^2
thrust_lb           = 2 * pressure_psi * area_in2 * sin(bend_angle_deg/2 * PI/180)
length_each_side_ft = thrust_lb / unit_resistance_plf
```

**Pinned worked example.** OD 12 in, pressure 150 psi, bend 90 degrees, resistance 600 lb/ft:
`area = (PI/4)*12^2 = ` **113.1 in^2**; `thrust = 2*150*113.1*sin(45) = ` **23,992 lb**;
`length = 23,992 / 600 = ` **40 ft each side**. Cross-check: a 45-degree bend drops the thrust to
`2*150*113.1*sin(22.5) = ` **12,987 lb** and the restraint to **21.6 ft** each side -- the sine of the half-angle sets
how hard the bend pulls.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "plumbing"]`, inside the `// Group E` earthwork block near
`pipe-flotation`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (thrust = 2 P A sin(bend/2); length = thrust / unit resistance, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the 45-degree cross-check); `test/fixtures/compute-map.js`
(`restrained-pipe-length` -> `computeRestrainedPipeLength`, module `../../calc-earthwork.js`); `scripts/related-tiles.mjs`
(-> `thrust-block-sizing` / `pipe-flotation` / `pipe-bedding-backfill`); `data/search/aliases.json` (5 collision-checked
aliases: "restrained joint length", "restrained pipe length", "thrust restraint length", "pipe bend restraint", "no
thrust block length"); a hand-written renderer in the `EARTHWORK_RENDERERS` map mirroring `_v67renderHaulCycleProduction`
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-earthwork declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the area, the thrust, the restrained length, and the error seams (non-positive OD,
pressure, resistance; bend angle out of 0-180). The calc-earthwork.js gzip cap is watched at build. Verify at build,
including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,280 -> 1,281.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(2*150*(PI/4*144)*sin(45deg) / 600 -> 40 ft).

## 5. Roadmap position

Second underground-utility check tile: the restrained-joint alternative to `thrust-block-sizing`, beside `pipe-flotation`,
serving the utility contractor (construction / plumbing). Stays evidence-driven; the restraint manufacturer's tables set
the unit resistance.
