# roughlogic.com Specification v1504 -- Continuous vs Cavity Insulation Ratio for Condensation Control (`calc-buildingperf.js`, Group C HVAC, building performance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-buildingperf.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; building performance and envelope diagnostics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** The energy code lets a wall use less continuous exterior insulation only if the assembly still keeps its sheathing above the dew point. That is a ratio -- exterior R over total R -- and checking a proposed assembly against the required ratio for the climate zone is the compliance question this arithmetic answers.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive cavity or continuous R-value, or a required ratio outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the IECC continuous-insulation ratio concept for condensation control by name, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`continuous insulation ratio`, `ci ratio climate zone`, `exterior foam minimum r`, `condensation control ratio`, `ratio of ci to cavity`.

## 2. The tile

### 2.1 `continuous-insulation-ratio` -- Continuous vs Cavity Insulation Ratio for Condensation Control

```
ratio            r = R_continuous_exterior / R_total_insulation
required ratio   from climate zone; rises with severity
                 roughly 0.20 in zone 4, 0.27 in zone 5, 0.36 in zone 6, 0.44 in zone 7
minimum exterior R_ci,min = r_req x R_cavity / (1 - r_req)
alternative      a Class I or II vapor retarder in lieu, where the code permits it
```

The required ratio is nothing but the dew point calculation from `vapor-retarder-dewpoint` solved once per
climate zone at assumed indoor conditions and turned into a table a plans examiner can use. It rises with climate
severity because a colder outdoor design temperature pulls the sheathing colder for the same split.

Two things it makes visible. First, adding CAVITY insulation to a wall with fixed exterior insulation makes the
assembly WORSE from a moisture standpoint even though it improves the R-value, because it lowers the ratio -- an
outcome that surprises people retrofitting dense-pack into an existing wall. Second, the required exterior R
climbs steeply with cavity R: going from a 2x4 to a 2x6 wall in zone 6 raises the required continuous insulation
substantially, so a deeper wall is not a free upgrade.

**Inputs:** cavity R-value, continuous exterior R-value, climate zone or the required ratio directly, and the wall framing depth

**Outputs:** the achieved ratio, the required ratio for the zone, a pass or fail, the minimum continuous R-value needed to comply, and the maximum cavity R-value the existing exterior insulation supports

## 3. Worked example

A 2x6 wall with R-20 cavity and R-6 continuous exterior foam, in climate zone 6 (required ratio 0.36):

```
achieved r  = 6 / (20 + 6)          = 0.231   -> FAILS the 0.36 requirement
R_ci,min    = 0.36 x 20 / (1 - 0.36) = 11.25  -> needs R-11.25 continuous, not R-6
```

R-6 is not close; zone 6 wants R-11.25 over an R-20 cavity. Now the counterintuitive direction: keep the R-6 foam
and ask what cavity it actually supports.

```
R_cavity,max = 6 x (1 - 0.36) / 0.36 = 10.7
```

R-6 exterior only supports about an R-11 cavity in zone 6 -- a 2x4 wall with low-density batt. Filling that same
wall's cavity to R-20 makes the sheathing colder and the assembly wetter, which is exactly the retrofit people
perform believing they are improving the wall. The improvement is real for energy and adverse for moisture, and
the ratio is what shows the trade.

## 4. Scope and non-goals

A ratio check against a requirement the user supplies for their climate zone and adopted code edition. It does
not ship the code table, which differs between IECC editions and between the IECC and IRC paths, and which the
jurisdiction's adopted version governs. The ratios embody assumed indoor humidity and outdoor design conditions;
a building run at high indoor humidity -- a pool enclosure, a humidified museum, a house with a wet basement --
needs a direct dew point calculation rather than the table. The tile does not evaluate the vapor-retarder
alternative paths, exterior insulation attachment and cladding support (a structural question that often governs
how much foam is practical), or the fire and thermal barrier requirements that apply to foam plastics. It does
not compute whole-wall R-value, which is `framing-factor-whole-wall`. The adopted energy code, the AHJ, and the
building science consultant govern.
