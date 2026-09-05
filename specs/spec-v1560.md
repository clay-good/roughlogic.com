# roughlogic.com Specification v1560 -- Nitrox Equivalent Air Depth (`calc-diving.js`, Group P Field, Backcountry, and SAR, commercial diving, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-diving.js`**
> (Group P, Field, Backcountry, and SAR -- the existing category, hub `/groups/field/`; commercial diving and hyperbaric), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Equivalent air depth is what makes a nitrox dive plannable: it is the air depth that would load a diver with the same nitrogen, so the air table or algorithm can be used directly. It is the reason nitrox extends bottom time, and it is one line.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: an oxygen fraction outside zero to one, a non-positive depth, or a computed equivalent air depth below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the equivalent air depth relation with 29 CFR 1910 Subpart T and the employer dive manual named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`equivalent air depth`, `ead nitrox calculation`, `nitrox bottom time extension`, `nitrogen partial pressure equivalent`, `air table with nitrox`.

## 2. The tile

### 2.1 `nitrox-ead` -- Nitrox Equivalent Air Depth

```
EAD = ( (1 - FO2) / 0.79 ) x ( depth + 33 ) - 33          (seawater, feet)
equivalently, matching the nitrogen partial pressure to that of air at the EAD
FN2 = 1 - FO2 (for a two-gas nitrox; trimix needs a different treatment)
the EAD is always SHALLOWER than the actual depth for any mix richer than air
```

The whole idea is to hold the nitrogen partial pressure constant. A nitrox mix has less nitrogen than air, so
at a given depth it loads a diver the way a shallower air dive would, and the equivalent air depth is that
shallower depth. Once it is known, an air table or an air algorithm applies without modification -- which is why
EAD came first historically and why it is still the clearest way to see what nitrox buys.

What it buys is real and bounded. At moderate depths a common mix converts to an EAD twenty to thirty feet
shallower, which is a substantial extension of no-decompression time. It buys nothing at all on the oxygen side:
the same mix that extends the nitrogen clock brings the oxygen ceiling up to meet you (`nitrox-mod`), and the two
limits close on each other as the mix gets richer. A dive planned on EAD alone, without the MOD check, has solved
half the problem.

For trimix the relation does not apply as written, because helium is present and has its own kinetics; equivalent
narcotic depth is a different calculation for a different purpose.

**Inputs:** oxygen fraction of the mix, actual depth, and the water type for the pressure conversion

**Outputs:** the nitrogen fraction, the equivalent air depth, the depth reduction the mix provides, the nitrogen partial pressure at depth, and the mix required to achieve a target equivalent air depth

## 3. Worked example

EAN36 at 100 ft:

```
FN2 = 1 - 0.36 = 0.64
EAD = (0.64 / 0.79) x (100 + 33) - 33
    = 0.8101 x 133 - 33 = 74.7 ft
```

A 100 ft dive on this mix loads nitrogen like a **75 ft** air dive -- 25 ft shallower, which
on an air table is a large increase in allowable bottom time.

But run the oxygen check on the same mix at the same depth:

```
ppO2 = 0.36 x (1 + 100/33) = 1.451 ata
```

1.45 ata -- past the 1.4 working limit. **This mix is not usable at 100 ft**, however attractive
its equivalent air depth looks. That pairing is the point: EAD and MOD have to be read together, and a plan built
on one of them is not a plan.

A mix that works at 100 ft is EAN35, whose EAD is
77 ft -- less extension, but usable.

## 4. Scope and non-goals

A partial-pressure equivalence for two-gas nitrox in seawater. It is a planning aid and is not a dive table, a
decompression schedule, or a substitute for a dive computer, planning software, or the diving supervisor. It does
not itself produce a no-decompression limit or a decompression schedule -- the EAD must be taken to a validated
air table or algorithm, and different tables and algorithms give materially different answers. It does not apply
to trimix or heliox, does not address oxygen exposure limits (`nitrox-mod`), CNS or pulmonary oxygen toxicity
accumulation, repetitive dive residual nitrogen, altitude diving, or omitted decompression. Isobaric counter-
diffusion and gas switching are outside it entirely. Commercial diving is a regulated occupation and
decompression illness is a serious injury mechanism: 29 CFR 1910 Subpart T, the ADCI or IMCA standards as
applicable, the employer's dive manual, and the diving supervisor govern.
