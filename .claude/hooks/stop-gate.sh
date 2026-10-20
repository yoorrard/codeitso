#!/usr/bin/env bash
# Stop 훅: 코드·자료를 바꾼 채 검사가 실패하는 상태로 멈추지 못하게 붙잡는다.
# 연달아 최대 3번까지만 붙잡고(무한 반복 방지), 검사가 통과하거나 바꾼 것이 없으면 횟수를 지운다.
# 같은 변경으로 이미 통과했으면 건너뛴다(간소화 2026-10-20).
set -u
input="$(cat)"
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0
[ -d node_modules ] || exit 0
sid="$(printf '%s' "$input" | jq -r '.session_id // "x"')"
cnt_file="${TMPDIR:-/tmp}/cc-stop-$sid"

# 커밋하지 않은 변경 중 검사 대상이 있을 때만 돈다.
changed="$(git status --porcelain 2>/dev/null | awk '{print $NF}' | grep -E '^(src|data|schemas|scripts|tests)/' || true)"
if [ -z "$changed" ]; then
  rm -f "$cnt_file"
  exit 0
fi

# 마지막으로 통과한 뒤 바뀐 것이 없으면 다시 돌리지 않는다 (같은 변경에 검사를 되풀이하지 않게)
pass_file="node_modules/.cc-check-pass"
state="$( { git diff HEAD -- src data schemas scripts tests; git ls-files --others --exclude-standard -- src data schemas scripts tests | xargs -r sha1sum; } 2>/dev/null | sha1sum | cut -d' ' -f1)"
if [ "$state" = "$(cat "$pass_file" 2>/dev/null)" ]; then
  rm -f "$cnt_file"
  exit 0
fi

if out="$(npm run --silent check 2>&1)"; then
  echo "$state" > "$pass_file"
  rm -f "$cnt_file"
  exit 0
fi

n=$(( $(cat "$cnt_file" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$cnt_file"
[ "$n" -gt 3 ] && exit 0
msg="멈추기 전에 ($n/3): npm run check가 실패한다. 고치고 다시 돌린 뒤 끝낸다."
[ "$n" -eq 3 ] && msg="마지막 붙잡기 (3/3): 고칠 수 없으면 docs/TASKS.md 진행 기록에 '막힘: 이유'를 적고 다음 작업으로 넘어간다."
echo "$msg" >&2
printf '%s\n' "$out" | tail -n 60 >&2
exit 2
