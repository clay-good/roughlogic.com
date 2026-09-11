# roughlogic.com Specification v1768 -- Stray Current Interference and Mitigation Bond (`calc-corrosion.js`, Group E Carpentry and Construction, cathodic protection and corrosion control, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-corrosion.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A rectifier protecting one structure can drive current onto a neighbouring one, and where that current leaves the foreign structure it corrodes it. `cathodic-anode-count-life` says in its own scope that it does not evaluate interference; a resistance bond is the usual remedy and it has to be sized, not simply installed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive potential difference or solid-bond current, a target current at or above the solid-bond current, or a computed resistor value below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ohmic bond relation and the interference-test convention with NACE / AMPP SP0169 and a joint interference test named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`stray current interference`, `mitigation bond resistor`, `foreign structure interference cp`, `interference testing pipeline`, `resistance bond sizing cathodic`.

## 2. The tile

### 2.1 `stray-current-bond` -- Stray Current Interference and Mitigation Bond

```
the mechanism    current from one structure's anode bed picks up on a foreign
                 structure, runs along it, and DISCHARGES back to earth somewhere
                 else; the discharge point is where metal is lost
the signature    a foreign structure shifts POSITIVE (less negative) at the discharge
                 point when the interfering rectifier is switched on
the test         interrupt the suspect rectifier and watch the foreign structure;
                 the swing is the interference
solid bond       connect the two structures with a heavy conductor and measure the
                 current that flows: I_solid = dV / R_circuit
resistance bond  to limit the bond to a chosen current, add resistance:
                 R_total = dV / I_target, so R_resistor = R_total - R_circuit
resistor power   P = I^2 R; a bond resistor is a real dissipating component and is
                 sized with margin
verification     the bond is correct only when BOTH structures meet criterion with
                 it in place (`instant-off-ir-drop`)
```

Interference is a pickup-and-discharge problem and the damage happens at the discharge. Current entering a
foreign structure does no harm -- entering current is cathodic protection, however unintentional. The harm is
at the point where the current leaves the metal to return to earth, because leaving current is oxidation, and
it is concentrated wherever the exit path is easiest. A crossing, a coating holiday, or a bare fitting can
therefore take a perforation in months while the rest of the structure looks fine.

The bond works by offering the current a metallic path home instead of an electrolytic one. Current that would
have discharged through the soil at a holiday runs through the bond conductor instead, and no metal is
consumed on the way. That is the whole mechanism, and it is why a bond is a conductor and not a coating
repair.

A bond can easily be wrong in either direction, which is the argument for sizing it. Too much current through
the bond drags the foreign structure's protection off, or overprotects it and disbonds its coating; too little
leaves part of the interference undrained. The solid-bond measurement establishes the circuit resistance and
the resistor then sets the operating point -- and because both structures must satisfy their criteria with the
bond in service, the sizing is verified by measurement rather than accepted on calculation.

**Inputs:** the potential difference between the structures, the current measured through a temporary solid bond, the target bond current, the interference shift observed on the foreign structure, and the conductor and lead resistances

**Outputs:** the total circuit resistance from the solid-bond test, the resistance required for the target current, the resistor value to add, the power the resistor must dissipate, and the recommended resistor rating with margin

## 3. Worked example

A foreign pipeline crossing shifts 250 mV positive when the interfering rectifier is energised -- the
signature of current discharging from it. A temporary solid bond is installed and measured:

```
dV across the bond points (open circuit) = 0.45 V
I through the solid bond                 = 8.5 A
R_circuit = 0.45 / 8.5 = 0.0529 ohms
```

**A solid bond drains 8.5 A, which is more than this crossing needs** and drags the foreign structure toward
overprotection. Limiting it to 3.0 A:

```
R_total    = 0.45 / 3.0 = 0.1500 ohms
R_resistor = 0.1500 - 0.0529 = 0.0971 ohms
```

**A 0.097 ohm resistor in the bond.** That is a small, deliberate value -- a bond resistor is typically a
fraction of an ohm, and it is a fabricated or selected component rather than anything off a shelf of ordinary
resistors.

**It has to dissipate real power:**

```
P = 3.0^2 x 0.0971 = 0.87 W
```

**0.9 W continuously.** A resistor rated at several times that -- a 5 or 10 W unit in a ventilated test
station -- is the correct selection, because a bond resistor runs every hour of every year and a component
sized at its dissipation will not last.

**The number that matters is not the resistor, it is the retest.** With the bond in place, both structures
must be re-surveyed and both must meet criterion: the protected line must not have lost output to the bond,
and **the foreign line's 250 mV positive shift must be gone at the discharge point.** A bond that
satisfies the arithmetic and leaves the foreign structure still discharging has moved the problem rather than
fixed it, and only the survey can tell the difference.

## 4. Scope and non-goals

A bond sizing aid built on field measurements. It does not locate the interference or identify the discharge point, which is found by interruption testing, potential surveys along the foreign structure, and current-flow measurements -- and the discharge point, not the crossing, is what must be surveyed. It assumes a simple two-structure circuit with a single interference source; real congested corridors involve several structures, several rectifiers, and mutual effects that require a joint interference committee and a coordinated test rather than a calculation. It does not address dynamic stray current from transit systems, mining, or high-voltage direct-current earth returns, which varies continuously and is not mitigated by a fixed resistance bond, nor does it address AC interference (`ac-induced-voltage-pipeline`). It does not design the bond hardware, the test station, the conductor sizing, or the surge protection a bond across an insulating joint may need, and it takes no position on the ownership, access, and agreement questions that govern a bond between two operators' assets. NACE / AMPP SP0169 and the interference-testing standards, a joint interference test with the affected operator, and a qualified corrosion engineer govern.
