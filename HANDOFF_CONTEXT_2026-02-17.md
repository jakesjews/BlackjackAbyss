# Blackjack Abyss - Chat Context Handoff (2026-02-17)

This document summarizes the long UI/UX direction and implementation context from the current chat so a new chat/session can continue with minimal re-explaining.

## 1) Current Repo Snapshot

- Branch: `main`
- Working tree has local edits (not committed):
  - `game.js`
  - `index.html`
  - `styles.css`
- Project stack: browser canvas game (`game.js`) with DOM overlays (`index.html` + `styles.css`), served via Vite.

## 2) Product Direction (What User Wants)

The game should feel like a dark, stylized roguelike blackjack with strong visual polish, especially mobile.

Primary aesthetic target:
- "Don't Starve"-influenced UI styling (sepia/ink/parchment, hand-crafted feel), not neon sci-fi blue.

Primary UX targets:
- Mobile-first responsiveness where needed, but with specific fixed-size/fixed-position constraints on menu art/content.
- Draggable, fluid carousel UX for relic draft and black market.
- Always clear game-state controls and logs.
- Strong feedback: boom/pop messages, attack impacts, SFX/music.

## 3) Major Decisions and Behavior Requirements from Chat

### Controls & Buttons
- Action controls should always be buttons (desktop and mobile).
- Desktop: show keyboard helper text inline in labels (muted, in parentheses style).
- Mobile: no helper text; larger tap targets + larger text.
- Button labels should be uppercase.
- Icon + label should be inline on action buttons.
- Some actions should appear conditionally:
  - `Deal` replaces the bottom action row when waiting for next hand.
  - `Split` appears only when split is valid.
- Attention animation should be a one-time "radar pop" when action appears (not constant glow).

### Messaging / Feedback
- Replace old static text blocks with boom/pop overlay messages.
- Messages should be readable, responsive, and wrap if long.
- Gameplay message overlay should be centered between dealer and player hand blocks.
- Logs modal must exist for current-run history.
  - Oldest at top, newest at bottom.
  - Scroll container should stay focused to newest entries.

### Top Bar / HUD
- Top area should be a single aligned row (no boxed segments look).
- Must include: floor/room, chips, streak/guards, logs button, home button.
- Logs + home are icon buttons in top-right group.
- Tooltips for top bar buttons should be custom (not native title tooltip), desktop only.
- Spacing/alignment should match canvas margins and portrait margins.

### Health/Hands/Portraits
- Enemy and player have portrait + name + HP grouping.
- Hand counts should be below/near hands (not overlapping bars/cards).
- HP bars fixed width (not changing with card count).
- Text on bars should stay readable.
- Enemy and player card stacks + center message should be vertically centered in main gameplay area.

### Passives
- Show passives as small card thumbs near player group.
- Position should remain anchored relative to player portrait/group as browser scales.
- Duplicates show stack count.
- At >=9 passives: show compressed stack/fan summary; click opens passives modal list with counts.

### Carousel Rules (Relic + Black Market)
- Both relic draft and black market should use same carousel interaction model.
- Drag/swipe with fluid motion, snap to nearest item on release.
- Side cards should peek to indicate more items.
- Remove old "tap to select" dependence on mobile; carousel motion is primary.
- Non-selected cards should not be faded out; selected card gets emphasis/shadow.

### Black Market
- Show player chips + HP in modal.
- Buy button is on each card (remove bottom buy action dependency).
- Allow only one black market purchase.
- Continue/leave control uses logout/exit icon.
- Chip icon and number spacing must be consistent everywhere (HUD + modal + card cost pills).

### Home / Menu Screen
- Uses provided splash art image.
- Title and buttons over image; instructions wall removed.
- Content positioning was heavily iterated:
  - Menu content and art frame should remain fixed-size and centered behavior as requested.
  - Canvas can fill viewport, but image/content frame has fixed dimensions and controlled scaling behavior.
