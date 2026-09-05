# roughlogic.com Specification v1731 -- Dilution Ventilation Rate for a Solvent Vapor (`calc-cross.js`, Group G Cross-Trade Utilities, industrial hygiene, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; industrial hygiene and safety), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Dilution ventilation controls a vapour by mixing it with enough air to stay below an exposure limit, and the airflow required is a concentration problem with a mixing factor that acknowledges the room is not a well-stirred vessel. It is the control of last resort, not first.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive evaporation rate, molecular weight, or exposure limit, or a mixing factor below one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the dilution ventilation relation and mixing factor convention with the ACGIH Industrial Ventilation manual named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`dilution ventilation solvent`, `cfm for tlv`, `mixing factor k ventilation`, `general versus local exhaust`, `lel ventilation solvent`.

## 2. The tile

### 2.1 `dilution-ventilation-solvent` -- Dilution Ventilation Rate for a Solvent Vapor

```
required airflow   Q = (403 x lb/h evaporated x K) / (MW x TLV)
                   for lb/h of solvent, molecular weight, and TLV in ppm
K                  a mixing factor from 1 to 10 reflecting how poorly the room mixes
                   and how serious the consequence of a failure is
403                the constant converting to standard conditions
limitation         dilution does not protect the person AT the source, where the
                   concentration is highest before any mixing occurs
better             local exhaust ventilation captures at the source
flammability       a separate and much larger airflow may be required to stay below
                   the lower explosive limit
```

The mixing factor is an admission built into the method. A room is not a well-stirred vessel: air short-circuits
from supply to exhaust, corners stagnate, and the worker is standing in the emission rather than in the room
average. The factor of 1 to 10 accounts for that, and choosing it involves judgment about the room's geometry, the
location of the emission relative to the worker and the exhaust, the toxicity of the material, and how bad a
failure would be. A high factor is not conservatism for its own sake; it is a recognition that the calculation's
central assumption is false.

The fundamental limitation is that dilution never protects the person at the source. Concentration at the point
of evaporation is high by definition and only falls as the vapour mixes outward, so a worker leaning over an open
tank is breathing air the room average says nothing about. That is why local exhaust ventilation -- capturing at
the source before it enters the room -- is the preferred control and dilution is what remains when capture is
impractical.

Flammability is a separate calculation with a much larger answer. Keeping a room below a fraction of the lower
explosive limit requires far more air than keeping it below a health exposure limit, so a space handling large
solvent quantities is ventilated for fire safety and the health requirement comes along for free -- and confusing
which requirement governs produces a dangerously undersized system.

**Inputs:** the solvent evaporation rate in pounds per hour, its molecular weight and exposure limit, the mixing factor, the lower explosive limit, and the room volume and air distribution

**Outputs:** the airflow required for the exposure limit at the entered mixing factor, the airflow required to stay below a stated fraction of the lower explosive limit, which requirement governs, the air changes per hour implied for the entered room, and the effect of a different mixing factor

## 3. Worked example

A process evaporating 2 lb/h of toluene (molecular weight 92, TLV 20 ppm), mixing factor K = 5:

```
Q = 403 x 2 x 5 / (92 x 20) = {403*2*5:,.0f} / {92*20:,.0f} = {403*2*5/(92*20):.2f} ... 
```

in thousands of cfm:

```
Q = 403 x 2 x 5 / (92 x 20) x 1,000 = {403*2*5/(92*20)*1000:,.0f} cfm
```

**{403*2*5/(92*20)*1000:,.0f} cfm** to hold the room average at the exposure limit -- and the room average is not
what the worker at the tank is breathing.

**Change the mixing factor.** At K = 2, for a well-mixed room with the emission far from the worker:

```
Q = {403*2*2/(92*20)*1000:,.0f} cfm
```

At K = 10, for a poorly mixed room with the worker at the source:

```
Q = {403*2*10/(92*20)*1000:,.0f} cfm
```

**A factor of five in the answer**, entirely from a judgment about mixing -- which is the honest state of the
method.

**And the flammability requirement, which is a different question.** Toluene's lower explosive limit is 1.1
percent, or 11,000 ppm. Holding the room below 25 percent of the LEL:

```
Q = 403 x 2 / (92 x 2,750) x 1,000 x 1 = {403*2/(92*2750)*1000:.1f} ... 
```

which is a much smaller airflow than the health requirement here -- **so on toluene the health limit governs.**
On a solvent with a high exposure limit and a low LEL the reverse is true, and getting that backwards undersizes
the system for the hazard that matters.

The real conclusion: {403*2*5/(92*20)*1000:,.0f} cfm is a great deal of air to condition, and a local exhaust hood
capturing at the tank would control this exposure with a small fraction of it. Dilution is the fallback.

## 4. Scope and non-goals

A screening calculation. The mixing factor is a judgment, not a measurement, and the calculation's central
assumption -- that the worker breathes the room average -- is false wherever the worker is near the source, which
is where exposure actually occurs. It does not substitute for exposure monitoring, which is what establishes an
actual exposure, and a system designed to this calculation should be verified by sampling. It does not size local
exhaust ventilation, which is the preferred control and which follows the ACGIH Industrial Ventilation manual's
hood designs and capture velocities. It does not address mixtures, where exposure limits interact, or skin
absorption, which ventilation does not control at all. It does not address the electrical area classification,
ignition source control, and fire protection that flammable solvent handling requires. The ACGIH Industrial
Ventilation manual, the applicable OSHA and ACGIH exposure limits, NFPA where flammability governs, and a
qualified industrial hygienist govern.
