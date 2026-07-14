# roughlogic.com Specification v699 -- Detention Basin Volume for a Target Time (calc-water.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`** (Group M, water
> and wastewater operations), no new module, group, or dependency. Inherits spec.md through spec-v698.md.
>
> **The gap, and the evidence for it.** The `detention-time` tile runs the retention identity forward: from a basin
> volume and a flow it returns the detention time (and pass/fail against a target). The design question is the inverse --
> **given the flow and the contact time I must hold, how big a basin do I need**. Since `minutes = volume / flow`, the
> inverse is `volume = target_minutes x flow`. The number this settles: **120 min** of chlorine contact at **350 GPM**
> needs a **42,000 gal** basin. The forward tile only grades a volume you already picked; this sizes it directly.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`detention-time` sibling: the target time is `T` (min), the flow is `L^3 T^-1` (GPM), and the returned volume is `L^3`
(gal, with an ft^3 companion dividing gallons by 7.48052). The v18/v21 contract: any non-finite input, a non-positive
target time, or a non-positive flow returns `{ error }`. Citation discipline (v19/v22): the retention identity solved for
volume, `GOVERNANCE.water` matching the sibling, citing the Ten States Standards (Recommended Standards for Water Works)
and the EPA SWTR for CT; the note states that **the result is the theoretical (plug-flow) volume, that a real basin
realizes only T_10 = 0.5-0.7 of the theoretical time from short-circuiting so a CT basin is oversized against it, a
tracer study governs the baffling factor, and the state primacy agency governs**.

## 2. The tile

### 2.1 `detention-basin-volume` -- Detention Basin Volume for a Target Time

```
inputs:
  target_minutes   T           target detention / contact time (min, > 0)
  flow_gpm         L^3 T^-1     design flow (GPM, > 0)

tank_volume_gal = target_minutes x flow_gpm
tank_volume_ft3 = tank_volume_gal / 7.48052
```

**Pinned worked example.** target = 120 min, flow = 350 GPM: `volume = 120 x 350 = ` **42,000 gal** (5,614.6 ft^3,
2.0 hr); feeding 42,000 gal and 350 GPM back through `detention-time` returns 120 min, the input. Doubling the flow to
700 GPM doubles the basin to 84,000 gal, the expected linear scaling.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water"]`) placed in the LATER Group M section beside `well-max-yield`, NOT in
the original `// Group M: Water`..`// Group N` block -- the Group M audit-coverage test asserts exactly 34 ids there, so
the row stays out of it; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (retention identity solved for volume,
`GOVERNANCE.water` matching the sibling, Ten States Standards + EPA SWTR); `test/fixtures/worked-examples.json` (the
pinned example); `test/fixtures/compute-map.js` (`detention-basin-volume` -> `computeDetentionBasinVolume`);
`scripts/related-tiles.mjs` (-> `detention-time` / `disinfection-ct` / `clarifier-surface-loading` /
`flocculation-g-value`); `data/search/aliases.json` (5 collision-checked question aliases: "basin size for chlorine
contact time", "clearwell size for ct", ...); the calc-water `RENDERERS` map entry via the shared `_r` renderer factory
(two number fields, no dead inputs) and the id added to the calc-water declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning
the example, the round-trip through `computeDetentionTime`, the more-flow-bigger-basin monotonicity, and the error seams.
The calc-water.js gzip cap is expected to hold (verify at build, including `check-shells`). Lazy-loaded, absent from home
first paint. Home tile count 1,147 -> 1,148.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes and check-readme-counts); `npm test`
(+1 fixture, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs`
and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit;
render + output read to the value (the pinned example -> 42,000 gal for 120 min at 350 GPM).

## 5. Roadmap position

Pairs the forward retention tile (`detention-time`, time from a volume) with its inverse (volume from a target time), the
two halves of the basin-sizing question. Further Group M water growth stays evidence-driven.
