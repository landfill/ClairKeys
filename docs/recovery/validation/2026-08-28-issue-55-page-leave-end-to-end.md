# 이슈 #55 종단 확인 — 화면을 벗어나도 결과가 저장된다 (2026-08-28)

이슈 [#55](https://github.com/landfill/ClairKeys/issues/55)의 마지막 고리를 확인한 기록.
배포 자체와 그 사전 확인은 `2026-08-28-omr-callback-vm-deployment.md`에 있다.

## 이 검증이 필요했던 이유

배포 기록까지는 **생산자 절반**만 증명돼 있었다. 콜백이 발사되어 Vercel에 도달하고, 공유
비밀이 수락되고, DB 조회까지 도달한다는 것(404 응답)까지다. 증명되지 않은 것은 그 조회가
**성공**해 결과가 실제로 저장되는 경로였다 — 인증된 브라우저 세션이 필요해 에이전트가 만들 수
없는 조건이다.

또한 이 검증은 **업로드 화면을 벗어나야만** 성립한다. 화면에 머무르면 5초 폴링이 콜백 없이도
결과를 저장하므로, 머무른 채 성공한 업로드는 아무것도 증명하지 않는다.

## 수행

사용자가 웹앱에서 PDF를 업로드하고 업로드 화면을 벗어난 뒤, 악보가 저장된 것을 확인했다.
서비스 측 근거는 아래와 같다.

- 환경: 배포된 `clairkeys-omr:acf25f8` (= `:current`, `12b9a021fad9`), 101.79.16.73:3000
- job: `0309f4a3-1130-482a-9698-fef933f395f6`

## 근거

컨테이너 로그:

```
INFO:app:Successfully completed job 0309f4a3-1130-482a-9698-fef933f395f6
INFO:app:Delivered completed job 0309f4a3-1130-482a-9698-fef933f395f6 to https://clairkeys.vercel.app/api/omr/finalize
```

서비스 상태:

| 항목 | 값 | 의미 |
|---|---|---|
| `status` | `completed` | 변환 성공 |
| `delivery_status` | **`delivered`** | 콜백이 2xx를 받았다 |
| 이 job의 `Completion callback … returned` 로그 | **0건** | 재시도 없이 **첫 시도에 전달** |
| 결과 노트 수 | 411 | 결과가 실제로 존재한다 |

`Delivered`는 `notify_completion`이 2xx를 받은 경우에만 기록한다. 그리고 finalize는 2xx를
돌려주기 전에 `/result` 수거와 Supabase 저장, 행 갱신을 모두 마쳐야 한다. 따라서 이 한 줄이
아래 전 구간이 실행됐음을 뜻한다.

```
변환 완료 → 콜백 발사 → 공유 비밀 인증 → omrJobId로 행 조회 성공
        → GET /result 수거 → service-role key로 Supabase 저장 → 행을 completed로 갱신 → 2xx
```

재시도 0건은 부수적으로 업로드 경합(`omrJobId`가 `/process` 응답 이후에 기록되는 창)이 이번
실행에서는 발생하지 않았음을 뜻한다. 404 재시도 정책은 그 창을 위해 남아 있으며, 이번 결과가
그 정책을 불필요하게 만들지는 않는다.

## 이로써 닫히는 것

**이슈 #55의 결함은 제거됐다.** 저장 트리거가 더 이상 마운트된 브라우저에 의존하지 않는다.
브라우저 폴링은 idempotent fallback으로 남아 있으며 D-018이 그 이유를 기록한다.

## 이로써 닫히지 않는 것

- **영속 전달은 여전히 없다.** job 상태와 전달 재시도는 OMR 프로세스 메모리에 있다. 프로세스·
  컨테이너·호스트가 재시작하면 진행 중이던 job과 그 전달 태스크가 함께 사라진다. D-018이 이를
  P1-B queue 범위로 명시하며, 이번 확인을 영속 큐 완료로 표현하지 않는다.
- **12회 소진 시나리오는 실 서비스에서 관측되지 않았다.** 합성 job으로 12회 소진과
  `delivery_status=failed`를 확인했을 뿐, 실제 사용자 job이 전달에 실패했을 때 폴링 fallback이
  이를 회수하는 경로는 실측하지 않았다.
- **미해결 리뷰 항목** R6(`omrJobId` 인덱스 부재), R8(finalize의 no-op DB 왕복과 오해 소지
  주석), R10(`NEXTAUTH_URL` 미설정 시 요청 origin fallback), R11(`alreadyStored`가
  `processingStatus`를 갱신하지 않음)은 그대로 남아 있다. `docs/recovery/reviews/PR-68.md` 참조.
- **systemd unit의 재시작 quirk**도 그대로다. 배포 기록에 상세가 있다.
