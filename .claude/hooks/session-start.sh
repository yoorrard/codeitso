#!/usr/bin/env bash
# SessionStart 훅: 클라우드 세션이면 의존성을 맞추고, 지금 할 일을 짧게 알려 준다.
# 표준 출력은 Claude의 맥락으로 들어간다. 길게 쓰지 않는다.
set -u
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0

# 1. 의존성: node_modules가 없거나 package-lock.json이 바뀌었으면 설치한다.
if [ -f package-lock.json ]; then
  stamp="node_modules/.cc-lock-hash"
  want="$(sha1sum package-lock.json | cut -d' ' -f1)"
  have="$(cat "$stamp" 2>/dev/null || true)"
  if [ ! -d node_modules ] || [ "$want" != "$have" ]; then
    if npm ci --no-audit --no-fund >/tmp/cc-npm-ci.log 2>&1; then
      echo "$want" > "$stamp"
      echo "의존성 설치: npm ci 완료"
    else
      echo "의존성 설치 실패: /tmp/cc-npm-ci.log 를 읽고 고친다 (네트워크 문제면 다시 시도)."
    fi
  fi
fi

# 2. Playwright는 컨테이너에 있는 Chromium을 쓴다 (내려받지 않는다).
if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -d /opt/pw-browsers ]; then
  {
    echo 'export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers'
    echo 'export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1'
  } >> "$CLAUDE_ENV_FILE"
fi
# 도구가 몰래 사용 통계를 보내지 않게 (사이트와 같은 원칙: 추적 없음)
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  {
    echo 'export ASTRO_TELEMETRY_DISABLED=1'
    echo 'export WRANGLER_SEND_METRICS=false'
  } >> "$CLAUDE_ENV_FILE"
fi

# 3. 지금 상태 한눈에: 마지막 진행 기록 한 줄과 사람 대기열 (v5: 할 일은 CLAUDE.md '지금 상태')
if [ -f docs/TASKS.md ]; then
  last="$(grep -E '^20[0-9]{2}-' docs/TASKS.md | tail -n 1 | cut -c1-160)"
  echo "코드잇소 마지막 진행: ${last:-없음}. 다음 할 일은 CLAUDE.md '지금 상태'."
fi
if [ -f docs/HUMAN.md ]; then
  open_h="$(grep -cE '^- \[ \]' docs/HUMAN.md || true)"
  echo "사람 확인 대기열(docs/HUMAN.md): ${open_h}건. 기다리지 말고 다른 작업을 계속한다."
fi
exit 0
