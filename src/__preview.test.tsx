import { it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { writeFileSync, mkdirSync } from 'node:fs'
import { CastleSprite } from './components/CastleSprite'
import { getKingdomTheme, getCastleOutline } from './game/kingdomThemes'

// TEMPORARY: renders each skin to a standalone SVG for visual review, then is
// deleted. Not part of the suite.
//
// Renders EVERY reviewed kingdom on each run rather than one at a time — a
// single-kingdom version meant re-pointing the harness (and re-rendering) just
// to correct a typo on an already-published review page.

const OUT =
  'C:/Users/Btpit/AppData/Local/Temp/claude/c--Users-Btpit-OneDrive-Desktop-Coding-Projects-elementals/5666de38-1426-4f91-84e8-81a4a9c173c5/scratchpad/render'

const KINGDOMS: Record<string, { id: string; name: string; paint?: unknown }[]> = {
  water: [
    { id: 'standard', name: 'Standard' },
    {
      id: 'rippled',
      name: 'Rippled Castle',
      paint: { fill: '#2f86c4', accent: '#7fd4ff', outline: '#08263f', decor: 'water.ripples' },
    },
    {
      id: 'coral',
      name: 'Coral Reef Fortress',
      paint: {
        gradient: { from: '#2f9c9a', to: '#14556b' },
        accent: '#7fe6d2',
        outline: '#062b33',
        decor: 'water.coral',
      },
    },
    {
      id: 'frozen',
      name: 'Frozen Harbor',
      paint: {
        gradient: { from: '#a9d8ef', to: '#2f6f9c' },
        accent: '#eaf7ff',
        outline: '#0a2d45',
        strokeScale: 1.1,
        decor: 'water.frozen',
      },
    },
    {
      id: 'leviathan',
      name: 'Leviathan Palace',
      paint: {
        gradient: { from: '#1b5f9e', to: '#06203c' },
        accent: '#7fd4ff',
        outline: '#03101f',
        strokeScale: 1.15,
        decor: 'water.leviathan',
      },
    },
  ],
  fire: [
    { id: 'fire-standard', name: 'Standard' },
    {
      id: 'embers',
      name: 'Ember Stripes',
      paint: { fill: '#d4482a', accent: '#ffb03a', outline: '#3a0c05', decor: 'fire.embers' },
    },
    {
      id: 'foundry',
      name: 'Inferno Foundry',
      paint: {
        gradient: { from: '#5a3a2a', to: '#1c100c' },
        accent: '#ff7a18',
        outline: '#0d0806',
        strokeScale: 1.1,
        decor: 'fire.foundry',
      },
    },
    {
      id: 'phoenix',
      name: 'Phoenix Fortress',
      paint: {
        gradient: { from: '#ff8a3d', to: '#a51e0c' },
        accent: '#ffd76a',
        outline: '#4a0d02',
        decor: 'fire.phoenix',
      },
    },
    {
      id: 'supernova',
      name: 'Supernova Citadel',
      paint: {
        gradient: { from: '#ffb03a', to: '#5c0f00' },
        accent: '#fff3d0',
        outline: '#2a0600',
        strokeScale: 1.15,
        decor: 'fire.supernova',
      },
    },
  ],
  air: [
    { id: 'air-standard', name: 'Standard' },
    {
      id: 'windlines',
      name: 'Wind Lines',
      paint: { fill: '#8fa9e0', accent: '#e8f0ff', outline: '#16233d', decor: 'air.windlines' },
    },
    {
      id: 'skyship',
      name: 'Skyship Fortress',
      paint: {
        gradient: { from: '#c8d6f5', to: '#5b7bb8' },
        accent: '#e8b964',
        outline: '#16233d',
        strokeScale: 1.05,
        decor: 'air.skyship',
      },
    },
    {
      id: 'cloudpalace',
      name: 'Cloud Palace',
      paint: {
        gradient: { from: '#eef4ff', to: '#9dbbe4' },
        accent: '#ffffff',
        outline: '#2a3f68',
        decor: 'air.cloudpalace',
      },
    },
    {
      id: 'stormtitan',
      name: 'Storm Titan',
      paint: {
        gradient: { from: '#4a6499', to: '#101828' },
        accent: '#bfe4ff',
        outline: '#070c16',
        strokeScale: 1.15,
        decor: 'air.stormtitan',
      },
    },
  ],
  ice: [
    { id: 'ice-standard', name: 'Standard' },
    {
      id: 'frost',
      name: 'Frost Patterns',
      paint: { fill: '#7fd4ef', accent: '#eafaff', outline: '#0b2c45', decor: 'ice.frost' },
    },
    {
      id: 'icepalace',
      name: 'Ice Palace',
      paint: {
        gradient: { from: '#bdeeff', to: '#2f7fae' },
        accent: '#eafaff',
        outline: '#0b2c45',
        strokeScale: 1.05,
        decor: 'ice.palace',
      },
    },
    {
      id: 'glacier',
      name: 'Glacier Fortress',
      paint: {
        gradient: { from: '#9fd8ef', to: '#2b6d95' },
        accent: '#eafaff',
        outline: '#0a2438',
        strokeScale: 1.1,
        decor: 'ice.glacier',
      },
    },
    {
      id: 'frozencrown',
      name: 'Frozen Crown',
      paint: {
        gradient: { from: '#7fc9e8', to: '#123a5c' },
        accent: '#eafaff',
        outline: '#06182a',
        strokeScale: 1.15,
        decor: 'ice.crown',
      },
    },
  ],
  electricity: [
    { id: 'elec-standard', name: 'Standard' },
    {
      id: 'circuit',
      name: 'Circuit Castle',
      paint: { fill: '#4a2d7a', accent: '#ffe14a', outline: '#160826', decor: 'electricity.circuit' },
    },
    {
      id: 'powerstation',
      name: 'Power Station',
      paint: {
        gradient: { from: '#6b4a9e', to: '#241234' },
        accent: '#ffe14a',
        outline: '#140820',
        strokeScale: 1.1,
        decor: 'electricity.powerstation',
      },
    },
    {
      id: 'tesla',
      name: 'Tesla Tower',
      paint: {
        gradient: { from: '#7a55b0', to: '#2a1540' },
        accent: '#ffe14a',
        outline: '#150822',
        strokeScale: 1.1,
        decor: 'electricity.tesla',
      },
    },
    {
      id: 'thundergod',
      name: 'Thunder God Citadel',
      paint: {
        gradient: { from: '#5e3d94', to: '#170a26' },
        accent: '#ffe14a',
        outline: '#0d0417',
        strokeScale: 1.15,
        decor: 'electricity.thundergod',
      },
    },
  ],
  nature: [
    { id: 'nature-standard', name: 'Standard' },
    {
      id: 'vine',
      name: 'Vine Castle',
      paint: { fill: '#39754c', accent: '#c9ffb0', outline: '#12301c', decor: 'nature.vine' },
    },
    {
      id: 'treehouse',
      name: 'Treehouse Kingdom',
      paint: {
        gradient: { from: '#7fc98d', to: '#2c5c3c' },
        accent: '#ffe9a8',
        outline: '#10281a',
        strokeScale: 1.1,
        decor: 'nature.treehouse',
      },
    },
    {
      id: 'mushroom',
      name: 'Mushroom Fortress',
      paint: {
        gradient: { from: '#6fae7a', to: '#2b4f38' },
        accent: '#f0e7d2',
        outline: '#12281c',
        strokeScale: 1.05,
        decor: 'nature.mushroom',
      },
    },
    {
      id: 'worldtree',
      name: 'World Tree',
      paint: {
        gradient: { from: '#4e8b5f', to: '#16301f' },
        accent: '#c8ffb0',
        outline: '#0a1c12',
        strokeScale: 1.15,
        decor: 'nature.worldtree',
      },
    },
  ],
}

it('renders skin previews', () => {
  mkdirSync(OUT, { recursive: true })

  for (const [kingdomId, skins] of Object.entries(KINGDOMS)) {
    const theme = getKingdomTheme(kingdomId)!
    const outline = getCastleOutline(kingdomId)
    const sprite = (paint: unknown) =>
      renderToStaticMarkup(
        <CastleSprite color={theme.primary} outline={outline} paint={paint as never} />,
      )

    for (const skin of skins) {
      writeFileSync(
        `${OUT}/${skin.id}.svg`,
        `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="440" viewBox="-92 -128 184 172">` +
          `<rect x="-92" y="-128" width="184" height="172" fill="#0b0e17"/>` +
          sprite(skin.paint) +
          `</svg>`,
      )
    }

    const tiles = skins
      .map(
        (skin, i) =>
          `<g transform="translate(${i * 150 + 75} 118) scale(0.52)">${sprite(skin.paint)}</g>` +
          `<text x="${i * 150 + 75}" y="185" fill="#e8ecf5" font-family="system-ui" font-size="13" text-anchor="middle">${skin.name}</text>`,
      )
      .join('')

    writeFileSync(
      `${OUT}/sheet-${kingdomId}.svg`,
      `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="400" viewBox="0 0 750 200">` +
        `<rect width="750" height="200" fill="#0b0e17"/>${tiles}</svg>`,
    )
  }
})
