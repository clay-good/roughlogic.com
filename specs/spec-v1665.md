# roughlogic.com Specification v1665 -- Ultrasonic Thickness Velocity and Calibration (`calc-inspection.js`, Group E Carpentry and Construction, welding inspection, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-inspection.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; welding inspection and ndt), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An ultrasonic thickness gauge reports a distance computed from a time and a velocity, and the velocity is a property of the material. Set for steel and used on aluminium, the gauge reads confidently and wrongly -- and the error is large enough to condemn good material or pass thin material.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive velocity or transit time, or a calibration block thickness at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ultrasonic thickness relation and material velocities with SNT-TC-1A personnel qualification named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`ultrasonic thickness velocity`, `ut gauge calibration`, `wrong velocity setting ut`, `echo to echo coating`, `sound velocity steel aluminium`.

## 2. The tile

### 2.1 `ut-velocity-calibration` -- Ultrasonic Thickness Velocity and Calibration

```
thickness         t = v x time / 2      (the pulse travels there and back)
velocity          material specific: steel about 0.2320 in/us, aluminium 0.2490,
                  cast iron 0.1800 to 0.2200 depending on grade, stainless varies
calibration       on a known-thickness block of the SAME material
error             a wrong velocity scales the reading by the velocity ratio
coating           paint and coating add time; echo-to-echo mode ignores them
couplant          required; a poor couple gives no reading or a false one
```

The gauge measures time and multiplies by a velocity it was told. That makes velocity a setting rather than a
measurement, and a setting carried over from the last job scales every reading by the ratio of the two velocities.
Steel set on an aluminium gauge reads about 7 percent low; aluminium set on a steel gauge reads about 7 percent
high -- enough to matter on a corrosion survey where the accept-reject line is a few thousandths.

Cast iron is the worst case because its velocity varies with grade and with graphite structure, so a single
tabulated value can be off by more than 10 percent on a given casting. On cast iron, calibrating on a known
thickness of the ACTUAL part is the only reliable approach, and that is what a step wedge or a caliper-verified
edge is for.

Coating is the other systematic error. A paint film adds transit time and a single-echo reading includes it as
thickness, so a coated tank reads thicker than it is -- which on a corrosion survey is the unsafe direction.
Echo-to-echo measurement, which times between two back-wall echoes, ignores the coating entirely and is what a
survey on coated equipment should use.

**Inputs:** the material and its sound velocity, the measured transit time or gauge reading, the velocity the gauge is set to, the calibration block thickness, and whether the surface is coated

**Outputs:** the thickness from the entered velocity and time, the reading error if the gauge is set to a different material velocity, the corrected thickness, the velocity implied by a calibration block reading, and a coating error estimate for single-echo mode

## 3. Worked example

A gauge set for steel (0.232 in/us) reading a 45 microsecond round trip:

```
t = 0.232 x 45 / 2 = 5.2200 in
```

5.2200 in. Now the same reading on ALUMINIUM, whose velocity is 0.2490 in/us:

```
true thickness = 0.2490 x 45 / 2 = 5.6025 in
```

**The gauge reads 5.2200 in where the material is 5.6025 in** -- 6.8% low.
On a 0.500 in nominal wall that is 382 thousandths, which is the width of a whole
corrosion allowance.

The reverse is worse. A gauge set for aluminium and used on steel reads 7.3% HIGH, so a wall
thinned to 0.180 in reads 0.1932 in -- above a 0.190 in retirement limit, and the equipment stays in
service.

Coating: a 0.012 in paint film on a single-echo reading adds roughly its own transit-time equivalent to the
result, so a coated tank reads thick. Echo-to-echo mode removes it, and on any coated corrosion survey it is the
mode to use.

The rule that follows: **calibrate on a known thickness of the actual material**, and re-calibrate when the
material changes.

## 4. Scope and non-goals

A velocity conversion. It does not perform an inspection: ultrasonic thickness measurement requires appropriate
transducer selection, surface preparation, couplant, calibration on the actual material, and a qualified
operator, and readings can be defeated by internal laminations, corrosion morphology, scale, high temperature, or
poor coupling -- often by producing a plausible wrong number rather than no number. It does not address flaw
detection, which is a different technique with different calibration (angle beam, DAC or DGS curves, reference
reflectors) and is what finds weld discontinuities. It does not establish retirement thickness or corrosion rate,
which come from the applicable inspection code. Personnel qualification for NDT is governed by a written practice
to SNT-TC-1A or an equivalent. The applicable inspection code, the equipment manufacturer's procedures, the
employer's written practice, and a qualified NDT technician govern.
