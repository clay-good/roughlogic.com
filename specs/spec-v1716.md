# roughlogic.com Specification v1716 -- Melt Furnace Energy and Charge Time (`calc-process.js`, Group G Cross-Trade Utilities, foundry, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-process.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; foundry and casting), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Melting metal takes a theoretical minimum energy and a real furnace uses several times it. The gap is the furnace's efficiency, and knowing both numbers is what turns an energy bill into a diagnosis.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive charge weight, specific heat, latent heat, or efficiency, or an efficiency above one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the theoretical melt energy relation and typical furnace efficiencies as standard foundry practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`melt furnace energy`, `btu per pound to melt`, `induction furnace efficiency`, `aluminium versus iron melt energy`, `holding furnace loss`.

## 2. The tile

### 2.1 `melt-furnace-energy` -- Melt Furnace Energy and Charge Time

```
theoretical energy  heat to raise to melting point + latent heat of fusion +
                    superheat above the melting point
per pound           roughly 180 to 200 BTU/lb for cast iron, 480 to 520 for aluminium
                    (aluminium's high specific heat and latent heat make it expensive)
actual              theoretical / furnace efficiency
efficiency          induction 60 to 75%; gas-fired reverberatory 25 to 40%;
                    a cupola varies widely
holding             a furnace holding metal without melting still loses continuously
melt loss           oxidation and dross; a mass loss as well as an energy one
```

The theoretical minimum is fixed by thermodynamics and the actual consumption is a property of the furnace, so
the ratio between them is the efficiency and it is the only number worth improving. Induction melting is
substantially more efficient than fuel-fired melting because the energy goes into the charge rather than into a
combustion chamber, which is why induction has displaced fuel-fired melting for many applications despite
electricity costing more per BTU.

Aluminium is expensive to melt and iron is not, which is counterintuitive because aluminium melts at a much lower
temperature. The reason is that aluminium has roughly twice the specific heat of iron per pound and a high latent
heat of fusion, so raising and melting a pound of aluminium takes about two and a half times the energy of a pound
of iron even though it happens at half the temperature.

Holding is where the energy goes on a furnace that is not melting. A holding furnace loses heat continuously
through its walls and its opening, and on a shop that melts in the morning and pours all day the holding energy
can approach the melting energy. That is a scheduling question rather than an equipment one.

And the poured weight rather than the casting weight is what has to be melted (`casting-pour-yield`), which is
why yield and melt energy are the same conversation.

**Inputs:** the charge weight, the metal specific heat, melting point, latent heat of fusion, and superheat temperature; the furnace type and efficiency; the melt loss percentage; and the energy cost

**Outputs:** the theoretical energy per pound and for the charge, the actual energy at the entered efficiency, the melt time at the entered furnace power, the energy cost per pound of good casting including the yield, and the holding energy over a stated period

## 3. Worked example

A 2,000 lb charge of cast iron at roughly 190 BTU/lb theoretical:

```
theoretical = 2,000 x 190 = 0.38 MMBTU
at 70% induction efficiency = 0.54 MMBTU input
```

At $0.10/kWh, `0.54 MMBTU` = 159 kWh = $16 per heat.

**Aluminium for contrast**, at roughly 500 BTU/lb theoretical:

```
theoretical = 2,000 x 500 = 1.00 MMBTU
```

**2.6 times the energy per pound**, at a melting point less than half iron's -- because
aluminium's specific heat and latent heat are both much higher. Foundry people know this and it surprises
everyone else.

**Furnace type is the other multiplier.** The same iron charge in a gas-fired furnace at 30 percent efficiency:

```
0.38 / 0.30 = 1.27 MMBTU input
```

2.3 times the input energy of the induction furnace for the same metal.

**And the yield.** From `casting-pour-yield`, only about 62 percent of what is melted becomes saleable casting,
so the energy per pound SOLD is

```
0.54 MMBTU / (2,000 x 0.62) = 438 BTU per saleable pound
```

against 190 theoretical -- roughly 2.3 times, once furnace efficiency and yield are
both counted. That number, not the theoretical one, is what the energy bill reflects.

## 4. Scope and non-goals

An energy calculation using properties and an efficiency the user supplies. Furnace efficiency is not a fixed
value: it depends on the furnace type, its size, its condition and lining, the charge material and its
preparation, the melting practice, and how the furnace is operated -- and published ranges are broad. A shop's own
measured energy per ton is the authority. It does not address holding energy, which on many operations is
comparable to melting energy and depends on hold time and furnace condition, or melt loss, which is a mass loss
that adds to the charge required. It does not address the metallurgical requirements -- superheat temperature,
treatment, inoculation, and degassing -- which set the actual thermal cycle. It does not address the electrical
demand charges that dominate induction melting costs on many tariffs. The furnace manufacturer's data, the shop's
own energy records, and the metallurgist govern.