- Achievements/Collections menu button behavior and placement were repeatedly adjusted.

## 4) Audio Direction

User wanted rich game audio restored/expanded (music graph + SFX families). Required behaviors discussed:
- WebAudio context unlock flow.
- Global audio enable/mute state + persistence.
- Separate music/sfx buses.
- SFX for deal, actions, impact, outcomes, UI actions.
- Encounter impact/grunt timing tied to animation collisions.
- `grunt.wav` became canonical after filename toggles in thread.

## 5) Animation Direction

- Boom/game messages should slam/pop in quickly.
- Attack/tackle effects between cards and losing portrait with impact particles.
- Critical hits should feel extra dramatic.
- Title/menu has ember-like particle effects (visible, geometric variance, reduced counts/sizes per tuning passes).

## 6) Aesthetic Pass Status (latest)

Latest request in this chat:
- Replace blue canvas + moving vertical bars with Don't-Starve-like equivalents.
- Ensure cards/modals/character frames match this style.

Implemented in `game.js`:
- Background renderer converted from blue neon gradients/beams to sepia-charcoal base with smoky wisps + ash/ember motes.
- Ambient particle motion made organic (sway/drift), less neon.
- Card fronts/backs re-skinned to parchment/ink palette.
- Character portrait frames re-skinned to warm brass/wood tones.
- Encounter intro modal re-skinned.
- Reward carousel + Black Market modal/panels/cards/arrows/badges/pills/buttons recolored to match.
- Collection screen and end overlay recolored.
- Passive thumb generation recolored.
- Rarity glow palette shifted off blue.

Validation run:
- `node --check game.js` passes after changes.

## 7) Key Files and Where to Continue

- `game.js`
  - Core render/update/input/audio logic.
  - Useful functions:
    - `drawBackground()`
    - `drawEncounter()`
    - `drawRewardScreen()`
    - `drawShopScreen()`
    - `drawCollectionScreen()`
    - `drawMenu()` + `drawMenuParticles()`
    - `drawCard()`
    - portrait panel functions (`drawEnemyAvatarPanel`, `drawPlayerAvatarPanel`)
    - top HUD logic (`drawHud`, `hudRowMetrics`)
- `styles.css`
  - DOM overlay styling (menu buttons, top-right icon buttons, logs/collection/passive modals, mobile controls, tooltips, passive rail).
- `index.html`
  - DOM structure: menu home, top-right actions, logs/collection/passive modals, passive rail, mobile controls.

## 8) Hard Constraints / Preferences to Preserve

From repeated user feedback, these are critical:
- Do not casually change desktop menu frame sizing/aspect behavior once stable.
- Keep top bar alignment exact and consistent with page margins.
- Keep logs button genuinely top-right and visible.
- Keep passive rail anchored to player group, not viewport drift.
- Preserve carousel drag fluidity and snap behavior.
- Avoid bringing back instruction text blocks.
- Keep boom overlays readable and centered in hand-vs-hand space.

## 9) If Starting a New Chat, Use This Prompt Core

"Continue Blackjack Abyss UI polish from the Feb 17 2026 handoff. Preserve existing fixed menu frame behavior and top-bar alignment constraints. Focus on remaining visual consistency and responsive edge cases without regressing carousel drag UX, passive anchor positioning, or logs/home top-right controls. Treat game.js render functions and styles.css overlay styles as the primary integration points."

## 10) Optional Immediate Verification Checklist

1. Run app and check menu desktop/mobile for frame sizing and centered content.
2. Start run and verify top bar alignment + logs/home visibility at narrow widths.
3. Verify passive rail remains next to player portrait while resizing.
4. Open relic draft and black market; confirm drag/snap/carousel visuals and readable card text.
5. Trigger hand results; confirm boom/message overlays are centered and readable.
6. Open logs modal and verify chronological flow + bottom-most recent behavior.

