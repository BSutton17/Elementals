import { useEffect, useMemo, useState } from 'react'
import {
  buyItem,
  equipItem,
  fetchProfile,
  fetchShop,
  isSignedIn,
  type CosmeticItem,
  type ShopView,
} from '../game/auth'
import { getKingdomTheme } from '../game/kingdomThemes'
import { ItemCard, type OwnState } from '../components/shop/ItemCard'
import { ItemDetail } from '../components/shop/ItemDetail'
import './AccountPage.css'
import '../components/shop/Shop.css'

/**
 * The item shop.
 *
 * Featured and Daily are TABS, not routes: two views of one place, so a back
 * gesture inside the shop leaves the shop rather than stepping between its
 * sections.
 *
 * A grid with a detail panel beside it on desktop and beneath it on a phone.
 * Selecting is separate from buying — the card opens the detail, the detail
 * buys — so nothing can be purchased by a mis-tap while scrolling.
 */

type Tab = 'featured' | 'daily'

const TABS: { id: Tab; label: string; blurb: string }[] = [
  {
    id: 'featured',
    label: 'Featured',
    blurb: 'Refreshes daily. The only place legendary skins appear.',
  },
  {
    id: 'daily',
    label: 'Daily',
    blurb: 'Every uncommon skin, plus one rare per kingdom. Rares rotate weekly.',
  },
]

/** "4h 12m" — a countdown people read, not a timestamp. */
function untilReset(iso: string): string | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (!Number.isFinite(ms) || ms <= 0) return null
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

type Load = 'loading' | 'ready' | 'error'

/** Best tier first, so the answer to "what is good today" is at the top. */
const RARITY_ORDER = ['legendary', 'rare', 'uncommon', 'common'] as const

/** Rarity, written out — the heading carries it, not the colour. */
const RARITY_LABEL: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
}

