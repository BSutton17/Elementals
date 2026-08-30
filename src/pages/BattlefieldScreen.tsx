import { BattlefieldView } from '../components/BattlefieldView'
import { HackOverlay } from '../components/HackOverlay'
import { FogOverlay } from '../components/FogOverlay'
import { BlizzardOverlay } from '../components/BlizzardOverlay'
import { ScrambleOverlay } from '../components/scramble/ScrambleOverlay'
import { FatherTimeOverlay } from '../components/fatherTime/FatherTimeOverlay'
import { BlipOverlay } from '../components/blip/BlipOverlay'
import { BackToTheFutureOverlay } from '../components/backToTheFuture/BackToTheFutureOverlay'
import { DarkenedOverlay } from '../components/DarkenedOverlay'
import { FlashBangOverlay } from '../components/FlashBangOverlay'
import { InfectedOverlay } from '../components/InfectedOverlay'
import { YinYangOverlay } from '../components/YinYangOverlay'
import { KitsuneRushOverlay } from '../components/kitsuneRush/KitsuneRushOverlay'
import { CrawlerSwarm } from '../components/crawlers/CrawlerSwarm'
import { squashCrawler } from '../game/matchStore'
import { CasinoStage } from '../components/casino/CasinoStage'
import { useWatchedVictim } from '../game/spectatorFocus'
import { RouletteMirror, type MirrorSpin } from '../components/roulette/RouletteMirror'
import { useLobby } from '../game/useLobby'
import { useGameState } from '../game/useGameState'

/** How long a finished wheel stays on Joker's side-screen before clearing. */
const MIRROR_LINGER_SECONDS = 3
/** Fallback tick rate before the match config arrives. */
const DEFAULT_TICK_RATE = 20

/** Battlefield container: joins the lobby roster with the live synchronized
 *  gameplay state and hands both to the renderer (tickets #192–#199). */
