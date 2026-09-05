# roughlogic.com Specification v1747 -- Acid Waste Neutralization Tank Sizing (`calc-cross.js`, Group B Plumbing and Gas, plumbing, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; cross-trade gap fills), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Laboratory and process drains carrying acid have to be neutralized before they reach the sewer, and the tank is sized on retention time rather than on flow alone. A tank too small passes a slug of acid through untreated, which is the whole failure mode.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive flow rate or retention time, or a discharge pH outside the entered limits returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the retention volume relation with the local sewer authority pretreatment requirements named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`acid waste neutralization tank`, `limestone chip tank sizing`, `lab waste ph sewer`, `neutralization retention time`, `acid waste piping material`.

## 2. The tile

### 2.1 `acid-waste-neutralization` -- Acid Waste Neutralization Tank Sizing

```
tank volume        V = peak flow x required retention time
retention          commonly 15 to 30 minutes; the local sewer authority sets it
limestone chip     passive neutralization; the chips dissolve and must be replenished
                   effective for dilute acid, and it cannot handle strong or high flows
active dosing      pH monitoring with caustic injection; required for strong acid,
                   high flow, or tight pH limits
discharge limits   commonly pH 5.5 to 10.5 to sewer; the authority's limit governs
slug               a single large discharge of concentrated acid is the design case,
                   not the average flow
materials          the tank, piping, and everything downstream must resist the waste
```

Retention time is the design basis because neutralization is a reaction that takes time and mixing. A tank sized
on flow with too little retention passes the waste through before it has reacted, and the discharge is acid --
which the sewer authority discovers at its own monitoring point rather than at the building. The failure is
invisible at the source.

The slug is the design case rather than the average. A laboratory's average acid discharge might be small and
continuous; the event that matters is a single container emptied at once, and a tank sized on the average passes
that slug straight through. Design flows come from the fixture count and the credible worst-case discharge, not
from a daily total.

Limestone chip tanks are passive and have real limits. They neutralize dilute acid well, they need periodic
replenishment as the chips dissolve, and they are defeated by strong acid, by high flow, and by anything that
coats the chips. Where the limits are tight or the waste is strong, an active system with pH monitoring and
caustic dosing is required -- and it needs the monitoring, the reagent supply, and the maintenance that a passive
tank does not.

Materials run the whole length of the system. Acid waste piping is a specified material -- glass, polypropylene,
or a specific plastic -- from the fixture to the tank, and the tank itself and everything downstream of it until
the waste is neutralized must resist the waste. Ordinary drainage material in an acid waste line fails, and it
fails buried in a floor.

**Inputs:** the peak and slug flow rates, the required retention time, the waste pH and strength, the sewer discharge pH limits, the neutralization method, and the piping and tank materials

**Outputs:** the tank volume for the entered flow and retention, the retention time an existing tank provides at the entered flow, the volume required for a stated slug discharge, the limestone consumption rate, and a flag where the waste strength or flow exceeds passive treatment

## 3. Worked example

A laboratory with a 25 gpm peak drainage flow and a 30 minute required retention:

```
tank volume = 25 x 30 = 750 gallons
```

**The slug case is what actually sizes it.** If the credible worst case is a 5 gallon container of concentrated
acid emptied into a sink at once, the question is not whether the tank holds it -- it obviously does -- but
whether the tank's contents can neutralize it and whether it stays long enough to react. A 750 gallon tank at
25 gpm turns over every 30 minutes, and a slug entering at the start of that window has
30 minutes of contact.

Halve the tank and the slug has 15 minutes, and part of it leaves unreacted. **That is the failure mode**,
and it is discovered at the sewer authority's monitoring point rather than at the building.

**The passive limits.** A limestone chip tank neutralizes dilute acid by dissolution, so:

```
chips dissolve and must be replenished on a schedule
strong acid overwhelms the available surface
high flow reduces contact time below what the reaction needs
coating (from oils, precipitates, or organics) passivates the chips
```

Beyond those limits an active system -- pH monitoring with caustic dosing -- is required, with the reagent supply,
the calibration, and the maintenance that entails.

**And the materials, which run the whole length.** Acid waste piping is a specified material from the fixture to
the tank, and everything downstream until the waste is neutralized. Ordinary drainage material in that line fails,
and it fails buried in a floor slab where replacing it means opening the building.

## 4. Scope and non-goals

A volume calculation. The required retention time, the acceptable discharge pH range, the monitoring and
reporting obligations, and whether passive neutralization is acceptable at all are set by the local sewer
authority's pretreatment requirements and by the plumbing code, and those govern. It does not determine the design
flow or the credible slug discharge, which come from the fixture count and from the processes served. It does not
size an active dosing system, address reagent selection and storage, or evaluate the mixing that a neutralization
tank requires to work. It does not address the waste's composition beyond pH: metals, solvents, and other
constituents have their own discharge limits and may require entirely different treatment, and a neutralization
tank does not remove them. It does not address piping material selection, venting, or the separate drainage system
that acid waste requires. The local sewer authority's pretreatment program, the adopted plumbing code, and the
design engineer govern.
