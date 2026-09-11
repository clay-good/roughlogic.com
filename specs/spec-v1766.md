# roughlogic.com Specification v1766 -- Instant-Off Potential and IR Drop Correction (`calc-corrosion.js`, Group E Carpentry and Construction, cathodic protection and corrosion control, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-corrosion.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A pipe-to-soil reading taken with the current flowing includes a voltage drop through the soil that is not polarisation of the steel. The criterion is written against the corrected value, and the correction is routinely large enough to turn a comfortable pass into a marginal one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: potentials that are not negative with respect to the reference, an instant-off potential more negative than the on potential, or a native potential more negative than the instant off returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the IR-drop definition and the -0.850 V criterion with NACE / AMPP SP0169 and the operator's own procedures named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`instant off potential`, `ir drop cathodic protection`, `pipe to soil potential correction`, `850 mv criterion`, `on off survey interrupter`.

## 2. The tile

### 2.1 `instant-off-ir-drop` -- Instant-Off Potential and IR Drop Correction

```
on potential     measured with the protection current flowing; includes the IR drop
                 through the soil between the pipe and the reference electrode
instant off      measured in the first instant after ALL current sources are
                 interrupted synchronously, before the steel depolarises
IR drop          IR = on potential - instant off; it is soil, not steel
criterion        -0.850 V with respect to a saturated copper / copper sulfate
                 reference, applied to the INSTANT-OFF value
polarisation     instant off minus the native (fully depolarised) potential, the
                 basis of the 100 mV criterion (`polarization-decay-criterion`)
interruption     every current source on the structure must interrupt together; one
                 rectifier left running invalidates the reading
the error        reading the ON potential against the criterion overstates protection
                 by exactly the IR drop
```

The reference electrode is measuring a point in the soil, not the steel, and everything between the two is in
the reading. Protection current flowing through that soil develops a voltage across it, and the meter adds
that voltage to the potential of the metal. The steel does not know about it, the corrosion process does not
respond to it, and the criterion was never written to include it.

The size of the error tracks the things that make measurement hardest. A high-resistivity soil, a deeply
buried line, a paved surface that forces the electrode far from the pipe, or a heavy current all enlarge the
IR drop, so the sites where a reading is most difficult to take are the sites where taking it wrong matters
most. A reading over asphalt with the electrode at the curb can carry hundreds of millivolts that have nothing
to do with the pipe.

Synchronous interruption is the whole technique and it is where field practice fails. Every source feeding the
structure -- rectifiers, galvanic anodes, bonds to other structures -- has to go off at the same instant, and
anything still delivering current leaves its own IR drop in the reading. Galvanic anodes cannot be switched at
all, which is one reason the 100 mV depolarisation criterion exists for structures that have them.

**Inputs:** the on potential, the instant-off potential, the native or depolarised potential, and the criterion being applied

**Outputs:** the IR drop, the margin against the criterion on the instant-off value, the margin the on potential would have appeared to give, the polarisation developed above native, and whether each criterion is satisfied

## 3. Worked example

A test station reading -1.150 V on and -0.880 V instant off, against a native potential of -0.620 V:

```
IR drop      = -1.150 - (-0.880) = -0.270 V = -270 mV
criterion    = -0.850 V instant off
margin (off) = -0.880 - (-0.850) = -0.030 V = -30 mV
```

**The line passes, by -30 mV.** That is a real pass and a thin one.

**Now read the same station the wrong way.** Against the ON potential of -1.150 V the apparent margin is:

```
margin (on) = -1.150 - (-0.850) = -0.300 V = -300 mV
```

**-300 mV of apparent margin against -30 mV of real margin -- the reading is 10 times too optimistic**, and
the entire difference is the -270 mV of IR drop, which is soil and not steel. A surveyor reading on potentials
would record this station as comfortably protected and move on; the corrected reading says it is -30 mV from
failing, and a seasonal drop in soil moisture will take it there.

**The polarisation is the other half of the picture and it is healthy:**

```
polarisation = -0.880 - (-0.620) = -0.260 V = -260 mV
```

**-260 mV of polarisation clears the 100 mV criterion with room to spare**, so this station satisfies both
criteria -- narrowly on one and comfortably on the other, which is a common and entirely normal result.

**One rectifier left running voids all of it.** If any source on the structure fails to interrupt, its IR drop
stays in the "instant off" reading, and the number recorded is an on potential wearing an off potential's
label -- the precise error the interrupter exists to prevent.

## 4. Scope and non-goals

A potential interpretation aid. It does not take the measurement, and the measurement is the difficult part: reference electrode placement, contact resistance, electrode calibration and contamination, synchronous interruption of every source, and the spike and decay behaviour in the first instants after interruption all decide whether the recorded instant-off value means anything. It does not address the selection of a criterion -- NACE / AMPP SP0169 recognises more than one and their applicability depends on the structure, the environment, and the presence of dissimilar metals, bacteria, or dynamic stray current, and a criterion met at a test station says nothing about the pipe between stations (`close-interval-survey-readings`). It does not evaluate overprotection and coating disbondment or hydrogen embrittlement risk at very negative potentials, address AC interference (`ac-induced-voltage-pipeline`), or convert between reference electrode types. NACE / AMPP SP0169, the operator's own procedures, and a qualified corrosion technician or engineer govern.
