export const LAUNCH_LINES = [
  '$EGG launched from a folding table with institutional confidence.',
  'Basement launch live. The chart has been asked to behave.',
  'Ticker deployed. Nobody audited the vibes.',
]

export const TAP_LINES = [
  'SEND THE CANDLE detected. Gravity filed a complaint.',
  'Chart went vertical because gravity clocked out early.',
  'Chat says "still early" with unsafe conviction.',
  'Liquidity arrived wearing fake glasses.',
  'The trenches are loud. The numbers are louder.',
  'AI agent achieved sentience and immediately blamed the deployer.',
  'CTO now 87% cope by volume.',
]

export const UPGRADE_LINES = [
  'Upgrade purchased. Due diligence has left the building.',
  'Operator hired. Morale is up, standards are missing.',
  'Automation installed. The basement smells like hot confidence.',
  'Spend confirmed. Nobody read the fine print.',
]

export const CARD_LINES = [
  'Receipt unlocked. The album gets more incriminating.',
  'Card found in the wreckage. It has lore on it.',
  'Collection updated. Evidence wants a sleeve.',
]

export const DUPLICATE_CARD_LINES = [
  'Duplicate card shredded into Copium.',
  'Same receipt again. Copium extracted.',
  'Duplicate detected. The album called it character development.',
]

export const JEET_LINES = [
  'Jeets stampeded. You survived the group chat flood.',
  'Floor got tested by people with shaky thumbs.',
  'Red candle attempted a hostile takeover.',
  'Liquidity ducked. Heat noticed.',
]

export const PRESTIGE_LINES = [
  'Bonding curve graduated directly into a crime scene.',
  'KOLs ate first. You provided the calories.',
  'You were not early. You were the exit interface.',
  'The chart collapsed into a teachable moment.',
]

export const EVENT_LINES = [
  'Bull Trap Week task cleared. The spreadsheet looks thrilled.',
  'Event reward paid. Please pretend this was governance.',
  'Checklist updated. Confidence remains fictional.',
]

export const MICRO_LINES = [
  'gravity clocked out',
  'jeets alerted',
  'chart escaped containment',
  'someone bought the top',
]

// v0.3 Chart Gravity microcopy. Kept short; the reducer fires these only on
// meaningful state changes (decay starting, floor held, recovery) — never every
// tick — to avoid spamming the feed.
export const GRAVITY_START_LINES = [
  'GRAVITY IS REMEMBERING.',
  'THE CURVE IS BLEEDING. Send a candle.',
  'The chart misses your attention.',
]

export const GRAVITY_HIGH_HEAT_LINES = [
  'JEETS SMELL WEAKNESS. The curve is too hot to sit still.',
  'High heat, low attention. Gravity is feasting.',
]

export const GRAVITY_FLOOR_HELD_LINE =
  "MILESTONE HELD. GRAVITY CAN'T STEAL WHAT YOU ALREADY EARNED."

export const GRAVITY_RECOVERY_LINES = [
  "CHART STABILIZING. IT FORGIVES, IT DOESN'T FORGET.",
  'Back on track. The jeets pretend they never doubted you.',
]

export const MILESTONE_LINES: Record<number, string> = {
  1: '25% — Jeets noticed. This is either bullish or terminal.',
  2: '50% — KOLs circling. Hide the good snacks.',
  3: '75% — Gravity unstable. Chart may remember physics.',
  4: '100% — Graduation unlocked. Crime scene pending.',
}
