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
 * 경로처럼 보이지만 브라우저가 외부 주소로 읽는 형태를 걸러낸다.
 *
 * - `//host` 는 프로토콜 상대 URL이라 현재 스킴의 절대 주소가 된다.
 * - `\` 는 일부 파서가 `/`로 접어서 `/\host`가 `//host`처럼 동작할 수 있다.
 */
function isSameOriginPath(candidate: string): boolean {
  if (!candidate.startsWith('/')) return false
  if (candidate.startsWith('//')) return false
  if (candidate.includes('\\')) return false
  return true
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
