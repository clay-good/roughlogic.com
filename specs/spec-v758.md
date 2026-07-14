# roughlogic.com Specification v758 -- Wind Speed from Wind Chill and Temperature (calc-cross.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`** (Group G),
> no new module, group, or dependency. Inherits spec.md through spec-v757.md. Explore sweep #15 (entry 2).
>
> **The gap, and the evidence for it.** The `wind-chill` tile runs the NWS 2001 formula forward: from the temperature and
> wind speed it returns the wind chill. The inverse question is -- **what wind speed produces a target or reported wind
> chill** at a known air temperature. Grouping the `w^0.16` term of
> `WC = 35.74 + 0.6215 T - 35.75 w^0.16 + 0.4275 T w^0.16` gives
> `w = [ (WC - 35.74 - 0.6215 T) / (0.4275 T - 35.75) ]^(1/0.16)`. The number this settles: at **5 F** air, a **-19 F**
> wind chill implies about a **30 mph** wind.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the `wind-chill`
sibling: the air temperature and target wind chill are `T` (F) and the returned wind speed is `L T^-1` (mph). It reuses the
sibling's NWS 2001 formula, solved for the wind speed. The v18/v21 contract: any non-finite input, or an air temperature
above 50 F (outside the formula domain) returns `{ error }`; a target wind chill warmer than the still-air value (no wind
produces it) or one that would require a wind below 3 mph (outside the formula domain, where the ambient temperature
governs) returns an explanatory `{ error }`. Citation discipline (v19/v22): the formula solved for the wind speed,
`GOVERNANCE.general` matching the sibling; the note states the **T <= 50 F and w >= 3 mph** domain and that wind chill is
a **felt-temperature index** for exposed skin (blowing snow, sun, and wet skin shift the real risk) with the NWS advisory
governing.

## 2. The tile

### 2.1 `wind-chill-wind-speed` -- Wind Speed from Wind Chill and Temperature

```
inputs:
  T_F           T   air temperature (F, <= 50)
  target_wc_F   T   target / reported wind chill (F)

num      = target_wc_F - 35.74 - 0.6215 x T_F
den      = 0.4275 x T_F - 35.75            (negative for T <= 50 F)
wind_mph = (num / den)^(1 / 0.16)           (requires num/den > 0 and wind_mph >= 3)
```

**Pinned worked example.** T = 5 F, target WC = -19 F:
`num = -19 - 35.74 - 3.1075 = -57.85`, `den = 2.1375 - 35.75 = -33.61`, `ratio = 1.721`,
`w = 1.721^(1/0.16) = 1.721^6.25 = ` **29.8 mph**. Feeding 29.8 mph back through `wind-chill` at 5 F returns a -19 F wind
chill, the target. A colder -25 F target at the same temperature needs a stronger ~44 mph wind.

## 3. Wiring

A `tools-data.js` row (group `G`, trades `["restoration","carpentry","fire"]`) placed in the later Group G section (past
the exact-count `// Group G`..`// Group H` audit block, beside `gear-cascade`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (formula solved for the wind speed, `GOVERNANCE.general` matching the sibling);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`wind-chill-wind-speed` ->
`computeWindChillWindSpeed`); `scripts/related-tiles.mjs` (-> `wind-chill` / `heat-stress` / `noise-dose`);
`data/search/aliases.json` (4 collision-checked question aliases: "wind speed from wind chill", "what wind for wind
chill", ...); the calc-cross `CROSS_RENDERERS` map entry via the shared `_simpleRendererG` factory (two number fields) and
the id added to the calc-cross declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeWindChill` across a temperature/wind-chill sweep, the colder-target-more-wind monotonicity, and the error seams
(warmer-than-still-air, below-3-mph, and T > 50 F). The calc-cross.js gzip cap (raised to 40000 B in this spec) covers the
addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,206 ->
1,207.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 29.8 mph for a -19 F wind
chill at 5 F).

## 5. Roadmap position

Pairs the forward wind-chill tile (chill from the wind) with its inverse (the wind from the chill), the two halves of the
NWS 2001 relation. Continues Explore sweep #15; further Group G cross-trade growth stays evidence-driven.
