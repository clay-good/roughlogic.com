# roughlogic.com Specification v1893 -- Critical Load Priority Shedding (`calc-reliefpower.js`, Group A Electrical, emergency and temporary power, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefpower.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** When the available source is smaller than the connected load -- a derated generator, a single unit where two were planned, a battery -- the loads have to be served in priority order, and the NEC names the order. `battery-runtime` gives one runtime for one load; no tile tiers the loads against a capacity and shows what each shed level buys.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive source capacity returns `{ error }`; a negative tier load returns `{ error }`; a non-positive battery energy, when entered, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): NFPA 70 Articles 700 (emergency), 701 (legally required standby), and 702 (optional standby), and the selective load pickup and load shedding provision of 700.4(B), cited by number with the edition flagged for verification, the AHJ named as governing, GOVERNANCE.electrical.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`load shedding priority`, `critical load generator capacity`, `emergency legally required optional standby`, `which loads fit on the generator`, `battery runtime load shed`.

## 2. The tile

### 2.1 `critical-load-shed-tiers` -- Critical Load Priority Shedding

```
priority      1 emergency (Art. 700)
              2 legally required standby (Art. 701)
              3 optional standby (Art. 702)
              further user tiers below these
served        add tiers in priority order while the cumulative kW <= source kW;
              the first tier that does not fit, and all below it, are shed
outputs       served kW, shed kW, served fraction, source utilization
energy source runtime at each shed level = usable kWh / served kW
```

The NEC ranks the loads an emergency source may carry, and when capacity runs short it ranks them for shedding too:
emergency systems first, legally required standby next, optional standby last. A hospital's egress lighting and fire
pump outrank its elevators, which outrank its air conditioning; a water plant's disinfection outranks its office. The
tile takes the connected load in each tier and the source that is actually available -- often the derated figure
from `generator-altitude-temp-derate` -- and reports which tiers fit.

The tile sheds whole tiers, not fractions of them, because that is how selective load pickup and load-shedding
schemes are wired: a tier is on a transfer switch or a shunt-tripped breaker, and it is either connected or it is
not. The utilization it reports is the served load over the source, which shows the headroom left for motor starting
and growth.

For an energy-limited source -- a battery, or a generator with a fixed fuel supply converted to kilowatt-hours -- the
tile also reports the runtime at each shed level. That turns the shedding order into a decision a facility manager can
make: how many hours the emergency tier alone buys, against how many hours everything buys.

**Inputs:** the available source kW, the connected load of each priority tier, and optionally the usable energy in kWh

**Outputs:** the tiers served and shed, the served kW, the shed kW, the served fraction of total load, the source utilization, and the runtime at each shed level when an energy is entered

## 3. Worked example

A shelter and clinic with 40 kW of emergency load, 55 kW legally required, and 70 kW optional, on a generator whose
derated capacity is 128 kW:

```
tier 1   40 kW   cumulative  40   fits
tier 2   55 kW   cumulative  95   fits
tier 3   70 kW   cumulative 165   exceeds 128 -> shed
served   95 kW of 165 (58%)     utilization 95 / 128 = 74%
```

**Emergency and legally required loads fit with 26% headroom; the optional tier is shed.**

**The same facility on a 400 kWh battery:**

```
all tiers      400 / 165 = 2.42 h
tiers 1-2      400 / 95  = 4.21 h
tier 1 only    400 / 40  = 10.0 h
```

**Shedding to the emergency tier alone stretches the battery from under two and a half hours to ten.** That is the
number that decides whether the optional loads are worth carrying at all.

## 4. Scope and non-goals

A capacity and runtime check that sheds whole tiers in NEC priority order. Which loads belong to which article is a classification the AHJ decides, and the section numbering of 700.4(B) should be verified against the edition adopted. It does not design the load-shedding controls, transfer switches, or selective coordination, address motor starting on the served tiers (`generator-motor-starting`), or derate the source (`generator-altitude-temp-derate`). Battery usable energy must account for depth of discharge and temperature (`off-grid-battery`). The NEC as adopted and the AHJ govern.
