# roughlogic.com Specification v1543 -- Track Cross-Level, Warp, and FRA Class Limits (`calc-rail.js`, Group E Carpentry and Construction, railroad track, 1 New Tile)

> **Status: LANDED 2026-09-05. Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rail.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; railroad track and equipment), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Track geometry is regulated by class, and the parameter that causes most derailments is not gauge or surface alone but WARP -- a twist in the track over a short distance. It is a difference of cross-levels, and a track inspector needs the limit for the class in front of them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive measurement distance, or a class outside the defined range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the cross-level and warp definitions with 49 CFR 213 track classes named as the source of limits, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`track warp limit`, `fra track class geometry`, `cross level twist rail`, `62 foot warp measurement`, `track geometry defect limit`.

## 2. The tile

### 2.1 `track-warp-fra-class` -- Track Cross-Level, Warp, and FRA Class Limits

```
cross level     the elevation difference between the two rails at a point
warp (twist)    the change in cross level between two points a stated distance apart
                commonly measured over 31 ft and over 62 ft
FRA classes     limits tighten as class (and permitted speed) rises
                Class 1 is the loosest; Class 5 the tightest
deviation       measured against the DESIGNED cross level on a curve, not against zero
```

Warp is a twist, and a twist unloads a wheel. A rigid truck bridging a section of track that rises on one rail
and falls on the other has one wheel carrying much less than its share, and a lightly loaded wheel on a curve
with lateral force is the wheel that climbs. That is the derailment mechanism, and it is why warp limits tighten
faster with class than most other parameters.

The measurement detail that matters is the reference. On a curve the track is SUPPOSED to have cross level -- that
is the superelevation -- so warp is the deviation from the designed elevation profile, not from level. Measuring
warp against zero on an elevated curve reads the elevation itself as a defect and produces nonsense. Equally,
elevation being run in through a spiral is a designed and continuous change of cross level, which is why the
runoff rate through a spiral has its own separate limit.

For field use the tile wants the fewest possible inputs: two cross-level readings, the distance between them, the
designed elevation at each, and the class. That is what an inspector has on a track chart and a level board.

**Inputs:** cross level measured at two points, the distance between them, the designed cross level at each point, the FRA class of track, and the applicable warp limit for that class and distance

**Outputs:** the measured cross level deviation at each point, the warp over the entered distance, the applicable limit for the class, a pass or fail with the margin, and the highest class the measured warp would satisfy

## 3. Worked example

Two cross-level readings 62 ft apart on a curve with 4 in of designed elevation:

```
point A: measured 4.6 in, designed 4.0 in  -> deviation +0.6 in
point B: measured 3.2 in, designed 4.0 in  -> deviation -0.8 in
warp over 62 ft = 0.6 - (-0.8)             = 1.4 in
```

1.4 in of warp in 62 ft. Against the limits by class this is comfortable for the lowest classes and fails the
highest, so the reading itself sets a speed restriction: the track is good for whatever class permits 1.4 in and
must be slow-ordered below anything tighter.

The reference point is the whole exercise. Measured against ZERO instead of against the designed 4 in elevation,
the same readings would have given `4.6 - 3.2` = 1.4 in as well in this case -- but on a spiral, where the designed
elevation is changing between the two points, measuring against zero would report the intended runoff as a
defect. On a 4 in elevation running off over 200 ft, that is 1.24 in of designed change in 62 ft being read as
warp that is not there.

## 4. Scope and non-goals

A warp calculation from readings the user supplies. It does not ship the FRA limit tables, which are set by
class and by parameter in 49 CFR 213 and which the adopted regulation governs; the limits must be entered. It
does not evaluate the other geometry parameters -- gauge, alignment, surface, and the combinations of them -- each
of which has its own limits and any of which can independently restrict speed, and it does not evaluate the
special limits that apply within a specified distance of a joint, on a bridge, or through a turnout. It does not
address the qualification and frequency requirements for track inspection, the recording of exceptions, or the
remedial action a defect requires, all of which are regulatory obligations rather than calculations. Track
geometry defects are a derailment hazard: the FRA Track Safety Standards at 49 CFR 213, the qualified track
inspector, and the track owner govern.
