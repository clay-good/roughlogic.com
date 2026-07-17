# roughlogic.com Specification v848 -- Buried Flexible Pipe Deflection (Modified Iowa) (calc-earthwork.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v847.md. Underground-utility sweep (entry 4), beside
> `pipe-flotation` and `pipe-bedding-backfill`.
>
> **The gap, and the evidence for it.** Nothing checks **buried flexible pipe deflection** -- how much a plastic or thin-
> wall pipe ovals under its soil load, the number a mandrel test later confirms against the 5% limit. Grep confirmed no
> deflection / Iowa-formula pipe tile. The Modified Iowa formula (Spangler / Watkins) is public-domain. The number this
> settles: a pipe under 12 ft of 120 pcf soil, on good bedding (E' = 1,000), deflects **2.2%** -- fine -- but drop the
> bedding support to E' = 200 and it jumps to **7.9%**, past the limit, which is why the compaction beside the pipe is the
> whole game.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`pipe-flotation`, `submerged-earth-pressure`): the cover carries `L`, the soil density `M L^-3`, the
pipe stiffness and modulus of soil reaction `M L^-1 T^-2` (psi), the deflection-lag and bedding constant are dimensionless,
the soil load is `M L^-1 T^-2`, and the deflection percent is dimensionless with a boolean pass. The v18/v21 contract: a
non-finite or non-positive cover, soil density, pipe stiffness, modulus of soil reaction, or allowable returns
`{ error }`; a non-positive deflection lag or bedding constant returns `{ error }`. Citation discipline (v19/v22): the
Modified Iowa (Spangler) deflection identity by name (deflection % = DL x K x Wc / (0.149 PS + 0.061 E') x 100),
`GOVERNANCE.general`; the note states that the formula is public-domain (Spangler / Watkins), that the modulus of soil
reaction E' is the field-controllable variable (better bedding compaction stiffens the support and cuts deflection), that
the pipe stiffness PS comes from the manufacturer, that the limit (commonly 5% or 7.5%) is set by the spec, and that the
pipe manufacturer and design engineer govern.

## 2. The tile

### 2.1 `flexible-pipe-deflection` -- Buried Flexible Pipe Deflection (Modified Iowa)

```
inputs:
  cover_ft          soil cover over the pipe (ft)
  soil_density_pcf  backfill density (pcf, default 120)
  deflection_lag    deflection lag factor DL (default 1.5)
  bedding_constant  bedding constant K (default 0.1)
  pipe_stiffness_psi pipe stiffness PS (psi)
  soil_modulus_psi  modulus of soil reaction E' (psi)
  allowable_pct     allowable deflection (percent, default 5)

soil_load_psi   = cover_ft * soil_density_pcf / 144
deflection_pct  = deflection_lag * bedding_constant * soil_load_psi / (0.149*pipe_stiffness_psi + 0.061*soil_modulus_psi) * 100
pass            = deflection_pct <= allowable_pct
```

**Pinned worked example.** Cover 12 ft, 120 pcf, DL 1.5, K 0.1, PS 46 psi, E' 1,000 psi, allowable 5%:
`Wc = 12*120/144 = 10 psi`; `deflection = 1.5*0.1*10 / (0.149*46 + 0.061*1000) * 100 = 1.5 / 67.85 * 100 = ` **2.21%**,
**pass**. Cross-check: poor haunch compaction dropping E' to 200 psi gives `1.5 / (6.854 + 12.2) * 100 = 1.5/19.05*100 = `
**7.87%** -- over the 5% limit and failing, on the same pipe and cover, purely from the bedding.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "plumbing"]`, inside the `// Group E` earthwork block near
`pipe-flotation`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (Modified Iowa deflection = DL K Wc / (0.149 PS + 0.061 E') x 100, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned pass example plus the poor-bedding fail cross-check);
`test/fixtures/compute-map.js` (`flexible-pipe-deflection` -> `computeFlexiblePipeDeflection`, module
`../../calc-earthwork.js`); `scripts/related-tiles.mjs` (-> `pipe-flotation` / `pipe-bedding-backfill` /
`relative-compaction`); `data/search/aliases.json` (5 collision-checked aliases: "flexible pipe deflection", "modified
iowa formula", "pipe ovality deflection", "buried pipe deflection", "spangler deflection"); a hand-written renderer in the
`EARTHWORK_RENDERERS` map mirroring the `crane-ground-bearing`-style verdict renderer (non-exported, so no DOM-sentinel
dims row), and the id added to the calc-earthwork declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the soil load,
the deflection percent (pass and fail cases), the pass flag, and the error seams (non-positive cover, density, PS, E',
allowable, DL, K). The calc-earthwork.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,296 -> 1,297.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(1.5*0.1*10 / (0.149*46 + 0.061*1000) * 100 -> 2.21%).

## 5. Roadmap position

Fourth underground-utility tile, closing the buried-pipe check set (`pipe-flotation`, `restrained-pipe-length`,
`hdd-pullback`, `flexible-pipe-deflection`), serving the utility contractor and inspector (construction / plumbing). Stays
evidence-driven; the pipe manufacturer and engineer govern the limit.
