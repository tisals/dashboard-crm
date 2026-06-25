import { describe, it, expect } from 'vitest'
import { getMonthMatrix, dateKey, shiftMonth } from './calendar'

describe('getMonthMatrix', () => {
  it('returns 6 rows of 7 columns always', () => {
    const matrix = getMonthMatrix(2026, 6)
    expect(matrix).toHaveLength(6)
    for (const row of matrix) {
      expect(row).toHaveLength(7)
    }
  })

  it('June 2026 starts on Monday (0 empty cells before day 1)', () => {
    const matrix = getMonthMatrix(2026, 6)
    expect(matrix[0]![0]!.getDate()).toBe(1) // Monday June 1
    expect(matrix[0]!.every(c => c === null || c.getDate() === 1)).toBe(true)
  })

  it('June has 30 days', () => {
    const matrix = getMonthMatrix(2026, 6)
    const dates = matrix.flat().filter((c): c is Date => c !== null)
    expect(dates).toHaveLength(30)
    expect(dates[0]!.getDate()).toBe(1)
    expect(dates[29]!.getDate()).toBe(30)
  })

  it('February 2028 (leap) has 29 days', () => {
    const matrix = getMonthMatrix(2028, 2)
    const dates = matrix.flat().filter((c): c is Date => c !== null)
    expect(dates).toHaveLength(29)
  })

  it('February 2026 (non-leap) has 28 days', () => {
    const matrix = getMonthMatrix(2026, 2)
    const dates = matrix.flat().filter((c): c is Date => c !== null)
    expect(dates).toHaveLength(28)
  })

  it('December 2026 starts on Tuesday (1 empty cell before day 1)', () => {
    const matrix = getMonthMatrix(2026, 12)
    expect(matrix[0]![0]).toBeNull() // Sunday (empty)
    expect(matrix[0]![1]!.getDate()).toBe(1) // Tuesday
  })

  it('last row is padded with nulls when month fits in 5 rows', () => {
    // June 2026 ends on a Tuesday in row 5. Row 6 should be all nulls.
    const matrix = getMonthMatrix(2026, 6)
    expect(matrix[5]!.every(c => c === null)).toBe(true)
  })

  it('January 2025 starts on Wednesday (2 empty cells)', () => {
    const matrix = getMonthMatrix(2025, 1)
    expect(matrix[0]![0]).toBeNull()
    expect(matrix[0]![1]).toBeNull()
    expect(matrix[0]![2]!.getDate()).toBe(1)
  })
})

describe('dateKey', () => {
  it('formats Date as YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 5, 15))).toBe('2026-06-15')
  })

  it('zero-pads single-digit months and days', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('shiftMonth', () => {
  it('next month within the same year', () => {
    expect(shiftMonth('2026-06', 1)).toBe('2026-07')
  })

  it('previous month', () => {
    expect(shiftMonth('2026-06', -1)).toBe('2026-05')
  })

  it('wraps forward across year boundary', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })

  it('wraps backward across year boundary', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })
})
