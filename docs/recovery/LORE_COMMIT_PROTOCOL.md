# Lore Commit Protocol

ClairKeys의 커밋은 변경 목록이 아니라 결정의 이유와 검증 근거를 다음 세션에 전달해야 한다. 모든 새 커밋은 아래 형식을 따른다.

## 형식

```text
<intent line: 무엇을 바꿨는지가 아니라 왜 바꿨는지 한 줄로 작성>

<body: 문제 맥락, 제약, 선택한 접근의 이유>

Constraint: <결정을 제한한 외부 조건>
Rejected: <검토했지만 선택하지 않은 대안> | <거절 이유>
Confidence: <low|medium|high>
Scope-risk: <narrow|moderate|broad>
Reversibility: <clean|messy|irreversible>
Directive: <후속 작업자가 지켜야 할 경고 또는 규칙>
Tested: <실행한 검증과 결과>
Not-tested: <검증하지 못한 범위>
Related: <관련 PR, 이슈, 결정 문서>
```

## 필수 규칙

1. 첫 줄은 명령형 또는 결과 중심의 변경 요약이 아니라 변경이 필요한 이유를 설명한다.
2. 본문은 맥락과 접근 이유를 기록한다. 단순 파일 목록은 쓰지 않는다.
3. `Confidence`와 `Scope-risk`를 반드시 기록한다.
4. 검증을 실행했으면 `Tested`, 실행하지 못한 범위가 있으면 `Not-tested`에 사실대로 기록한다.
5. 대안을 실제로 검토했다면 `Rejected`, 후속 변경 시 주의점이 있으면 `Directive`를 남긴다.
6. trailer는 빈 줄 뒤에 `Key: value` 형식으로 작성하며 같은 key를 여러 번 사용할 수 있다.
7. 커밋 전 `git log -1 --format=full`로 메시지 구조를 확인하고, 검증 기록과 일치하는지 점검한다.

`Constraint`, `Rejected`, `Reversibility`, `Directive`, `Related`는 해당 정보가 있을 때 사용한다. 사실이 아닌 trailer를 채우기 위해 내용을 만들지 않는다.

8. 위에 정의된 key 외의 trailer는 추가하지 않는다. 특히 에이전트 서명이나 세션 링크(`Co-Authored-By:`, `Claude-Session:` 등 도구 기본값)는 넣지 않는다.

## 예시

```text
Prevent playback drift during long scores

Animation frames were scheduled from wall-clock callbacks while audio used
AudioContext time, so both paths now derive from the same monotonic clock.

Constraint: Existing animation JSON must remain readable
Rejected: Reschedule the full song on every frame | increases drift and CPU load
Confidence: high
Scope-risk: moderate
Directive: Do not introduce a second playback clock
Tested: Scheduler unit tests and 20-minute drift fixture
Not-tested: Background-tab throttling on iOS Safari
```
