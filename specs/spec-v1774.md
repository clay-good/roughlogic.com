# roughlogic.com Specification v1774 -- 100 mV Polarisation Decay Criterion (`calc-corrosion.js`, Group E Carpentry and Construction, cathodic protection and corrosion control, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-corrosion.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Where a structure cannot be brought to -0.850 V, the 100 mV polarisation criterion is the alternative the standard allows -- and it is measured as a decay from the instant-off potential, not from the potential the rectifier was holding.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: potentials that are not negative with respect to the reference, an instant-off potential more negative than the on potential, or a depolarised potential more negative than the instant off returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the 100 mV polarisation criterion and its instant-off reference with NACE / AMPP SP0169 and the operator's own procedures named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`100 mv polarization criterion`, `cp depolarization test`, `polarization decay cathodic protection`, `alternative cp criterion`, `depolarization survey pipeline`.

## 2. The tile

### 2.1 `polarization-decay-criterion` -- 100 mV Polarisation Decay Criterion

```
the criterion    at least 100 mV of cathodic polarisation, demonstrated either by
                 formation or by decay
formation        instant-off potential minus the NATIVE (never-protected) potential
decay            instant-off potential minus the potential after the structure has
                 depolarised with all current off
the reference    BOTH are measured from the INSTANT-OFF value, never from the on
                 potential -- the on potential carries IR drop that is not
                 polarisation at all (`instant-off-ir-drop`)
depolarisation   the structure is left off until the potential stabilises; hours to
                 days depending on the structure, the coating, and the soil
when it is used  where -0.850 V instant off cannot be reached: well-coated
                 structures, high-resistivity soil, some galvanic systems
when it is NOT   the standards restrict it where dissimilar metals are coupled, and
                 it is not appropriate against dynamic stray current or where
                 microbiologically influenced corrosion is active
```

Two criteria exist because one number cannot serve every structure. The -0.850 V instant-off criterion is a
potential threshold and it is the easier of the two to apply, needing one reading at one moment. The 100 mV
criterion is a change threshold, and it accepts that a structure in a benign environment may be adequately
protected at a potential that would be insufficient elsewhere. That makes it the criterion for well-coated
lines in resistive soil, where driving to -0.850 V would need current the structure does not need.

The decay test is expensive in a way that the potential criterion is not, because the structure has to be left
unprotected while it depolarises. Hours or days with the rectifiers off is a real exposure, it requires
coordination with everything bonded to the structure, and it can only be done when the readings can be
collected at the end of it. That cost is the reason the formation version -- instant off against a native
potential recorded before the system was ever energised -- is preferred where the historical data exists.

The restrictions on its use are substantive rather than procedural. Where dissimilar metals are coupled the
100 mV shift can be satisfied on a structure that is still corroding galvanically; where stray current varies
the baseline moves during the test; and where sulfate-reducing bacteria are active the potential required for
protection is more negative than either criterion implies. A criterion is a demonstration of protection, not a
definition of it, and the standards name the conditions where the demonstration fails.

**Inputs:** the on potential, the instant-off potential, the native or depolarised potential, the depolarisation hold time, and which criterion is being applied

**Outputs:** the IR drop, the polarisation formed above native, the decay from the instant-off potential, whether each of the 100 mV and -0.850 V criteria is satisfied, the margin or shortfall on each, and the decay a reading taken from the on potential would have appeared to show

## 3. Worked example

A well-coated line in resistive soil, reading -1.050 V on and -0.780 V instant off, with a native potential of
-0.650 V. After 24 hours with every source off it depolarises to -0.670 V:

```
IR drop     = -0.780 - (-1.050) = 0.270 V, the ON reading is that much
              more negative than the instant off
formation   = -0.650 - (-0.780) = 130 mV more negative than native
decay       = -0.670 - (-0.780) = 110 mV less negative after depolarising
```

**Both demonstrations clear 100 mV** -- 130 mV by formation and 110 mV by decay -- **and the line is protected
under the criterion the standard allows here.**

**It does not meet -0.850 V, and it was never going to:**

```
-0.780 against -0.850 -- short by 70 mV
```

**That is precisely why the 100 mV criterion exists.** Driving this well-coated line another 70 mV more
negative in high-resistivity soil would take current and rectifier voltage the structure does not need, and
would risk the coating disbondment that overprotection causes. **A line can fail one criterion and be properly
protected under the other**, and reporting it as a failure is a misreading of the standard rather than a
finding.

**Now make the error the criterion is most often got wrong by.** Measure the decay from the ON potential:

```
-0.670 - (-1.050) = 380 mV
```

**380 mV against a true 110 mV -- 3.5 times over.** The difference is the 270 mV of IR drop, which is
voltage across soil and not polarisation of steel. A structure whose real decay was 110 mV would pass on this
reading while sitting 10 mV from the criterion, and **a structure genuinely below 100 mV would pass
comfortably** -- which is the failure mode that matters, because it certifies an unprotected line.

## 4. Scope and non-goals

A criterion interpretation aid. It does not take the measurement, and the measurement governs: synchronous interruption of every current source, reference electrode placement and calibration, and the judgement of when depolarisation is complete all decide whether the numbers mean anything, and a decay curve that has not flattened has not finished. It does not establish which criterion applies, which is a judgement under NACE / AMPP SP0169 about the structure and its environment -- the 100 mV criterion is restricted where dissimilar metals are coupled, is unsuitable against dynamic stray current, and is not sufficient where microbiologically influenced corrosion, elevated temperature, or disbonded coating shielding are present. It does not evaluate overprotection, coating disbondment, or hydrogen damage at very negative potentials, address AC interference (`ac-induced-voltage-pipeline`), or represent the pipe between test stations (`close-interval-survey-readings`). Leaving a structure depolarised is itself an exposure and requires the operator's authorisation. NACE / AMPP SP0169, the operator's own procedures, and a qualified corrosion engineer govern.
