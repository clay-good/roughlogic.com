# roughlogic.com Specification v1748 -- Fume Hood Face Velocity and Exhaust CFM (`calc-cross.js`, Group C HVAC, laboratory, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; cross-trade gap fills), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A fume hood protects by pulling air in across its face fast enough to carry contaminants away, and the exhaust that takes is the sash opening times the face velocity. It is the single largest airflow in most laboratories and the sash position controls it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive sash width, opening height, or face velocity, or a face velocity outside the acceptable range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the face velocity airflow relation with ANSI/AIHA Z9.5 and ASHRAE 110 named as governing containment, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`fume hood face velocity cfm`, `sash position hood exhaust`, `ashrae 110 containment`, `hood energy laboratory`, `too fast face velocity turbulence`.

## 2. The tile

### 2.1 `fume-hood-face-velocity` -- Fume Hood Face Velocity and Exhaust CFM

```
exhaust airflow    CFM = sash open area x face velocity
face velocity      commonly 80 to 100 fpm; the applicable standard and the institution
                   set it
sash               a hood at full sash open needs far more air than at working height
                   a vertical sash hood at 18 in versus 30 in is a large difference
too fast           above about 125 fpm, turbulence at the face and around the worker
                   can pull contaminants OUT rather than in
containment        face velocity is a surrogate; ASHRAE 110 tracer gas testing is what
                   actually measures containment
VAV hoods          vary exhaust with sash position, which is where the energy saving is
energy             a hood exhausts conditioned air continuously; it is the dominant
                   laboratory energy load
```

Face velocity is a surrogate for containment rather than a measure of it, and the distinction matters because
faster is not better. Above roughly 125 fpm the air entering the face becomes turbulent, and eddies form around
the worker standing at the hood -- so a hood running too fast can draw contaminants out of the hood and into the
worker's breathing zone, which is precisely the opposite of the intent. Containment is measured by tracer gas
testing with a mannequin, and a hood can pass a face velocity check and fail a containment test.

The sash is the control and it is where the energy is. A hood's exhaust is proportional to the open area, so a
six-foot hood at full sash open exhausts two or three times what it does at an 18 inch working height -- and that
air is conditioned air, exhausted continuously, which makes hoods the largest energy load in most laboratories.
Sash management, whether by training, by an automatic sash closer, or by variable air volume control, is the
saving.

The room-level consequence is the one that surprises people designing laboratories. A room with several hoods
exhausts an enormous quantity of air, and that air has to be supplied, conditioned, and made up -- so hood count
drives the mechanical system for the whole building, and reducing hood count or sash area is worth more than any
efficiency measure applied to the system that serves them.

**Inputs:** the hood width, the sash opening height, the target face velocity, the number of hoods, the operating hours, and the outdoor air conditioning cost

**Outputs:** the sash open area, the exhaust airflow at the entered face velocity, the airflow at full sash open and at working height, the annual conditioned air exhausted and its energy cost, the saving from a stated sash management practice, and a flag where the face velocity is above the turbulence threshold

## 3. Worked example

A 6 ft wide hood with the sash at an 18 in working height, at a 100 fpm face velocity:

```
open area = 6 x 18/12 = 9.0 sq ft
exhaust   = 9.0 x 100 = 900 cfm
```

Now the same hood at a 30 in sash:

```
area    = 6 x 30/12 = 15.0 sq ft
exhaust = 1500 cfm
```

**600 cfm more**, continuously, for a sash left open. That air is conditioned and exhausted, and
across a heating season the energy in it is substantial:

```
heating 600 cfm through a 60 degF rise = 1.08 x 600 x 60 = 39 kBTU/h
```

**On six hoods with sashes habitually left open, that is a boiler.** Sash management -- training, automatic sash
closers, or VAV control -- is the largest single energy measure available in most laboratories, and it costs
nothing per hood compared with the mechanical capacity it saves.

**And faster is not safer.** Above about 125 fpm the air entering the face turns turbulent and eddies form around
a person standing at the hood, which can carry contaminants OUT of the hood into their breathing zone. A hood
found running at 150 fpm is not a well-performing hood; it is one that needs balancing down.

**Face velocity is a surrogate.** Containment is measured by ASHRAE 110 tracer gas testing with a mannequin at
the face, and a hood can pass a velocity traverse and fail containment -- because of cross-drafts from a door or a
supply diffuser, of foot traffic behind the worker, or of the way the work inside the hood is arranged. The
velocity check is a routine surveillance; the tracer test is the performance measurement.

## 4. Scope and non-goals

An airflow calculation. Face velocity requirements are set by the applicable standard, the institution's
chemical hygiene plan, and in some cases by the material being handled, and they vary -- 80, 100, and other
values are all in use, and higher is not automatically better. Face velocity is a surrogate for containment;
ASHRAE 110 testing, as manufactured, as installed, and as used, is what measures performance, and cross-drafts,
room air distribution, foot traffic, and the arrangement of apparatus inside the hood all affect containment
without affecting face velocity. It does not address the hood's suitability for the material, perchloric acid and
radioisotope hoods being special cases, or the ductwork, exhaust fan, discharge location, and emergency power
that a hood system requires. It does not address the room-level air balance and pressure relationships
(`lab-containment-pressure`). ANSI/AIHA Z9.5, ASHRAE 110, the institution's chemical hygiene plan, and an
industrial hygienist govern.
