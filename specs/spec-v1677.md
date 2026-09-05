# roughlogic.com Specification v1677 -- Refractory Lining Heat Loss and Shell Temperature (`calc-hvacsystems.js`, Group C HVAC, mechanical insulation, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; mechanical insulation), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A furnace or boiler shell runs at a temperature set by the refractory behind it, and that temperature is both a heat loss and a personnel and structural limit. The layered heat balance says what the shell will do before the lining is built.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive layer thickness or conductivity, a hot face temperature below ambient, or an interface temperature exceeding a layer service limit returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the series-resistance layered heat balance with the refractory manufacturer temperature-dependent data named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`refractory lining heat loss`, `furnace shell temperature`, `layered wall interface temperature`, `refractory backup limit`, `acid dew point shell`.

## 2. The tile

### 2.1 `refractory-shell-temperature` -- Refractory Lining Heat Loss and Shell Temperature

```
series resistance   the layers add: hot face refractory, backup, insulating board,
                    the steel shell, and the outer film
heat flux           q = (T_hot - T_ambient) / sum(R)
interface temps     each layer's temperature drop is its share of the total resistance
shell temperature   T_shell = T_ambient + q x R_film
hot face limit      each refractory has a maximum service temperature it must not exceed
backup limit        the layer behind must stay below ITS limit -- a common design failure
dew point           on flue gas service the shell must stay above the acid dew point
```

The layered calculation gives more than the heat loss: it gives every interface temperature, and those are what
determine whether the lining is buildable. Each refractory has a maximum service temperature, and a design that
puts a high-temperature hot face in front of a cheap insulating backup can push that backup past its limit --
where it shrinks, cracks, or melts, and the failure is invisible until the shell gets hot. Checking every
interface, not just the shell, is the point of doing the calculation in layers.

The shell temperature has two independent constraints. Personnel protection sets an upper bound for touch safety,
and on flue gas service there is a LOWER bound: the shell must stay above the acid dew point, or condensing
sulphuric acid attacks it from the inside. That is why over-insulating a boiler casing can be a corrosion
problem, which is a genuinely counterintuitive result and one that catches people improving an old unit.

The film coefficient on the outside is a small resistance but it sets the shell temperature directly, so a
casing in still air runs hotter than the same casing in wind -- and a shell temperature measured on a calm day is
not the worst case for personnel protection or the best case for corrosion.

**Inputs:** each layer with its thickness and thermal conductivity at temperature, the hot face temperature, the ambient temperature and film coefficient, each layer maximum service temperature, and the acid dew point where applicable

**Outputs:** the total resistance and heat flux, the temperature at every interface, each interface against its layer service limit, the shell temperature, the shell against the personnel and acid dew point limits, and the layer thickness needed to bring an interface within limit

## 3. Worked example

A furnace wall: 4.5 in of hot face brick, 2.5 in of insulating firebrick backup, 2 in of block insulation, and
a steel casing, hot face at 2,100 degF, ambient 90 degF.

The series resistance gives the heat flux, and from it every interface:

```
hot face / backup interface   -> must be below the backup brick's service limit
backup / block interface      -> must be below the block insulation's limit
shell temperature             -> personnel and structural limit
```

**The backup interface is where designs fail.** Adding block insulation to reduce heat loss pushes every
interface behind it HOTTER, because less heat is escaping. A lining improved by adding outer insulation can put
the insulating firebrick above its service temperature -- and the failure appears months later as a shell hot
spot where the backup has shrunk and opened a path.

That is the trap worth carrying: **insulating the outside of a furnace makes the inside hotter.** Every layer
addition has to be checked at every interface, not just at the shell.

The flue gas case runs the other way. On a boiler casing carrying flue gas, the shell must stay ABOVE the acid
dew point -- around 250 to 300 degF depending on the fuel's sulphur -- or sulphuric acid condenses on the inside
and corrodes it. Over-insulating that casing to save energy is a corrosion failure, which is the opposite of the
usual advice.

## 4. Scope and non-goals

A one-dimensional steady-state layered heat balance. Thermal conductivity of refractory and insulation is
strongly temperature dependent and must be evaluated at each layer's mean temperature, which requires iteration;
using room-temperature values understates heat flow substantially. It does not model two-dimensional effects at
corners, openings, anchors, and joints, and steel anchors through a lining are thermal bridges that produce local
hot spots this calculation cannot see -- they are frequently where a shell actually gets hot. It does not address
refractory selection, anchoring, expansion joints, dryout and curing schedules, or the mechanical and chemical
attack that determines lining life. It does not evaluate the acid dew point, which depends on fuel sulphur and
moisture. The refractory manufacturer's data at temperature, the furnace or boiler designer, and the applicable
construction code govern.
