# Rugpull Tycoon Pivot Top-Down Extraction Forensic v0.1

Status: docs-only forensic rebuild analysis.
Date: 2026-07-06.
Scope: no source-code changes, no game files, no dependency changes, no commits.

## Process Receipt

PLAN -> REPO FORENSIC -> ONLINE RESEARCH -> LICENSE / ASSET AUDIT -> GAME SHAPE MAP -> REBUILD OPTIONS -> RECOMMENDED PATH -> VERIFY -> VERDICT

This document studies a possible pivot from the current chart-clicker into a top-down extraction brawler / room-clearing arcade game. Hotline Miami is treated only as a design reference for pacing, readability, restart cadence, camera impact, and danger. No Hotline Miami code, assets, names, story, masks, music, levels, sprites, or proprietary data should be copied, extracted, decompiled, or reverse engineered.

## Repo State Summary

Commands inspected:

```sh
git status -sb
git branch -vv
git log --oneline --decorate -15
git remote -v
find docs -maxdepth 3 -type f | sort
find src -maxdepth 4 -type f | sort
cat package.json
```

Observed state:

| Item | Finding |
|---|---|
| Current branch | `forensic/chart-hazards-wip` |
| Current HEAD | `99cb9a4 Forensic snapshot chart hazard overlay WIP` |
| Known-good branch | `forensic/current-repo-snapshot` at `80db648 Add bag rug and lost bag loop v0.5A` |
| `origin/main` | Also points to `80db648` |
| Working tree before docs | Clean except branch position |
| Remote | `https://github.com/CipherCuttle/rugpull-tycoon.git` |
| App stack | Vite + React 19 + TypeScript + oxlint |
| Runtime deps | Only `react` and `react-dom` |
| Dev deps | TypeScript, Vite, React plugin, node/react typings, oxlint |

The current branch is not the known-good baseline. It is the chart-hazard overlay experiment. The pivot plan should treat `99cb9a4` as useful forensic evidence of a failed direction, not as the desired base for future mechanics.

Files inspected for product/gameplay shape:

- `docs/NARRATIVE_BIBLE_v0.1_RENT_OR_ROT.md`
- `docs/art/UI_REBUILD_AUDIT_v0.1.md`
- `src/screens/HomeScreen.tsx`
- `src/components/FakeChart.tsx`
- `src/components/BagPanel.tsx`
- `src/game/types.ts`
- `src/game/reducer.ts`
- `src/game/save.ts`
- `src/styles/theme.css`
- `package.json`

## What Current Rugpull Has That Is Valuable

| Valuable part | Why it survives the pivot |
|---|---|
| World and tone | Waffle Mausoleum, Mom's Basement, Pawn Terminal, Telegram Sewer, Reply Guy Motel, Audit District, Sell Wall Tower, and Grease Pit already form a strong map/world vocabulary. |
| Fictional safety rail | The repo already says "No wallets. No trading. No deposits. No withdrawals." This must remain a hard boundary in the brawler. |
| Dustin, Sil, Mom, Marge, Pawn Pete, Jeets, fake auditors | These characters translate naturally into rooms, NPCs, enemy types, and extraction stakes. |
| `THE BAG` / `RUG IT` / `Lost Bag` | This is the strongest mechanic spine. It becomes physical: grab Bag, drop Bag on failure, recover Bag, bank Bag at RUG EXIT. |
| Rent pressure | Rent is clearer as extraction banking than as abstract chart progress. It gives every escape a reason. |
| Dirty neon CSS identity | The current HUD palette and fake-market UI flourishes can frame a canvas game without becoming clean cyberpunk. |
| Save model concepts | `rentMoney`, `runBag`, `lostBag`, `lostBagDepth`, and `runDepth` are already named in the reducer and map cleanly to extraction state. |
| Instant feedback lessons | The reducer/CSS has hard-won feedback principles: non-blocking toasts, clear action words, impact flashes, reduced-motion handling, and no modal spam mid-action. |

## What Should Be Parked

