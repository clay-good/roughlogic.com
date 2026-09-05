# roughlogic.com Specification v1459 -- Conductor Long-Term Creep and Sag Increase (`calc-lineworker.js`, Group A Electrical, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A conductor sags more in year ten than in year one, at the same temperature and the same load, because aluminium creeps. Utilities handle this by sagging new conductor deliberately HIGH -- but by how much? The answer is a temperature equivalent, and if the crew does not apply it the line is out of clearance years after it passed inspection.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive coefficient of thermal expansion, or a negative creep strain or elapsed time returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the creep temperature-equivalent method as standard overhead line practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`conductor creep`, `creep sag increase`, `equivalent temperature creep`, `initial final sag`, `stringing sag offset`.

## 2. The tile

### 2.1 `conductor-creep-elongation` -- Conductor Long-Term Creep and Sag Increase

```
creep strain          eps_c (from conductor type and elapsed time)
equivalent temperature dT_eq = eps_c / alpha
final condition        run the change-of-state at (t + dT_eq)
initial sagging offset S_initial = S_final at (t) with the creep already spent
```

Creep is permanent, non-elastic elongation under sustained load, and in aluminium conductor it is large enough
to matter: strains of a few times ten-to-the-minus-four over the life of a line are ordinary, with most of it
spent in the first year or two and the rest accumulating slowly. Steel barely creeps at all, which is why ACSR
creeps less than all-aluminium and why the effect concentrates in the aluminium strands.

The clean way to use it is the temperature equivalent. Creep strain divided by the coefficient of thermal
expansion is the temperature rise that would produce the same elongation -- and since the change-of-state equation
already knows how to move a conductor by a temperature, creep becomes just another temperature offset. That is
also the practical instruction: sag the new line as though it were `dT_eq` degrees COLDER than it is, and it will
arrive at the design sag once the creep is spent instead of sailing past it.

**Inputs:** creep strain (or conductor type and elapsed years), coefficient of thermal expansion, and the span, tension, and conductor properties for the change-of-state run

**Outputs:** the creep strain, the equivalent temperature rise, the final sag after creep, the sag increase attributable to creep, and the initial stringing sag that lands on the design sag once creep is spent

## 3. Worked example

A 5.0e-04 creep strain -- an ordinary ten-year value for ACSR -- on a conductor with alpha = 1.06e-05/degF:

```
dT_eq = 5.0e-04 / 1.06e-05 = 47.2 degF equivalent
```

47 degrees. That is not a correction, it is a bigger move than most seasonal temperature swings, and it
runs in the same direction as a hot day rather than against it. On the 600 ft span from
`conductor-sag-at-temperature`, sixty degrees of real heating bought 8.02 ft of sag; 47 degrees of creep
equivalent buys most of that again, permanently, on top of it.

The stringing instruction that follows: to land at the design sag after creep, sag the new conductor to the
value the change-of-state equation returns at ({design temp} - 47 degF). A crew that sags to the design number on
installation day has already spent the entire clearance margin before the line is energized a decade.

## 4. Scope and non-goals

A single creep strain applied as a temperature equivalent, for planning and for setting an initial sagging
offset. It does not predict creep strain from first principles -- creep depends on conductor construction, the
fraction of rated strength it is held at, temperature history, and elapsed time, and the real numbers come from
the conductor manufacturer's creep data or from an initial-and-final sag-tension run. The manufacturer's
"initial" and "final" sag-tension curves ARE this correction, computed properly, and where they exist they beat
this estimate outright. Creep after a heavy ice event, which can be sudden and large, is not modeled. Steel and
copper conductors creep far less and the temperature equivalent is correspondingly small. The conductor
manufacturer's creep data, the sag-tension study, and the utility's construction standard govern.
