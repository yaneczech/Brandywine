# Brandywine — design codex

Binding rules for the admin and the public manual. Every rule is written so
it can be checked, by hand or by the audit (`app/scripts/design-audit/`).
When a rule has to be broken, a comment next to the code says why.

## Character

Brandywine is a frame for someone else's brand. It succeeds when the brand it
presents stands out, not the platform.

1. **Print, not app.** Content sits on paper. Typography, the grid and
   hairlines carry the structure, not boxes, shadows or colour fills.
2. **One signal per meaning.** Each piece of information is expressed exactly
   once: an icon or text; a rule or a space; a colour or a label. Never both.
3. **Distance is meaning.** What belongs together sits closer; what does not
   sits further apart. Spacing follows the relationship between elements (see
   Rhythm), not the eye.
4. **Colour belongs to the brand.** Surfaces are neutral. The brand colour is
   an accent for actions, the active state, focus and data only. State colours
   are signals, not fills.
5. **Calm is a feature.** Nothing moves, blinks or pops without a reason.
   Motion only confirms what the user did.

Sources: Gestalt law of proximity; the Atlassian and damato.design spacing
systems ("near / away", density decreasing with nesting); Butterick,
*Practical Typography*; Nielsen, *10 Usability Heuristics*; WCAG 2.2 AA; online
brand books of B&O, IBM, Dropbox, DevRev and Firefox (Frontify, 2026).

## Rhythm and spacing

Spacing has five relationship tiers. Any other value between content elements
is a bug.

| Tier | Relationship | Manual | Admin |
|---|---|---|---|
| **inline** | icon ↔ text, value ↔ unit | 4–8 px | `--space-1`–`--space-2` |
| **near** | label ↔ field, heading ↔ subtitle, list items | 8–16 px | `--space-2`–`--space-4` |
| **group** | groups inside a block (form fields, card columns) | 20–32 px | `--space-5`–`--space-8` |
| **flow** | an untitled block continuing the previous one | `--manual-flow-gap` (28–40 px) | `--space-8` |
| **section** | a new section with a heading | `--manual-section-gap` (64–104 px) + rule | `--space-12`–`--space-16` |

Rules:

- **Tiers differ by ≥ 1.5×.** The space around a group is at least 1.5× the
  space inside it, otherwise the relationship does not read.
- **A rule replaces space, it is not added to it.** Two horizontal rules closer
  than `near` are a duplicate (merge them).
- **An empty container has no size.** An element without content keeps no
  padding, min-height or border.
- **4 px grid.** All spacing and control dimensions are multiples of 4.
  Exceptions: optical alignment below 4 px (label ↔ value, a −1 px rule
  overlap) and `em` spacing that follows the font size.

## Typography

- **Body text:** 16 px (`--text-lg`), line height 1.55–1.75, line length at most
  72 characters (`max-width: 72ch`), at least 45 on desktop.
- **Scale:** `--text-*` values only. Adjacent heading levels differ by at
  least 1.2×.
- **Weights:** 400 and 500; 600 only for short admin UI labels; 300 only for
  large numbers (≥ 36 px).
- **Labels:** 11 px capitals (`--manual-label-size`), 8 % tracking
  (`--manual-label-tracking`), muted colour. Capitals never run over one line.
- **Numbers in data** (colour values, dimensions, tables, statistics):
  `font-variant-numeric: tabular-nums`.
- **Characters:** the quotation marks and dashes of the content language
  (Czech „…“, English “…”), an en dash –, a non-breaking space between a
  number and its unit, × for dimensions. No ASCII arrows `->`.
- Bold only for emphasis in running text, never together with italics.

## Colour

- Surfaces: `--manual-paper` / `--color-bg`, and `--manual-stage` only under
  brand material (images, logos, swatches, specimens).
- **Brand accent** (`--manual-brand`, `--color-accent`): primary action, active
  state, focus, data line. Never a surface fill or a heading colour.
- **States** (info, success, warning, error): a 1 px rule, an icon or a label
  only. Never a tinted surface.
- **Only violations are coloured** (a "don't", a bad example, a failed contrast
  check). The correct state is ink.

## Shape and depth

- **One corner radius:** `--manual-radius` (set in the admin) / `--radius`.
  No pills (`--radius-full` only for round elements: avatar, dot).
- **1 px rules.** A heavier rule only as `--manual-border-strong` under a table
  header or above a quotation.
- **Depth:** shadows only on floating layers (menu, dialog, tooltip, toast).
  Border + background + shadow on one element is always wrong.

## Components — one per need

| Need | The only solution |
|---|---|
| switching views | underlined text tabs |
| primary action | solid button in ink (admin: brand accent) |
| secondary action | hairline button |
| list of items, files, links | rows separated by rules |
| notice | 1 px left rule in the state colour + icon |
| showing brand material | stage (`--manual-stage`) with the corner radius |
| specification (dimensions, parameters) | label above value, in a row, above a rule |
| row data | borderless table, heavier rule under the header |

## Icons

- Set: **Google Material Symbols, Outlined, weight 400** (matches the 500 text
  weight), only through `$lib/icons` (mapping in `app/scripts/icon-map.json`).
- Sizes 16 / 20 / 24 px. An icon inside text = font size × 1.15.
- An icon accompanies text only when it adds meaning (file type, direction,
  state). Never an icon plus the same information as text (arrow + "→").
- An icon without text needs an `aria-label` or `title`.

## Accessibility (WCAG 2.2 AA)

- Text contrast ≥ 4.5 : 1 (large text ≥ 3 : 1), UI elements and icons ≥ 3 : 1.
- Click targets ≥ 24 × 24 px.
- Visible focus (2 px outline in the accent), never hidden by a sticky bar.
- State is never conveyed by colour alone — always also by an icon or a word.

## Motion

- Durations 120 / 180 / 280 ms (`--dur-*`), easing `--ease`.
- Hover changes colour or a rule, not position (no cards jumping up).
- No infinite animation (pulses, blinking).

## Audit

The codex is checked by measuring rendered pages, not by reading code:

- **Public manual:** `node scripts/design-audit/run.mjs http://localhost:5173 design-audit.md`
  (run in `app/`; visits every page in light and dark mode at 1440 and 390 px
  and writes grouped findings).
- **Admin** needs a signed-in session: run the contents of
  `scripts/design-audit/core.js` in the console of a signed-in browser (returns
  `{ findings }` for the current page).
- **Off-grid spacing** is fixed by `python3 scripts/design-audit/snap-spacing.py <files>`
  (rounds gap/margin/padding to multiples of 4 px; leaves clamp/calc/var alone).

Audit rules: `gap-off-grid`, `double-rule`, `empty-box`, `triple-chrome`,
`contrast`, `target-size`, `measure`, `leading`, `duplicate-signal`,
`typography`, `pill`, `type-off-scale`, `heading-order`, `unnamed-control`.
Brand material (block inline styles, specimens, previews) is exempt from the
UI rules.
