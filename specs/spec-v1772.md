# roughlogic.com Specification v1772 -- Close-Interval Survey Reading Count and Duration (`calc-corrosion.js`, Group E Carpentry and Construction, cathodic protection and corrosion control, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-corrosion.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Test stations sample a pipeline every mile or two; a close-interval survey samples it every few feet, and that is the difference between knowing the line is protected and knowing that eleven specific stations are. The reading count is what makes the survey expensive, and the spacing that sets it is a detection decision.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive survey length, reading interval, spool length, or production rate, or a reading interval at or above the survey length returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the close-interval survey convention and its reading-interval practice with NACE / AMPP SP0169 and the applicable pipeline safety regulations named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`close interval survey`, `cis reading count pipeline`, `on off potential survey`, `pipeline survey production rate`, `cis wire spool setups`.

## 2. The tile

### 2.1 `close-interval-survey-readings` -- Close-Interval Survey Reading Count and Duration

```
readings         count = survey length / reading interval; 2.5 ft is common and
                 some operators and regulators specify closer
data points      an on/off survey records TWO potentials at every station, so the
                 data volume is twice the reading count
trailing wire    the survey is referenced to a test station through a wire spool;
                 the spool length sets how far one setup can run
setups           spool reconnections = survey length / usable spool length, rounded
                 up, and each one is a stop
production       field production is the governing constraint, typically a few miles
                 per crew-day depending on terrain, access, and paving
why close        a coating holiday produces a LOCAL potential dip; a 2.5 ft interval
                 finds it and a test station a mile away cannot
the point        the survey's value is the profile between the test stations, which
                 is the part no other measurement sees
```

A test station tells you about a test station. Cathodic protection criteria are written about the structure,
and a structure is protected or not protected at every point along it, so a programme built on stations a mile
or two apart is inferring the condition of thousands of feet of pipe from a handful of samples. Nothing is
wrong with that inference when the coating is uniform; it fails precisely where the coating is not, which is
the case the survey exists to find.

The interval is chosen for detection, not for data. A coating holiday draws current locally and depresses the
potential over a short distance, and an interval wider than that feature steps straight over it. Halving the
interval doubles the reading count, doubles the data, and roughly doubles the field time, and the justification
is entirely about the smallest feature the operator intends to be able to see.

Production is what the survey actually costs and it is set by the ground, not by the meter. A crew walking
open right-of-way in good weather covers ground quickly; the same crew in a city, crossing paved streets,
working around access agreements, and reconnecting the wire at every spool length, does not. The reading count
sizes the data management and the reporting; the terrain sizes the schedule and the invoice.

**Inputs:** the survey length, the reading interval, whether an on/off survey is being run, the usable wire spool length, the crew production rate, and the time per reading

**Outputs:** the reading count, the total data points recorded, the number of wire spool setups, the field days at the entered production rate, the pure reading time, and the reading count at an alternative interval

## 3. Worked example

A 10 mile survey at a 2.5 ft interval:

```
length   = 10 x 5,280 = 52,800 ft
readings = 52,800 / 2.5 = 21,120 stations
data     = 21,120 x 2 (on and off) = 42,240 potentials
```

**21,120 readings on ten miles of pipe.** For comparison, the same ten miles with test stations at one-mile
centres yields **11 readings** -- and the survey's whole value is the 21,109 readings in between, because that is
where a coating holiday lives and where nothing else looks.

**The wire spool sets the rhythm of the work:**

```
setups = 52,800 / 5,000 ft spool = 10.56 -> 11 reconnections
```

**11 stops to re-reference the survey**, each one a walk back to a test station and a fresh spool run, which
is a schedule item rather than a data item.

**The schedule is set by the ground.** At 2.5 miles per crew-day:

```
field time = 10 / 2.5 = 4 days
```

**against 8.8 hours of actual reading** at 1.5 seconds a station. The meter is busy 28 percent of the field
time; the rest is walking, access, wire, and terrain -- which is why production rate, not reading rate, is the
number to quote a survey from.

**Doubling the interval halves everything and buys the wrong saving.** At 5.0 ft the count falls to 10,560
readings and the field time roughly halves. **It also steps over half the holidays**, and a survey that misses
the feature it was commissioned to find has not saved money -- it has bought a clean report on an
unprotected line.

## 4. Scope and non-goals

A quantity and duration estimate for planning. It does not conduct or interpret the survey: reference electrode contact and placement, synchronous interruption of every current source on the structure (`instant-off-ir-drop`), electrode calibration, the correction for IR drop, and the identification of which dips are coating holidays rather than measurement artefacts are the substance of the work and none of them are arithmetic. Production rates vary enormously with terrain, paving, access agreements, weather, and crew experience, and the figure entered here carries the whole schedule estimate. It does not address the survey's interaction with foreign structures, casings, or river crossings, where a close-interval survey is least reliable, nor does it address direct-current voltage-gradient or alternating-current voltage-gradient surveys, which are different techniques answering a different question about coating condition. It does not establish the required survey interval, which may be set by regulation for a regulated pipeline. NACE / AMPP SP0169 and the close-interval survey standards, the applicable pipeline safety regulations, the operator's own procedures, and a qualified corrosion technician govern.
