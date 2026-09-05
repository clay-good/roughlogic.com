# roughlogic.com Specification v1742 -- LiDAR Point Density and Flight Line Spacing (`calc-survey.js`, Group P Field, Backcountry, and SAR, mapping, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-survey.js`**
> (Group P, Field, Backcountry, and SAR -- the existing category, hub `/groups/field/`; mapping, drone, and earthwork), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** LiDAR point density is what determines whether a survey resolves a feature, and it comes from the pulse rate, the scan geometry, and how fast the platform moves. Flying slower or lower raises it; both cost flight time, and the relationship is what a specification should be written against.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pulse rate, flight height, ground speed, or scan angle, or an overlap outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the point density relation and swath geometry with the applicable mapping accuracy standard named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`lidar point density`, `pulse rate swath ground speed`, `lidar flight line spacing`, `ground point density canopy`, `lidar accuracy versus density`.

## 2. The tile

### 2.1 `lidar-point-density` -- LiDAR Point Density and Flight Line Spacing

```
point density      points per square metre on the ground
                   density = pulse rate / (swath width x ground speed)
swath width        2 x flight height x tan(half the scan angle)
line spacing       swath width x (1 - side overlap)
overlap            15 to 30% between lines, to cover swath edges where the geometry
                   is worst
returns            multiple returns per pulse; vegetation penetration depends on them
density versus accuracy  density is sampling; accuracy comes from the sensor, the
                   IMU/GNSS trajectory, and boresight calibration
```

The density relation shows the three levers and their costs. Pulse rate is a sensor property and is what it is;
ground speed and altitude are the operator's, and both trade directly against flight time. Flying at half the
speed doubles the density and doubles the flight time; flying at half the height doubles the density along track
and halves the swath, which quadruples the flight lines -- so altitude is the more expensive lever, which is the
opposite of the intuition from photogrammetry where lower means better in one dimension.

Swath edges are where the geometry is worst. At the edge of a scan the pulse hits the ground at an oblique angle,
the footprint is elongated, and the accuracy degrades -- so side overlap is not just about coverage, it is about
having every part of the ground surveyed by the good part of some line's swath. A survey flown with no overlap
has its worst data along regular stripes.

Multiple returns are what make LiDAR work under vegetation and they are the reason it is specified for terrain
surveys where photogrammetry fails. A pulse that clips a leaf returns from the leaf and continues to the ground,
returning again -- so a single pulse can produce several points at different elevations, and the ground surface is
extracted from the last returns. Dense canopy still defeats it, and the ground point density under canopy can be
a fraction of the nominal.

Accuracy is separate from density in exactly the way it is for photogrammetry: dense wrong points are still
wrong, and accuracy comes from the trajectory solution and the calibration.

**Inputs:** the sensor pulse rate and scan angle, the flight height and ground speed, the side overlap, the survey area, and the vegetation condition

**Outputs:** the swath width, the line spacing, the point density at the entered parameters, the density at an alternative speed or height, the flight line count and total flight distance for the entered area, and the estimated ground point density under a stated canopy condition

## 3. Worked example

A sensor at 400 kHz pulse rate with a 60 degree total scan angle, flown at 120 m at 45 m/s:

```
swath width = 2 x 120 x tan(30 deg) = 2 x 120 x 0.577 = 138 m
density     = 400,000 / (138 x 45) = {400000/(138*45):.0f} points per sq m
```

About {400000/(138*45):.0f} points per square metre.

**The two levers and their costs:**

```
half the speed (22.5 m/s) -> {400000/(138*22.5):.0f} pts/sq m, and twice the flight time
half the height (60 m)    -> swath halves to 69 m, density {400000/(69*45):.0f} pts/sq m,
                             and FOUR times the flight lines
```

**Altitude is the expensive lever** -- halving it doubles the density and quadruples the lines, because the swath
narrows as well. Slowing down doubles the density for double the time. That is the opposite of the photogrammetry
intuition where flying lower is the natural move.

**Swath edges are the worst data.** At the edge of the 60 degree scan the pulse hits obliquely, the footprint
elongates, and accuracy degrades -- so the 20 to 30 percent side overlap exists so that every part of the ground
is covered by the good middle of some line, not merely covered.

**Under canopy the nominal density is not the ground density.** Multiple returns let pulses reach the ground
through gaps, but under dense conifer the ground point density can be a small fraction of the
{400000/(138*45):.0f} nominal -- and a terrain model built from those sparse ground points is correspondingly
coarser. Specifying a nominal density without specifying a GROUND point density under the actual vegetation is
specifying the wrong thing.

**And density is not accuracy.** The trajectory solution, the boresight calibration, and the control are what
make the points correct; the pulse rate only makes there be more of them.

## 4. Scope and non-goals

A flight planning calculation. Point density from this relation is a nominal average and real density varies
across the swath -- oscillating-mirror scanners concentrate points at the swath edges, rotating designs
distribute them differently -- so a specification should state where the density applies. It does not address
accuracy, which comes from the sensor, the GNSS and inertial trajectory solution, boresight calibration, and
ground control, and which is verified against independent check points. It does not address ground point density
under vegetation, which depends on canopy structure and on the sensor's ability to record multiple returns and
which is what actually matters for a terrain model. It does not address classification, filtering, or the
processing that turns a point cloud into a deliverable. It does not address flight operations and authorization.
The applicable accuracy standard for the deliverable, the sensor manufacturer's specifications, and a qualified
surveyor govern.
