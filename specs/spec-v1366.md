# roughlogic.com Specification v1366 -- End-Fire and Cardioid Subwoofer Array Spacing (calc-stage.js, Group N, stage and live production, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`**
> (Group N, stage and live production), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Directional subwoofer arrays are standard practice and the catalog has nothing on them. The spacing and the delay that make an end-fire array work are a single quarter-wavelength relationship, and getting it wrong turns a rear-rejection array into an array with a hole in the front.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive spacing, speed of sound, or element count, or a target frequency outside a plausible subwoofer band, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the end-fire and reverse-stack cardioid subwoofer array geometry (quarter-wavelength spacing with matched electronic delay), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `cardioid-sub-array` -- End-Fire and Cardioid Subwoofer Array Spacing

```
delay per element = spacing / c
optimum frequency = c / (4 x spacing)
wavelength at f   = c / f
spacing for f     = c / (4 x f)
```

An end-fire array puts subwoofers in a line pointed at the audience and delays each one behind the one in front by
exactly the time sound takes to travel the spacing. Forward, every cabinet's output arrives together and adds.
Backward, the electronic delay and the acoustic travel time add instead of cancelling, so the rear arrivals are
spread out and the level collapses. The rejection is deepest where the spacing is a quarter wavelength, because
that puts the rear arrivals a half wavelength -- a full polarity flip -- apart.

That quarter-wave relationship is the whole design. It also sets the band: an array tuned for deep rejection at
90 Hz is progressively less directional as frequency falls, and above roughly twice the tuning frequency the
pattern breaks up. Adding elements deepens and broadens the rejection but does not change where it is centered.

The reverse-stack cardioid variant -- one cabinet turned to face backward, delayed and polarity-inverted -- works
on the same arithmetic with a spacing set by the cabinet depth rather than chosen.

**Inputs:** element spacing (ft) or target rejection frequency (Hz), number of elements, air temperature (for the
speed of sound).

**Outputs:** delay per element (ms), optimum rejection frequency, the wavelength at that frequency, and the
spacing that a chosen target frequency would require.

## 3. Worked example

A four-element end-fire array on 3.0 ft centers at 70 F (`c = 1125 ft/s`):

```
delay per element = 3.0 / 1125       = 2.667 ms
optimum frequency = 1125 / (4 x 3.0) = 93.75 Hz
wavelength there  = 1125 / 93.75     = 12.0 ft   (spacing is one quarter of it)
```

So element two is delayed 2.667 ms, element three 5.333 ms, element four 8.0 ms, and the deepest rejection sits
right in the kick-drum band. To move the tuning down to 60 Hz the spacing has to open to `1125/240 = 4.69 ft`,
which puts three spacings, over fourteen feet of stage depth, behind four cabinets -- and that trade, depth of stage against depth of
rejection, is the real constraint on end-fire arrays.

## 4. Scope and non-goals

Idealized point sources in free field. Real cabinets have depth, so the acoustic spacing is not the tape-measure
spacing; boundary loading from the stage and the ground changes the pattern; and the rejection measured in a room
is always shallower than the free-field prediction. The tile does not model gradient (front-to-back) cardioid
pairs with polarity inversion beyond noting them, does not predict on-axis SPL or the array's low-frequency
extension, and does not address the rigging or the power distribution. Measure the result. The system tech and
the loudspeaker manufacturer govern.
