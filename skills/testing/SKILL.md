---
name: "testing"
description: "테스트 전략을 설계·리뷰하고 unit test, integration test, mock, database test, testability와 anti-pattern 전문 절차를 선택한다. Unit Testing Principles, Practices, and Patterns 기반으로 coverage보다 회귀 방지, refactoring 내성, 빠른 피드백과 유지비를 함께 판단할 때 사용한다."
---

# Testing

테스트 수나 coverage를 목표로 삼지 말고, 중요한 동작을 낮은 유지비로 오래 보호하는 테스트 포트폴리오를 만든다. 이 스킬은 진입점이다. 세부 작업에는 필요한 `testing-*` 전문 스킬만 읽는다.

책의 장별 근거와 적용 범위는 [chapter guide](references/chapter-guide.md), 출처·가드레일은 [sources and guardrails](references/sources-and-guardrails.md)를 확인한다.

## 1. 계약과 위험을 고정한다

1. 요구사항, 공개 API, 소비자, 저장 결과와 외부 효과에서 관찰 가능한 계약을 적는다.
2. 핵심 도메인 규칙, 장애 시 손실, 변경 빈도와 회귀 영향으로 우선순위를 정한다.
3. 현재 구현, 의도된 계약, 테스트가 우연히 고정한 동작을 구별한다.
4. 리뷰는 읽기 전용이다. 구현·실행·commit·push 권한은 별도로 확인한다.

## 2. 테스트 층을 배정한다

- 메모리 안의 결정과 도메인 규칙은 빠른 단위 테스트를 우선한다.
- 실제 구성, 영속화, 프레임워크 매핑과 관리 대상 의존성은 통합 테스트로 확인한다.
- 외부에 보이는 비관리 의존성은 경계에서 계약을 검증한다.
- E2E는 통합 테스트만으로 충분히 확인하기 어려운 소수의 중요 시스템 경로에 사용한다. 로컬·CI의 배포 유사 환경이나 실제 배포 환경 중 주장에 맞는 곳에서 실행한다.

가장 낮은 층을 무조건 고르지 않는다. 주장하려는 계약을 실제로 관찰할 수 있는 가장 낮은 비용의 층을 고른다.

## 3. 테스트 가치를 평가한다

각 테스트를 다음 네 축으로 본다.

- **회귀 방지:** 중요한 코드와 결과를 실제로 검증하는가.
- **리팩터링 내성:** 동작이 같은 내부 변경에 불필요하게 실패하지 않는가.
- **빠른 피드백:** 개발 흐름에서 반복 실행할 수 있는가.
- **유지보수성:** 준비, 이해, 수정과 환경 운영 비용이 감당 가능한가.

낮은 coverage는 조사 신호지만 높은 coverage는 품질 증거가 아니다. 테스트가 코드를 실행하기만 하고 결과를 검증하지 않을 수 있다.

## 4. 전문 스킬을 선택한다

- 구조, AAA, 이름, fixture, parameterized case: `testing-unit-design`
- mock, stub, spy와 상호작용 계약: `testing-test-doubles`
- 복잡 로직과 외부 조정의 분리: `testing-testability`
- 실제 의존성과 대표 시나리오: `testing-integration`
- DBMS, migration, transaction, test data: `testing-database`
- private 노출, 알고리즘 복제, 시간, partial mock: `testing-antipatterns`

관련 없는 전문 스킬을 모두 실행하지 않는다.

- 새 테스트 전략·구조 설계, 구현과 리팩터링에는 이 `testing` 계열을 사용한다.
- 기존 코드 변경의 테스트 충분성을 읽기 전용 finding 형식으로 리뷰할 때는 `review-tests`가 소유한다. 필요한 설계 대안만 해당 `testing-*` 스킬에서 보충한다.
- 일반적인 test code 청결성·TDD 규율은 `clean-code-tests`, UI의 연속 행동·복구 검증은 `test-behavior-flows`와 조합한다.

겹치는 규칙이 있으면 현재 작업 모드의 소유 스킬을 우선하고, 같은 발견을 중복 보고하지 않는다.

## 5. 결과를 검증한다

- 실패 전 재현과 수정 후 통과를 가능한 한 같은 조건에서 확인한다.
- mock이 위험한 경계를 제거하지 않았는지 확인한다.
- 실행하지 않은 검사를 실행했다고 쓰지 않는다.
- PASS, FAIL, 미검증, 해당 없음을 구별하고 환경·revision·명령·관찰 범위를 남긴다.
- 테스트 통과를 운영 준비, 설계 품질 또는 요구사항 완전성의 증명으로 확대하지 않는다.
