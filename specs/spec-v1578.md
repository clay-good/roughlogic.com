# roughlogic.com Specification v1578 -- Door Undercut Free Area and Transfer Airflow (`calc-doorhardware.js`, Group E Carpentry and Construction, door hardware, 1 New Tile)

> **Status: LANDED 2026-09-05. Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-doorhardware.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; door hardware and locksmithing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A door undercut is the transfer air path for a room with no return, and how much air it will actually pass is a free-area calculation with a velocity limit that noise sets. Rooms get starved or turned into whistles because nobody did the arithmetic.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive door width, undercut height, or required airflow, or a face velocity at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the free-area transfer relation with NFPA 80 named for rated door clearances, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`door undercut airflow`, `transfer air door gap`, `undercut free area cfm`, `transfer grille sizing`, `door gap velocity noise`.

## 2. The tile

### 2.1 `door-undercut-transfer-air` -- Door Undercut Free Area and Transfer Airflow

```
free area       A = door width x undercut height (sq in, then sq ft)
transfer air    CFM = A x face velocity
velocity limit  roughly 300 fpm before the gap becomes audible; 400 fpm is noisy
undercut needed U = required CFM / (width x velocity) x 144      (inches)
alternatives    a transfer grille or a louvered door where the undercut needed is impractical
```

The relation is trivial and the constraint is acoustic. A door gap will pass almost any airflow if you push it
hard enough, and the result is a whistle that occupants notice immediately -- so the practical limit is a face
velocity around 300 fpm, and above that the answer is more free area rather than more pressure. A one-inch
undercut on a three-foot door gives a quarter of a square foot, which at 300 fpm is about 75 cfm: enough for a
small office, nowhere near enough for a conference room.

That is the arithmetic that decides between an undercut and a transfer grille. Rooms needing a few hundred cfm of
transfer air need free area measured in square feet, not square inches, and no realistic undercut provides it. A
door cut two inches to solve an airflow problem also fails its fire rating, fails its smoke and sound
performance, and looks like a mistake.

There is a second consequence worth flagging: the same gap is a sound path. A door undercut sized for airflow
undoes much of the door's acoustic rating, which in an office or an exam room is a privacy problem rather than an
airflow one.

**Inputs:** door width, undercut height, the required transfer airflow, the acceptable face velocity, and whether the door is fire or smoke rated

**Outputs:** the free area in square inches and square feet, the airflow at the entered velocity, the velocity at a required airflow with a noise flag above the limit, the undercut needed for the required airflow, and the transfer grille free area required where the undercut is impractical

## 3. Worked example

A 36 in door with a 0.75 in undercut:

```
free area = 36 x 0.75 = 27 sq in = 0.188 sq ft
at 300 fpm = 0.188 x 300 = 56 cfm
```

56 cfm. Adequate for a private office with a small diffuser.

Now a conference room needing 250 cfm of transfer air through the same door:

```
velocity = 250 / 0.188 = 1333 fpm
```

**1333 fpm** -- more than three times the noise threshold, and the door will whistle. Work it the other
way:

```
undercut needed = 250 / (36/12 x 300) x 12 = 3.33 in
```

Two and a half inches of undercut, which is not a door anyone will accept and which destroys the door's fire,
smoke, and sound performance. The correct answer is a transfer grille or a ducted return with
`250 / 300` = 0.83 sq ft of free area, and if sound privacy matters, a lined transfer boot rather than a
plain grille.

## 4. Scope and non-goals

A free-area and velocity calculation. It does not address fire and smoke doors, where an undercut is limited by
the door's listing and by NFPA 80 clearance requirements and where a transfer opening is generally not permitted
at all -- cutting a rated door voids its label. It does not evaluate acoustic performance, and an undercut sized
for airflow will degrade sound isolation substantially; where privacy matters the transfer path must be treated.
It does not address smoke control, pressurization, or the pressure difference the transfer path actually operates
under, which determines the real flow rather than an assumed face velocity. It does not size the room's supply or
return. The adopted mechanical code, NFPA 80 for rated doors, and the mechanical designer govern.
