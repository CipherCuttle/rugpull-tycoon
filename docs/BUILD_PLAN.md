# Rugpull Tycoon: Basement Launch — v0 Build Plan

> Fictional satirical idle/tycoon game. NOT real crypto, NOT trading, NOT financial advice,
> NOT play-to-earn, NOT gambling. No wallets, no token sales, no real market data, no real
> people, no deposits/withdrawals, no real money. Everything is a joke about "trenches" culture.

---

## 1. Product north star

Rugpull Tycoon: Basement Launch is a darkly comedic, mobile-first idle/tycoon game where the
player runs a fictional memecoin scam operation from a basement. You launch a fake coin (**$EGG**),
tap a big **SEND THE CANDLE** button to earn **Liquidity**, spend it on cursed operators (bots,
micro-KOLs, cope amplifiers) that generate passive Liquidity, fill a **bonding curve**, unlock
collectible **cards**, and laugh at an endlessly cynical **ticker feed**. When the curve hits 100%
you **Graduate $EGG** — a prestige/rug reset that wipes the run but grants a permanent multiplier,
so the next basement launch is bigger and dumber. It is a numbers-go-up joke machine about being
the exit liquidity, packaged as a self-contained web app with local saves and zero real-world stakes.

---

## 2. Non-negotiable boundaries

This game must **NOT** include, ever:

- No real cryptocurrency, tokens, coins, or blockchain of any kind.
- No wallets, wallet connections, seed phrases, or addresses.
- No token sales, presales, mints, airdrops, or ICO mechanics.
- No real money: no deposits, withdrawals, purchases, IAP, ads, or payouts.
- No play-to-earn, earning, cash-out, or convertible-to-value mechanics.
- No gambling: no wagering real value, no odds framed as bettable, no loot boxes bought with money.
- No real market data, real price feeds, real charts, or real exchange APIs.
- No real people: no real KOLs, influencers, celebrities, projects, or brands (real or thinly veiled).
- No financial advice, investment framing, or "how to actually do this" instructions.
- No backend, no auth, no accounts, no multiplayer, no user data collection.
- No claims of being real, profitable, or endorsed. Satire label stays visible.

Everything is fictional and clearly labeled as a comedy game.

---

## 3. MVP scope (what v0 IS)

The smallest thing that is actually fun to poke at. One screen. Ships with:

- **One home/trading screen** (mobile portrait).
- **Fake chart** — procedurally faked line that jitters up and occasionally dumps. Pure cosmetic.
- **One big action button** — `SEND THE CANDLE`.
- **12 starter upgrades** (Section 8).
- **12 starter cards** — the "Basement Launch Collection" (Section 9).
- **One event track** — Bull Trap Week (Section 10).
- **Local save/load** via `localStorage` with a version field.
- **Rug/prestige v0** — Graduate $EGG when curve hits 100% (Section 11).
- **Funny ticker feed** — scrolling one-liners driven by actions/events.

If it's not in this list, it's not in v0.

---

## 4. Out-of-scope for v0 (explicitly DO NOT build)

