# roughlogic.com Specification v907 -- Soffit Vent and Ridge-Vent Count from Required NFA (calc-finish.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v906.md. Roofing / ventilation sweep, beside
> `attic-ventilation` and `attic-baffle-count`.
>
> **The gap, and the evidence for it.** `attic-ventilation` gives the required net free area (NFA) but nothing converts it
> into a **vent count** -- the soffit vents and ridge-vent feet, split balanced between intake and exhaust. Grep confirmed
> no vent-count tile. The number this settles: a 1,500 sf attic at 1/300 needs 720 in^2 of NFA -- 360 in^2 each way -- so
> **14 soffit vents** at 26 in^2 and **20 LF** of ridge vent at 18 in^2/ft.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
ventilation siblings (`attic-ventilation`, `powered-attic-ventilator`): the attic area, per-vent NFA, and NFA figures
carry `L^2`, the vent ratio is dimensionless, the ridge NFA per foot is `L` (in^2/ft), the ridge length is `L`, and the
soffit-vent count is dimensionless. The v18/v21 contract: a non-finite or non-positive attic area, vent ratio, per-vent
NFA, or ridge NFA per foot returns `{ error }`. Citation discipline (v19/v22): the vent-count identity by name (total NFA
= attic area / ratio x 144; intake = exhaust = total / 2; soffit vents = ceil(intake / per-vent NFA); ridge = ceil(exhaust
/ ridge NFA per ft)), `GOVERNANCE.general`; the note states that the required NFA and the 1/300 (balanced, with a vapor
retarder) or 1/150 ratio come from the IRC (`attic-ventilation` gives the NFA), that the product NFA per vent and per foot
of ridge come from the manufacturer (entered here), that intake should meet or exceed exhaust, and that this is distinct
from the required-NFA `attic-ventilation`.

## 2. The tile

### 2.1 `soffit-ridge-vent-count` -- Soffit Vent and Ridge-Vent Count from Required NFA

```
inputs:
  attic_area_sf         attic floor area (ft^2)
  vent_ratio            NFA ratio denominator (1/N; default 300)
  soffit_vent_nfa_in2   NFA per soffit vent (in^2, default 26)
  ridge_nfa_per_ft_in2  NFA per foot of ridge vent (in^2/ft, default 18)

total_nfa_in2   = attic_area_sf / vent_ratio * 144
intake_nfa_in2  = total_nfa_in2 / 2
exhaust_nfa_in2 = total_nfa_in2 / 2
soffit_vents    = ceil(intake_nfa_in2 / soffit_vent_nfa_in2)
ridge_lf        = ceil(exhaust_nfa_in2 / ridge_nfa_per_ft_in2)
```

**Pinned worked example.** Attic 1,500 sf, 1/300, 26 in^2 soffit vents, 18 in^2/ft ridge:
`total = 1500/300*144 = ` **720 in^2**; `intake = exhaust = ` **360 in^2**; `soffit = ceil(360/26) = ` **14**;
`ridge = ceil(360/18) = ` **20 LF**. Cross-check: without a vapor retarder the 1/150 ratio doubles the NFA to 1,440 in^2,
so **28 soffit vents** and **40 LF** of ridge -- the ratio, set by the assembly, drives both counts.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["roofing", "carpentry"]`, inside the `// Group E` finish block beside
`attic-ventilation`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (total NFA = area/ratio x 144; soffit = ceil(intake/per-vent), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the 1/150 cross-check); `test/fixtures/compute-map.js`
(`soffit-ridge-vent-count` -> `computeSoffitRidgeVentCount`, module `../../calc-finish.js`); `scripts/related-tiles.mjs`
(-> `attic-ventilation` / `powered-attic-ventilator` / `roofing-squares`); `data/search/aliases.json` (5
collision-checked aliases: "soffit vent count", "ridge vent length", "attic vent count", "intake exhaust vents", "roof
ventilation vents"); a hand-written renderer in the `FINISH_RENDERERS` map mirroring the `attic-ventilation` renderer
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-finish declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js`
block pinning the NFA figures, soffit-vent count, ridge length, and the error seams (non-positive area, ratio, per-vent
NFA, ridge NFA per ft). The calc-finish.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,355 -> 1,356.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(1500/300*144/2 / 26 -> 14 soffit vents, 20 LF ridge).

## 5. Roadmap position

Ventilation takeoff beside `attic-ventilation` (required NFA) and `attic-baffle-count`, serving the roofer / insulator
(roofing / carpentry). Stays evidence-driven; the IRC ratio and product NFA govern.
