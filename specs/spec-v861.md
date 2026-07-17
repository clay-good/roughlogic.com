# roughlogic.com Specification v861 -- Line-Set Length Refrigerant Charge Adder (calc-refrigerant.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigerant.js`** (Group C),
> no new module, group, or dependency. Inherits spec.md through spec-v860.md. HVAC service sweep, beside
> `refrigerant-charge`.
>
> **The gap, and the evidence for it.** `refrigerant-charge` handles a total weigh-in but nothing gives the **line-set
> length adder** -- the extra refrigerant a longer-than-factory line set needs, the number a tech adds to the nameplate
> base. Grep confirmed no line-set adder tile. The number this settles: a 60 ft line set on a unit pre-charged for 15 ft,
> at 0.6 oz/ft, needs **27 oz** (1.69 lb) added -- and getting it wrong is a low-capacity callback.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group C
refrigerant siblings (`refrigerant-charge`, `refrigerant-line-size`): the line-set and factory lengths carry `L`, the
per-foot rate is a mass-per-length (`M L^-1`), and both adder figures are `M`. The v18/v21 contract: a non-finite or
non-positive line-set length or per-foot rate returns `{ error }`; a negative factory length returns `{ error }`.
Citation discipline (v19/v22): the charge-adder identity by name (extra = max(0, actual - factory) x rate),
`GOVERNANCE.general`; the note states that the per-foot rate and the factory pre-charge length come from the equipment
nameplate (they vary by refrigerant and liquid-line size -- R-410A on a 3/8 in liquid line runs about 0.6 oz/ft), that
only the liquid line adds meaningful charge, that over- or under-charging cuts capacity and drives callbacks, and that the
total is weighed in, not guessed.

## 2. The tile

### 2.1 `refrigerant-lineset-charge-adjust` -- Line-Set Length Refrigerant Charge Adder

```
inputs:
  lineset_length_ft       actual line-set length (ft)
  factory_charge_length_ft factory pre-charge length (ft, default 15)
  rate_oz_per_ft          charge rate (oz/ft, default 0.6)

extra_oz = max(0, lineset_length_ft - factory_charge_length_ft) * rate_oz_per_ft
extra_lb = extra_oz / 16
```

**Pinned worked example.** Line set 60 ft, factory 15 ft, rate 0.6 oz/ft:
`extra = max(0, 60-15) * 0.6 = 45 * 0.6 = ` **27 oz** (1.69 lb). Cross-check: a short run at or under the factory 15 ft
adds `max(0, 15-15)*0.6 = ` **0 oz**, and a 100 ft run adds `85*0.6 = ` **51 oz** -- the adder is linear past the factory
length, and zero below it.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac", "refrigeration"]`, inside the `// Group C` refrigerant block beside
`refrigerant-charge`) -- the Group C citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`C`); a
`citations.js` entry (extra = max(0, actual - factory) x rate, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the at-factory and long-run cross-checks);
`test/fixtures/compute-map.js` (`refrigerant-lineset-charge-adjust` -> `computeRefrigerantLinesetChargeAdjust`, module
`../../calc-refrigerant.js`); `scripts/related-tiles.mjs` (-> `refrigerant-charge` / `refrigerant-line-size` /
`refrigerant-velocity`); `data/search/aliases.json` (5 collision-checked aliases: "line set charge adder", "refrigerant
line length charge", "lineset charge adjustment", "extra refrigerant per foot", "long line set charge"); a hand-written
renderer in the `REFRIGERANT_RENDERERS` map mirroring the `refrigerant-charge` renderer (non-exported, so no DOM-sentinel
dims row), and the id added to the calc-refrigerant declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the ounce and
pound adder (including the clamped-to-zero seam) and the error seams (non-positive line-set length or rate; negative
factory length). The calc-refrigerant.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,309 -> 1,310.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+3 fixtures, the new fuzzer block, the Group C audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(max(0, 60-15) * 0.6 -> 27 oz).

## 5. Roadmap position

HVAC service tile beside `refrigerant-charge` (total weigh-in): the line-set adder a tech applies on a long run, serving
the HVAC / refrigeration tech (hvac / refrigeration). Stays evidence-driven; the nameplate governs the rate.
