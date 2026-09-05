# roughlogic.com Specification v1598 -- HDD Drilling Fluid Volume and Annular Flow (`calc-trenchless.js`, Group E Carpentry and Construction, trenchless, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trenchless.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; trenchless, hdd, and utility locating), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A bore needs its hole volume in drilling fluid several times over, and running short mid-pullback stops the job in the worst possible place. The volume is a cylinder, the mix is a ratio, and the disposal is a permit -- and all three come off the same number.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive reamed diameter, bore length, or fluid multiplier, or a pipe diameter at or above the reamed diameter returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the hole and annular volume relations with the mud program and applicable waste regulations named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`hdd drilling fluid volume`, `bore hole volume gallons`, `annular volume hdd`, `mud volume directional drill`, `drilling spoil disposal volume`.

## 2. The tile

### 2.1 `hdd-fluid-volume` -- HDD Drilling Fluid Volume and Annular Flow

```
hole volume      V = (pi/4) d_ream^2 x L
annular volume   V = (pi/4) (d_ream^2 - d_pipe^2) x L
fluid required   commonly 2 to 5 times hole volume for the whole bore, more in coarse soils
mix              bentonite pounds per 100 gal from the mud program; polymers as required
returns          fluid coming back to entry or exit; the difference is what stayed in the ground
disposal         spoil volume = returns + cuttings; a regulated waste in most jurisdictions
```

The hole volume itself is the small number; the fluid requirement is a multiple of it because fluid is
circulated, some is lost to the formation, and the hole is drilled and reamed more than once. Two to three times
hole volume is a reasonable planning figure in cohesive ground and it climbs sharply in sand and gravel, where
losses can be most of what is pumped.

The annular volume is the operationally useful one during pullback: it is the space between the reamed hole and
the product pipe, and it is what the fluid has to fill and keep filled to carry cuttings and lubricate the pull.
An annulus that is not full is an annulus that is packing off.

Disposal is the part that gets underestimated on the estimate. Returns plus cuttings is a substantial volume of
regulated waste, it has to be contained rather than allowed to run, and in most jurisdictions it cannot simply be
spread. A bore that budgets for fluid and not for its disposal has budgeted for half the fluid cost.

**Inputs:** reamed hole diameter, product pipe diameter, bore length, the fluid volume multiplier for the soil, the bentonite mix rate, the pump rate, and the expected returns fraction

**Outputs:** the hole volume and annular volume in gallons and barrels, the total fluid required at the entered multiplier, the bentonite quantity, the pumping time at the entered rate, and the spoil volume for disposal

## 3. Worked example

A 900 ft bore reamed to 20 in for 12.75 in pipe:

```
hole volume    = (pi/4)(20/12)^2 x 900 / 5.615 = 350 bbl = 14,687 gal
annular volume = (pi/4)((20/12)^2 - (12.75/12)^2) x 900 / 5.615 = 208 bbl = 8,718 gal
```

At a 3x multiplier for the whole bore:

```
fluid required = 14,687 x 3 = 44,061 gallons
```

**44,061 gallons** -- roughly 9 tanker loads of water on site, before any is
recycled. In sand and gravel at a 5x multiplier it is 73,434 gallons, and that difference is a
mobilization decision made from the geotechnical report rather than discovered on day two.

Disposal: if 70% of what is pumped comes back, returns are about
30,842 gallons plus cuttings -- 734 barrels of regulated waste to contain,
haul, and dispose of. That is a line item, and it is one that estimates routinely omit.

## 4. Scope and non-goals

Volume arithmetic using a fluid multiplier the user supplies. The multiplier is a planning figure that varies
enormously with soil type, hole condition, and whether fluid is recycled, and in coarse or fractured ground
losses can be effectively unbounded -- a bore that loses circulation entirely is a different problem than a
volume shortfall. It does not design the drilling fluid: bentonite and polymer selection, viscosity, gel
strength, fluid loss control, and sand content are a mud program matter and are what determine whether the hole
stays open and the cuttings come out. It does not compute annular pressure or the frac-out risk
(`hdd-annular-pressure`), size the mixing and recycling equipment, or address the containment, testing, and
disposal requirements for returns, which are regulated and jurisdiction specific. The mud program, the
geotechnical investigation, the applicable discharge and waste regulations, and the drilling contractor's
engineer govern.
