# Rugpull Tycoon UI Rebuild Audit v0.1

Docs-only audit. No source assets moved/deleted/renamed. No mechanics or dependencies touched.

Read-only contact sheets generated for this audit (safe to delete, regenerate anytime):
- `docs/art/audit/contact_characters.jpg`
- `docs/art/audit/contact_environments.jpg`
- `docs/art/audit/contact_ui.jpg`

---

## 1. Executive Verdict

**PARTIAL.**

- **Characters** and **environments** are cohesive, on-tone, and usable as *backdrop/portrait* art with real work (compression, overlay treatment, alpha cutout for portraits).
- **UI props** (buttons, sell wall, HUD bars, crack target) are **not production-usable as-is**. They are inconsistent with each other in rendering style, have no real alpha transparency, and are shaped as single static hero-shots rather than sliceable/stateful UI elements the current React/CSS/SVG architecture needs.
- The current in-game UI (100% CSS + SVG, zero image assets) is already a well-built, cohesive neon-terminal HUD with a lot of considered feel-work (combo badges, bullet-time, surf zones, supercharge rail). A wholesale swap to the generated UI props would very likely make the game look **worse and more mismatched**, not more polished — it would introduce exactly the "every panel looks like a different game" problem the brief warns about.
- Correct path: keep the CSS/SVG HUD as the system of record. Bring in **one background environment + a dark readability overlay** first (Phase 1), and treat portraits as a resource for a later dialogue-shell phase. Do **not** integrate the current button/wall/HUD-bar PNGs until they're regenerated to match a single, flatter, actually-transparent style — or accept they may never be worth using and the CSS versions stay canon.

---

## 2. Current UI Diagnosis

Inspected: `FakeChart.tsx`, `MainActionButton.tsx`, `ResourceBar.tsx`, `StreakFountain.tsx`, `UpgradeList.tsx`, `HomeScreen.tsx`, `theme.css`, `game/types.ts`.

- **Zero image assets in the live UI.** Only `src/assets/hero.png`/`react.svg`/`vite.svg` exist and none are imported by any component. Every visual — chart, candles, resistance wall, crack socket, buttons, meters, pills — is CSS gradients + inline SVG shapes.
- **Mobile-first fixed shell**: `.game-shell` is `min(100%, 460px)` wide, `100svh` tall, `padding: 10px 10px 88px`. This is the real canvas any background art has to sit inside/behind.
- **Dense, deliberate motion/state system**: `FakeChart.tsx` alone drives ~15 boolean state classes (tap-flash, milestone-pulse, overdrive-enter/exit, smash, broken, missed, shattered, rejected, bullet-time...). `MainActionButton.tsx` has a comparable state matrix (decaying/panic/chain tiers/breakout-ready/focus-ready/shattered/rejected). This is the actual hard-won game feel — any art rebuild must not regress the states it currently communicates through color/glow/shake alone.
- **Visual language already established** in `theme.css`: toxic-green/acid (`--acid #46ff9b`), bruised/brake-light red (`--red #ff3b52`), amber (`--amber #ffc23a`), cyan (`--cyan #46e0ff`), near-black panels (`--bg #04060a`), CRT scanline texture painted via `.game-shell::before`. **This palette already matches the locked art direction almost exactly** — the CSS rebuild target and the asset generation brief were clearly written from the same palette spec, which is good news for cohesion.
- **Readability is currently excellent by construction**: the chart SVG has a fixed viewBox, candles/wall/crack are drawn in flat saturated colors against a near-black panel with no competing imagery. This is the bar any background art must clear without regressing.
- **No baked text anywhere in the CSS system** — labels are real DOM text, which is also true of the generated assets (good, confirmed no baked text in any inventoried PNG).
- Narrative bible (`NARRATIVE_BIBLE_v0.1_RENT_OR_ROT.md`) specifies an asset style of **"low-resolution 1990s crime game, chunky black outlines, VHS scanlines, readable at 64px."** The actual generated assets (see below) are painterly/semi-realistic digital illustration — moodier and more detailed than that spec, closer to a modern noir graphic novel than a lo-fi arcade cabinet. This is a real gap between the written brief and what got generated, and it should be named explicitly rather than smoothed over.