export function StoreScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('featured')
  const [load, setLoad] = useState<Load>('loading')
  const [shop, setShop] = useState<ShopView | null>(null)
  const [equippedIds, setEquippedIds] = useState<Set<string>>(new Set())
  const [kingdom, setKingdom] = useState<string>('all')
  const [selected, setSelected] = useState<CosmeticItem | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void (async () => {
      const [view, profile] = await Promise.all([
        fetchShop(),
        isSignedIn() ? fetchProfile() : Promise.resolve(null),
      ])
      if (!live) return
      if (!view) {
        setLoad('error')
        return
      }
      setShop(view)
      // What is already worn, so a card can say "Equipped" rather than offering
      // to equip something that already is.
      if (profile?.loadout) {
        const worn = new Set<string>()
        for (const slots of Object.values(profile.loadout)) {
          for (const id of Object.values(slots ?? {})) if (id) worn.add(id)
        }
        setEquippedIds(worn)
      }
      setLoad('ready')
    })()
    return () => {
      live = false
    }
  }, [])

  const items = shop ? (tab === 'featured' ? shop.featured : shop.daily) : []

  /** Kingdoms present in this tab, so the filter never offers an empty one. */
  const kingdoms = useMemo(() => {
    const ids = new Set(items.map((i) => i.kingdomId).filter(Boolean) as string[])
    return [...ids].sort()
  }, [items])

  const shown = kingdom === 'all' ? items : items.filter((i) => i.kingdomId === kingdom)

  /**
   * Daily is grouped by RARITY; Featured is not.
   *
   * Daily carries every uncommon plus one rare per kingdom — around fifty
   * items, where the first question is "what is actually good today". Rarity
   * answers that; a flat grid makes you scan for it. Featured is four items and
   * needs no headings.
   *
   * Best first, and within a tier ordered by kingdom so the grid is stable
   * between visits rather than reshuffling.
   */
  const grouped = useMemo(() => {
    if (tab !== 'daily') return null
    const buckets = new Map<string, CosmeticItem[]>()
    for (const item of shown) {
      buckets.set(item.rarity, [...(buckets.get(item.rarity) ?? []), item])
    }
    return RARITY_ORDER.filter((r) => buckets.has(r)).map((rarity) => ({
      rarity,
      items: [...buckets.get(rarity)!].sort((a, b) =>
        (a.kingdomId ?? '').localeCompare(b.kingdomId ?? ''),
      ),
    }))
  }, [tab, shown])

  const stateOf = (item: CosmeticItem): OwnState => {
    if (equippedIds.has(item.id)) return 'equipped'
    if (shop?.owned.includes(item.id)) return 'owned'
    if (item.requiresMastery) return 'locked'
    if (shop?.balance != null && shop.balance < item.price) return 'unaffordable'
    return 'buyable'
  }

  const handleBuy = async () => {
    if (!selected) return
    setBusy(true)
    setError(null)
    const result = await buyItem(selected.id)
    setBusy(false)
    if (!result.ok) {
      setError(result.message ?? 'Could not buy that.')
      return
    }
    if (shop && result.balance !== undefined) {
      setShop({ ...shop, balance: result.balance, owned: [...shop.owned, selected.id] })
    }
    setToast(`${selected.name} purchased`)
  }

  const handleEquip = async () => {
    if (!selected?.kingdomId) return
    setBusy(true)
    setError(null)
    const result = await equipItem(selected.kingdomId, selected.id)
    setBusy(false)
    if (!result.ok) {
      setError(result.message ?? 'Could not equip that.')
      return
    }
    // One item per kingdom per slot: drop whatever that pair was wearing.
    const next = new Set(equippedIds)
    for (const other of items) {
      if (other.kingdomId === selected.kingdomId && other.slot === selected.slot) {
        next.delete(other.id)
      }
    }
    next.add(selected.id)
    setEquippedIds(next)
    setToast(`${selected.name} equipped`)
  }

  const countdown = shop ? untilReset(shop.resetsAt) : null

  return (
    <main className="account">
      <header className="account__bar">
        <button type="button" className="account__back" onClick={onBack}>
          ← Menu
        </button>
        <h1 className="account__title">Shop</h1>
        {shop?.balance != null && (
          <span className="coin-balance" aria-label={`${shop.balance} coins`}>
            <span className="coin-balance__value">{shop.balance.toLocaleString()}</span>
            <span className="coin-balance__unit">coins</span>
          </span>
        )}
      </header>

      <nav className="store-tabs" aria-label="Shop sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`store-tab${tab === t.id ? ' store-tab--active' : ''}`}
            onClick={() => {
              setTab(t.id)
              setSelected(null)
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="shop">
        <div className="shop__main">
          <p className="store-blurb">
            {TABS.find((t) => t.id === tab)!.blurb}
            {countdown && (
              <span className="store-blurb__timer"> Resets in {countdown}.</span>
            )}
          </p>

          {load === 'loading' && (
            <div className="shop__grid" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div className="item item--ghost" key={i} />
              ))}
            </div>
          )}

          {load === 'error' && (
            <div className="account__empty">
              <p className="account__empty-title">Could not load the shop</p>
              <p className="account__empty-text">
                The server did not answer. Nothing has been charged — try again in a
                moment.
              </p>
              <button
                type="button"
                className="account-btn"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          )}

          {load === 'ready' && (
            <>
              {kingdoms.length > 1 && (
                <div className="shop__filter" role="group" aria-label="Filter by kingdom">
                  <button
                    type="button"
                    className={`chip${kingdom === 'all' ? ' chip--on' : ''}`}
                    aria-pressed={kingdom === 'all'}
                    onClick={() => setKingdom('all')}
                  >
                    All
                  </button>
                  {kingdoms.map((id) => {
                    const theme = getKingdomTheme(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`chip${kingdom === id ? ' chip--on' : ''}`}
                        aria-pressed={kingdom === id}
                        onClick={() => setKingdom(id)}
                      >
                        <span
                          className="chip__dot"
                          style={{ background: theme?.primary ?? '#6b7385' }}
                          aria-hidden="true"
                        />
                        {theme?.name ?? id}
                      </button>
                    )
                  })}
                </div>
              )}

              {shown.length === 0 ? (
                <div className="account__empty">
                  <p className="account__empty-title">
                    {items.length === 0
                      ? 'Nothing on the shelves yet'
                      : 'Nothing here for that kingdom'}
                  </p>
                  <p className="account__empty-text">
                    {items.length === 0
                      ? 'Skins are being made. Coins are already being earned — they will have something to buy soon.'
                      : 'Try another kingdom, or the other tab.'}
                  </p>
                  {items.length > 0 && (
                    <button
                      type="button"
                      className="account-btn"
                      onClick={() => setKingdom('all')}
                    >
                      Show all kingdoms
                    </button>
                  )}
                </div>
              ) : grouped ? (
                grouped.map((group) => (
                  <section className="shop__group" key={group.rarity}>
                    <h2 className="shop__group-title" data-rarity={group.rarity}>
                      {RARITY_LABEL[group.rarity]}
                      <span className="shop__group-count">{group.items.length}</span>
                    </h2>
                    <div className="shop__grid">
                      {group.items.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          state={stateOf(item)}
                          selected={selected?.id === item.id}
                          onSelect={() => {
                            setSelected(item)
                            setError(null)
                          }}
                        />
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className="shop__grid">
                  {shown.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      state={stateOf(item)}
                      selected={selected?.id === item.id}
                      onSelect={() => {
                        setSelected(item)
                        setError(null)
                      }}
                    />
                  ))}
                </div>
              )}

              {shop && !shop.signedIn && items.length > 0 && (
                <p className="shop__guest">
                  Sign in from the menu to earn coins and keep what you unlock.
                </p>
              )}
            </>
          )}
        </div>

        {selected && (
          <ItemDetail
            item={selected}
            state={stateOf(selected)}
            balance={shop?.balance ?? null}
            busy={busy}
            error={error}
            onBuy={() => void handleBuy()}
            onEquip={() => void handleEquip()}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      {toast && (
        <output className="shop__toast" onAnimationEnd={() => setToast(null)}>
          {toast}
        </output>
      )}
    </main>
  )
}
