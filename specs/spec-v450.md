# roughlogic.com Specification v450 -- Cross-Connection Air Gap (IPC 608.15.1) (calc-cross.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-04). First tile of a plumbing-systems trio (v450 air gap -> v451 hydronic expansion tank ->
> v452 hydronic fill pressure). `backflow-sizing` covers mechanical backflow assemblies; the simplest and most positive
> cross-connection protection -- the physical air gap -- has no tile.**
> In-scope catalog expansion under the spec-v106 trades-only charter. An air gap is the vertical distance between a supply
> outlet and the flood-level rim of the fixture it discharges into, and it is the one backflow protection nothing can defeat.
> IPC 608.15.1 sets the minimum air gap at twice the effective opening diameter (but never less than `1 in`), and three times
> the opening when the outlet is within three diameters of a wall. Mechanical-assembly tiles do not size the physical gap.
> This adds the air-gap tile to the existing **`calc-cross.js`** module (Group B); no new group, trade, or dependency.
> Inherits spec.md through spec-v449.md.
>
> **The gap, and the evidence for it.** A `1 in` effective opening needs a `2 * 1 = 2 in` air gap, or `3 * 1 = 3 in` if it
> sits within three diameters of a wall. A small `1/2 in` opening computes to `2 * 0.5 = 1 in`, where the `1 in` absolute
> minimum governs. No tile does this; a plumber protecting an indirect waste or a tank fill had the assembly tiles but not
> the air-gap dimension.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The effective opening diameter
and the air gap are lengths (in). The v18/v21 contract: any non-finite input, or a non-positive opening, returns
`{ error }`; the tile returns the standard air gap (`2x` opening, `1 in` floor) and the near-a-wall air gap (`3x`), and a
boolean for whether a given measured gap passes. Citation discipline (v19/v22): `GOVERNANCE.general` over the cross-
connection air gap by name; `editionNote` names **IPC 608.15.1 / ASME A112.1.2, the minimum air gap of `2x` the effective
opening diameter (never less than `1 in`), the `3x` requirement within three diameters of a wall, and the effective opening
as the least cross-sectional area of the supply outlet -- code text quoted per the CF-01 disclosure**, and states that
**this returns the minimum air gap for indirect-waste and tank-fill protection, that an air gap is the most positive
cross-connection protection, and that it is a design aid, not a substitute for the AHJ**.

## 2. The tile

### 2.1 `cross-connection-air-gap` -- Cross-Connection Air Gap (IPC 608.15.1)

```
inputs:
  opening_in    in   effective opening diameter of the supply outlet
  near_wall     -    is the outlet within 3 diameters of a wall? (bool)
  measured_in   in   installed air gap to check (optional)

air_gap    = max(2 * opening_in, 1)
air_gap_wall = max(3 * opening_in, 1)
required   = near_wall ? air_gap_wall : air_gap
passes     = measured_in >= required
```

**Pinned worked example (1 in opening, not near a wall).** `air gap = max(2*1, 1) = 2 in`; near a wall it would be
`3 * 1 = 3 in`. **Cross-check (small opening hits the floor).** A `1/2 in` opening gives `2*0.5 = 1 in`, where the `1 in`
absolute minimum governs. A non-positive opening takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`, beside `backflow-sizing`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, IPC 608.15.1 air gap, `editionNote` naming the `2x`/`3x` rules, the `1 in`
minimum, and the effective-opening definition -- code text per CF-01); `test/fixtures/worked-examples.json` (the 1 in
example + the 1/2 in floor cross-check); `test/fixtures/compute-map.js` (`cross-connection-air-gap` ->
`computeCrossConnectionAirGap` in `../../calc-cross.js`); `scripts/related-tiles.mjs` (-> `backflow-sizing` / `backflow` /
`hydronic-expansion-tank` / `cross-connection-air-gap`); `data/search/aliases.json` ("air gap", "cross connection air gap",
"ipc 608", "backflow air gap", "indirect waste air gap", "minimum air gap", "2x opening air gap", "flood rim air gap",
"plumbing air gap"); the id appended to the existing cross-connection renderers block in `app.js`; the `// dims:` annotation
(opening/gap length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
near-wall branch, the `1 in` floor, and the non-positive / non-finite error seams. No new module; re-pin `calc-cross.js` on
the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**, CF-01 disclosure);
`npm test` (+2 fixtures, the new fuzzer block, the near-wall branch, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the standard / near-wall gap output wraps
on a phone); render-no-nan + a11y sweep, output read to the value (1 in opening -> 2 in gap).

## 5. Roadmap position

Opens the plumbing-systems trio: `hydronic-expansion-tank` (v451) and `hydronic-fill-pressure` (v452) cover the closed
heating loop. A dishwasher/ice-maker indirect-waste air-gap fitting selector is the deliberate next follow-on.
