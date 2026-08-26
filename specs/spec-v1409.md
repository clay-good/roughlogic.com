# roughlogic.com Specification v1409 -- Hydraulic Reservoir Size and Cooler Heat Rejection (calc-shop.js, Group G, shop and industrial, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop and industrial), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes hydraulic pump flow, drive horsepower, cylinder force, line velocity, and accumulator volume -- the whole circuit except the two things that keep it from cooking itself. Reservoir size and cooler capacity both come from the same number, the power the system turns into heat, and neither is in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive flow, pressure, or efficiency, an efficiency or heat fraction outside 0-1, or a reservoir multiplier at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the reservoir sizing convention (a multiple of pump flow per minute) and the heat-rejection relation from system inefficiency at 2,545 BTU/hr per horsepower, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `hydraulic-reservoir-cooler` -- Hydraulic Reservoir Size and Cooler Heat Rejection

```
hydraulic hp    = gpm x psi / 1,714
input hp        = hydraulic hp / pump efficiency
heat generated  = input hp x heat fraction
heat (BTU/hr)   = heat hp x 2,545
reservoir       = pump flow x reservoir multiplier      (3x gpm industrial, 1 to 2x mobile)
cooler duty     = heat generated - reservoir dissipation
```

Everything a hydraulic system does that is not useful work becomes heat in the oil: pressure drop across valves
and lines, relief-valve flow, pump and motor inefficiency. A quarter of input power is a common figure for a
system with ordinary metering losses, and on a system that spends much of its cycle over relief it is far more.

The reservoir does three jobs -- de-aerate, settle contamination, and shed heat -- and the classic industrial rule
of three times the pump's per-minute flow is really a *dwell time* rule: it gives the oil about three minutes in
the tank to release entrained air before it goes around again. Mobile equipment cannot carry that much oil and
runs one to two times instead, which is exactly why mobile systems need coolers and industrial power units often
do not.

The last line is the design decision. Whatever heat the reservoir cannot shed at the acceptable oil temperature,
a cooler must -- and if neither does it, the oil temperature climbs until the viscosity falls far enough that
leakage losses balance the input, which is a stable and destructive equilibrium.

**Inputs:** pump flow (gpm), system pressure (psi), pump and drive efficiency, heat fraction, reservoir
multiplier, reservoir dissipation at the design oil temperature.

**Outputs:** hydraulic and input horsepower, heat generated in hp and BTU/hr, reservoir volume, and the required
cooler duty.

## 3. Worked example

A 20 gpm pump at 2,000 psi, 85% pump efficiency, 25% of input turning to heat, industrial 3x reservoir, tank
shedding 4,000 BTU/hr at the design temperature:

```
hydraulic hp = 20 x 2,000 / 1,714  = 23.3 hp
input hp     = 23.3 / 0.85         = 27.5 hp
heat         = 27.5 x 0.25         = 6.9 hp = 17,469 BTU/hr
reservoir    = 20 x 3              = 60 gal
cooler duty  = 17,469 - 4,000      = 13,469 BTU/hr
```

Thirteen and a half thousand BTU per hour into a cooler -- a real heat exchanger and a real fan, not an
afterthought. And note what the heat fraction does: a system designed so that only 15% of input becomes heat needs
`27.5 x 0.15 x 2,545 = 10,482` BTU/hr of rejection and a cooler barely half the size. Circuit design, not cooler
selection, is where hydraulic heat is actually controlled.

## 4. Scope and non-goals

Steady-state heat balance at one operating point. Real duty cycles are not steady -- a machine that runs over
relief for part of its cycle and unloaded for the rest needs a weighted average, and sizing on the worst instant
buys a cooler that is never needed. The heat fraction is an estimate and should be replaced by a measured oil
temperature rise where one exists. Reservoir dissipation depends on surface area, air movement, and the
temperature difference to ambient, and a tank in a hot enclosed space sheds almost nothing. The tile does not size
the cooler itself, select between air and water cooling, address filtration, reservoir baffling and
suction/return separation, suction-line NPSH, or the fluid's viscosity limits at startup temperature. The
component manufacturers and the fluid supplier govern.
