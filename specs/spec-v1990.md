# roughlogic.com Specification v1990 -- Concrete Moisture Vapor Emission Rate from a Calcium Chloride Test (ASTM F1869) (`calc-finish.js`, Group E Carpentry and Construction, flooring, 1 New Tile)

> **Status: PROPOSED 2026-10-19. Single-tile spec.** Part of [scope-product-expansion](scope-product-expansion.md). In scope under the
> spec-v106 trades-only charter: Group E, the flooring bench in `calc-finish.js` beside `flooring-takeoff` and
> `self-leveler-bags`, no new dependency and no network call.
>
> **The gap.** A flooring installer puts a dish of calcium chloride under a dome on the slab, weighs it before and
> after, and has to turn a gain in grams over a number of hours into pounds per thousand square feet per 24 hours,
> which is the unit the flooring's warranty is written in. The standard gives the formula; the kit gives the dome
> area; the arithmetic gets done on the box lid. Nothing in the catalog did it, and a wrong conversion here voids a
> warranty or condemns a dry slab.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry and the v18/v21 contract apply: a negative mass gain,
a test area of zero, a test duration under 60 or over 72 hours (the standard's window; a duration outside it is
reported as a non-standard test rather than refused), or a limit of zero returns `{ error }`. Citation: ASTM F1869-23
by name for the formula and the 60 to 72 hour window, with the flooring manufacturer's limit entered rather than
assumed, GOVERNANCE.general. Aliases: `calcium chloride test calculation`, `MVER from grams`, `moisture vapor emission
rate lbs per 1000 sq ft`, `F1869 formula`, `is my slab dry enough for flooring calcium chloride`.

## 2. The tile

### 2.1 `mver-calcium-chloride` -- Concrete Moisture Vapor Emission Rate from a Calcium Chloride Test (ASTM F1869)

```
MVER        = 24,000 x dM / (453.612 x A x T)
              dM  mass gain of the calcium chloride, grams
              A   the test area under the dome, sq ft (from the kit's instructions)
              T   exposure time, hours (60 to 72 by the standard)
              result in lb of water per 1,000 sq ft per 24 h
constant    24,000 / 453.612 = 52.91: MVER = 52.91 x dM / (A x T)
limit       the flooring or adhesive manufacturer's maximum (3 lb is the common
            figure; 5 lb for some products), entered
verdict     MVER <= limit passes; the margin or excess is reported
tests       the standard calls for three tests in the first 1,000 sq ft and one per
            additional 1,000 sq ft; the tile reports the count for an area
```

The formula is a unit conversion dressed as a test: grams to pounds (453.612), the dome's area to a thousand square
feet, and the test hours to a day. Three grams gained over 72 hours on a 0.445 sq ft test area is 4.96 lb, and the
slab fails a 3 lb limit by almost two pounds. The same three grams over 60 hours is 5.95 lb, which is why the standard
fixes the window and the installer writes down the start time.

The test area is the number to be careful with. Some kits' instructions state the dome's inside area; others deduct
the dish; the standard's definition is the area of slab under the dome exposed to the desiccant. The tile takes the
area as the kit states it and says so beside the input, because a dome area used where a net area was meant moves the
answer by the dish's share.

The limit is the manufacturer's, not the standard's: F1869 measures, it does not pass or fail. Three pounds is the
figure most resilient and wood flooring warranties name, and the reader enters theirs.

**Inputs:** the mass gain in grams, the test area in square feet, the exposure time in hours, the manufacturer's limit,
and the floor area to be covered

**Outputs:** the MVER, pass/fail against the limit with the margin, a flag when the duration is outside 60 to 72 hours,
and the number of tests the standard asks for over the floor area

## 3. Worked example

A dish gains 3.0 g over 72 hours on a 0.44486 sq ft test area; the flooring's limit is 3 lb; 2,400 sq ft of floor:

```
MVER   = 24,000 x 3.0 / (453.612 x 0.44486 x 72) = 4.956 lb / 1,000 sq ft / 24 h
limit  3 lb:  FAIL, 1.96 lb over
tests  3 for the first 1,000 sq ft + 2 for the next 1,400 = 5 tests
```

**A 2.2 g gain over 66 hours on the same area is 3.96 lb, still over; 5.8 g over 60 hours is 11.5 lb**, a slab that
needs a mitigation system, not a different adhesive.

## 4. Scope and non-goals

The standard's arithmetic, not its procedure. It does not establish the test conditions (the slab at service
temperature and humidity for 48 hours, the surface ground clean), select between F1869 and the in-situ relative
humidity probe of ASTM F2170 (which many manufacturers now require instead, and whose threshold is a percentage, not
a rate), or decide mitigation. The flooring and adhesive manufacturers' written limits and the test's conditions
govern.
