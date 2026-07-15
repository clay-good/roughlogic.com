# roughlogic.com Specification v826 -- Rock Check Dam Spacing (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v825.md. Erosion-control sweep (entry 5), beside
> `silt-fence-drainage`.
>
> **The gap, and the evidence for it.** Nothing spaces **rock check dams** in a channel or swale, where the rule is that
> the toe of each upper dam sits at the crest elevation of the next one down. Grep confirmed no check-dam tile. The number
> this settles: a 2 ft effective-height dam in a 4% channel spaces at **50 ft**, so a 300 ft ditch takes **6 dams** -- and
> on an 8% grade the spacing halves to 25 ft and the count doubles.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`silt-fence-drainage`, `spoil-setback`): the dam height and reach length carry `L`, the channel slope
is dimensionless (percent), the spacing is `L`, and the dam count is dimensionless. The v18/v21 contract: a non-finite or
non-positive dam height, channel slope, or reach length returns `{ error }`. Citation discipline (v19/v22): the
crest-to-toe spacing identity by name (spacing = dam effective height / channel slope), `GOVERNANCE.general`; the note
states that check dams belong only in small channels and swales (not a perennial stream without a permit), that the center
of each dam is built lower than its edges so flow passes over the middle and not around the ends, and that the AHJ governs
the practice.

## 2. The tile

### 2.1 `check-dam-spacing` -- Rock Check Dam Spacing

```
inputs:
  dam_height_ft      effective dam height, crest above channel (ft)
  channel_slope_pct  channel longitudinal slope (percent)
  reach_length_ft    channel reach to protect (ft)

spacing_ft = dam_height_ft / (channel_slope_pct / 100)
dams       = ceil(reach_length_ft / spacing_ft)
```

**Pinned worked example.** Dam height 2 ft, channel slope 4%, reach 300 ft:
`spacing = 2 / 0.04 = ` **50 ft**; `dams = ceil(300 / 50) = ` **6**. Cross-check: on a steeper 8% grade the spacing drops
to `2 / 0.08 = ` **25 ft** and the same reach takes `ceil(300/25) = ` **12 dams** -- twice as many, because the spacing
is inversely proportional to the slope.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` earthwork block beside
`silt-fence-drainage`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (spacing = dam height / channel slope, `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the pinned example plus the steeper-grade cross-check); `test/fixtures/compute-map.js` (`check-dam-spacing` ->
`computeCheckDamSpacing`, module `../../calc-earthwork.js`); `scripts/related-tiles.mjs` (-> `silt-fence-drainage` /
`riprap-d50` / `rusle-soil-loss`); `data/search/aliases.json` (5 collision-checked aliases: "check dam spacing", "rock
check dam", "ditch check spacing", "channel check dam", "sediment check dam"); a hand-written renderer in the
`EARTHWORK_RENDERERS` map mirroring `_v67renderHaulCycleProduction` (non-exported, so no DOM-sentinel dims row), and the id
added to the calc-earthwork declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the spacing, the dam count, and the
error seams (non-positive dam height, slope, reach). The calc-earthwork.js gzip cap is watched at build. Verify at build,
including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,274 -> 1,275.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(2 / 0.04 -> 50 ft, 6 dams over 300 ft).

## 5. Roadmap position

Fifth erosion-control tile: the in-channel practice that complements the perimeter `silt-fence-drainage` and the
`riprap-d50` armor, serving the erosion-control crew (construction / surveying). Stays evidence-driven; the AHJ governs the
practice.
