#!/usr/bin/env bash
# Stop 훅: 코드·자료를 바꾼 채 검사가 실패하는 상태로 멈추지 못하게 한 번 붙잡는다.
# stop_hook_active면 이미 붙잡힌 뒤이므로 다시 막지 않는다 (무한 반복 방지).
set -u
input="$(cat)"
[ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = "true" ] && exit 0
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0
[ -d node_modules ] || exit 0

# 커밋하지 않은 변경 중 검사 대상이 있을 때만 돈다.
changed="$(git status --porcelain 2>/dev/null | awk '{print $NF}' | grep -E '^(src|data|schemas|scripts|tests)/' || true)"
[ -z "$changed" ] && exit 0

if ! out="$(npm run --silent check 2>&1)"; then
  echo "멈추기 전에: npm run check가 실패한다. 고치고 다시 돌린 뒤 끝낸다. 고칠 수 없는 이유가 있으면 docs/TASKS.md 진행 기록에 '막힘: 이유'를 적는다." >&2
  printf '%s\n' "$out" | tail -n 60 >&2
  exit 2
fi
exit 0
