# roughlogic.com Specification v1844 -- Fusion Splice Loss from Fibre and Geometry Mismatch (`calc-telecom.js`, Group A Electrical, fiber optic outside plant, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-telecom.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A fusion splice loses light for three reasons, and the one people worry about is the smallest. Fibre mismatch costs hundredths of a decibel; a poor cleave angle costs a whole one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive mode field diameter, wavelength, or index of refraction, a negative offset, or a cleave angle at or beyond 90 degrees returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Gaussian-approximation splice loss relations for mode field mismatch, lateral offset, and angular misalignment with the splicer manufacturer's data and the applicable test standards named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`fusion splice loss calculation`, `mode field diameter mismatch splice`, `lateral offset splice loss`, `cleave angle splice loss`, `core alignment splicer`.

## 2. The tile

### 2.1 `splice-loss-mismatch` -- Fusion Splice Loss from Fibre and Geometry Mismatch

```
mode field       the diameter over which the light actually propagates, larger
diameter         than the core; about 9.2 microns for standard single mode at
                 1550 nm and different between fibre types and wavelengths
MFD mismatch     L = -20 log10(2 w1 w2 / (w1^2 + w2^2)) dB
lateral offset   L = 4.343 (d / w)^2 dB, with w the mode field RADIUS
angular          L = 4.343 (pi n w theta / lambda)^2 dB, theta in radians
misalignment
the three add    approximately, for small losses
what the machine a core-alignment fusion splicer measures and corrects LATERAL
corrects         offset; it cannot correct a bad cleave
what it cannot   the cleave angle arrives with the fibre and becomes the splice
the ranking      cleave angle and offset dominate; fibre mismatch is usually
                 hundredths of a decibel
```

Three mechanisms, three very different magnitudes, and the intuition ranks them backwards. Splicing two
different fibre types feels like the risky operation, and between ordinary single mode variants it costs
almost nothing -- the mode fields are close enough that the mismatch term is in the hundredths of a decibel.
Getting the two ends lined up and square is the part that actually decides the splice, and it is a matter of
preparation rather than of fibre.

The splicer handles one of the two geometric errors and not the other, which is why practice concentrates
where it does. A core-alignment machine images both fibres, measures the lateral offset, and drives it out
before fusing, so offset is largely a solved problem on a modern splicer. Angular misalignment is set by how
the fibre was cleaved, and the splicer can measure it and refuse the splice but cannot fix it. The cleaver,
its blade condition, and the technician's technique are what produce it.

That is why cleaver maintenance is the highest-return habit in a splice trailer. A blade that has done its
rated number of cleaves or been nicked produces angles that push splice loss up across every fibre in the
enclosure, uniformly and without an obvious cause. A run of unexplained high-loss splices is a cleaver
problem far more often than a fibre problem, and the fix costs a blade rotation rather than a re-splice of the
whole tray.

**Inputs:** the two fibres' mode field diameters, the lateral offset, the angular misalignment or cleave angle, the operating wavelength, and the fibre index of refraction

**Outputs:** the mode field mismatch loss, the mismatch loss for a larger difference, the lateral offset loss at one and two microns, the angular loss at a good, a nominal, and a poor cleave angle, and the approximate total for an entered combination

## 3. Worked example

Two standard single mode fibres at 9.2 and 8.6 micron mode field diameter:

```
L = -20 log10(2 x 9.2 x 8.6 / (9.2^2 + 8.6^2)) = 0.0197 dB
```

**0.020 dB -- below the resolution of most field measurements.** Even a much larger mismatch stays small:

```
10.4 against 8.6 micron: L = 0.1559 dB
```

**Now the geometry.** Lateral offset, against a mode field radius of 4.6 microns:

```
1 micron offset: L = 4.343 x (1 / 4.6)^2 = 0.205 dB
2 micron offset: L = 0.821 dB
```

**10 times the MFD mismatch loss, from one micron of misalignment.** This is the term a core-alignment
splicer measures and drives out before fusing, which is why offset is largely a solved problem on a modern
machine.

**And the one the machine cannot fix:**

```
0.5 degree cleave: L = 0.062 dB
1.0 degree cleave: L = 0.248 dB
2.0 degree cleave: L = 0.991 dB
```

**A 2 degree cleave costs 0.99 dB on its own -- 50 times the fibre mismatch and enough to fail a splice
specification by itself.** The splicer can measure the angle and refuse the splice; **it cannot correct it,
because the angle arrived with the fibre.**

**Which ranks the three for the technician.** Fibre mismatch: 0.020 dB, unavoidable and irrelevant. Offset:
0.205 dB, handled by the machine. **Cleave angle: up to 0.99 dB, handled by the cleaver.** A run of
unexplained high-loss splices across a whole tray **is a cleaver problem far more often than a fibre problem**,
and the fix is a blade rotation rather than a re-splice.

## 4. Scope and non-goals

An idealised loss calculation. The relations are Gaussian-approximation results for single mode fibre and they treat each mechanism in isolation; real splice loss also depends on core concentricity error, core ellipticity, contamination on the endface, bubbles and voids formed during fusion, the dopant diffusion that occurs in the fused region, and the arc parameters and fibre alignment the splicer chose. They do not apply to multimode fibre, where the loss mechanisms are different. Mode field diameter varies with wavelength, so a splice measured at one wavelength does not have the same loss at another, and splices between dissimilar fibres commonly show a directional difference -- a gainer in one direction and a larger loss in the other -- which is why bidirectional OTDR averaging is required to measure them at all. The relations give the intrinsic loss and not the splice's mechanical strength, which is a separate proof test. It does not address splice protection, tray management, or the enclosure. The splicer manufacturer's data, the fibre manufacturers' specifications, and the applicable test and acceptance standards govern.
