# Yahtzee scorecard — appearance spec

The three inks in `Yahtzee Scorecard.dc.html` (2a, 2b, 2d) are **all three shipping**, and
**Street Print is the default**. Nothing here is optional or "phase two".

- Stored per player as `yahtzeeCard` on `Player`, type `YahtzeeCardSkin = 'street' | 'paper' | 'board'`.
- `null` / missing / any unknown value → **`'street'`**. Never fall back to the old dark panels.
- Picked on the player's profile, in the same place the dice theme is picked. All three are one
  tap away — no nesting, no "advanced" section.
- The old scorecard is deleted, including its dark/light toggle. That toggle is NOT kept as a
  fourth ink.

---

## Anatomy — identical in all three inks

Never varies by ink. Only colour, type and shadow vary.

- **Upper Section** and **Lower Section** as two panels, **side by side** on iPad landscape so
  the whole card fits 1194 × 834 with no scrolling. They stack on iPad portrait (834) and phones.
- Each panel: a taped/heading label, then a column header row, then the rows, then that section's
  totals.
- Each row is three columns: **category name** (flex) · **how to score** (210px) · **PTS box** (76 × 44).
- Upper rows: Aces, Twos, Threes, Fours, Fives, Sixes → Total score, Bonus if ≥ 63, Upper total.
- Lower rows: 3 of a Kind, 4 of a Kind, Full House, Sm. Straight, Lg. Straight, YAHTZEE, Chance
  → Lower total, Upper total, GRAND TOTAL.
- YAHTZEE's name is drawn in the ink's `star` colour, not the body ink.
- A row that this throw can take gets a **live** treatment: 2px live-colour border, live tint
  behind the row, and the PTS box filled solid live with dark text.
- Totals rows are the same three-column rhythm; the section-defining ones (Upper total, GRAND
  TOTAL) get an accent tint and accent type.
- Header bar: quit button, "YAHTZEE", player name in accent, round chip in live colour, then the
  five dice at 56px, then ROLL, then the running score.
- One knob, `--sc-scale`, sizes the entire card. It is set per breakpoint band
  (phone ≤767, tablet 768–1099, desktop ≥1100) — do not size individual pieces per band.

## Scored categories leave the card

A category is **removed from the card the moment it is scored**, on your own card during your own
game. Totals, bonus and grand total still carry those points; `RD x/13` counts the turns left.
The full thirteen rows appear only when the card is a record rather than a menu — another
player's card, or game over. There is no "Hide Scored" setting; it is deleted.

---

## 2a · Street Print — DEFAULT

The Street direction applied to the card itself.

| | |
|---|---|
| Display type | Bebas Neue |
| Body type | Inter |
| Panel stock | `#101014` |
| Page behind | `#0b0b0e` |
| Texture | halftone dots — `radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)` at `5px 5px` |
| Ink | `#ffffff` |
| Faint ink | `rgba(255,255,255,0.45)` |
| Rules | `rgba(255,255,255,0.12)`, 1.5px between rows, 2.5px accent under column heads |
| Accent | `#ff2d78` |
| Live | `#aaff00` |
| Star (YAHTZEE) | `#ffd700` |
| Corners | square, everywhere |
| Borders | 2px |
| Panel shadow | `8px 8px 0 rgba(0,0,0,0.6)` |
| Live row shadow | `4px 4px 0 rgba(0,0,0,0.5)` |
| Section labels | taped: solid pink tape, dark text, rotated `-0.8deg`, `3px 3px 0 rgba(0,0,0,0.5)` |
| ROLL button | lime fill, `2px solid #101014`, `5px 5px 0 rgba(0,0,0,0.65)` |
| Dice | white face, `#222` edge, hard offset shadow (not soft) |

Street runs its type larger than the other two — category names 25px, hints 17px, totals 24/29px
— so its rows give the height back in padding (`4px 10px` rows, `3px 10px` totals). Without that
the GRAND TOTAL row runs past the panel and gets sliced.

## 2b · Paper Card

The real printed scorepad. The only bright one — worth checking on the stand in a dim room.

| | |
|---|---|
| Display type | Georgia / Times New Roman serif, **bold** for category names |
| Body type | Inter |
| Panel stock | `#f2e8d0` cream |
| Page behind | `#2a231a` |
| Texture | fibre — `repeating-linear-gradient(92deg, rgba(120,90,40,0.05) 0 2px, transparent 2px 5px)` |
| Ink | `#20180e` |
| Faint ink | `rgba(40,28,14,0.6)` |
| Rules | `rgba(40,28,14,0.28)` |
| Accent | `#b4232a` red |
| Live | `#1c6b3a` green |
| Star | `#b4232a` |
| Corners | square |
| Panel shadow | soft — `0 10px 26px rgba(0,0,0,0.55)` |
| Section labels | solid red block, cream text, **not** rotated, no offset shadow |
| Dice | `#fffdf6` face, `#6b5a3a` edge, soft shadow |

Category names 23px (smaller — the serif sets wider). Rows `7px 10px`.

## 2d · Board Flip

A stadium scoreboard, not a sheet. Every number in one monospaced face, cyan hairlines instead
of printed rules. Coldest of the three.

| | |
|---|---|
| Display type | **Share Tech Mono**, falling back to `ui-monospace, monospace` |
| Body type | Inter |
| Panel stock | `#0a0d10` |
| Page behind | `#05070a` |
| Texture | scanlines — `repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px)` |
| Ink | `#e8f4ff` |
| Faint ink | `rgba(180,210,235,0.5)` |
| Rules | `rgba(0,212,255,0.22)` |
| Accent | `#00d4ff` cyan |
| Live | `#aaff00` |
| Star | `#ffb400` |
| Corners | square |
| Panel shadow | `0 0 0 1px rgba(0,212,255,0.25), 0 12px 30px rgba(0,0,0,0.7)` |
| Letter-spacing | `0.04em` on category names (mono needs the air) |
| Section labels | solid cyan block, near-black text, not rotated |
| Dice | blue gradient face `linear-gradient(135deg, #142c60 0%, #1a56cc 45%, #4b8bff 75%, #9ac8ff 100%)`, `rgba(255,255,255,0.25)` edge, soft shadow |

**Board Flip needs `Share Tech Mono` imported** or it silently renders in the system monospace
and loses the whole point.

---

## Still outstanding

1. `Share Tech Mono` font import in `index.html`.
2. `yahtzee_card` column on the players table.
