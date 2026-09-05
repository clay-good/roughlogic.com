# roughlogic.com Specification v1734 -- Stored Energy Bleed-Down Time and Verification (`calc-cross.js`, Group G Cross-Trade Utilities, industrial hygiene, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; industrial hygiene and safety), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Locking out a disconnect does not make a circuit safe if something in it stores energy, and a capacitor bank, an accumulator, or a raised load can all injure someone after the power is off. Bleed-down time is a calculation and verification is a measurement.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive capacitance, resistance, or initial voltage, or a target voltage at or above the initial returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the RC discharge relation with 29 CFR 1910.147 and NFPA 70E named as governing verification, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`stored energy bleed down`, `capacitor discharge lockout`, `vfd dc bus wait time`, `accumulator stored energy loto`, `verify de-energized state`.

## 2. The tile

### 2.1 `stored-energy-bleed-down` -- Stored Energy Bleed-Down Time and Verification

```
capacitive         V(t) = V0 exp( -t / RC );  five time constants to about 1%
                   NEC 460.6 requires capacitors to discharge to 50 V in a stated time
hydraulic          an accumulator holds pressure indefinitely; it must be bled, not
                   merely isolated
mechanical         a raised load, a spring, or a flywheel stores energy that isolation
                   does not remove
thermal, chemical  hot surfaces and residual process material are stored energy too
verification       the requirement is to VERIFY the de-energized state by test, not to
                   wait a calculated interval
drive DC bus       variable frequency drives hold a charged DC bus after disconnection;
                   the manufacturer states the wait time and it is often minutes
```

The calculation gives an expectation and the regulation requires a measurement, and the difference is the point.
An RC bleed-down says how long a capacitor should take to discharge, but a failed bleed resistor -- which is a
component that fails open silently -- means the capacitor holds its charge indefinitely and the calculated time
tells you nothing. That is why lockout procedure requires verifying the absence of voltage with a tester that has
itself been proven on a known source before and after.

Variable frequency drives are the case that catches electricians most often. A drive's DC bus holds a lethal
charge after its input is disconnected, the discharge takes minutes rather than seconds, and the drive's cover
carries a warning stating the wait time. Opening a drive on the assumption that an isolated circuit is a dead
circuit is a recognized fatality mechanism.

The non-electrical forms are the ones lockout programs handle least well. A hydraulic accumulator holds full
system pressure after the pump stops and will drive a cylinder when a valve is touched; a raised platform or a
counterweight falls when its holding mechanism is released; a flywheel or a fan coasts for minutes. Isolating the
energy SOURCE does not release energy already stored, and the procedure has to include the bleed, the block, or
the lowering as an explicit step.

Thermal and chemical residuals belong on the same list and are routinely omitted from lockout procedures
entirely.

**Inputs:** the capacitance and bleed resistance or the manufacturer stated wait time, the initial and target voltages, the drive or equipment type, and the other stored energy sources present

**Outputs:** the time constant, the voltage at any stated time, the time to reach a target voltage and to reach 50 V, the manufacturer wait time for comparison, and a checklist of the other stored energy forms the equipment may hold

## 3. Worked example

A capacitor bank of 1200 microfarads with a 50 kilohm bleed resistor, charged to 600 V:

```
time constant = 50k x 1200uF = 60.0 seconds
to 50 V:  t = 60.0 x ln(600/50) = 60.0 x 2.48 = 149 seconds
```

**149 seconds** to reach 50 V, against the NEC's stated requirement.

**But that assumes the bleed resistor works.** A bleed resistor is a component that fails OPEN silently -- there
is no symptom, nothing indicates it, and the capacitor then holds its charge indefinitely. The calculated
149 seconds tells you nothing about a bank whose bleed path has failed.

Which is why the requirement is to **verify the absence of voltage by test**, with a tester proven on a known
live source immediately before and immediately after the reading. The calculation says what to expect; the meter
says what is true.

**The VFD case.** A drive's DC bus holds a lethal charge after its input disconnect is opened, and the discharge
takes minutes -- the wait time is on the drive's cover. An electrician who locks the disconnect and immediately
opens the drive has locked out the source and walked into the stored energy.

**And the non-electrical forms** that a lockout procedure has to address explicitly:

```
hydraulic accumulator -- holds full pressure after the pump stops; must be bled
raised load           -- falls when its holding device is released; must be lowered or blocked
spring, flywheel      -- must be released or allowed to stop
thermal, chemical     -- hot surfaces and residual process material
```

Isolating the source does not release stored energy. Each form is a separate step in the procedure, and the
verification is a test rather than a wait.

## 4. Scope and non-goals

A discharge calculation. It is an expectation, not a verification: 29 CFR 1910.147 requires the authorized
employee to verify that the equipment has been isolated and de-energized, and for electrical work NFPA 70E
requires testing for the absence of voltage with an adequately rated tester proven immediately before and after
on a known source. A calculated bleed-down time does not satisfy either. Manufacturer stated wait times for
drives and other equipment govern over any calculation. It does not enumerate the stored energy sources present
on specific equipment, which is what the equipment-specific lockout procedure must do, and it does not address
the rest of the lockout program: procedures, devices, authorized and affected employee training, group lockout,
shift transfer, and periodic inspection. Stored energy releases kill people after the power is off: 29 CFR
1910.147, NFPA 70E, the equipment manufacturer's instructions, and the employer's energy control procedure
govern.