export function BattlefieldScreen() {
  const { match, youId } = useLobby()
  const game = useGameState()

  // ⚠️ BEFORE ANY EARLY RETURN. A spectator watches one player for the effects
  // that key off "are YOU afflicted", and the pick has to be made on every
  // render or the hook order changes between the spectator and player branches.
  const gassedPlayers = game.players
    .filter((p) => p.statuses?.some((s) => s.id === 'toxicGas'))
    .map((p) => p.id)
  const casinoPlayers = game.players
    .filter((p) => p.pendingSpin != null || p.pendingBet != null)
    .map((p) => p.id)
  const watchedGassed = useWatchedVictim(gassedPlayers)
  const watchedCasino = useWatchedVictim(casinoPlayers)

  if (!match) return null
  // Spectators watch the full battlefield with no UI: no controls and none of
  // the victim-only screen overlays (they have no castle to be afflicted).
  const spectator = match.players.find((p) => p.id === youId)?.spectator === true
  if (spectator) {
    // A spectator sees the effects that are ABOUT THE FIELD, and not the ones
    // that are about a private hand.
    //
    // Blizzard is already global — the storm covers every screen for as long as
    // any kingdom carries it — so it needs no victim at all. Toxic Gas and the
    // casino are victim-scoped, so one afflicted player is watched at a time
    // (see `useWatchedVictim` for why the pick is held rather than re-rolled).
    //
    // Blackjack is deliberately NOT here: the draw is the caster's own hand and
    // watching it from outside gives away a card nobody at the table has seen.
    // `BattlefieldView` gates the reveal on the same `spectator` flag.
    const watched = game.players.find((p) => p.id === watchedCasino)
    return (
      <>
        <BattlefieldView
          match={match}
          youId={youId}
          players={game.players}
          tick={game.tick}
          volcano={game.volcano}
          monster={game.monster}
          caprice={game.caprice}
          centrepiece={game.centrepiece}
          spectator
        />
        <FogOverlay active={watchedGassed !== null} variant="toxic" />
        <BlizzardOverlay
          active={game.players.some((p) => p.statuses?.some((s) => s.id === 'blizzard'))}
        />
        <CasinoStage
          debt={{ spinAt: watched?.pendingSpin?.atTick, betAt: watched?.pendingBet?.atTick }}
        />
      </>
    )
  }
  // Thick Fog blinds only its victim: the local player carries the `vision:fog`
  // status (synced state) → their own screen fogs over. Nature's Toxic Gas
  // (status `toxicGas`) does the same in green, and each lasts its own duration.
  const you = game.players.find((p) => p.id === youId)
  const fogged = you?.statuses?.some((s) => s.id === 'vision:fog') ?? false
  const gassed = you?.statuses?.some((s) => s.id === 'toxicGas') ?? false
  // Magma's Smoke Screen (`smokeScreen`) blinds everyone who was aiming at
  // Magma. Deliberately the same wall as Thick Fog — same blindness, same
  // treatment — just in volcanic grey.
  const smoked = you?.statuses?.some((s) => s.id === 'smokeScreen') ?? false
  // Time's Half Past 12 scrambles ONLY its victim's interface (status
  // `scrambled`) for its duration — a local, cosmetic temporal-instability layer.
  const scrambled = you?.statuses?.some((s) => s.id === 'scrambled') ?? false
  // Time's Father Time marks its victim (`fatherTimeMark`): the pressure overlay
  // hovers a counting clock and escalates until they attack or the mark ends.
  const fatherTimeMarked = you?.statuses?.some((s) => s.id === 'fatherTimeMark') ?? false
  // Time's Back to the Future (`goldRewind`): a giant backward clock while the
  // victim's treasury is being rewound.
  const goldRewinding = you?.statuses?.some((s) => s.id === 'goldRewind') ?? false
  // Blizzard is a GLOBAL weather event: the storm covers every player's screen
  // for as long as any kingdom carries the `blizzard` status.
  const blizzard = game.players.some((p) => p.statuses?.some((s) => s.id === 'blizzard'))
  // Dark's "Night terrors" passive (`darkened`): attacking Dark can plunge the
  // ATTACKER's own screen into darkness for a few seconds.
  const darkened = you?.statuses?.some((s) => s.id === 'darkened') ?? false
  // Kitsune Rush (`kitsuneRush`): foxfire tears across the CASTER's own screen
  // while the Rush runs. Their buff, their screen - everyone else just sees the
  // ring of foxes lapping the Kitsune castle.
  const rushing = you?.statuses?.some((s) => s.id === 'kitsuneRush') ?? false
  // Insects' Creepy Crawlers: the bugs and their hit counts are authoritative
  // synced state, so the overlay draws exactly what the server says is left.
  const crawlers = you?.statuses?.find((s) => s.id === 'creepyCrawlers')
  // Insects' Infected (`infected`): the victim's screen goes soft and swims for
  // the duration. Their own fumbled attacks are rebounding onto them, and this
  // is what being the cause of that feels like.
  const infected = you?.statuses?.some((s) => s.id === 'infected') ?? false
  // Dark's Yin and Yang (`yinYang`): the taijitu turns on the victim's screen
  // for the wager's duration. Deliberately says nothing — not knowing which
  // side was called is the entire ability.
  const wagered = you?.statuses?.some((s) => s.id === 'yinYang') ?? false
  // Joker's casino. Both games freeze gold production until they're dealt with,
  // and only ONE is ever on screen at a time: whichever arrived first plays out
  // in full — cinematic included — and the other waits (see CasinoStage).
  const casinoDebt = {
    spinAt: you?.pendingSpin?.atTick,
    betAt: you?.pendingBet?.atTick,
  }

  // Joker watches every wheel it has running from the side of the screen: who
  // is betting, the same spin they see, and the result once the ball settles.
  // Each card then lingers MIRROR_LINGER_SECONDS past the reveal so the result
  // can be read, and clears itself — `lastBet` is never wiped server-side, so
  // without this the wheels would pile up on Joker's screen for the whole match.
  const tickRate = match.config?.tickRate ?? DEFAULT_TICK_RATE
  const mirrorLingerTicks = MIRROR_LINGER_SECONDS * tickRate
  const jokerMirror: MirrorSpin[] =
    you?.kingdomId === 'joker'
      ? game.players
          .filter(
            (p) =>
              p.id !== you.id &&
              (p.pendingBet != null ||
                (p.lastBet != null &&
                  game.tick < p.lastBet.revealTick + mirrorLingerTicks)),
          )
          .map((p) => {
            const name = match.players.find((m) => m.id === p.id)?.name ?? p.name
            // Still deciding — no wheel yet.
            if (p.pendingBet) {
              return { playerName: name, bet: null, pocket: null, color: null, result: null }
            }
            const last = p.lastBet!
            const settled = game.tick >= last.revealTick
            return {
              playerName: name,
              bet: last.bet,
              pocket: last.pocket,
              color: last.color,
              // Joker is watching someone ELSE's wheel, so it reads the
              // third-person verdict — never "you" about another kingdom.
              result: settled ? (last.publicOutcome ?? last.outcome) : null,
            }
          })
      : []
  return (
    <>
      <BattlefieldView
        match={match}
        youId={youId}
        players={game.players}
        tick={game.tick}
        volcano={game.volcano}
        caprice={game.caprice}
        centrepiece={game.centrepiece}
      />
      {/* Full-screen "you've been hacked" flash for the local victim. */}
      <HackOverlay youId={youId} />
      {/* Full-screen haze while the local player is blinded by Thick Fog (grey)
          or choking in Nature's Toxic Gas (green) — independent, own durations. */}
      <FogOverlay active={fogged} />
      <FogOverlay active={gassed} variant="toxic" />
      <FogOverlay active={smoked} variant="smoke" />
      {/* Global arctic storm — every screen, whenever a Blizzard is raging. */}
      <BlizzardOverlay active={blizzard} />
      {/* Victim-only temporal scramble while Half Past 12's `scrambled` holds. */}
      <ScrambleOverlay active={scrambled} />
      {/* Victim-only Father Time pressure while `fatherTimeMark` holds. */}
      <FatherTimeOverlay active={fatherTimeMarked} youId={youId} />
      {/* Blip! rewind flourish when the local Time kingdom undoes an attack. */}
      <BlipOverlay youId={youId} />
      {/* Back to the Future: giant backward clock while your gold is rewound. */}
      <BackToTheFutureOverlay active={goldRewinding} />
      {/* Night Terrors: your own screen goes dark for provoking Dark. */}
      <DarkenedOverlay active={darkened} />
      {/* Flash Bang blinds every screen but the caster's — Light looked away. */}
      <FlashBangOverlay youId={youId} />
      {/* Yin and Yang: a slowly turning taijitu while the wager is live. */}
      <YinYangOverlay active={wagered} />
      <KitsuneRushOverlay active={rushing} />
      {/* Insects' Infected: the victim's screen blurs and swims while every
          attack they fumble is rebounding into their own castle. */}
      <InfectedOverlay active={infected} />
      {/* Insects' Creepy Crawlers, on the victim's own screen. Above every
          other layer: being in the way is the ability. */}
      <CrawlerSwarm
        bugHits={crawlers?.bugHits ?? null}
        hitsToKill={crawlers?.hitsToKill ?? 2}
        onSquash={(i) => void squashCrawler(i)}
      />
      {/* Joker's casino: one game at a time, the next waiting its turn. */}
      <CasinoStage debt={casinoDebt} />
      {/* Joker only: a side-screen mirror of every wheel it has spinning. */}
      <RouletteMirror spins={jokerMirror} />
    </>
  )
}
