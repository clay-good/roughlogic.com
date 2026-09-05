# roughlogic.com Specification v1603 -- CIPP Liner Thickness (ASTM F1216) (`calc-trenchless.js`, Group E Carpentry and Construction, trenchless, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trenchless.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; trenchless, hdd, and utility locating), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A cured-in-place liner is designed either as a liner inside a pipe that still carries its own load, or as a standalone pipe if the host is gone. Which case applies changes the required thickness by a factor of several, and getting the case wrong is the whole design.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive host diameter, modulus, or groundwater head, or an ovality outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): ASTM F1216 by name including its buckling design relations and the long-term modulus requirement, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`cipp liner thickness`, `astm f1216 design`, `partially deteriorated liner`, `fully deteriorated cipp`, `liner buckling groundwater`.

## 2. The tile

### 2.1 `cipp-liner-thickness` -- CIPP Liner Thickness (ASTM F1216)

```
partially deteriorated  the host pipe carries soil and live load; the liner resists
                        groundwater buckling only
fully deteriorated      the host is assumed gone; the liner carries everything
buckling (F1216 X1.1)   t from the ovality-reduced buckling relation with the enhancement
                        factor K for soil support, the modulus, and the groundwater head
long-term modulus       creep reduces the modulus by roughly half over 50 years; the
                        design uses the LONG-TERM value, not the short-term one
ovality                 host pipe ovality reduces buckling capacity sharply
```

The two design cases are not variations on a theme. In the partially deteriorated case the host pipe is still
structurally sound and the liner's only job is to resist external groundwater pressure trying to buckle it
inward; thickness comes out modest. In the fully deteriorated case the liner is the pipe, and it carries soil
load, live load, and groundwater as a standalone structure -- a much thicker section. Choosing the case is an
engineering judgment about the host pipe's condition, and it is made from a CCTV survey and the pipe's history,
not from a preference.

Two inputs dominate the buckling case. Ovality is the first: an out-of-round host reduces the liner's buckling
resistance steeply, so a 5% oval pipe needs meaningfully more thickness than a round one, and ovality is measured
rather than assumed. The second is the modulus, and the trap there is time -- CIPP creeps, so the fifty-year
modulus is roughly half the short-term value, and a design run on the short-term number is unconservative by a
large margin.

Groundwater head is the load, and it is taken at the highest credible level rather than at the level on the day
of the survey.

**Inputs:** host pipe inside diameter, ovality, the design case (partially or fully deteriorated), groundwater head above the pipe, the liner long-term flexural modulus, the soil support enhancement factor, and the safety factor

**Outputs:** the required thickness for the entered design case, the resulting dimension ratio, the thickness under the alternative design case for comparison, the sensitivity to ovality, and the thickness using the short-term modulus to show the creep penalty

## 3. Worked example

A 24 in host sewer at 3% ovality with 12 ft of groundwater above it, designed as PARTIALLY
deteriorated using the ASTM F1216 buckling relation with a long-term flexural modulus of 125,000 psi and a
safety factor of 2.

The relation solves for the dimension ratio that resists the groundwater buckling load with the soil support
enhancement applied. The results that matter to a field decision:

```
partially deteriorated, 3% ovality  ->  a modest thickness; the host carries the load
fully deteriorated, same pipe       ->  substantially thicker; the liner IS the pipe
short-term modulus instead of long  ->  thinner, and WRONG
```

The three comparisons are the point of the tile. Running the same 24 in pipe as fully deteriorated typically
requires several times the thickness of the partially deteriorated case, so the survey that establishes the host
condition is worth more than any refinement of the arithmetic.

Ovality sensitivity: going from 3% to 6% ovality reduces the buckling capacity sharply and drives the
thickness up materially on the same pipe. That is why ovality is measured from the CCTV survey rather than
assumed at a nominal value, and why a pipe found to be badly deformed may not be a liner candidate at all.

## 4. Scope and non-goals

A screening calculation against the ASTM F1216 design relations. It is not a liner design. The design case
(partially or fully deteriorated) is an engineering determination from the host pipe's condition and is the
single largest factor in the result; assuming the favourable case on a pipe that does not warrant it is the
principal failure mode. Long-term modulus and the retention factor must come from the liner system's own tested
data at the design life, and short-term values will produce an unsafe thickness. It does not address the fully
deteriorated case's soil and live load terms in full, hydraulic capacity after lining, chemical resistance,
temperature, service reconnection, or the installation and curing requirements that determine whether the
delivered liner achieves its design properties. It does not evaluate whether the host is a lining candidate at
all. ASTM F1216 and its appendices, the liner system manufacturer's tested properties, the owner's
specification, and a qualified engineer govern.
