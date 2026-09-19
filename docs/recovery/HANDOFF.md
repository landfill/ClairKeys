# Current Handoff

Last updated: 2026-09-20 KST

## Current phase

문서 규약 최적화는 PR160 `d7bfbc8`로 병합됐다. [검토·병합 기록](reviews/PR-160.md).

**[#134 인식 품질 개선](phases/ISSUE-134-recognition-quality.md) — IN_PROGRESS.**
시작 템포 수정은 운영 반영됐다. 줄 위 3도 점 누락 수정 [PR161](reviews/PR-161.md)(D-062, `34f9e7e`)은
2026-09-14 배포돼 운영 스모크에서 Clair 153/191을 확인했다. 타이 기전 B 수정 [PR162](reviews/PR-162.md)(D-063, `0a22d2f`)는
2026-09-15 배포돼 운영 스모크에서 타이 29/43을 확인했다. 다른 화음 사이 점 수정 [PR163](reviews/PR-163.md)(D-064, `0e3dc61`)은
2026-09-15 배포됐고 사용자의 앱 재변환 결과가 로컬 검증 결과와 같음을 확인했다.
m9 빔 복원 [PR164](reviews/PR-164.md)(D-065, `bbcc09b`)는 2026-09-18 배포됐고 사용자의 앱 재변환 결과가
로컬 검증 결과와 전 필드 같음을 확인했다. 2도 밀린 머리 보존 [PR165](reviews/PR-165.md)(D-066, `f5be5f9`)는
같은 날 병합·배포됐고 사용자의 앱 재변환 결과가 로컬 검증 결과와 전 필드 같음을 확인했다.
기둥 공유 빈 머리 [PR166](reviews/PR-166.md)(D-067, `b15d0fd`)은 2026-09-19 병합·배포됐고 앱 재변환 결과가 로컬 검증과 전 필드 같다.
공유 기둥 화음 분리 [PR167](reviews/PR-167.md)(D-068, `983caf9`)도 2026-09-19 배포했다. 이미지/native/클래스/health 검증은 완료했고,
그시점의운영원본PDF재변환은수행하지않았다. 이후m1점PR168과m3둘잇단PR169(9e4020a)을병합·배포했고,
이어 D-071 [PR170](reviews/PR-170.md)(`122f5bc`)과 D-072 오선 purge 타이 [PR171](reviews/PR-171.md)(`867513c`)을 병합·배포했고,
현재 운영 원본 기준 이벤트191/191·타이37/43을 확인했다. 남은 누락 타이는 6개다.
최근 완료: UI 개편 #146 ([phase](phases/ISSUE-146-ui-renewal.md), [PR158](reviews/PR-158.md)).
PR·브랜치의 현재 상태는 GitHub와 해당 리뷰 로그에서 확인한다.

## Next action

1. **[PR171](reviews/PR-171.md) 병합·브랜치 정리·승인된 VM 배포 완료.** 운영 `867513c`, image `5af0b796…`,
   `rollback-pr171-20260919`→`79cbc6ab…`(PR170) 보존. [배포·운영 스모크·롤백](validation/2026-09-19-d072-staff-line-purge-deployment.md).
2. 운영 Clair **191/191·타이37/43·누락6·오검출0**. raw events·평가 객체가 로컬 최종 검증과 같고 animation은 생성 시각만 다르다.
   사용자의 앱 재변환(2026-09-20 00:19 KST, job `a530c820…`) 154음이 검증본과 전 필드 같고 처리 완료·callback 전달을 확인했다.
   플레이어 UI·청취 E2E는 미실행이다.
3. 남은 누락 6개([재분류](validation/2026-09-19-issue-134-residual-ties.md)): m12 X자 교차 1(곡선 가운데가 오선에 닿아 쪼개짐),
   시스템 경계 5(반쪽 곡선 6개 미검출: m3 A4·C5, m6 E4, m9 C5·E5).
4. **시스템 경계 타이5개 로컬 구현·필수 검증 완료**, 작업 `a8d6b28`(코드`13431f0`).
   d073c/d는 실행코드가 같고, 이미지190통과/6보관진단skip(native19실행), Clair3회191/191·42/43·오검출0이다.
   최종 corpus는10곡동일·모노노케 인쇄타이1개개선·동일SCALE실패1곡이다. [상세 근거](validation/2026-09-20-issue-134-cross-system-ties.md).
   **다음은 PR 생성·최신 CI/실제 리뷰 대응**이다. 상태 커밋600ae80/621b576 보안 감사는 npm bulk503/quick400 오류로 실패해 재확인 중이다.
   m3 C5의 성부2→1 재생 병합과 m12 교차는 별도 후속이다. main 병합 및 운영 VM 접근·배포는 이번 승인 범위 밖이다.


## Latest verified result

- **OMR 운영 / PR171(2026-09-19 23:57 KST)**: `867513c`, image `5af0b796…`, rollback `79cbc6ab…`.
  VM 191개 중 185통과/6진단skip(native14 모두 실행), 두 엔진 JAR 2433항목·/app·테스트 클래스가 로컬 d072b와 동일.
  active·healthy, 외부200/401, journal오류0, env/unit/data 보존. 운영 모듈 Clair **191/191·타이37/43·오검출0**,
  raw/평가 로컬 동일, canonical154. 임시 PDF/OMR3 제거·잔여0. [검증/한계](validation/2026-09-19-d072-staff-line-purge-deployment.md).

- **D-072 로컬 / 2026-09-19**: d072b-patched, head `3143f2d`([PR171](reviews/PR-171.md), `867513c`로 병합·배포). 기준선 d071에서 실패하던 native fixture가 양쪽 엔진 통과.
  Clair 타이34→**37/43**·이벤트191/191·오검출0 3회 동일, 목표 곡선3개만 추가. 이미지185통과·6진단skip/native14 실행,
  corpus 10동일·달빛 인쇄 타이1 추가·1같은SCALE실패, 타입/lint/Jest1038. 위 PR171 운영 스모크에서 같은 결과를 확인했다. [근거·한계](validation/2026-09-19-issue-134-staff-line-purge-ties.md).

- **OMR 운영 / PR170(2026-09-19 20:32 KST)**: `122f5bc`, image `79cbc6ab…`, rollback `850a4143…`.
  VM 190개 중 184통과/6진단skip(native13 모두 실행), 두 엔진 JAR 2433항목·/app·테스트 클래스가 로컬 d071과 동일.
  active·healthy, 외부200/401, journal오류0, env/unit/data 보존. 운영 모듈 Clair **191/191·타이34/43·오검출0**,
  raw/평가 로컬 동일, canonical157. 임시 PDF/OMR3 제거·잔여0. [검증/한계](validation/2026-09-19-d071-aligned-voice-tie-deployment.md).

- **D-071 로컬 / 2026-09-19**: d071-patched, head `8d7812f`([PR170](reviews/PR-170.md), `122f5bc`로 병합·배포). 기준선 d070b에서 실패하던 native fixture가 양쪽 엔진 통과.
  Clair 타이31→**34/43**·이벤트191/191·오검출0 3회 동일, 목표 곡선3개의 tie 플래그만 변경. 이미지184통과·6진단skip/native13 실행,
  corpus11동일/1같은SCALE실패, 타입/lint/Jest1038. 위 PR170 운영 스모크에서 같은 결과를 확인했다. [근거·한계](validation/2026-09-19-issue-134-aligned-voice-ties.md).

- **OMR 운영 / PR169(2026-09-19 15:25 KST)**:9e4020a,image850a4143…,rollbackf14c2f83….
  VM183통과/6진단skip(native12모두실행),normal/recovery각2,433JAR항목·source/fonts로컬동일.
  active·healthy,외부200/401,journal오류0,기존env/unit/data보존. 운영모듈Clair **191/191·타이31/43·오검출0**,
  raw191/canonical160/dots116/tempo69,로컬전필드동일(생성시각제외). 임시PDF/OMR3제거·잔여0.
  사용자앱재변환(17:17KST)160음도전필드동일,tempo69·9/8·길이동일;제목·시각·tempoSource표시만다름.
  원격/로컬브랜치정리와사용자메모보존완료. [검증/한계](validation/2026-09-19-d070-duplet-deployment.md).

- **D-070 m3 로컬 / 2026-09-19**: d070b(`39381f8f…`), head1debdbb. Clair187→**191/191** 최종3회동일,
  타이일치30→31/43·오검출1→0(기존타이onset정렬),누락12개남음. 정식이미지183pass6진단skip/native12모두실행.
  corpus11동일성공/1같은SCALE실패;타입/lint/Jest1038통과. 자체리뷰수정검증완료,[PR169](reviews/PR-169.md)최신필수CI모두성공·Codex리뷰완료·지적0. 9e4020a로병합·배포완료했다.
  운영도위PR169스모크에서같은개선을확인했다. [근거·한계](validation/2026-09-19-issue-134-m3-duplet.md).

- **OMR 운영 / PR168(2026-09-19 12:01 KST)**:6de51f1, imagef14c2f83…, rollbackb28cc02d….
  VM 이미지182통과/6진단skip(native11개 모두 실행),10클래스/내장 source가 로컬d069b와 동일.
  active·healthy, 외부200/401, journal오류0. 운영 컨테이너 Clair 모듈 스모크 **187/191·타이30/43**,
  m1완전일치·raw191/canonical160·tempo69. 로컬 raw/평가객체 동일, animation 생성시각 외 동일.
  원본PDF/OMR3개 제거·잔여0, env/unit/기존 processing 보존. 웹 업로드E2E는 미실행.
  [배포 검증](validation/2026-09-19-d069-m1-dot-deployment.md).

- **D-069 / PR168 로컬 최종(2026-09-19)**: d069b-patched(`ba44da31…`), head2458daf.
  Clair **185→187/191**, 최종 이미지3회 동일; m1 C5/E5 점·길이만 변경. 타이30/43 및 누락13/오검출1 개별 목록 보존.
  이미지182통과·6진단skip, native11개 모두 실행. corpus11곡 동일/1곡 동일3쪽 SCALE 실패; 공백 정리 재빌드의 런타임40,909항목 동일.
  타입/lint/Jest1038·최신 head 필수 CI(E2E2개 포함) 통과. Codex 실제 재리뷰 완료·지적0; CodeRabbit skip은 리뷰 통과로 미계상.
  **m1 수정은 PR168로6de51f1에 병합·배포, #134 phase는 IN_PROGRESS.** 위 운영 스모크로 개선을 확인했다.
  [검증·한계·자체 리뷰](validation/2026-09-19-issue-134-m1-tie-cut-dots.md), [최신 CI/리뷰](reviews/PR-168.md).

- **OMR 운영 / PR167(2026-09-19 10:05 KST)**: `983caf9`, image `b28cc02d…`, rollback `rollback-pr167-20260919`→`721ccc10…`.
  VM 이미지181통과·6skip(native10개 모두 실행), 네 패치 클래스가 normal/recovery 모두 로컬 d068b와 동일하다.
  active·healthy, 외부 health200·무인증401, 전환 이후 오류 로그0, env/unit/기존 processing 데이터 보존.
  **원본 PDF 운영 재변환은 아직 미확인.** [배포 검증](validation/2026-09-19-d068-shared-stem-chord-deployment.md).

- **D-068 로컬 최종 / PR167(2026-09-19)**: d068b-patched(`23843796…`), head cacce3a. Clair **185/191·타이30/43** 3회 동일,
  m5 duration2·m7 duration1 해소. 이미지181통과·6skip(native10개 전부 실행), corpus 성공11곡 동일·1곡 같은 SCALE 실패.
  hosted Jest105 suites/1038 tests·필수 CI 모두 통과. cross-staff P1 수정·재검증, Lore 지적은 원문으로 반증, 재리뷰 새 지적0.
  **이후983caf9로 병합·배포 완료.** [검증](validation/2026-09-19-issue-134-shared-stem-chord-split.md), [리뷰/CI](reviews/PR-167.md).

- **직전 OMR 운영(2026-09-19)**: PR166 `b15d0fd` 배포 완료. image `721ccc10…`, 롤백 태그 `rollback-pr166-20260919`(`4c14123d…`).
  이미지 테스트 **184 OK / 6 skipped**, 네이티브 7개 skip 없이 ok. `SigReducer.class`(`3b84596b…`)·`AbstractChordInter.class`(`91081cfa…`)가
  normal·recovery 양쪽 모두 로컬 검증 빌드와 같다. health 200, 무인증 401. 사용자의 앱 재변환(00:53 KST) **160음이 로컬 검증과 전 필드 같다.**
  직전 운영 대비 변화는 m5 오른손뿐이다: 셋잇단이 사라지고 F4(복원)·A4·B4가 온전한 8분이 됐다.
  [배포·확인 근거](validation/2026-09-19-d067-shared-stem-deployment.md).
- **D-067 로컬 검증(2026-09-19)**: Clair 173 → **182/191** 3회 동일(m5만 변화, onset 8건 해소), corpus 11곡 바이트 동일.
  [기록](validation/2026-09-19-issue-134-shared-stem-void-head.md).
- **직전 운영(2026-09-18)**: PR165 `f5be5f9` 배포 완료. image `4c14123d…`, 롤백 태그 `rollback-pr165-20260918`(`9eef7512…`).
  이미지 테스트 **182 OK / 6 skipped**, 네이티브 6개가 skip 없이 ok.
  `SigReducer.class` 해시가 normal·recovery 양쪽 모두 로컬 검증 빌드(`da3b0721…`)와 같고, 직전 운영은 `e4be8314…`로 기준선과 같다.
  health 200, 무인증 process 401. 사용자의 앱 재변환(22:24 KST) **159음이 로컬 검증 결과와 전 필드 같다**(차이 0건).
  직전 운영 대비 실제 변화는 m5 F4 복원·m7 C4 복원 둘이고, m5 이후 110음이 8분음표 반 개씩 바른 위치로 옮겨졌다
  (전체 65.000 → 65.217초). [배포·확인 근거](validation/2026-09-18-d066-second-interval-deployment.md).
- **D-066 로컬 검증(2026-09-18)**: 전체 빌드 `d066b-patched` 이미지 테스트 182 OK/skip 6.
  새 fixture는 운영 동등 `d065b-patched`에서 FAILED, 패치에서 OK. Clair 171 → **173/191** 3회 동일(raw 해시 동일, m5·m7만 변화),
  타이 29/43·tempo 69 불변, canonical 157 → 159. corpus 비교 가능한 11곡 모두 기준선과 바이트 동일.
  [기록](validation/2026-09-18-issue-134-second-interval-head.md).
- **직전 운영(2026-09-18)**: PR164 `bbcc09b` 배포 완료. image `9eef7512…`, 롤백 태그 `rollback-pr164-20260918`(`2a71ede5…`).
  이미지 테스트 **180 OK / 6 skipped**, 새 빔 네이티브 테스트 2개와 기존 네이티브 3개가 skip 없이 ok.
  `BeamsBuilder.class` 해시가 normal·recovery 양쪽 모두 로컬 검증 빌드(`8d15e1b2…`)와 같다. health 200, 무인증 process 401.
  사용자의 앱 재변환(11:45 KST) 애니메이션 **157음이 로컬 검증 결과와 전 필드 완전히 같다**(차이 0건).
  직전 운영과의 차이는 **m9 하나**다: E3가 8분 4개 → 2개, G3가 2개 → 1개, 뒤 73음이 8분음표 1개씩 균일하게 당겨지고
  전체 길이가 65.435 → 65.000초가 됐다. 음높이·손·staff 변화 0건.
  [배포·확인 근거](validation/2026-09-18-d065-beam-stem-anchor-deployment.md).
- **D-065 2차 독립 검증(2026-09-17) — PASS WITH CONCERNS**: [PR164](reviews/PR-164.md)로 2026-09-18 병합됐다(`bbcc09b`).
  Clair **171/191** 3회 동일(바뀐 마디는 m9뿐, 타이 29/43·tempo 69 불변), corpus 비교 가능한 11곡 모두 D-064와 동일,
  Deborah `events.json` 바이트 동일(`d8b378e3…`), 이미지 테스트 **180 OK/skip 0**, `--no-cache` 빌드 171.24초.
  1차(2026-09-16 재개분)는 Deborah m24에서 슬러가 빔으로 남아 canonical 330개 중 127개가 앞당겨지는 회귀로 **FAIL**이었고,
  자를 수 있는 후보에 두께 조건(D-065 결정 3b, 기준 빔 두께의 0.95)을 두어 해소했다.
  남은 우려는 Medium 3·Low 2건이며 실행된 회귀는 없다. [기록](validation/2026-09-17-issue-134-m9-beam-trim-thickness.md).
- **D-065 로컬 검증(2026-09-16, 진행 중·미배포)**: 실험 이미지에서 Clair 160 → **171/191** 3회 동일(m9 오류 11건 해소, 타이·tempo 불변).
  전체 빌드 `d065-patched` 이미지 테스트 179 OK/skip 0. fixture 판별·corpus 회귀는 남았다.
  [기록](validation/2026-09-16-issue-134-m9-beam-stage-trace.md).
- **OMR 운영(2026-09-15)**: PR163 `0e3dc61` 배포 완료. image `2a71ede5…`, 롤백 태그 `rollback-pr163-20260915`(`f5959ea9…`).
  이미지 테스트 177 OK / 6 skipped, native 점·타이 테스트 3개 skip 없이 ok. 점 클래스 해시가 로컬 검증 빌드와 같다. health 200, 무인증 process 401.
  사용자의 앱 재변환(20:54 KST) 애니메이션 157음이 로컬 검증 결과와 완전히 같고, 직전 운영과는 m7 14음만 다르다
  (C4 점2분 회복, E4 점8분 → 8분, 뒤 12음 0.25박씩 당겨짐). [배포·확인 근거](validation/2026-09-15-d064-cross-chord-dot-deployment.md).
- **D-064 로컬 검증(2026-09-15)**: 전체 Dockerfile 이미지 `d064-patched` 177 OK/skip 0. 새 fixture d063 3/3 실패 → d064 3/3 통과.
  Clair 3회 160/191(m7 onset 5·점 오류 2 해소, 기전 B missing 1 남음), 타이 29/43·tempo 69 불변. corpus 10/12 동일,
  Love는 비결정성, truongca는 양쪽 같은 기존 실패. [기록](validation/2026-09-15-issue-134-cross-chord-dot-head-link.md).
- **OMR 운영(2026-09-15)**: PR162 `0a22d2f` 배포 완료. image `f5959ea9…`, 롤백 태그 `rollback-pr162-20260915`(`71594a4a…`).
  - 이미지 테스트 176 OK / 6 skipped. 네이티브 타이·점 테스트는 skip 없이 ok. health 200, 무인증 process 401.
  - 운영 모듈 스모크: Clair 9/8·**157음**·tempo 69, 원본 이벤트 153/191(불변), 타이 시작 **29/43**(PR161 23), 누락 14, 오검출 2.
    정확한 마디 2·4·8·11·15·16·17(PR161 8·15·16·17). MusicXML은 메타데이터를 빼면 로컬 검증 결과와 같다.
  - [배포·스모크·롤백 근거](validation/2026-09-15-d063-staff-line-tie-deployment.md).
- **D-063 로컬 검증(2026-09-15)**: 전체 Dockerfile 이미지 176 OK/skip 0, fixture stock 0/8 → patched 8/8, Clair 타이 23 → 29/43
  (누락 20 → 14, 오검출·이벤트 153/191 불변). corpus 12개 중 10개 동일. [기록](validation/2026-09-15-issue-134-staff-line-tie-head-link.md).
- **직전 운영(2026-09-14)**: PR161 `34f9e7e` 배포. image `71594a4a…`, 롤백 태그 `rollback-pr161-20260914`(`bd2d5e6e…`).
  - 이미지 테스트 174 OK / 6 skipped. native 줄 위 3도 테스트는 skip 없이 ok다.
  - 외부 health 200, 무인증 process 401.
  - 운영 모듈 스모크: Clair 9/8·163음·tempo 69, 원본 이벤트 **153/191**(PR159 143), missing-dot 12 → 4.
    MusicXML은 메타데이터를 빼면 로컬 패치 결과와 같다.
  - [배포·스모크·롤백 근거](validation/2026-09-14-d062-line-third-dot-deployment.md).
- **점 패치 로컬 비교(PR161)**: 로컬 amd64 이미지로 main과 패치를 PDF 13개에 비교했다.
  - 성공 12개 중 9개는 결과가 같다. 3개(Clair·Première Gymnopédie·달빛 쉬운편곡)는 원본에 있는
    줄 위 3도 점만 늘었다.
  - Clair 원본 이벤트 143 → **153/191**. 패치 엔진은 3회 결과가 같고, 기본 엔진은 143/141로 흔들렸다.
  - 남은 점 오류: m1 RH(타이가 점을 자름), m3 둘잇단, m7 C4 오배정.
  - [검증](validation/2026-09-13-issue-134-dot-head-link.md), [VIP 원인](validation/2026-09-13-issue-134-dot-tie-stages.md).
- **누락 타이 20개**(PR161 운영 스모크에서도 동일): 미검출 10, cross-system 오연결 5, slur 오분류 1, 선행 리듬 오류 파생 4.
  - 미검출 10건은 모두 왼손 렌즈 모양 타이다. A(오선 접선 purge) 3건, B(머리 연결 실패) 7건.
  - B의 곡선 끝은 머리에서 2.2 IL 이상 떨어져 있고, 인식된 타이는 1.1 IL 이내다.
  - [조사](validation/2026-09-14-issue-134-tie-curves.md). 로컬 진단 이미지 `clairkeys-omr:tie-diag`는 로그만 추가한 빌드다.
  [단계별 실험·VIP 로그](validation/2026-09-13-issue-134-dot-tie-stages.md),
  [17마디 기준 비교](validation/2026-09-13-issue-134-residual-timing.md).

## Known blockers / constraints

- 2026-09-19: 사용자 명시적 승인으로 PR171 병합·원격→main→로컬 브랜치 정리·VM 배포를 완료했다.
  사용자 history 메모 SHA `36207439…` 보존, 운영 `867513c`/`5af0b796`, `rollback-pr171-20260919` 보존.
  공개 첨부본 동일성 확인 후 임시 운영 스모크 191/191·타이37/43, PDF/OMR 잔여0. [근거](validation/2026-09-19-d072-staff-line-purge-deployment.md).

- 2026-09-19: 사용자 명시적 승인으로 PR170 병합·원격→main→로컬 브랜치 정리·VM 배포를 완료했다.
  사용자 history 메모 SHA `36207439…` 보존, 운영 `122f5bc`/`79cbc6ab`, `rollback-pr170-20260919` 보존.
  공개 첨부본 동일성 확인 후 임시 운영 스모크 191/191·타이34/43, PDF/OMR 잔여0. [근거](validation/2026-09-19-d071-aligned-voice-tie-deployment.md).

- 2026-09-19: 사용자명시적승인으로PR169병합·원격→main→로컬브랜치정리·VM배포를완료했다.
  사용자history메모SHA36207439…보존,운영9e4020a/850a4143,rollback-pr169-20260919보존.
  공개원본동일성증명후허용된임시운영스모크191/191,PDF/OMR잔여0. [근거](validation/2026-09-19-d070-duplet-deployment.md).

- 2026-09-19: 사용자 "브랜치 정리와 vm 배포도 완료하라" 지시에 따라 PR168 branch를 원격→로컬 순으로 삭제했다.
  fetch 후 두 tip2458daf의 main 포함/고유0을 확인했고 사용자 메모 SHA36207439…는 전후 동일하다.
  VM 배포와 운영 원본 모듈 스모크까지 완료했다. [검증/롤백 기록](validation/2026-09-19-d069-m1-dot-deployment.md).

- 2026-09-19: 사용자 "그럼 병합. 브랜치 정리, vm 배포" 지시로 PR167을 병합·배포하고 작업 브랜치를 원격→로컬 순서로 삭제했다.
  양쪽 tip cacce3a는 최신 main에 포함됨을 확인했다. 사용자 미커밋 history 메모는 전후 SHA 동일하게 보존했고 현재 main이다.

- 2026-09-19: PR166 병합·배포 후 사용자 지시("브랜치 정리해")로 `codex/issue-134-shared-stem-durations`를 원격 → 로컬 순서로 삭제했다.
  두 tip 모두 main에 포함됨을 확인했고 사용자 미커밋 변경은 손대지 않았다. 당시 작업 브랜치 정리를 완료했다. D-068 작업 브랜치도 위 정리 기록을 따른다.
- 2026-09-18: PR165 병합·배포 후 사용자 지시("브랜치 정리해")로 `codex/issue-134-second-interval-head`를 삭제했다.
  로컬·원격 tip 모두 `9645772`이고 main에 포함됨을 확인한 뒤 원격 → 로컬 순서로 지웠다.
  사용자 미커밋 변경(`validation/2026-09-13-handoff-history.md`)은 손대지 않았다.
- 2026-09-18: PR164 병합·배포 후 사용자 지시("브랜치 정리")로 `codex/issue-134-m9-beam-extension`을 삭제했다.
  로컬·원격 tip 모두 `c36f26b`이고 main 대비 고유 커밋 0임을 확인한 뒤 원격 → 로컬 순서로 지웠다.
  사용자 미커밋 변경(`validation/2026-09-13-handoff-history.md`)은 손대지 않고 그대로 뒀다.

- 2026-09-17: D-065 코드가 2026-09-16에 작업 브랜치가 아니라 **main에 직접 커밋·push**됐다(`362a00f`). 검증 1~4단계만 끝난
  엔진 변경이 기본 브랜치에 남아 있었다. 사용자 결정으로 main에서 revert(`1391c4d`, push 완료)하고 같은 변경을
  `codex/issue-134-m9-beam-extension`에 cherry-pick(`b59ea08`)했다. `git diff 362a00f b59ea08 -- omr-service src`는 비어 있어
  1~4단계 근거는 그대로 유효하다. 운영은 PR163 `0e3dc61`로 변함없고 배포 이미지는 영향받지 않는다.
  D-065는 검증 5~8단계를 마친 뒤 PR로만 main에 돌아온다.

- 2026-09-15: PR160–PR163 작업 브랜치는 로컬·원격 tip 모두 main 대비 고유 커밋 0을 확인하고
  사용자 지시("굳이 필요없다면 버릴것")로 원격 → 로컬 순서로 삭제했다.
  사용자의 미커밋 이력 메모(`validation/2026-09-13-handoff-history.md`)는 손대지 않고 그대로 둔다.

- 로컬 Docker 이미지는 검증용이며 운영 이미지와 같다고 주장하지 않는다. 2026-09-19 초기 정리 뒤 남긴 기존 네 기준선은 모두 보존했다:
  **`d067b-patched`**(직전 운영 PR166과 클래스 해시가 같은 기준선), `d066b-patched`(PR165 기준선, `SigReducer.class` `da3b0721…`),
  `d065b-patched`(`BeamsBuilder.class` `8d15e1b2…`, PR164 기준선), `d064-patched`(PR163 기준선).
  이번 작업에서 `d068-patched`(리뷰 전 재현용)·**`d068b-patched`**(PR167 최종 검증용)를 추가 보존해 당시6개였으며, PR168 검증의 d069-patched/d069b-patched도 보존했다.
  이번 중간 실험 d068-exp/d068-exp2/d068-exp3은 삭제했다.
  `d066-patched`·`d067-patched`·`d067-exp-chord`·`d065-patched`·`d065b-codex-verification`는 삭제했다. 과거 기준선이 다시 필요하면 해당
  커밋에서 Dockerfile로 재빌드한다(약 3분). 같은 지시로 다른 프로젝트(bluekiwi) 컨테이너 3개를 중지·삭제했고 `bluekiwi_pgdata` 볼륨은 남겼다.
  2026-09-18 Docker Desktop이 검증 도중 한 번 종료됐다. 컨테이너 메모리 제한을 6GB → 5GB로 낮췄고 이후 재발하지 않았다.
  컨테이너 안 JVM은 비ASCII 파일 이름(`’`, 한글)을 읽지 못하므로 직접 Audiveris를 돌릴 땐 ASCII 이름으로 복사한다(운영 서비스는 `input.pdf`로 복사해 무관).
  그래프 덤프 도구는 Git 제외 `local-test-data/results/issue134-onsets-2026-09-15/dump_region.py`다.
  운영 수치는 PR162까지는 운영 스모크 기록(`pr162-live-pkmvlC`), PR163은 사용자의 앱 재변환 애니메이션 회수본을 근거로 한다.
- #134 판단은 원본 기준표 평가(phase 완료 조건)로 한다. 2026-09-15 사용자는 악보를 읽지 않으며 청취로 이상한 곳을
  구분하기 어렵다고 알렸다. 청취를 완료 조건이나 대기 항목으로 두지 않는다. 앱 재변환은 선택 확인이다.
  PR159 배포 검증은 운영 모듈 스모크이며 웹 업로드→콜백→플레이어 E2E가 아니다.
- D-049 / D-052: exported XML/JSON에 점·타이·음표를 임의로 보충하지 않는다.
  구현 정책 변경은 [DECISIONS](DECISIONS.md)와 phase를 먼저 갱신한다.
- 새 PR 병합 및 운영 배포는 각각 명시적 승인이 필요하다. 과거 실험 승인을 새 범위로 확대하지 않는다.
- 원본 PDF·이미지 포함 OMR은 Git에 넣지 않는다. 로컬 실험 산출물은 Git 제외
  `local-test-data/results/issue134-dots-2026-09-13/`, 점 패치 corpus 비교는
  `local-test-data/results/issue134-dot-link-2026-09-13/`에 있다.
- VM `/data/analysis/pr159-live-R6a7yJ`·`pr161-live-Dvps30`·`pr162-live-pkmvlC`에는 XML/JSON/로그가 남고 PDF·OMR은 삭제됐다.
  VM `/tmp` 빌드·테스트 로그(PR159·PR161·PR162)도 남아 있다. 외부 health 포트는 **3000**이다.
  회수와 원격 root 전체 삭제를 묶은 명령은 자동 승인 검사에서 거부된 이력이 있다.

## Other tracks / evidence index

| 작업 | 재개 조건·근거 |
|---|---|
| OMR page/scale | [OMR-Q2](phases/OMR-Q2-page-scale.md): 400dpi 한 입력 개선만 입증. 정상 악보·fallback 검증 전 전역 정책 도입 금지 |
| 운지 #130 | [phase](phases/ISSUE-130-fingering-corpus-and-reach.md): 사람의 기준 운지 근거를 기다림 |
| 영속 OMR 큐 | [P1-B](phases/P1-B-durable-omr.md), [로드맵](ROADMAP.md): NOT_STARTED |
| UI #146 완료 한계 | [PR158](reviews/PR-158.md): 실기기 터치·가로 화면·브라우저 zoom·스크린리더·대비 계측·실제 로그인 미검증 |
| 전체 계획·결정 | [ROADMAP](ROADMAP.md), [DECISIONS](DECISIONS.md) |
| 검증·리뷰 상세 | [validation](validation/), [reviews](reviews/) — 해당 작업 파일만 선택해서 읽기 |
| 이전 인계 이력 | [본문 보존본](validation/2026-09-13-handoff-history.md) — 과거 상태이며 기본 읽기 대상 아님 |

이 파일은 현재 상태와 재개 지점의 요약이다. 상세 경과는 위 근거 문서에 있다.
