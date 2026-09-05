# roughlogic.com Specification v1738 -- Groundwater Seepage Velocity and Travel Time (`calc-drainage.js`, Group M Water and Wastewater Operations, groundwater, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`**
> (Group M, Water and Wastewater Operations -- the existing category, hub `/groups/water/`; groundwater and stormwater), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Groundwater moves far more slowly than surface water, and how fast decides whether a contaminant reaches a well in years or decades. The seepage velocity is Darcy's law divided by porosity, and the division by porosity is the step people leave out.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive hydraulic conductivity, gradient, or effective porosity, or an effective porosity above one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Darcy and seepage velocity relations with the effective porosity distinction, and a qualified hydrogeologist named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`groundwater seepage velocity`, `darcy velocity versus seepage`, `contaminant travel time groundwater`, `effective porosity flow`, `retardation factor contaminant`.

## 2. The tile

### 2.1 `seepage-travel-time` -- Groundwater Seepage Velocity and Travel Time

```
Darcy velocity     q = K i     (hydraulic conductivity times gradient)
seepage velocity   v = K i / n_e     (divided by EFFECTIVE porosity)
                   this is the actual water particle velocity
travel time        t = distance / v
gradient           i = head difference / flow path length
effective porosity the fraction of pore space that actually conducts flow; less than
                   total porosity, and much less in clay
retardation        a sorbing contaminant travels slower than the water; a conservative
                   tracer travels at the water velocity
```

The porosity division is what separates the two velocities and it is a factor of three to five in most
materials. Darcy velocity is a flux -- volume per unit total area -- and water does not flow through the solid
grains, so the actual particle velocity through the pores is that flux divided by the fraction of area that is
pore. Using Darcy velocity as a travel velocity understates the travel time by that factor, and in a
contamination problem that is the difference between an urgent response and a monitoring programme.

Effective porosity rather than total porosity is the correct denominator and the distinction matters most in
fine-grained material. Clay has a high total porosity and a very low effective porosity, because most of its pore
water is bound and does not participate in flow -- so a clay layer that looks porous conducts very little and
what it conducts moves slowly.

Retardation is the other half of a contaminant problem. A dissolved compound that sorbs to the aquifer solids
travels more slowly than the water itself, by a retardation factor that depends on the compound and the material
-- so the water's travel time is the FASTEST any contaminant moves, and a conservative tracer is what actually
travels at the seepage velocity. Chlorides and some solvents approach it; anything that sorbs strongly can be
orders of magnitude slower.

The heterogeneity caution outweighs all of the arithmetic: real aquifers have preferential pathways, and the
first arrival travels along the fastest one rather than at the average velocity.

**Inputs:** the hydraulic conductivity, the hydraulic gradient or the head difference and path length, the effective porosity, the travel distance, and the retardation factor for the contaminant

**Outputs:** the Darcy velocity, the seepage velocity, the travel time over the entered distance, the travel time for a retarded contaminant, the distance travelled in a stated time, and the Darcy-based travel time for comparison to show the porosity error

## 3. Worked example

An aquifer with a hydraulic conductivity of 25 ft/day, a gradient of 0.004, and an effective porosity of
0.28:

```
Darcy velocity   q = 25 x 0.004 = 0.100 ft/day
seepage velocity v = 0.100 / 0.28 = 0.357 ft/day
```

**0.357 ft/day, not 0.100.** Over a 500 ft travel distance:

```
using seepage velocity: 500 / 0.357 = 1,400 days = 3.8 years
using Darcy velocity:   500 / 0.100 = 5,000 days = 13.7 years
```

**3.8 years against 13.7** -- the porosity division is a factor of
0.3, and omitting it says a plume takes 13.7 years to reach a receptor that it
actually reaches in 3.8. That is the difference between an urgent response and a monitoring plan, in
the wrong direction.

**Retardation.** A compound with a retardation factor of 3 travels at a third of the water velocity, so its
travel time is `3.8 x 3` = 11.5 years. The water's travel time is therefore the FASTEST
anything moves, and a conservative tracer -- chloride, say -- is what actually arrives at that time.

**And the caveat that outweighs the arithmetic.** Real aquifers are heterogeneous, and the first arrival travels
along the most conductive pathway rather than at the average velocity. A calculated 3.8 year travel
time can see first detection in a fraction of it through a sand lens or a fracture, which is why monitoring well
placement and a real site characterization matter more than the calculation does.

## 4. Scope and non-goals

A one-dimensional advective travel time. It ignores dispersion, which spreads a plume and produces first
arrival earlier than the advective travel time, and it ignores heterogeneity, which is the dominant factor at
most real sites -- preferential pathways deliver contamination far faster than an average velocity predicts. It
does not address diffusion, degradation, volatilization, or the multi-phase behaviour of a non-aqueous phase
liquid, which does not travel with the water at all. Effective porosity and hydraulic conductivity must come from
site data; hydraulic conductivity spans orders of magnitude between materials and can vary by an order of
magnitude within a single unit. It does not perform contaminant fate and transport modelling, delineate a plume,
or establish a capture zone, all of which require site characterization and modelling. A qualified hydrogeologist
and the applicable state environmental agency govern.
