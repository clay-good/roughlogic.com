# roughlogic.com Specification v677 -- Pool Heater Output for a Target Heat-Up Time (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`** (Group M,
> pool-service / water-operations), no new module, group, or dependency. Inherits spec.md through spec-v676.md.
>
> **The gap, and the evidence for it.** Spec-v354 (`pool-heater-btu`) runs the pool heat-up forward: given a heater
> output, it returns the heat-up time. The equipment-selection question a pool tech asks is the inverse -- **what size
> heater do I need to warm the pool in the time I want**. The forward tile makes you guess outputs and re-read the hours;
> the inverse solves it directly. From `hours = (gallons x 8.34 x rise) / (output x efficiency)`,
> `output = (gallons x 8.34 x rise) / (target_hours x efficiency)`. The number this settles: warming a 20,000 gal pool
> +10 F in 5.2 h at 80% needs a **400,000 Btu/h** heater; ask for it in 3 h and it jumps to **695,000 Btu/h** (the output
> scales inversely with the time you allow).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`pool-heater-btu` sibling: the gallons and the efficiency are `dimensionless`, the temperature rise and the target time
are `T`, and the returned output is `M L^2 T^-3` (Btu/h). The `8.34` lb/gal constant is the sibling's. The v18/v21
contract: any non-finite input, or a non-positive volume / rise / target time / efficiency, returns `{ error }`.
Citation discipline (v19/v22): the sensible water-heating relation solved for the heater output, by name; the note
states that **at about 80% a gas heater is sized off this directly, a heat pump is entered as its COP-equivalent Btu/h
(and its required output looks large because it is left on to hold temperature, not for a quick warm-up), the raw
sensible size ignores cover, evaporation, and standby losses so add margin, and this is a sizing estimate -- the
equipment ratings and site conditions govern**.

## 2. The tile

### 2.1 `pool-heater-size` -- Pool Heater Output for a Target Heat-Up Time

```
inputs:
  gallons        gal   pool volume (> 0)
  dT_F           F     temperature rise (> 0)
  target_hours   h     desired heat-up time (> 0)
  eff            -     efficiency / COP-equivalent (> 0, default 0.80)

Q_btu               = gallons x 8.34 x dT_F                    [Btu]
required_output_btu = Q_btu / (target_hours x eff)            [Btu/h]
```

**Pinned worked example (a gas heater).** gallons = 20,000, dT = 10 F, target = 5.2125 h, eff = 0.80:
`Q = 20000 x 8.34 x 10 = 1,668,000 Btu`, `output = 1,668,000 / (5.2125 x 0.80) = ` **400,000 Btu/h**; feeding
400,000 Btu/h back through `pool-heater-btu` returns 5.2 h, the input. **Cross-check (a faster warm-up).** Same pool in
3 h at 80%: `output = 1,668,000 / (3 x 0.80) = ` **695,000 Btu/h** -- cutting the time from 5.2 h to 3 h needs about 74%
more heater.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["pool-service", "water-operations"]`, beside `pool-heater-btu`, which sits in
the spec-v93 pool section OUTSIDE the exact-34 `// Group M`..`// Group N` audit block, so no count bump); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (water-heating solved for output, `GOVERNANCE.general` matching
the sibling, the note per §1); `test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js`
(`pool-heater-size` -> `computePoolHeaterSize` in `../../calc-treatment.js`); `scripts/related-tiles.mjs` (->
`pool-heater-btu` / `pool-turnover` / `water-heater-recovery` / `gas-appliance-demand`, and the forward tile links
back); `data/search/aliases.json` ("heater output for target heat up time", "what size pool heater do i need", plus
adjacent rows, all distinct from the forward tile's "pool heater size" / "pool heater sizing"); the
`TREATMENT_RENDERERS["pool-heater-size"]` entry via the module's `_rPool` renderer factory (mirroring `pool-heater-btu`)
and the id added to the calc-treatment declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the
round-trip through `computePoolHeaterBtu`, and the error seams. The calc-treatment.js gzip cap is expected to hold
(verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 400,000 Btu/h for a 5.2 h heat-up).

## 5. Roadmap position

Pairs the forward pool-heater tile (`pool-heater-btu`, time from output) with its inverse (output from a target time),
the two halves of the pool-heater selection question. Further Group M growth stays evidence-driven.
