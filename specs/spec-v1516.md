# roughlogic.com Specification v1516 -- Dust Deflagration Vent Area (NFPA 68) (`calc-mining.js`, Group E Carpentry and Construction, industrial ventilation, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A combustible dust collector without explosion protection is a pressure vessel waiting for an ignition source, and the vent area that keeps it from becoming a fragmentation hazard scales with the enclosure volume and the dust's Kst. This is a life-safety number, and the first honest output is whether the dust is combustible at all.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive enclosure volume, Kst, reduced pressure, or static activation pressure, or a reduced pressure at or below the static activation pressure returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): NFPA 68, NFPA 69, and NFPA 652 by name with the Kst dust classification, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`dust explosion vent area`, `nfpa 68 venting`, `kst dust deflagration`, `combustible dust collector vent`, `deflagration vent sizing`.

## 2. The tile

### 2.1 `dust-deflagration-vent-area` -- Dust Deflagration Vent Area (NFPA 68)

```
vent area      A_v from the NFPA 68 relation in volume, Kst, P_red, and P_stat
scaling         A_v grows with V^0.75 and with Kst; falls as P_red rises
dust class      St1 Kst <= 200, St2 200 to 300, St3 > 300 bar-m/s
P_red           the reduced pressure the enclosure must withstand -- an ENCLOSURE property
first question  has the dust been tested? Kst and MIE come from a lab, not a table
```

Venting works by opening a large enough hole fast enough that the pressure inside never exceeds what the
enclosure can hold. Three quantities set it: how big the enclosure is, how violently the dust burns (Kst), and
how much pressure the enclosure can take (P_red). The last is the one people get wrong -- a standard dust
collector housing may hold only 1 to 2 psig, and a low P_red demands a very large vent, which is often why an
existing collector cannot be vented adequately and needs suppression or isolation instead.

The honest first output is upstream of the arithmetic. A dust's Kst and minimum ignition energy come from
laboratory testing of a sample of the ACTUAL dust; published values for "wood dust" or "aluminium" span a range
wide enough to change the answer by a factor of two. A facility that has not tested its dust does not know
whether it has a combustible dust hazard, and NFPA 652 requires a dust hazard analysis to establish exactly
that. The tile says so before it says anything else.

**Inputs:** enclosure volume, dust Kst and Pmax from testing, the enclosure reduced-pressure strength, the vent panel static activation pressure, and the enclosure length-to-diameter ratio

**Outputs:** the dust class from Kst, the required vent area, the vent area as a fraction of the enclosure surface, the effect of a higher enclosure strength on the requirement, and a flag when the required area exceeds what the enclosure geometry can provide

## 3. Worked example

A 3,500 cu ft dust collector, dust tested at Kst 150 bar-m/s (St1), enclosure rated P_red 1.5 psig,
vent panels opening at 0.5 psig:

```
dust class = St1 (Kst 150 <= 200)
```

The NFPA 68 relation for these inputs calls for a vent area in the range of tens of square feet -- a large
fraction of one entire face of the collector. That is the usual and important finding: **a low P_red demands an
impractically large vent**, and the design responses are to build a stronger enclosure (raising P_red to 5 psig
cuts the requirement substantially), to use suppression instead of venting, or to relocate the collector outdoors
where venting to a safe location is possible.

The other half is isolation. Venting the collector does nothing about the flame front travelling back up the duct
into the building, and NFPA 69 isolation -- a chemical barrier, a rotary valve, or a back-blast damper -- is a
separate and equally mandatory requirement that no vent area substitutes for.

## 4. Scope and non-goals

A screening calculation only. Deflagration venting is a life-safety design that must be performed by a
qualified engineer to the current edition of NFPA 68, using tested Kst and Pmax values for the actual dust,
accounting for vent panel inertia, duct length on the vent, enclosure length-to-diameter ratio, and the safe
discharge location -- none of which this tile evaluates in full. It does not address flame-front isolation
(NFPA 69), which is separately required; ignition source control; housekeeping and fugitive dust accumulation,
which is what actually causes secondary explosions and which kills far more people than the primary event; or the
dust hazard analysis that NFPA 652 requires and that must precede all of this. A facility with combustible dust
and no DHA has a compliance and safety gap this tile cannot close. NFPA 652, 68, 69, and a qualified engineer
govern.
