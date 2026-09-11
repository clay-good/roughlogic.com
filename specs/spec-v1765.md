# roughlogic.com Specification v1765 -- Pipeline CP Potential Attenuation from a Drain Point (`calc-corrosion.js`, Group E Carpentry and Construction, cathodic protection and corrosion control, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-corrosion.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Protection applied at one drain point does not arrive undiminished at the far end of a line. It decays exponentially with distance, and the decay constant depends on the coating -- which means the length a single rectifier can protect falls dramatically as the coating ages.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive diameter, wall thickness, resistivity, coating resistance, or distance, or a wall thickness at or above half the diameter returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the leaky-transmission-line attenuation relation with NACE / AMPP SP0169 practice and a field potential survey named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pipeline cp attenuation`, `drain point potential decay`, `coating resistance attenuation constant`, `cp reach between rectifiers`, `characteristic resistance pipeline`.

## 2. The tile

### 2.1 `pipeline-potential-attenuation` -- Pipeline CP Potential Attenuation from a Drain Point

```
the model        a coated pipeline behaves as a leaky transmission line: potential
                 shift decays as E(x) = E_0 x exp(-alpha x)
longitudinal     R_L = steel resistivity / wall cross-section, in ohms per foot --
                 a very small number, but it is the numerator
leakage          R_G = coating resistance (ohm-sq ft) / pipe surface per foot, in
                 ohm-feet -- a very large number for good coating
attenuation      alpha = sqrt(R_L / R_G) per foot
characteristic   R_k = sqrt(R_L x R_G), the resistance the drain point sees looking
                 down an effectively infinite line
the sensitivity  alpha goes as the SQUARE ROOT of 1/coating resistance, so a coating
                 ten times worse attenuates about three times faster
spacing          rectifier spacing is chosen so the far end still holds criterion
                 (`instant-off-ir-drop`, `polarization-decay-criterion`)
```

A well-coated pipeline is an extraordinarily good conductor surrounded by an extraordinarily good insulator,
and that combination is what lets one rectifier protect tens of miles. Current injected at the drain point
runs along the steel with almost no loss and leaks to earth only where the coating allows it, so the potential
shift persists far down the line. Everything about cathodic protection economics follows from that ratio.

Degrade the coating and the economics invert. Leakage resistance falls, the attenuation constant rises with
its square root, and the reach of a drain point contracts. A line that one rectifier protected when it was
built may need three or four when the coating has aged, and the discovery is usually made from the far-end
test stations rather than from the rectifier, which shows nothing wrong because it is still delivering current
happily -- into the near end of the line.

The square root is the merciful part of an otherwise unforgiving relation. Coating resistance in service
spans orders of magnitude between a new fusion-bonded epoxy and a degraded coal-tar wrap, and if the reach
scaled with that directly the practice would be impossible to plan. As it is, a hundredfold coating
degradation costs a factor of ten in reach -- still severe, but a number a designer can work with.

**Inputs:** the pipe outside diameter and wall thickness, the steel resistivity, the coating resistance in ohm-square feet, the drain point potential shift, the distance of interest, and optionally a degraded coating resistance for comparison

**Outputs:** the longitudinal resistance per foot, the leakage resistance per foot, the attenuation constant, the characteristic resistance at the drain point, the potential shift remaining at the entered distance, the same figure for the degraded coating, and the distance at which the shift has halved for each

## 3. Worked example

A 12.75 in outside diameter line with a 0.25 in wall, coated at 100,000 ohm-sq ft:

```
steel area = pi/4 x (12.75^2 - 12.25^2) = 9.817 sq in
R_L        = 7.087e-06 ohm-in / 9.817 = 8.662e-06 ohms per foot
surface    = pi x 12.75 / 12 = 3.338 sq ft per foot
R_G        = 100,000 / 3.338 = 29,959 ohm-feet
alpha      = sqrt(8.662e-06 / 29,959) = 1.700e-05 per foot
R_k        = sqrt(8.662e-06 x 29,959) = 0.5094 ohms
```

**A 1.0 V shift at the drain point still reads 0.407 V at 10 miles** -- 41 percent of it survives 52,800 ft of
pipe. That is why a single rectifier can hold a long, well-coated line, and the half-shift distance is
8 miles.

**Now age the coating to 10,000 ohm-sq ft, a tenfold degradation:**

```
R_G   = 2,996 ohm-feet
alpha = 5.377e-05 per foot
```

**The same 1.0 V drain point now delivers 0.058 V at 10 miles -- 5.8 percent.** Protection that was
comfortable at the far end has effectively vanished, and the half-shift distance has contracted from
8 miles to 2.4 miles.

**Note the shape of the sensitivity.** The coating got 10 times worse and the attenuation constant rose by
3.16 -- **the square root, not the tenfold.** That is the one forgiving feature of the relation, and it is
what makes rectifier spacing plannable at all. The reach still fell by a factor of 3.2.

**The rectifier will not tell you this is happening.** It is still delivering current into a near end that is
now leaking it all locally. **The far-end test stations are where the coating's condition is visible**, which
is the argument for reading them rather than trusting the drain point.

## 4. Scope and non-goals

A first-order attenuation model. Real pipelines are not uniform: coating condition varies along the line, holidays are discrete rather than smeared, casings, foreign crossings, river weights, and bonded appurtenances all perturb the profile, and a single attenuation constant averages over all of it. It assumes a semi-infinite line with one drain point; a line with rectifiers at both ends, or with insulating joints, superposes differently. It does not establish coating resistance, which is the dominant input and which is inferred from field measurements rather than specified -- a manufacturer's laboratory figure bears little relation to an in-service one. It does not evaluate whether the resulting potential meets a protection criterion (`instant-off-ir-drop`, `polarization-decay-criterion`), size the rectifier (`cp-rectifier-sizing`), or address telluric currents, dynamic stray current, or AC interference (`ac-induced-voltage-pipeline`). NACE / AMPP SP0169 practice, a close-interval survey (`close-interval-survey-readings`), and a qualified corrosion engineer govern.
