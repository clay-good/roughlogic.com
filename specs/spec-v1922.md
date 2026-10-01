# roughlogic.com Specification v1922 -- Temporary Housing Park Service Demand (`calc-relief.js`, Group A Electrical, temporary housing, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-relief.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** After a large disaster, displaced households are housed in travel trailers and manufactured housing units on group sites, and the electrician sizing the park's service uses NEC Articles 551 and 550, whose per-site loads and demand factors differ sharply -- and whose 50 A site value changed in the 2017 edition. `service-load` and the feeder tiles apply Article 220; no tile applies 550 or 551.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive site count, per-site load, or voltage returns `{ error }`; a demand factor outside 0-1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): NFPA 70 Section 551.73(A) and Table 551.73(A) (recreational vehicle park demand) and Section 550.31 and Table 550.31 (manufactured home park demand), cited by number with the edition flagged -- the demand factor is a USER INPUT read from the adopted edition's table, not reproduced -- named as governing with the AHJ, GOVERNANCE.electrical.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`rv park service size`, `fema travel trailer park electrical`, `manufactured home park demand load`, `nec 551 demand factor`, `temporary housing site electrical service`.

## 2. The tile

### 2.1 `temp-housing-park-feeder-demand` -- Temporary Housing Park Service Demand

```
RV park          per-site load by site type (551.73(A)): the 50 A site value is
(551.73)         12,000 VA in the 2017 and later editions (9,600 VA before);
                 20 A + 30 A site 3,600 VA; 20 A only 2,400 VA; tent site 600 VA
                 -- per-site values entered or selected, edition shown
                 demand = sum of site loads x demand factor for the number of
                 sites (Table 551.73(A), entered)
MH park          16,000 VA per lot or the calculated load if larger (550.31);
(550.31)         demand = lots x per-lot load x demand factor (Table 550.31,
                 entered)
current          demand VA / service voltage (240 V single-phase, or / (1.732 x
                 V) three-phase)
compare          both articles for the same site count, where housing units
                 could be either
```

Temporary housing parks look alike on the ground and are calculated differently in the code. A travel trailer park falls
under Article 551, where each site is loaded by the size of its receptacle and the demand factor drops steeply as sites
are added -- to about two-fifths for a large park. A park of manufactured housing units falls under Article 550, with a
larger per-lot load and a demand factor that falls to about a quarter. The tile computes either and shows both side by
side, because FEMA group sites have used both kinds of unit.

The edition matters for travel trailers. The 50 A site value rose from 9,600 VA to 12,000 VA in the 2017 NEC, which
raises a large park's calculated load by a quarter; a park designed to the older value may not meet the newer one. The
tile shows the edition of the per-site value it is using.

The demand factor tables are NFPA text and are not reproduced; the tile asks for the factor from the adopted edition's
table for the site count and records the row used. It then computes the demand in volt-amperes and the service or
feeder current.

**Inputs:** the park type (RV or manufactured home), the number of sites of each type, the per-site load (selected or entered, with the NEC edition), the demand factor from the adopted table, and the service voltage and phase

**Outputs:** the connected load, the demand load, the service current, and the comparison between the two articles

## 3. Worked example

**A 40-site travel-trailer group site, all 50 A sites, with a demand factor of 0.41 entered from Table 551.73(A):**

```
connected   40 x 12,000 = 480,000 VA  (2017+ value)
demand      480,000 x 0.41 = 196,800 VA -> 820 A at 240 V
older value 40 x 9,600 x 0.41 = 157,440 VA -> 656 A
```

**820 A under the current edition, 656 A under the pre-2017 value** -- 25% more service for the same trailers.

**25 manufactured housing units, demand factor 0.24 entered from Table 550.31:**

```
25 x 16,000 x 0.24 = 96,000 VA -> 400 A at 240 V
```

**Twenty-five manufactured homes need less than half the service of forty travel trailers** -- because the Article 550
demand factor is lower and the site count is smaller.

## 4. Scope and non-goals

A service and feeder demand estimate under NEC Articles 550 and 551. It does not reproduce the demand factor tables, size individual site feeders, pedestals, or conductors, address voltage drop across a large site (`voltage-drop`), grounding and bonding, GFCI requirements, or water, sewer, and site layout. Utility service requirements may differ. The NEC edition adopted by the AHJ, the utility, and the AHJ govern.
