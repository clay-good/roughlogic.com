# roughlogic.com Specification v1728 -- Noise Barrier Insertion Loss (Fresnel Number) (`calc-airquality.js`, Group G Cross-Trade Utilities, air quality, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-airquality.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; air quality and environmental), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A noise barrier works by making sound take a longer path over the top, and how much it helps depends on how much longer that path is compared with a wavelength. The Fresnel number captures it, and it explains why barriers help traffic noise and do almost nothing for low-frequency rumble.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive path difference or frequency, or a barrier that does not break the line of sight returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Fresnel number and Kurze-Anderson insertion loss relation with FHWA traffic noise procedures named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`noise barrier insertion loss`, `fresnel number barrier`, `sound wall effectiveness`, `barrier flanking noise`, `traffic noise wall height`.

## 2. The tile

### 2.1 `noise-barrier-insertion-loss` -- Noise Barrier Insertion Loss (Fresnel Number)

```
path difference   delta = (source to top) + (top to receiver) - (direct source to receiver)
Fresnel number    N = 2 delta / wavelength
insertion loss    IL = 10 log10( 3 + 20 N )   for a thin rigid barrier (Kurze-Anderson)
practical ceiling roughly 20 to 25 dB; sound diffracts and flanks around the ends
frequency         wavelength is in the Fresnel number, so barriers work far better at
                  high frequency than at low
break line of sight  a barrier that does not break the line of sight does essentially nothing
flanking          around the ends, and through gaps; a gap ruins a barrier
```

The frequency dependence is the whole practical story. A barrier's effectiveness depends on the path difference
measured in wavelengths, and a 1,000 Hz wavelength is about a foot while a 63 Hz wavelength is eighteen feet. So
the same barrier that gives fifteen decibels of insertion loss at 1,000 Hz gives two or three at 63 -- which is
why barriers work well against tyre noise and poorly against truck exhaust rumble, and why residents behind a new
barrier often report that the traffic sounds different rather than quieter.

Breaking the line of sight is the threshold condition. If the receiver can see the source, the path difference is
essentially zero, the Fresnel number is zero, and the barrier does nothing at all -- so barrier HEIGHT is not a
continuous variable in its effect: it does nothing until it blocks the view and then it starts to work. That is
why a barrier a few feet too short is not a barrier that works a bit less well.

Flanking defeats barriers routinely. Sound diffracts around the ends, so a barrier must extend well past the
receiver in both directions to be effective, and a gap for a driveway or a drainage path is a hole that most of
the benefit escapes through. The practical ceiling of 20 to 25 decibels exists because at some point the flanking
paths dominate no matter how tall the barrier is.

**Inputs:** the source, barrier top, and receiver positions, the frequency or spectrum of interest, the barrier length relative to the receiver, and any gaps

**Outputs:** the path difference, the Fresnel number and insertion loss at each frequency, the A-weighted insertion loss across a stated spectrum, the barrier height needed to break the line of sight, and the effect of a stated gap or barrier end position

## 3. Worked example

A barrier producing a path difference of 0.5 ft.

At 1,000 Hz the wavelength is about 1.13 ft:

```
N  = 2 x 0.5 / 1.13 = 0.88
IL = 10 log10(3 + 20 x 0.88) = 10 log10(20.6) = 13.1 dB
```

At 125 Hz the wavelength is about 9.0 ft:

```
N  = 2 x 0.5 / 9.0 = 0.11
IL = 10 log10(3 + 20 x 0.11) = 7.2 dB
```

**13 dB at 1,000 Hz and 7 dB at 125 Hz** from the same
barrier. Tyre noise, which lives at the high end, is substantially reduced; truck exhaust and engine rumble at the
low end is barely touched. Which is exactly what residents report: the traffic sounds different, and the loud
part is still there.

**Breaking the line of sight is a threshold, not a slope.** A barrier one foot short of blocking the view has a
path difference near zero, N near zero, and an insertion loss of `10 log10(3)` = 4.8 dB --
essentially nothing. Add the foot and it starts working. There is no partial credit for a barrier you can see
over.

**Flanking** is what caps it in practice. Sound goes around the ends, so the barrier has to extend well past the
receiver both ways, and a driveway gap is a hole that most of the benefit leaves through. That is why the
practical ceiling is 20 to 25 dB regardless of height.

## 4. Scope and non-goals

A single-frequency, single-path screening relation. The Kurze-Anderson form applies to a thin rigid barrier of
infinite length with no flanking; real barriers have finite length, and diffraction around the ends and
reflections from surfaces on the opposite side of a road both reduce the achieved insertion loss below the
calculated value. It does not compute a spectrum-weighted result unless a spectrum is entered, and A-weighted
performance against a broadband source is what matters in practice. It does not address barrier transmission
loss, which must be adequate that sound through the barrier does not dominate what goes over it, or ground effects
and meteorological refraction, which can bend sound over a barrier under some conditions. It does not perform a
traffic noise analysis, which for a highway project follows FHWA procedures with an approved model. FHWA Traffic
Noise Model procedures where applicable, the project's acoustical consultant, and the applicable noise ordinance
govern.
