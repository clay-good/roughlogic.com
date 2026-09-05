# roughlogic.com Specification v1559 -- Nitrox Maximum Operating Depth and Oxygen Exposure (`calc-diving.js`, Group P Field, Backcountry, and SAR, commercial diving, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-diving.js`**
> (Group P, Field, Backcountry, and SAR -- the existing category, hub `/groups/field/`; commercial diving and hyperbaric), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Oxygen becomes toxic under pressure, and the depth at which a given nitrox mix reaches the oxygen partial-pressure limit is the hardest number in the mix's operating envelope. Below it there is no warning and no gradual onset; the arithmetic is one division and it belongs on the slate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: an oxygen fraction outside zero to one, a non-positive partial pressure limit, or a computed maximum operating depth at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the partial pressure relation with the 1.4 and 1.6 ata limits, and 29 CFR 1910 Subpart T named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`nitrox maximum operating depth`, `mod calculation nitrox`, `ppo2 depth limit`, `best mix for depth`, `oxygen partial pressure diving`.

## 2. The tile

### 2.1 `nitrox-mod` -- Nitrox Maximum Operating Depth and Oxygen Exposure

```
ambient pressure   P (ata) = 1 + depth / 33      (seawater, feet)
oxygen partial pr  ppO2 = FO2 x P
maximum operating  MOD = 33 x ( ppO2_limit / FO2 - 1 )      (feet)
limits             1.4 ata working; 1.6 ata contingency and decompression only
best mix           FO2 = ppO2_limit / P at the planned depth
```

Partial pressure is just the fraction times the absolute pressure, so a richer mix hits any given oxygen limit
shallower. That is the trade nitrox makes: more oxygen buys less inert gas and longer no-decompression time, and
it buys a hard depth ceiling in exchange.

The two limits are not interchangeable. 1.4 ata is the working limit for the active portion of a dive, chosen
with margin because exertion, cold, and CO2 retention all raise susceptibility and because oxygen toxicity at
depth presents as a seizure with no reliable prodrome. 1.6 ata is a contingency and decompression figure used at
rest, and treating it as a working limit removes the margin that exists precisely because the failure mode is
drowning.

The reverse form -- best mix for a planned depth -- is what a supervisor actually uses when blending, and the tile
gives it directly. Whatever it returns, the mix must be analysed before use: the number on the cylinder is a
label, and the analyser is the fact.

**Inputs:** oxygen fraction of the mix, the oxygen partial pressure limit, the planned depth, and the water type for the pressure conversion

**Outputs:** the ambient pressure at depth, the oxygen partial pressure for the mix at that depth, the maximum operating depth at both the 1.4 and 1.6 limits, the best mix for the planned depth, and the depth at which air itself reaches the limit

## 3. Worked example

EAN32 (32% oxygen) at the 1.4 ata working limit:

```
MOD = 33 x ( 1.4 / 0.32 - 1 ) = 33 x ( 4.375 - 1 ) = 111.4 ft
at the 1.6 contingency limit  = 33 x ( 5.000 - 1 ) = 132.0 ft
```

**111 ft** working. Take that same mix to 80 ft and:

```
P     = 1 + 80/33      = 3.424 ata
ppO2  = 0.32 x 3.424   = 1.096 ata
```

1.10 ata -- past 1.4 and approaching 1.6. This mix does not belong at 80 ft for working diving.

Best mix for 80 ft at 1.4:

```
FO2 = 1.4 / 3.424 = 0.409 -> EAN41
```

And the same arithmetic on air (21%) gives an MOD of `33 x (1.4/0.21 - 1)` = 187 ft at the working
limit -- which is why air diving beyond that depth is a decompression and oxygen-exposure planning problem, not a
casual one.

## 4. Scope and non-goals

A partial-pressure calculation only. It is a planning aid and is not a dive table, a decompression schedule, or
a substitute for a dive computer, dive planning software, or the diving supervisor. It addresses acute central
nervous system oxygen toxicity via partial pressure and does NOT track pulmonary oxygen toxicity (OTU or CNS
percentage accumulated over a dive and across repetitive dives), which is a separate limit on long or repeated
exposures. It does not address inert gas loading, no-decompression limits, or decompression obligation
(`no-decompression-limit` and `nitrox-ead`), gas density and work of breathing at depth, or narcosis. Every mix
must be analysed by the diver before use regardless of what any calculation says. Commercial diving is a
regulated occupation and oxygen toxicity is a fatality mechanism: 29 CFR 1910 Subpart T, the ADCI or IMCA
standards as applicable, the employer's dive manual, and the diving supervisor govern.
