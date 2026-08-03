import { describe, it, expect } from 'vitest'
import { luminanceOf, needsOutline, inkFor, accentFor, outlineFor } from './contrast'
import { KINGDOMS } from './kingdoms'

// Dark's colour is #12121a. On a dark UI that is very nearly the background, so
// its swatches, tabs and orbs need a white ring and a swapped-out icon colour.
// These are derived from luminance rather than from the id, so the rule keeps
// working if a kingdom's colour changes or a new near-black one is added.

describe('kingdom colour contrast', () => {
  it('spots the colours that would vanish against the dark UI', () => {
    expect(needsOutline('#12121a')).toBe(true) // Dark
    expect(needsOutline('#f7f7f2')).toBe(false) // Light
    expect(needsOutline('#4aa3ff')).toBe(false) // Water
    expect(needsOutline('#e02434')).toBe(false) // Joker
  })

  it('gives exactly one kingdom an outline today — Dark', () => {
    const ringed = KINGDOMS.filter((k) => needsOutline(k.color)).map((k) => k.id)
    expect(ringed).toEqual(['dark'])
  })

  it('rings only the kingdoms that need it', () => {
    expect(outlineFor('#12121a')).toBe('#f7f7f2')
    expect(outlineFor('#4aa3ff')).toBe('transparent')
  })

  it('swaps a near-black accent for white, and leaves the rest alone', () => {
    expect(accentFor('#12121a')).toBe('#f7f7f2')
    expect(accentFor('#4aa3ff')).toBe('#4aa3ff')
  })

  it('picks an ink that contrasts with the swatch it sits on', () => {
    expect(inkFor('#f7f7f2')).toBe('#0b0e17') // dark ink on the pale kingdom
    expect(inkFor('#12121a')).toBe('#f7f7f2') // pale ink on the dark one
  })

  it('reads luminance sanely, including 3-digit hex and junk', () => {
    expect(luminanceOf('#000000')).toBe(0)
    expect(luminanceOf('#ffffff')).toBe(1)
    expect(luminanceOf('#fff')).toBe(1)
    // Unparseable input must not silently mark a colour as needing a ring.
    expect(needsOutline('not-a-colour')).toBe(false)
  })
})
