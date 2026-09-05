# roughlogic.com Specification v1741 -- Drone Flight GSD, Overlap, and Image Count (`calc-survey.js`, Group P Field, Backcountry, and SAR, mapping, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-survey.js`**
> (Group P, Field, Backcountry, and SAR -- the existing category, hub `/groups/field/`; mapping, drone, and earthwork), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A drone mapping flight is planned around three numbers: how much detail each pixel covers, how much the photos overlap, and how many that takes. Ground sample distance comes off the altitude and the camera, and overlap is what makes the photogrammetry work at all.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive flight height, focal length, or sensor pixel pitch, or an overlap outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ground sample distance relation and overlap requirements with 14 CFR Part 107 named for flight operations, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`drone gsd calculation`, `photogrammetry overlap`, `flight planning image count`, `ground sample distance drone`, `ground control accuracy drone`.

## 2. The tile

### 2.1 `drone-gsd-overlap` -- Drone Flight GSD, Overlap, and Image Count

```
ground sample distance  GSD = flight height x sensor pixel pitch / focal length
                        the ground distance one pixel covers
overlap                 forward (along track) and side (between lines)
                        commonly 75 to 80% forward and 65 to 70% side for mapping
                        higher over vegetation, water, and uniform surfaces
image footprint         from the GSD and the sensor pixel dimensions
line spacing            footprint width x (1 - side overlap)
image count             area / (effective area per image)
accuracy                GSD sets resolution; ACCURACY comes from ground control
```

Overlap is what people underestimate and it is not a safety margin -- it is the mechanism. Photogrammetry
reconstructs geometry by matching features seen from multiple positions, so every point on the ground has to
appear in several images from meaningfully different angles. At 60 percent overlap a point appears in two or three
images and the reconstruction is weak; at 80 percent it appears in five or more and the solution is
well-constrained. Over vegetation, water, sand, or fresh concrete -- surfaces with few distinct features -- the
matching is harder still and the overlap goes higher.

The distinction between resolution and accuracy is the one that causes disputes. GSD is how much ground each
pixel covers, and it is set by altitude and camera; accuracy is how closely the model matches real-world
coordinates, and it comes from ground control points surveyed by conventional means or from a properly configured
RTK or PPK system. A survey flown at a 1 cm GSD with no ground control can have errors of metres, and a deliverable
quoting GSD as though it were accuracy is misrepresenting it.

The image count follows from the geometry and it drives everything downstream: flight time, battery swaps, and
processing time, which scales worse than linearly with image count. Halving the GSD quadruples the images, which
is why flying lower for detail is expensive in ways beyond the flight itself.

**Inputs:** the flight height above ground, the camera focal length and sensor pixel pitch and dimensions, the forward and side overlap, the survey area, the flight speed, and the ground control arrangement

**Outputs:** the ground sample distance, the image footprint on the ground, the line spacing and the shutter interval, the image count for the entered area, the flight time and battery count, and the effect on all of them of halving the GSD

## 3. Worked example

A camera with a 24 mm lens and a 1.38 micrometre pixel pitch, flown at 400 ft (122 m):

```
GSD = 122 m x 1.38e-6 m / 0.024 m = 0.70 cm/pixel
```

About 0.7 cm per pixel.

**Now halve the GSD** by flying at half the height:

```
GSD  = 0.35 cm/pixel
images = 4 times as many, because both the along-track and cross-track footprints halve
flight time, battery swaps, and processing all scale with it -- processing worse than linearly
```

**Four times the images for twice the detail.** That is the cost of flying lower, and it is worth knowing before
promising a GSD.

**Overlap is the mechanism, not a margin.** At 80 percent forward and 70 percent side, every ground point appears
in five or more images from different angles and the reconstruction is well-constrained. Drop to 60 and 40 and
points appear in two or three, the solution weakens, and the result has holes and warping -- particularly over
vegetation, water, sand, and fresh concrete, which have few distinct features to match and which is exactly where
overlap should have been INCREASED rather than reduced.

**And the distinction that causes disputes: GSD is resolution, not accuracy.** A flight at 0.7 cm
GSD with no ground control can have absolute errors of metres. Accuracy comes from ground control points
surveyed conventionally, or from a properly configured RTK or PPK workflow with a validated base -- and a
deliverable that quotes GSD where the client asked for accuracy has answered a different question.

## 4. Scope and non-goals

A flight planning calculation. It does not establish accuracy, which requires ground control or a validated
RTK/PPK workflow and which is verified with independent check points -- GSD is resolution and the two are
routinely conflated in deliverables. It does not address camera calibration, lens distortion, rolling shutter
effects at speed, or the motion blur that a slow shutter over ground speed produces, all of which degrade a
result the geometry says should be good. It does not address terrain, which changes the height above ground and
therefore the GSD across a site, or the terrain-following flight planning that compensates. It does not address
the flight authorization, airspace, remote pilot certification, and operating rules that apply -- 14 CFR Part 107
in the United States -- or the site-specific permissions a survey may require. 14 CFR Part 107, the applicable
accuracy standard for the deliverable, and a qualified surveyor where the product is a survey govern.
