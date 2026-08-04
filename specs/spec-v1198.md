# roughlogic.com Specification v1198 -- Azimuth and Quadrant Bearing Conversion (calc-survey.js, Group P, 1 New Tile)

> **Status: PROPOSED (2026-08-04). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-survey.js`** (Group P),
> no new module, group, or dependency. Inherits spec.md through spec-v1197.md.
>
> **The gap, and the evidence for it.** The landed `cogo-forward-point` (spec-v766) and `cogo-inverse-locate` (spec-v781)
> tiles both tell the user, in their own notes and catalog rows, to "read it as a quadrant bearing (N45E)" and point at
> the `bearing-conversion` tile. But `bearing-conversion` (calc-field.js `computeBearingConversion`) only shifts a
> direction by magnetic declination -- it does no azimuth-to-quadrant-bearing conversion at all. A surveyor holding a
> deed written in quadrant bearings and a COGO azimuth on the same job has no tool to move between the two notations.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the sibling
`edm-slope-reduction` (bespoke renderer with a `makeSelect` mode). The v18/v21 contract: a non-finite numeric input (via
`_finiteGuard`), an azimuth outside 0-360, a bearing angle outside 0-90, or an unknown quadrant/mode returns `{ error }`.
Citation discipline (v19/v22): the plane-direction geometry stated by name (Ghilani & Wolf, Elementary Surveying;
FM 5-233, public-domain), `GOVERNANCE.general`. The bespoke renderer's field schema and citation are auto-exposed to the
MCP layer by `extract-bespoke-schemas.mjs`. **No copyrighted table is reproduced** -- the quadrant rules are elementary
geometry in every surveying text and in the public-domain FM 5-233.

## 2. The tile

### 2.1 `azimuth-bearing-conversion` -- Azimuth and Quadrant Bearing Conversion

```
inputs:
  mode                 "azimuth_to_bearing" | "bearing_to_azimuth"
  azimuth_deg          azimuth 0..360 clockwise from north (azimuth_to_bearing)
  quadrant             "NE" | "SE" | "SW" | "NW"          (bearing_to_azimuth)
  quadrant_angle_deg   bearing angle 0..90                (bearing_to_azimuth)

azimuth A (0..360) -> quadrant bearing:
  A in [0,90]    -> N A E
  A in [90,180]  -> S (180 - A) E
  A in [180,270] -> S (A - 180) W
  A in [270,360] -> N (360 - A) W
reverse:
  N b E -> A = b        S b E -> A = 180 - b
  S b W -> A = 180 + b  N b W -> A = 360 - b
cardinals: A = 0/90/180/270 read as due north/east/south/west.
```

**Pinned worked examples (verified from first principles).** Azimuth 138.5 deg is in the second quadrant, so the bearing
angle is the supplement 180 - 138.5 = **41.5 deg** and the direction is **S 41 deg 30 min 00 sec E**. The reverse: quadrant
bearing **S 30 deg W** is in the third quadrant, so its azimuth is 180 + 30 = **210 deg**. The seams the fuzzer pins:
round-trip invertibility (azimuth -> bearing -> azimuth returns the original across all four quadrants at 0.5 deg steps),
the four cardinal labels, the 360 -> 0 wrap, and the error seams (azimuth > 360, bearing angle > 90, unknown quadrant/mode,
non-finite input).

## 3. Wiring

A `tools-data.js` row (group `P`, trades `["surveying","field"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (Ghilani/Wolf; FM 5-233, `GOVERNANCE.general`, `freeAccess` noting the public-domain field manual); two
`test/fixtures/worked-examples.json` rows (the two pinned examples, pinning `azimuth_deg` and `quadrant_angle_deg`);
`test/fixtures/compute-map.js` and `test/fixtures/renderer-map.js` (spec-v1191 reachability parity);
`test/unit/bounds-fuzzer.test.js` (the new fuzzer block); `scripts/related-tiles.mjs` (-> `cogo-inverse-locate`,
`cogo-forward-point`, `bearing-conversion`, `traverse-closure`, and the two COGO tiles' lists re-pointed here from the
declination tile); `data/search/aliases.json` (4 collision-checked aliases; alias shards regenerated); the
`SURVEY_RENDERERS` entry (bespoke renderer, MCP schema auto-extracted via `extract-bespoke-schemas.mjs`); the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index. `calc-survey.js` module-size cap raised
15500 -> 17500 B (small module; raise, do not split). Home tile count 1,570 -> 1,571 (index.html JSON-LD + hero lede,
AGENTS.md). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` (calc-survey.js under
its raised cap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(azimuth 138.5 -> S 41 deg 30 min 00 sec E; SW 30 -> azimuth 210).

## 5. Roadmap position

Closes a self-declared, cross-referenced gap: the two COGO tiles named a conversion that lived only in their prose. The
survey group now round-trips between the azimuth its coordinate math produces and the quadrant bearing a deed is written
in, beside the COGO forward/inverse locate tiles and the magnetic-declination `bearing-conversion` tile it is often
confused with.
