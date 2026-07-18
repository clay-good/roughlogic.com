# roughlogic.com Specification v977 -- Wobbe Index (Fuel-Gas Interchangeability) (calc-gas.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-gas.js`** (Group B), no
> new module, group, or dependency. Inherits spec.md through spec-v976.md. Fuel-gas sweep, beside the accepted
> `gas-fuel-conversion` and `gas-appliance-demand` tiles.
>
> **The gap, and the evidence for it.** The catalog converts an appliance between NG and propane by orifice area, but
> nothing gives the WOBBE index -- the interchangeability number that says whether a conversion is even needed. Grep
> confirmed no wobbe / interchangeability tile. Every gas tech and utility uses it. The number this settles: natural gas
> has a Wobbe of about **1,291**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, mixing BTU/ft^3 and a specific gravity), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input or a non-positive HHV or
specific gravity returns `{ error }`. Citation discipline (v19/v22): the Wobbe index by name (AGA interchangeability /
ISO 13686), `GOVERNANCE.general`; the note explains that equal Wobbe means the same heat input through the same orifice
(so interchangeable without re-orificing), that NG (~1,291) and propane (~2,040) are far apart (a conversion is
required), and that Wobbe captures orifice/heat-input but NOT flame speed / yellow-tipping / flashback (the full AGA
indices do) -- the supplier analysis, the appliance listing, and the conversion kit and AHJ govern.

## 2. The tile

### 2.1 `wobbe-index` -- Wobbe Index (Fuel-Gas Interchangeability)

```
inputs:
  hhv_btu_ft3      higher heating value (BTU/ft^3), default 1000
  specific_gravity gas specific gravity vs air, default 0.60

wobbe_index_btu_ft3 = hhv_btu_ft3 / sqrt(specific_gravity)
```

**Pinned worked example.** Natural gas, HHV 1,000 BTU/ft^3, SG 0.60: `WI = 1000/sqrt(0.60) = ` **1,291**. Cross-check:
propane, HHV 2,516, SG 1.52: `WI = 2516/sqrt(1.52) = ` **2,041** -- far from natural gas, which is exactly why an
appliance must be CONVERTED (orifice and manifold pressure) between the two fuels.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing", "hvac"]`, beside `gas-fuel-conversion`); a `tile-meta.js` `_TILES`
entry (`B`); a `citations.js` entry (Wobbe / AGA / ISO 13686, `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the natural-gas example plus the propane cross-check, pinning the Wobbe index); `test/fixtures/compute-map.js` (`wobbe-
index` -> `computeWobbeIndex`, module `../../calc-gas.js`); `scripts/related-tiles.mjs` (-> `gas-fuel-conversion` /
`gas-appliance-demand` / `gas-altitude-derate`); `data/search/aliases.json` (5 collision-checked aliases: "wobbe index",
"gas interchangeability", "fuel gas interchangeability", "wobbe number", "gas heating value density"), then `node
scripts/build-alias-shards.mjs`; a hand-written renderer in the `GAS_RENDERERS` map (non-exported, so no DOM-sentinel
dims row), and the id added to the calc-gas declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the Wobbe
index, the propane comparison, the HHV linearity and sqrt(SG) direction, the SG=1 identity, and the error seams. The
calc-gas.js gzip cap and the Group B group shell are watched at build. Home tile count 1,425 -> 1,426.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(1,000 / 0.60 -> 1,291).

## 5. Roadmap position

Fuel gas beside `gas-fuel-conversion`, serving the gas / HVAC service tech (plumbing / hvac). Deliberately the Wobbe
orifice/heat-input index; the flame-speed / yellow-tipping / flashback limits (the full AGA interchangeability indices),
the gas supplier's certified analysis, the appliance listing, and the manufacturer's conversion kit and the AHJ govern
any actual fuel change. Stays evidence-driven. Continues the fuel-gas sweep at 1 new spec (v977).
