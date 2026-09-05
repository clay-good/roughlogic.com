# roughlogic.com Specification v1461 -- Distribution Transformer Diversified Loading (`calc-lineworker.js`, Group W, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group W, overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A 25 kVA pot serving eight houses is not serving eight times one house's peak, because the peaks do not coincide. Sizing a distribution transformer on connected load oversizes it enormously; sizing it on diversified demand is the actual practice, and the diversity factor is the term nobody has a calculator for.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a customer count below one, a non-positive individual demand or transformer rating, or a diversity factor outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the diversified-demand relation and IEEE C57.91 by name for loading beyond nameplate, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`transformer diversity`, `diversified demand distribution`, `pot sizing customers`, `coincidence factor transformer`, `distribution transformer loading`.

## 2. The tile

### 2.1 `transformer-diversity-loading` -- Distribution Transformer Diversified Loading

```
diversified demand   D = n x d_individual x DF(n)
utilization          U = D / kVA_rating
per-unit loading     also reported against the emergency (short-time) rating
load factor          LF = average demand / peak demand
```

Diversity is the observation that customers do not all peak at the same instant, and it strengthens as the
group grows: two houses on a transformer coincide badly, thirty houses hardly coincide at all. The diversity
factor is therefore a function of customer count, falling from near 1.0 at n = 1 toward an asymptote around
0.4 to 0.6 for large residential groups, and each utility carries its own curve from its own metering.

Distribution transformers are also allowed to run harder than their nameplate for short periods, because their
thermal time constant is hours: a pot that peaks above 100% for two evening hours and sits at 40% overnight may
have a perfectly ordinary loss of life. That is why the tile reports loading against both the continuous and an
entered short-time rating, and why load factor is worth carrying alongside peak.

**Inputs:** number of customers served, individual customer peak demand, diversity factor for that customer count, transformer continuous rating, and optionally a short-time rating and an average demand

**Outputs:** the connected load, the diversified demand, loading against the continuous and short-time ratings, the headroom in customers before the continuous rating is reached, and the load factor

## 3. Worked example

A 25 kVA pot serving 8 homes whose individual peak is 9.5 kVA, at a diversity factor of 0.62 for that
group size:

```
connected  = 8 x 9.5          = 76.0 kVA
diversified= 8 x 9.5 x 0.62     = 47.12 kVA
utilization= 47.12 / 25       = 188.5%
```

Sized on connected load the pot looks 304% overloaded and someone orders a 75. Sized on diversified demand it
runs at 188.5%, which is a normally loaded transformer. The headroom is -3.8 more customers at the same
diversity before the continuous rating is reached -- and that number shrinks as each new customer also lowers the
diversity factor slightly, which is the part a straight division misses.

## 4. Scope and non-goals

One transformer, one customer class, one diversity factor supplied by the user. It does not hold a diversity
curve -- those are utility-specific and derived from that utility's own metered data, and a shipped curve would be
wrong for most readers. It does not compute loss of life, which needs a full load cycle and ambient profile
against IEEE C57.91, and a short-time rating used without that study is a guess. Electric vehicle charging and
electric heat break residential diversity assumptions badly and are exactly the case where an old factor
misleads. Secondary voltage drop is `voltage-drop`. The utility's transformer loading guide, IEEE C57.91, and
the transformer manufacturer's ratings govern.
