# roughlogic.com Specification v1439 -- Spray Booth Airflow and Makeup Air Load (calc-shop.js, Group G, shop and industrial, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop and industrial), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** A spray booth is sized by face velocity, which is a code requirement rather than a design choice, and the airflow that results is almost always larger than anyone expects -- and it all has to be replaced with tempered makeup air. The heating load on that makeup air is routinely the largest single load in a body shop and it is not in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive booth opening area, face velocity, or temperature rise, or an airflow at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the face-velocity ventilation requirement of NFPA 33 and OSHA 1910.107 for spray application, and the sensible makeup-air relation Q = 1.08 x cfm x delta T, cited by number and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `spray-booth-airflow` -- Spray Booth Airflow and Makeup Air Load

```
exhaust airflow  = booth opening area x design face velocity
makeup airflow   = exhaust airflow (plus any required negative pressure allowance)
heating load     = 1.08 x makeup cfm x (indoor target - outdoor design temperature)
gas input        = heating load / burner efficiency
```

Spray booth ventilation is not sized for comfort or even for the paint -- it is sized to keep the vapor
concentration far below the lower flammable limit and to keep overspray moving away from the operator. NFPA 33 and
OSHA 1910.107 set that as a **face velocity** across the booth opening, commonly 100 fpm for an open-face booth,
and the airflow follows from the opening area whether the booth is spraying or not.

That air leaves the building, and it has to be replaced. Replacing it in January is the expensive part: the
sensible load is `1.08 x cfm x delta T`, and at booth airflows the delta T does not have to be large before the
number is enormous. A body shop that runs its booth through a northern winter is heating outdoor air to room
temperature at several hundred thousand BTU per hour, continuously, and the makeup air unit is the largest
appliance in the building.

**Inputs:** booth opening width and height (or the booth's cross-section for a downdraft), design face velocity,
indoor target and outdoor design temperature, makeup air unit efficiency, hours of operation and fuel price for
the operating figure.

**Outputs:** exhaust and makeup airflow, sensible heating load in BTU/hr and MBH, required gas input, and the
seasonal or hourly operating cost.

## 3. Worked example

An open-face booth 14 ft wide and 9 ft high at a 100 fpm design face velocity, heating makeup air from a 20 F
outdoor design temperature to 70 F:

```
opening      = 14 x 9              = 126 sq ft
exhaust      = 126 x 100           = 12,600 cfm
heating load = 1.08 x 12,600 x 50  = 680,400 BTU/hr = 680 MBH
```

Six hundred and eighty thousand BTU per hour -- more than most residential furnaces put out in a day, running
whenever the booth runs. At $1.20 per therm and 80% burner efficiency, that is about $10 an hour in gas alone, so
booth discipline (spraying in batches, not leaving the fan running) is worth real money. Note what the face
velocity does: nothing about it is negotiable downward, because it is a life-safety requirement, but a smaller
booth opening is a smaller airflow -- a 10 ft wide booth needs 9,000 cfm and costs 29% less to temper, for the
same 100 fpm.

## 4. Scope and non-goals

Airflow and sensible heating. It does not evaluate the flammable-vapor dilution requirement directly, which is
the reason the face velocity exists and which for high-volume spraying may require more than the minimum. It does
not address the electrical classification of the booth and the area around it, interlocks between the spray
equipment and the fan, filter loading and the pressure differential that indicates it, exhaust stack height and
discharge location, fire protection, or the air-permit and VOC-emission requirements that govern in most
jurisdictions -- all of which are as consequential as the airflow. NFPA 33, OSHA 1910.107, the adopted mechanical
and fire codes, the air quality authority, and the AHJ govern.
