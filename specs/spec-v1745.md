# roughlogic.com Specification v1745 -- Radon Fan Static Pressure and Pipe Sizing (`calc-cross.js`, Group B Plumbing and Gas, plumbing, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; cross-trade gap fills), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A radon fan has to pull air through the soil under a slab, and almost all of its pressure is spent there rather than in the pipe. Sizing the pipe generously is cheap and sizing the fan on pipe friction alone misses where the resistance actually is.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive airflow, pipe diameter, or fan static pressure, or a pipe velocity outside a plausible range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the sub-slab depressurization resistance concept with the ANSI/AARST mitigation standards named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`radon fan static pressure`, `sub slab depressurization fan`, `radon pipe sizing`, `suction field extension`, `radon fan diagnostic vacuum flow`.

## 2. The tile

### 2.1 `radon-fan-static` -- Radon Fan Static Pressure and Pipe Sizing

```
system resistance  dominated by the soil and the sub-slab material, not the pipe
pipe velocity      keep it low; 4 in pipe on a residential system is standard
fan curve          the operating point is where the fan curve meets the system curve
                   and radon fans are chosen from the curve, not from a rating
suction field      the pressure the fan achieves under the slab, measured at test holes
                   this is what determines whether the system works
diagnostic         a fan pulling high vacuum at low flow means a tight sub-slab;
                   high flow at low vacuum means a leak or an open sub-slab
condensate         the pipe must drain back to the pit; a sag holds water and blocks it
```

The resistance is under the slab and that reorders the design priorities. Pipe friction in a 4 inch residential
radon pipe is a small fraction of an inch of water column; the sub-slab material -- clean gravel, or compacted
fines, or in the worst case native soil -- accounts for nearly everything the fan works against. So a system that
underperforms is almost never limited by its pipe, and upsizing the pipe on a struggling system changes very
little.

The fan's operating point tells you which situation you are in, and it is a genuinely useful diagnostic. A fan
running at high vacuum and low flow is pulling against a tight sub-slab -- the suction field is not extending, and
the fix is more suction points rather than a bigger fan. A fan at high flow and low vacuum is short-circuiting to
outside air through a crack, a sump, or an untrapped drain, and the fix is sealing rather than fan capacity.
Measuring both at the fan distinguishes them in a minute.

The suction field extension is what actually determines whether a system works, and it is measured at test holes
drilled through the slab at a distance from the pit -- a measurable vacuum at the far corner means the field
extends there. That measurement, not the fan's rating or the radon result alone, is what commissioning a system
means.

Condensate is the failure that appears in winter: warm humid soil gas condenses in a cold attic or exterior pipe
run, and any sag holds that water and progressively blocks the pipe. Continuous slope back to the pit is a
requirement rather than good practice.

**Inputs:** the fan airflow and static pressure, the pipe diameter and length with fittings, the sub-slab material, the number of suction points, and the test hole vacuum measurements

**Outputs:** the pipe velocity and friction loss, the pipe loss as a fraction of the fan static pressure, the operating point interpretation from the entered flow and vacuum, the suction field indication from test hole readings, and the pipe size required to keep friction below a stated fraction

## 3. Worked example

A radon fan moving 80 cfm through 4 in pipe:

```
area     = pi/4 x (4/12)^2 = 0.0873 sq ft
velocity = 80 / 0.0873 = 917 fpm
```

At 917 fpm the friction in 30 ft of 4 in pipe with a few elbows is on the order of a few hundredths of an
inch of water column. **The fan is developing perhaps 1.0 to 1.5 in wc**, so the pipe is a percent or two of the
system resistance and the sub-slab is essentially all of it.

Which means: **upsizing the pipe on a struggling system changes almost nothing.**

**The diagnostic that does help**, measured at the fan:

```
high vacuum, low flow  -> tight sub-slab; the suction field is not extending
                          the fix is MORE SUCTION POINTS, not a bigger fan
low vacuum, high flow  -> short-circuiting to outside air through a crack, a sump,
                          or an untrapped floor drain
                          the fix is SEALING, not fan capacity
```

Both look like "the system is not working" and they need opposite responses. A minute with a manometer at the fan
distinguishes them.

**And what actually proves the system works**: measurable vacuum at test holes drilled through the slab away from
the pit. A reading at the far corner means the suction field extends there. That measurement is what commissioning
means -- the fan's rating proves nothing, and a single post-mitigation radon test proves it worked on one week's
weather.

**Condensate**: warm soil gas condenses in cold pipe, and any sag holds the water and blocks the pipe over a
winter. Continuous slope back to the pit is a requirement.

## 4. Scope and non-goals

A pipe sizing and diagnostic framework. It does not size a radon mitigation system, which depends on the slab
area, the sub-slab material and its permeability, the foundation type and any subdivisions, and the number and
placement of suction points -- and which is established by sub-slab communication testing rather than by
calculation. It does not select a fan, which is chosen from its curve against the measured system resistance. It
does not address the mitigation standards' requirements for pipe routing, discharge location and height,
labelling, system monitoring, electrical work, and the sealing of slab penetrations, or the backdrafting risk
that depressurizing a house creates for combustion appliances (`caz-depressurization-limit`). It does not address
post-mitigation testing, which is what demonstrates the system works. ANSI/AARST mitigation standards, the state
radon program, and a certified radon mitigation professional govern.
