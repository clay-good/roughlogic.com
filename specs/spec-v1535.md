# roughlogic.com Specification v1535 -- Atmospheric Tank Vent Sizing (API 2000) (`calc-oilgas.js`, Group B Plumbing and Gas, oil and gas production, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-oilgas.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; oil, gas, and pipeline), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A tank is a thin-walled box that fails at a few ounces of pressure or vacuum, and its vents have to keep up with the worst of pump-in, pump-out, and thermal breathing. Undersized venting collapses a tank inward on a cold night as reliably as it bursts one on a hot day.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive tank capacity, pump rate, or vent capacity, or a negative wetted area returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): API 2000 by name for normal and emergency venting with API 650 named for the tank rating, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`tank vent sizing`, `api 2000 breathing`, `tank vacuum breather`, `normal venting tank`, `emergency vent fire case`.

## 2. The tile

### 2.1 `tank-vent-api-2000` -- Atmospheric Tank Vent Sizing (API 2000)

```
out-breathing   from maximum pump-IN rate plus thermal expansion
in-breathing    from maximum pump-OUT rate plus thermal contraction
liquid movement out-breathing typically ~ 1.07 x pump-in volumetric rate for volatile
                in-breathing typically ~ 1.0 x pump-out rate
thermal         from tank capacity and the API 2000 thermal venting tables
fire case       a separate, much larger requirement based on wetted area
```

Four demands, and the required vent capacity is the largest combination that can occur at once -- normally
pump-out plus thermal in-breathing for vacuum, and pump-in plus thermal out-breathing for pressure. The
liquid-movement terms are straightforward: whatever volume goes in has to displace an equal volume of vapour out,
with an allowance above unity for volatile products because some liquid flashes.

Thermal in-breathing is the one that quietly destroys tanks. A warm tank hit by a cold rain contracts its vapour
space fast, and if the vent cannot admit air at that rate the tank pulls a vacuum. Tanks are far weaker in vacuum
than in pressure, so this is the more common failure, and it happens with no pumping at all -- which is why a tank
that has sat idle can be found dished in.

The fire case is separate and much larger, sized on wetted surface area, and where it applies it usually governs
the emergency venting entirely.

**Inputs:** tank capacity, maximum pump-in and pump-out rates, the product volatility class, the thermal venting rate from the API 2000 tables, the wetted surface area for the fire case, and the installed vent capacity

**Outputs:** the out-breathing and in-breathing requirements from liquid movement and thermal effects, the governing normal venting requirement in each direction, the emergency venting requirement for the fire case, and the margin against the installed vent capacity

## 3. Worked example

A 10,000 bbl tank filled at 3,000 bbl/h and emptied at 2,000 bbl/h, non-volatile product:

```
out-breathing (liquid) = 3,000 bbl/h x 5.615 cu ft/bbl   = 16,845 cu ft/h
in-breathing  (liquid) = 2,000 bbl/h x 5.615             = 11,230 cu ft/h
thermal (from the API 2000 table for this capacity)      = added to each
```

The pump-in case governs pressure and the pump-out case governs vacuum, each with its thermal term added. The
practical failure mode here is the vacuum side: 11,230 cu ft/h of air has to get IN through the vent while the
tank is being emptied, and a vent screen fouled with ice, insects, or paint restricts exactly that path.

The fire case is a different order of magnitude. For a tank with 1,600 sq ft of wetted area the API 2000
emergency requirement runs into hundreds of thousands of cubic feet per hour, which is why emergency venting is a
weak-seam roof or a dedicated emergency vent rather than the normal breather.

## 4. Scope and non-goals

A screening calculation of normal and emergency venting requirements. Actual sizing must follow the current
edition of API 2000 with its own tables and equations, which distinguish refrigerated from non-refrigerated
tanks, treat volatile and non-volatile products differently, and account for insulation and drainage in the fire
case. It does not select vent devices, evaluate their measured flow capacity at the allowable pressure and vacuum
(a device's nameplate is not its capacity at the tank's rating), address flame arrestors and the pressure drop
they add, or evaluate vapour recovery, blanketing, or the emissions requirements that often govern what may be
vented at all. It does not address the tank's own pressure and vacuum ratings, which come from API 650 or the
manufacturer and which the venting must protect. This is a life-safety and asset-integrity system: API 2000, API
650, the tank manufacturer, and a qualified engineer govern.
