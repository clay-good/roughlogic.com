# roughlogic.com Specification v1985 -- Truss and Rafter Uplift Connector Demand (`calc-construction.js`, Group E Carpentry and Construction, 1 New Tile)

> **Status: LANDED 2026-10-19 (proposed 2026-10-19). Single-tile spec. As built: `asce7-load-combinations` already returns the 0.6D + 0.6W net uplift from loads the reader has totaled; this tile adds the tributary area and the connector check, and its note points to that calculator. The area carried is the statical reaction (L + o)^2 / 2L x spacing rather than this spec's (L/2 + o) x spacing, which understates it by o^2 / 2L when there is an overhang. Inputs are capped at residential ranges (spacing to 96 in, span to 100 ft, overhang to 10 ft).** Part of [scope-product-expansion](scope-product-expansion.md). In scope under the
> spec-v106 trades-only charter: Group E, the wind-load bench in `calc-construction.js` beside `wind-cc-pressure`,
> `asce7-load-combinations` and `rooftop-curb-uplift`, no new dependency and no network call.
>
> **The gap.** `wind-cc-pressure` computes the components-and-cladding uplift pressure on a roof and
> `asce7-load-combinations` nets it against dead load per square foot. Nothing turns that into the pound on the
> hurricane tie: pressure times the tributary area of one truss end, netted at the ASD factors, against the
> connector's listed allowable. That number is what the framing inspector reads off the tie's stamp and the
> engineer's schedule, and what the framer has to produce when the schedule is missing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry and the v18/v21 contract apply: a non-positive
spacing, span or allowable, a negative overhang, pressure or dead load, or more than 4 connectors per end returns
`{ error }`. Citation: ASCE 7-22 Section 2.4.1 (ASD combinations 0.6 D + 0.6 W) and Chapter 30 by name for the
pressure the reader enters, with the connector allowable taken from the manufacturer's evaluation report (ICC-ES ESR)
as the reader enters it, GOVERNANCE.general. Aliases: `hurricane tie uplift load`, `truss uplift per end`, `how much
uplift does a rafter tie need`, `net uplift on a truss connector`, `H2.5 enough for this uplift`.

## 2. The tile

### 2.1 `truss-uplift-connector` -- Truss and Rafter Uplift Connector Demand

```
tributary area   A = spacing / 12 x (span / 2 + overhang), sq ft, to one bearing end
                 of a simple-span truss or rafter
wind uplift      W = p x A, lb, p the net design uplift pressure on the roof (psf,
                 strength level, from wind-cc-pressure or the engineer)
dead load        D = w_dead x A, lb, the roof assembly's actual dead load (psf)
net uplift (ASD) U = 0.6 W - 0.6 D   (ASCE 7 2.4.1 combination 7); 0 when D >= W
per connector    U / n for n identical connectors at the end
check            U / n <= allowable (the ESR's ASD uplift value for the wood species,
                 fastener schedule and load duration the reader has matched)
utilisation      (U / n) / allowable
```

The connector carries what the wind lifts minus what the roof weighs, and ASD pairs both with 0.6. The 0.6 on the
dead load is the point most often missed: the code does not let the full roof weight resist uplift, because the dead
load may be less than estimated, so a 12 psf roof resists as 7.2 psf. The tributary area is half the span plus the
overhang, times the spacing, and the overhang is the part framers leave out.

The pressure is entered, not computed here, because `wind-cc-pressure` already does the ASCE 7 arithmetic and the
engineer's schedule often states it directly. It must be the strength-level (ultimate) pressure that ASCE 7-16 and
later produce; a pressure already at ASD level would be doubly reduced, and the tile says so beside the input.

The allowable is the manufacturer's, from the evaluation report, for the species, fasteners and duration the reader
has matched; the tile does not carry a connector table. One connector short is answered by the "connectors needed"
output: the ceiling of U over the allowable.

**Inputs:** truss or rafter spacing, span, overhang, the net design uplift pressure, the roof dead load, the connector
allowable uplift, and the number of connectors per end

**Outputs:** the tributary area, wind and dead loads, the net ASD uplift, the demand per connector, pass/fail and
utilisation, and the number of connectors of this allowable needed

## 3. Worked example

Trusses at 24 in on a 32 ft span, no overhang (the common schedule line): spacing 24 in, span 32 ft, overhang 0, net uplift pressure 28.4 psf, dead load 12 psf, one connector rated 585 lb:

```
A    = 24 / 12 x 32 / 2 = 32.0 sq ft
W    = 28.4 x 32.0 = 908.8 lb
D    = 12 x 32.0 = 384.0 lb
U    = 0.6 x 908.8 - 0.6 x 384.0 = 545.3 - 230.4 = 314.9 lb
per connector 314.9 lb <= 585 lb   ok, utilisation 0.54
```

**At 45 psf on a 36 ft span with a 10 psf roof the same tie fails:** A = 36 sq ft, W = 1,620 lb, D = 360 lb, U = 972 -
216 = 756 lb, 756 > 585, utilisation 1.29; two of them, or one rated 760 lb or more, are needed.

## 4. Scope and non-goals

A connector demand from entered loads, not a lateral or wind design. It does not compute the pressure
(`wind-cc-pressure`), the full load path below the tie (the top plate to stud, stud to sill and sill to foundation
each need their own connector), shear or lateral loads on the connector, combined uplift and lateral per the ESR's
interaction rule, load-duration or species adjustments (the reader enters the allowable already adjusted), or the
continuous-load-path requirements of the adopted code in high-wind regions. The engineer of record, the connector's
evaluation report and the AHJ govern.
