# roughlogic.com Specification v1476 -- Rolling-Element Bearing Defect Frequencies (`calc-millwright.js`, Group G Cross-Trade Utilities, millwrighting, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-millwright.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; millwright, rotating equipment, and pneumatics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A spalled bearing rings at frequencies that are not integer multiples of shaft speed, which is exactly why they are hard to spot and exactly why they identify the damaged part precisely. Four formulas from the bearing geometry give the outer race, inner race, ball, and cage frequencies, and the catalog computes bearing LIFE but not one of these.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a ball count below one, a non-positive ball or pitch diameter, a ball diameter at or above the pitch diameter, or a contact angle outside zero to ninety degrees returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the four kinematic bearing defect frequency relations as standard predictive-maintenance practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`bearing defect frequency`, `bpfo bpfi calculator`, `ball pass frequency`, `bearing fault frequency`, `cage frequency ftf`.

## 2. The tile

### 2.1 `bearing-defect-frequencies` -- Rolling-Element Bearing Defect Frequencies

```
cage (FTF)     = (fr/2)(1 - (d/D) cos a)
outer race     BPFO = (n/2)(1 - (d/D) cos a) fr
inner race     BPFI = (n/2)(1 + (d/D) cos a) fr
ball spin      BSF  = (D/2d)(1 - ((d/D) cos a)^2) fr
                (n balls, d ball diameter, D pitch diameter, a contact angle)
```

The physical picture is a rolling element passing a defect once per encounter. A crack in the stationary outer
race is struck by each ball as it rolls past; a crack in the rotating inner race is struck at a higher rate
because the race is moving toward the balls. That is the whole reason BPFI is above BPFO and why the ratio of a
measured peak to shaft speed identifies WHICH race has failed -- information no overall reading carries.

Two field facts make these numbers more useful than they look. The non-integer ratio is diagnostic in itself: a
peak at 3.57x running speed cannot be anything mechanical except a bearing, because nothing else in the machine
has a non-integer order. And inner-race defects produce SIDEBANDS spaced at running speed, because the defect
moves in and out of the load zone once per revolution, so a set of evenly spaced peaks around a non-integer
center is close to a positive identification. A useful approximation when the geometry is unknown: BPFO is
roughly 0.4n times shaft speed and BPFI roughly 0.6n.

**Inputs:** shaft speed, number of rolling elements, ball diameter, bearing pitch diameter, and contact angle (zero for a deep-groove ball bearing)

**Outputs:** the four defect frequencies in Hz and in orders of running speed, the inner-race sideband spacing, and the 0.4n / 0.6n approximations for comparison when the geometry is uncertain

## 3. Worked example

A 6311 deep-groove ball bearing (9 balls, 0.5906 in ball diameter, 2.8346 in pitch diameter, zero contact angle)
on a 1780 rpm shaft:

```
fr   = 29.67 Hz
FTF  = (29.67/2)(1 - 0.2084)            = 11.74 Hz  (0.396x)
BPFO = (9/2)(1 - 0.2084) x 29.67       = 105.68 Hz  (3.56x)
BPFI = (9/2)(1 + 0.2084) x 29.67       = 161.32 Hz  (5.44x)
BSF  = (2.8346/(2x0.5906))(1 - 0.0434) x 29.67 = 68.10 Hz  (2.30x)
```

A peak at 106 Hz is the outer race, 3.56 times running speed -- a number nothing else in the machine can
produce. If instead the peak sits at 161 Hz with sidebands every 29.7 Hz on both shoulders, that is the inner
race, and the sideband spacing equal to shaft speed is the confirmation. Check the rough approximation:
0.4 x 9 = 3.6x against the exact 3.56x, and 0.6 x 9 = 5.4x against 5.44x -- close enough to
search a spectrum when the bearing number is unknown.

## 4. Scope and non-goals

Frequencies from geometry for a single rolling-element bearing. These are kinematic frequencies assuming pure
rolling; real bearings slip, so measured peaks land 1 to 2% off the calculated value and a search band is
required rather than an exact match. The tile does not measure, does not assess severity, and does not stage the
failure. Early bearing damage often does not appear in a velocity spectrum at all -- it shows first in
high-frequency acceleration or envelope (demodulated) measurement, and by the time defect frequencies are
prominent in velocity the bearing is well along. Late-stage failures can lose their discrete frequencies entirely
as the defect spreads and the spectrum turns to broadband noise, so a clean spectrum is not proof of a good
bearing. Bearing life is `bearing-l10-life`. The bearing manufacturer's geometry data, a qualified analyst, and
the machine manufacturer govern.
