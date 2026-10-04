# #228 곡 소개의 검증된 박자·조표

Status: DONE
Date: 2026-10-04
Issue: https://github.com/landfill/ClairKeys/issues/228

## Objective and decision

정규화 기본값 대신 악보 아티팩트 MusicXML에 실제 기록된 박자·조표만 소개한다(D-097).
기존 `loadScoreArtifact`의 동일 URL Promise 공유를 사용해 소개·메트로놈·악보 패널의 다운로드를 중복하지 않는다.
페이지가 SongIntro에 같은 score URL을 전달한다. 애니메이션 1.0·1.1 계약은 바꾸지 않는다.

## Scope

SongIntro, 원본 XML의 보수적인 정보 추출기, `/sheet/[id]`의 score URL 전달과 회귀 테스트.
첫 음/쉼표 전에 모든 파트에 명시된 정보만 인정한다. 파트별/곡 중 서로 다른 박자·조표, 복합 표현·비전통 조표는 단일 값으로 요약하지 않는다.
박자와 조표는 독립적으로 판단하며 조표는 샵/플랫 개수로만 표시한다. 근거 없거나 로드 실패 시 해당 행을 생략한다.
원본 출처 문구와 `/learn/reading#meters` 링크를 제공한다. 재생 화면 루트에는 추가하지 않는다.

## Dependencies and completion

#225·#226과 독립. #227은 동일한 score artifact 형식의 정적 자산을 제공하므로 같은 SongIntro prop으로 연결할 수 있다.
병합 순서는 #228 → #227을 권고한다. #228이 병합된 후 #227 브랜치를 main에 맞추면서 CoursePlayer에 score URL을 전달하고 실제 코스 E2E를 추가한다.
그 연결 전에는 네 이슈 전체 완료를 주장하지 않는다. #227 데이터 형식과 같은 정적 score URL fixture를 여기서 검증한다.
원본 유/무·기본값·변경 박자/조표·실패·stale 요청·다운로드 1회 회귀, 기존 계약 호환, 전체 로컬 검증·CI·리뷰·승인 병합·Post-merge 필요.

## Progress

- 2026-10-04: 공유 캐시 조사, 출처 경로 결정. #226은 사용자 답변 대기.

- 2026-10-04: PR234 사용자 승인 후 병합·#228 종료. Post-merge 확인 대기([PR234](../reviews/PR-234.md)).

- 2026-10-04: Post-merge checks PASS, 내장곡 연결도 PR233에서 병합됨. 완료 근거는 [PR234](../reviews/PR-234.md)·[PR233](../reviews/PR-233.md).
