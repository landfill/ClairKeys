/**
 * Renders a join date only once it is known. An unparseable or missing value
 * returns null so the caller can leave the row out entirely rather than fall
 * back to something plausible — the profile page previously displayed the
 * literal "2024년 1월 1일" (issue #104).
 *
 * The date is formatted in the reader's own zone, not in UTC. Review suggested
 * pinning `timeZone: 'UTC'` so the output matches the stored instant, but that
 * is the wrong direction: an account created at 08:00 KST is stored as 23:00
 * the previous day in UTC, and telling that user they joined a day earlier than
 * they did is the kind of small untruth this page was cleaned up to remove. A
 * test fixes the local-zone behaviour so it is not "corrected" later.
 *
 * This lives outside the page because a Next.js page module may only export its
 * default, and a formatter that decides what the user is told is worth testing
 * directly.
 */
export function formatJoinDate(isoDate: string): string | null {
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return null

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(parsed)
}
