# roughlogic.com Specification v1743 -- RTK Baseline Error Budget and Vertical Uncertainty (`calc-survey.js`, Group P Field, Backcountry, and SAR, mapping, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-survey.js`**
> (Group P, Field, Backcountry, and SAR -- the existing category, hub `/groups/field/`; mapping, drone, and earthwork), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An RTK position is only as good as its baseline, its base station, and its fix, and the error grows with distance from the base. Vertical is roughly twice the horizontal error, which is the part that surprises people using RTK for elevations.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive baseline length or error component, or a solution status other than fixed for survey-grade work returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the RTK error budget convention and the base position dependency with the licensed surveyor named as governing surveys of record, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`rtk error budget`, `baseline ppm error gnss`, `rtk vertical accuracy`, `base station position error`, `fixed versus float solution`.

## 2. The tile

### 2.1 `rtk-error-budget` -- RTK Baseline Error Budget and Vertical Uncertainty

```
baseline error     grows with distance from the base, roughly 1 ppm of baseline
                   plus a fixed instrument component
typical            8 mm + 1 ppm horizontal, 15 mm + 1 ppm vertical for a good receiver
vertical           roughly twice the horizontal, because satellite geometry is poor
                   in the vertical direction -- there are no satellites below
base position      an error in the base position translates DIRECTLY into every rover
                   position; an autonomous base carries metres of error
fixed versus float a float solution is not survey grade; only a fixed integer solution is
check             occupy a known point at the start and end of every session
```

The base position error is the one that produces the largest failures and it is invisible in the field. An RTK
rover's coordinates are relative to its base, so a base set on an autonomous (single-point) position carries that
base's error -- which can be metres -- into every observation of the session. The rover reports centimetre
precision throughout, because precision relative to a wrong base is still precision. The work is internally
consistent and absolutely wrong, and it is discovered when it is joined to other data.

The vertical factor of two is geometric. Satellites are distributed above the receiver and there are none below,
so the vertical component of the solution is always weaker than the horizontal -- and RTK elevations are
correspondingly less certain. For a survey where elevation matters, and especially for anything approaching the
accuracy of conventional levelling, that difference is decisive.

The fixed-versus-float distinction is binary rather than gradual. A fixed solution has resolved the carrier phase
ambiguities to integers and is centimetre-level; a float solution has not and is decimetre-level or worse.
Equipment reports which it has, and accepting float observations because the fix is slow to come is how
decimetre errors get into a survey that reports centimetres.

Occupying a known point at the start and end of a session is the check that catches all of this: a wrong base, a
wrong antenna height, a wrong datum, and a session that drifted all show up as a discrepancy on a known point,
and none of them shows up any other way.

**Inputs:** the baseline length, the receiver horizontal and vertical error specification, the base station position source and its own uncertainty, the solution status, and the check point results

**Outputs:** the horizontal and vertical error at the entered baseline, the total error including a stated base position uncertainty, the baseline at which a target accuracy is exceeded, the vertical-to-horizontal ratio, and a flag where the solution is float or the base position is autonomous

## 3. Worked example

A receiver specified at 8 mm + 1 ppm horizontal and 15 mm + 1 ppm vertical, on a 10 km baseline:

```
horizontal = 8 mm + 10,000 m x 1e-6 = 8 + 10 = 18 mm
vertical   = 15 mm + 10 mm          = 25 mm
```

**{25/18:.1f} times the error vertically** -- and that ratio holds at every baseline, because satellites are all
above the receiver and none below. RTK elevations are the weak component, and a job where elevation drives the
result should know that before it relies on them.

**Now the failure that dwarfs both.** If the base was set on an autonomous position rather than on a known
control point, its own coordinate can be off by a metre or more -- and **every rover observation of the session
inherits that error exactly**:

```
receiver precision  18 mm horizontal
base position error 1,500 mm
total absolute error ~ 1,500 mm
```

The rover reported centimetres all day and the survey is a metre and a half from where it says it is. The work is
internally consistent -- distances and relationships within the session are correct -- which is exactly what makes
it convincing until it is joined to other data.

**Fixed versus float** is the other binary. A float solution is decimetre-level. Accepting float shots because
the fix is slow to come puts decimetre errors into a survey reporting centimetres, and the equipment says which
it has.

**The check that catches all of it**: occupy a known point at the start and the end of every session. A wrong
base, a wrong antenna height, a wrong datum, and a drifted session all appear as a discrepancy there -- and none
of them appears anywhere else.

## 4. Scope and non-goals

An error budget from specifications the user supplies. Manufacturer accuracy specifications are stated under
defined conditions -- open sky, good satellite geometry, adequate observation time -- and real accuracy degrades
with multipath, obstruction, ionospheric activity, and poor geometry in ways this budget does not model. It does
not address the base station's own coordinate quality, which is the dominant error source when it is wrong and
which comes from the control it was set on. It does not address datum, epoch, and geoid model selection, which
introduce errors far larger than the receiver's if they are mismatched, or the conversion between ellipsoid and
orthometric heights. It does not substitute for the check-point observations and the redundancy that a
professional survey requires. For any survey of record, state licensure requirements apply and the standards of
practice for the jurisdiction, the applicable accuracy standard, and a licensed land surveyor govern.
