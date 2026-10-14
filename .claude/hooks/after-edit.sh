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
  data/*.json|data/golden/*.json|schemas/*.json)
    out="$(node scripts/validate-data.ts 2>&1)" || fail "자료 검사 실패 ($rel). 아래를 고친다:" "$out"
    out="$(node scripts/check-golden.ts 2>&1)" || fail "골든 사례가 달라졌다 ($rel). 의도한 변경인지 docs/ENGINE.md 8절대로 따진다:" "$out"
    ;;
  src/lib/engine/*.ts)
    out="$(node scripts/check-golden.ts 2>&1)" || fail "엔진을 고친 뒤 골든 사례가 달라졌다 ($rel):" "$out"
    ;;
  src/*|tests/*|scripts/*)
    if [ -f scripts/guard/floor-guard.ts ]; then
      out="$(node scripts/guard/floor-guard.ts "$rel" 2>&1)" || fail "품질 바닥선 위반 ($rel):" "$out"
    fi
    ;;
esac
exit 0
