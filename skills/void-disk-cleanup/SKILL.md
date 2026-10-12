---
name: "void-disk-cleanup"
description: "디스크 용량 부족·빌드 캐시·node_modules·에이전트 worktree 정리 요청 시, Void(void CLI/MCP)로 읽기 전용 스캔 후 사용자가 승인한 계획만 적용한다. Disk space, build cache, dev artifact cleanup with Void."
---

# Void로 개발 디스크 정리

Void는 로컬에서 개발 부산물(빌드 산출물, 패키지 캐시, 에이전트 worktree·대화 기록, 로컬 AI 모델, Docker 캐시)을 찾아 위험도(safe / caution / danger)를 붙이고, 검토된 계획만 실행하는 도구다. 정리는 되돌리기 어려우므로 **스캔과 계획은 자유롭게, 적용은 사용자 승인 후에만** 한다.

## 실행 절차

1. Void를 확인한다. MCP 도구(`disk_status`, `scan`, `explain_item`, `plan_cleanup`, `apply_plan`, `usage_by_agent`)가 보이면 그것을 쓰고, 아니면 `command -v void`로 CLI를 찾는다. 둘 다 없으면 설치하지 말고 사용자에게 알린 뒤 멈춘다. 설치 안내: https://github.com/eladbash/void

2. 현황을 본다. `disk_status` 또는 `void --json guard check`로 여유 공간을 확인하고, `scan` 또는 `void --json scan`으로 회수 후보를 얻는다. 스캔은 아무것도 바꾸지 않는다. 생태계별·위험도별 합계와 큰 항목 상위 10개(경로, 크기, 경과 일수, 위험도)를 요약하면 완료한다.
   - CLI 스캔·계획에는 시간 제한을 건다. macOS에는 `timeout`이 없으므로 `perl -e 'alarm shift; exec @ARGV' 120 void --json scan`처럼 실행한다.
   - 제한 시간을 넘기면 결과를 기다리지 말고, macOS 권한 대화상자가 응답을 기다리는지 확인한다: `log show --last 10m --style compact --predicate 'subsystem == "com.apple.TCC" AND eventMessage CONTAINS "AUTHREQ_PROMPTING"'`. 대화상자가 떠 있으면 서비스 이름과 요청 주체를 그대로 보고하고, 사용자가 화면에서 응답할 때까지 스캔을 다시 돌리지 않는다. 개발 캐시 정리에는 다른 앱 데이터 접근이나 전체 디스크 접근 권한이 필요 없으므로 "허용 안 함"을 권한다.

3. 후보를 걸러낸다. 아래 항목은 Void가 safe로 분류해도 계획에서 뺀다.
   - 실행 중인 서비스나 배포 릴리스가 쓰는 경로(예: `*/releases/*/node_modules`, 현재 돌고 있는 앱의 의존성)
   - 지금 작업 중이거나 최근 7일 안에 수정된 프로젝트의 산출물
   - 사용자가 보존을 요청한 경로
   - 실행 중인 프로세스가 작업 디렉터리로 쓰는 프로젝트(`lsof -d cwd`)
   - Void 설정의 `blocked_paths` 아래 항목. Void는 이 경로를 계획에는 그대로 보여주고 적용 단계에서만 거부하므로, 보고에서 미리 빼고 "보호 경로"로 따로 적는다.
   애매하면 `explain_item`(또는 `void scan` 결과의 `available_actions`)으로 실제 실행될 명령을 확인한다.

4. 계획을 만든다. `plan_cleanup` 또는 `void plan`으로 dry-run 계획을 만들고, 항목별로 실행될 명령·예상 회수 용량·위험도를 사용자에게 보여준다. 계획은 1시간 뒤 만료된다.

5. 승인을 받는다. 사용자가 이 계획을 명시적으로 승인하기 전에는 `apply_plan` / `void apply`를 호출하지 않는다. 승인 범위를 벗어난 항목을 추가하지 않는다. 계획이 만료됐으면 다시 만들고 다시 승인받는다.

6. 적용하고 검증한다. 승인된 계획 ID로만 적용하고, 적용 후 `disk_status`로 실제 회수량을 다시 재서 계획 대비 결과를 보고하면 완료한다. pnpm·Bun 저장소와 하드링크나 APFS 복제로 블록을 공유하는 `node_modules`는 지워도 공간이 덜 늘 수 있으므로, Void가 보고한 회수량과 실제 증가한 여유 공간을 함께 적는다.

## 금지

- danger 등급 항목, `docker system prune -a --volumes`, 홈·프로젝트 루트 통째 삭제는 하지 않는다.
- Void를 거치지 않고 `rm -rf`로 직접 지우지 않는다.
- 프로세스를 이름만 보고 종료하지 않는다.
- 이 스킬을 읽었다는 사실이 정리 실행 권한을 주지 않는다. 실행 권한은 사용자 승인과 런타임의 도구 정책이 정한다.

## 보고 형식

- 여유 공간(전/후), 회수 후보 총량, 위험도별 합계
- 제외한 항목과 이유
- 적용한 계획 ID와 실제 회수량, 실패한 항목
