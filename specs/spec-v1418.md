# roughlogic.com Specification v1418 -- Refrigerant Recovery Time and Phase Split (calc-hvacservice.js, Group C, HVAC and refrigeration service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacservice.js`**
> (Group C, HVAC and refrigeration service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes the 80% cylinder fill limit but not how long the recovery itself takes -- and recovery time is dominated by the liquid-versus-vapor split, not by the machine's nameplate rate. A charge pulled entirely as vapor takes several times as long as the same charge pulled mostly as liquid, and that ratio is what decides whether the job finishes today.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive charge, recovery rate, or cylinder water capacity, or a specific gravity or fill fraction at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the DOT and EPA 80 percent maximum fill requirement for recovery cylinders and the EPA Section 608 recovery requirements, cited by section and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `refrigerant-recovery-time` -- Refrigerant Recovery Time and Phase Split

```
liquid phase time = liquid charge / liquid recovery rate
vapor phase time  = vapor charge / vapor recovery rate
total time        = liquid + vapor + evacuation to the required vacuum
all-vapor time    = total charge / vapor recovery rate      (the comparison case)
speed-up factor   = all-vapor time / total time
```

Recovery time is dominated by the vapor phase, and by a large margin. A recovery machine moving liquid in push-pull
handles pounds per minute; the same machine pulling the last vapor out to the required vacuum moves a fraction of
that, and it slows further as pressure falls. Recovering liquid first, wherever the system and the machine allow
it, is the difference between a ten-minute job and an hour-long one.

The speed-up factor is the output that changes behavior. Setting up for push-pull or for liquid recovery takes a
few minutes of hose work and it is nearly always worth it -- the tile puts a number on how many minutes it buys,
which is what makes the argument on a hot roof at four in the afternoon. On a small charge the setup costs more
than it saves; on a large one it saves the afternoon.

The evacuation term is the tail and it is the part that cannot be rushed. Pulling the last vapor down to the
required vacuum level takes as long as it takes, the rate falls as pressure falls, and stopping short is both a
regulatory violation and a system left with refrigerant in it.

**Inputs:** total charge, the split between liquid and vapor recovery, liquid and vapor recovery rates, and the
expected evacuation time.

**Outputs:** liquid, vapor, and total recovery time; the all-vapor comparison time; the speed-up factor from
recovering liquid first; and the number of cylinders the charge will fill at a stated net capacity.

## 3. Worked example

A 45 lb charge recovered 30 lb as liquid at 8 lb/min and 15 lb as vapor at 3 lb/min:

```
liquid time    = 30 / 8       = 3.75 min
vapor time     = 15 / 3       = 5.00 min
recovery       = 8.75 min, plus evacuation to the required vacuum
all-vapor time = 45 / 3       = 15.00 min
speed-up       = 15.00 / 8.75 = 1.7x
```

Under nine minutes against fifteen -- and the gap widens with charge size, because the liquid fraction grows while
the vapor tail stays roughly fixed. On a 200 lb charge recovered 170 lb as liquid, the split takes 31.3 min
against 66.7 min all-vapor, a 2.1x speed-up and thirty-five minutes saved. Note also what this charge means for
containers: at a 40.4 lb net cylinder limit it takes two cylinders, which the catalog's `recovery-cylinder` tile
is where to confirm.

## 4. Scope and non-goals

Time and capacity arithmetic. It does not tell you the required evacuation level, which depends on the equipment
size, the refrigerant, and whether the appliance is being opened for service or disposed of -- those levels are
set in EPA regulation under Section 608 and they are not optional. It does not compute the cylinder fill
limit -- the catalog's `recovery-cylinder` tile does that, and the two are meant to be run together. It does not
address recovery machine selection, cylinder inspection and hydrostatic test dates, the prohibition on mixing
refrigerants in one cylinder, tare weight verification, or the record-keeping the regulation requires. Handling refrigerant requires EPA Section 608
certification. The EPA, DOT, the cylinder manufacturer, and the equipment manufacturer govern.
