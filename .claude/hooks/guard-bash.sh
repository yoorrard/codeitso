#!/usr/bin/env bash
# PreToolUse(Bash) 훅: 되돌리기 어려운 명령을 막는다. 막으면 종료 코드 2와 이유(표준 오류)를 Claude에게 준다.
# 자율 실행에서 일을 잃지 않게 하려는 것이다. 작업 브랜치로 푸시하는 것은 막지 않는다.
set -u
input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty')"
[ -z "$cmd" ] && exit 0

block() {
  echo "막음: $1" >&2
  echo "대신: $2" >&2
  exit 2
}

# 커밋 메시지 안의 낱말 때문에 잘못 막지 않게, heredoc 본문과 따옴표 안 내용을 지운 사본으로 검사한다.
bare="$(printf '%s\n' "$cmd" | awk '
  skip { if ($0 == delim) { skip = 0 }; next }
  {
    line = $0
    if (match(line, /<<-?[[:space:]]*["\047]?[A-Za-z_][A-Za-z0-9_]*["\047]?/)) {
      d = substr(line, RSTART, RLENGTH); sub(/^<<-?[[:space:]]*/, "", d); gsub(/["\047]/, "", d)
      delim = d; skip = 1
    }
    print line
  }' | sed -E "s/'[^']*'//g; s/\"[^\"]*\"//g")"

# 1. 강제 푸시와 기본 브랜치 푸시
if printf '%s' "$bare" | grep -Eq 'git[^|;&]*push[^|;&]*(--force([^-]|$)|[[:space:]]-f([[:space:]]|$))'; then
  block "git push --force" "git push -u origin <작업 브랜치>. 이미 합쳐진 기록만 있는 브랜치를 새로 만들 때만 --force-with-lease를 쓴다."
fi
if printf '%s' "$bare" | grep -Eq 'git[^|;&]*push[^|;&]*[[:space:]](origin[[:space:]]+)?(main|master)([[:space:]]|$|:)'; then
  block "main/master로 바로 푸시" "작업 브랜치(claude/...)로 푸시한다."
fi

# 2. 검사 건너뛰기
if printf '%s' "$bare" | grep -Eq -- '--no-verify|core\.hooksPath'; then
  block "검사 건너뛰기(--no-verify)" "실패한 검사를 고친 뒤 커밋한다."
fi

# 3. 작업을 통째로 지우는 명령
if printf '%s' "$bare" | grep -Eq 'git[[:space:]]+reset[[:space:]]+--hard|git[[:space:]]+clean[[:space:]]+-[a-zA-Z]*f|git[[:space:]]+(checkout|restore)[[:space:]]+(--[[:space:]]+)?\.([[:space:]]|$)'; then
  block "작업 내용을 통째로 지우는 git 명령" "파일 하나만 되돌릴 때는 git restore <경로>, 잠시 치워 둘 때는 git stash."
fi
if printf '%s' "$bare" | grep -Eq 'rm[[:space:]]+-[a-zA-Z]*r[a-zA-Z]*f?[[:space:]]+(/|~|\$HOME|\.|\*)([[:space:]]|$)'; then
  block "폴더 통째로 지우기" "지울 경로를 정확히 적는다 (예: rm -rf dist .qa)."
fi

# 4. 배포와 비밀 값 (사람이 계정·토큰을 준비한 뒤 GitHub Actions로만 한다)
if printf '%s' "$bare" | grep -Eq 'wrangler[^|;&]*(deploy|secret[[:space:]]+put)|wrangler[^|;&]*d1[^|;&]*--remote'; then
  block "Cloudflare 실제 배포·원격 D1·비밀 값 명령" "로컬(--local)로 시험하고, 실제 배포는 docs/HUMAN.md의 계정 준비 뒤 GitHub Actions가 한다."
fi

# 5. 골든 기대값을 바꾸는 커밋에는 이유가 있어야 한다
if printf '%s' "$cmd" | grep -Eq 'git[^|;&]*commit'; then
  # 내용이 바뀐 골든 파일만 본다 (이름만 옮긴 것은 제외). 'git add -A && git commit'처럼 한 줄에 쓰는 경우도 잡으려고 HEAD와 비교한다.
  # name-status에서 R100(내용 그대로 이름만 옮김)은 빼고, 나머지 줄의 마지막 경로가 data/golden/이면 내용이 바뀐 것이다.
  if git -C "${CLAUDE_PROJECT_DIR:-.}" diff HEAD -M --name-status 2>/dev/null | awk '$1 != "R100" {print $NF}' | grep -q '^data/golden/'; then
    if ! printf '%s' "$cmd" | grep -q '골든'; then
      block "골든 기대값 변경을 이유 없이 커밋" "커밋 메시지에 '골든: case-NN 무엇을 왜 바꿨는지'를 적는다 (docs/ENGINE.md 8절)."
    fi
  fi
fi
exit 0
