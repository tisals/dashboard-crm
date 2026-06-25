/**
 * Calendar utilities for the Seguimiento calendar view.
 */

/**
 * Returns the month grid as 6 rows of 7 cells (Monday-first week).
 * Days outside the target month are null.
 *
 * @example
 * getMonthMatrix(2026, 6) // June 2026 → 42 cells, with 30 days in June + 12 nulls
 */
export function getMonthMatrix(year: number, month: number): (Date | null)[][] {
  // JS Date: month is 0-indexed (0=Jan). We accept month 1-indexed for readability.
  const firstOfMonth = new Date(year, month - 1, 1)
  const lastOfMonth = new Date(year, month, 0) // day 0 of next month = last of this month
  const daysInMonth = lastOfMonth.getDate()

  // 0=Sun, 1=Mon, ... 6=Sat. We want Mon-first, so convert: Mon=0, Tue=1, ..., Sun=6.
  const jsDow = firstOfMonth.getDay()
  const mondayIndex = (jsDow + 6) % 7

  const rows: (Date | null)[][] = []

  // Row 1: empty cells before day 1, then days 1..7-or-less
  let currentRow: (Date | null)[] = []
  for (let i = 0; i < mondayIndex; i++) {
    currentRow.push(null)
  }
  let dayCounter = 1
  while (currentRow.length < 7 && dayCounter <= daysInMonth) {
    currentRow.push(new Date(year, month - 1, dayCounter))
    dayCounter++
  }
  rows.push(currentRow)

  // Remaining rows: 7 days each
  while (dayCounter <= daysInMonth) {
    const row: (Date | null)[] = []
    for (let i = 0; i < 7; i++) {
      if (dayCounter <= daysInMonth) {
        row.push(new Date(year, month - 1, dayCounter))
        dayCounter++
      } else {
        row.push(null)
      }
    }
    rows.push(row)
  }

  // Always return exactly 6 rows (pad with nulls if month fits in fewer)
  while (rows.length < 6) {
    rows.push([null, null, null, null, null, null, null])
  }

  return rows
}

/**
 * Format a Date as YYYY-MM-DD (local timezone, no UTC conversion).
 */
export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Shift a month by `delta` (e.g. -1 for previous, +1 for next).
 * Returns the new YYYY-MM string.
 */
export function shiftMonth(yyyymm: string, delta: number): string {
  const [yStr, mStr] = yyyymm.split('-')
  const y = parseInt(yStr, 10)
  const m = parseInt(mStr, 10)
  // JS Date trick: month 0 + delta wraps correctly across year boundary.
  const d = new Date(y, m - 1 + delta, 1)
  const newY = d.getFullYear()
  const newM = String(d.getMonth() + 1).padStart(2, '0')
  return `${newY}-${newM}`
}
