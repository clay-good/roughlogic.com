# roughlogic.com Specification v1823 -- Instrument Loop Total Error Stackup (`calc-controls.js`, Group A Electrical, building automation and controls, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-controls.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A control loop's measurement error is the combination of every element in the chain, and the honest combination is a root sum square rather than a sum. Then the sensor's installation error arrives and dwarfs all of it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a negative error for any element, a non-positive span, or a non-positive deadband returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the worst-case and root-sum-square uncertainty combination conventions with the manufacturers' complete specifications and a field verification of the installed measurement named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`instrument loop error stackup`, `total probable error control loop`, `rss versus worst case accuracy`, `sensor installation error stratification`, `averaging sensor duct`.

## 2. The tile

### 2.1 `loop-error-stackup` -- Instrument Loop Total Error Stackup

```
the chain        sensing element -> transmitter -> wiring -> controller input;
                 each contributes its own uncertainty
worst case       the arithmetic sum of every element's error, which assumes they
                 all err in the same direction at the same moment
root sum square  sqrt(sum of squares), the statistically honest combination for
                 INDEPENDENT errors; this is total probable error
the difference   worst case runs roughly 1.3 to 1.7 times the root sum square for
                 a typical three-element chain
common basis     every element's error must be converted to the same engineering
                 units before combining; percentages of different spans do not add
installation     stratification, radiant effect, immersion depth, location, and
error            response time -- and it is FREQUENTLY the largest term by far
averaging        a multi-point averaging element is the remedy for stratification,
                 and it is a sensor selection rather than a calculation
against what     the total error has to be compared with the control deadband; a
                 loop cannot control tighter than it can measure
```

Worst case and root sum square answer different questions and both are legitimate. The arithmetic sum is what
every element erring in the same direction simultaneously would produce -- a real possibility, and the right
basis where a single excursion has serious consequences. The root sum square is what independent errors
actually combine to most of the time, and it is the right basis for judging whether a control loop can do its
job. Quoting one and meaning the other overstates or understates by a consistent factor.

The unit conversion step is where stackups go wrong before any combination is attempted. Each element quotes
its error against its own basis -- degrees, percent of span, percent of reading, counts -- and those bases refer
to different quantities. Converting everything to the same engineering units at the measured condition is the
work; the combination afterwards is arithmetic.

And then the sensing element's placement makes the whole exercise academic. A temperature sensor in a
stratified duct, a pressure tap in a turbulent region, a flow element without its straight run, a wall sensor
above a heat source -- these produce errors that exceed the entire instrument chain by an order of magnitude.
The calculation is worth doing and it is not where the error is; the first question about any loop is where its
sensor sits.

**Inputs:** each element's error and the basis it is quoted against, the measurement span and the condition of interest, the estimated installation error, an averaging sensor's residual error, and the control deadband

**Outputs:** each element's error in engineering units, the worst-case sum, the root sum square total probable error, the ratio between them, the total including installation error, the total with an averaging sensor, and the comparison against the control deadband

## 3. Worked example

A temperature loop over a 100 degF span: a sensing element at +/- 0.5 degF, a transmitter at
0.2% of span, and a controller input at 0.1% of span:

```
element     = 0.50 degF
transmitter = 0.002 x 100 = 0.20 degF
input       = 0.001 x 100 = 0.10 degF

worst case  = 0.50 + 0.20 + 0.10 = 0.80 degF
RSS         = sqrt(0.50^2 + 0.20^2 + 0.10^2) = 0.548 degF
```

**0.80 degF worst case against 0.55 degF probable -- a factor of 1.46.** Both are correct answers to
different questions, and the sensing element supplies 62 percent of the worst case on its own.

**Against the control deadband the loop is adequate:**

```
deadband 1.0 degF vs total probable error 0.55 degF
```

**Now install it in a stratified duct**, where the temperature across the section varies by several degrees and
a single-point element reads whatever stream it happens to sit in:

```
installation error = +/- 4.0 degF
total = sqrt(0.548^2 + 4.0^2) = 4.04 degF
```

**4.04 degF.** The instrument chain contributed 0.55 and the installation contributed 4.0, so the total is
**7 times the carefully calculated instrument error and essentially equal to the installation error alone.**

**Against a 1.0 degF deadband that loop cannot control at all.** It will hunt, chase a measurement that depends
on which stream the element is in, and produce a trend that looks like an unstable loop rather than a
misplaced sensor.

**The remedy is a sensor, not a tuning session.** A multi-point averaging element across the duct section:

```
total = sqrt(0.548^2 + 0.5^2) = 0.74 degF
```

**0.74 degF -- back inside the deadband**, from changing the element rather than the arithmetic. **The first
question about any loop is where its sensor sits**, and the stackup is worth computing mainly so that the
answer to that question can be put beside it.

## 4. Scope and non-goals

An uncertainty combination. Root sum square is valid for INDEPENDENT random errors and is not appropriate for systematic ones: a calibration offset, a common temperature effect, or a shared reference error affects several elements in the same direction and must be summed rather than combined in quadrature. Published element accuracies are reference accuracies under stated conditions and exclude effects specified separately -- ambient temperature, drift over the calibration interval, supply voltage, mounting position, vibration -- all of which belong in a complete stackup and none of which appear on a headline figure. The installation error is estimated rather than computed and can only be established by measurement, typically by traversing the duct or comparing against a reference at several points. It does not address dynamic error, where a sensor's time constant means it reports a temperature the process had some time ago, which matters as much as static accuracy in a fast loop. It does not size, select, or locate a sensor, specify a calibration interval, or address traceability. The manufacturers' complete specifications including their operating-condition effects, a field verification of the installed measurement, and the controls engineer govern.
