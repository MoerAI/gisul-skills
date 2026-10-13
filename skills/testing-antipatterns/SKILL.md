---
name: "testing-antipatterns"
description: "private method·state 노출, production test hook, 알고리즘 복제, concrete partial mock, ambient time 등 unit testing anti-pattern을 진단하고 행동 중심 대안으로 바꾼다."
---

# Testing Anti-patterns

## 점검 절차

1. 테스트가 외부에서 관찰 가능한 결과 대신 private method, field, 내부 collection이나 호출 순서를 검증하는지 찾는다.
2. 테스트만을 위해 접근 수준을 넓히거나 production 분기·setter·전역 hook을 추가했는지 확인한다.
3. 기대 결과 계산에 production 알고리즘과 같은 로직을 복제했는지 확인한다.
4. concrete class partial mock이 외부 I/O와 도메인 계산의 혼합을 감추는지 본다.
5. 현재 시간, 난수, locale와 전역 mutable state가 테스트 간 간섭이나 flaky 결과를 만드는지 확인한다.

## 판단 규칙

- private 로직은 공개 행동을 통해 검증한다. 충분히 검증되지 않으면 죽은 코드인지, 독립 책임으로 추출할 복잡 로직인지 판단한다.
- framework가 private 요소를 실제 계약으로 사용할 때는 예외를 기록하고 가장 좁은 검증 방법을 택한다.
- 기대값은 명시적 예제, 독립 계산 또는 승인된 기준에서 얻는다. legacy characterization은 올바름이 아니라 현재 동작의 기준임을 표시한다.
- partial mock을 늘리기 전에 gateway와 계산 책임을 분리한다.
- 시간은 가능한 한 업무 행동에 값으로 전달한다. 경계에서 clock service를 쓰더라도 내부에는 고정된 값으로 전달한다.

## 보고 형식

`관찰된 패턴 → 깨질 수 있는 계약 → 왜 구현 세부인지 → 대안 → 적용 조건 → 검증 방법` 순서로 쓴다. 스타일 취향을 결함으로 보고하지 않는다.