---

## 3. Asset Inventory Summary

All files read-only via `find` + Python/Pillow (no ImageMagick available in this environment).

| Folder | Count | Format | Typical size | Dimensions | Alpha? |
|---|---|---|---|---|---|
| `characters/` | 13 | PNG | 1.75–2.5 MB | 1254×1254 | No (RGB) |
| `enviroments/` | 5 | PNG | 2.3–2.8 MB | 1254×1254 | No (RGB) |
| `ui/` | 6 | PNG | 1.68–2.6 MB | mixed (see below) | No (RGB) |

**Characters** (all 1254×1254, square portrait/bust compositions, neon rim-lit, painterly): Dustin "Dust" Mercer, Car Carl, Dave Michaelson, Fake Auditor Frank, Fry Phil, Greg (Dead-Chat Greg), Jeet Jax, Marge, Micro KOL Mia, Mom (Linda Mercer), Pawn Shop Pete, Receipt Goblin Rick, Uncle Silas.

**Environments** (all 1254×1254, painterly interior scenes, heavy neon/practical lighting): Pawn Terminal, Dustin's Room, Grease Pit, Telegram Sewer, Waffle Mausoleum.

**UI** (mixed dimensions, mixed rendering style):
- `crack target.png` — 1254×1254, flat-vector jagged crystal/burst icon, red/cyan/green, checkerboard "transparency" baked into pixels.
- `mash button normal .png` / `mash button pressed down .png` — both 1254×1254, photoreal/skeuomorphic 3D-rendered industrial arcade button with hazard-stripe corners.
- `sell wall.png` — 1254×1254, photoreal cracked-glass framed panel with candle silhouettes and a magenta burst.
- `top hud.png` — 2172×724, wide metal instrument-panel bar prop.
- `ui.png` — 1536×1024, metal bar + torn tape label + green 8-segment meter + skull glyph (unclear which mechanic this maps to).

**Filenames**: several have stray trailing spaces, a comma, or smart-quote characters (`"car carl .png"`, `"Pawn Terminal,.png"`, `"Dustin “Dust” Mercer.png"`, `"mash button pressed down .png"`). These need normalizing before any repo import — noted in Phase 0, not done here.

---

## 4. Asset Fit Assessment

### Characters — fit: **strong**, usable as-is with processing
- Fit Basement Neon Crime RPG mood: yes — grimy, neon rim light, dirty palette, "ugly-interesting faces" per the brief's own language (gaunt Dustin, portly greasy Sil, cocky Jax).
- Consistent with each other: yes — same render engine/lighting recipe across all 13, same square crop convention, same lighting logic (single strong neon key + practical fill). This is the single most cohesive asset category in the whole set.
- Readable at UI size: partially — these are portrait-detail illustrations; they read fine at 96–160px (dialogue portrait size) but will lose all their character-defining detail at 32–64px (the narrative bible's own "readable at 64px" bar is **not met** by these — they're too detailed/painterly for that).
- Too painterly / too cinematic: yes, more than the written brief asked for (semi-realistic, not "chunky black outline lo-fi"). Still tonally correct, just a different sub-style than specced.
- Too glossy / generic cyberpunk: no — these avoid clean sci-fi gloss, lean into grime.
- Production-usable as-is: **for portrait/dialogue use, yes after cropping + background-plate work.** Not usable as tiny icons.
- Needs cleanup: yes — no alpha channel on any file, so every one needs either (a) a matching cropped/vignetted background frame kept intentionally, or (b) real background removal if a floating cutout portrait is wanted. Given how integrated the lighting is with each character's background (neon signage, monitor glow), clean subject-only cutouts will be hard to get right — bounding-box crop + frame is the more honest plan than cutout.
- Cast coverage gap: **Ledger "Ledge" Harlan (the antagonist) has no generated portrait.** `dave michaelson.png` does not match any named character in the narrative bible — it reads visually like it could be an antagonist/rival-trader type (sharp suit, phone, tickers) but is not documented anywhere. Flag this to the user before using it as Ledge or discarding it.
- Verdict: **KEEP** the set as a resource pool for a future dialogue/portrait phase (Phase 5+). Not needed for Phase 1.

