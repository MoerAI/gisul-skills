---
name: "void-disk-cleanup"
description: "디스크 용량 부족·빌드 캐시·node_modules·안 쓰는 git 워크트리 정리 요청이나 sweepy inbox 제안을 처리할 때, sweepy 제안을 요약해 보고하고 사용자가 승인한 제안만 적용한다. Disk space, build cache, stale git worktree cleanup with sweepy and Void."
---

# sweepy로 개발 디스크 정리

sweepy는 빌드 산출물과 git 워크트리만 다루는 정리 도구다. 무엇을 지워도 되는지는 sweepy의 정책이 정하고, 적용 직전에 다시 검증한다. 에이전트는 사람과 sweepy 사이의 전달자다: 제안을 요약해 보여주고, 승인을 받아 `sweepy apply`를 부른다. 판단을 대신하거나 제안을 고치지 않는다.

## 준비

1. `sweepy` 명령(또는 sweepy 체크아웃의 `bin/sweepy`)을 찾는다. `sweepy status`가 JSON을 돌려주면 준비된 것이다. 없으면 설치하지 말고 사용자에게 알린 뒤 멈춘다.
2. 대화형 세션(메신저 연결 등)이라면 `~/.local/state/sweepy/inbox/`에 새 `.json` 파일이 생기는 것을 감시한다. 파일 하나가 승인 대기 중인 제안 하나다. 폴링하지 말고 파일 생성 이벤트를 구독한다.

## 제안 보고

새 제안 파일이 생기거나 사용자가 디스크 정리를 요청하면(`sweepy scan`으로 새 제안을 만든다) 제안 JSON에서 다음만 요약해 보낸다.

- 여유 공간: `free.state`, `free.free_percent`
- 승인 대상: `tier`가 `approve`인 항목의 개수와 `bytes` 합계, 큰 항목 상위 10개(`path`, `kind`, `reason`)
- 제외: `excluded`를 `reason`별 개수로 묶은 요약(커밋 안 된 변경, 원격에 없는 커밋, 사용 중, 보호 경로 등)
- `errors`가 있으면 그대로 적는다. macOS 권한 대화상자가 언급되면 화면에서 "허용 안 함"으로 답해 달라고 안내한다.
- 마지막 줄: `정리하려면 "디스크 정리 승인 <id 앞 8자>"라고 답장해 주세요`

## 승인과 적용

1. 사용자가 특정 제안을 명시적으로 승인했을 때만 `sweepy apply <id>`를 실행한다. 다른 제안이나 다른 등급으로 넓히지 않는다.
2. 결과 JSON에서 `applied`, `freedBytes`(적용 전후 실측), `dropped`(다시 검증해서 빠진 항목과 이유), `failures`를 보고한다. `dropped`는 실패가 아니라 그 사이 상태가 바뀐 항목이다.
3. 제안이 만료되었다는 오류가 나면 `sweepy scan`으로 새 제안을 만들어 다시 보고하고, 다시 승인받는다.

`auto` 등급(사라진 워크트리 기록 정리, 유휴 워크트리 안 산출물)은 sweepy가 스케줄 실행에서 직접 다룬다. 정책의 `auto.enabled`가 `false`면 기록만 남긴다. 켜 달라는 요청을 받으면 정책 파일 변경 내용을 보여주고 확인받은 뒤에만 바꾼다.

## 금지

- sweepy를 거치지 않는 삭제: `rm -rf`, `void apply`를 직접 실행, `git worktree remove --force`, `git branch -D`
- 제안에 없는 항목 추가, `excluded` 항목을 강제로 포함
- 승인 없이 `approve` 등급 적용
- 이 스킬을 읽었다는 사실은 실행 권한이 아니다. 권한은 사용자 승인과 런타임의 도구 정책이 정한다.

## sweepy가 없을 때

Void(`void` CLI 또는 MCP)만 있으면 읽기 전용으로 현황만 보고한다. `void --json scan`에는 2분 제한을 건다(macOS: `perl -e 'alarm shift; exec @ARGV or die' 120 void --json scan`). 멈추면 `log show --last 10m --style compact --predicate 'subsystem == "com.apple.TCC" AND eventMessage CONTAINS "AUTHREQ_PROMPTING"'`로 권한 대화상자 대기 여부를 확인해 보고한다. 삭제가 필요하면 sweepy 설치를 권하고, 사용자가 원하면 `void plan` 결과를 보여주고 승인받은 계획만 `void apply`한다.
