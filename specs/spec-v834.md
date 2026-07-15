# roughlogic.com Specification v834 -- Scaffold Per-Leg Load and OSHA 4:1 Check (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v833.md. Temporary-works sweep, the load-side
> companion to `scaffold-mudsill-bearing`.
>
> **The gap, and the evidence for it.** `scaffold-mudsill-bearing` takes a leg load as input but nothing computes it, and
> nothing applies the OSHA 4:1 rule. Grep confirmed no scaffold-load tile. OSHA 1926.451(a)(1) requires a scaffold and its
> components to support four times the intended load, and counts 250 lb per person. The number this settles: a bay
> carrying two workers, 500 lb of material, and a 100 lb platform puts **275 lb** on each of four legs -- fine against a
> frame rated 2,500 lb (a 625 lb safe working load) -- but load it heavier and the leg load crosses the 4:1 line.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the accepted
capacity-check tiles (`guard-handrail-check`, `scaffold-mudsill-bearing`): all loads and the component rating carry force
`M L T^-2`, the worker count and leg count are dimensionless, and the utilization is dimensionless with a boolean pass.
The v18/v21 contract: a non-finite or non-positive leg count, component rating, or worker weight returns `{ error }`; a
negative platform, material load, or worker count returns `{ error }`. Citation discipline (v19/v22): the OSHA capacity
rule by name (safe working load = component rating / 4; leg load = total intended load / legs), OSHA 1926.451(a)(1) and the
250-lb-per-person basis, `GOVERNANCE.general`; the note states that the component rating is the manufacturer's, that 4:1
is the OSHA minimum, that the distribution to legs depends on the configuration and stacked lifts, that a competent person
verifies, and that the leg load feeds `scaffold-mudsill-bearing` for the foundation.

## 2. The tile

### 2.1 `scaffold-leg-load` -- Scaffold Per-Leg Load and OSHA 4:1 Check

```
inputs:
  platform_dead_lb    platform + scaffold dead load in the bay (lb)
  num_workers         workers on the bay (count)
  worker_lb           weight per worker with tools (lb, default 250)
  material_lb         stored material load (lb)
  n_legs              legs sharing the bay (count, default 4)
  component_rating_lb manufacturer leg/frame rating (lb)

total_load_lb = platform_dead_lb + num_workers * worker_lb + material_lb
leg_load_lb   = total_load_lb / n_legs
swl_lb        = component_rating_lb / 4
utilization   = leg_load_lb / swl_lb
pass          = leg_load_lb <= swl_lb
```

**Pinned worked example.** Platform 100 lb, 2 workers at 250, material 500 lb, 4 legs, frame rated 2,500 lb:
`total = 100 + 500 + 500 = 1,100 lb`; `leg = 1100 / 4 = ` **275 lb**; `SWL = 2500 / 4 = 625 lb`; `utilization = 0.44`,
**pass**. Cross-check: bumping to 4 workers and 1,500 lb of material gives `100 + 1000 + 1500 = 2,600 lb`, `2600/4 = ` **650
lb/leg** -- over the 625 lb SWL, so it **fails** and the crew adds a frame line or sheds the material.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, inside the `// Group E` construction block beside
`scaffold-mudsill-bearing`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (SWL = rating/4; leg load = total/legs, OSHA 1926.451(a)(1), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned pass example plus the overload cross-check); `test/fixtures/compute-map.js`
(`scaffold-leg-load` -> `computeScaffoldLegLoad`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `scaffold-mudsill-bearing` / `guard-handrail-check` / `shore-post-load`); `data/search/aliases.json` (5
collision-checked aliases: "scaffold leg load", "scaffold capacity check", "scaffold 4 to 1", "scaffold safe working
load", "frame scaffold load"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the
`guard-handrail-check` verdict renderer (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the total load, leg load, SWL, utilization, the
pass flag, and the error seams (non-positive legs, rating, worker weight; negative loads or worker count). The
calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,282 -> 1,283.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((100 + 2*250 + 500)/4 -> 275 lb/leg, pass vs 625 SWL).

## 5. Roadmap position

Pairs with `scaffold-mudsill-bearing` to complete the scaffold check (leg load, then the foundation it bears on), in the
accepted capacity-check family with `guard-handrail-check`. Serves the scaffold erector and competent person (construction
/ carpentry). Stays evidence-driven; OSHA sets the 4:1 minimum.
