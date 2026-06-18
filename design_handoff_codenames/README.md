# Handoff: Codenames — mobile redesign (Sunbloom)

## Overview
A mobile, pass-and-play implementation of the word-association party game **Codenames**.
Two teams (Coral / Dusk) race to contact all of their agents on a 5×5 grid of word
cards. One player per team acts as **spymaster** (sees the secret key, gives one-word
clues + a number); the rest are **operatives** (tap cards to guess). Tapping the single
**assassin** card loses the game instantly.

This redesign is a single phone screen — board, score, clue bar, and controls all live
on one view, switched between **Play** (operative) and **Key** (spymaster) modes.

## About the Design Files
The files in this bundle are **design references created in HTML/React-via-Babel** —
prototypes showing the intended look and behavior. They are **not production code to copy
directly**. The task is to **recreate these designs in the target codebase's environment**
(React Native, SwiftUI, Flutter, a web React app, etc.) using its established patterns,
component library, and state tooling. If no codebase exists yet, pick the framework that
best fits the target platform (mobile-first) and implement there.

The Babel/CDN setup, the `ios-frame.jsx` device bezel, and the `tweaks-panel.jsx` are
**prototype scaffolding only** — the iPhone frame and the Tweaks panel must NOT ship. They
exist so the design can be previewed and tuned in the browser.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, and interactions are all
specified below and in `codenames-app.jsx`. Recreate the UI pixel-faithfully using the
codebase's own primitives. The exact pixel values are a target for a ~390–402pt-wide
phone screen; scale proportionally for other widths.

## Screens / Views
There is **one screen** with two modes and one overlay.

### 1. Game board — Operative mode ("Play")
- **Purpose:** the active team's operatives read the current clue and tap word cards to
  guess their agents.
- **Layout (top → bottom), vertical flex, `gap: 13px`, screen padding `58px 16px 26px`
  (the large top padding clears the status bar / notch):**
  1. **Header row** (`space-between`): wordmark block on the left, mode toggle on the right.
  2. **Score row** — two equal chips, `gap: 9px`.
  3. **Clue bar** — single full-width card.
  4. **Grid** — 5×5 cards, `display:grid; grid-template-columns: repeat(5,1fr); gap: 7px`.
  5. **Footer row** — End-turn button (flex:1) + circular New-game button, `gap: 9px`.

- **Header — wordmark block** (vertical, `gap:2px`):
  - "CODENAMES" — word font, weight 600, 19px, letter-spacing 1.2px, color `--ink` #2C2622.
  - Subtitle — UI font, weight 600, 11px, letter-spacing 0.3px, color `--muted` #9A8E81.
    Text is contextual: `"{TeamName} operatives"` in Play, `"Spymaster — pick a clue"` in
    Key, `"Game over"` when finished.

- **Header — mode toggle** (segmented control):
  - Container: `--panel` #FFFFFF bg, radius 11px, padding 3px, inset 1px border `--line`
    #F0E7DB, `gap:2px`.
  - Two buttons "Play" and "Key": radius 8px, padding `7px 12px`, UI font weight 700, 12px.
  - Selected button: bg = active team color, text #fff. Unselected: transparent bg, text
    `--muted`. Transition `all .12s`.

- **Score chip** (×2, one per team):
  - `flex:1`, row, `align-items:center`, `gap:9px`, radius 14px, padding `10px 13px`.
  - **Active team** (whose turn it is): bg = team color, dot #fff, number #fff, label #fff
    (90% opacity); drop shadow `0 5px 14px <teamColor>@35%`.
  - **Inactive team:** bg `--panel`, inset 1px `--line` border; dot = team color, number
    `--ink`, label `--muted`.
  - Dot: 11px circle. Number: word font, weight 700, 19px = remaining agents for that team.
    Label: UI font, weight 600, 10.5px, uppercase, letter-spacing 0.4px, margin-top 3px =
    team name ("CORAL" / "DUSK").

