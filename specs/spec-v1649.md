# roughlogic.com Specification v1649 -- Elevator Counterweight Balance Percentage (`calc-elevator.js`, Group E Carpentry and Construction, elevator, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elevator.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; elevator and escalator), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A traction elevator's counterweight is set to balance the car plus a fraction of its rated load, and that fraction decides how hard the machine works empty and full. Get it wrong and the motor is oversized in one direction and struggling in the other.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive car weight or rated capacity, or an overbalance fraction outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the counterweight overbalance relation with ASME A17.1 named as governing traction and the licensed mechanic named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`elevator counterweight balance`, `overbalance percentage elevator`, `counterweight weight calculation`, `balance test elevator`, `traction ratio counterweight`.

## 2. The tile

### 2.1 `counterweight-balance` -- Elevator Counterweight Balance Percentage

```
counterweight     CWT = car weight + overbalance x rated capacity
overbalance       typically 40 to 50%; 45% is common
unbalanced load   the load the machine must drive = |car + load - CWT|
empty car up      the counterweight is heavier; the machine holds back
full car up       the car is heavier; the machine lifts
worst case        occurs at empty and at full, and a 50% overbalance makes them equal
traction          the ratio of tensions either side must stay within what the sheave grooves hold
```

The overbalance fraction is a compromise between the two worst cases. At 50 percent the empty-car and full-car
unbalanced loads are equal in magnitude and the machine sees the same demand in both directions -- which is
efficient. Below 50 percent the full-car case governs and the machine works hardest lifting a full car up; above
it, the empty case governs. Forty to forty-five percent is common because a full car going up is the loading that
matters for comfort and because it keeps traction favourable.

Traction is the constraint that bounds it. A traction machine drives the ropes by friction in the sheave grooves,
and the ratio of the tension on the two sides has to stay within what the groove profile and the wrap angle can
hold. Too much counterweight or too little, and the ropes slip -- which on an elevator is a serious event and is
why traction calculations accompany any counterweight change.

The field consequence of getting it wrong is diagnostic. A car that runs well loaded and struggles empty, or the
reverse, is reporting its balance. Weighing the counterweight -- or running a balance test by loading the car
until the machine draws the same current in both directions -- is how it is established, and it is the check that
follows any change to the car: new flooring, new fixtures, a heavier door operator.

**Inputs:** car weight, rated capacity, the overbalance fraction, the counterweight actual weight, the rope weight and travel, and the compensation type where fitted

**Outputs:** the counterweight required at the entered overbalance, the unbalanced load with the car empty and with the car full, the worst-case unbalanced load, the overbalance implied by an actual counterweight, and the load at which the system is in balance

## 3. Worked example

A car weighing 8,000 lb with a 3,500 lb rated capacity at 45% overbalance:

```
CWT = 8,000 + 0.45 x 3,500 = 8,000 + 1,575 = 9,575 lb
```

The two worst cases:

```
empty car:  |8,000 + 0 - 9,575|      = 1,575 lb unbalanced (counterweight heavier)
full car:   |8,000 + 3,500 - 9,575| = 1,925 lb unbalanced (car heavier)
```

**The full-car case governs** at 1,925 lb against 1,575 lb -- which is what a
45% overbalance buys. At 50 percent the two would be equal at 1,750 lb each, and the machine would
see the same demand either way.

The balance point: the system is in balance when the car carries `9,575 - 8,000` = 1,575 lb, which
is 45% of rated capacity. That is the load at which a balance test shows equal current up and
down, and it is how the actual overbalance is measured rather than assumed.

The maintenance trap: replacing the car's flooring with something 400 lb heavier moves the balance point to
34% of capacity without anyone touching the counterweight, and the machine now works harder
lifting a full car than it was designed to.

## 4. Scope and non-goals

A balance calculation for a traction elevator. It does not evaluate traction -- the ratio of tensions the sheave
grooves can hold, which depends on groove profile, wrap angle, rope condition and lubrication, and which is a
required check under ASME A17.1 whenever counterweight or rope arrangement changes. It does not account for
compensation ropes or chains, which offset the changing rope weight over the travel and which materially affect
the loading on tall rises. It does not size the machine, motor, or brake, evaluate the drive, or address the
counterweight's own guide rails, safeties, and clearances. It does not address hydraulic elevators, which have no
counterweight. Elevator work is a licensed trade and the equipment is life-safety: ASME A17.1 and A17.2, the
equipment manufacturer's data, the state or local elevator authority, and a licensed elevator mechanic govern.
