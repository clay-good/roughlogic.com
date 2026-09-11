# roughlogic.com Specification v1773 -- AC Induced Voltage on a Pipeline Near Powerlines (`calc-corrosion.js`, Group E Carpentry and Construction, cathodic protection and corrosion control, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-corrosion.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A pipeline sharing a corridor with a transmission line picks up alternating voltage, and `cathodic-anode-count-life` says plainly that it does not address AC corrosion. The voltage limit that protects the people who touch the pipe is several times too high to protect the steel.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive AC voltage, soil resistivity, or holiday area, or a non-positive risk threshold returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the AC current-density relation at a coating holiday and the personnel touch-voltage threshold with NACE / AMPP SP0177 and an electromagnetic interference study named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`ac induced voltage pipeline`, `ac corrosion current density`, `pipeline powerline corridor`, `touch voltage pipeline`, `ac mitigation grounding pipeline`.

## 2. The tile

### 2.1 `ac-induced-voltage-pipeline` -- AC Induced Voltage on a Pipeline Near Powerlines

```
the mechanism    a pipeline parallel to an energised transmission line is the
                 secondary of a very long, very loose transformer
two hazards      PERSONNEL, from touch and step voltage at appurtenances, and AC
                 CORROSION of the steel at coating holidays
touch limit      15 V AC is the commonly applied personnel threshold under
                 NACE / AMPP SP0177
AC current       J_AC = 8 x V_AC / (rho x pi x d)
                 rho in ohm-m, d the equivalent holiday diameter in m, J in A/m^2
holiday size     a small holiday concentrates the current; the SMALL defects are the
                 dangerous ones, which is the reverse of the DC intuition
risk bands       below about 30 A/m^2 AC corrosion is generally not expected; above
                 100 A/m^2 it is likely, with the middle band depending on the DC
                 conditions at the same site
soil             LOW resistivity raises J -- the same soil that makes cathodic
                 protection easy makes AC corrosion worse
```

There are two limits here and they are not the same number, which is the fact that most often goes wrong. The
15 V threshold exists so that a person contacting a valve, a test station, or an exposed appurtenance is not
hurt, and it is a human safety limit with nothing to say about the steel. AC corrosion happens at voltages
well below it, so a line that has been mitigated to satisfy the personnel limit and declared done can be
losing wall at a holiday the whole time.

The holiday size relation runs opposite to every DC intuition a corrosion technician has. Under direct
current, a large coating defect means a large current demand and a small one is a minor matter. Under
alternating current the current density is what drives the damage, and a small defect concentrates the same
voltage into a smaller area, so a pinhole is far more dangerous than a large disbondment. Field failures from
AC corrosion are characteristically at tiny, tight defects.

Soil resistivity inverts too, and the inversion is genuinely awkward for design. Low-resistivity soil is
everything a cathodic protection engineer wants -- an easy anode bed, good current spread, low rectifier
voltage -- and it is exactly the condition that maximises AC current density at a holiday. A corridor in wet,
conductive ground is the best case for the DC system and the worst case for the AC one.

**Inputs:** the induced AC voltage on the pipe, the local soil resistivity, the assumed or measured holiday area or diameter, the personnel touch threshold, and the AC current density risk thresholds

**Outputs:** the equivalent holiday diameter, the AC current density, where it falls against the risk bands, the induced voltage that would bring the current density to the threshold, the margin against the personnel touch limit, and the current density at an alternative soil resistivity

## 3. Worked example

A pipeline in a shared corridor reading 15 V AC, in soil of 25 ohm-m, at a 1 sq cm coating holiday:

```
d     = sqrt(4 x 0.0001 / pi) = 0.01128 m (11.3 mm)
J_AC  = 8 x 15 / (25 x pi x 0.01128) = 135.4 A/m^2
```

**135 A/m^2 against a threshold of 30.** That is **4.5 times the level above which AC corrosion is expected**,
at a pipe that is sitting **exactly on** the 15 V personnel limit.

**Both statements are true at once, and that is the whole point.** The line satisfies the touch-voltage
criterion with no margin to spare and is losing steel at a holiday. **Mitigating to 15 V protects the crew and
does nothing for the pipe.**

**The voltage the steel actually needs is far lower:**

```
V for J = 30 A/m^2:  V = 30 x 25 x pi x 0.01128 / 8 = 3.32 V
```

**About 3.3 V** -- roughly **4.5 times more stringent than the personnel limit.** A corridor mitigated to a
single 15 V target has met one criterion and missed the other by that factor.

**And the soil works backwards from the DC intuition.** Move the same pipe into 100 ohm-m soil:

```
J_AC = 8 x 15 / (100 x pi x 0.01128) = 33.9 A/m^2
```

**34 A/m^2 -- a 75 percent reduction from soil four times more resistive.** The high-resistivity site that
makes the cathodic protection engineer's life difficult is the site where AC corrosion is least likely, and
the wet conductive ground that makes an easy anode bed is where the AC hazard concentrates.

## 4. Scope and non-goals

A screening calculation from a measured or modelled voltage. It does not compute the induced voltage itself, which is the hard part: it depends on the transmission line's currents and phasing, the separation and length of the parallel exposure, the soil structure, the pipeline's coating and grounding, and fault as well as steady-state conditions -- an electromagnetic interference study using a purpose-built model is what establishes it, and this tile takes its result as an input. It does not address fault conditions, where voltages and energies are far higher and where coating damage, arcing, and personnel hazard are governed by different criteria entirely. It does not design mitigation: gradient control mats, grounding cells, polarisation cells, and distributed zinc ribbon all interact with the cathodic protection system and with each other. The holiday size is assumed rather than known, and the answer scales directly with that assumption. Risk thresholds are guidance bands, not pass and fail lines, and AC corrosion risk also depends on the DC conditions at the same location. NACE / AMPP SP0177 and the AC corrosion standards, an electromagnetic interference study, the transmission line operator, and a qualified corrosion engineer govern.
