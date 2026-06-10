import { describe, it, expect } from 'vitest'
import { createPracticeSquadPlayer, PRACTICE_SQUAD_RATING, PRACTICE_SQUAD_ID_PREFIX } from './practiceSquad'

describe('createPracticeSquadPlayer', () => {
  it('returns a player rated 60 with the Practice Squad name', () => {
    const player = createPracticeSquadPlayer('QB')
    expect(player.rating).toBe(PRACTICE_SQUAD_RATING)
    expect(player.name).toBe('Practice Squad')
  })

  it('uses an id starting with the practice-squad prefix', () => {
    const player = createPracticeSquadPlayer('WR')
    expect(player.id.startsWith(PRACTICE_SQUAD_ID_PREFIX)).toBe(true)
  })

  it.each(['QB', 'WR', 'RB', 'K'] as const)('returns %s stats matching the requested position', (position) => {
    const player = createPracticeSquadPlayer(position)
    expect(player.position).toBe(position)
    expect(player.stats).toBeDefined()
  })
})
