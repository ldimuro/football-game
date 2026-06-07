import { describe, it, expect, vi } from 'vitest'
import { generateWeather } from './weatherGen'

const ALL_CONDITIONS = ['Clear', 'Rain', 'Snow', 'HeavyWind', 'Dome'] as const

describe('generateWeather', () => {
  it('returns a valid weather condition', () => {
    const result = generateWeather()
    expect(ALL_CONDITIONS).toContain(result)
  })

  it('returns Clear when Math.random returns 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(generateWeather()).toBe('Clear')
    vi.restoreAllMocks()
  })

  it('returns Snow when Math.random is near 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    expect(generateWeather()).toBe('Snow')
    vi.restoreAllMocks()
  })

  it('always returns a valid condition across 100 calls', () => {
    for (let i = 0; i < 100; i++) {
      expect(ALL_CONDITIONS).toContain(generateWeather())
    }
  })
})
