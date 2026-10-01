# roughlogic.com Specification v1895 -- Radio and Communications Site Duty-Cycle Battery (`calc-reliefpower.js`, Group A Electrical, emergency and temporary power, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefpower.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** A radio draws a lot of current while it transmits and very little while it listens, so its battery is sized from a duty-cycle-weighted average -- the industry's 5-5-90 convention. `off-grid-battery` and `standby-battery-sizing` take a current as given; no tile builds that average for a temporary repeater, a base station, or a cache of portables.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a negative current, duty fractions that do not sum to 100%, or a non-positive runtime or depth of discharge returns `{ error }`; a depth of discharge above 1.0 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the 5-5-90 duty cycle convention (5% transmit, 5% receive, 90% standby) as published in radio manufacturers' battery-life specifications -- the worked example cites the Motorola Solutions BPR40 data sheet -- named as the default, the equipment manufacturer's current draws and the site's measured traffic named as governing, GOVERNANCE.electrical.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`radio battery duty cycle`, `repeater battery backup size`, `5-5-90 duty cycle`, `two way radio battery amp hours`, `communications site battery runtime`.

## 2. The tile

### 2.1 `radio-site-duty-cycle-battery` -- Radio and Communications Site Duty-Cycle Battery

```
average current  I_avg = d_tx x I_tx + d_rx x I_rx + d_sb x I_sb
                 default duty 5% transmit, 5% receive, 90% standby
energy           Ah = I_avg x runtime hours
battery          nameplate Ah = Ah / usable depth of discharge
daily            I_avg x 24 h, for sizing solar or generator recharge
repeater caveat  a repeater transmits whenever ANY user talks; enter the
                 site's measured or expected duty, not the portable default
```

Transmit current is many times receive current, but a radio spends most of its time listening, so the average sits
much closer to the standby draw than the transmit draw. The 5-5-90 split is the convention manufacturers use to state
battery life, and it is a reasonable default for a base station or a portable in routine use. The tile computes the
weighted average and the ampere-hours for a stated runtime, then divides by the usable depth of discharge to get the
nameplate battery.

A repeater is the case where the default is wrong. It retransmits every user on the channel, so during an incident
its transmit fraction can be several times 5%, and its battery empties accordingly. The tile flags the repeater case
and asks for the site's expected duty; the difference between a quiet day and an incident is the difference between
a battery that lasts the event and one that fails in the middle of it.

The daily ampere-hours are reported separately because a site that must run indefinitely is sized by its recharge,
not its battery: the solar array or the generator's run hours have to replace a day's consumption every day.

**Inputs:** the transmit, receive, and standby currents, the duty fractions (default 5/5/90), the required runtime, and the usable depth of discharge

**Outputs:** the average current, the ampere-hours for the runtime, the nameplate battery ampere-hours, and the daily ampere-hours

## 3. Worked example

A temporary base station drawing 12 A on transmit, 1.2 A on receive, and 0.8 A on standby, to run 72 hours on a
battery used to 50% depth of discharge:

```
I_avg   0.05 x 12 + 0.05 x 1.2 + 0.90 x 0.8 = 0.60 + 0.06 + 0.72 = 1.38 A
72 h    1.38 x 72 = 99.4 Ah
battery 99.4 / 0.50 = 198.7 Ah nameplate
daily   1.38 x 24 = 33.1 Ah per day to recharge
```

**About 200 Ah of battery for three days** -- and transmit, at 5% of the time, is 43% of the energy.

**The same equipment as a busy repeater at 25% transmit, 25% receive, 50% standby:**

```
I_avg = 3.00 + 0.30 + 0.40 = 3.70 A    72 h = 266.4 Ah    battery = 532.8 Ah
```

**Nearly three times the battery** for the same radio, because the duty changed.

## 4. Scope and non-goals

A battery energy estimate from duty-cycle-weighted current. It does not account for battery temperature derating, aging, or Peukert effects at high discharge rates (`off-grid-battery`, `battery-runtime`), inverter or DC-DC converter losses where the radio is not powered directly, or the current of auxiliary equipment at the site (amplifiers, links, lighting) unless added. It does not size a solar array or charger. The equipment manufacturer's current specifications, the site's measured traffic, and the system's engineer govern.
