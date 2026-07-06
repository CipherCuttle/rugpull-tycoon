# Rugpull Tycoon Top-Down Extraction Rebuild Plan v0.1

Status: docs-only rebuild plan.
Date: 2026-07-06.
No implementation has been done.

## Plan Summary

Build nothing yet. Decide the prototype lane, then build the smallest disposable top-down extraction prototype that can answer one question:

Can `THE BAG -> Lost Bag -> RUG EXIT -> Rent` feel better as physical arcade extraction than as a chart-clicker layer?

Recommended first path: keep React/Vite as the shell and mount a KAPLAY prototype in an isolated route/component. Backup: same React shell, but Phaser instead of KAPLAY if the team wants a production-leaning engine from the first spike.

## No-Code Phase 0 Decisions

These decisions should be made before any code is written:

| Decision | Recommendation | Why |
|---|---|---|
| Prototype engine | KAPLAY first | Fastest feel test, MIT, Vite-friendly, simple enough for one-room brawler behavior. |
| Backup engine | Phaser | Mature web-game engine with strong tilemap path if KAPLAY is too toy-like. |
| Shell strategy | React remains shell | Preserves current repo, safety footer, tone, docs, future UI, and save ownership. |
| First map format | Hand-authored JSON or inline data | Do not install/configure Tiled/LDtk before the loop is fun. |
| Combat fantasy | Melee/stun/trash first | Avoids Hotline-clone read and fits pathetic diner scam comedy. |
| Art | CC0 placeholders or simple generated-by-us shapes | License-safe and fast. No production asset search yet. |
| Failure model | One-hit or two-hit failure, Bag drops physically | This is the thesis. It must be tested immediately. |
| Banking model | RUG EXIT banks run Bag into Rent | Rent makes extraction matter. |
| Legal boundary | Design-pattern study only | No copied commercial code/assets/levels/story/music/names. |
| Current chart loop | Parked | Preserve as old prototype unless the team explicitly asks for migration. |

Phase 0 output should be a one-page decision receipt before implementation:

- Engine chosen.
- Backup chosen.
- Whether `/prototype/topdown-extraction` is a route, a hidden dev screen, or an isolated component.
- Placeholder asset source and license posture.
- Whether `Lost Bag` persists in localStorage for P1 or resets on refresh.

## Prototype 1 Scope

Prototype 1 should be disposable and small.

Target route/component name when implementation is approved:

```txt
/prototype/topdown-extraction
```

Required contents:

| Feature | Exact P1 target |
|---|---|
| Room | One rectangular Waffle Mausoleum test room with walls/props as simple rectangles. |
| Player | One top-down Dust pawn with WASD/arrow movement and pointer/keyboard-facing attack. |
| Objective | One Bag pickup. |
| Exit | One RUG EXIT zone. |
| Enemies | Three Jeets. Basic patrol, chase on sight/range, bump/attack. |
| Attack | One cracked-phone shove or short melee cone/box. Stuns/knocks back Jeets briefly. |
| Failure | One-hit or two-hit failure. Pick one and test which feels better. |
| Lost Bag | On failure, drop current Bag at the failure position. On restart, let player recover it. |
| Banking | Reaching RUG EXIT with Bag converts it to Rent and restarts/clears room. |
| Restart | Instant restart button/key and automatic fast restart on failure. |
| Camera | Follow player with mild clamp and short impact shake. |
| Feedback | Hitstop, screen shake, simple particles, Bag dropped marker, RUG EXIT flash. |
| Art | Placeholder shapes only. No production sprites. |
| Audio | Optional bleep/noise only if already available or generated in-code; no asset hunt. |

Explicit P1 exclusions:

- No meta shop.
- No Pawn Terminal upgrades.
- No cards.
- No dialogue.
- No bosses.
- No map editor.
- No multi-room campaign.
- No guns-first combat.
- No real gore.
- No real crypto, wallets, trading, exchanges, token addresses, or logos.
- No production asset import.

## Prototype 2 Scope

Prototype 2 only happens if P1 passes kill criteria.

Target additions:

| Addition | Purpose |
|---|---|
| Two or three connected rooms | Test extraction pacing and route memory. |
| Tiled or LDtk map pipeline | Move from rectangle test room to editable layout. |
| Two enemy archetypes | Jeet rusher plus Fake Auditor blocker or Pawn Terminal junk thrower. |
| Throwable trash | Frozen waffle / keyboard / receipt roll as one-use stun. |
| Better Lost Bag pressure | Lost Bag behind enemy route or in a risky recover location. |
| Exit greed choice | Visible extra loot between player and exit. |
| Minimal HUD | Bag, Lost Bag, Rent, room status, restart. |
| Placeholder asset set | CC0 or verified-license sprites/tiles only. |
| Browser playtest receipt | Timing, deaths, recoveries, restarts, fun notes. |

Still excluded in P2:

- No full campaign.
- No permanent upgrade economy.
- No elaborate dialogue.
- No procedural generation.
- No monetization/publishing/deployment work.
- No production art pipeline until the loop survives playtest.

## Kill Criteria

Prototype 1 should be killed or redirected if any of these are true after a short playtest:

| Kill criterion | Measurement |
|---|---|
| Restart is not instant enough | Player waits more than about 1 second to regain control after failure. |
| Bag does not create panic | Players ignore Bag drops or do not care about recovery. |
| Combat feels like pushing boxes | Shove lacks hitstop, feedback, readable range, or enemy reaction. |
| Enemy readability is poor | Player cannot tell why they failed within 1 second. |
| Room is solved once and boring | No tension after two or three retries. |
| Engine friction dominates | More effort goes into engine plumbing than feel after the one-room spike. |
| It reads as Hotline clone | Guns/masks/neon violence overpower diner scam extraction tone. |
| It reads as real scam/trading | Any mechanic implies actionable crypto or fraud behavior. |

If P1 fails because of game feel, change mechanics, not art. If P1 fails because of engine friction, run the same room in Phaser before changing the game concept.

## File Plan For Future Implementation

Do not create these files until implementation is explicitly approved.

If KAPLAY path is approved:

```txt
src/prototypes/topdown-extraction/
  TopdownExtractionPrototype.tsx
  game.ts
  constants.ts
  roomData.ts
  state.ts
  types.ts
  styles.css
```

If Phaser path is approved:

```txt
src/prototypes/topdown-extraction/
  TopdownExtractionPrototype.tsx
  phaserGame.ts
  scenes/
    BootScene.ts
    ExtractionRoomScene.ts
  roomData.ts
  state.ts
  types.ts
  styles.css
```

Shared React integration likely touches:

```txt
src/App.tsx
src/screens/HomeScreen.tsx or new prototype screen registration
src/styles/theme.css or prototype-local CSS import
package.json only after explicit dependency approval
```

Do not touch the current reducer/save files for P1 unless the approved implementation specifically needs a localStorage proof. Prefer isolated prototype state first.

## Integration Boundary With React

React owns:

- Shell layout.
- Prototype entry/exit UI.
- Safety footer.
- Optional debug panel.
- High-level saved summary if needed.
- Future menus/dialogue/meta screens.

Game engine owns:

- Canvas.
- Player movement.
- Collision.
- Enemy behavior.
- Attack hitboxes.
- Room state.
- Bag position and physics-lite pickup/drop.
- RUG EXIT detection.
- Camera and impact feedback.

Boundary contract:

```ts
type ExtractionRunSummary = {
  rentBanked: number
  bagRecovered: boolean
  deaths: number
  escaped: boolean
  elapsedMs: number
}

type ExtractionCallbacks = {
  onBankRent: (amount: number, summary: ExtractionRunSummary) => void
  onRunFailed: (summary: ExtractionRunSummary) => void
  onPrototypeReady: () => void
}
```

Do not bind the first prototype to the existing chart reducer. Keep it isolated so it can be deleted cleanly if the pivot fails.

## State Model Sketch

P1 state should be tiny and physical:

```ts
type BagState =
  | { kind: 'none' }
  | { kind: 'carried'; value: number }
  | { kind: 'dropped'; value: number; x: number; y: number; recoveredFromDeath: boolean }

type PlayerState = {
  x: number
  y: number
  hp: 1 | 2
  facingRadians: number
  attackCooldownMs: number
  carryingBag: boolean
}

type JeetState = {
  id: string
  x: number
  y: number
  mode: 'patrol' | 'chase' | 'stunned'
  stunUntilMs: number
  patrolIndex: number
}

type ExtractionState = {
  roomId: 'waffle-mausoleum-p1'
  runId: number
  rentBanked: number
  bag: BagState
  lostBag: BagState
  player: PlayerState
  jeets: JeetState[]
  status: 'playing' | 'failed' | 'escaped'
  deaths: number
  startedAtMs: number
}
```

P1 can store everything in memory. If persistence is tested, persist only:

```ts
type ExtractionSaveV1 = {
  saveVersion: 1
  rentBanked: number
  lostBag: { value: number; roomId: string; x: number; y: number } | null
}
```

Use a new localStorage key only if approved:

```txt
rugpull-tycoon.topdown-extraction.prototype.v1
```

## Exact Acceptance Criteria

Prototype 1 acceptance:

| Area | Acceptance criterion |
|---|---|
| Scope | Exactly one playable room, one player, one Bag, one RUG EXIT, three Jeets. |
| Feel | Player can move, shove, grab Bag, drop Bag on failure, restart, recover Bag, and bank Rent. |
| Restart | Failure returns to a playable state without a menu flow. |
| Lost Bag | Lost Bag is visible and recoverable at its physical drop point. |
| Banking | RUG EXIT converts carried Bag into Rent and visibly confirms it. |
| Readability | Player, Jeets, Bag, Lost Bag, exit, attack range, and failure are readable at mobile portrait and desktop. |
| Tone | Diner scam extraction, dirty neon, pathetic comedy. No clean cyberpunk, no generic fantasy. |
| Legal | No Hotline Miami code/assets/levels/story/music/names. No unclear third-party assets. |
| Safety | No real crypto logos, wallets, trading, deposits, withdrawals, token addresses, or how-to-crime steps. |
| Repo | No commits/pushes unless separately asked. No source asset import from `/home/swirky/Pictures`. |
| Tests | `pnpm build`, `pnpm lint`, `git diff --check` pass. Browser smoke must prove the canvas is not blank and the full loop works. |

Prototype 2 acceptance:

| Area | Acceptance criterion |
|---|---|
| Map | At least two rooms via Tiled/LDtk or a deliberately chosen alternative. |
| Enemy variety | One rusher plus one blocker/thrower type. |
| Greed | Player has a real choice between exiting and going for more Bag value. |
| Loop | At least three consecutive deaths/retries remain fast and understandable. |
| Asset ledger | Any third-party asset used has source URL, author, license, download date, and attribution requirement recorded. |

## Commands To Verify

For this docs-only task:

```sh
pnpm build
pnpm lint
git diff --check
git status -sb
git diff --stat
```

For a future implemented prototype, add:

```sh
pnpm dev
```

Then run a browser smoke test that proves:

- Prototype route/component loads.
- Canvas is nonblank.
- Player moves.
- Attack stuns/hits.
- Jeets can fail the player.
- Bag drops physically.
- Restart is instant.
- Lost Bag can be recovered.
- RUG EXIT banks Rent.
- No console errors.

## What Not To Build Yet

- No campaign.
- No district map.
- No production art.
- No generated sprite-sheet pipeline.
- No Pawn Terminal upgrades.
- No shop economy.
- No cards.
- No dialogue system.
- No boss fights.
- No procedural rooms.
- No multiplayer.
- No gore system.
- No real crypto mechanics.
- No wallet/trading/exchange/deposit/withdraw UI.
- No map editor until the one-room loop passes.
- No copied Hotline Miami code, assets, levels, music, masks, names, or story.
- No dependency changes until the engine choice is explicitly approved.

## Recommended Path

1. Approve or reject KAPLAY for Prototype 1.
2. If approved, implement the one-room KAPLAY spike inside React/Vite.
3. Playtest for 15-20 minutes, focusing only on Bag panic, Lost Bag recovery, enemy readability, and restart cadence.
4. If fun is present but engine depth is suspect, rebuild the same room in Phaser before expanding scope.
5. If fun is absent, change the core verbs or enemy pressure before adding content.

Verdict: READY_FOR_NO_CODE_ENGINE_DECISION. Do not implement until the prototype path is explicitly chosen.