| Parked part | Reason |
|---|---|
| Chart-clicker core loop | The product truth is that it is not fun enough as the final game. |
| Chart-hazard overlay on `forensic/chart-hazards-wip` | It was playtested and felt wrong. It proves "more obstacles on chart" is not the pivot. |
| Resistance wall precision loop | It is deep but over-specialized around a fake chart. Salvage the concepts of timing, impact, wall, and shatter, not the implementation. |
| Upgrade/card/event drawers | Too much meta for the first brawler prototype. Reintroduce only after room feel works. |
| Current generated UI prop PNGs | Existing audit found direct UI prop integration weak: mismatched style, no real alpha, static hero-shot UI, and poor fit with live mechanics. |
| Real market/trading vocabulary beyond satire flavor | Keep fake-market UI, but do not make the action read as real trading or scam instruction. |
| Guns-first combat | Starting with guns risks too much Hotline-clone energy. Rugpull wants cracked-phone shove, receipt printer slap, frozen waffle, pawn-shop keyboard, audit stamp, and throwable trash first. |

## Top-Down Extraction Brawler Thesis

Rugpull Tycoon should test a small, disposable top-down arcade loop:

1. Enter a grimy room or floor.
2. Find and grab THE BAG, receipts, fake alpha, or rent cash.
3. Jeets, fake auditors, reply guys, and pawn-shop weirdos patrol or rush.
4. Dust has a cracked-phone shove, a short melee pop, and one throwable trash item.
5. One or two mistakes drop THE BAG.
6. Death or failure leaves a physical Lost Bag in the room.
7. Retry instantly.
8. Recover the Lost Bag, then escape through RUG EXIT to bank Rent.
9. The player can leave early or get greedy.

The fantasy is not "neon murder fantasy." It is pathetic diner scam extraction: sticky floors, cheap panic, rent due, trash weapons, dirty fake-market UI, and small pathetic wins that feel enormous.

## Hotline-Inspired But Legally Original Boundaries

Allowed study:

- Play a legally owned copy.
- Record private gameplay clips for timing and feel notes.
- Manually draw room diagrams from observation.
- Note restart timing, enemy reaction times, room readability, camera behavior, impact feedback, and how danger is communicated.
- Translate general patterns into an original Rugpull implementation.

Forbidden:

- Do not decompile, reverse engineer, or extract commercial game data.
- Do not use Hotline Miami source code, GameMaker files, sprites, music, masks, names, story, levels, room layouts, or proprietary data.
- Do not use community-maintained Hotline source dumps. One visible GitHub result describes itself as copyrighted and non-commercial; mark it DO NOT USE.
- Do not clone exact rooms, enemy placements, art style, music direction, masks, character archetypes, or narrative premise.

Study notes should be written in terms of general design timings, not proprietary content:

- "enemy notices in roughly X frames at short line-of-sight"
- "restart input returns control in roughly X seconds"
- "camera shake on impact is short and strong"
- "rooms are readable before entry"
- "failure is frequent but cheap"

## Online Research Summary

Primary / official sources checked include:

- Phaser GitHub/package license and Phaser Tilemap API: https://github.com/phaserjs/phaser and https://docs.phaser.io/api-documentation/class/tilemaps-tilemap
- Excalibur GitHub, Tiled plugin, and LDtk plugin: https://github.com/excaliburjs/excalibur, https://excaliburjs.com/docs/tiled-plugin/, https://excaliburjs.com/docs/ldtk-plugin/
- KAPLAY site and GitHub: https://kaplayjs.com/ and https://github.com/kaplayjs/kaplay
- PixiJS GitHub: https://github.com/pixijs/pixijs
- Matter.js GitHub: https://github.com/liabru/matter-js
- Rapier docs: https://rapier.rs/docs/
- Planck.js GitHub: https://github.com/piqnt/planck.js/
- Godot license: https://godotengine.org/license/
- Defold license: https://defold.com/license/
- GDevelop pricing/FAQ and docs: https://gdevelop.io/pricing and https://wiki.gdevelop.io/
- Tiled, LDtk, Ogmo: https://github.com/mapeditor/tiled, https://ldtk.io/, https://ogmo-editor-3.github.io/
- Kenney: https://kenney.nl/support
- OpenGameArt FAQ: https://opengameart.org/content/faq
- Game-icons.net about/license: https://game-icons.net/about.html
- Freesound FAQ: https://freesound.org/help/faq/
- Scenario and PixelLab AI asset tools: https://www.scenario.com/ and https://www.pixellab.ai/

