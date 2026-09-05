# roughlogic.com Specification v1653 -- Elevator Machine Room Heat Load and Cooling (`calc-elevator.js`, Group E Carpentry and Construction, elevator, 1 New Tile)

> **Status: LANDED 2026-09-05. Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elevator.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; elevator and escalator), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An elevator machine room gets hot because the drive and the machine dump their losses into it, and a room that exceeds the equipment's temperature limit shuts the elevator down. The heat load is the losses, not the connected load, and cooling it is not optional in most installations.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive input power, an efficiency outside zero to one, or a duty cycle outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the loss-based heat rejection relation with ASME A17.1 and the equipment manufacturer environmental limits named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`elevator machine room cooling`, `machine room heat load`, `drive heat rejection elevator`, `machine room temperature limit`, `elevator shutdown overheating`.

## 2. The tile

### 2.1 `machine-room-heat` -- Elevator Machine Room Heat Load and Cooling

```
machine and drive heat  Q = input power x (1 - efficiency), converted to BTU/h
duty cycle              elevators run intermittently; use the average over the peak hour
other sources           controller standby, lighting, transformers, and solar through walls
                        and roof
temperature limits      equipment manufacturers commonly specify a maximum around
                        90 to 104 degF and a minimum above freezing, with humidity limits
consequence             over temperature shuts down drives, and a shutdown with passengers
                        aboard is an entrapment
```

The heat is the inefficiency, which makes it a smaller number than people expect but a persistent one. A drive
and machine at 85 percent efficiency converting 15 kW puts about 7,700 BTU/h into the room while running, and
because elevators run intermittently the average over a peak hour is what a cooling system has to remove -- but
the peak-hour average in a busy building is a substantial fraction of the running figure.

The consequence of exceeding the limit is specific and bad. Modern drives monitor their own temperature and shut
down to protect themselves, and an elevator that shuts down mid-trip is an entrapment requiring a rescue. That is
why machine room cooling in most jurisdictions is a required system rather than a comfort provision, and why it
is often required to be on emergency power alongside the elevator itself.

The sources beyond the machine are what get left out. A machine room on a roof with a west-facing wall and no
insulation gains solar heat through the envelope that can exceed the equipment's own contribution; the controller
draws standby power continuously even when the car is parked; and a room shared with other equipment inherits its
heat too. A cooling load computed from the machine alone will be short.

**Inputs:** machine and drive input power and efficiency, the duty cycle over the peak hour, controller standby power, lighting, envelope gains, the room volume, and the equipment temperature limits

**Outputs:** the heat rejected by the machine and drive while running, the average over the entered duty cycle, the total room heat load including the other sources, the cooling capacity required in BTU/h and tons, and the room temperature rise if cooling is lost

## 3. Worked example

A machine and drive drawing 15 kW at 85% efficiency:

```
heat while running = 15 x (1 - 0.85) x 3,412 = 7,677 BTU/h
```

At a 40 percent duty cycle over the peak hour:

```
average = 7,677 x 0.40 = 3,071 BTU/h
```

Add controller standby of 400 W (1,365 BTU/h), lighting, and envelope gains, and a machine room on a roof
in summer can easily reach 10,436 BTU/h -- roughly
0.9 tons of cooling for one elevator.

**The failure mode is an entrapment.** If cooling is lost, the room heats until the drive's thermal protection
operates and shuts the elevator down -- possibly with passengers aboard. That is why machine room cooling is
commonly required to be a dedicated system and, in many jurisdictions, on standby power with the elevator.

The sizing trap: computing this from the machine's connected 15 kW rather than its losses would give
51,180 BTU/h, 6.7 times too high, and buy a cooling unit several times larger than needed.
Computing it from the machine alone and ignoring the envelope and controller goes wrong in the other direction.

## 4. Scope and non-goals

A heat load estimate from equipment data the user supplies. Machine and drive efficiency vary with load and
speed, and regenerative drives return energy to the supply rather than dissipating it, which changes the room load
substantially -- manufacturer heat rejection data for the specific equipment is the authority. Duty cycle must
reflect the building's actual traffic; a peak-hour figure from a traffic analysis is what a cooling design needs.
It does not compute envelope gains, which require a load calculation, or size the cooling equipment. It does not
address the code requirements for machine room ventilation, temperature and humidity limits, standby power for the
cooling system, or the prohibition on running unrelated piping and equipment through a machine room -- all of
which the adopted elevator and building codes set. Machine room over-temperature causes entrapments: ASME A17.1,
the equipment manufacturer's environmental limits, the adopted building code, and the elevator authority having
jurisdiction govern.
