/**
 * 로그인 후 어디로 돌아갈지 정한다 (DS-2).
 *
 * DS-0이 확인한 결함: `AuthGuard`는 `pathname + search`를 보존하는데 Header의 `LoginButton`은
 * `callbackUrl = "/"` 기본값이라 어디서 눌러도 홈으로 갔다. 두 경로가 이 함수를 공유한다.
 *
 * 같은 origin의 **경로만** 허용한다. 로그인 화면은 복귀 대상이 쿼리 문자열로 넘어오는 자리이므로,
 * 검증 없이 그대로 리다이렉트하면 오픈 리다이렉트가 된다.
 */

const DEFAULT_RETURN_PATH = '/'

/**
 * 판정 기준이 되는 base. 실제 origin이 아니어도 된다 — 후보가 **같은 origin에 머무는지**만 본다.
 */
const PROBE_ORIGIN = 'https://return-path.invalid'

/**
 * 문자열 모양이 아니라 **URL 파서가 어떻게 읽는지**로 판정한다.
 *
 * 처음에는 `startsWith('/')`, `!startsWith('//')`, 백슬래시 부재만 봤다. 그 셋을 모두 통과하면서도
 * 외부로 나가는 입력이 있다 — URL 파서는 ASCII 탭·LF·CR을 **제거한 뒤** 해석하므로
 * `/<TAB>/evil.example`이 `https://evil.example`이 된다. 금지 목록을 늘리는 방식은 다음 문자를
 * 또 놓치므로, 파서에게 직접 물어본다.
 */
function isSameOriginPath(candidate: string): boolean {
  // 파서가 무시하는 문자는 판정도 무시해선 안 된다. 정상 경로에는 나올 이유가 없다.
  if (/[\u0000-\u001f\u007f]/.test(candidate)) return false
  if (candidate.includes('\\')) return false
  if (!candidate.startsWith('/')) return false
  if (candidate.startsWith('//')) return false

  let resolved: URL
  try {
    resolved = new URL(candidate, PROBE_ORIGIN)
  } catch {
    return false
  }
  if (resolved.origin !== PROBE_ORIGIN) return false

  // 파서가 읽은 결과가 원래 문자열과 같아야 한다. 다르면 파서와 우리가 서로 다른 것을 보고 있다는
  // 뜻이고, 그 차이가 정확히 우회가 사는 자리다.
  return `${resolved.pathname}${resolved.search}${resolved.hash}` === candidate
}

/**
 * 복귀 경로를 안전한 값으로 좁힌다. 판정에 실패하면 `fallback`을, 그것마저 안전하지 않으면
 * `/`를 돌려준다.
 */
export function toSafeReturnPath(
  candidate: string | null | undefined,
  fallback: string = DEFAULT_RETURN_PATH
): string {
  if (typeof candidate === 'string' && isSameOriginPath(candidate)) {
    return candidate
  }
  if (isSameOriginPath(fallback)) {
    return fallback
  }
  return DEFAULT_RETURN_PATH
}

/** 브라우저에서 현재 위치를 복귀 경로로 만든다. 서버 렌더 중에는 `/`다. */
export function currentReturnPath(): string {
  if (typeof window === 'undefined') return DEFAULT_RETURN_PATH
  return toSafeReturnPath(window.location.pathname + window.location.search)
}