## Engine / Library Comparison

Scores are 1-10. Higher is better except Risk, where 10 means higher risk.

| Option | License posture | Prototype speed | Top-down extraction fit | React/Vite fit | License safety | Asset pipeline friendliness | AI-agent buildability | Long-term viability | Risk | Notes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| KAPLAY | MIT | 10 | 8 | 9 | 9 | 7 | 9 | 6 | 4 | Fastest disposable feel test. Component model, collision, tags, health, Vite use, and tiny syntax are agent-friendly. Best for Prototype 1, not yet the strongest production bet. |
| Phaser | MIT | 8 | 9 | 7 | 9 | 8 | 7 | 9 | 5 | Most mature web-game candidate. Strong tilemap support, examples, ecosystem, and production ceiling. Bigger API surface and React integration ceremony than KAPLAY. |
| Excalibur | BSD-2-Clause | 7 | 8 | 8 | 9 | 8 | 8 | 7 | 6 | TypeScript-first, friendly for structured code, with official Tiled and LDtk plugins. Current 0.x status means more API churn risk than Phaser. |
| PixiJS + custom collision | MIT | 6 | 7 | 8 | 9 | 7 | 5 | 8 | 7 | Excellent renderer, but game loop, collisions, AI, camera, map loading, and state must be owned by us. Good for experts, slower for this decision. |
| PixiJS + Matter.js | MIT + MIT | 6 | 7 | 8 | 9 | 7 | 5 | 7 | 7 | Physics is available, but rigid-body behavior can be too floaty/noisy for crisp one-hit room brawling unless tightly constrained. |
| PixiJS + Rapier | MIT + Apache-2.0 | 5 | 8 | 8 | 9 | 7 | 5 | 8 | 8 | Strong physics, sensors, determinism, JS bindings. More WASM/physics complexity than a one-room prototype needs. |
| Planck.js / Box2D-style | MIT | 5 | 6 | 7 | 9 | 5 | 5 | 6 | 7 | Useful if Box2D simulation is desired, but top-down melee extraction likely needs arcade collisions more than full rigid body simulation. |
| LittleJS | MIT | 8 | 7 | 7 | 9 | 6 | 8 | 6 | 5 | Tiny, no-dependency, AI-friendly docs, particles/sound/input/tile collision. A credible jam-style backup, but less ecosystem depth than Phaser. |
| Godot | MIT | 7 | 9 | 2 | 10 | 9 | 5 | 9 | 7 | Excellent 2D engine for a standalone game. Bad fit if the current React/Vite repo should remain the primary shell. Web export and repo split become project decisions. |
| Defold | Custom Defold License derived from Apache-2.0 | 6 | 8 | 1 | 6 | 7 | 4 | 8 | 7 | Strong standalone 2D engine, no royalties, but custom license and separate tooling make it a later strategic pivot, not the first web spike. |
| GDevelop | MIT for engine/editor; services separate | 7 | 7 | 1 | 8 | 7 | 4 | 6 | 8 | Fast no-code iteration, exports web, supports external tilemaps. Poor fit for codebase continuity, git review, and custom React shell. |
| React + custom canvas/SVG | Project-owned | 6 | 6 | 10 | 10 | 5 | 7 | 5 | 8 | Avoid for P1 unless zero dependencies is mandatory. We would hand-roll too much engine behavior and repeat the clicker-loop trap. |

Primary read: use KAPLAY for the fastest disposable feel test. If the room loop works, graduate to Phaser or Excalibur for a production candidate. Phaser is the stronger default backup because of maturity and tilemap depth; Excalibur deserves a second look if TypeScript ergonomics and LDtk/Tiled plugins matter more than ecosystem size.

## Map Tool Comparison

