import { describe, expect, it } from 'vitest'
import { DEFAULT_BOT_NAMES, MAX_BOT_NAME, botName, normaliseBotName } from '@/lib/spadesBot'

describe('naming a computer seat', () => {
  it('keeps a name it is given', () => {
    expect(normaliseBotName('Marcus', 0)).toBe('Marcus')
  })

  it('falls back to the default rather than leaving a seat nameless', () => {
    // The board addresses these by name — "  is thinking…" reads as a bug, not a blank.
    expect(normaliseBotName('', 0)).toBe('Ada')
    expect(normaliseBotName('   ', 1)).toBe('Bishop')
  })

  it('trims the edges', () => {
    expect(normaliseBotName('  Marcus  ', 0)).toBe('Marcus')
  })

  it('collapses runs of whitespace, so a seat tile cannot be padded out', () => {
    expect(normaliseBotName('Big     Mike', 0)).toBe('Big Mike')
    expect(normaliseBotName('a\t\nb', 0)).toBe('a b')
  })

  it('caps the length so it still fits a seat', () => {
    const long = normaliseBotName('x'.repeat(50), 0)

    expect(long).toHaveLength(MAX_BOT_NAME)
  })

  it('has a default for every seat at the table', () => {
    expect(DEFAULT_BOT_NAMES).toHaveLength(4)
    for (let seat = 0; seat < 4; seat++) expect(botName(seat)).toBeTruthy()
  })

  it('still names a seat beyond the defaults rather than returning nothing', () => {
    expect(botName(9)).toBe('Bot 10')
    expect(normaliseBotName('', 9)).toBe('Bot 10')
  })
})