### Environments — fit: **strong**, usable as backdrop with heavy dimming
- Fit the tone: yes, very strongly — Waffle Mausoleum, Grease Pit, Telegram Sewer, Pawn Terminal, Dustin's Room all match named locations in the narrative bible and nail the "sticky 2 AM diner crime" mood.
- Consistent with each other and with characters: yes, same rendering pipeline, same lighting logic, same palette family (toxic green CRTs, magenta/cyan neon, warm practical lights against near-black).
- Readable at UI size / won't overpower gameplay: **risk, not pass.** These are highly detailed, high-contrast, colorful scenes (neon signage, glowing monitors, warm practical lights) that are *busier* and *more saturated* than the near-black chart panel they'd sit behind. Used at full brightness behind the HUD they would fight the chart's own green/red glow language and hurt readability. They are usable **only** behind a strong dark overlay (60–80% black scrim) and probably desaturated/blurred at the edges where HUD elements sit.
- Too detailed/cluttered: yes, for a gameplay backdrop role specifically (fine for a full-screen narrative/cutscene role).
- Production-usable as-is: as a background layer, yes, once overlaid; not usable as a "clean" surface for HUD elements to sit directly on top of without a scrim.
- Verdict: **KEEP.** `waffle mausoleum.png` is the correct Phase 1 pick — it's the tutorial/home location in the narrative bible and reads clearly even in the small contact-sheet thumbnail (booth, neon window, waffle, phone chart already glowing green on the table — thematically on-the-nose for a home-screen backdrop).

### UI pieces (buttons, wall, HUD bars, crack target) — fit: **weak, do not integrate yet**
- Fit Basement Neon Crime RPG: partially — the palette (red/amber/toxic-green/hazard-stripe) is right, but the *execution* is a photoreal/skeuomorphic industrial-hardware render (chunky riveted metal, glossy plastic dome, worn caution paint). That reads as **generic sci-fi/apocalyptic hardware prop**, not "basement crime RPG terminal UI." It's a different game's asset language than the characters/environments.
- Consistent with each other: **no.** `crack target.png` is flat-vector/graphic-design style; the button, wall, and HUD-bar pieces are photoreal 3D-rendered props. Putting these two rendering languages in the same HUD would immediately read as mismatched.
- Readable at UI size: no — these are single large hero-shot renders of physical objects, not flat icon/chrome art. A 1254×1254 photoreal button does not scale down cleanly to a 108px-tall mobile button without becoming a muddy blob; the fine metal texture and stripe details will alias badly at gameplay size.
- Too glossy / cinematic: yes, clearly — this is the category the brief's "avoid: too much cinematic coolness" and "asset mismatch where every panel looks like a different game" calls out most directly.
- Production-usable as-is: **no**, for four concrete reasons:
  1. **No alpha channel on any of the 6 files** (confirmed via Pillow — all report mode `RGB`). The "transparent" look on `crack target.png`, both mash-button files, `sell wall.png`, and `ui.png` is a **checkerboard pattern baked directly into the pixels**, not real transparency. These cannot be dropped onto a CSS background as-is; they'd render with a literal gray-and-white checker square behind them.
  2. **The two button states don't function as a state pair.** Diffing `mash button normal .png` against `mash button pressed down .png` pixel-for-pixel shows they differ across the *entire* canvas (mean channel diff ~50/255, not a localized "pushed down" region), and — worse — **their baked backgrounds don't even match**: "normal" has the checkerboard baked in, "pressed" has a solid near-black background baked in instead. These read as two independent generations of "a button," not a normal/pressed pair of the same object. Using them together would produce a visible flash/pop between states rather than a satisfying press.
  3. `sell wall.png` and `top hud.png` are static single-object hero shots. The live game's resistance wall is a **moving, resizing SVG bar** (`FakeChart.tsx`'s `wallX1/wallX2/wallY`, animated per tick) and the resource bar is **4 independently-sized pill divs**. Neither PNG is a 9-slice-able or tileable asset — integrating either would require rebuilding those elements as static images (regressing the current sliding-wall / live-width mechanics) or an expensive re-cut into a repeatable strip, which is out of scope for "art integration" and drifts into "redo the renderer."
  4. `ui.png`'s green 8-segment meter + skull glyph doesn't map cleanly to any single existing mechanic (Heat? Overdrive? Supercharge?) — it would need a design decision before it could be "the" anything.
