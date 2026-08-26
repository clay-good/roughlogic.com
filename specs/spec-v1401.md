# roughlogic.com Specification v1401 -- Litter Carry Team Size, Rotation, and Effort (calc-field.js, Group P, field, backcountry, and SAR, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-field.js`**
> (Group P, field, backcountry, and SAR), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group P computes searcher-hours for the search phase but nothing for the extraction, which is where a search consumes most of its people. A litter carry is a staffing problem: how many carriers per litter, how many teams in rotation to sustain the pace, and what the whole thing costs in person-hours -- which is the number an incident commander uses to decide whether to call for more resources.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive distance, pace, carrier count, or rotation interval, or a duty fraction outside 0-1, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the litter-carry staffing practice (six carriers per litter with rotating teams) and the person-hour rollup used in SAR resource planning, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `litter-carry-team` -- Litter Carry Team Size, Rotation, and Effort

```
carry time      = distance / sustained pace
teams needed    = ceil(1 / duty fraction)
carriers needed = carriers per litter x teams needed
total personnel = carriers + attendants + navigation and safety
person-hours    = total personnel x carry time
rotations       = carry time / rotation interval
```

A litter takes six carriers on anything but easy ground, and six carriers cannot carry for an hour. The pace that
gets used in planning -- often under one mile per hour on moderate terrain, and far less on steep or brushy
ground -- is a *sustained* pace that already assumes rotation, so the staffing has to provide it. Two teams
alternating gives each team a 50% duty fraction, which is roughly what a long carry-out requires; a very steep or
very long carry may take three.

The person-hour total is the output that drives the radio call. A carry that looks like "an hour and a half back
to the trailhead" is, once the arithmetic is done, twenty or more person-hours -- most of a mutual-aid team --
and knowing that at the start rather than at the halfway point is the difference between a controlled extraction
and a stalled one.

**Inputs:** carry distance (mi), sustained pace (mph), carriers per litter, duty fraction per team, rotation
interval (min), attendants and support personnel.

**Outputs:** carry time, teams in rotation, carriers required, total personnel, person-hours, and number of
rotations during the carry.

## 3. Worked example

A 1.5 mile carry-out at a sustained 1.0 mph on moderate terrain, six carriers per litter, two teams alternating,
rotating every 10 minutes, with one medical attendant and one navigator:

```
carry time   = 1.5 / 1.0        = 1.5 hr = 90 min
teams        = ceil(1 / 0.50)   = 2
carriers     = 6 x 2            = 12
total people = 12 + 2           = 14
person-hours = 14 x 1.5         = 21.0
rotations    = 90 / 10          = 9 rotations
```

Fourteen people for ninety minutes, and that is the *easy* version. Steepen the ground so the sustained pace falls
to 0.5 mph and the carry time doubles to 3 hours, the person-hours double to 42, and a third team is probably
needed -- 20 people and 60 person-hours. The pace input is by far the most sensitive number in the tile, and it
is the one that gets guessed optimistically.

## 4. Scope and non-goals

A staffing estimate, not a plan. Pace on real terrain is not knowable in advance and is routinely overestimated:
technical sections, stream crossings, brush, darkness, and weather can cut it by more than half, and a
high-angle or steep-angle segment is not a carry at all -- it is a rope evolution with entirely different
staffing, which this tile does not model. It takes no position on patient care, packaging, or whether ground
extraction is the right choice compared with a helicopter hoist or short-haul. It does not account for the
personnel needed to get the teams *to* the patient, or for rest, food, and lighting on a long operation.
Incident command and the operations section chief govern.
