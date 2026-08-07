# Token Action HUD MEGS

Token Action HUD system module for the [MEGS](https://github.com/worldsofwondergames/megs) (DC Heroes 3rd Edition) system for Foundry VTT.

Token Action HUD puts a repositionable HUD of actions next to the selected token. This module tells it what a MEGS character can do.

## Status

**Phase 2 — skeleton.** The HUD registers and renders its tabs. It does not yet populate them with actions; that is Phase 3. Tracked in [megs#156](https://github.com/worldsofwondergames/megs/issues/156).

## Requirements

| | |
|---|---|
| MEGS system | 1.1.1 or later — earlier versions do not expose the roll classes this module needs |
| Token Action HUD Core | 2.1 or later |
| socketlib | Required by Token Action HUD Core. **Without it Core silently does nothing** — no HUD, no error message |
| Foundry VTT | 13.351+, verified on 14.365 |

## Installation

Paste this manifest URL into Foundry's **Install Module** dialog:

```
https://raw.githubusercontent.com/worldsofwondergames/token-action-hud-megs/main/module.json
```

## Design

Every action routes to an existing MEGS entry point rather than reimplementing a roll. A HUD roll therefore behaves identically to the same roll from the character sheet — same hero point dialog, doubles prompt, column shifts and chat formatting.

Nothing in the MEGS system depends on this module. The system exposes `game.megs`, and this module reads from it; the system contains no reference to Token Action HUD at all.

## Planned layout

| Tab | Contents |
|-----|----------|
| Attributes | Physical / Mental / Mystical. Only the Acting attributes (DEX, INT, INFL) roll; the rest open the sheet |
| Powers | Powers with APs above 0, excluding those belonging to gadgets |
| Skills | Skills with APs above 0, excluding those belonging to gadgets; subskills optional |
| Gadgets | Top-level gadgets, using the system's own ability picker |
| Utility | End Turn, Roll Initiative |

Vehicles and locations show gadgets only. The `pet` actor type is unsupported — the MEGS system removes it at setup.

## Settings

- **Show subskills** — display trained subskills beneath their parent skill. Default off.
- **Show non-rollable attributes** — display Effect and Resisting attributes alongside the Acting ones. Default on.
