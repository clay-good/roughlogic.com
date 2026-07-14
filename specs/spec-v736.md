# roughlogic.com Specification v736 -- Sprinkler Zone Flow for a Target Precip Rate (calc-agriculture.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`** (Group L),
> no new module, group, or dependency. Inherits spec.md through spec-v735.md. Explore sweep #12 (entry 11).
>
> **The gap, and the evidence for it.** The `sprinkler-precip-rate` tile runs the irrigation relation forward: from a zone
> flow and area it returns the precipitation rate. The designer's question is the inverse -- **how much zone flow a target
> precipitation rate needs** over a covered area, so nozzles can be picked to sum to the right flow. From
> `PR = 96.3 x gpm / area`, `gpm = PR x area / 96.3`. The number this settles: a **1.5 in/hr** rate over **1,200 ft^2**
> needs about **18.7 gpm** of heads.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`sprinkler-precip-rate` sibling: the target precipitation rate is `L T^-1` (in/hr), the zone area is `L^2` (ft^2), and the
returned flow is `L^3 T^-1` (gpm). It reuses the sibling's 96.3 irrigation conversion, solved for the flow. The v18/v21
contract: any non-finite input, a non-positive target precipitation rate, or a non-positive zone area returns `{ error }`.
Citation discipline (v19/v22): the precipitation-rate relation solved for the flow, `GOVERNANCE.general` matching the
sibling; the note states that the head flows come from the manufacturer's nozzle chart at the operating pressure, that
**sprays (~1.5-2 in/hr) and rotors (~0.4-0.8 in/hr)** must stay on separate valves, that the zone flow must fit the supply
and the valve, and that this is a **design estimate, not a system audit**.

## 2. The tile

### 2.1 `sprinkler-gpm-for-precip` -- Sprinkler Zone Flow for a Target Precip Rate

```
inputs:
  target_precip_in_hr   L T^-1   target precipitation rate (in/hr, > 0)
  zone_ft2              L^2      zone area covered (ft^2, > 0)

required_gpm = target_precip_in_hr x zone_ft2 / 96.3
```

**Pinned worked example.** target = 1.5 in/hr, area = 1,200 ft^2:
`gpm = 1.5 x 1200 / 96.3 = ` **18.7 gpm**. Feeding 18.7 gpm back through `sprinkler-precip-rate` at 1,200 ft^2 returns a
1.5 in/hr rate, the target. A larger 2,400 ft^2 zone at the same rate needs twice the flow (~37.4 gpm).

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["landscaping","agriculture"]`) placed beside `sprinkler-precip-rate` in the
later spec-v84 sprayer section, well past the Group L exact-count `// Group L: Agriculture`..`// Group M` audit block; a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (precipitation-rate relation solved for the flow,
`GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`sprinkler-gpm-for-precip` -> `computeSprinklerGpmForPrecip`);
`scripts/related-tiles.mjs` (-> `sprinkler-precip-rate` / `irrigation-zone-runtime` / `drip-zone-flow`);
`data/search/aliases.json` (5 collision-checked question aliases: "sprinkler gpm for precip", "flow for precip rate",
...); the calc-agriculture `AGRICULTURE_RENDERERS` map entry via the shared `_v23SimpleRenderer` factory (two number
fields) and the id added to the calc-agriculture declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the
round-trip through `computeSprinklerPrecipRate` across a rate/area sweep, the higher-rate-more-flow and
larger-area-more-flow monotonicity, and the error seams. The calc-agriculture.js gzip cap (raised to 54000 B in this spec)
covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count
1,184 -> 1,185.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 18.7 gpm for a 1.5 in/hr
rate over 1,200 ft^2).

## 5. Roadmap position

Pairs the forward sprinkler tile (`sprinkler-precip-rate`, rate from the flow) with its inverse (the flow for a rate), the
two halves of the zone-design question. Continues Explore sweep #12; further Group L irrigation growth stays
evidence-driven.
