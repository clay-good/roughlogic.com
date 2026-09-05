# roughlogic.com Specification v1722 -- Coating VOC Content and Compliance Rate (`calc-airquality.js`, Group G Cross-Trade Utilities, air quality, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-airquality.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; air quality and environmental), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Coating VOC limits are written as pounds per gallon of coating LESS WATER AND EXEMPT SOLVENT, which is not the number on the can. A waterborne coating that looks compliant on its label can be over the limit once the water is subtracted.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a negative VOC content, water content, or thinner volume, or a coating volume less water at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the less-water VOC basis and the as-applied requirement with the applicable coating rule named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`voc less water coating`, `coating voc compliance calculation`, `voc as applied thinning`, `exempt solvent voc`, `waterborne coating voc limit`.

## 2. The tile

### 2.1 `coating-voc-compliance` -- Coating VOC Content and Compliance Rate

```
VOC as supplied     lb of VOC per gallon of the coating as it comes
VOC less water      lb VOC / (gallons of coating - gallons of water - gallons of exempt)
                    this is the regulatory basis in most coating rules
exempt solvents     compounds EPA has determined are negligibly photochemically reactive
                    and which are excluded from the VOC definition
as applied          after thinning; thinner adds VOC and reduces compliance margin
consequence         a low-VOC waterborne coating can exceed a limit expressed less water
transfer efficiency separately, some rules credit high transfer efficiency equipment
```

The less-water basis exists to prevent compliance by dilution. If VOC were measured per gallon of coating as
supplied, adding water to a solvent coating would lower the number without reducing the solvent applied per square
foot of surface -- so the rule subtracts the water and the exempt solvents and measures the VOC against the
remaining volume, which is roughly the material that actually forms the film plus the solvent in it.

The consequence is that waterborne coatings can fail limits they appear to pass. A coating that is mostly water
with a modest amount of coalescing solvent has a low VOC per gallon as supplied and can have a high VOC less
water, because the denominator is small. That is a genuine and frequent surprise, and it is why the technical
data sheet reports both numbers and why the regulatory one is the one that matters.

Thinning is where compliance is lost in the shop. A coating compliant as supplied and thinned twenty percent with
solvent is a different coating with a different VOC content, and rules apply to the coating AS APPLIED. A painter
adding thinner for spray conditions on a hot day has changed the regulatory status of the material, and the
recordkeeping most rules require is what makes that visible.

Exempt solvents are a real compliance strategy and a moving list: EPA has exempted specific compounds as
negligibly reactive, and reformulating with them lowers the regulatory VOC without changing the coating's
solvent content in any physical sense.

**Inputs:** the coating volume, its VOC content as supplied, the water and exempt solvent volumes, the thinner volume and its VOC content, and the applicable regulatory limit

**Outputs:** the VOC as supplied, the VOC less water and exempt solvent, the VOC as applied after the entered thinning, each against the entered limit, the margin, and the maximum thinning that keeps the coating compliant

## 3. Worked example

A waterborne coating: 1 gallon containing 0.5 lb of VOC, 0.55 gallons of water, and no exempt solvent.

```
VOC as supplied    = 0.5 lb / 1.0 gal      = 0.50 lb/gal
VOC less water     = 0.5 / (1.0 - 0.55)    = 0.5 / 0.45 = 1.11 lb/gal
```

**0.50 on the can and 1.11 on the regulatory basis.** Against a 2.8 lb/gal limit less water it complies
comfortably; against a 1.0 lb/gal limit it does not -- and the label number would have suggested it passed by a
wide margin.

**Now thin it.** Adding 0.2 gallons of a solvent at 7.0 lb/gal VOC:

```
total VOC     = 0.5 + 0.2 x 7.0 = 1.9 lb
total volume  = 1.2 gal
water         = 0.55 gal (unchanged)
VOC less water= 1.9 / (1.2 - 0.55) = 1.9 / 0.65 = 2.92 lb/gal
```

**From 1.11 to 2.92 lb/gal** with one addition of thinner -- and the coating is now over a 2.8 limit it passed
before. Rules apply to the coating AS APPLIED, so the thinning is the regulated act, and the shop's mixing records
are what document it.

That is the practical finding: **compliance is decided at the mixing bench, not at the purchase order**, and a
compliant coating thinned at the gun is a non-compliant coating.

## 4. Scope and non-goals

A VOC content calculation. The regulatory basis -- less water and exempt solvent, as applied, per gallon of
coating or per gallon of solids depending on the rule -- differs between programs, and the applicable rule's own
definition and limit govern. The list of exempt compounds changes and is set by EPA and, separately, by some
states. It does not address the recordkeeping, reporting, and material tracking most coating rules require, which
are how compliance is demonstrated, or the alternative compliance approaches some rules allow, including
add-on control and averaging. It does not address transfer efficiency credits (`spray-transfer-efficiency`)
where a rule allows them. It does not address the health and safety requirements for the coatings and solvents,
which are separate. The applicable air district or state coating rule, the coating manufacturer's technical data
sheet, and the permitting authority govern.
