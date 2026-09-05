# roughlogic.com Specification v1667 -- Radiography Restricted-Area Boundary Distance (`calc-inspection.js`, Group E Carpentry and Construction, welding inspection, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-inspection.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; welding inspection and ndt), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** The restricted area around a radiography shot is set by dose rate, and dose rate follows the inverse square law -- so the boundary distance for a given limit comes off the source activity in one step. Getting it right is a regulatory obligation and getting it wrong exposes people.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive source activity, gamma constant, or dose rate limit returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the inverse square dose rate relation with 10 CFR Parts 20 and 34 and the radiation safety officer named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`radiography restricted area boundary`, `radiation dose rate distance`, `curie inverse square boundary`, `industrial radiography barrier`, `survey meter boundary radiography`.

## 2. The tile

### 2.1 `radiography-boundary` -- Radiography Restricted-Area Boundary Distance

```
dose rate         D = A x G / d^2     (A activity in curies, G the gamma constant,
                  d distance in feet, D in R/h or mR/h per the units used)
gamma constant    Ir-192 about 0.48 R/h per curie at 1 ft; Co-60 about 1.32
boundary distance d = sqrt( A x G / D_limit )
limits            the regulatory dose rate at the restricted area boundary and at the
                  unrestricted area boundary are different and both apply
shielding         collimators and shielding reduce the required distance substantially
                  in the directions they cover
survey            the boundary is established by SURVEY METER, not by calculation alone
```

The inverse square law makes the boundary distance scale with the square root of activity, which means a source
four times stronger needs only twice the distance -- and conversely that halving the boundary distance requires
quartering the activity or shielding to the equivalent. That relationship is what makes collimation so
valuable: a collimator that reduces the beam to a defined solid angle removes the boundary requirement in every
other direction, which on a congested site is the difference between a shot that can be taken and one that cannot.

Two limits apply and they are different. There is a dose rate that defines the boundary of the restricted area,
which the radiographer controls and posts, and a lower one at the boundary of areas accessible to the public --
and on a site with a fence line close to the work, the public limit governs and is much further out.

The regulatory point that overrides all of the arithmetic: the boundary is established by SURVEY, with a
calibrated meter, before and during the exposure. The calculation says roughly where to expect it and where to
start looking; the meter is what establishes it, because shielding, scatter, and geometry make the real field
different from the point-source ideal in every direction.

**Inputs:** source activity and isotope with its gamma constant, the restricted area and unrestricted area dose rate limits, any shielding or collimator attenuation, and the measured survey readings

**Outputs:** the dose rate at any stated distance, the distance to each dose rate limit, the boundary distance with a stated shielding attenuation applied, and the activity that would permit a stated boundary distance

## 3. Worked example

An 60 curie Ir-192 source, gamma constant 0.48 R/h per curie at 1 ft:

```
dose rate at 1 ft = 60 x 0.48 = 28.8 R/h
```

For a 2 mR/h boundary (0.002 R/h):

```
d = sqrt( 60 x 0.48 / 0.002 ) = sqrt(14,400) = 120 ft
```

**120 feet** of restricted-area boundary in every unshielded direction -- which on most job
sites is a large area to control.

The square root is what makes collimation worth so much. Halving the boundary to
60 ft requires reducing the effective activity by a factor of four, which a collimator
does in every direction outside the beam. A collimated shot might have a
120 ft boundary in the beam direction and a small fraction of that everywhere else.

The stricter limit: at the boundary of an area accessible to the public the permitted rate is lower, and the
distance correspondingly further. A site with an occupied building or a public road near the work is governed by
that number, not by the 2 mR/h figure.

**And the calculation is a starting point.** The boundary is established with a calibrated survey meter, before
and during the exposure, because scatter from surrounding structures and the actual shielding geometry make the
real field different from a point source in free air.

## 4. Scope and non-goals

A point-source dose rate calculation. It assumes an unshielded point source in free air with no scatter, which
is not a real job site: scatter from nearby structures, ground, and the workpiece raises the field in directions
the calculation does not predict, and shielding and collimation lower it in others. **The restricted area
boundary must be established and maintained by survey with a calibrated meter**, and the calculation does not
substitute for that. It does not address the many other regulatory obligations of industrial radiography: source
security and accountability, personnel dosimetry and monitoring, alarming ratemeters, source retrieval and
emergency procedures, posting and barricading, the two-person rule where required, and the radiographer's
individual certification. Industrial radiography sources have caused serious overexposures and fatalities. The
NRC or Agreement State licence conditions, 10 CFR Parts 20 and 34, the licensee's radiation protection program,
and the radiation safety officer govern.
