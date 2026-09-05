# roughlogic.com Specification v1642 -- Marine House Battery Load and Alternator Recharge (`calc-mechanic.js`, Group K Mechanic - Auto, Marine, Aviation, marine, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, Mechanic - Auto, Marine, Aviation -- the existing category, hub `/groups/mechanic/`; marine and boatyard), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A boat's house bank is discharged overnight and has to be recharged by an alternator that spends most of its time in the acceptance-limited part of the charge curve. Sizing the bank on consumption and the alternator on the bank is two calculations, and the second one is where the run time nobody wanted comes from.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive consumption, bank capacity, or alternator rating, or a depth of discharge outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the consumption and charge acceptance relations with ABYC E-11 and the battery manufacturer data named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`marine house battery sizing`, `alternator charge time boat`, `amp hours per day boat`, `lfp versus flooded bank`, `engine run time to charge`.

## 2. The tile

### 2.1 `house-battery-alternator` -- Marine House Battery Load and Alternator Recharge

```
daily consumption  sum of each load's amps x hours per day
bank size          Ah = consumption / usable depth of discharge
                   50% for flooded lead acid, 80% or more for LFP
bulk charge        the alternator delivers its rated output only while the battery accepts it
acceptance         flooded lead acid acceptance falls steeply above about 80% state of charge
                   the last 20% takes as long as the first 80%
LFP                accepts near full current to a high state of charge, changing the arithmetic
                   entirely -- and requires alternator temperature protection
```

The consumption side is straightforward bookkeeping and the charging side is where the surprises are. A 105
amp alternator does not put 105 amps into a lead acid bank for the whole recharge: it does so during bulk, and
then the battery's own acceptance limits the current as it approaches full. The result is that returning a
flooded bank from 50 percent to 85 percent might take an hour and returning it from 85 to 100 might take three --
which is why cruising boats habitually run their banks in a partial state of charge and shorten their life doing
it.

Lithium changes both halves. An LFP bank offers 80 percent or more of its rated capacity as usable rather than
50, so a smaller bank does the same job; and it accepts near-full current almost to the top, so the recharge is
short. The catch is on the alternator: a battery that will take everything the alternator can give will run a
standard alternator past its thermal limit, and external regulation with temperature sensing is a requirement
rather than an upgrade.

The practical output for an owner is a run time: given the loads, the bank, and the charging source, how long the
engine or generator has to run each day -- which is the number that decides whether the boat needs solar, a bigger
bank, or a different battery chemistry.

**Inputs:** each DC load with its current and daily hours, the bank capacity and chemistry, the usable depth of discharge, the alternator rated output and its regulation, and any solar or shore charging

**Outputs:** the daily amp-hour consumption, the usable capacity of the entered bank, the days of autonomy, the bulk charge time at the alternator rating, an acceptance-limited estimate of the time to a high state of charge, and the bank size and charging capacity needed for a target run time

## 3. Worked example

A boat consuming 180 Ah a day with a 400 Ah flooded bank and a 105 A alternator:

```
usable capacity = 400 x 0.5 = 200 Ah
days of autonomy = 200 / 180 = 1.11 days
```

Barely a day, so the engine runs daily. The recharge:

```
bulk portion, 180 Ah at 105 A ~ 1.7 hours IF the battery accepted full current
```

It does not. Returning a flooded bank to 85 percent might take that 1.7 hours; getting it to a genuine
100 percent takes several more, and in practice the boat runs an hour and a half and the bank never gets above
about 85 percent. **Chronic partial state of charge is what kills flooded banks**, and it is a consequence of the
acceptance curve rather than of anything the owner is doing wrong.

Now the LFP alternative. A 200 Ah LFP bank at 80 percent usable gives
`200 x 0.8` = 160 Ah -- nearly the same usable energy in half the capacity and a fraction of the
weight -- and it accepts near-full current almost to the top, so the same 180 Ah goes back in close to
1.7 hours of engine time.

The alternator caveat: a bank that accepts everything will hold the alternator at full output continuously, which
a standard alternator is not built to do. External regulation with alternator temperature sensing, or a DC-to-DC
charger, is required -- not optional.

## 4. Scope and non-goals

A bookkeeping and screening calculation. Battery acceptance behaviour is chemistry, temperature, age, and
state-of-charge dependent and is not modelled here beyond a qualitative statement; manufacturer charge
acceptance curves are what a real estimate needs. Alternator output falls with engine speed and with
temperature, and a rated output is a bench figure at a stated rpm. It does not size the charging system's
regulation, wiring, or overcurrent protection, and it does not address the alternator thermal management that
lithium banks require, which is a fire risk if ignored. It does not address battery installation, ventilation
(`battery-hydrogen-vent` for flooded banks), the battery management system, or the ABYC requirements for
conductor sizing and circuit protection in DC systems. ABYC E-11 and E-13, the battery and alternator
manufacturers' specifications, and a certified marine electrician govern.
