# roughlogic.com Specification v1762 -- Leaching Fraction and Root-Zone Salt Balance (`calc-greenhouse.js`, Group L Agriculture and Forestry, greenhouse and controlled-environment agriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-greenhouse.js`**
> (Group L Agriculture and Forestry, hub `/groups/agriculture/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Irrigating past the container's capacity is how salts are kept from accumulating in the root zone, and the fraction that runs out the bottom is the control. The salt balance sets an upper bound on how concentrated the leachate can be, and the gap between that bound and the measurement is the crop's own uptake.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive applied volume or conductivity, a drained volume at or above the applied volume, or a leaching fraction outside 0 to 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the steady-state salt mass balance and the leaching-fraction definition with the crop producer guide, a laboratory water analysis, and the applicable discharge regulations named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`leaching fraction greenhouse`, `runoff ec root zone`, `salt accumulation container`, `leachate ec monitoring`, `pour through ec`.

## 2. The tile

### 2.1 `leaching-fraction-runoff-ec` -- Leaching Fraction and Root-Zone Salt Balance

```
leaching fraction LF = volume drained / volume applied, commonly 0.10 to 0.30
                  in container production and higher where water quality is poor
salt balance      at steady state, salt in = salt out. If the crop took up NO salt:
                  EC_drain = EC_feed / LF  -- an UPPER BOUND, not a prediction
uptake            the crop takes up much of the applied salt, so measured leachate
                  runs well below the bound; the gap IS the uptake
monitoring        pour-through or saturated media extract on a schedule is what
                  establishes the actual root-zone EC; the bound only says what is
                  possible
low LF            saves water and fertiliser and lets salts climb
high LF           holds salts down and sends water, nutrient, and money to the drain
                  -- and in many jurisdictions to a regulated discharge
```

Leaching is the only mechanism that removes salt from a container, and that is why the fraction is managed
rather than allowed to happen. Water leaves the root zone by evaporation and transpiration and takes no salt
with it, so everything dissolved in the irrigation and the feed stays behind and concentrates. The only exit
is liquid water running out of the bottom, and the share of applied water that does so sets the rate at which
the root zone can be flushed.

The mass balance is a bound and must be read as one. Salt in equals salt out at steady state, so if the crop
absorbed no salt at all the leachate would concentrate by exactly the reciprocal of the leaching fraction -- a
very large number at practical fractions. Measured leachate never reaches it, and the reason is simply that
the crop is doing its job: the difference between the bound and the measurement is the fertiliser that went
into the plant rather than into the drain, which makes this one of the few calculations whose error term is
the useful result.

The tension between the two failure modes is real and has no universal answer. A low fraction conserves water
and fertiliser and keeps discharge down, and lets salinity climb toward the level that burns roots. A high
fraction holds the root zone clean and sends nutrient to the drain, where in much of the country it is a
regulated discharge with its own reporting. Water quality decides where a grower has to sit on that line: a
source already high in salts forces a higher fraction before any fertiliser is added.

**Inputs:** the volume applied and the volume drained or the leaching fraction, the feed solution electrical conductivity, the source water conductivity, and optionally a measured leachate reading and a target root-zone conductivity

**Outputs:** the leaching fraction, the no-uptake upper bound on leachate conductivity, the bound at an alternative fraction, the implied crop uptake when a measurement is entered, and the leaching fraction the bound alone would require to hold a target

## 3. Worked example

A container crop applying 1.0 unit volume per event and collecting 0.20 as leachate, on a feed at
EC 2.0 mS/cm:

```
LF    = 0.20 / 1.0 = 20%
bound = 2.0 / 0.20 = 10.0 mS/cm
```

**10 mS/cm is not a prediction -- it is what the leachate would reach if the crop absorbed no salt at all.**
Nothing grows at 10 mS/cm, which is the clue that the bound is far from the truth.

**Measure it and the gap tells you the uptake.** A pour-through reading of 3.0 mS/cm on the same crop means:

```
salt out = 3.0 x 0.20 = 0.60 units
salt in  = 2.0 x 1.0 = 2.00 units
uptake   = 1 - 0.60 / 2.00 = 70%
```

**The crop took up 70% of the applied salt.** That is the number a grower actually wants, and it is only
visible as the difference between the bound and the measurement -- which is why this calculation's error term
is its product.

**Raising the leaching fraction moves the bound, and less than proportionally in the useful direction.** At
LF 40% the bound falls to 5.0 mS/cm -- half the salt concentration for **twice the water and twice the fertiliser
down the drain.** That is the trade, stated plainly.

**And here is why the bound must never be used as a target.** To hold leachate at 3.0 mS/cm on the bound alone
would take:

```
LF = 2.0 / 3.0 = 67%
```

**A 67% leaching fraction** -- applying three times what the crop uses and discharging two thirds of it. No
one irrigates that way, and no one needs to, because the crop is removing most of the salt. **Manage to the
measurement, not to the bound.**

## 4. Scope and non-goals

A mass-balance screen and a monitoring aid. The bound assumes steady state and zero crop uptake and is therefore always conservative by a wide margin -- it is useful as a limit and as the reference against which a measurement reveals uptake, and it must not be used as a design target. It does not model the substrate's actual salt dynamics, which involve cation exchange, precipitation and dissolution of low-solubility salts, non-uniform wetting, and preferential flow that lets water bypass much of the root zone entirely. It does not interpret an electrical conductivity reading into individual nutrients or identify which salt is accumulating, which requires a laboratory analysis and which matters because sodium and chloride behave very differently from a balanced feed. It does not address irrigation scheduling or volume (`greenhouse-transpiration-water`), the pour-through and saturated-media-extract procedures themselves, which are method-specific and not interchangeable, or nutrient discharge permitting and containment, which are regulated in many jurisdictions. The crop's producer guide, a laboratory water and leachate analysis, the applicable discharge regulations, and the grower's own monitoring records govern.
