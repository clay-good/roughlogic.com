# roughlogic.com Specification v1729 -- Day-Night Average Sound Level (Ldn and CNEL) (`calc-airquality.js`, Group G Cross-Trade Utilities, air quality, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-airquality.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; air quality and environmental), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Community noise limits are usually written as a day-night average that adds ten decibels to every night-time hour, so an event at 2 a.m. counts as ten events at 2 p.m. That penalty is what makes night work the compliance problem it is.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a negative sound level or hour count, or hours not summing to twenty-four returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Ldn and CNEL definitions with their night and evening penalties, and the applicable noise ordinance named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`ldn day night average`, `cnel noise`, `night noise penalty 10 db`, `community noise limit`, `energy average sound level`.

## 2. The tile

### 2.1 `community-noise-ldn` -- Day-Night Average Sound Level (Ldn and CNEL)

```
Ldn               the 24-hour A-weighted average with a 10 dB penalty applied to
                  hours between 10 p.m. and 7 a.m.
CNEL              a California variant adding a 5 dB penalty to evening hours as well
energy averaging  levels are averaged on an energy basis, so a loud short event
                  contributes more than an arithmetic average suggests
night penalty     10 dB is a factor of ten in energy; one night hour equals ten day hours
consequence       a compliant daytime operation becomes non-compliant by moving hours
                  into the night with no change in equipment or level
limits            typically 55 to 65 Ldn depending on the land use and the ordinance
```

The ten-decibel night penalty is the single most consequential feature and it is a factor of ten in energy, not
a modest adjustment. Moving an operation from 6 p.m. to 11 p.m. multiplies its contribution to the daily average
by ten -- so an operation comfortably compliant on a day shift can be well over the limit on a night shift with
identical equipment, identical levels, and identical duration. That is why noise complaints and permit conditions
so often turn on hours of operation rather than on equipment.

Energy averaging is the other feature that defeats intuition. Sound levels average logarithmically, so a single
loud hour dominates a day of quiet ones: an hour at 80 dB among twenty-three at 50 dB produces a daily average
much closer to 66 than to 51. That means the peak activity, not the typical one, drives compliance, and reducing
the average by shortening the loud activity works far better than reducing many quiet hours.

The practical lever that follows is scheduling. Because both features -- the night penalty and the energy
averaging -- concentrate the impact in a few hours, moving the noisiest activity out of the night and shortening
it is usually far more effective and far cheaper than any noise control on the equipment. A barrier
(`noise-barrier-insertion-loss`) buys a fixed number of decibels; moving an activity out of the penalty window
buys ten.

**Inputs:** the hourly A-weighted equivalent levels or the levels and durations of each activity, the day and night hour definitions, the applicable Ldn or CNEL limit, and the land use category

**Outputs:** the day and night energy averages, the Ldn with the night penalty applied, the CNEL where evening hours are entered, the result against the limit, the contribution of each activity to the total, and the Ldn if a stated activity is moved out of the night hours

## 3. Worked example

An operation running a 78 dB activity for two hours, with a 48 dB background the rest of the day.

**Case 1, both hours during the day:**

Energy-averaging 2 hours at 78 and 22 at 48 gives a daily Leq around 68 dB, and with no night activity the Ldn is
close to that.

**Case 2, the same two hours moved to 11 p.m. and midnight:**

Those two hours now carry a 10 dB penalty, so they enter the average as 88 dB:

```
the two penalized hours contribute ten times the energy they did before
```

The Ldn rises by roughly 8 to 9 dB -- **from about 68 to about 77** -- with no change in equipment, level, or
duration. Against a 65 Ldn limit, case 1 is marginal and case 2 is a clear violation.

**That is the whole story of night work.** The ten decibels is a factor of ten in energy, so an hour at night is
ten hours in the day, and no practical noise control recovers it.

**And the energy averaging** means the loud activity dominates regardless. Twenty-two hours at 48 dB contribute
almost nothing to a day containing two hours at 78 -- so reducing the background is wasted effort and shortening
the loud activity is the lever. Cutting the noisy work from two hours to one lowers the average by 3 dB, which is
more than most equipment treatments deliver.

## 4. Scope and non-goals

An averaging calculation. The definitions of day, evening, and night hours, the penalties applied, the metric
required (Ldn, CNEL, Leq over a stated period, or L-percentile levels), and the applicable limits are set by the
local noise ordinance or by the applicable federal or state program, and they vary substantially -- the governing
ordinance's own definitions must be used. It does not measure sound levels, which requires a calibrated
sound level meter, appropriate microphone placement, and attention to background and weather conditions, or
predict them from a source. It does not address the tonal, impulsive, and low-frequency penalties that many
ordinances add, or the separate limits some apply to specific sources. It does not address vibration, which is
regulated separately. The applicable noise ordinance, the measurement standard it references, and an acoustical
consultant govern.