| Tool / path | License posture | Engine fit | Prototype fit | Production fit | Notes |
|---|---|---|---:|---:|---|
| Hand-authored JSON room | Project-owned | Any | 10 | 4 | Best for Prototype 1. One room, rectangles, spawns, exit, Bag, patrol points. No editor delay. |
| Tiled | GPL/BSD editor code; maps are yours | Phaser, Excalibur, GDevelop, many others | 7 | 9 | Mature, flexible, object layers/properties, widely supported. Use exported JSON/TMJ/TMX, not editor code. |
| LDtk | MIT | Excalibur plugin, custom import, many importers | 7 | 8 | More structured and friendly than Tiled for entities/worlds. Strong candidate once the prototype needs several rooms. |
| Ogmo Editor 3 CE | MIT | Custom import, some ecosystem importers | 6 | 7 | Good lightweight JSON editor, permissive. Less direct Phaser/Excalibur support than Tiled/LDtk. |
| Phaser Tilemap API | MIT engine | Phaser | 7 | 9 | Official API parses Tiled JSON/CSV/arrays and supports orthogonal/isometric/hex/staggered maps. Strong production lane if Phaser wins. |
| Excalibur Tiled plugin | BSD-2-Clause plugin | Excalibur | 7 | 8 | Official plugin supports Tiled map/tileset/template formats, with some map-type limitations. |
| Excalibur LDtk plugin | BSD-2-Clause plugin | Excalibur | 7 | 8 | Official plugin parses LDtk data and adds it to scenes. Good TypeScript candidate. |
| KAPLAY tile/map primitives | MIT engine | KAPLAY | 8 | 5 | Enough for a disposable one-room spike. Verify before committing to a content-heavy production pipeline. |
| Godot TileMapLayer | MIT engine | Godot | 6 | 9 | Excellent if we port to a standalone Godot project. Poor fit for React/Vite shell. |
| GDevelop External Tilemap | MIT engine/editor | GDevelop | 7 | 6 | Useful for no-code prototyping, weaker for this repo's code continuity. |

Recommendation for map tooling: use hand-authored JSON for Prototype 1. Pick Tiled or LDtk only for Prototype 2 after the room loop proves fun.

## Open-Source Reference Audit

Do not copy code unless the license and product strategy explicitly allow it. Copyleft references are study-only unless Rugpull Tycoon accepts the matching open-source obligations.

| Reference | What it is useful for | License posture | Use posture |
|---|---|---|---|
| Hypersomnia, https://github.com/TeamHypersomnia/Hypersomnia | Top-down shooter pacing, in-game editor, web-playable competitive feel, deterministic/networked action ideas | AGPL-3.0 visible in GitHub org search | Study-only. Do not copy into this repo unless accepting AGPL obligations. |
| Flare Engine / Flare game, https://flarerpg.org/ | 2D action RPG maps, Tiled workflow, readable combat spaces | GPL3 per official site | Study-only. |
| Naev, https://github.com/naev/naev | Top-down movement/combat feel in a large open-source game | GPL-family; verify before any reuse | Study-only. |
| Taisei Project, https://github.com/taisei-project/taisei | Bullet readability, dodging, pattern feedback, web-capable top-down STG | Must verify exact repo asset/code licenses; also a Touhou fangame | Study-only; avoid any IP/style carryover. |
| `space-shooter.c`, https://github.com/tsherif/space-shooter.c | Minimal top-down shooter loop and platform architecture | MIT | Possible code-study reference, but not directly relevant to TS/React. |
| Quiver Godot top-down shooter template, https://github.com/quiver-dev/top-down-shooter-core | Godot 4 top-down shooter patterns | MIT | Study if the backup becomes Godot. Do not import now. |
| Phaser examples, https://github.com/phaserjs/examples | Phaser API learning | Code MIT, assets not generally reusable | Code snippets are safer than assets; avoid example media. |
| Community Hotline Miami source dumps | Tempting but legally wrong for this project | Copyrighted / non-commercial claims visible online | DO NOT USE. |

## Free / Legal Asset Source Audit

