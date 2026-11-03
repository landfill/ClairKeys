# PR261 병합 후 웹 인증 경계 확인 — 2026-11-04 KST

## 확인 범위

사용자가 승인한 병합 후 확인의 일부로 공개 웹 alias만 읽었다.
수동 배포·Vercel 설정 변경·로그인 가장·VM 요청·DB 작업은 하지 않았다.
Git 연동 Production 배포와 병합 후 CI의 근거는 [PR261 리뷰 원본](../reviews/PR-261.md)에 있다.

## 명령과 결과

`Invoke-WebRequest`로 `https://clairkeys.vercel.app`에 쿠키 없이 요청했다.
`-SkipHttpErrorCheck -MaximumRedirection 0`으로 최초 응답의 status/header만 확인했다.

| 경로 | 결과 |
|---|---|
| `/api/admin/omr` | 401, `Cache-Control: no-store, max-age=0, private`, Location 없음 |
| `/admin/omr` | 307, Location `/api/auth/signin?callbackUrl=%2Fadmin%2Fomr` |

비로그인 요청은 운영 데이터를 받지 못했고 페이지는 해당 경로를 보존해 로그인을 요구했다.

## 한계

운영자 로그인·ADMIN_EMAILS 설정·실제 OMR 데이터·호스트 수집기 활성화·원본 PDF 변환·VM 외부 health/auth·성능은 미확인이다.
이 확인은 OMR VM 배포나 계측 활성화를 뜻하지 않는다. 별도 승인 후 [런북](../../../omr-service/deploy/MONITORING.md)으로 진행한다.
