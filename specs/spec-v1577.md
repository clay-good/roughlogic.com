# roughlogic.com Specification v1577 -- Key Cut Depth, Spacing, and MACS Check (`calc-doorhardware.js`, Group E Carpentry and Construction, locksmithing, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-doorhardware.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; door hardware and locksmithing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A bitting that looks fine on paper can be uncuttable, because two adjacent cuts too far apart in depth leave no metal between them. MACS -- maximum adjacent cut specification -- is the rule, and checking a bitting against it before cutting saves blanks and prevents keys that break in a cylinder.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a bitting with fewer than two cuts, a depth outside the manufacturer range, or a non-positive MACS value returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the MACS adjacent-cut rule with the manufacturer cut specification named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`macs key cut check`, `maximum adjacent cut specification`, `bitting validity check`, `uncuttable key bitting`, `adjacent cut depth rule`.

## 2. The tile

### 2.1 `key-cut-macs-check` -- Key Cut Depth, Spacing, and MACS Check

```
cut depth       each position has a depth number; deeper cuts remove more metal
MACS            the maximum allowable difference between adjacent cut depths
                manufacturer specific, commonly 7 for a 0 to 9 depth system
check           |depth(i) - depth(i+1)| <= MACS for every adjacent pair
root spacing    cut spacing and root width determine whether adjacent cuts overlap
consequence     exceeding MACS leaves a knife edge or a hole; the key breaks or will not cut
```

The rule exists because a key's cuts are angled flats, and two adjacent cuts at very different depths have
their slopes intersect below the top of the blade. The metal that should sit between them is not there, so the
cutter either breaks through or leaves a fragile ridge that fails in service -- usually inside a cylinder, which
is the expensive way to find out.

A MACS violation is also a system design problem rather than only a cutting one. In a master key system the
progression generates bittings automatically, and a progression that does not respect MACS will produce
uncuttable change keys somewhere in the sequence. Checking the whole bitting list before any cylinder is pinned
is the discipline, and it belongs alongside `master-key-bitting-capacity` at the design stage.

The related rule is that a bitting should avoid long runs of identical depths, which produce a key that is easy
to decode and to impression, and that avoid the shallowest cut at the shoulder position where the key is
weakest. Neither is a MACS matter but both are checked at the same moment.

**Inputs:** the bitting as a sequence of depth numbers, the manufacturer MACS value, the allowable depth range, and optionally the root spacing and cut angle

**Outputs:** each adjacent pair difference against MACS, a pass or fail per pair, the failing positions named, the nearest compliant bitting, and a warning for repeated depths or a shallow shoulder cut

## 3. Worked example

A six-pin bitting of 3-8-1-5-4-6 against a MACS of 7:

```
3 -> 8 : difference 5   pass
8 -> 1 : difference 7   pass (at the limit)
1 -> 5 : difference 4   pass
5 -> 4 : difference 1   pass
4 -> 6 : difference 2   pass
```

Cuttable, though the 8-to-1 transition sits exactly at MACS and will look dramatic on the blade.

Now a bitting of 2-9-1-4-6-3 against the same MACS:

```
2 -> 9 : difference 7   pass
9 -> 1 : difference 8   FAIL -- exceeds MACS by 1
1 -> 4 : difference 3   pass
```

Position 2 to 3 cannot be cut. The nearest compliant options are to raise the third cut to 2 (difference 7) or
lower the second to 8 (difference 7), and either changes the key's operation -- so this is a design correction to
make in the bitting list, not a decision for whoever is standing at the machine.

A system whose progression produces this bitting will produce others like it, which is the reason to validate the
whole list rather than each key as it is ordered.

## 4. Scope and non-goals

A MACS check against a value the user supplies. MACS, the depth increment, the allowable depth range, root
spacing, and cut angle are all manufacturer and keyway specific, and the manufacturer's cut specification
governs; a value used for the wrong keyway gives a confident wrong answer. It does not verify that a bitting is
appropriate for a system -- that it does not conflict with a master, does not cross-key another cylinder, and
follows the intended progression -- which is `master-key-bitting-capacity` territory and, in practice, a bitting
chart. It does not address key blank selection, keyway restriction, or the legal and policy controls on
duplicating restricted keys, and it does not address high-security, dimple, sidebar, or electronic systems, which
follow different rules entirely. The lock manufacturer's cut specification, a qualified locksmith, and the
facility's key control policy govern.
