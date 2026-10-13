#!/usr/bin/env bash
# PreToolUse(Edit|Write) 훅: 손으로 고치면 안 되는 파일을 막는다.
set -u
file="$(cat | jq -r '.tool_input.file_path // empty')"
[ -z "$file" ] && exit 0
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
rel="${file#"$root"/}"

block() {
  echo "막음: $rel — $1" >&2
  exit 2
}

case "$rel" in
  docs/examples/*.md) block "엔진이 만든 예시다. 자료나 엔진을 고친 뒤 npm run examples로 다시 만든다." ;;
  package-lock.json) block "npm install/npm ci가 만든다. 손으로 고치지 않는다." ;;
  node_modules/*|dist/*|.astro/*) block "만들어지는 폴더다. 원본을 고친다." ;;
  assets-src/art/*) block "소유자가 준 그림 원본(이미지 생성·Tripo3D)이다. 고치지 않고 npm run art가 같은 조명으로 굽는다 (CLAUDE.md 꼭 지킬 것 12, CONCEPT 9절)." ;;
  public/fonts/*|src/styles/fonts.css) block "npm run fonts가 만든다. 손으로 고치지 않는다." ;;
  public/emoji/*) block "node scripts/assets/fetch-emoji.ts가 만든다. 목록은 스크립트에서 고친다." ;;
  .env|.env.*|*/.env|*/.env.*|.dev.vars)
    case "$rel" in *.example) exit 0 ;; esac
    block "비밀 값 파일은 만들지 않는다. 비밀 값은 GitHub Secrets(사람이 넣음)에만 둔다." ;;
esac
exit 0