- Verdict: **REJECT for direct integration.** Worth keeping only as **mood-board / palette reference** for redrawing CSS buttons and panels with matching color cues (hazard-stripe corner accents, the red-dome color, the cracked-glass motif) — see Phase 3/4 recommendation below. Do not import these files into `src/assets` as production art in Phase 1–4.

### Icons — fit: **not generated yet**
- The narrative bible's "First 12 mechanic icons" list (Send Candle, Resistance Line, Breakout Arrow, Heat Gauge, Overdrive Flame, Supercharge Lightning, Candle Chain, Graduation Door, Prestige Skull, Jeet Stampede, Sell Wall, Overheat Warning) has **no corresponding assets in the `ui/` folder** beyond the loosely-related `crack target.png`. This is a real gap, not an oversight in this audit — there simply isn't an icon set yet. Recommend generating a small, *flat, single-style* icon set (not photoreal) before Phase 2 rather than trying to extract icons from the current UI folder.

### FX — fit: **not generated yet**
- No dedicated FX sprite sheets (sparks, shatter debris, embers) exist. `crack target.png`'s spiky burst is the closest thing but is a single static graphic, not an animatable FX asset, and its flat-vector style doesn't match the photoreal button/wall pieces it would need to sit next to. Current FX (spark path, wall-chunk shatter, combo embers) are 100% CSS/SVG and already work well — no urgent need to replace them.

---

## 5. Keep / Maybe / Reject Lists

**KEEP** (usable now, with stated processing):
- `enviroments/waffle mausoleum.png` — Phase 1 backdrop candidate.
- `enviroments/dustins room.png`, `grease pit.png`, `telegramm sewer.png`, `Pawn Terminal,.png` — later backdrop candidates for future locations (Phases 6–7), same processing needs as above.
- `characters/uncle silas good pic.png`, `Dustin "Dust" Mercer.png`, `marge.png`, `mom.png`, `pawn shop pete.png`, `micro kol mia .png`, `reciept goblin rick.png`, `greg.png`, `jeet jax.png`, `fake auditor frank.png`, `fry phil.png`, `car carl .png` — all keep as a pool for a future dialogue-shell phase (Phase 5). None needed before then.

**MAYBE** (needs a decision before use):
- `characters/dave michaelson.png` — visually strong, but unidentified in the narrative bible. Ask the user: is this Ledge under a working name, a new character to add to the bible, or an asset to discard?
- `ui/crack target.png` — the only flat-style UI asset; could work as a one-off achievement/shatter-moment badge (not the live crack socket) if background-removed properly. Low priority.

