/**
 * The failure the async and background upload paths return instead of
 * fabricating a score (D-010, D-001).
 *
 * Both paths used to call `pdfParser.createEnhancedDemo()`, which picks a
 * canned melody by PDF file size and never reads the score, then stored the
 * result as an ordinary `SheetMusic` row. P1-A removed that. The paths keep
 * their progress contract — P1-B inherits the SSE and polling machinery — but
 * a job on them now ends here rather than in an invented animation.
 *
 * The canonical path is `/api/omr/upload`. It is the only one that converts a
 * score, and as of 2026-07-25 it fails server-side for a separate reason
 * (issue #22: the container cannot run Audiveris on a Docker-less host). That
 * failure is visible and honest; this one has to be too.
 */
export const CONVERSION_UNAVAILABLE = 'CONVERSION_UNAVAILABLE'

export const CONVERSION_UNAVAILABLE_MESSAGE =
  '이 경로는 실제 악보 변환을 수행하지 않습니다. 업로드 페이지의 악보 변환을 사용해 주세요.'
