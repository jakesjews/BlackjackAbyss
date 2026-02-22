# Controls and Modes

## Control Model

Controls are mode-driven. Keyboard shortcuts and action tray buttons map to the same runtime actions through runtime APIs.

## Keyboard Reference

- `Enter`: start run, confirm, deal/continue, restart (mode dependent)
- `R`: resume from menu
- `A` or `Z`: hit
- `B` or `X`: stand
- `C` or `Space`: double down (`Space` buys in shop)
- `S`: split (when legal)
- `Left` / `Right`: selection in reward/shop
- `F`: toggle fullscreen
- `Esc`: close overlays, exit collection, or exit fullscreen
- `M`: toggle audio (BGM + SFX master enable)

## Mode Matrix

| Mode | Keyboard Behavior | Action Tray Behavior | Notes |
|---|---|---|---|
| `menu` | `Enter` start, `R` resume, `A` collections | `Resume`, `New Run`, `Collections` | Resume only enabled when saved run exists |
| `collection` | `Enter`/`Space`/`A`/`R` back | Back-style confirm action | Overlay-style browsing mode |
| `playing` intro | Wait for dialogue, then `Enter`/`Space` continue | `Continue` | Intro gate blocks combat actions until ready |
| `playing` deal gate | `Enter` to deal | `Deal` | Used between hands / after resolution |
| `playing` action phase | `A/Z` hit, `B/X` stand, `C/Space` double, `S` split | `Hit`, `Stand`, `Double`, optional `Split` | Split only when legal; double when legal |
| `reward` | `Left`/`Right` select, `Enter`/`Space` claim | Selection + `Claim` | Claim advances run mode |
| `shop` | `Left`/`Right` select, `Space` buy, `Enter` continue | `Prev`/`Next`, `Buy`, `Continue` | Buy gating depends on chips/purchase lock |
| `gameover` / `victory` | `Enter` new run | `New Run` | End-state overlay flow |

## Runtime Action Surface

Runtime text snapshots expose mode/action hints (for tools and automation) through:

- `window.render_game_to_text()`
- `actions` field in the returned JSON payload

Current action text examples include:

- `enter(start)`, `r(resume)`, `a(collections)` in menu
- `z(hit)`, `x(stand)`, `c(double)`, `s(split)` in playing action phase
- `left(prev)`, `right(next)`, `enter(claim)` in reward
- `left(prev)`, `right(next)`, `space(buy)`, `enter(continue)` in shop
