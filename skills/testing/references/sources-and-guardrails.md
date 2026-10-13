# 출처와 가드레일

## 출처

- Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns*, Manning, 2020.
- [O'Reilly Learning 판본](https://learning.oreilly.com/library/view/unit-testing-principles/9781617296277/): 정식 접근 권한으로 목차와 1–11장을 확인해 절차와 장별 요약을 작성했다.
- [Manning 도서 페이지](https://www.manning.com/books/unit-testing): 저자, 출판사와 판본 범위를 확인할 때 사용한다.

이 스킬팩은 저자나 출판사의 공식 제품·인증이 아니다. 원문, 사례 코드와 도표를 복제하지 않고 독립적인 작업 절차로 재구성했다.

## 고정 법칙으로 만들지 않을 것

- 고전식·런던식, 기능적 아키텍처, test pyramid는 맥락에 따른 선택이다.
- mock 개수, assertion 개수, fixture 크기, coverage 비율에 보편 수치 기준을 두지 않는다.
- 실제 DB 사용 원칙은 fidelity를 위한 기본값이지, 모든 PR에서 무거운 환경을 실행하라는 뜻이 아니다.
- 책의 .NET 예시와 도구 선택을 다른 언어·프레임워크에 그대로 강제하지 않는다.
- 테스트하기 쉬움은 좋은 설계의 충분조건이 아니며, 테스트 통과는 운영 준비의 증명이 아니다.

## 이 스킬팩이 추가한 운영 규칙

- 리뷰·구현·실행·외부 게시 권한을 분리한다.
- revision, 환경, 실행 명령과 관찰 범위를 기록한다.
- 요구사항, 소스 추적, 실행 확인과 추정을 구별한다.
- 기존 사용자 변경을 덮어쓰거나 무관한 테스트를 약화하지 않는다.
- 장문의 원문이나 책을 대체할 정도의 재구성을 추가하지 않는다.