| Source | License type | Commercial use | Attribution | Style fit for Rugpull | Quality risk | Prototype vs production |
|---|---|---:|---:|---|---|---|
| Existing repo assets | Project-held but provenance needs a durable note | Likely yes if user-generated/owned; verify provenance | Internal attribution/provenance needed | Strong for portraits/backdrops, weak for direct UI props per existing audit | Current generated UI props have no alpha and mismatched style | Use committed assets only where provenance is accepted; do not touch `/home/swirky/Pictures`. |
| Kenney, https://kenney.nl/ | CC0 for game assets | Yes | No | Good placeholders, clean style may need heavy grimy recolor | May look too clean/generic | Excellent prototype placeholders; selected packs can ship if restyled. |
| OpenGameArt, https://opengameart.org/ | Mixed: CC0, CC-BY, OGA-BY, CC-BY-SA, GPL, LGPL, custom | Depends per asset | Depends | Huge range | High license variance and style mismatch | Use only asset pages with verified CC0 or CC-BY/OGA-BY and attribution record. Mark unclear/GPL/SA as DO NOT USE. |
| itch.io free assets, https://itch.io/game-assets/free | Mixed per creator/page | Depends per page | Depends | Very useful for top-down placeholders if curated | "Free" is not a license | Use only packs with explicit license screenshots/records. |
| 0x72 Dungeon Tilesets, https://0x72.itch.io/dungeontileset-ii | CC0 per page | Yes | No | Dungeon/sewer placeholders could be useful after recolor | Fantasy dungeon, not diner crime | Prototype safe, production only if style-adjusted. |
| Pixel Frog Pixel Adventure, https://pixelfrog-assets.itch.io/pixel-adventure-1 | CC0 per page | Yes | No | Sprite placeholder value, but too platformer/fantasy | Wrong genre/style | Prototype only unless radically restyled. |
| Pixel Frog Tiny Swords, https://pixelfrog-assets.itch.io/tiny-swords | Custom permissive use, no resell/repackage | Yes per page | No, appreciated | Good top-down readability, wrong fantasy content | Custom license must be archived | Prototype only unless legal/provenance accepted. |
| Ansimuz packs, https://ansimuz.itch.io/ | Custom personal/commercial use on many pages | Usually yes; verify per pack | Usually appreciated/not required; verify | Good pixel craft, too bright/platformer | Pack-by-pack terms vary | Prototype only unless license page is recorded. |
| Game-icons.net, https://game-icons.net/ | CC BY 3.0 | Yes | Yes | Good for temporary UI icons after dirty recolor | Fantasy/default icon language | Production possible with attribution screen and source list. |
| Freesound, https://freesound.org/ | Mixed CC0, CC-BY, CC-BY-NC | CC0/CC-BY yes; NC no | CC-BY yes | Good for impacts, trash hits, diner ambience | License variance and noisy quality | Use CC0 first; CC-BY only with attribution ledger; avoid NC/SA. |
| OpenGameArt audio | Mixed | Depends | Depends | Good for prototype bleeps/impacts | Same license variance | Same rule as OpenGameArt visual assets. |
| Pixabay/stock-like sources | Custom marketplace licenses | Depends | Depends | Often too stock/clean | License drift and redistribution ambiguity | DO NOT USE until verified for game distribution. |
| Scenario / PixelLab / other AI asset services | Service/model-specific terms | Depends on TOS/model/source refs | Depends | Useful for concepts, portraits, prop sheets | Consistency, alpha, provenance, and TOS risk | Concepts/prototype only until TOS, model rights, prompts, and cleanup workflow are recorded. |

License rule for future asset intake:

1. Prefer CC0.
2. Accept CC-BY/OGA-BY only with an attribution ledger and credits screen.
3. Treat CC-BY-SA, GPL, LGPL, AGPL, NC, ND, unclear, or missing license as DO NOT USE for production unless the plan explicitly accepts the obligation.
4. Archive source URL, author, license, download date, and any license screenshot/text in a future `docs/assets/ASSET_LEDGER` before shipping.

## AI Asset Pipeline Options

AI should reduce hand animation, not define the prototype.

Realistic constraints:

