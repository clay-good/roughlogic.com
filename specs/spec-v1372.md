# roughlogic.com Specification v1372 -- Color-Temperature Correction in Mireds (calc-stage.js, Group N, stage and live production, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`**
> (Group N, stage and live production), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Correcting one light source to another is a mired subtraction, not a kelvin subtraction, and the difference is the whole reason gel is specified the way it is. Group N has no color tile at all, and a lighting or camera crew making a correction by kelvin arithmetic will pick the wrong gel every time.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive color temperature, or a corrected temperature that falls outside a plausible range, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the mired (micro-reciprocal-degree) scale and its use for color-temperature correction filters, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `mired-gel-shift` -- Color-Temperature Correction in Mireds

```
mired        = 1,000,000 / kelvin
mired shift  = mired(target) - mired(source)
resulting K  = 1,000,000 / (mired(source) + applied shift)
```

Kelvin is not a perceptually even scale. Going from 3,000 K to 3,200 K is a visible correction; going from
9,000 K to 9,200 K is invisible. Mireds -- reciprocal color temperature times a million -- *are* even, which is
why every correction filter in the catalog is specified as a mired shift rather than as a pair of kelvin values.
A full CTB is about -131 mireds no matter what it is put in front of; a full CTO is about +131.

That is the practical payoff. Once a crew is thinking in mireds, "what gel gets me from here to there" is a
subtraction, and "what does this gel do to that source" is an addition. Negative shifts are blue (raising color
temperature), positive shifts are orange (lowering it).

**Inputs:** source color temperature (K) and either a target color temperature (K) or an applied mired shift.

**Outputs:** source and target mireds, the required mired shift, the nearest standard correction (full, half,
quarter CTB or CTO), and the resulting temperature when a shift is applied.

## 3. Worked example

Matching a 3,200 K tungsten fixture to 5,600 K daylight:

```
source mired = 1,000,000 / 3,200 = 312.5
target mired = 1,000,000 / 5,600 = 178.6
shift needed = 178.6 - 312.5     = -133.9 mireds
```

A full CTB is about -131 mireds, so one sheet lands within three mireds of the target -- effectively exact. Run
it the other way, daylight down to tungsten, and the shift is +133.9, which is one full CTO. Now try the same
correction by kelvin arithmetic: the difference is 2,400 K, and there is no gel labeled "2,400 K" because the
number means something different depending on where you start. From 5,600 K a full CTO lands at
`1,000,000 / (178.6 + 131) = 3,230 K`; from 6,500 K the same sheet lands at 3,510 K. Same gel, different result,
and only the mired scale predicts it.

## 4. Scope and non-goals

Correlated color temperature only. Mired arithmetic assumes both sources sit on or near the blackbody locus and
says nothing about green-magenta correction, which is a separate axis handled with plus-green and minus-green
filters, or about color rendering, which two sources at identical CCT can fail at completely -- an LED and a
tungsten lamp matched to the same kelvin can render skin tones very differently. Published mired values are
nominal; measure with a color meter for critical work. The filter manufacturer's data and the director of
photography govern.
