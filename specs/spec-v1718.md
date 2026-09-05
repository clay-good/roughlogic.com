# roughlogic.com Specification v1718 -- Visible Emission Opacity Six-Minute Average (`calc-airquality.js`, Group G Cross-Trade Utilities, air quality, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-airquality.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; air quality and environmental), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Visible emission limits are written as a six-minute average of readings taken every fifteen seconds, and a plume that is briefly dark can comply while one that is persistently faint does not. The averaging is the whole rule and it is what a certified observer is trained to do.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: fewer than the required readings in a block, a reading outside zero to one hundred percent, or an observation outside the method conditions returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): EPA Method 9 and the six-minute averaging convention by name with the applicable permit limit named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`method 9 opacity`, `six minute average opacity`, `visible emission observation`, `20 percent opacity limit`, `certified opacity observer`.

## 2. The tile

### 2.1 `opacity-six-minute` -- Visible Emission Opacity Six-Minute Average

```
observation       readings at 15-second intervals; 24 readings make a six-minute average
average           the arithmetic mean of the 24 readings in the block
limit             commonly 20% opacity with a short-duration exception in many rules
exceptions        many standards allow one six-minute period per hour at a higher opacity
observer          must be certified to EPA Method 9, recertified semiannually
conditions        sun position, background, wind, and plume distance are all specified
                  by the method and a reading taken outside them is not valid
```

The six-minute block is what makes a short puff and a steady haze different findings. A soot blow that produces
a very dark plume for thirty seconds contributes two readings to a block of twenty-four, and the average can
remain in compliance; a faint plume that never clears contributes twenty-four readings at a lower value and can
exceed the same limit. Operators who watch the stack and judge by the worst moment consistently misread which
condition is a violation.

Method 9's observation conditions are as binding as the arithmetic. The observer stands at a specified distance
with the sun in a specified sector behind them, reads against a contrasting background, and records the
conditions -- and a reading taken with the sun in the wrong quadrant, or against a bright sky, or through a plume
at the wrong angle is not a valid reading regardless of what the observer saw. That is why an operator's own
observation is not equivalent to a certified reading and why enforcement readings are taken by certified
observers.

Certification matters and it lapses. Observers are certified against a smoke generator and must recertify on a
semiannual cycle, because the human eye's ability to judge opacity drifts without calibration -- which is an
unusual and honest admission built into a regulatory method.

**Inputs:** the individual readings at 15-second intervals, the applicable opacity limit and any short-duration exception, the observation conditions, and the observer certification date

**Outputs:** the six-minute average for each block, each against the limit, the number of blocks exceeding it, the highest block and its time, whether any short-duration exception applies, and a flag where the observation conditions or the observer certification fall outside the method

## 3. Worked example

A six-minute block of 24 readings taken at 15-second intervals:

```
readings: 5,5,10,10,45,60,55,20,10,5,5,5,5,10,5,5,5,5,5,10,5,5,5,5
sum = 300
average = 300 / 24 = 12.5% opacity
```

**12.5 percent against a 20 percent limit -- compliant**, despite four consecutive readings at 45 to 60 percent
during a soot blow. The dark plume was real and the block complies.

Now a steady haze:

```
readings: 24 readings all at 22%
average = 22% -> EXCEEDS the 20% limit
```

Never as dark as the first case at any instant, and a violation. **An operator judging by the worst moment gets
both of these backwards.**

The conditions that make a reading valid at all: the observer at the specified distance, sun within the specified
sector behind them, a contrasting background, the plume read at the point of greatest opacity after the steam
has dissipated where a condensed plume is present. A reading taken looking into the sun, or against a bright
overcast, is not a Method 9 reading.

And the observer's certification: valid for six months from a smoke-generator test. An expired certification
invalidates the observation, which is why enforcement readings and compliance demonstrations are scheduled around
recertification rather than around convenience.

## 4. Scope and non-goals

An averaging calculation. Method 9's observation procedure, the required conditions, the data form, the
observer certification requirements, and the applicable opacity limits and exceptions are set by 40 CFR Part 60
Appendix A and by the applicable standard or permit -- and the limit, the averaging period, and the exceptions
vary between rules. It does not perform an observation, and readings taken by an uncertified observer or outside
the method's conditions are not valid for compliance purposes. It does not address continuous opacity monitoring
systems, which have their own certification, calibration, and data availability requirements and which produce
data on a different basis. It does not address the relationship between opacity and mass emissions, which is
indirect and source-specific. EPA Method 9, the applicable standard and permit conditions, and the permitting
authority govern.
