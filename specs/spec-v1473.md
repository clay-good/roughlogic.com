# roughlogic.com Specification v1473 -- Coupling Alignment Tolerance by Speed (`calc-millwright.js`, Group G Cross-Trade Utilities, millwrighting, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-millwright.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; millwright, rotating equipment, and pneumatics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Rim-and-face and reverse-dial produce numbers. Whether those numbers are good enough depends almost entirely on speed, and the tolerance tightens far faster with rpm than intuition suggests. A 0.005 in offset that is fine at 900 rpm is a failure at 3,600.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive speed or coupling span, or a negative measured offset or angularity returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the speed-dependent field alignment tolerance convention with the manufacturer named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`alignment tolerance rpm`, `coupling alignment limit`, `acceptable misalignment speed`, `alignment excellent acceptable`, `spacer coupling slope`.

## 2. The tile

### 2.1 `coupling-alignment-tolerance` -- Coupling Alignment Tolerance by Speed

```
offset tolerance     falls with speed; roughly inversely
angularity tolerance  expressed in mils per inch of coupling span
short couplings      offset and angularity checked separately
spacer couplings     checked as slope across the spacer, not offset
```

Alignment tolerance is a statement about the cyclic bending the coupling and the shaft ends see once per
revolution. Double the speed and the same misalignment produces the same deflection twice as often, so the
allowable misalignment falls roughly in proportion. The widely used field tables reflect that: an acceptable
offset near 0.009 in below 1,000 rpm tightens to about 0.003 in at 3,000 and below 0.0025 in above it, with an
"excellent" column roughly half of each.

Two things this catches. First, a coupling manufacturer's published capability is not a tolerance -- couplings
can accommodate far more misalignment than the bearings and seals behind them will tolerate, and the machine, not
the coupling, sets the limit. Second, for a spacer coupling the meaningful quantity is the SLOPE across the
spacer rather than an offset at a plane, and a long spacer legitimately allows a large end-to-end offset while
the slope stays tight.

**Inputs:** operating speed, measured offset and angularity, coupling type and spacer length, and the tolerance table values for excellent and acceptable at that speed

**Outputs:** the applicable offset and angularity tolerance at the entered speed, the measured values as a percent of tolerance, a pass or fail at both the excellent and acceptable levels, and the slope across a spacer where one is entered

## 3. Worked example

A machine at 3600 rpm measured at 0.0035 in offset and 0.8 mils/in of angularity, against typical field
tolerances of 0.0015 in excellent and 0.003 in acceptable for offset, and 0.5 and 1.0 mils/in for angularity:

```
offset      0.0035 in vs 0.003 acceptable  = 117% of tolerance  FAIL
angularity  0.8 mils/in vs 1.0 acceptable  = 80% of tolerance  pass
```

The angle is fine and the offset is not, by 0.0005 in -- half a thousandth. That is the point of running the check
rather than eyeballing the readings: at 3600 rpm half a thousandth is the difference between inside and outside
tolerance, and the same 0.0035 in offset at 1,200 rpm would sit comfortably inside "excellent".

## 4. Scope and non-goals

A comparison of measured values against tolerance values the user supplies. It does not ship a tolerance
table: field tolerance tables are conventions rather than standards, they differ between publishers, and a
machine or coupling manufacturer's own tolerance supersedes any of them. It does not evaluate whether the
coupling can physically accommodate the misalignment, which is a separate manufacturer rating and is nearly
always far looser than what the bearings want. It says nothing about torsional alignment, coupling balance, or
axial float and gap, which have their own limits. Machines on sleeve bearings, gear couplings, and cardan shafts
each follow different rules, and cardan shafts specifically REQUIRE a minimum misalignment to keep the needles
moving. The machine and coupling manufacturers' published tolerances govern.