- AI sprite sheets often fail exact frame consistency.
- Transparent alpha often needs cleanup and verification against black, white, red, and checker backgrounds.
- Multi-direction character sheets drift between frames unless heavily constrained.
- AI-generated tiles can look good as concepts but fail seamless tile boundaries.
- Service terms, model licenses, and training-source rights must be verified before production use.

Recommended low-animation direction:

| Pipeline | Use | Pros | Risks | Recommendation |
|---|---|---|---|---|
| CC0 placeholder silhouettes first | Prototype 1 | Fastest, license-safe, proves feel before art | Ugly at first | Do this first. |
| Top-down pawn-style characters | Prototype and production | Few frames, strong silhouette, easy recolor | Less expressive in motion | Best Rugpull fit: sticky little scam pawns with props. |
| Rotation-based phone/weapon sprites | Combat | Avoids 4-direction attack sheets | Can look floaty if not anchored | Use for cracked phone, frozen waffle, audit stamp, keyboard. |
| One/two-frame attack pops | Combat | Big feel for little art | Needs good VFX/audio | Use squash, shake, hitstop, particles. |
| Static prop atlas + collision rectangles | Environments | Lets rooms tell story without animation | Prop clutter can hurt readability | Use greasy static props: booths, trash, printers, motel doors. |
| AI concept -> manual/vector cleanup | Production art | Good taste pipeline, human keeps consistency | Requires curation | Use for portraits, room mood, props. |
| AI generated top-down sprite sheets | Later experiments | Could save time if tool matures | Consistency/alpha/TOS risk | Prototype only until proved by import tests. |
| Orthographic 3D rig renders | Later if animation load grows | Consistent frames from one rig | Blender/rigging overhead | Consider only if many enemies/animations are needed. |
| Skeletal animation | Later | Efficient variation | Tool/runtime overhead, style risk | Avoid for P1. Tiny top-down bodies do not need it. |
| Comic/portrait/dialogue stills | Later | High impact with no animation burden | Can distract from core loop | Save for after room feel. |

Prototype art rule: start with simple readable shapes, CC0 or generated-by-us placeholders, no gore, no real logos, no real crypto imagery, no clean cyberpunk.

## Game Shape Map

### Core verbs

| Verb | Rugpull fiction | Mechanical meaning |
|---|---|---|
| Grab | Snatch THE BAG / receipts / fake alpha | Pick up objective and start pressure |
| Shove | Cracked phone shove | Short melee stun/knockback |
| Slap | Receipt printer slap / audit stamp | Directional attack with cooldown |
| Throw | Frozen waffle / trash / keyboard | One-use interrupt or stun |
| Drop | Bag fumbled | Failure consequence placed in room |
| Recover | Lost Bag | Return to death spot or room depth |
| Rug Exit | RUG IT | Escape and bank Rent |
| Get greedy | More loot before exit | Risk/reward escalation |

### First enemy set

| Enemy | Behavior | Rugpull adaptation |
|---|---|---|
| Jeet | Patrol, rush on sight, bumps Bag loose | Loud reply-guy energy, fast but dumb |
| Fake Auditor | Slower guard, short stun stamp | Blocks routes, has clipboard/audit stamp |
| Pawn Terminal clerk | Throws junk or shoves | Environmental hazard enemy |

For Prototype 1, only Jeets are needed. Fake Auditor and Pawn Terminal clerk are Prototype 2 material.

### Room language

| Location | Prototype role |
|---|---|
| Mom's Basement | Tutorial/safe hub later; not P1 |
| Waffle Mausoleum | First one-room extraction test |
| Pawn Terminal | Upgrade/vendor later |
| Telegram Sewer | Swarm/chatter enemy district |
| Reply Guy Motel | Patrol/ambush rooms |
| Audit District | Fake auditor enemies and locked exits |
| Sell Wall Tower | Late-game pressure/boss structure |

## Risk Matrix