- **Clue bar (operative mode):**
  - bg `--panel`, radius 16px, padding `13px 16px`, inset 1px `--line` border, plus a
    **left accent border `4px solid <activeTeamColor>`**, `min-height: 52px`,
    `space-between`. Opacity 0.5 when game is over.
  - **When a clue exists:** left column — eyebrow `"{TeamName}'S CLUE"` (UI font, 700,
    10.5px, uppercase, letter-spacing 0.6px, `--muted`) over the clue word (word font, 600,
    23px, `--ink`, letter-spacing 0.4px). Right cluster (`gap:11px`): "{N} left" text
    (UI font, 600, 11.5px, `--muted`) + a number token — 42px min-width square, radius
    12px, bg = active team color, text #fff, word font 700, 22px = the clue's number.
  - **When no clue yet:** single muted line, 13.5px weight 600 —
    `"Waiting for {TeamName} spymaster — tap **Key** to give a clue."` ("Key" bolded `--ink`).

- **Word card** (25 total). Base box: radius `--card-r` (16px default), `min-height 58px`,
  centered content, padding `6px 3px 9px`.
  - **Unrevealed, operative mode:** bg `--panel`, word in `--ink`; shadow
    `0 2px 5px rgba(74,58,40,.09)` + inset 1px `--line` border. Word: word font, weight 600,
    11px, letter-spacing 0.3px, centered, line-height 1.05. It's a real button; tapping it
    guesses (only enabled when a clue is active and the game isn't over).
  - **Unrevealed, spymaster mode (Key):** bg = identity **tint**, word in identity **ink**,
    no card border, shadow `0 1px 0 rgba(255,255,255,.7)`, plus a 3px **accent bar** pinned
    `left:8 right:8 bottom:5`, radius 3px, color = identity solid (neutral bar at 40%
    opacity, team/assassin at 85%). This reveals the key without "spending" the card.
  - **Revealed (any mode):** bg = identity **solid**, inset shadow
    `inset 0 2px 7px rgba(0,0,0,.2)`, word in solid-ink (white for teams, `#FBF4EC` for
    assassin, `#544838` for neutral) at 95% opacity. An **agent token** sits top-right
    (`top:5 right:5`).
  - **Identity → color mapping:**
    - Coral team (`a`): solid `--a` #E8775E, tint `color-mix(in oklab, --a 20%, --paper)`,
      ink `color-mix(in oklab, --a 80%, #1b1410)`, solid-ink #fff.
    - Dusk team (`b`): solid `--b` #5C7AA6, same tint/ink formulas, solid-ink #fff.
    - Neutral (`n`): solid `--neutral` #D8C9B4, tint `--n-tint` #F1E8DB, ink #7E7060,
      solid-ink #544838.
    - Assassin (`x`): solid #34302C, tint #dccfc0, ink/solid-ink #34302C / #FBF4EC.

- **Agent token** (SVG, ~14px): a thin 50%-opacity ring + a small person glyph (head circle
  + shoulders path), filled with the passed color. Used on revealed cards (solid-ink color)
  and inside the win-overlay badge (white).

- **Footer:**
  - **End turn** — `flex:1`, height 50px, radius 14px. Enabled (clue active, not over): bg =
    active team color, text #fff. Disabled: bg `--panel`, inset `--line` border, text
    `--muted`. UI font weight 700, 15px.
  - **New game** — 50×50px, radius 14px, bg `--panel`, inset `--line` border; contains a
    circular-refresh SVG icon stroked in `--ink`, 1.8px, rounded caps.

### 2. Game board — Spymaster mode ("Key")
Same layout; differences:
- Subtitle reads "Spymaster — pick a clue".
- Cards switch to the **tint + accent-bar** treatment described above (key visible).
- The clue bar is **replaced by a clue composer** card (same shell: `--panel`, radius 16px,
  inset border, left 4px accent, padding `12px 13px`, `gap:9px`):
  - **Text input** (`flex:1`): borderless, transparent, word font weight 600, 17px, `--ink`,
    `text-transform:uppercase`, letter-spacing 0.4px, placeholder "One-word clue".
  - **Number stepper:** pill, bg `--paper`, radius 10px, padding `4px 6px`. "–" and "+"
    buttons (transparent, `--ink`, weight 700, 18px, 22×28px) flanking the number (word font
    700, 16px, min-width 14px, centered). Clamped **1–9**.
  - **Give button:** height 38px, radius 10px, padding `0 14px`, bg = active team color,
    text #fff, UI font weight 700, 13px.
- Word cards are **not tappable** in this mode (operatives shouldn't see who guessed).

### 3. Win overlay
- Covers the screen: `position:absolute; inset:0`, bg `color-mix(in oklab, --paper 78%,
  transparent)`, `backdrop-filter: blur(3px)`, centered column, `gap:18px`, padding 30px,
  z-index 5.
- **Badge:** 64×64px, radius 20px, bg = winning team color, white agent token inside,
  shadow `0 12px 30px <winnerColor>@40%`.
- **Title:** "{TeamName} wins" — word font, 600, 28px, `--ink`.
- **Subtitle** (13.5px, 600, `--muted`): `"{LoserName} hit the assassin"` if lost to the
  assassin, otherwise `"All agents contacted"`.
- **New game button:** padding `13px 26px`, radius 13px, bg `--ink`, text `--paper`, UI font
  weight 700, 15px.

## Interactions & Behavior
- **Mode toggle (Play/Key):** local view state only; does not mutate the game.
- **Give clue** (spymaster): trims input, uppercases it; ignores empty. Sets
  `clue = {word, num}`, sets `guessesLeft = num + 1` (classic Codenames "+1" bonus guess),
  then auto-switches the view to Play.
- **Tap a card** (operative): only when a clue is active and game not over; revealed cards
  ignore taps. Resolution order:
  1. Mark card revealed.
  2. If it's the **assassin** → the **other** team wins, `loseReason='assassin'`, game over.
  3. Recompute remaining for both teams from the revealed set. If either team hits **0**,
     that team wins (game over).
  4. Else if the card belongs to the **active team** → `guessesLeft -= 1`; if it reaches 0,
     pass turn (switch active team, clear clue, `guessesLeft = 0`).
  5. Else (opponent's card or neutral) → pass turn immediately (switch, clear clue).
- **End turn:** switch active team, clear clue, `guessesLeft = 0`. Disabled with no active
  clue or after game over.
- **New game:** deal a fresh board (see State), reset view to Play, clear clue composer.
- **No flip animation in the prototype** — a `transform .08s ease` is on the card button;
  adding a reveal flip (e.g. 180° rotateY, ~250ms) is a reasonable enhancement.

## State Management
Single game object, persisted to `localStorage["cn_state_v2"]` on every change and rehydrated
on load (falling back to a fresh deal if missing/invalid):

```
{
  words:       string[25],         // sampled from a ~50-word pool, shuffled
  key:         ('a'|'b'|'n'|'x')[25], // identities, shuffled
  revealed:    boolean[25],
  start:       'a' | 'b',          // which team got 9 (random)
  active:      'a' | 'b',          // whose turn
  clue:        { word: string, num: number } | null,
  guessesLeft: number,
  winner:      'a' | 'b' | null,
  loseReason:  'assassin' | null,
}
```

**Deal (`newGame`)**: pick `start` randomly. Key composition = **9 × start team, 8 × other
team, 7 × neutral, 1 × assassin** (25 total), then shuffle. Words = shuffle a ~50-word pool,
take 25. `active = start`, `clue = null`, `guessesLeft = 0`, `revealed` all false.

**Derived:** `remaining(team)` = count of `key[i]===team && !revealed[i]`. These feed the
score chips. The board's word pool is in `codenames-app.jsx` (`WORD_POOL`).

View-local (not persisted): `spymaster` (bool), `clueWord` (string), `clueNum` (1–9).

## Design Tokens
**Colors**
| Token | Value | Use |
|---|---|---|
| `--paper` | `#FBF4EC` | screen background |
| `--panel` | `#FFFFFF` | chips, bars, unrevealed cards |
| `--ink` | `#2C2622` | primary text |
| `--muted` | `#9A8E81` | secondary text / labels |
| `--line` | `#F0E7DB` | hairline borders (used as inset 1px) |
| `--a` (Coral) | `#E8775E` | team A solid (tweakable) |
| `--b` (Dusk) | `#5C7AA6` | team B solid (tweakable) |
| `--neutral` | `#D8C9B4` | neutral/bystander solid |
| `--n-tint` | `#F1E8DB` | neutral card tint (spymaster) |
| assassin solid | `#34302C` | assassin card |
| assassin tint | `#dccfc0` | assassin card (spymaster) |

Team **tint** = `color-mix(in oklab, <solid> 20%, var(--paper))`.
Team **ink** = `color-mix(in oklab, <solid> 80%, #1b1410)`.
Solid-ink: #fff for teams, `#FBF4EC` for assassin, `#544838` for neutral.

**Alternate team palettes offered as tweaks** (curated, for picking — not all simultaneously):
Coral slot: `#E8775E`, `#C7633C`, `#C8843A`, `#D98E63`.
Dusk slot: `#5C7AA6`, `#3E8C7B`, `#6E9B6A`, `#8A6BA6`.

**Spacing** — screen padding `58/16/26`; vertical section gap 13px; score gap 9px; grid gap
`--gap` (7px default, tweakable 3–12); footer gap 9px.

**Radius** — cards `--card-r` 16px (tweakable 6–22); clue bar / composer 16px; score chip
14px; mode toggle outer 11px / inner 8px; number token & footer buttons 12–14px; win badge
20px.

**Typography**
- UI font: **Space Grotesk** (system-ui fallback). Used for labels, buttons, body.
- Word font: **Space Grotesk** by default; tweakable to **Bitter** (serif) or **Nunito**
  (rounded). Used for the wordmark, card words, clue word, big numbers, win title.
- Scale in use: 10.5 / 11 / 11.5 / 12 / 13 / 13.5 / 15 / 16 / 17 / 19 / 22 / 23 / 28 px.
- Weights: 600 (most), 700 (numbers/buttons/eyebrows), 800 available for Nunito.
- Card words: uppercase, letter-spacing 0.3px. Wordmark: letter-spacing 1.2px.

**Shadows**
- Unrevealed card (Play): `0 2px 5px rgba(74,58,40,.09)` + inset 1px `--line`.
- Revealed card: `inset 0 2px 7px rgba(0,0,0,.2)`.
- Active score chip: `0 5px 14px <teamColor>@35%`.
- Win badge: `0 12px 30px <winnerColor>@40%`.

## Assets
No raster assets. All visuals are CSS + inline SVG:
- Agent token (ring + person glyph).
- New-game refresh icon.
- The "eye" icon in the comparison canvas is not used in the shipping screen.
Fonts load from Google Fonts (Space Grotesk, Bitter, Nunito) — swap for the codebase's
font pipeline. The iPhone bezel and status bar come from the prototype-only `ios-frame.jsx`
and must not ship.

## Files
- `Codenames.html` — entry point for the **interactive prototype** (loads React + the files
  below). This is the design to recreate.
- `codenames-app.jsx` — **the real design**: full game logic, all components, tokens, and
  the Tweaks wiring. The single most important reference.
- `ios-frame.jsx` — prototype-only iPhone frame (do not ship).
- `tweaks-panel.jsx` — prototype-only live tuning panel (do not ship).
- `Codenames Redesign.html` + `codenames-board.jsx` + `design-canvas.jsx` — the earlier
  **3-direction comparison** (Hearth / Lantern / Sunbloom). Sunbloom was chosen; the other
  two are kept only as palette reference.

## Notes for the implementer
- Strip the prototype scaffolding (iPhone frame, Tweaks panel, Babel/CDN). Keep the game
  module's logic and visual spec.
- `color-mix(in oklab, …)` is used throughout for tints and translucency — fine in modern
  web/CSS; on platforms without it, precompute the resulting hex/rgba.
- Keep the **+1 bonus guess** rule (`guessesLeft = clueNum + 1`) — it's intentional and
  matches the tabletop game.
- This is a single-device pass-and-play model (one phone, players hand it around). A
  networked/multi-device version would need a server-authoritative key the operatives can't
  read — out of scope for this design but worth noting before building.
