# roughlogic.com Specification v833 -- HDD Pullback Force First-Order Estimate (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v832.md. Underground-utility sweep (entry 3), beside
> `pipe-flotation` and `restrained-pipe-length`.
>
> **The gap, and the evidence for it.** The catalog has electrical conductor pulling tension but nothing estimates
> **horizontal directional drilling pullback** -- the force to draw a product pipe back through a bore, which sets whether
> the rig and the pipe can take it. Grep confirmed no HDD / pullback tile. The number this settles: a floated 12-in HDPE
> at about 5 lb/ft effective weight over an 800 ft bore, at a 0.3 friction coefficient and a 1.5 bend factor, pulls back
> at roughly **1,800 lb** -- a first-order number the crew checks against the pipe's safe pull and the rig's rated thrust.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings: the effective pipe weight is force-per-length `M T^-2`, the bore length carries `L`, the friction
coefficient and bend factor are dimensionless, the fluid drag and safe pull are forces `M L T^-2`, the pullback is a force
`M L T^-2`, and the utilization is dimensionless. The v18/v21 contract: a non-finite or non-positive effective weight,
length, friction coefficient, or bend factor returns `{ error }`; a negative fluid drag or safe pull returns `{ error }`.
Citation discipline (v19/v22): the simplified pullback identity by name (F = friction x effective weight x length x bend
factor + fluid drag; based on ASTM F1962), `GOVERNANCE.general`; the note states plainly that this is a first-order
estimate -- the full F1962 model adds capstan/bend and hydrokinetic drag terms this tile omits -- that the effective pipe
weight already accounts for buoyancy in the drilling fluid (a ballasted or empty pipe can be near neutral), and that the
drilling contractor and the rig's rated thrust govern the pull.

## 2. The tile

### 2.1 `hdd-pullback` -- HDD Pullback Force First-Order Estimate

```
inputs:
  eff_weight_plf     effective pipe weight in fluid (lb/ft)
  length_ft          bore / pull length (ft)
  friction_coeff     friction coefficient mu (default 0.3)
  bend_factor        pull-path bend factor (default 1.5)
  fluid_drag_lb      hydrokinetic drag allowance (lb, default 0)
  pipe_safe_pull_lb  pipe safe pull strength (lb, default 0 = skip)

pullback_lb = friction_coeff * eff_weight_plf * length_ft * bend_factor + fluid_drag_lb
utilization = pipe_safe_pull_lb > 0 ? pullback_lb / pipe_safe_pull_lb : null
```

**Pinned worked example.** Effective weight 5 lb/ft, length 800 ft, friction 0.3, bend factor 1.5, drag 0, safe pull
20,000 lb: `pullback = 0.3*5*800*1.5 = ` **1,800 lb**; `utilization = 1800/20000 = ` **0.09**. Cross-check: a longer
1,500 ft bore raises it to `0.3*5*1500*1.5 = ` **3,375 lb** -- length scales the pull linearly, before the omitted drag
and bend terms that a full F1962 run would add on top.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "plumbing"]`, inside the `// Group E` earthwork block near
`restrained-pipe-length`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (F = mu x weight x length x bend + drag [ASTM F1962 basis], `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the longer-bore cross-check); `test/fixtures/compute-map.js`
(`hdd-pullback` -> `computeHddPullback`, module `../../calc-earthwork.js`); `scripts/related-tiles.mjs`
(-> `pipe-flotation` / `restrained-pipe-length` / `pipe-bedding-backfill`); `data/search/aliases.json` (5
collision-checked aliases: "hdd pullback force", "directional drilling pullback", "bore pull force", "pipe pullback
estimate", "hdd pull tension"); a hand-written renderer in the `EARTHWORK_RENDERERS` map mirroring
`_v67renderHaulCycleProduction` (non-exported, so no DOM-sentinel dims row), and the id added to the calc-earthwork declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the pullback, the utilization (and the null-when-skipped seam),
and the error seams (non-positive weight, length, friction, bend; negative drag or safe pull). The calc-earthwork.js gzip
cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded,
absent from home first paint. Home tile count 1,281 -> 1,282.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(0.3*5*800*1.5 -> 1,800 lb).

## 5. Roadmap position

Third underground-utility tile, completing the buried-pipe check trio (`pipe-flotation`, `restrained-pipe-length`,
`hdd-pullback`), serving the utility / boring contractor (construction / plumbing). Deliberately a first-order estimate;
the rig rating and the full F1962 model govern.
