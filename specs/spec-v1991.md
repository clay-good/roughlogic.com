# roughlogic.com Specification v1991 -- Work Zone Longitudinal Buffer Space and Activity Area Length (MUTCD 6B.06) (`calc-construction.js`, Group E Carpentry and Construction, civil, 1 New Tile)

> **Status: PROPOSED 2026-10-19. Single-tile spec.** Part of [scope-product-expansion](scope-product-expansion.md). In scope under the
> spec-v106 trades-only charter: Group E, the temporary traffic control bench in `calc-construction.js` beside
> `traffic-taper-length` and `advance-warning-sign-spacing`, no new dependency and no network call.
>
> **The gap.** `advance-warning-sign-spacing`'s own note says "buffer space, channelizing-device spacing, and flagger
> stations are not modeled", and `traffic-taper-length` ends at the taper. Between the taper and the work space the
> MUTCD puts a longitudinal buffer sized by stopping sight distance, and along the buffer and work space it spaces the
> drums at twice the speed. Those three numbers are the rest of a lane-closure layout, and the crew that sets the
> taper by the formula sets the buffer by habit.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry and the v18/v21 contract apply: a speed under 20 or
over 75 mph, a negative work-space length, or a downstream taper outside 50 to 100 ft returns `{ error }`. Citation:
MUTCD 11th Edition (FHWA, December 2023; public domain) Section 6B.06 paragraph 11 and Table 6B-2 (stopping sight
distance as a function of speed), Table 6B-3 (taper length criteria), Section 6K.01 paragraph 4 (device spacing), by
name and number, GOVERNANCE.general; the taper itself is `traffic-taper-length`. Aliases: `work zone buffer space
length`, `longitudinal buffer mutcd table 6B-2`, `stopping sight distance buffer lane closure`, `drum spacing in a
work zone 2 times speed`, `how long is the activity area lane closure`.

## 2. The tile

### 2.1 `work-zone-buffer-space` -- Work Zone Longitudinal Buffer Space and Activity Area Length (MUTCD 6B.06)

```
buffer            Table 6B-2 by speed (posted, off-peak 85th percentile, or anticipated):
                  20 mph 115 ft; 25 155; 30 200; 35 250; 40 305; 45 360; 50 425;
                  55 495; 60 570; 65 645; 70 730; 75 820. A speed between rows takes
                  the next higher row.
device spacing    tangent (buffer and work space): not more than 2 x speed, in feet;
                  taper: not more than 1 x speed (Section 6K.01)
devices           along the buffer: ceil(buffer / (2 S)) + 1; along the work space:
                  ceil(work / (2 S)); the taper's own count is traffic-taper-length's
downstream taper  50 ft minimum, 100 ft maximum (Table 6B-3), entered
activity area     buffer + work space + any downstream buffer; closure length from the
                  start of the merging taper = L (entered or from traffic-taper-length)
                  + buffer + work space + downstream taper
shadow vehicle    when used, only the area upstream of it is the buffer (6B.06 para 13):
                  the tile reports the buffer as the distance to the shadow vehicle
```

The buffer is the recovery space for a driver who missed the taper, and the manual sizes it as the distance a vehicle
needs to stop from the speed it is doing: 250 ft at 35 mph, 495 ft at 55. The buffer is optional in the manual's
language ("may be used") and required by most agencies' contracts, which is why the tile reports it as the manual's
value and says the agency's plan governs. Nothing goes in it: no equipment, no material, no workers.

Device spacing is the second number. Along the taper the drums go at one foot per mile per hour; along the buffer and
the work space, two feet per mile per hour, so a 55 mph closure has a drum every 110 ft through a 495 ft buffer, six
drums counting both ends. Where the channelizing line would lead traffic out of the intended space the devices are
extended two times the speed past the transition.

**Inputs:** the speed, the work-space length, the merging taper length (entered, or the reader runs
`traffic-taper-length`), the downstream taper, and whether a shadow vehicle sits in the closed lane and how far
upstream of the work space it is

**Outputs:** the buffer length, the device spacing on the tangent and the taper, the device count along the buffer and
the work space, the activity-area length, and the total closure length from the start of the merging taper to the end
of the downstream taper

## 3. Worked example

A 35 mph street, one 12 ft lane closed, 400 ft work space, merging taper from the formula, 50 ft downstream taper:

```
buffer         Table 6B-2 at 35 mph = 250 ft
merging taper  L = 12 x 35^2 / 60 = 245 ft (traffic-taper-length)
spacing        tangent 2 x 35 = 70 ft; taper 35 ft
devices        buffer ceil(250 / 70) + 1 = 5; work space ceil(400 / 70) = 6
activity area  250 + 400 = 650 ft
closure        245 + 250 + 400 + 50 = 945 ft
```

**At 55 mph the same closure is 660 ft of taper, a 495 ft buffer at 110 ft spacing (6 drums), and 1,605 ft from the
first drum to the last**; at 45 mph with an 11 ft lane, 495 ft of taper, a 360 ft buffer, 90 ft spacing.

## 4. Scope and non-goals

The manual's dimensions for one stationary lane closure on a tangent. It does not select the typical application
(Part 6P), model a moving operation, a flagger station (the sign spacing tile serves), a lateral buffer, a
two-lane-two-way closure, night work or speed reductions, or the state supplement that may require the buffer the
manual only permits. The MUTCD as adopted by the state and the agency's traffic control plan govern.
