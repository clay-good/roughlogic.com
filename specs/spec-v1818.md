# roughlogic.com Specification v1818 -- Transmitter Span, Accuracy, and 4-20 mA Scaling (`calc-controls.js`, Group A Electrical, building automation and controls, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-controls.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A 4-20 mA loop is a linear map from current to engineering units, and the arithmetic is trivial. What is not trivial is the accuracy statement: quoted against the upper range limit rather than the calibrated span, it gets worse in direct proportion to how far the transmitter is turned down.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: an upper range value at or below the lower range value, a calibrated span exceeding the upper range limit, a loop current outside the valid range, or a non-positive accuracy figure returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the linear 4-20 mA scaling relation and the span, URL, and reading accuracy bases with the transmitter manufacturer's specification and a traceable calibration named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`4-20 ma scaling`, `transmitter span and zero`, `turndown ratio accuracy`, `percent of span versus percent of url`, `instrument accuracy calibrated range`.

## 2. The tile

### 2.1 `transmitter-span-scaling` -- Transmitter Span, Accuracy, and 4-20 mA Scaling

```
the map          value = LRV + (mA - 4) / 16 x span, where span = URV - LRV
                 LRV and URV are the lower and upper RANGE VALUES the transmitter
                 is calibrated to, not its sensor limits
URL              the upper RANGE LIMIT -- the largest value the sensor element can
                 be ranged to, a fixed property of the device
turndown         URL / span; a device ranged well below its limit has high turndown
accuracy basis   MUST be read carefully: "0.1% of span" and "0.1% of URL" are the
                 same statement only at turndown 1:1
the degradation  quoted against URL, the absolute error is fixed, so as a
                 percentage of the calibrated span it grows with turndown
of reading       accuracy quoted as percent of READING is worse still at the bottom
                 of the range, where the reading is small
this is linear   a differential-pressure flow transmitter is not
                 (`dp-flow-signal-scaling`)
```

The scaling is a straight line and the honest difficulty is entirely in the specification. Two transmitters
with identical published accuracy figures can differ by an order of magnitude in the application, because one
figure is referenced to the device's sensor limit and the other to the range it is actually calibrated to.
Reading the basis is the whole skill, and a specification that does not state one has not stated an accuracy.

Turndown is where the difference becomes concrete. A transmitter ranged near its sensor limit has an error
that is a small fraction of its span; the same device turned down to a fraction of that limit has the same
absolute error over a much smaller span, so the relative error grows by exactly the turndown ratio. Selecting a
wide-range device and turning it down for flexibility is a reasonable engineering choice that costs accuracy in
a way the datasheet does not make obvious.

The bottom of the range is worse again and it is where control frequently lives. A fixed absolute error is a
large percentage of a small reading, so a loop controlling at twenty percent of span is working with a
proportionally much poorer measurement than the same loop at full scale -- and low-flow, low-pressure, and
low-load conditions are exactly the ones a modern control sequence spends most of its time in.

**Inputs:** the lower and upper range values, the sensor upper range limit, the loop current, the quoted accuracy and whether it is referenced to span, to the upper range limit, or to reading, and an alternative calibrated span

**Outputs:** the engineering value at the entered current, the calibrated span and the turndown ratio, the absolute error on each accuracy basis, the error as a percentage of span and of a low reading, and the same figures at a narrower calibrated span

## 3. Worked example

A transmitter with a 250 in w.c. upper range limit, calibrated 0 to 100 in w.c.:

```
value at 12 mA = 0 + (12 - 4)/16 x 100 = 50.0 in w.c.
turndown        = 250 / 100 = 2.5:1
```

**Now read the accuracy two ways, from the same 0.1% figure:**

```
0.1% of span = 0.001 x 100 = 0.100 in w.c.
0.1% of URL  = 0.001 x 250 = 0.250 in w.c.
```

**2.5 times the error, from the same number on the same datasheet.** At turndown 2.5:1 the URL basis is
0.25% of the calibrated span rather than the 0.1% the specification appeared to promise.

**Turn it down further and the gap widens exactly with the turndown:**

```
calibrated 0 to 25 in w.c.: turndown = 10:1
0.1% of URL = 0.250 in w.c. = 1.0% of the new span
```

**1.0% -- 10 times the headline figure**, from a device that is performing exactly to its
specification. **The absolute error never moved; the span shrank underneath it.**

**And the bottom of the range is worse again.** At 20 in w.c., which is 20% of the calibrated span:

```
error = 0.250 / 20 = 1.2% of reading
```

**1.2% of the reading at a condition a modern control sequence spends most of its time in** -- low flow, low
load, low pressure. The transmitter is accurate; **the measurement is not, and the difference is entirely in
where the range was set.**

**This is the linear case.** A differential-pressure flow transmitter maps to the square root of the signal and
has a different and steeper problem at the bottom of its range (`dp-flow-signal-scaling`).

## 4. Scope and non-goals

A scaling and specification-reading aid. It does not calibrate anything: the transmitter's actual error is established by calibration against a traceable standard at the range in use, and the published figure is a reference accuracy under stated conditions. Published accuracy excludes several effects that are specified separately and are frequently larger -- ambient temperature effect, static pressure effect on a differential-pressure device, long-term drift, mounting position, and vibration -- and a total probable error must combine them (`loop-error-stackup`). It does not address the sensing element's own installation error, which commonly dominates everything the instrument contributes. It does not cover square-root extraction (`dp-flow-signal-scaling`), smart transmitters performing internal characterisation, digital protocols carrying the value alongside the analogue signal, NAMUR NE43 fault bands and how a controller should interpret out-of-range currents, or loop powering, burden, and wiring resistance. The transmitter manufacturer's specification with its stated accuracy basis, a calibration against a traceable standard, and the controls engineer govern.
