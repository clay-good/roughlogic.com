# roughlogic.com Specification v1574 -- Electric Strike and Maglock Power and Standby Budget (`calc-doorhardware.js`, Group A Electrical, door hardware, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-doorhardware.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; door hardware and locksmithing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Access control power supplies get sized on the number of doors and then fail on the standby battery, because inrush and standby duration are different problems from steady-state current. The arithmetic is a sum and a multiplication, and it is what stops a system that works until the power goes out.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a device count below one, a non-positive current, standby duration, or supply rating, or a battery derate outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the standby amp-hour and inrush sizing method with NFPA 72 and NFPA 101 named for the egress and alarm interface, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`access control power supply sizing`, `maglock standby battery`, `electric strike current draw`, `24 hour standby access control`, `door power budget`.

## 2. The tile

### 2.1 `electric-lock-power-budget` -- Electric Strike and Maglock Power and Standby Budget

```
steady current   I = sum of each device's holding or continuous current
inrush           strikes and maglocks draw a brief surge well above holding current
standby capacity Ah = I_standby x hours required
                 fire alarm interfaced systems often require 24 h standby plus alarm load
battery derate   size at roughly 80% of nameplate for age and temperature
voltage drop     a long run to a maglock drops voltage and the lock loses holding force
```

Three separate failures hide behind one power supply. Steady current is the easy one and the one everyone
computes. Inrush is the second: an electric strike energizing draws several times its holding current for a few
tens of milliseconds, and a supply sized on holding current alone browns out when several doors release at once
on a fire alarm signal -- which is exactly when they must all release.

Standby is the third and the most commonly wrong. Batteries are sized in amp-hours against a required duration,
and the required duration is often set by the fire alarm interface rather than by the access control system's own
needs. Sizing a battery to nameplate ignores that a battery at end of life and at low temperature delivers
considerably less, which is why a derate is applied and why battery replacement is a scheduled item rather than a
failure-driven one.

Voltage drop is the quiet one. A maglock at the end of a long small-gauge run sees less than its rated voltage
and holds with less than its rated force, and the symptom is a door that can be pulled open -- which reads as a
lock problem and is a wiring problem (`lv-dc-drop`).

**Inputs:** each device with its quantity, holding current and inrush current, the standby duration required, the battery derate factor, the power supply rating, and the wire run length and gauge for the drop check

**Outputs:** the total steady current and the peak inrush, the margin against the supply rating, the amp-hours required for the standby duration, the battery size after derate, the margin against the installed battery, and the voltage at the furthest device

## 3. Worked example

A system with 14 maglocks at 0.45 A holding each, requiring 24 hours of standby:

```
steady current = 14 x 0.45 = 6.3 A
amp-hours      = 6.3 x 24 = 151.2 Ah
with a 0.80 derate = 189.0 Ah of battery required
```

A 12 A supply covers the 6.3 A steady load comfortably. But **the battery is the problem**: 189 Ah is
far beyond the 7 or 12 Ah batteries that fit in a typical enclosure, so this system needs an external battery
cabinet or a shorter standby requirement -- and that is a design decision, not something to discover at
commissioning.

Inrush: if all 14 locks are released simultaneously on a fire alarm, the momentary demand is several times
6.3 A. A supply with no headroom for that will sag, and a sagging supply during an alarm is the worst
possible time.

Voltage drop: 0.45 A over a 300 ft run of 18 AWG drops roughly 3.9 V, so a 24 V maglock sees about 20 V and
holds with materially less than its rated force. The fix is 16 or 14 AWG, not a bigger lock.

## 4. Scope and non-goals

A load and standby calculation from device data the user supplies. Device currents, and especially inrush,
must come from the manufacturer's specifications; nameplate holding current alone will undersize a supply. It
does not address the fire alarm interface requirements, which govern both the standby duration and the manner in
which locks must release on alarm, and which are life-safety requirements rather than design choices. It does not
evaluate egress: electrically locked egress doors are heavily constrained by the building and fire codes, and a
lock that fails secure on a door required for egress is a code violation regardless of its power budget. It does
not size conductors, which is `lv-dc-drop`, or address surge protection, grounding, or the separation of Class 2
wiring. The adopted building and fire codes, NFPA 72 and NFPA 101, the device manufacturers' specifications, and
the AHJ govern.
