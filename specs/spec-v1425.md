# roughlogic.com Specification v1425 -- Elevator Round-Trip Time, Interval, and Handling Capacity (calc-construction.js, Group E, specialty trades, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, specialty trades), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Elevators are absent from the catalog entirely, and the question every developer, architect, and tenant improvement asks -- how many cars does this building need -- has one classical answer: round-trip time, from which interval and handling capacity both follow. The arithmetic is public, the inputs are all building geometry, and nothing in the catalog touches it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive rise, car speed, capacity, stop time, or transfer time, or a car count below one, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the classical round-trip-time traffic analysis (rise, probable stops, and passenger transfer time) and the conventional handling-capacity and interval targets by building type, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `elevator-handling-capacity` -- Elevator Round-Trip Time, Interval, and Handling Capacity

```
RTT      = 2 x rise / car speed + (probable stops + 1) x stop time + 2 x passengers x transfer time
interval = RTT / number of cars
HC per car = 300 x passengers per trip / RTT      (persons per 5 minutes)
HC total = HC per car x cars
HC percent = HC total / building population x 100
```

Round-trip time is the sum of three things, and knowing their relative sizes is most of the insight. The
**travel** term is the round trip at rated speed. The **stopping** term is the number of stops the car probably
makes times the time each stop costs -- door open, dwell, close, accelerate, decelerate -- and on a typical office
run it is the *largest* of the three. The **transfer** term is passengers boarding and alighting.

Because stopping dominates, faster cars help far less than people expect. A car that spends 40 seconds travelling
and 80 seconds stopping does not get much better with a higher rated speed; it gets better with faster doors,
shorter dwell, and above all fewer stops -- which is what zoning a tall building into low-rise and high-rise banks
accomplishes, and why it is the standard move.

Two outputs matter and they measure different things. **Interval** is the average wait, and it is what a tenant
notices: under about 30 seconds is good office service, over 40 generates complaints. **Handling capacity** is
throughput in the five-minute peak, expressed as a percentage of the building population, and 12% to 15% is the
conventional office target.

**Inputs:** rise (ft), car rated speed (fpm), passengers per trip, probable stops, time per stop, passenger
transfer time, number of cars, building population.

**Outputs:** the three RTT components and the total, interval, handling capacity per car and total, handling
capacity as a percentage of population, and the car count needed to meet a target interval.

## 3. Worked example

A ten-story building, 12 ft floors (120 ft rise), cars at 350 fpm carrying 12 passengers, 7 probable stops at
10 s each, 1.2 s per passenger transfer, 3 cars, 500 occupants:

```
travel   = 2 x 120 / 5.83        = 41.2 s
stopping = (7 + 1) x 10          = 80.0 s
transfer = 2 x 12 x 1.2          = 28.8 s
RTT      = 149.9 s
interval = 149.9 / 3             = 50.0 s
HC/car   = 300 x 12 / 149.9      = 24.0 persons per 5 min
HC total = 72.0 = 14.4% of 500 occupants
```

Handling capacity passes at 14.4% and interval fails badly at 50 seconds -- the building can move the people, it
just makes them wait to do it. Meeting a 30 second interval takes 5 cars, not 3. Note what a faster car would buy:
doubling rated speed to 700 fpm cuts only 20.6 s off a 150 s round trip, taking the 3-car interval from 50 s to
43 s. Still failing. The stops are the problem, and zoning or faster doors are the answer.

## 4. Scope and non-goals

A single-zone, up-peak traffic analysis using assumed probable stops, which is the classical hand method and not
what a modern consultant uses. Real analysis simulates the traffic pattern, computes probable stops from the
population distribution across floors, handles down-peak and interfloor traffic (which govern in many buildings),
and models destination-dispatch control, which changes the answer substantially. Stop time and transfer time are
building-and-equipment specific. The tile does not size hoistways, machine rooms, or power, address firefighter
service, standby power, or the accessibility requirements that govern car dimensions and controls, and it is not
a substitute for the elevator consultant's study or the code-required capacity. ASME A17.1, the elevator
consultant, and the AHJ govern.
