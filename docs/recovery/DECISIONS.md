# Decision Log

## D-001: 실제 OMR과 데모 변환을 구분한다

- Date: 2026-07-19
- Status: Accepted
- Decision: 내부 데모 멜로디 생성은 OMR 성공 결과로 취급하지 않는다.
- Reason: 파일 크기 기반 샘플 멜로디는 악보 내용을 나타내지 않는다.
- Directive: fallback은 명시적 실패 또는 demo 상태를 반환해야 한다.

## D-002: 애니메이션 데이터는 버전이 있는 하나의 계약을 사용한다

- Date: 2026-07-19
- Status: Accepted
- Decision: Python converter, storage JSON, TypeScript validator, player가 동일한 canonical schema를 사용한다.
- Reason: 현재 필드명과 손 표기가 달라 런타임 cast로 오류가 숨겨진다.
- Directive: 계약 변경은 fixture와 migration/compatibility policy 없이 수행하지 않는다.

## D-003: 변환 정확도와 재생 동기화를 별도로 검증한다

- Date: 2026-07-19
- Status: Accepted
- Decision: MusicXML→timeline 테스트와 timeline→audio/visual 테스트를 분리한다.
- Reason: OMR, 시간 계산, 스케줄러 오류가 섞이면 원인을 격리할 수 없다.

## D-004: 단계별 브랜치와 PR을 사용한다

- Date: 2026-07-19
- Status: Superseded by D-006
- Decision: 로드맵의 각 단계는 `master`에서 분기한 별도 `codex/` 브랜치와 PR을 사용한다.
- Reason: 변경 범위와 리뷰 증거를 작게 유지하고 새 세션에서 안전하게 이어가기 위함이다.
- Directive: 여러 단계를 한 PR에 합치지 않는다.

## D-005: 에이전트는 PR을 자동 병합하지 않는다

- Date: 2026-07-19
- Status: Accepted
- Decision: 구현·자가 검증·PR 생성·리뷰 대응은 자동 진행하지만 병합은 사용자 지시를 기다린다.
- Reason: 병합은 기본 브랜치와 배포에 영향을 주는 최종 승인 행위다.

## D-006: 기본 브랜치를 `main`으로 통일한다

- Date: 2026-07-19
- Status: Accepted; effective 2026-07-19
- Decision: GitHub 기본 브랜치, 로컬 추적 브랜치, 신규 PR base와 운영 문서는 `main`을 사용한다.
- Reason: GitHub Actions가 이미 `main/develop`을 대상으로 하므로 실제 기본 브랜치 `master`와의 불일치를 제거한다.
- Constraint: PR #1의 기준선·리뷰 로그에 기록된 `master`는 역사적 사실이므로 소급 수정하지 않는다.
- Directive: DOC-1 완료 후 `master`에서 새 작업 브랜치를 만들거나 PR base로 사용하지 않는다.
