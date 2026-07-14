# roughlogic.com Specification v780 -- Evaporative (Swamp) Cooler Leaving Temperature (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvac.js`** (Group C),
> no new module, group, or dependency. Inherits spec.md through spec-v779.md. Explore sweep #19 (entry 6, final). Closes
> Explore sweep #19.
>
> **The gap, and the evidence for it.** The catalog has a latent-heat `evaporative-cooling` tile (cooling Btu/hr from an
> evaporation rate) and `wet-bulb-psychrometer` (humidity from dry/wet bulb), but neither answers the swamp-cooler
> technician's question: **what supply-air temperature does the cooler deliver?** The direct-evaporative saturation
> relation is `T_out = T_db - saturation effectiveness x (T_db - T_wb)`. The number this settles: **95 F** dry-bulb,
> **65 F** wet-bulb, and an **85%** pad give **69.5 F**. (The existing `evaporative-cooling` citation even names this
> formula but the tile never computes it.) Grep confirmed no `evaporative cooler` / `swamp cooler` / leaving-temperature
> tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`evaporative-cooling` sibling: the temperatures carry `T`, the effectiveness is dimensionless. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a dry-bulb not greater than the wet-bulb (the wet-bulb is the evaporation floor),
or an effectiveness outside `(0, 1]` returns `{ error }`. Citation discipline (v19/v22): the ASHRAE saturation-
effectiveness relation by name, `GOVERNANCE.mechanical` matching the sibling; the note explains that the wet-bulb
depression is the maximum drop, that pad effectiveness runs ~0.80-0.90 for rigid media (a user input), that the process
adds moisture (the leaving state rides the constant-wet-bulb line, so the leaving RH is high), and that it is direct
single-stage only.

## 2. The tile

### 2.1 `evaporative-cooler-effectiveness` -- Evaporative (Swamp) Cooler Leaving Temperature

```
inputs:
  dry_bulb_F      entering dry-bulb (F)
  wet_bulb_F      entering wet-bulb (F; < dry-bulb)
  effectiveness   pad saturation effectiveness (0 to 1; ~0.85 rigid media)

wet_bulb_depression = dry_bulb_F - wet_bulb_F
temp_drop           = effectiveness x wet_bulb_depression
leaving_db          = dry_bulb_F - temp_drop
```

**Pinned worked example.** dry-bulb 95 F, wet-bulb 65 F, effectiveness 0.85:
`depression = 30 F`, `drop = 0.85 x 30 = 25.5 F`, `leaving = 95 - 25.5 = ` **69.5 F**. A 100%-effective pad would cool all
the way to the wet-bulb (65 F); a higher effectiveness always gives a cooler leaving air; and the leaving dry-bulb never
falls below the wet-bulb -- all pinned in the fuzzer.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`) placed beside `evaporative-cooling` (Group C is not exact-count
audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (the saturation-effectiveness relation,
`GOVERNANCE.mechanical`); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`evaporative-cooler-effectiveness` -> `computeEvaporativeCoolerEffectiveness`); `scripts/related-tiles.mjs` (->
`wet-bulb-psychrometer` / `evaporative-cooling` / `psychrometric`); `data/search/aliases.json` (5 collision-checked
aliases: "swamp cooler temperature", "pad saturation effectiveness", ...); the calc-hvac `HVAC_RENDERERS` map entry via a
hand-written (non-exported) renderer (dry-bulb, wet-bulb, effectiveness fields) and the id added to the calc-hvac declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the closed form and the wet-bulb floor across a
sweep, the effectiveness monotonicity, and the error seams. The calc-hvac.js gzip cap (raised to 79000 B in this spec)
covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile
count 1,228 -> 1,229.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 69.5 F leaving air for
95 F dry-bulb, 65 F wet-bulb, 85% pad).

## 5. Roadmap position

Fills the swamp-cooler supply-temperature gap the latent `evaporative-cooling` tile named but never computed, alongside
the psychrometric bench. Closes Explore sweep #19 (the post-inverse forward-coverage batch: gear-chordal-thickness,
grid-to-ground, firewood-cord, feed-conversion-ratio, fall-arrest-clearance, and this). A two-stage (indirect/direct)
evaporative tile is the natural next addition; a fresh Explore opens sweep #20.