- Multiple coins or a coin roster (only $EGG).
- Lawyer Tokens, Heat spending, Exit Liquidity sinks (define the fields, don't build systems).
- Multiple event tracks, quests, or a campaign.
- Multiple card sets, trading, crafting, or Copium-for-cards shop beyond one Cope Crate.
- Prestige skill tree / upgrade tree (v0 prestige = single flat multiplier).
- Offline/idle earnings while tab closed (compute on load is optional stretch, not required).
- Sound, music, particle effects, complex animations, or juice beyond CSS transitions.
- Settings menu beyond a reset/wipe-save button.
- Backend, cloud save, leaderboards, accounts, analytics, telemetry.
- Capacitor / native wrapper / app store packaging.
- Balancing polish. Numbers just need to feel alive, not be tuned.
- Accessibility beyond sane defaults, i18n, theming.

---

## 5. First screen design (mobile portrait, top → bottom)

```
┌───────────────────────────────┐
│ [1] RESOURCE BAR              │  Liquidity · Hype · Heat · Copium
│  💧 1.2K  🔥 x1.4  ♨ 12  😮‍💨 3 │  (Receipts/Exit Liq hidden until earned)
├───────────────────────────────┤
│ [2] FAKE COIN PANEL           │  $EGG  ·  "Basement Launch"
│  ticker, tiny logo, tagline   │  fake price 0.00042 ▲ (cosmetic)
├───────────────────────────────┤
│ [3] FAKE CHART                │  jittery green line, red dump spikes
│  ~30% of viewport height      │  canvas or SVG polyline
├───────────────────────────────┤
│ [4] BONDING CURVE PROGRESS    │  ▓▓▓▓▓▓░░░░  63%  → GRADUATE at 100%
├───────────────────────────────┤
│                               │
│      [5] SEND THE CANDLE      │  giant tap button, satisfying press
│           (big button)        │  shows +gain floaty on tap
│                               │
├───────────────────────────────┤
│ [6] TICKER FEED               │  scrolling / stacked goblin one-liners
│  "KOLs ate first..."          │  newest on top, ~5 visible
├───────────────────────────────┤
│ [7] BOTTOM NAV / DRAWERS      │  [Upgrades] [Cards] [Event] [Rug]
└───────────────────────────────┘
```

- **[1] ResourceBar** — sticky top. Always shows Liquidity + Hype + Heat + Copium. Receipts and
  Exit Liquidity only appear once > 0.
- **[2] FakeCoinPanel** — $EGG identity, cosmetic price derived from Liquidity, non-interactive.
- **[3] FakeChart** — cosmetic. Reads a rolling buffer of fake price points; never real data.
- **[4] BondingCurve** — progress bar 0–100%. At 100% the Graduate button/drawer unlocks.
- **[5] MainActionButton** — the star. Big, thumb-reachable, immediate feedback.
- **[6] TickerFeed** — capped scrolling list (e.g. last 30 in state, ~5 shown).
- **[7] Bottom nav** — opens bottom-sheet drawers/modals for Upgrades, Cards, Event, Rug/Prestige.
  Drawers overlay the same screen; there is still only one screen.

---

## 6. Game state model (TypeScript-friendly)

```ts
// src/game/types.ts

export type ResourceKey =
  | "liquidity"
  | "hype"
  | "heat"
  | "copium"
  | "receipts"
  | "exitLiquidity";

export interface Resources {
  liquidity: number;      // main currency
  hype: number;           // marketing multiplier input (>= 0)
  heat: number;           // risk / prestige pressure
  copium: number;         // duplicate-card currency
  receipts: number;       // collection currency (earned, unused sink in v0)
  exitLiquidity: number;  // prestige-flavored reward (earned, unused sink in v0)
}

export interface CurrentCoin {
  id: "egg";
  ticker: "$EGG";
  name: string;           // "Basement Launch"
  fakePrice: number;      // cosmetic only
  priceHistory: number[]; // rolling buffer for FakeChart, cosmetic
}

export interface BondingCurve {
  progress: number;       // 0..1
  filled: boolean;        // true once >= 1, gates Graduate
}

export interface UpgradeState {
  id: string;
  level: number;          // 0 = unowned
}

export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export interface CardState {
  id: string;
  owned: boolean;
  copies: number;         // dupes convert to Copium
}

export interface EventTaskState {
  id: string;
  progress: number;       // current count
  target: number;         // goal
  done: boolean;
}

export interface EventState {
  id: "bull_trap_week";
  active: boolean;
  claimed: boolean;
  tasks: EventTaskState[];
}

export interface TickerEntry {
  id: string;             // uuid/counter
  text: string;
  tone: "neutral" | "bull" | "bear" | "cursed";
  at: number;             // timestamp for ordering
}

export interface GameState {
  saveVersion: number;            // bump to migrate/wipe
  resources: Resources;
  coin: CurrentCoin;
  bondingCurve: BondingCurve;
  upgrades: Record<string, UpgradeState>;
  cards: Record<string, CardState>;
  event: EventState;
  prestige: {
    count: number;                // number of rugs/graduations
    multiplier: number;           // permanent global multiplier
  };
  ticker: TickerEntry[];          // capped history (e.g. 30)
  stats: {                        // for event tasks & flavor
    totalTaps: number;
    upgradesBought: number;
    jeetsSurvived: number;
    copeCratesOpened: number;
  };
  lastTickAt: number;             // for passive gain / offline calc
}
```

---

## 7. Economy v0 (simple, transparent, tunable)

All constants live in `economy.ts` as named exports so they're one-file tunable.

```ts
// Global multiplier from prestige + hype
globalMult   = prestige.multiplier * (1 + hype * HYPE_WEIGHT)   // HYPE_WEIGHT = 0.05

// Tap gain (per SEND THE CANDLE press)
tapGain      = BASE_TAP * globalMult                             // BASE_TAP = 1
             // + any flat tap bonuses from upgrades

// Passive gain per second (sum over owned upgrades)
passivePerSec = sum(upgrade.baseRate * upgrade.level) * globalMult

// Upgrade cost scaling (classic idle geometric)
upgradeCost(level) = ceil(baseCost * COST_GROWTH ^ level)        // COST_GROWTH = 1.15

// Bonding curve progress (fills from liquidity earned this run)
curveProgress = clamp(liquidityEarnedThisRun / CURVE_GOAL, 0, 1) // CURVE_GOAL = 10_000 * (prestige.count+1)

// Card unlock chance (rolled on qualifying events: tap milestones, crate opens, graduation)
cardRoll:  onCrateOpen -> guaranteed 1 card weighted by rarity
           onTapMilestone(every 50 taps) -> CARD_DROP_CHANCE roll   // 0.15
           weights: common 60 / uncommon 25 / rare 12 / legendary 3
           duplicate -> +COPIUM_PER_DUPE Copium                     // 5

// Event task progress: incremented by the matching action; task done when progress >= target

// Prestige bonus (on Graduate $EGG)
gainedMultiplier = 1 + PRESTIGE_STEP * sqrt(liquidityEarnedThisRun / CURVE_GOAL)  // PRESTIGE_STEP = 0.25
prestige.multiplier *= gainedMultiplier
heat += HEAT_PER_RUG                                              // HEAT_PER_RUG = 10
exitLiquidity += 1
// then reset run-scoped state (liquidity, curve, coin price, upgrade levels)
```

Design intent: tap early, automate mid, graduate to break the ceiling. Every constant is a knob.

---

## 8. Starter upgrades (12)

`src/data/upgrades.ts`. `effect` is one of: `tap` (flat per-tap add), `passive` (per-sec add),
`hype` (adds Hype), `curve` (curve fill boost), `meta` (utility flavor). v0 can implement `tap`,
`passive`, and `hype` for real; `curve`/`meta` may be flavor-only stubs that still cost Liquidity.

| # | id | name | baseCost | costGrowth | effect | description | icon prompt placeholder |
|---|----|------|---------:|-----------:|--------|-------------|-------------------------|
| 1 | shill_bot | Shill Bot | 15 | 1.15 | passive +0.2/s | Posts "wen" in 40 chats at once. Never sleeps, never rugs you (yet). | `pixel goblin bot with megaphone, terminal green` |
| 2 | micro_kol | Micro KOL Contract | 100 | 1.15 | passive +1/s | Pays a 300-follower legend in exposure. He ate first. | `tiny influencer avatar, gold chain, laptop` |
| 3 | volume_bot_choir | Volume Bot Choir | 550 | 1.16 | passive +4/s | Wash-trades a hymn. Chart hears angels. | `choir of identical robots singing candles` |
| 4 | jeet_drone | Jeet Containment Drone | 1_200 | 1.16 | hype +2 | Hovers over paperhands, whispers "few". Reduces panic aroma. | `security drone with red laser eye over crowd` |
| 5 | dust_collector | Side Wallet Dust Collector | 3_000 | 1.17 | passive +12/s | Sweeps crumbs from 200 side wallets. Chat calls it bullish. | `robotic dustpan over glowing wallet crumbs` |
| 6 | curve_accelerator | Bonding Curve Accelerator | 8_000 | 1.18 | curve +8% fill | Nitrous for the curve. Graduation smells closer already. | `curved rail with rocket booster, neon` |
| 7 | chart_printer | Fake Chart Printer | 20_000 | 1.18 | tap +5 | Prints green candles on demand. Ink is 100% copium. | `dot-matrix printer spitting green candlesticks` |
| 8 | cope_amplifier | Community Cope Amplifier | 45_000 | 1.19 | hype +5 | Turns "it's over" into "we're so back" at scale. | `speaker stack radiating hopium waves` |
| 9 | meta_radar | Meta Rotation Radar | 90_000 | 1.19 | passive +40/s | Beeps when a new narrative is about to be farmed. | `radar dish scanning meme icons` |
| 10 | lawyer_retainer | Lawyer Token Retainer | 175_000 | 1.20 | meta (flavor) | Retains a lawyer who only says "no comment." Buys peace of mind. | `briefcase with tiny scales-of-justice sticker` |
| 11 | cto_megaphone | CTO Revival Megaphone | 320_000 | 1.20 | hype +10 | Revives dead projects by yelling. 87% cope by volume. | `megaphone plastered with "CTO" duct tape` |
| 12 | cabal_invite | Cabal Group Chat Invite | 600_000 | 1.21 | passive +200/s | You're in the group now. They ate first, but you get scraps faster. | `locked phone glowing with secret group chat` |

---

## 9. Starter cards — "Basement Launch Collection" (12)

`src/data/cards.ts`. Rarity affects drop weight (Section 7). `effect` is optional passive flavor;
v0 may treat all card effects as cosmetic/flavor except where trivial to wire.

| # | id | name | rarity | effect | flavor text | icon prompt placeholder |
|---|----|------|--------|--------|-------------|-------------------------|
| 1 | side_wallet_dust | Side Wallet Dust | common | none | Dev moved to side wallet. Chat called it bullish. | `macro shot of glowing wallet dust particles` |
| 2 | micro_kol_receipt | Micro KOL Receipt | common | none | KOLs ate first. You provided the calories. | `crumpled receipt with a tiny blue check` |
| 3 | jeet_stampede | Jeet Stampede | common | none | They sold the bottom in perfect unison. Beautiful, really. | `herd of paperhand goblins running downhill` |
| 4 | bonding_curve_body | Bonding Curve Body | uncommon | none | Bonding curve graduated directly into a crime scene. | `chalk outline shaped like a rising curve` |
| 5 | chart_gravity_debt | Chart Gravity Debt | uncommon | +2% tap | Chart went vertical because gravity clocked out early. | `candlestick chart ignoring a falling apple` |
| 6 | exit_interface_badge | Exit Interface Badge | rare | +3% passive | You were not early. You were the exit interface. | `access badge reading EXIT INTERFACE` |
| 7 | cope_crate | Cope Crate | common | none | Contents: hopium, a rug fiber, one (1) unread whitepaper. | `wooden crate leaking blue mist` |
| 8 | volume_bot_choir_card | Volume Bot Choir | uncommon | +1 Hype | They sing the volume that was never there. | `angelic robots with candle-shaped halos` |
| 9 | wrong_ticker_poster | Wrong Ticker Poster | common | none | Aped the wrong ticker. It did 40x. This one did jail. | `torn poster with a misspelled ticker` |
| 10 | cto_cope_meter | CTO Cope Meter | rare | +3% passive | CTO now 87% cope by volume. Needle stuck at "we're so back." | `analog gauge maxed into a red COPE zone` |
| 11 | graduation_crime_scene | Graduation Crime Scene | legendary | +5% global | AI agent achieved sentience and immediately blamed the deployer. | `police tape around a graduation cap` |
| 12 | you_were_not_early | You Were Not Early | legendary | +5% global | Trenches are fried but your bots are hungrier. | `dim basement monitor glowing "TOO LATE"` |

---

## 10. First event track — Bull Trap Week

`src/data/events.ts`. Single active event. Tasks tick off from matching actions; when all done,
player claims once.

**Bull Trap Week** — "The bull was a trap. The trap was you."

Tasks:

| id | label | target | source signal |
|----|-------|-------:|---------------|
| send_candle_25 | Send the candle 25 times | 25 | tap action |
| buy_3_upgrades | Buy 3 upgrades | 3 | upgrade purchase |
| reach_1000_liq | Reach 1,000 Liquidity | 1000 | liquidity high-water mark |
| survive_2_jeets | Survive 2 jeet events | 2 | jeet event resolved |
| open_1_crate | Open 1 Cope Crate | 1 | crate opened |
| graduate_egg | Graduate $EGG | 1 | prestige/graduate |

Rewards (on claim):

- **+2,000 Liquidity**
- **+25 Copium**
- **1 random card** (weighted roll)
- **Temporary Hype boost**: +10 Hype for 90 seconds (simple timed buff; v0 may implement as a
  decaying Hype grant if timers are too much — flat +10 with a note is acceptable).

Note: "jeet events" are periodic scripted ticker events (see Section 11 loop) the player "survives"
by just continuing to play; no fail state in v0.

---

## 11. Rug/prestige mechanic v0

Keep it one button and one modal.

1. **Unlock**: `bondingCurve.progress >= 1` → the **Rug** drawer's `GRADUATE $EGG` button enables.
2. **Action**: player taps `GRADUATE $EGG`.
3. **Outcome text**: show a randomized graduation line in the PrestigeModal, e.g.:
   - "Bonding curve graduated directly into a crime scene."
   - "You were not early. You were the exit interface."
   - "Dev moved to side wallet. Chat called it bullish."
4. **Reward**: compute `gainedMultiplier` (Section 7), apply to `prestige.multiplier`,
   `prestige.count += 1`, `heat += HEAT_PER_RUG`, `exitLiquidity += 1`.
5. **Reset run**: zero out `liquidity`, upgrade levels, curve progress, coin price history,
   `liquidityEarnedThisRun`. Keep: cards, prestige, heat, copium, receipts, exitLiquidity, event
   (unless graduation completes the event), ticker history (trim), stats.
6. **Restart stronger**: new run starts with the higher `prestige.multiplier`; `CURVE_GOAL` scales
   up so the next graduation is bigger.

Funny, flat, one number goes permanently up. No tree, no choices in v0.

Ambient loop flavor (drives ticker + jeet task): every N seconds emit a random ticker line; some are
tagged as `jeet` events that increment `jeetsSurvived`.

---

## 12. File structure

```
rugpull-tycoon/
  docs/
    PRD.md
    MVP_SPEC.md
    DESIGN_SPEC.md
    CONTENT_BIBLE.md
    BUILD_PLAN.md          # this file

  index.html
  vite.config.ts
  package.json

  src/
    main.tsx
    App.tsx

    game/
      types.ts             # GameState + all interfaces (Section 6)
      economy.ts           # constants + pure formula fns (Section 7)
      reducer.ts           # (state, action) -> state; all mutations here
      save.ts              # load/save/wipe localStorage, version migrate
      tick.ts              # passive gain + ambient events per second

    data/
      starterCoin.ts       # $EGG definition
      upgrades.ts          # 12 upgrades (Section 8)
      cards.ts             # 12 cards (Section 9)
      events.ts            # Bull Trap Week (Section 10)
      tickerLines.ts       # pools of one-liners by tone

    state/
      GameProvider.tsx     # useReducer + context, wires tick loop + autosave

    components/
      ResourceBar.tsx
      FakeCoinPanel.tsx
      FakeChart.tsx
      BondingCurve.tsx
      MainActionButton.tsx
      TickerFeed.tsx
      UpgradeList.tsx
      CardAlbum.tsx
      EventPanel.tsx
      PrestigeModal.tsx
      BottomNav.tsx

    screens/
      HomeScreen.tsx

    styles/
      theme.css
```

---

## 13. Implementation order (small, testable steps)

Each step should compile and be visibly checkable before moving on.

1. **Clean the scaffold** — strip Vite demo from `App.tsx`/`App.css`; render an empty
   `HomeScreen`. ✅ App loads blank portrait shell.
2. **Types** — write `game/types.ts` fully. ✅ `tsc` passes.
3. **Data files** — `starterCoin.ts`, `upgrades.ts` (12), `cards.ts` (12), `events.ts`,
   `tickerLines.ts`. ✅ Arrays typed, no errors.
4. **Economy** — `economy.ts` constants + pure functions (`tapGain`, `passivePerSec`,
   `upgradeCost`, `curveProgress`, `gainedMultiplier`). ✅ Unit-checkable in isolation.
5. **Initial state + reducer** — `newGame()` + `reducer.ts` handling `TAP`, `BUY_UPGRADE`,
   `OPEN_CRATE`, `GRADUATE`, `TICK`, `CLAIM_EVENT`. ✅ Actions transform state correctly (log-test).
6. **Save/load** — `save.ts` with `saveVersion`; `GameProvider.tsx` loads on mount, autosaves on
   change (debounced), plus a wipe fn. ✅ Refresh preserves state.
7. **ResourceBar + MainActionButton** — tap increments Liquidity, floaty feedback. ✅ Tapping works.
8. **FakeChart** — feed cosmetic price buffer, render SVG polyline that moves on tick. ✅ Line wiggles.
9. **BondingCurve** — bar reflects `curveProgress`. ✅ Fills as Liquidity grows.
10. **Tick loop** — `tick.ts` in provider: passive gain/sec + ambient ticker/jeet events. ✅ Numbers rise idle.
11. **TickerFeed** — render capped history newest-first. ✅ Lines stream in.
12. **UpgradeList drawer** — buy upgrades, cost scales, effects apply. ✅ Passive/tap changes on buy.
13. **CardAlbum + card drops** — roll on milestones/crates, dupes → Copium. ✅ Cards appear, dupes give Copium.
14. **EventPanel** — Bull Trap Week tasks track + claim rewards. ✅ Tasks tick, claim pays out once.
15. **PrestigeModal** — Graduate unlocks at 100%, applies multiplier, resets run. ✅ Full loop closes.
16. **BottomNav** — wire drawers/modals. ✅ Navigation opens each panel.
17. **theme.css pass** — terminal-goblin dark theme, readable, ugly-but-coherent. ✅ Looks intentional.
18. **Wipe/reset button + satire label** — settings-lite. ✅ Can reset; disclaimer visible.

---

## 14. Acceptance criteria (v0 "done")

v0 is done when, on a phone-width browser, a fresh player can:

- [ ] Load the app to the $EGG home screen with no console errors.
- [ ] Press **SEND THE CANDLE** and watch **Liquidity** increase with visible feedback.
- [ ] See the **fake chart** move and the **bonding curve** fill as Liquidity grows.
- [ ] Buy **Shill Bot** and observe passive Liquidity accrue per second while idle.
- [ ] Buy from all **12 upgrades** (funds permitting) with correct geometric cost scaling.
- [ ] See **funny ticker lines** stream from actions and ambient events.
- [ ] **Unlock at least one card** into the Basement Launch Collection; dupes grant **Copium**.
- [ ] Progress and complete **Bull Trap Week** tasks and claim its rewards once.
- [ ] Reach **100% bonding curve**, tap **GRADUATE $EGG**, see outcome text, gain a permanent
      multiplier, and watch the run reset while cards/prestige persist.
- [ ] Refresh the page and have all persistent state **restored from localStorage**.
- [ ] Wipe save and start clean.
- [ ] Satire/fiction disclaimer is visible; nothing in Section 2 exists anywhere in the build.

---

## 15. Build prompt for the coding agent

> Build **Rugpull Tycoon: Basement Launch**, a fictional satirical idle/tycoon web game. Stack:
> React 19 + Vite + TypeScript, mobile portrait first, `localStorage` saves, no backend, no auth,
> no payments, no real crypto, no real data, no real people. It is a comedy game — keep a visible
> "fictional satire, not financial advice" label.
>
> Build ONE home screen for the coin **$EGG** with, top-to-bottom: a resource bar (Liquidity, Hype,
> Heat, Copium), a fake coin panel, a cosmetic fake chart (SVG polyline, procedurally faked — never
> real data), a bonding-curve progress bar, a big **SEND THE CANDLE** button, a scrolling ticker
> feed of goblin one-liners, and a bottom nav opening drawers for Upgrades, Cards, Event, and Rug.
>
> Implement the loop: tap earns Liquidity (`tapGain = BASE_TAP * prestige.multiplier * (1 + hype*0.05)`);
> owned upgrades add passive Liquidity/sec via a 1s tick; upgrades cost `ceil(baseCost * 1.15^level)`;
> Liquidity fills a bonding curve toward `CURVE_GOAL = 10000 * (prestigeCount+1)`; at 100% the player
> can **Graduate $EGG**, which shows a funny outcome line, multiplies a permanent `prestige.multiplier`,
> bumps Heat, and resets the run (keeping cards + prestige). Card drops roll on tap-milestones and Cope
> Crate opens with rarity weights common60/uncommon25/rare12/legendary3; duplicates convert to Copium.
> Include the single event **Bull Trap Week** with the six tasks and its rewards.
>
> Use exactly the 12 upgrades and 12 cards and the economy constants defined in `docs/BUILD_PLAN.md`
> (Sections 7–10). Keep all tunable constants in `game/economy.ts`. Organize code per the file tree in
> Section 12: `game/{types,economy,reducer,save,tick}.ts`, `data/*`, `state/GameProvider.tsx`,
> `components/*`, `screens/HomeScreen.tsx`, `styles/theme.css`. State shape follows Section 6; persist
> with a `saveVersion` field and provide a wipe-save button.
>
> Constraints: no backend, no accounts, no multiplayer, no monetization, no app-store packaging, no
> sound, no heavy animation (CSS transitions only). Ugly but fully playable beats pretty but broken.
> Deliver a build that satisfies every checkbox in Section 14.
```
```
