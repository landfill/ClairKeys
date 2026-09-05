# ISSUE-134 — PDF에서 MusicXML을 만드는 인식 단계 개선

Status: `IN_PROGRESS`
Depends on: #134 same-input VM reproduction, D-048 diagnostics

## Objective

경고 추가를 완료로 삼지 않고, 동일 PDF를 새로 업로드했을 때 잘못된 박자 기호·누락 음표·음가가
실제로 개선되는 인식 경로를 찾고 검증한다. 기존 저장 악보의 소급 수정은 필요하지 않다.

## Baseline

- `Clair_de_Lune_easy_300dpi.pdf`: A4, 2480×3508 RGB JPEG 1장, 실제 300dpi; staff interline 약 20px.
- 원본 박자 9/8, 점4분음표=46. 기본 Audiveris 5.11.0 출력은 6/8, canonical 133음.
- 엔진 로그는 17개 마디 전부 `no correct rhythm`을 보고한다. D-048의 export 진단은 초과 마디 10개를 잡는다.
- 9/8은 이 엔진 버전의 기본 지원 목록에 있다. 미지원 박자 또는 단순 저해상도라고 단정하지 않는다.
- 원본 PDF는 임시 분석 위치에서만 사용하고, 지속 근거는 허용된 XML/JSON·해시·텍스트 계측에 둔다(D-040).

## Work stages

1. 실제 이미지와 인식 후보/로그를 대조해 실패 기전을 좁힌다.
2. 입력 scale/이진화, 음표 template 및 박자 후보 선택을 한 변수씩 제한된 VM 실험으로 검증한다.
3. 원본에서 읽은 기준 이벤트를 먼저 고정하고, 후보 결과를 비교한다. 경고 개수만 줄이는 것을 성공으로 보지 않는다.
4. 개선이 입증된 일반화 가능한 정책만 런타임에 넣고 회귀·비용·실패 복구를 검증한다.
   - D-049의 보수적인 6/9 재판독 후보를 먼저 격리 검증한다. 두 보표의 이미지 근거와 기존 리듬
     모순이 모두 있을 때만 내부 그래프의 박자 해석을 재시도하며, 점음표/붙임줄 전체 해결과 구별한다.
5. 별도 PR·CI·판단에 따른 병합 후 VM 배포 및 동일 입력 재검증을 수행한다.

## Completion criteria

- 같은 원본에서 9/8과 원본의 확인 가능한 음높이·시작 박·길이가 실제로 개선된다.
- PDF에 없는 음표나 박자를 결과 JSON에 사후 하드코딩해 넣지 않는다.
- 정상 기준 악보에 유해한 회귀가 없고 JVM 동시성 1·시간/메모리 상한을 지킨다.
- 실패하거나 애매한 후보는 성공으로 취급하지 않고 선택 근거를 기록한다.
- 앱의 tempo precedence와 canonical 계약을 유지한다.
- 작업 결과와 한계, 실행 명령과 결과가 저장소에 남는다.

## Out of scope

- 원본 PDF 영구 보관, 기존 악보 일괄 변경, 유일한 운지 정답 추정.
- 비용/권한 확인 없는 외부 유료 OMR 서비스 도입.

References: Audiveris 5.11.0 source and official HEADERS, SCALE, scanning, font documentation.
