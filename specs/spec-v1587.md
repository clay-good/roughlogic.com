# roughlogic.com Specification v1587 -- Log Truck Payload and Scaled Weight (`calc-sawmill.js`, Group L Agriculture and Forestry, sawmill, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-sawmill.js`**
> (Group L, Agriculture and Forestry -- the existing category, hub `/groups/agriculture/`; sawmill and forest products), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A log truck is legal on weight and paid on scale, and the two do not measure the same thing. Loading to the legal gross without knowing the tare and the wood's green density is how a truck arrives overweight, and green weight per thousand board feet swings enormously by species and season.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive gross weight limit or tare weight, a tare at or above the gross limit, or a non-positive weight per thousand board feet returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the payload relation with the federal bridge formula and FMCSA log securement requirements named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`log truck payload`, `legal load log truck`, `green weight per mbf`, `log load scale weight`, `how many mbf per load`.

## 2. The tile

### 2.1 `log-truck-payload` -- Log Truck Payload and Scaled Weight

```
payload         = legal gross weight - tare weight
weight per MBF   varies by species and moisture: green softwood roughly 8,000 to 12,000 lb/MBF,
                 green hardwood 10,000 to 14,000 lb/MBF
loads per MBF    payload / weight per MBF = MBF per load
axle limits      the governing limit is often an AXLE group, not the gross
seasonal         green weight falls as logs dry in the yard; winter wood is heavier
```

The gross weight limit is the one everyone quotes and the axle limits are the ones that actually catch trucks.
A load within the legal gross can still be over on a tandem or a bridge-formula group if it is placed wrong, and
weight distribution on a log load is set by where the butt ends sit -- which is a loader decision made in seconds
(`axle-load-distribution` covers the distribution itself).

The variable that makes this a calculation rather than a lookup is green weight per thousand board feet. It moves
with species, with the season, and with how long the logs have been decked: freshly felled winter hardwood can be
half again the weight of the same volume of summer-decked softwood. A trucker loading by habit on a mixed-species
job is guessing, and the penalty for guessing high is a citation and an off-load at the roadside.

The useful field form is the inversion: given the tare and the legal gross, how many thousand board feet of THIS
wood constitutes a legal load -- a number the loader operator can work to directly.

**Inputs:** legal gross weight, truck and trailer tare, species and green weight per thousand board feet, the axle group limits, and the scaled volume of the load

**Outputs:** the available payload, the volume that constitutes a legal load, the load weight for a stated volume, the margin against the gross limit, and the payload change for an alternative species or seasoning condition

## 3. Worked example

An 80,000 lb legal gross with a 32,000 lb tare:

```
payload = 80,000 - 32,000 = 48,000 lb
```

On green Douglas-fir at 10,500 lb per thousand board feet:

```
legal load = 48,000 / 10,500 = 4.57 MBF
```

4.57 thousand board feet. Now the same truck on green red oak at 13,000 lb/MBF:

```
legal load = 48,000 / 13,000 = 3.69 MBF
```

**0.88 MBF less**, on the same truck, on the same road, because the wood is heavier. A loader
working to a habitual stake height rather than to a weight will put the oak load over by roughly
11,429 lb.

Seasoning cuts the other way: the same oak decked through a dry summer might come down to 11,000 lb/MBF, which
takes the legal load back up to 4.36 MBF. A mill scaling loads that vary this much without tracking
species and deck time is not going to reconcile its wood.

## 4. Scope and non-goals

A payload subtraction. It does not address axle group limits or the federal bridge formula, which frequently
govern below the gross limit and which depend on axle spacing and load placement rather than total weight; a load
legal on gross can be illegal on a group. It does not address state and local variations in legal gross, permit
loads, seasonal frost-law reductions, or the reduced limits that apply on many forest and county roads. Green
weight per thousand board feet is highly variable and the figures used are broad ranges -- a mill's or a region's
own measured conversion is far better. It does not address load securement, which is a separate regulated matter
with its own requirements for log loads specifically. The applicable state and federal weight limits, the bridge
formula, FMCSA securement requirements for logs, and the scaling rule in use govern.
