# roughlogic.com Specification v1382 -- HazMat Placarding Threshold Screen (49 CFR 172.504) (calc-trucking.js, Group J, trucking and logistics, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`**
> (Group J, trucking and logistics), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Whether a shipment must be placarded turns on a table-driven aggregate-weight rule that trips at 1,001 pounds -- except for the hazard classes where any quantity triggers it. The catalog has no hazardous-materials tile, and the 1,001 lb aggregate is the single most misapplied number in ground transport of hazmat.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive gross weight, or an aggregate below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): 49 CFR 172.504 Table 1 and Table 2 placarding requirements, cited by section and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `hazmat-placard-threshold` -- HazMat Placarding Threshold Screen

```
Table 1 material present in any quantity        -> placard required
aggregate gross weight of Table 2 materials     -> placard required at 1,001 lb or more
aggregate                                        = sum of gross weight of every Table 2 package
```

Section 172.504 splits hazardous materials into two tables. **Table 1** materials -- among them explosives of
divisions 1.1, 1.2, and 1.3, poison-inhalation-hazard materials, and certain radioactives -- must be placarded at
*any* quantity, with no threshold at all. **Table 2** covers everything else, and a vehicle carrying Table 2
materials must be placarded when the aggregate gross weight of all of them reaches **1,001 pounds**.

Two details cause most of the errors. First, the aggregate is across *all* Table 2 hazard classes on the vehicle,
not per class -- 600 lb of flammable liquid and 500 lb of corrosive is 1,100 lb aggregate and the vehicle gets
placarded for both. Second, it is **gross** weight, package and contents together, not net product weight, and
drums and totes weigh a great deal empty.

**Inputs:** for each material, its hazard class or division, whether it is a Table 1 material, and its gross
weight; plus the number of distinct Table 2 classes present.

**Outputs:** Table 2 aggregate gross weight, whether the 1,001 lb threshold is met, whether any Table 1 material
forces placarding regardless, and which placards the classes present imply.

## 3. Worked example

A mixed load: 400 lb gross of a Class 3 flammable liquid and 700 lb gross of a second Class 3 material, nothing
from Table 1:

```
Table 2 aggregate = 400 + 700 = 1,100 lb
1,100 >= 1,001                -> PLACARD REQUIRED
```

Drop the second material to 550 lb and the aggregate is 950 lb -- under the threshold, and the vehicle need not be
placarded. Everything else still applies: shipping papers, package marking and labeling, segregation, emergency
response information, and driver training do not have a 1,001 lb threshold. Under-1,001 is a placarding
exemption, not a hazmat exemption, and treating it as one is how carriers end up cited.

## 4. Scope and non-goals

A screening aid for one narrow question. It does not classify materials -- classification, proper shipping name,
UN number, packing group, and whether a material appears in Table 1 all come from the Hazardous Materials Table at
49 CFR 172.101, and getting classification wrong makes every downstream answer wrong. It does not address the
subsidiary-hazard, DANGEROUS-placard, bulk-packaging, and division-specific rules that modify the general
requirement, nor the additional obligations that attach at any quantity. Anyone offering or transporting
hazardous materials must be trained under 49 CFR 172 Subpart H. PHMSA, FMCSA, and the shipper's own hazmat
authority govern.
