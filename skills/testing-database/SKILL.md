---
name: "testing-database"
description: "database integration test를 실제 DBMS, schema migration, transaction boundary, reference data와 test data lifecycle 기준으로 설계·리뷰한다. ORM·query·persistence 회귀를 신뢰성 있게 검증할 때 사용한다."
---

# Database Testing

## 1. 운영과의 일치도를 확인한다

- production과 같은 DBMS 공급자·중요 설정을 사용한다.
- schema와 애플리케이션이 수정하지 않는 reference data를 version control과 migration으로 관리한다.
- 개발자·병렬 worker·테스트 실행 간 DB 인스턴스 또는 schema 충돌을 막는다.
- 다른 제품의 in-memory DB 통과를 production DB 동작의 증거로 쓰지 않는다.

## 2. 전달 방식을 선택한다

운영 데이터가 없고 재생성이 쉬우면 state-based schema sync가 가능하다. 기존 데이터 보존·변환이 필요하면 순서가 명시된 migration을 우선한다. 배포된 migration은 새 migration으로 보정하고, 과거 파일 수정의 배포 위험을 확인한다.

## 3. 트랜잭션 경계를 보존한다

업무 행동의 여러 write가 하나의 원자적 계약인지 확인한다. repository별 임의 transaction이나 test-only 상위 transaction이 production의 commit·rollback 경계를 바꾸지 않게 한다.

## 4. 데이터 수명을 통제한다

- 각 테스트 시작 시 일반 데이터를 정리한다. 이전 실행이 중단돼도 새 테스트가 깨끗하게 시작해야 한다.
- foreign key 순서를 고려하고 reference data는 보존한다.
- 테스트가 만든 데이터 식별자와 cleanup 범위를 명확히 한다.
- backup 복원, 새 container, 병렬화는 측정된 병목과 격리 요구가 있을 때 선택한다.

## 5. 읽을 수 있는 테스트를 유지한다

기술적 setup은 factory/helper로 줄이되 업무상 중요한 입력과 assertion을 테스트 본문에 남긴다. 저장 후 실제 read path를 통해 결과를 확인한다.

## 완료 증거

DBMS/version, migration revision, transaction 경계, 초기화 방식, 실행 명령, 시나리오별 결과와 production과 다른 설정을 보고한다.