**REJECT** (do not integrate; keep only as mood reference, if at all):
- `ui/mash button normal .png`, `ui/mash button pressed down .png` — inconsistent state pair, no alpha, wrong style register (photoreal vs. the game's flat neon-CSS language).
- `ui/sell wall.png` — static hero shot, incompatible with the live moving-wall SVG mechanic.
- `ui/top hud.png`, `ui/ui.png` — ambiguous mechanic mapping, wrong aspect/segmentation for the current 4-pill resource bar, photoreal style mismatch.

**MISSING** (gap, not a defect in what exists):
- Ledger "Ledge" Harlan portrait (antagonist — no asset).
- Any mechanic icon set (Send Candle / Resistance / Heat / Overdrive / Supercharge / Chain / Graduation / Prestige / Jeet Stampede / Overheat).
- Any FX sprite sheet (sparks, debris, embers) beyond the one static crack-target graphic.

---

## 6. Critical Problems

1. **No real alpha transparency anywhere in the asset set.** All 23 files are flat RGB. The `ui/` folder's apparent transparency is a baked-in checkerboard pattern, not an alpha channel — this alone blocks any of those 6 files from being dropped into the CSS UI without a background-removal pass first.
2. **Two incompatible rendering styles live inside the same `ui/` folder** (flat-vector `crack target.png` vs. photoreal `mash button`/`sell wall`/`top hud`/`ui.png`). Shipping both would visibly read as "assets from two different games," which is the exact failure mode the brief calls out.
3. **The button's "pressed" state isn't a real pressed state** — different background treatment, near-total pixel diff versus "normal." It would not read as a press; it would read as a flicker.
4. **The generated style sits closer to painterly/cinematic graphic-novel art than the narrative bible's own spec** ("low-resolution 1990s crime game, chunky black outlines... readable at 64px"). This isn't disqualifying for backgrounds/portraits, but it means the generated assets cannot serve double duty as small icons — a separate, flatter icon pass is needed regardless of what's decided here.
5. **File sizes are large for a mobile web game** — 1.7–2.8 MB per PNG, 1254×1254 (or larger). Every asset actually adopted needs re-encoding (WebP/AVIF, resized to real display dimensions with 2x for retina) before shipping; none should go into `src/assets` at source resolution/format.
6. **Filenames have stray spaces, a comma, and smart quotes** (`"car carl .png"`, `"Pawn Terminal,.png"`, `"Dustin "Dust" Mercer.png"`) — normalize during any copy step (Phase 0), not by touching the originals.
7. **Cast/asset mismatch**: Ledge (the antagonist, present throughout the narrative bible) has no portrait; `dave michaelson.png` has no home in the bible. Needs a user decision, not a silent assumption.
8. **The environments are busier/more saturated than the current near-black chart panel.** Any background integration must fight for legibility — this is solvable (dark overlay, blur, desaturation at HUD-adjacent regions) but must be treated as a real design constraint, not an afterthought, or the chart/sell-wall readability the brief insists on preserving will regress.

---

## 7. Recommended Art Pipeline

For assets that get adopted (environments now, portraits later):

1. **Select** the specific source file (never touch the original — copy only).
2. **Normalize filename** (lowercase, hyphenated, no stray punctuation) on the copy.
3. **Downscale + re-encode**: target real display size × 2 (retina), export WebP (fallback PNG only if needed for compatibility). A 1254×1254 background shown at ~460px wide only needs to ship at ~920px, not 1254px/2.5MB.
4. **Apply the readability treatment at asset-prep time where practical** (a pre-baked dark gradient toward the HUD regions), but keep the *adjustable* overlay in CSS, not baked permanently into the image, so contrast can still be tuned live.
5. **No background removal / cutout work** unless a specific phase calls for a floating character cutout (Phase 5 dialogue shell) — most environment use is full-bleed backdrop, which doesn't need alpha at all.
6. For any future icon/FX generation: **re-brief the generator explicitly for flat, chunky-outline, single-style icons at the target render size**, separate from the painterly portrait/environment brief that produced the current set — do not expect the current pipeline to also produce good icons.

---

## 8. Proposed Repo Asset Structure

Do not copy anything yet — this defines where things would land when a phase is actually implemented.

```
src/assets/art/
  backgrounds/
    waffle-mausoleum.webp        (Phase 1 — from "waffle mausoleum.png")
    dustins-room.webp            (later phase)
    grease-pit.webp              (later phase)
    telegram-sewer.webp          (later phase)
    pawn-terminal.webp           (later phase)
  portraits/
    uncle-sil.webp               (Phase 5)
    dust-mercer.webp
    marge.webp
    mom.webp
    pawn-shop-pete.webp
    micro-kol-mia.webp
    receipt-goblin-rick.webp
    dead-chat-greg.webp
    jeet-jax.webp
    fake-auditor-frank.webp
    fry-phil.webp
    car-carl.webp
    (ledge + dave-michaelson: pending user decision)
  ui/
    (empty until a redrawn, alpha-correct, single-style icon/button pass exists —
     do not populate from the current ui/ source folder)
  icons/
    (empty — no source assets exist yet, see Section 4 "Icons")
  fx/
    (empty — no source assets exist yet, see Section 4 "FX")

assets/source/generated/
  (optional: raw untouched copies of anything pulled from
   "/home/swirky/Pictures/rugpull tycoon assets/", kept outside src/ entirely,
   only if the team wants a versioned copy in-repo rather than relying on the
   Pictures folder as source of truth)
```

Keep raw generations in the user's Pictures folder (or the optional `assets/source/generated/` mirror) — never treat 1254×1254 2–3 MB PNGs as something `src/` should ship.

---

## 9. UI Rebuild Phases

Safest order, smallest blast radius first. **Only Phase 1 is speced for implementation next** (Section 10) — everything past it is directional, to be re-scoped once Phase 1 is validated in the browser.

| Phase | Goal | Files likely touched | Assets needed | Risk |
|---|---|---|---|---|
| 0 | Asset cull, naming, normalization | none (repo); asset copies only | selects from KEEP list | Low |
| 1 | Home backdrop + dark overlay, HUD stays readable | `HomeScreen.tsx`, `theme.css`, new `src/assets/art/backgrounds/` | `waffle mausoleum.png` | Low |
| 2 | Core HUD/resource icons | `ResourceBar.tsx`, `theme.css` | new flat icon set (not yet generated) | Medium (blocked on new generation) |
| 3 | Main action button + Rug It button restyle | `MainActionButton.tsx`, `theme.css` | none from current `ui/` folder (style reference only); CSS restyle using button asset's color/hazard-stripe cues | Medium |
| 4 | Sell-wall/crack/shatter FX skin | `FakeChart.tsx`, `theme.css` | none from current `ui/` folder as-is; would need a regenerated, alpha-correct, animatable set | High (current assets not usable) |
| 5 | Uncle Sil dialogue shell | new `DialogueBox.tsx`, `theme.css` | portrait set (KEEP list), needs Ledge gap resolved first if he appears | Medium |
| 6 | Pawn Terminal upgrade/vendor screen | `UpgradeList.tsx` or new screen, `theme.css` | `Pawn Terminal,.png` backdrop | Medium |
| 7 | Boss wall / Soulslike progression UI | new screens (not yet built) | environments + Ledge portrait (gap) | High (mechanics not built yet either) |

For each phase: **accept** only assets explicitly marked KEEP above; **reject** anything on the REJECT list without re-litigating it per-phase; **verify** with `pnpm build`, `pnpm lint`, and a manual mobile-viewport (390×844) visual check that the chart/sell-wall/button remain at least as readable as before the change.

---

## 10. Phase 1 Implementation Spec

**Goal:** Add the Waffle Mausoleum as a home-screen backdrop with a dark readability overlay. No layout changes, no new mechanics, no story system, no icon integration.

**Scope:**
1. Copy `"/home/swirky/Pictures/rugpull tycoon assets/enviroments/waffle mausoleum.png"` → `src/assets/art/backgrounds/waffle-mausoleum.webp` (re-encoded, resized to ~960px wide max, normalized filename). This is the only file copy in this phase.
2. Apply it as a `background-image` on `.game-shell` (or a new absolutely-positioned layer behind it), `background-size: cover`, fixed/centered.
3. Add a dark scrim between the background image and existing content: a layered `linear-gradient`/`radial-gradient` toward near-black (reusing existing `--bg`/`--bg-2` tokens), tuned so the chart panel, buttons, and text keep their current contrast — the background should be felt as mood/depth, not competed with.
4. Do **not** touch `.hero-chart`'s own background — keep the chart panel opaque/near-opaque so candle readability is unaffected; the environment art shows only in the "margins" (top/bottom padding, around the panel edges, page background outside `.game-shell` if applicable).
5. Optionally (only if it doesn't add scope risk): a single low-opacity vignette so the image doesn't hard-clip at the shell's rounded corners.
6. No icon work, no button restyle, no new components, no story/dialogue system, no changes to `game/reducer.ts`, `game/types.ts`, or any mechanics file.

---

## 11. Acceptance Criteria

- Game remains fully playable and readable at **390×844 mobile portrait**.
- Chart candles, resistance wall, crack socket, and combo badges remain at least as legible as on `main` before this change (spot-check: can you read "SMASH RESISTANCE" state changes at a glance with the new background active?).
- No image asset is committed at source resolution/format — everything shipped is resized + re-encoded.
- No baked text in any newly-added asset.
- No regression in `pnpm build` or `pnpm lint`.
- No new dependency added to `package.json`.
- No file in `/home/swirky/Pictures/rugpull tycoon assets/` is modified, moved, or deleted.
- The new background never intercepts pointer events (no accidental click-blocking layer).

---

## 12. Risks / What Not To Do

- Do not integrate any file from `ui/` (buttons, sell wall, top hud, ui.png, crack target) into production UI yet — see Section 4/6 for why each is currently unusable as shipped.
- Do not attempt background removal / cutout work on characters or environments in Phase 1 — full-bleed backdrop use doesn't need it, and rushing a cutout pass risks ugly edges more than it helps.
- Do not let the environment backdrop reduce contrast on the chart, button, or resource pills — if the overlay tuning fights this, err toward more darkening, not less.
- Do not resolve the `dave michaelson.png` / missing-Ledge question by guessing — ask the user before it becomes a dialogue-phase asset.
- Do not treat this audit's KEEP list as a green light to batch-import all 13 portraits or all 5 environments in one PR — integrate one background in Phase 1, validate, then proceed.
- Do not commit any changes from this audit without being asked — this task is docs-only plus the two read-only contact-sheet JPGs under `docs/art/audit/`.

---

## 13. Next Prompt To Implement Phase 1

```
Implement Phase 1 of docs/art/UI_REBUILD_AUDIT_v0.1.md only.

Copy "/home/swirky/Pictures/rugpull tycoon assets/enviroments/waffle mausoleum.png"
into the repo as src/assets/art/backgrounds/waffle-mausoleum.webp, resized to
~960px max width and re-encoded as WebP (do not modify or delete the original
source file). Wire it in as a backdrop behind HomeScreen's .game-shell in
src/screens/HomeScreen.tsx / src/styles/theme.css, with a dark
radial/linear-gradient scrim layered on top so it reads as mood/depth without
reducing legibility of the chart, resistance wall, crack socket, combo badge,
or main action button.

Constraints:
- No mechanics changes (do not touch game/reducer.ts, game/types.ts,
  game/chart.ts, game/economy.ts).
- No new npm dependencies.
- No icon or button asset integration — CSS/SVG HUD elements stay exactly
  as they are today, just with a new backdrop layer behind them.
- Preserve mobile portrait readability at 390x844.
- The background layer must never intercept pointer events.
- Run pnpm build and pnpm lint after the change and fix any failures.
- Do not commit.

Verify by describing (or screenshotting if possible) how the chart panel
reads against the new backdrop at idle, tap-flash, and overheated states.
```
