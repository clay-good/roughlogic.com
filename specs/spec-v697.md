# roughlogic.com Specification v697 -- Max Appliance Input from Room Volume (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvac.js`** (Group C, HVAC /
> gas), no new module, group, or dependency. Inherits spec.md through spec-v696.md.
>
> **The gap, and the evidence for it.** The `combustion-air` tile runs the standard volume method forward: from an
> appliance input and a room volume it returns the required volume and whether the space is adequate. The install
> question is the inverse -- **given the mechanical closet I have, how big an appliance can I put in it before I need
> combustion-air openings**. IFGC 2021 §304.5 treats a space as adequate at 50 ft^3 per 1000 BTU/hr, so
> `max_input = (room_volume_ft3 / 50) x 1000`. The number this settles: a **4,000 ft^3** space supports up to **80,000
> BTU/hr** by volume; above that it is "confined" and needs openings (or the known-air-infiltration method).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`combustion-air` sibling (BTU/hr and ft^3 are dimensionless bookkeeping in the v14 model). It reuses the sibling's
`50 ft^3 per 1000 BTU/hr` volume constant. The v18/v21 contract: any non-finite input or a non-positive room volume
returns `{ error }`. Citation discipline (v19/v22): IFGC 2021 §304 standard volume method solved for input,
`GOVERNANCE.mechanical` matching the sibling; the note states that **above the returned input the space is confined and
needs combustion-air openings (1 in^2 per 1000 BTU/hr from outdoors, 1 in^2 per 4000 BTU/hr from adjacent indoor spaces),
or the known-air-infiltration-rate method applies, and the AHJ governs**.

## 2. The tile

### 2.1 `combustion-air-max-input` -- Max Appliance Input from Room Volume

```
inputs:
  room_volume_ft3   ft^3   volume of the space the appliance sits in (> 0)

max_btu_input = (room_volume_ft3 / 50) x 1000     (standard volume method)
max_kbtu_input = max_btu_input / 1000
```

**Pinned worked example.** room = 4,000 ft^3: `max = (4000 / 50) x 1000 = ` **80,000 BTU/hr** (80 kBTU/hr); feeding
80,000 BTU/hr back through `combustion-air` at 4,000 ft^3 returns a required volume of 4,000 ft^3 -- exactly adequate, the
boundary. A 10,000 ft^3 space supports 200,000 BTU/hr, showing the linear scaling.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`) placed beside `combustion-air`, which sits before the Group D
audit-range marker and in an un-audited group, so no audit-count bump; a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (IFGC §304 volume method solved for input, `GOVERNANCE.mechanical` matching the sibling);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`combustion-air-max-input` ->
`computeCombustionAirMaxInput`); `scripts/related-tiles.mjs` (-> `combustion-air` / `excess-air-o2` /
`outdoor-air-ventilation`); `data/search/aliases.json` (5 collision-checked question aliases: "biggest furnace for my
mechanical closet", "max appliance btu for room size", ...); the calc-hvac `RENDERERS` map entry via a hand-written
single-input renderer and the id added to the calc-hvac declare list in `app.js`; the `// dims:` annotation directly above
the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example,
the boundary round-trip through `computeCombustionAir` (required volume equals the room, adequate = true), the
bigger-space-bigger-appliance monotonicity, and the error seams, plus the renderer added to the calc-hvac render-sentinel
list. Lazy-loaded, absent from home first paint. Home tile count 1,145 -> 1,146.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes and check-readme-counts for the home
count); `npm test` (+1 fixture, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap);
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 80,000 BTU/hr for a 4,000
ft^3 space).

## 5. Roadmap position

Pairs the forward combustion-air sizing tile (`combustion-air`, openings from an input) with its inverse (max input from
the space you have), the two halves of the confined-space question. Further Group C HVAC growth stays evidence-driven.
