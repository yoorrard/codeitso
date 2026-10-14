#!/usr/bin/env bash
# PostToolUse(Edit|Write) 훅: 고친 파일 종류에 맞는 빠른 검사를 바로 돌린다.
# 실패하면 종료 코드 2로 결과를 Claude에게 보여 준다 (이미 고친 뒤라 되돌리지는 않는다).
set -u
file="$(cat | jq -r '.tool_input.file_path // empty')"
[ -z "$file" ] && exit 0
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
rel="${file#"$root"/}"
cd "$root" || exit 0
[ -d node_modules ] || exit 0

fail() {
  echo "$1" >&2
  printf '%s\n' "$2" | tail -n 40 >&2
  exit 2
}

case "$rel" in
  # 진열대 자료(data/catalog/**)는 npm run import가 쓰고 tests/import가 스키마를 본다 (v5, 손으로 고치지 않는다)
  src/*|tests/*|scripts/*)
    if [ -f scripts/guard/floor-guard.ts ]; then
      out="$(node scripts/guard/floor-guard.ts "$rel" 2>&1)" || fail "품질 바닥선 위반 ($rel):" "$out"
    fi
    ;;
esac
exit 0
