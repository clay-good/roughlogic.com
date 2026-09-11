# roughlogic.com Specification v1838 -- Fibre Chromatic Dispersion Penalty and Reach (`calc-telecom.js`, Group A Electrical, fiber optic outside plant, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-telecom.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Different wavelengths travel at slightly different speeds in glass, so a pulse spreads as it goes and eventually runs into its neighbour. The distance at which that happens falls as the square of the bit rate, so a span that is comfortable at one rate is impossible at four times it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive dispersion coefficient, span length, or bit rate returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the accumulated dispersion relation and the dispersion-limited reach rule of thumb with the transceiver manufacturer's dispersion tolerance and the cable manufacturer's fibre data named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`chromatic dispersion fiber reach`, `dispersion limited distance bit rate`, `ps per nm per km`, `dispersion compensation module`, `accumulated dispersion span`.

## 2. The tile

### 2.1 `chromatic-dispersion-reach` -- Fibre Chromatic Dispersion Penalty and Reach

```
dispersion       D, in ps per nm per km; standard single mode fibre is about
                 17 at 1550 nm and near zero at 1310
accumulated      D x L, in ps/nm -- the quantity a compensation module must cancel
dispersion
pulse spread     accumulated dispersion x the source's spectral width, in ps
bit period       1 / bit rate; at 10 Gb/s it is 100 ps
the reach rule   for an externally modulated NRZ signal, the dispersion-limited
                 distance is roughly 10^5 / (D x B^2) km with B in Gb/s
the square       reach falls as the SQUARE of bit rate: four times the rate is a
                 sixteenth of the distance
1310 vs 1550     standard fibre has near-zero dispersion at 1310 and its lowest
                 attenuation at 1550, so the two limits fight each other
compensation     a dispersion compensating module or fibre cancels accumulated
                 dispersion at the cost of its own insertion loss
```

Dispersion and attenuation are two different limits on the same span and the wavelength that is best for one
is not best for the other. Standard single mode fibre has almost no chromatic dispersion at 1310 nanometres
and its lowest loss at 1550, so a short link runs at 1310 and is loss-limited, while a long one runs at 1550
and becomes dispersion-limited. Which limit binds is a function of length and bit rate, and a link designed
against loss alone can be perfectly within its power budget and still not work.

The square-law dependence on bit rate is what makes upgrades so awkward. Doubling the rate halves the bit
period and doubles the spectral content, and the two combine to quarter the reach. A route engineered for a
given rate has no headroom for the next one, which is why a fibre plant that is fine today needs compensation
or coherent equipment the moment the service rate goes up -- and why the fibre itself, which has not changed,
is not the problem.

Compensation is available and it is not free. A dispersion compensating module cancels the accumulated
dispersion by introducing an equal and opposite amount, and it does so with several decibels of its own
insertion loss, which comes straight out of the power budget the span also has to satisfy. Modern coherent
transponders sidestep the problem entirely by compensating electronically in the receiver, which is why new
builds rarely carry compensation modules and older plant is full of them.

**Inputs:** the fibre dispersion coefficient at the operating wavelength, the span length, the bit rate, and the source spectral width

**Outputs:** the accumulated dispersion over the span, the pulse spread for the entered source, the bit period, the dispersion-limited reach at the entered bit rate, the reach at a lower and a higher rate, and whether the span is within its dispersion limit

## 3. Worked example

An 80 km span of standard single mode fibre at 1550 nm, D = 17 ps/nm/km:

```
accumulated dispersion = 17 x 80 = 1,360 ps/nm
```

**1,360 ps/nm is what a compensation module has to cancel.** Against the reach limits:

```
at 2.5 Gb/s: L_max = 10^5 / (17 x 2.5^2) = 941 km
at 10 Gb/s:  L_max = 59 km
at 40 Gb/s:  L_max = 3.7 km
```

**At 2.5 Gb/s this span is nowhere near its dispersion limit** -- 941 km against 80 -- and the design question
is purely one of loss.

**At 10 Gb/s the same fibre limits at 59 km, and the span is 80.** It is **36 percent past its dispersion
limit**, and no amount of optical power fixes it: the pulses have spread into each other and the receiver
cannot tell them apart. The span needs compensation, a coherent transponder, or a regenerator.

**At 40 Gb/s the limit is 3.7 km** -- **16 times shorter than at 10 Gb/s, for four times the rate.** That is the
square law, and it is why a fibre plant engineered for one service rate has no headroom at all for the next
one.

**The wavelength choice cannot solve both problems.** Moving to 1310 nm takes the dispersion nearly to zero and
gives up the low attenuation that made the long span possible in the first place. **Standard fibre's best loss
and its best dispersion are at different wavelengths**, and a long high-rate span has to be engineered against
both.

## 4. Scope and non-goals

A planning estimate from an engineering rule of thumb. The reach relation is an approximation for externally modulated non-return-to-zero signals and the constant differs between references, modulation formats, and the dispersion penalty allowed; a directly modulated laser's chirp makes its effective spectral width far larger and its reach much shorter, sometimes by several times. It does not compute a dispersion penalty in decibels, which requires the source's actual spectral characteristics and the receiver's tolerance from the equipment specifications. Dispersion coefficients vary with wavelength across a band and between fibre types -- dispersion-shifted, non-zero dispersion-shifted, and large effective area fibres all differ substantially from standard single mode -- and the cable manufacturer's data at the operating wavelength governs. It does not address polarisation mode dispersion, which limits older plant at high rates and is a statistical rather than a deterministic quantity, nor non-linear effects, which set the upper bound on launch power in a wavelength-multiplexed system. It does not select or size compensation, account for its insertion loss in the power budget (`fiber-loss-budget`), or address coherent systems where electronic compensation changes the problem entirely. The transceiver manufacturer's dispersion tolerance specification, the cable manufacturer's fibre data, and the transmission engineer govern.
