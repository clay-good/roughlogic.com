# roughlogic.com Specification v823 -- Riprap Median Stone Size (Isbash) (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v822.md. Erosion-control sweep (entry 2), pairing
> with the coming `riprap-tonnage` layer-volume tile.
>
> **The gap, and the evidence for it.** The catalog has channel hydraulics (`channel-normal-depth`, `hydraulic-jump`) but
> nothing sizes the **riprap** that armors an outlet or channel bank against a scouring velocity. Grep confirmed no riprap
> tile. The Isbash equation is public-domain, and every input is user-entered. The number this settles: an 8 ft/s flow on
> 2.65-gravity stone in turbulent water (C = 0.86) wants a **12 in** median stone, while the same flow in a calm straight
> reach (C = 1.20) needs only **6 in** -- turbulence, not just velocity, sets the rock.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork/channel siblings: the velocity carries `L T^-1`, the specific gravity, turbulence coefficient, and safety
factor are dimensionless, and both stone sizes are `L` (V^2 / g reduces to a length). The v18/v21 contract: a non-finite
or non-positive velocity, turbulence coefficient, or safety factor returns `{ error }`; a specific gravity at or below 1
(stone no denser than water) returns `{ error }`. Citation discipline (v19/v22): the Isbash riprap-sizing identity by name
(D50 = SF x V^2 / (2 g C^2 (Ss - 1))), `GOVERNANCE.general`; the note states that C is about 0.86 for high-turbulence zones
(below outlets, at bends) and about 1.20 for low-turbulence straight channels, that Isbash is a public-domain field
estimate, that the hydraulic engineer and the AHJ govern the channel design, and that the layer thickness (at least
1.5 x D50) and gradation are taken off separately.

## 2. The tile

### 2.1 `riprap-d50` -- Riprap Median Stone Size (Isbash)

```
inputs:
  velocity_fps      flow velocity against the stone (ft/s)
  specific_gravity  stone specific gravity Ss (default 2.65)
  turbulence_coeff  Isbash coefficient C (default 0.86)
  safety_factor     safety factor SF (default 1.2)

d50_ft = safety_factor * velocity_fps^2 / (2 * 32.2 * turbulence_coeff^2 * (specific_gravity - 1))
d50_in = d50_ft * 12
```

**Pinned worked example.** Velocity 8 ft/s, Ss 2.65, C 0.86, SF 1.2:
`D50 = 1.2 * 64 / (2*32.2 * 0.86^2 * 1.65) = 76.8 / 78.59 = ` **0.977 ft** (11.7 in, spec a 12 in stone). Cross-check: the
same flow in a low-turbulence straight reach (C 1.20) gives `76.8 / (64.4 * 1.44 * 1.65) = 76.8 / 153.0 = ` **0.50 ft**
(6.0 in) -- half the size, because the turbulence coefficient enters squared.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` earthwork block near
`channel-normal-depth`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (Isbash D50 = SF V^2 / (2 g C^2 (Ss-1)), `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the pinned example plus the low-turbulence cross-check); `test/fixtures/compute-map.js` (`riprap-d50` ->
`computeRiprapD50`, module `../../calc-earthwork.js`); `scripts/related-tiles.mjs` (-> `riprap-tonnage` /
`channel-normal-depth` / `check-dam-spacing`); `data/search/aliases.json` (5 collision-checked aliases: "riprap size",
"isbash stone size", "riprap d50", "scour stone sizing", "channel armor stone"); a hand-written renderer in the
`EARTHWORK_RENDERERS` map mirroring `_v67renderHaulCycleProduction` (non-exported, so no DOM-sentinel dims row), and the id
added to the calc-earthwork declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the foot and inch stone sizes and the
error seams (non-positive velocity, C, SF; Ss <= 1). The calc-earthwork.js gzip cap is watched at build. Verify at build,
including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,271 -> 1,272.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(1.2 * 64 / (2*32.2 * 0.86^2 * 1.65) -> 0.977 ft).

## 5. Roadmap position

Second erosion-control tile: pairs with the coming `riprap-tonnage` (layer volume) and the channel tools, serving the
site / utility crew (construction / surveying). Stays evidence-driven; the hydraulic engineer governs the channel.
