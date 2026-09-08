# Kingdoms — Client

The browser client for Kingdoms: a real-time, free-for-all party game for 2–7
players (plus spectators, to 8 seats), **designed for phones first**.

React 19 + TypeScript + Vite, talking to the authoritative server over
Socket.IO. This app **renders and sends intents; it never decides gameplay.**
Damage, economy, cooldowns, and win conditions are all the server's.

## Running it

```bash
npm install
npm run dev        # vite dev server
npm run build      # tsc -b && vite build
npm test           # vitest
npm run lint
```

Connects to `http://localhost:3001` in dev; override with `VITE_SERVER_URL`.
The server must be running, and outside dev it needs `CLIENT_ORIGIN` set to this
app's origin.

> **Standing rule:** run the build **and** the tests for every repo a change
> touches before calling that change done.

## Layout

| Folder | Responsibility |
|--------|----------------|
| `src/sockets/` | The shared Socket.IO connection and its lifecycle |
| `src/game/` | State mirror, stores, lobby, placement geometry, tutorial sandbox |
| `src/components/` | HUD, battlefield, and the per-ability overlay components |
| `src/pages/` | Screens: startup, join, lobby, battlefield, game over, how-to-play |
| `src/render/` | The visual-effects framework — see `src/render/HANDOFF.md` |
| `src/styles/` | Global styles and design tokens |

Each folder carries its own README. `pixi/`, `services/`, and `hooks/` are
**empty** — their READMEs say where that code actually went.

## Mobile is the primary target

Not a nice-to-have. It shapes what belongs in the UI:

- **Every action is a tap** on a card or a castle. There is no movement, no
  aiming, no dragging, and no mechanic that rewards fast repeated tapping.
- **Hover is a desktop convenience and must never be the only route to
  information.** Touch browsers synthesize `mouseenter` on tap but not the
  matching `mouseleave`; anything opened on hover needs an explicit way to
  close. See the outside-tap dismissal in `components/AbilityButton.tsx`.
- **Global touch tuning lives in `styles/index.css`** (`touch-action:
  manipulation` to drop the ~300 ms double-tap delay, and a transparent tap
  highlight). Keep new interactive surfaces inside those selectors.
- **Screen space is scarce.** Overlay effects cover the HUD by design; check a
  new one against a real phone in both orientations, not just a narrow desktop
  window.

## Keeping phones cool

Phones were getting hot enough to notice. The work that fixed it is easy to undo
by accident, so:

- **Per-device settings live in `game/displaySettings.ts`** and are set from the
  profile screen (`components/DeviceSettings.tsx`): a **battery saver** switch
  (`styles/batterySaver.css` drops the expensive effects) and a **network
  cadence** choice (how often this device asks for state). They are per device,
  not per account — the phone that is overheating is the one that should turn
  them down.
- **`React.memo` comparators must compare every field the component draws.** A
  comparator that forgets one does not render slightly wrong; it stops updating
  that thing entirely, forever, with no error. `KingdomSite.memo.test.tsx` guards
  this by scanning the source, and it is the reason that guard exists.
- **Keep event handlers stable** (the "latest ref" pattern — a `useCallback([])`
  reading a mutable ref) so memoized children can ignore callback identity. A
  handler rebuilt every tick re-renders the whole battlefield.
- Announcements coalesce (200 ms, `game/gameState.ts`) — except during a live
  party minigame, where timing is the game.

## One duplicated file, on purpose

`game/elementalCycle.ts` is a **second copy** of the server's rings. The server
decides all damage; this copy only says *who to expect it from*. If the two
drift, the game keeps playing perfectly while telling the player the wrong thing
about why — much harder to notice than a wrong number. Both repos pin the chain
to an explicit list of pairs in their tests, so editing one side alone fails the
other side's suite.

## Design docs

Canonical at the **workspace root**, shared with the Server repo:
[ARCHITECTURE.md](../ARCHITECTURE.md) (start with §0),
[ABILITY_SYSTEM.md](../ABILITY_SYSTEM.md),
[DATA_MODELS.md](../DATA_MODELS.md),
[GAME_TICK.md](../GAME_TICK.md),
[SOCKET_EVENTS.md](../SOCKET_EVENTS.md).
