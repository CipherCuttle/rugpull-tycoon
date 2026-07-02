# Rugpull Tycoon — v0.3 Pressure Loop Design Memo

*Fictional satire. No real crypto, no wallets, no trading, no money mechanics, no financial advice. All terms below ("bonding curve", "graduate", "rug") are game-flavored fiction.*

Scope guardrails for this memo: **no backend, no real crypto, no wallets, no monetization, no large new content set, no new major screens.** This is a v0.3 *core-loop* improvement only, practical enough to hand to a coding agent.

---

## 1. Executive conclusion

**Yes — add a decaying bonding curve ("Chart Gravity"), but as a *soft, floored, forgiving* decay, not a punishing drain.**

The game already has the hard part built: `awardLiquidity` is the single choke-point where `bondingCurveProgress` moves, `applyMilestoneCrossing` already **ratchets tiers upward and never down**, and the 1s `TICK` loop already exists in [App.tsx](../src/App.tsx#L21-L27). That means we can add gravity in the tick with almost no new plumbing, and — critically — we can guarantee **you never lose a milestone you earned**. That single guarantee is what turns "decay" from a rage-quit mechanic into a button-mashing *pressure* mechanic.

The reason to do it: right now the curve only goes up, so "SEND THE CANDLE" is a pure accelerator with no tension. There is no reason to keep tapping *now* versus later. Chart Gravity converts the main button from "climb" into "climb against a current," which is the exact loop that makes hyper-casual tappers feel alive — while the tier floor makes it safe.

The reason it must be *soft*: our sessions are short and reading-heavy (ticker, card reveals, modals). Aggressive decay during a card reveal or while reading the graduation modal would feel like the game cheated you. So gravity **pauses during modals, has an idle grace window, and floors at your last tier**.

**One-line verdict:** Ship Chart Gravity as *floored soft decay that only threatens the progress inside your current tier band, never a tier you already cleared.*

---

## 2. Comparable game deconstruction

### MONOPOLY GO!
- **Core action loop:** tap to roll → auto-move → collect/steal/attack → spend earned rolls. Rolls are the energy gate.
- **Retention hook:** rolls regenerate over time (come-back-later), plus constant limited-time "boards"/tournaments and social steal/attack.
- **Monetization/reward hook:** dice packs; sticker/album sets with a duplicate→trade economy; near-miss on album completion.
- **Copy structurally:** the **album/sticker set as the meta-goal** and **duplicates as a soft currency**. We already have this (`cards`, duplicates → Copium/Receipts in `unlockCard`). Lean into it as the *reason* to keep grinding.
- **Avoid:** energy/roll gating and social attacks. We are single-player, no backend, and gating clicks kills a tapper.

### Coin Master
- **Core action loop:** spin → raid/attack/build village. Spins are the energy.
- **Retention hook:** spin regen + timed events + "one more spin" variable payout.
- **Monetization/reward hook:** spins, card sets, village rebuild sinks.
- **Copy structurally:** **variable reward on the primary action** (we have crit taps + card rolls — keep leaning in), and a **visible "you are X away" completion bar**.
- **Avoid:** PvP raids, spin economy, hard paywalls, forced waiting.

### Royal Match
- **Core action loop:** match-3 board with a clear per-level win condition; boosters.
- **Retention hook:** the **"King in danger"/rescue** framing — a lightweight narrative stake on every board — plus lives.
- **Monetization/reward hook:** boosters + lives refills; near-fail tension sells the booster.
- **Copy structurally:** **a per-run "someone/something is in danger" frame** and **near-fail tension** — that's *exactly* what Chart Gravity gives us ("curve destabilizing, one more shove"). We already have `almost` state in [MainActionButton.tsx](../src/components/MainActionButton.tsx#L39).
- **Avoid:** lives systems (time-gated failure). Our "fail" must be *recoverable by tapping*, not by waiting or paying.

### Gossip Harbor / Merge Mansion
- **Core action loop:** merge items on a board → complete tasks → unlock story/renovation.
- **Retention hook:** **story drip + renovation reveal**; energy to merge; long soft goals.
- **Monetization/reward hook:** energy refills, event boards, generators.
- **Copy structurally:** **narrative drip tied to progress** — our ticker + card flavor + milestone lines already do this cheaply. Tie a *reveal* to each tier crossing (we already stamp `majorEvent` per tier).
- **Avoid:** merge boards, energy, generators, asset-heavy renovation art. Way too expensive for us.

### Sunday City (slots + idle tycoon hybrid)
- **Core action loop:** spin slot → earn → spend on idle tycoon buildings that generate offline.
- **Retention hook:** **idle/offline accrual** + spin variance + building upgrade curve.
- **Monetization/reward hook:** spins + speed-ups + building multipliers.
- **Copy structurally:** the **active-action ↔ idle-generator marriage**: your active taps fund passive generators (we already have `passive` upgrades + `getPassiveGainPerSecond`). Passive income should *fight the decay for you* so idle isn't dead — that's the elegant hook.
- **Avoid:** slot/gambling framing (tone + no monetization), offline-accrual math (we have no backend/server clock; keep it session-local).

### Whiteout Survival / Last War (liveops / long progression refs)
- **Core action loop:** base building + power growth + squads; heavy meta.
- **Retention hook:** **long tech trees, daily objectives, seasonal liveops**, alliance social.
- **Monetization/reward hook:** growth funds, packs, timers.
- **Copy structurally:** only the **daily-objective / event-track cadence** (we already have `BULL_TRAP_WEEK` event with tasks + rewards in the reducer). Use it as the **return hook** and short-session goal frame.
- **Avoid:** everything else — tech trees, alliances, server liveops, timers, monetized growth. Out of scope for v0.3.

---

## 3. Rugpull Tycoon adaptation (best ideas → our game)

| Idea | Source | How we adapt it (asset-light) |
|---|---|---|
| **Button mashing** | Coin Master spin, hyper-casual | Chart Gravity makes `SEND_CANDLE` fight a downward current. Same button, new meaning. |
| **Variable rewards** | Coin Master / Monopoly GO | Already have crit taps (12%) + card roll on tap. Add: crit is slightly more likely under high pressure (see §5). |
| **Chart gravity / depletion** | *new* (Royal Match near-fail energy) | Curve decays after an idle grace, floored at your current tier. §4. |
| **Milestone events** | Merge Mansion story drip | Reuse existing `applyMilestoneCrossing` → `majorEvent` per tier. Tiers never un-cross. |
| **Upgrade value** | Sunday City buildings | Add a **decay-dampener** upgrade effect so upgrades visibly buy you "breathing room," not just numbers. §7. |
| **Card / evidence reveals** | Monopoly GO album | Keep `unlockCard` + `CardRevealModal`. **Pause decay while the modal is open** (anti-punishment). §9. |
| **Prestige / rug reset** | idle genre | Keep `graduateCoin`. Add a prestige effect that softens starting decay so runs feel faster over time. |
| **Short-session goals** | Whiteout dailies | Reuse `BULL_TRAP_WEEK` tasks as the "what do I do in 2 min" frame. |
| **Return hooks** | all comps | Passive income keeps the curve *slightly* alive while away (fights gravity partway), and idle-decay copy invites you back: "The chart missed you." No real offline math — evaluated on next tick. |

---

## 4. Chart Gravity mechanic (v0.3 design)

**Core rule:** `bondingCurveProgress` can now go **down** on `TICK`, but only within the band above your current locked tier. It can **never** drop below `TIER_FLOOR[bondingCurveTier]` (0/25/50/75/100). Tiers are already one-way in `applyMilestoneCrossing`. This is the whole safety net.

- **When depletion starts:** only after an **idle grace** of ~2.5s (3 ticks) since the last `SEND_CANDLE`. Tapping resets the grace. Passive income and modals also suppress it (see §9). No decay before the coin is launched.
- **Depletion rate:** gentle base, ~**0.6 %/sec**, evaluated in the tick. Net of passive: `effectiveDecay = decayRate − curveGainFromPassiveThisTick`. If passive already pushes the curve up, gravity is fully offset (idle players stall, don't collapse).
- **How taps counteract it:** each `SEND_CANDLE` both adds its normal curve delta (~1.2–1.5 pts) **and** resets the idle-grace timer. A few taps/sec trivially out-climbs 0.6/sec — the point is you must *return your attention*, not spam forever.
- **How upgrades affect it:** new `decay` effect (e.g. "Chart Gravity Dampener") reduces `decayRate`. `curve` upgrades make each tap climb faster (out-run gravity). `passive` upgrades raise the idle floor (gravity offset). Prestige reduces base decay slightly.
- **How milestones behave if pressure falls:** they **do not fall**. Once tier N is crossed, `bondingCurveTier` stays N and the floor rises to that tier's threshold. Gravity only ever threatens the *fractional progress inside the current band*. You can lose "80% → 76%", never "past 75% → below 75%".
- **Visual communication:**
  - Curve fill bar shows a **downward drift animation + a faint "gravity" arrow** when decaying.
  - A **floor tick-mark** on the bar at the current tier threshold ("this is safe").
  - The chart line in `FakeChart` sags on idle ticks (feed a small negative `delta` to `nextChartPoint`).
  - The main button subtitle switches to a pressure warning (§8).
- **Avoiding rage quit (built into the rules):** floored at tier; grace window; paused during modals/onboarding; passive offsets it; decay never touches Liquidity/upgrades/cards — **only** the fractional curve progress. Worst case for an idle player = "stuck near a tier floor," never "wiped."

---

## 5. Button-mashing feel (SEND THE CANDLE)

- **Normal tap:** +Liquidity float, small pulse (existing `PULSE_MS` 220ms), tap ticker line. Curve nudges up. Baseline satisfying.
- **Crit tap (12%):** 3× payout, "CRITICAL CANDLE", louder pulse + `crit` sound (already wired). Chart spikes (`chartDelta 8`).
- **Panic taps (near-rug / decaying):** when `isDecaying && progress` is dropping inside the band — button gets a **red-edged "panic" class**, subtitle reads "CURVE BLEEDING — MASH". Optional: crit chance nudged up slightly under active decay so a rescue burst feels heroic (e.g. 0.12 → 0.18 while decaying). Keep it deterministic.
- **Near-rug state:** progress within a few points **above the current tier floor** while decaying → strongest warning, screen-edge vignette pulse, "One candle from losing this level." (You still can't drop below the floor — it's tension, not loss.)
- **Recovery state:** first tap after decay that pushes progress back up → brief green flash + "Chart stabilizing." Rewarding the rescue is what sells the loop.
- **Graduation push:** at ≥85% (`almost`) and especially 95–99%, gravity keeps nibbling the last point, so the final climb *requires* a burst. Button reads "SHOVE IT OVER." Crossing 100 → existing graduation `majorEvent` + modal (which pauses decay).

---

## 6. Economy tuning (rough numbers, grounded in current code)

Current baseline (from [economy.ts](../src/game/economy.ts)): base click gain 12, curve delta = `gain/1000*100 = 1.2 pts/tap`, crit 12%→3×, so **~1.49 pts/tap average**. Heat +0.4/tap. Jeet every 12 taps. Passive from upgrades. `TICK` = 1s.

| Knob | Value | Notes |
|---|---|---|
| Pressure gain / tap | ~1.2 pts (unchanged), avg ~1.49 w/ crit | Already the curve delta. |
| Passive pressure gain | = existing passive→curve delta | Naturally offsets gravity; keep as-is. |
| **Idle grace** | 3 ticks (~2.5–3s) | Before decay begins. |
| **Base decay** | **0.6 %/sec** | Gentle; ~2.5 taps/sec fully counters. |
| **Decay scaling by Heat** | `decay × (1 + min(heat/200, 0.75))` | High-heat coins bleed faster (up to +75%), thematically "too hot." Capped. |
| **Decay dampener upgrade** | −0.06 %/sec per level (cap −0.45) | New `decay` effect. |
| Milestone rewards | reuse existing per-tier `majorEvent`; sendCandle task +250 Liq | No change needed. |
| Prestige decay softener | `−0.03/sec × min(prestigeCount,5)` | Runs feel faster over time. |
| **Graduation timing target** | **first graduation ~2–4 min** | See below. |

**Graduation-timing sanity check:** curve to 100% needs ~67–83 tap-equivalents of climb. With decay 0.6/sec eating into active play, plus reading pauses, jeet knocks, and buying upgrades, an engaged player lands around **2.5–3.5 min** for run 1 — inside target. If playtest shows sub-2min, raise base decay to 0.8; if over 4min or frustrating, lower to 0.45 and/or extend grace to 4 ticks. **Tune decay first, never the tap gain** (tap gain drives the whole rest of the economy).

---

## 7. Upgrade redesign (first 12 mapping)

We keep the existing 12 upgrade IDs/costs/flavor but re-map effects so every progression lever is represented, **adding `decay` (dampener) and `critChance`**. Suggested target mapping (retune `effect`/`effectValue` on the existing entries in [upgrades.ts](../src/data/upgrades.ts)):

| # | Upgrade (existing name) | Effect category | Rationale |
|---|---|---|---|
| 1 | Shill Bot | `passive` | Early idle floor. |
| 2 | Micro KOL Contract | `hype` | Multiplier ramp. |
| 3 | Volume Bot Choir | `passive` | Idle floor + fights gravity. |
| 4 | Jeet Containment Drone | `jeetShield` | Survive jeet knocks. |
| 5 | Side Wallet Dust Collector | `cardChance` | Feeds album meta. |
| 6 | Bonding Curve Accelerator | `curve` | Out-climb gravity per tap. |
| 7 | Fake Chart Printer | `click` | Tap strength. |
| 8 | **Community Cope Amplifier** | **`decay`** (was `hype`) | **NEW dampener** — "cope keeps the chart afloat." Thematic fit. |
| 9 | Meta Rotation Radar | `cardChance` | Album meta. |
| 10 | Lawyer Token Retainer | `heatShield` | Lowers Heat → **also lowers decay scaling** (synergy). |
| 11 | **CTO Revival Megaphone** | **`decay`** or keep `passive` | Second dampener OR strong passive that offsets gravity. Pick one; recommend `decay` for variety. |
| 12 | Cabal Group Chat Invite | `allGains` | Capstone multiplier. |

**Crit chance:** rather than add a 13th upgrade (avoid new content set), fold a small crit bump into a **card** (data-only, `getClickGain`/crit path already reads cards) or make crit chance rise under active decay (§5). Recommend the decay-linked crit bump — zero new upgrade slots, reinforces the mashing loop.

Net: tap strength (7), passive (1,3,+11), decay reduction (8, opt 11), crit (decay-linked/card), milestone (event rewards unchanged), jeet resistance (4,10), prestige acceleration (prestige softener in §6). All seven requested levers covered without new screens.

---

## 8. UX / microcopy

Reuse the existing button subtitle + ticker + `majorEvent` channels — **no new UI surfaces required.**

- **Idle decay warning (grace expiring):** *"The chart is losing interest…"* / button subtitle: *"Chart Gravity engaging."*
- **Actively decaying:** *"CURVE BLEEDING — keep sending candles."*
- **Near-loss (near a tier floor, decaying):** *"One candle from slipping a level. It won't go lower than this — but it's watching."*
- **Recovery (first rescue tap):** *"Chart stabilizing. It forgives, it doesn't forget."*
- **Panic state (95–99%, decaying):** *"SHOVE IT OVER before gravity does."*
- **Milestone regained (climbed back through band):** *"Back on track. The jeets pretend they never doubted you."*
- **Graduation shove:** *"The bonding curve is done pretending. Push."*
- **"Gravity remembered" (tier floor held):** *"Milestone held. Gravity remembers what you already earned."* (Show once when decay hits a floor and stops.)

Tone stays satirical, never financial-advice-y, never a real "you lost money" frame — it's the *chart's attention* that decays, not your bags.

---

## 9. Risk analysis & safeguards

| Risk | Why it hurts | Safeguard (all in the tick rules) |
|---|---|---|
| **Too much decay** | Feels like a treadmill; quit. | Low base (0.6/s), heat cap +75%, passive offset, single tunable constant. |
| **Progress loss** | Losing a cleared milestone = betrayal. | **Hard floor at current tier**; tiers already one-way. Decay only touches the fractional band. |
| **Unclear rules** | Player doesn't know why bar drops. | Floor tick-mark + gravity arrow + explicit "engaging/held" copy. |
| **Bad mobile ergonomics** | Fast decay + reading = thumb strain. | Idle grace, passive offset, no decay during modals. |
| **Mash fatigue** | Endless required spam. | You only need ~2–3 taps/s in bursts to hold; passive covers idle drift; decay never below floor so you *can* stop. |
| **Punishment during reading/modals** | Decay while reading a card/graduation modal feels like a cheat. | **Decay paused whenever a modal is open**: `pendingCardReveal != null`, prestige modal open, or `!onboardingComplete`. Grace also covers the ticker read. |

**Golden safeguard:** decay never touches Liquidity, upgrades, cards, resources, or a cleared tier — **only** the fractional curve progress inside the current band. The worst outcome an idle/AFK player can reach is "parked at a tier floor," which is recoverable in a few taps.

---

## 10. v0.3 implementation plan (hand-off ready)

Small, additive, save-compatible. No new screens, no backend.

### Files likely touched
- [src/game/types.ts](../src/game/types.ts) — add `decay` to `UpgradeEffect`; add 2 state fields.
- [src/game/economy.ts](../src/game/economy.ts) — add `getDecayRate`, `TIER_FLOORS`, floor helper.
- [src/game/reducer.ts](../src/game/reducer.ts) — decay logic in `runTick`; reset idle timer in `sendCandle`; modal-pause guard.
- [src/game/tick.ts](../src/game/tick.ts) — optional: sag the chart line on idle ticks (negative delta).
- [src/data/upgrades.ts](../src/data/upgrades.ts) — retune effects per §7 (map 1–2 upgrades to `decay`).
- [src/components/MainActionButton.tsx](../src/components/MainActionButton.tsx) — panic/recovery subtitle + `decaying` class.
- [src/components/FakeChart.tsx](../src/components/FakeChart.tsx) — floor tick-mark + gravity arrow when decaying.
- [src/styles/theme.css](../src/styles/theme.css) — `.decaying` / `.panic` styles, floor marker.

### State additions (`GameState`)
- `idleTicks: number` — ticks since last `SEND_CANDLE` (reset to 0 on tap; incremented in `runTick`).
- `isDecaying: boolean` — derived/stored for UI (true when decay actually applied this tick).
- Bump `SAVE_VERSION` and default both fields to `0/false` in `createInitialGame()` + a migration default in `save.ts` load (fields absent on old saves → treat as 0/false).

### Reducer changes
1. `sendCandle`: set `idleTicks: 0` on every tap.
2. `runTick` (after passive award, before `syncEvent`):
   - Guard: skip decay if `!currentCoin.launched`, or any modal open (`pendingCardReveal`, prestige — pass a flag or check `bondingCurveProgress`/UI state), or `!onboardingComplete`.
   - `idleTicks += 1`; if `idleTicks < GRACE_TICKS` → `isDecaying = false`, return.
   - `rate = getDecayRate(state)` (base × heat scale − dampener − prestige softener, clamped ≥ 0).
   - `floor = TIER_FLOORS[bondingCurveTier]`.
   - `next.bondingCurveProgress = Math.max(floor, progress − rate)`; `isDecaying = next < progress`.
   - **Do not** call `applyMilestoneCrossing` on decay (it only ratchets up anyway — safe, but skip for clarity). Never touch tier/liquidity/cards.
3. Modal-pause: simplest is to expose modal-open as part of state or gate decay on `pendingCardReveal == null` and add a `prestigeOpen`-style flag if needed; MVP can just rely on `pendingCardReveal` + grace since prestige modal appears at 100% where floor = 100 anyway (no decay possible).

### Tuning constants (one place, e.g. top of economy.ts)
```
GRACE_TICKS = 3
BASE_DECAY_PER_SEC = 0.6
HEAT_DECAY_SCALE = 200      // decay × (1 + min(heat/200, 0.75))
HEAT_DECAY_CAP = 0.75
DECAY_DAMPENER_PER_LEVEL = 0.06   // 'decay' effectValue
DECAY_DAMPENER_CAP = 0.45
PRESTIGE_DECAY_SOFTEN = 0.03      // × min(prestigeCount, 5)
TIER_FLOORS = [0, 25, 50, 75, 100]
```

### UI changes
- Button: add `decaying`/`panic` class + swap subtitle copy (§8) when `state.isDecaying`.
- FakeChart: draw a horizontal floor marker at `TIER_FLOORS[tier]`%, and a small downward chevron/opacity pulse when `isDecaying`.
- Optional: chart line sag via `updateChart(next, -1.5)` on decaying ticks.

### Verification checklist
- [ ] Fresh save: no decay before launch; decay never appears while `!onboardingComplete`.
- [ ] Tap once, wait ≥3s idle → curve drifts down, stops exactly at the tier floor, never below.
- [ ] Cross 25% then go idle → tier stays 1, progress floors at 25, "gravity held" copy fires.
- [ ] Card reveal modal open + idle → **no decay** while modal pending.
- [ ] High heat (~150+) → visibly faster decay, capped (never runaway).
- [ ] Buy a `decay` upgrade → measurable slower drift.
- [ ] Engaged run 1 graduates in ~2–4 min; adjust `BASE_DECAY_PER_SEC` if outside.
- [ ] Old save (pre-bump) loads without crash; new fields default cleanly.
- [ ] Passive income high enough that idle curve *stalls* rather than falls (offset works).
- [ ] `pnpm build` / lint clean; no changes to Liquidity/cards/upgrades from decay path.

---

*End of memo. This is a v0.3 core-loop tuning pass: one new tick behavior (floored soft decay), one new upgrade effect, and copy — no new screens, content sets, or systems.*
