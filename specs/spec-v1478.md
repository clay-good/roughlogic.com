# roughlogic.com Specification v1478 -- Roller Chain Wear Elongation Replacement Check (`calc-millwright.js`, Group G Cross-Trade Utilities, millwrighting, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-millwright.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; millwright, rotating equipment, and pneumatics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Roller chain does not stretch, it wears: the pin and bushing clearances grow and the chain gets longer. Past a threshold it climbs the sprocket teeth and destroys them, so the replacement decision is a tape measure over a known number of pitches and one percentage.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pitch, pitch count, or measured length, or a measured length below the nominal returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the chain wear elongation measurement and the 1.5% replacement threshold as standard practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`chain wear elongation`, `roller chain stretch`, `chain replacement limit`, `chain pitch measurement`, `sprocket wear chain`.

## 2. The tile

### 2.1 `roller-chain-wear-elongation` -- Roller Chain Wear Elongation Replacement Check

```
nominal length    L_nom = pitch x N_pitches
elongation        e = (L_meas - L_nom) / L_nom x 100%
replace at        1.5% for a hardened-tooth sprocket
                  3.0% acceptable on large, slow, low-tooth-count drives
allowable length  L_max = L_nom x (1 + e_limit)
```

Measure across a run of pitches with the chain pulled taut, from pin center to pin center, and compare against
the nominal. Measuring over twelve or more pitches rather than one is the whole accuracy trick -- the wear per
joint is tiny and only accumulates into something a tape can read over a span.

The 1.5% figure is not arbitrary. A chain riding a sprocket is a polygon, and as the pitch grows the chain
contacts fewer teeth and rides higher up the flanks; past roughly 1.5% on a normal tooth count it begins to jump
and the sprocket teeth wear into a hooked profile. Once that happens the sprocket is scrap too, and a new chain
on a hooked sprocket wears out in a fraction of its life -- which is why chain and sprockets are replaced as a
set. The threshold rises for sprockets with many teeth, where the chain has more engagement to lose before it
climbs.

**Inputs:** chain pitch, number of pitches measured, measured length across that span, the elongation limit, and optionally the sprocket tooth count

**Outputs:** the nominal length, the elongation as a percentage and in inches, the allowable length at the entered limit, a replace or keep verdict, and the remaining wear allowance in inches

## 3. Worked example

A #50 chain (0.625 in pitch) measured across 12 pitches, reading 7.66 in, against a 1.5% limit:

```
L_nom = 0.625 x 12       = 7.5000 in
e     = (7.66 - 7.5000) / 7.5000 = 2.13%
L_max = 7.5000 x 1.015    = 7.6125 in
```

2.13% against a 1.5% limit -- **replace**, and inspect the sprockets, because a chain this far gone has
almost certainly hooked the teeth. The chain passed the limit at 7.6125 in and is 0.048 in beyond it.

Measuring one pitch instead of twelve would have meant reading 0.6383 in against 0.625 in nominal, a difference
of 13.3 thousandths, which no tape in a plant will resolve. That is why the span matters.

## 4. Scope and non-goals

Wear elongation measured on the chain. It does not assess sprocket tooth wear, which must be inspected
separately and which independently condemns a drive regardless of chain elongation; it does not evaluate
lubrication, plate cracking, corrosion, tight or frozen joints, or roller wear, all of which condemn a chain at
any elongation. Chains running in abrasive or corrosive service, or in a food plant with washdown, follow their
own criteria. Chain selection and length in pitches is `roller-chain-length`, and the drive's service factor is
`gear-reducer-service-factor`. The chain and sprocket manufacturer's published wear limits and the equipment
manufacturer's maintenance instructions govern.
