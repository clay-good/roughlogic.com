# roughlogic.com Specification v1693 -- Respirable Silica Exposure and Ventilation Screen (`calc-demo.js`, Group D Water Damage and Mold Restoration, abatement, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-demo.js`**
> (Group D, Water Damage and Mold Restoration -- the existing category, hub `/groups/restoration/`; abatement and demolition), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Respirable crystalline silica has a permissible exposure limit low enough that ordinary construction dust exceeds it, and OSHA's rule gives a table of tasks with specified controls that a contractor can follow without sampling. Knowing whether a task is on the table is the first question, not the last.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive exposure concentration or sample duration, or an airflow below the table requirement returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the OSHA respirable crystalline silica standard 29 CFR 1926.1153 and its Table 1 by name, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`silica exposure control`, `osha table 1 silica`, `respirable crystalline silica pel`, `dust collector cfm per inch blade`, `silica exposure assessment`.

## 2. The tile

### 2.1 `silica-ventilation-screen` -- Respirable Silica Exposure and Ventilation Screen

```
PEL               50 micrograms per cubic metre as an 8-hour time-weighted average
action level      25 micrograms per cubic metre, triggering monitoring obligations
Table 1           OSHA specifies engineering controls and respiratory protection for
                  listed tasks; following them fully exempts the employer from
                  exposure assessment
outside Table 1   the employer must assess exposure by sampling or objective data and
                  control to the PEL
controls          water suppression and local exhaust ventilation with a specified airflow
                  per inch of blade or per tool, from the table
consequence       silicosis is irreversible and the exposures that cause it are invisible
```

The structure of the rule is what a contractor needs first. OSHA's Table 1 lists common construction tasks --
sawing, drilling, grinding, chipping, and others -- and for each one specifies the engineering control and the
respiratory protection required. An employer who fully and properly implements the listed controls for a listed
task does not have to assess exposure at all, which is an enormous practical simplification and the reason the
table exists.

Step off the table and the obligation changes completely: the employer must determine exposure by air sampling or
by objective data, and control it to the PEL by engineering and work practice controls, with respirators only as
a supplement. Tasks not on the table, or table tasks performed without the specified controls, land here.

The airflow requirements on the table are specific numbers -- cubic feet per minute per inch of blade diameter
for a saw, for instance -- and a dust collector that does not meet them does not satisfy the table. Neither does a
water suppression system without enough water to keep the dust down for the whole cut. "Using a shroud" is not
compliance; meeting the stated airflow with a filter of the specified efficiency is.

The health endpoint is what makes it worth care: silicosis is irreversible, progressive, and caused by exposures
that produce no immediate symptom.

**Inputs:** the task and whether it appears on Table 1, the control in use and its airflow or water rate, the required airflow from the table, the duration of the task, the respiratory protection provided, and any sampling results

**Outputs:** whether the entered task is on Table 1 and the controls it requires, the airflow requirement for the entered tool, the provided airflow against it, the exposure as an 8-hour time-weighted average from entered sampling results, that against the PEL and action level, and the obligations triggered

## 3. Worked example

A crew cutting concrete with a 14 in handheld saw.

**First question: is the task on Table 1?** Handheld power saws are, and the table specifies either water
suppression or a dust collector meeting a stated airflow per inch of blade diameter with a filter of specified
efficiency, plus the respiratory protection appropriate to the duration and location.

```
14 in blade x the table's required CFM per inch = the dust collector airflow requirement
```

A collector that does not meet it does not satisfy the table -- and the crew is then in the second regime, where
the employer must assess exposure by sampling or objective data and control to the PEL.

**The 8-hour average is where a short task hides.** A 90 minute cutting task at 200 micrograms per cubic metre
averages over an 8 hour shift as

```
200 x 90 / 480 = {200*90/480:.0f} micrograms per cubic metre
```

{200*90/480:.0f} -- below the 50 PEL but above the 25 action level, which triggers monitoring obligations even
though no full-shift exposure exceeded the limit. Contractors who reason that a short task cannot be a problem
miss that.

Following Table 1 fully avoids all of this arithmetic, which is the point of it: implement the specified control
properly and the exposure assessment obligation does not apply.

## 4. Scope and non-goals

A screening framework around OSHA's silica standard. Table 1's tasks, controls, airflow and water requirements,
respiratory protection, and the duration thresholds are set by 29 CFR 1926.1153 and must be read from the
standard -- this tile does not reproduce the table. Following Table 1 requires implementing the specified controls
FULLY and correctly; partial implementation does not confer the exemption. It does not perform exposure
assessment, which requires air sampling by qualified personnel or defensible objective data, and it does not
interpret sampling results, which involve laboratory analysis and analytical uncertainty. It does not address the
written exposure control plan, the competent person requirement, medical surveillance, housekeeping restrictions
(dry sweeping and compressed air are restricted), training, or recordkeeping, all of which the standard requires.
Silicosis is irreversible: 29 CFR 1926.1153, the employer's written exposure control plan, and a qualified
industrial hygienist govern.
