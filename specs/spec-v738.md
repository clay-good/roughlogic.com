# roughlogic.com Specification v738 -- Smooth-Bore Tip Diameter for a Target Flow (calc-fire.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`** (Group F),
> no new module, group, or dependency. Inherits spec.md through spec-v737.md. Explore sweep #13 (entry 2).
>
> **The gap, and the evidence for it.** The `smooth-bore-flow` tile runs the IFSTA discharge form forward: from a tip
> diameter it returns the flow. The fireground question is the inverse -- **what tip diameter a target flow needs** at a
> nozzle pressure, so an officer picks a tip for a target gpm. From `gpm = 29.7 x d^2 x sqrt(NP)`,
> `d = sqrt( gpm / (29.7 x sqrt(NP)) )`. The number this settles: **250 gpm** at **50 psi** wants a **1.09 in** tip (round
> up to a stocked 1-1/8 in).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`smooth-bore-flow` sibling: the target flow is `L^3 T^-1` (gpm), the nozzle pressure is `M L^-1 T^-2` (psi), the returned
bore diameter is `L` (in), and the reaction is `M L T^-2` (lb). It reuses the sibling's 29.7 smooth-bore discharge form
(IFSTA), solved for the diameter, and reports the companion nozzle reaction. The v18/v21 contract: any non-finite input, a
non-positive target flow, or a non-positive nozzle pressure returns `{ error }`. Citation discipline (v19/v22): the
discharge form solved for the diameter, `GOVERNANCE.fire` matching the sibling; the note says to **round to a stocked tip
size** (common handline tips 7/8, 15/16, 1, 1-1/8, 1-1/4 in), reports the **nozzle reaction** so the crew can check
handling, and closes with **incident command and the pump operator govern**.

## 2. The tile

### 2.1 `smooth-bore-diameter-for-flow` -- Smooth-Bore Tip Diameter for a Target Flow

```
inputs:
  target_gpm            L^3 T^-1      target flow (gpm, > 0)
  nozzle_pressure_psi   M L^-1 T^-2   nozzle pressure (psi, > 0; default 50)

bore_in     = sqrt( target_gpm / (29.7 x sqrt(nozzle_pressure_psi)) )
reaction_lb = 1.57 x bore_in^2 x nozzle_pressure_psi
```

**Pinned worked example.** target = 250 gpm, NP = 50 psi:
`d = sqrt( 250 / (29.7 x sqrt(50)) ) = sqrt(250 / 210.0) = ` **1.09 in**, reaction = 1.57 x 1.09^2 x 50 = 93 lb. Feeding
1.09 in back through `smooth-bore-flow` at 50 psi returns 250 gpm, the target. Raising the nozzle pressure to 80 psi
shrinks the tip to 0.97 in for the same flow.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire"]`) placed beside `smooth-bore-flow` in the later spec-v114 section, well
past the Group F exact-count audit block; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (discharge form solved
for the diameter, `GOVERNANCE.fire` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`smooth-bore-diameter-for-flow` -> `computeSmoothBoreDiameterForFlow`);
`scripts/related-tiles.mjs` (-> `smooth-bore-flow` / `fire-stream-reaction` / `master-stream`);
`data/search/aliases.json` (5 collision-checked question aliases: "tip size for flow", "what tip for gpm", ...); the
calc-fire `FIRE_RENDERERS` map entry via a hand-written renderer (two number fields) and the id added to the calc-fire
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeSmoothBoreFlow`
across a flow/pressure sweep, the more-flow-bigger-tip and higher-pressure-smaller-tip monotonicity, and the error seams.
The calc-fire.js gzip cap (raised to 38000 B in this spec) covers the addition. Verify at build, including `check-shells`.
Lazy-loaded, absent from home first paint. Home tile count 1,186 -> 1,187.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 1.09 in for 250 gpm at 50
psi).

## 5. Roadmap position

Pairs the forward nozzle tile (`smooth-bore-flow`, flow from the tip) with its inverse (the tip for a flow), the two
halves of the nozzle-selection question. Continues Explore sweep #13; further Group F fire growth stays evidence-driven.