| Risk | Probability | Impact | Mitigation |
|---|---:|---:|---|
| Prototype becomes a Hotline clone | Medium | High | Melee/trash first, no guns first, no masks, no copied rooms, diner scam comedy instead of neon murder fantasy. |
| Engine work hides fun test | High | High | Use KAPLAY or Phaser with one room only. No map editor until P2. |
| React shell fights engine loop | Medium | Medium | React owns shell/HUD/save; engine owns canvas/input. Communicate through small callbacks. |
| Asset licensing gets messy | High | High | CC0 placeholders first, asset ledger before production, unclear license = DO NOT USE. |
| AI art creates inconsistent sprites | High | Medium | Use silhouettes, few frames, rotation props, hitstop, particles; AI for concepts/portraits first. |
| Existing clicker complexity leaks in | High | Medium | Do not reuse reducer directly. Create isolated prototype state when implementation is approved. |
| First room feels sluggish | Medium | High | Acceptance criteria require instant restart, readable enemies, fast Bag drop/recover, and short escape loop. |
| Godot/Defold split drains web repo | Medium | High | Do not port first. Only revisit after web prototype proves the core loop and React shell is proven painful. |
| Real crypto/scam reading | Medium | High | Keep all mechanics fictional, no wallets, no trading, no real logos, no how-to-crime. |

## Rebuild Options

### Option A: React shell + KAPLAY disposable spike

Use React/Vite as the app shell and mount a KAPLAY canvas inside a prototype screen. No map editor. One hand-authored room. Prove movement, shove, enemy rush, Bag, Lost Bag, and RUG EXIT.

Pros: fastest, lowest ceremony, strong AI-agent buildability, easy throwaway.
Cons: may not be the long-term engine. Tile/map pipeline must be revisited.

### Option B: React shell + Phaser serious prototype

Mount Phaser in React and build the same one-room scope, optionally with Tiled JSON in Prototype 2.

Pros: strongest web production ecosystem, tilemaps, community knowledge.
Cons: larger API surface, more ceremony, slower first feel test.

### Option C: React shell + Excalibur TypeScript prototype

Mount Excalibur in React and use actors/scenes/resources. Consider LDtk/Tiled plugin in Prototype 2.

Pros: TypeScript-first, clean engine concepts, permissive BSD-2.
Cons: 0.x warning and smaller ecosystem than Phaser.

### Option D: Separate Godot/Defold/GDevelop app

Treat current React game as old prototype and start a standalone engine app.

Pros: strongest editor-driven production path for Godot/Defold; GDevelop fastest no-code experiments.
Cons: splits repo/product surface, loses React continuity, harder to reuse current shell, larger strategic commitment.

### Option E: Custom React/canvas engine

Build movement, collision, camera, AI, and VFX ourselves.

Pros: no new dependency, maximum control.
Cons: too much engine work before proving fun. Not recommended.

## Recommendation

Primary prototype path: Option A, React shell + KAPLAY disposable spike.

Backup path: Option B, React shell + Phaser, if KAPLAY friction appears or the team wants to bias toward production engine selection from day one.

Strategic answer:

| Question | Recommendation |
|---|---|
| A. Keep React as shell and mount a game engine inside a route/component? | Yes. This is the right first move. |
| B. Create a separate engine app and treat React game as old prototype? | Not yet. Revisit only after the one-room loop is fun and React mounting becomes a real blocker. |
| C. Port everything to Godot/Defold? | No for Prototype 1. Godot is a serious later candidate if the game becomes a standalone desktop/mobile title, but it is premature now. |

First playable target should be deliberately disposable:

- One room.
- One player.
- One Bag pickup.
- One RUG EXIT.
- Three Jeet enemies.
- One cracked-phone shove or melee attack.
- One-hit or two-hit failure.
- Instant restart.
- Lost Bag physically dropped on death.
- Recover Lost Bag on next try.
- Bank Bag by reaching RUG EXIT.
- Placeholder art only.
- No meta shop, upgrades, cards, dialogue, bosses, real gore, real crypto, wallets, or trading.

Final forensic verdict: the existing Rugpull IP should be saved; the chart-clicker should be parked; `THE BAG` should become a physical extraction object; the first implementation should be a small KAPLAY spike inside the React/Vite shell, with Phaser as the production-leaning backup.
