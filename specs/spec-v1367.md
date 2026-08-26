# roughlogic.com Specification v1367 -- Driver Spacing, Lobing, and Crossover Ceiling (calc-stage.js, Group N, stage and live production, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`**
> (Group N, stage and live production), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Two sources playing the same signal comb-filter above the frequency where their spacing is half a wavelength. That one relationship sets the highest usable crossover between any two drivers, the highest frequency a subwoofer array can be spread across, and the frequency at which a stereo pair starts to lobe. The catalog has none of it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive spacing, frequency, or speed of sound, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the two-source path-difference relation and the half-wavelength lobing criterion (standard acoustics), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `driver-spacing-lobing` -- Driver Spacing, Lobing, and Crossover Ceiling

```
path difference   = spacing x sin(off-axis angle)
first null when   path difference = wavelength / 2
crossover ceiling = c / (2 x spacing)
null angle at f   = asin(c / (2 x spacing x f))     (no null if the ratio exceeds 1)
max spacing for f = c / (2 x f)
```

Two sources radiating the same signal are in phase everywhere on their perpendicular bisector and progressively
out of phase off it, because the path lengths differ. When the path difference reaches half a wavelength they
cancel, and the pattern acquires a null. Below the frequency where even the *worst-case* path difference -- the
full spacing, at 90 degrees off axis -- is under half a wavelength, no null can exist anywhere, and the pair
behaves as one source.

That gives the crossover ceiling: `c / (2 x spacing)`. Cross two drivers below it and the array is coherent
through the crossover region; cross above it and there is a null in the pattern at the crossover, moving with
frequency, and it will be audible as the audience walks past it. The same arithmetic answers the subwoofer
question -- how far apart can two subs be spread before the center of the room gets a hole -- and the stereo one.

**Inputs:** center-to-center spacing (ft), crossover or test frequency (Hz), air temperature (for the speed of
sound).

**Outputs:** crossover ceiling (Hz), whether a null exists at the test frequency and at what off-axis angle, the
wavelength at the test frequency, and the maximum spacing that would keep the test frequency clean.

## 3. Worked example

Two 15 in woofers on 18 in (1.5 ft) centers, 70 F:

```
crossover ceiling = 1125 / (2 x 1.5)          = 375 Hz
at 250 Hz:  c / (2 d f) = 1125 / 750 = 1.50   -> greater than 1, no null anywhere
at 500 Hz:  c / (2 d f) = 1125 / 1500 = 0.75  -> null at asin(0.75) = 48.6 deg off axis
```

So this pair is clean crossed at 250 Hz and has a null 49 degrees off axis if crossed at 500. Run it backward:
to keep 500 Hz clean the spacing must come in to `1125 / 1000 = 1.13 ft`, about 13.5 inches center to center --
which two 15 in drivers physically cannot do. That is why large-format two-way boxes cross low, and why the
spacing constraint is a cabinet design decision long before it is a system tuning one.

## 4. Scope and non-goals

Free-field point sources radiating identical signals in phase. Real drivers have finite size and their own
directivity, which narrows the pattern and softens the null; a crossover with a phase or delay offset between
the sections steers the lobe rather than centering it; and boundary reflections fill nulls in. The tile predicts
the *first* null only, not the full interference pattern, and says nothing about frequency response on axis.
Measure the pattern. The loudspeaker designer and the system tech govern.
