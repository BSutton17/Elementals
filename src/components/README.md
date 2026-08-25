# components — UI & Battlefield Components

React components for everything the player sees during a match: the HUD, the
battlefield, and the per-ability overlay effects.

- **HUD** — `AbilityBar`, `AbilityButton`, `ShopOverlay`, `HealthBar`,
  `ShieldBar`, `IncomeDisplay`, `CitizenDisplay`, `PerkChips`, and the
  kingdom-specific meters (`RageMeter`, `MemoryMeter`, `SupernovaMeter`)
- **Battlefield** — `BattlefieldView`, `KingdomSite`, `CastleSprite`,
  `TargetIndicator`, `FloatingNumbers`
- **Ability overlays** — one component (or folder) per effect that takes over
  part of the screen: fog, blizzard, darkness, infection, scramble, the casino
  (`cards/`, `roulette/`, `slotMachine/`), crawlers, volcano, and the rest
- **Lobby & tutorial** — `LobbyView`, `RoomCode`, `PublicLobby`, `tutorial/`

Presentational and composable: no networking here, and **no gameplay decisions
ever** — the server is authoritative. Screen-level composition lives in
`../pages/`; the particle/animation framework lives in `../render/`.

## Two things to get right

**Mobile.** Every control is a tap target on a phone. Hover may reveal
information but must never be the only way to reach it, and anything opened on
hover needs an explicit dismissal — touch browsers synthesize `mouseenter` on
tap but not the matching `mouseleave`. `AbilityButton.tsx` shows the pattern
(outside-tap + pointercancel + blur).

**Overlays are victim-scoped by default.** Most screen effects belong to the one
player carrying the status; a few (Blizzard) are global weather. Spectators see
the effects that are about the *field* and not the ones about a private hand —
`BattlefieldScreen.tsx` documents which is which and why.
