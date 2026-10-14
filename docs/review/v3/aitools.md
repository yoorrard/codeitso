# v3 조사: AI 코딩 도구 설치·설정 안내와 'AI 설정 파일' 만들기 (docs/review/v3/aitools.md)

> 쓴 날 2026-10-14 · 역할: 조사·설계. 소유자 새 요청 (4) "AI 도구 설치부터 가입·설정, 스킬·규칙·훅까지 바이브코딩 전 과정을 최신 버전 기준으로 구체적으로 안내", (5) "고르는 곳마다 직접 입력도 받기", (6) "공개 출시 완성도"에 답한다.
> 이 문서는 조사와 제안이다. 코드·자료는 아직 바꾸지 않았다. 문서 순위(PRD > CONCEPT > …)는 그대로이고, 채택하는 결정은 작업을 시작할 때 `docs/DECISIONS.md`로 옮긴다.

---

## 0. 한눈에: 결정 제안 열두 줄

1. **AGENTS.md 하나를 원본으로 삼는다.** 2026-10 지금 Claude Code·Codex·Copilot(VS Code)·Cursor·Devin Desktop(옛 Windsurf)·Antigravity가 AGENTS.md를 읽는다. Gemini CLI는 설정 한 줄이나 GEMINI.md 가져오기가 필요하다. 도구마다 다른 파일은 AGENTS.md를 가리키는 얇은 연결 파일로만 만든다 (5절).
2. **설계도 전문은 `docs/codechauffeur-plan.md`로 따로 저장한다.** AGENTS.md에는 작업 규칙 요약(1만 자 이하)만 넣는다. 가져오기(`@파일`)를 지원하는 Claude Code·Gemini CLI는 설계도를 시작할 때 함께 읽게 한다.
3. **스킬은 Agent Skills 표준 필드(`name`, `description`)만 쓴다.** 저장 위치는 `.agents/skills/`(Codex·Cursor·Gemini CLI·VS Code·Antigravity)와 `.claude/skills/`(Claude Code) 둘이다. 처음 주는 스킬은 둘: `check-step`(단계 확인), `fix-error`(에러 고치기).
4. **초심자에게 훅은 기본으로 주지 않는다.** 도구마다 형식이 달라 옮겨 쓸 수 없고(VS Code 문서가 직접 경고한다), 스크립트가 필요하다. 대신 Claude Code는 권한 규칙(`ask`·`deny`)으로 지우기·올리기·설치를 확인받고 `.env`를 막는다. 알림 훅은 선택으로만 준다.
5. **MCP는 처음 묶음에 넣지 않는다.** 위치와 형식이 도구마다 다르다(`.mcp.json`, `.cursor/mcp.json`, `~/.codex/config.toml`, `.gemini/settings.json`). 안내 페이지에서 개념과 한 가지 예만 보인다.
6. **안내 자료는 `data/guides.json` 하나에 둔다.** 도구 카드(`tools`)와 단계 안내(`guides`)로 나누고, 단계마다 OS·명령·기대 결과·막혔을 때를 적는다. 명령은 공식 문서·공식 저장소에서 그대로 옮긴 것만 쓴다 (6절).
7. **'최신'은 날짜로 지킨다.** 모든 안내에 `checkedAt`(YYYY-MM-DD)과 `reviewEveryDays`를 두고, 화면에 "2026-10-14 공식 문서로 확인" 표를 붙인다. 기한이 지나면 "확인한 지 n일 지났어요"를 보인다. 매주 CI가 지난 안내와 새 버전을 찾아 이슈로 올린다 (8절).
8. **원문을 직접 못 읽은 안내는 명령을 보이지 않는다.** `needsReview: true`인 안내는 "공식 안내 열기" 링크 카드로만 낸다. 틀린 명령을 보이는 것보다 덜 친절한 편이 낫다.
9. **AI 고르기를 두 칸으로 나눈다.** 먼저 종류(채팅·웹에서 만드는 도구·편집기·터미널), 다음에 도구 이름. 두 칸 모두 **직접 입력**이 있다. 직접 입력한 도구도 설계도·AI 설정 파일에 이름이 들어가고, 규칙 파일은 공통 AGENTS.md로 준다 (9.2절).
10. **AI 설정 파일은 '에이전트가 직접 만들게 하는 메시지'를 첫 방법으로 준다.** 숨김 폴더(`.claude/`, `.github/`)를 손으로 만들게 하지 않는다. 파일마다 복사·내려받기와 zip은 두 번째 방법이다.
11. **설정 안내는 설계도의 '준비물'로 들어간다.** "Gemini CLI 설치하기(약 15분)"가 설계도 8번과 영수증 '준비물' 개수에 잡힌다. 4단계 설계도 받기에 '내 AI 준비' 칸을 더하고, 둘러보는 곳에 `/guides`(AI 도구 안내)를 새로 둔다.
12. **다음 조사 전에 네트워크 허용 목록을 넓힌다.** 이번에는 cursor.com, developers.openai.com, docs.windsurf.com, 웹 빌더 문서가 이 환경에서 막혀 검색 요약으로만 봤다 (HUMAN 항목 제안, 10.3절).

---

## 1. 어떻게 조사했나, 얼마나 믿을 수 있나

조사한 날은 모두 **2026-10-14**다. 출처마다 아래 표를 붙인다.

| 표 | 뜻 | 믿음 |
|---|---|---|
| **[원문]** | 공식 문서 페이지를 직접 읽었다 | 높음 |
| **[저장소]** | 공식 문서가 들어 있는 공식 GitHub 저장소의 원본 파일을 읽었다(`raw.githubusercontent.com`). 게시된 사이트보다 며칠 앞설 수 있다 | 높음 |
| **[레지스트리]** | npm 레지스트리·nodejs.org 배포 목록을 직접 조회했다 | 높음(버전 번호만) |
| **[검색 요약]** | 이 환경의 프록시가 사이트를 막아(403) 검색 엔진 요약으로만 봤다. 공식 도메인 결과만 썼지만 원문 대조가 필요하다 | 중간. `needsReview: true` |
| **[기억·미확인]** | 내가 알던 내용이고 이번에 확인하지 못했다 | 낮음. 화면에 쓰지 않는다 |

직접 읽은 곳과 막힌 곳:

- 직접 읽음: `code.claude.com/docs`(설치·개요·메모리·권한 모드·권한·설정·훅·스킬·하위 에이전트·MCP·플러그인), `openai/codex` 저장소(README, docs/install.md), `google-gemini/gemini-cli` 저장소(README, 설치·GEMINI.md·스킬·훅·MCP·사용자 명령·할당량 문서), `github/docs` 저장소(Copilot 요금제·지시 파일 지원표·훅 참조·CLI 설치), `microsoft/vscode-docs` 저장소(지시 파일·스킬·프롬프트 파일·훅·MCP·하네스·Copilot 설정, 모두 `DateApproved: 10/7/2026`), `agentskills/agentskills`(스펙), `agentsmd/agents.md`(README), `nodejs/Release`(일정), npm 레지스트리.
- 막힘(검색 요약만): cursor.com, developers.openai.com, docs.windsurf.com·docs.devin.ai, docs.lovable.dev, support.bolt.new, v0.app, docs.replit.com, ai.google.dev, antigravity.google, help.openai.com, support.claude.com. (docs.github.com과 code.visualstudio.com도 막혔지만 원본 저장소로 읽었다.)

### 1.1 2026-10-14 버전 표 [레지스트리]

| 도구 | 받는 곳 | 최신 |
|---|---|---|
| Claude Code | npm `@anthropic-ai/claude-code` | 2.1.296 |
| OpenAI Codex CLI | npm `@openai/codex` | 0.162.1 |
| Gemini CLI | npm `@google/gemini-cli` | 0.64.0 (2026-10-13 갱신) |
| GitHub Copilot CLI | npm `@github/copilot` | 1.0.97 |
| Node.js | nodejs.org | 24.21.0 LTS 'Krypton'(2026-09-07). 26.11.1은 Current이고 **2026-10-28에 LTS가 된다**. 20은 2026-04-30에 지원이 끝났다 |

- npm의 `latest`와 각 도구 설치 스크립트의 채널은 다를 수 있다. Claude Code의 `stable` 채널은 보통 약 1주 늦다 [원문].
- Claude Code는 패치 번호만 올라가도 동작이 바뀐다(2.1.277부터 AGENTS.md 직접 읽기, 2.1.283부터 auto 모드가 기본) [원문]. 그래서 버전 비교보다 **날짜 기한**을 주 신호로 쓴다 (8절).

---

## 2. 2026-10 지금 달라진 큰 흐름

1. **AGENTS.md가 공통 규칙 파일이 됐다.** AGENTS.md는 2025-12-09 Linux Foundation 아래 생긴 Agentic AI Foundation(AAIF)의 첫 프로젝트 셋 중 하나다 [검색 요약: openai.com/index/agentic-ai-foundation]. 형식은 정해진 틀이 없는 마크다운이다 [저장소: agentsmd/agents.md].
2. **스킬도 공통 형식이 생겼다.** Agent Skills 스펙: 폴더 하나에 `SKILL.md`, 필수 필드 `name`(1~64자, 소문자·숫자·하이픈)과 `description`(1~1024자), 선택 `license`·`compatibility`(500자 이하)·`metadata`·`allowed-tools`(실험). 본문은 500줄 이하, 5,000 토큰 이하 권장 [저장소: agentskills/agentskills docs/specification.mdx]. 공통 위치 `.agents/skills/`를 Codex·Cursor·Gemini CLI·VS Code·Antigravity가 읽는다. Claude Code 문서의 스킬 위치 표에는 `.agents/skills/`가 없고 `.claude/skills/`를 쓴다 [원문].
3. **훅은 다들 있지만 서로 옮겨 쓸 수 없다.** VS Code 문서: "같은 훅 파일을 찾는 하네스가 있어도 동작이 같지는 않다. 이벤트 이름·매처·도구 이름·입력 모양·결정 방식이 다를 수 있다" [저장소: vscode-docs agent-customization/hooks.md].
4. **MCP 설정 위치는 도구마다 다르다.** 다만 프로젝트 루트의 `.mcp.json`(`mcpServers`)을 Claude Code(프로젝트 범위)와 VS Code(이식용 형식)가 함께 읽는다. VS Code는 `.vscode/mcp.json`을 새 서버에는 권하지 않는다고 적었다 [원문·저장소].
5. **이름이 바뀌고 합쳐졌다.**
   - Windsurf는 2026-06-02 **Devin Desktop**으로 이름이 바뀌었다. 기존 Windsurf 규칙 파일도 계속 읽는다 [검색 요약: docs.devin.ai/desktop/devin-desktop-faq, windsurf.com/changelog].
   - Codex 앱은 새 ChatGPT 데스크톱 앱으로 합쳐지는 중이다 [검색 요약: help.openai.com ChatGPT release notes].
   - VS Code는 '하네스'를 고르게 됐다: Copilot·Claude·Codex·Local. VS Code 안에서 Claude와 Codex를 돌릴 수 있다 [저장소: vscode-docs agents/run/agent-harnesses.md].
6. **Claude Code 기본값이 바뀌었다.** 2.1.277부터 CLAUDE.md가 없으면 AGENTS.md를 직접 읽는다. 2.1.283부터 터미널·VS Code 세션은 auto 모드(분류 모델이 대신 확인)로 시작한다 [원문].
7. **Node.js 기준선:** Gemini CLI는 Node 20 이상, Copilot CLI와 Claude Code npm 설치는 Node 22 이상을 요구한다 [저장소·원문]. Node 20은 지원이 끝났으므로 안내는 **Node 24 LTS**로 쓰고, 2026-10-28 뒤 26 LTS로 바꾼다.

---

## 3. 도구별 정리

각 도구를 같은 틀로 적는다: 누구에게 · 비용 방식 · 설치(OS별) · 처음 실행과 로그인 · 규칙 파일 · 스킬·훅·MCP · 초심자가 막히는 곳. 비용은 **무료로 시작할 수 있는지만** 적고, 숫자는 공식 문서에 적힌 것만 출처와 함께 둔다. 화면에는 숫자를 싣지 않는다(자주 바뀐다).

### 3.1 Claude Code (Anthropic) — 모두 [원문]

- **누구에게:** Claude 유료 구독이 있는 사람. 터미널이 무섭다면 데스크톱 앱의 Code 탭으로 시작한다. 규칙·스킬·훅·하위 에이전트·플러그인을 가장 세밀하게 고칠 수 있다.
- **비용 방식:** Pro·Max·Team·Enterprise 또는 Console 계정이 필요하다. **무료 claude.ai 요금제에는 Claude Code가 없다.** 데스크톱 앱 Code 탭도 유료 구독이 필요하다.
- **쓰는 곳:** 터미널(CLI), VS Code 확장(`anthropic.claude-code`, Cursor에도 설치 가능), JetBrains 플러그인(CLI 따로 필요), 데스크톱 앱(macOS, Windows x64·ARM64, Ubuntu·Debian은 베타), 웹 `claude.ai/code`.
- **시스템:** macOS 13.0+, Windows 10 1809+ 또는 Server 2019+, Ubuntu 20.04+, Debian 10+, Alpine 3.19+. 램 4GB+, x64·ARM64. 셸은 Bash·Zsh·PowerShell·CMD. Anthropic 지원 국가.

**설치 (권장: 기본 설치 프로그램, 자동 업데이트)**

| OS | 명령 |
|---|---|
| macOS·Linux·WSL | `curl -fsSL https://claude.ai/install.sh \| bash` |
| Windows PowerShell | `irm https://claude.ai/install.ps1 \| iex` |
| Windows CMD | `curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd` |
| Homebrew | `brew install --cask claude-code` (stable 채널, `claude-code@latest`는 latest 채널). 자동 업데이트 안 됨: `brew upgrade claude-code` |
| WinGet | `winget install Anthropic.ClaudeCode`. 자동 업데이트 안 됨: `winget upgrade Anthropic.ClaudeCode` |
| npm | `npm install -g @anthropic-ai/claude-code` (Node 22+, `sudo` 쓰지 않기) |

- 확인: 새 터미널 창에서 `claude --version` → `2.1.211 (Claude Code)` 같은 번호. 더 자세히는 `claude doctor`.
- Windows: 관리자 권한 필요 없음. Git for Windows는 선택이다. 있으면 Bash 도구, 없으면 PowerShell 도구로 명령을 돌린다. 샌드박스는 WSL 2에서만 된다.
- 업데이트: 기본 설치는 자동. 바로 하려면 `claude update`.

**처음 실행:** 프로젝트 폴더에서 `claude` → 브라우저 로그인 안내를 따른다. `/init`이 CLAUDE.md 초안을 만든다(이미 있으면 고칠 점만 제안). 터미널이 처음이면 공식 '터미널 안내'(`/docs/en/terminal-guide`)가 있다.

**규칙 파일 (메모리)**

| 범위 | 위치 |
|---|---|
| 조직 | macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`, Linux·WSL `/etc/claude-code/CLAUDE.md`, Windows `C:\Program Files\ClaudeCode\CLAUDE.md` |
| 나(모든 프로젝트) | `~/.claude/CLAUDE.md`, `~/.claude/rules/` |
| 프로젝트(팀 공유) | `./CLAUDE.md` 또는 `./.claude/CLAUDE.md`, `.claude/rules/*.md` |
| 나(이 프로젝트) | `./CLAUDE.local.md` (`.gitignore`에 넣기) |

- 길이: 파일 하나에 **200줄 이하**를 권한다. 일부 파일에만 필요한 규칙은 `.claude/rules/`에 `paths` 머리말로 나눈다.
- 가져오기: `@path/to/import`. 코드 표시(백틱) 안의 `@`는 가져오지 않는다.
- 경로별 규칙 머리말:

```markdown
---
paths:
  - "src/api/**/*.ts"
---
```

- **AGENTS.md:** 2.1.277 이상에서 작업 폴더나 그 위에 `CLAUDE.md`·`.claude/CLAUDE.md`·`CLAUDE.local.md`가 없으면 AGENTS.md를 읽는다. 있으면 CLAUDE.md만 읽는다. `/config`의 Project instructions를 `claude-md-and-agents-md`로 바꾸면 둘 다 읽는다. 어느 버전에서든 되는 방법은 CLAUDE.md 맨 위에 `@AGENTS.md`를 쓰는 것이다(두 번 읽지 않는다). Windows에서는 심볼릭 링크 대신 가져오기를 쓰라고 문서가 권한다.

**권한 모드:** `default`(화면 이름 Manual, 읽기만 묻지 않음) · `acceptEdits` · `plan` · `auto`(분류 모델이 확인) · `dontAsk` · `bypassPermissions`(격리된 컨테이너에서만). `Shift+Tab`으로 바꾸고, `claude --permission-mode plan`처럼 시작하거나 `permissions.defaultMode`로 정한다. **규칙은 deny → ask → allow 순으로 본다.** `ask` 규칙과 맞는 도구는 어느 모드에서도 자동 승인되지 않는다. CLAUDE.md의 지시는 모델이 따르는 맥락일 뿐이고, 막는 힘은 권한 규칙·훅에 있다.

**설정 파일 우선순위:** 조직 관리 설정 > 명령줄 `--settings` > `.claude/settings.local.json` > `.claude/settings.json` > `~/.claude/settings.json`. 설정 파일은 **엄격한 JSON**이라 `//` 주석이나 끝 쉼표가 있으면 다음 시작 때 Settings Error가 난다. 저장 뒤 `/status`로 읽혔는지 본다. 공식 예:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(npm run lint)",
      "Bash(npm run test *)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)"
    ]
  }
}
```

**훅:** 설정 파일의 `hooks` 칸. 이벤트는 `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `Notification`, `Stop`, `SubagentStop`, `PreCompact`, `SessionEnd` 등 30여 개. 처리 방식은 `command`·`http`·`mcp_tool`·`prompt`·`agent`. 종료 코드 2는 막기(이유는 stderr). `/hooks`로 목록을 본다. 공식 예 두 가지를 그대로 쓸 수 있다: 입력을 기다릴 때 알림(`Notification`, macOS `osascript`, Windows `powershell.exe` 대화 상자), `.env`·`package-lock.json`·`.git/` 편집 막기(`PreToolUse` + `.claude/hooks/protect-files.sh`, `jq` 필요, macOS·Linux는 `chmod +x`).

**스킬:** `~/.claude/skills/<이름>/SKILL.md`(나), `.claude/skills/<이름>/SKILL.md`(프로젝트), 플러그인 안 `skills/`. 머리말은 모두 선택이고 `description`만 권한다. `/이름`으로 부르거나 Claude가 설명을 보고 스스로 쓴다. `.claude/commands/*.md`(사용자 명령)는 스킬로 합쳐졌고 그대로 동작한다. Agent Skills 표준을 따르되 Claude Code 밖에서는 `name`·`description`·`license`·`compatibility`·`metadata`·`allowed-tools`만 받는다. `SKILL.md`는 500줄 이하.

**하위 에이전트:** `.claude/agents/*.md`(프로젝트), `~/.claude/agents/*.md`(나). 머리말 `name`·`description` 필수, `tools`·`model` 선택.

**MCP:**

```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
claude mcp add --env AIRTABLE_API_KEY=YOUR_KEY --transport stdio airtable -- npx -y airtable-mcp-server
```

범위: local(기본, `~/.claude.json`), project(`.mcp.json`, 팀 공유, 처음 쓸 때 승인 물음), user(`~/.claude.json`). OAuth 로그인은 세션 안에서 `/mcp`.

**플러그인:** 스킬·에이전트·훅·MCP를 묶은 폴더(`.claude-plugin/plugin.json`). 세션에서 `/plugin`. 공식 장터 `claude-plugins-official`은 첫 터미널 세션 때 자동으로 더해진다. 켜 둔 플러그인은 쓰지 않아도 매 턴 맥락을 조금 차지한다.

**초심자가 막히는 곳 (모두 공식 문서에 적힌 것)**

| 보이는 것 | 뜻과 할 일 |
|---|---|
| `claude`를 찾을 수 없음 | 설치 폴더가 PATH에 아직 없다. 새 터미널 창을 열고 다시. 그래도 안 되면 공식 'Fix your PATH' |
| `The token '&&' is not a valid statement separator` | PowerShell에서 CMD 명령을 쳤다. PowerShell 명령으로 |
| `'irm' is not recognized as an internal or external command` | CMD에서 PowerShell 명령을 쳤다. CMD 명령으로 |
| `syntax error near unexpected token '<'`, `403` | 설치 문제 해결 페이지의 오류별 안내 |
| 로그인했는데 쓸 수 없음 | 무료 요금제에는 Claude Code가 없다 |
| 설정이 안 먹음 | JSON에 주석·끝 쉼표가 있는지. `/status`로 확인 |
| Homebrew·WinGet으로 깔았는데 옛 버전 | 자동 업데이트가 안 되는 설치 방법이다 |

### 3.2 OpenAI Codex (CLI·IDE 확장·데스크톱 앱·웹)

- **누구에게:** ChatGPT 계정이 있는 사람. 터미널이 싫으면 데스크톱 앱이 쉽다.
- **비용 방식:** README는 Plus·Pro·Business·Edu·Enterprise 요금제로 쓰기를 권한다 [저장소]. 가격 페이지는 Free·Go에도 Codex가 '제한적으로' 들어 있다고 하고, 도움말은 Codex Cloud(웹)는 Free·Go에 없다고 한다 [검색 요약]. VS Code 문서는 VS Code 안 Codex 연동에 "무료 ChatGPT 계정으로 충분하다"고 적었다 [저장소, 2026-10-07]. → 화면에는 "무료 계정으로도 시작할 수 있어요(제한 있음)" 정도만, `needsReview: true`.

**설치 [저장소: openai/codex README]**

| OS | 명령 |
|---|---|
| macOS·Linux | `curl -fsSL https://chatgpt.com/codex/install.sh \| sh` |
| Windows | `powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 \| iex"` |
| npm | `npm install -g @openai/codex` |
| Homebrew | `brew install --cask codex` |

- 실행: `codex` → **Sign in with ChatGPT**. API 키로도 되지만 따로 설정이 필요하다.
- 데스크톱 앱: `codex app` 또는 chatgpt.com/codex 앱 페이지 [저장소]. Windows 앱은 Microsoft Store에 있고, 문서의 `winget install Codex -s msstore`는 **엉뚱한 다른 앱**으로 연결된다는 신고가 있어 ID로 설치하라는 안내(`winget install --id 9PLM9XGG6VKS -s msstore`)가 커뮤니티에 있다 [검색 요약: community.openai.com]. → 화면에는 Store 링크만 싣는다.
- 문서끼리 어긋남: `docs/install.md`는 "Windows 11 **WSL2로**"라고 적었고, README는 PowerShell 설치를 준다. Windows 샌드박스 문서는 PowerShell에서 바로 돈다고 한다 [검색 요약]. → PowerShell 설치를 쓰되 `needsReview`.

**규칙 파일 [검색 요약: developers.openai.com/codex/guides/agents-md]**

- 전역: `~/.codex/AGENTS.override.md`가 있으면 그것, 없으면 `~/.codex/AGENTS.md`(`CODEX_HOME`으로 바꿀 수 있음).
- 프로젝트: 저장소 루트에서 지금 폴더까지 내려오며 폴더마다 `AGENTS.override.md` → `AGENTS.md` → 대체 이름 순으로 하나씩. 가까운 파일이 뒤에 붙어 우선한다.
- 합친 크기가 `project_doc_max_bytes`(기본 32 KiB)에 이르면 더 붙이지 않는다. 대체 이름은 `~/.codex/config.toml`의 `project_doc_fallback_filenames`.
- 설정: `~/.codex/config.toml`, 신뢰한 프로젝트만 `.codex/config.toml`.

**스킬·훅·MCP [검색 요약]**

- 스킬: 저장소 `.agents/skills/`(지금 폴더에서 저장소 루트까지), 나 `~/.agents/skills/`, 관리자 `/etc/codex/skills`. `name`·`description` 필수. 바꾼 뒤 Codex 다시 시작. 옛 글에는 `~/.codex/skills`가 나오니 섞지 않는다.
- 훅: `hooks.json` 또는 `config.toml`의 `[hooks]`. 관리되지 않는 훅은 **사용자가 정의를 보고 신뢰해야** 돈다(`/hooks`). 신뢰하지 않은 프로젝트의 `.codex/` 훅은 무시. 문서 스스로 "완전한 강제 수단이 아니다"라고 쓴다.
- MCP: `config.toml`의 `[mcp_servers.<이름>]`(`command` 또는 `url`), 또는 `codex mcp add <server-name> --env VAR1=VALUE1 -- <stdio server-command>`.

**막히는 곳:** Windows Store 이름 검색으로 엉뚱한 앱 설치 [검색 요약], Free·Go에서 웹(클라우드) 작업 없음 [검색 요약], PowerShell 실행 정책 오류(설치 명령에 `-ExecutionPolicy ByPass`가 들어 있는 까닭) [기억·미확인].

### 3.3 Gemini CLI (Google) — 모두 [저장소: google-gemini/gemini-cli]

- **누구에게:** 돈을 내지 않고 터미널 에이전트를 써 보고 싶은 사람. 구글 계정만 있으면 된다.
- **비용 방식:** 구글 계정 로그인(Gemini Code Assist 개인용)으로 **하루 1,000회 요청까지 무료**. Google AI Pro 1,500회, Ultra 2,000회. API 키 무료 등급은 할당량 문서가 250회, README가 1,000회로 **서로 다르다** → 화면에는 계정 로그인만 안내한다.
- **권장 사양:** macOS 15+, Windows 11 24H2+, Ubuntu 20.04+, 램 4GB+(오래 쓰면 16GB+), **Node.js 20.0.0+**, Bash·Zsh·PowerShell, Gemini Code Assist 지원 지역.

**설치**

| 방법 | 명령 |
|---|---|
| npm(모든 OS) | `npm install -g @google/gemini-cli` |
| Homebrew(macOS·Linux) | `brew install gemini-cli` |
| MacPorts | `sudo port install gemini-cli` |
| 설치 없이 한 번 | `npx @google/gemini-cli` |

- 실행: `gemini` → **Sign in with Google** → 브라우저 로그인.
- 회사·학교 유료 라이선스는 `export GOOGLE_CLOUD_PROJECT="YOUR_PROJECT_ID"` 뒤 `gemini`.

**규칙 파일:** `~/.gemini/GEMINI.md`(전역) → 작업 폴더와 그 위 폴더의 `GEMINI.md` → 도구가 파일을 열 때 그 폴더의 `GEMINI.md`(그때그때). `/memory show`로 합친 내용을 보고 `/memory reload`로 다시 읽는다. 가져오기는 `@./components/instructions.md`. **AGENTS.md는 기본으로 읽지 않는다.** 읽게 하려면:

```json
{
  "context": {
    "fileName": ["AGENTS.md", "CONTEXT.md", "GEMINI.md"]
  }
}
```

설정 파일: `.gemini/settings.json`(프로젝트) > `~/.gemini/settings.json` > `/etc/gemini-cli/settings.json`.

**스킬:** 나 `~/.gemini/skills/` 또는 `~/.agents/skills/`, 프로젝트 `.gemini/skills/` 또는 `.agents/skills/`(같은 층에서는 `.agents/skills/`가 이긴다). 스킬을 켤 때 확인 창이 뜬다. `/skills list`, `gemini skills install <git 주소>`.

**훅:** `settings.json`의 `hooks`. 이벤트 `SessionStart`, `SessionEnd`, `BeforeAgent`, `AfterAgent`, `BeforeModel`, `AfterModel`, `BeforeToolSelection`, `BeforeTool`, `AfterTool`, `PreCompress`, `Notification`. **stdout에는 JSON 하나만** 써야 한다(`echo` 한 줄도 깨뜨린다). 종료 코드 2는 막기. 시간 제한은 밀리초(기본 60000).

**MCP:** `settings.json`의 `mcpServers`(`command`·`args`·`env`·`cwd`·`timeout`·`trust`, 원격은 `url`·`httpUrl`). `gemini mcp add [options] <name> <commandOrUrl> [args...]`.

**사용자 명령:** `~/.gemini/commands/*.toml`, `.gemini/commands/*.toml` → `/파일이름`.

**막히는 곳:** Node.js가 없거나 낡음(20 미만), 회사 계정에서 프로젝트 ID 없음, AGENTS.md를 읽지 않음, 훅 출력에 일반 글이 섞임.

### 3.4 GitHub Copilot (VS Code·CLI·github.com)

- **누구에게:** 무료로 편집기 안 에이전트를 쓰고 싶은 사람, 학생(인증 학생 무료). GitHub 계정이 있으면 바로 된다.
- **비용 방식 [저장소: github/docs get-started/plans.md]:** Copilot Free(제한된 기능, 모델 자동 선택만), Copilot Student(인증 학생 무료), Pro·Pro+·Max(유료), Business·Enterprise. **모든 요금제에 Copilot CLI와 Copilot app이 들어 있다.**
- **VS Code에서 시작 [저장소: vscode-docs setup/copilot.md, 2026-10-07]:** VS Code를 설치하고 GitHub로 로그인한다(상태 표시줄 Copilot 메뉴의 **Sign in to use Copilot**, 또는 활동 표시줄 Accounts의 **Sign in with GitHub to use GitHub Copilot**). 요금제가 없으면 **Copilot Free에 자동 가입**된다. 무료판은 원격 측정이 기본으로 켜져 있다(`telemetry.telemetryLevel`을 `off`로 끌 수 있음). 채팅에서 `/init`을 치면 `.github/copilot-instructions.md` 초안을 만든다.

**Copilot CLI 설치 [저장소: install-copilot-cli.md]**

| 방법 | 명령 |
|---|---|
| npm(모든 OS, Node.js 22+) | `npm install -g @github/copilot` |
| WinGet | `winget install GitHub.Copilot` |
| Homebrew | `brew install --cask copilot-cli` |
| 설치 스크립트(macOS·Linux) | `curl -fsSL https://gh.io/copilot-install \| bash` |

조건: Copilot 요금제가 있어야 하고, Windows는 **PowerShell 6 이상**이 필요하다. 회사가 끄면 쓸 수 없다. `~/.npmrc`에 `ignore-scripts=true`가 있으면 `npm_config_ignore_scripts=false npm install -g @github/copilot`.

**규칙 파일 [저장소]**

| 어디서 | 읽는 지시 |
|---|---|
| VS Code 채팅(Copilot 하네스) | `.github/copilot-instructions.md`, `.github/instructions/**/*.instructions.md`, `AGENTS.md` |
| Copilot 클라우드 에이전트 | 위 + `AGENTS.md`·`CLAUDE.md`·`GEMINI.md` |
| github.com의 Copilot Chat | 개인·저장소(`copilot-instructions.md`)·조직 지시. **AGENTS.md는 없음** |
| 코드 리뷰 | `copilot-instructions.md`(+경로별 일부) |
| 개인(VS Code) | `~/.copilot/copilot-instructions.md`, `~/.copilot/instructions` |

경로별 지시 파일 공식 예:

```markdown
---
name: 'Python testing'
description: 'Use when creating or updating Python unit tests.'
applyTo: '**/*.py'
---
# Python testing
```

VS Code는 Claude 하네스일 때 `CLAUDE.md`와 `.claude/rules`, Codex 하네스일 때 `AGENTS.md`를 쓴다. 중첩 AGENTS.md는 Local 하네스에서 실험 기능(`chat.useNestedAgentsMdFiles`, 기본 꺼짐).

**프롬프트 파일:** `.github/prompts/*.prompt.md`, 슬래시 명령으로 부른다. `/create-prompt`로 만들 수 있다.

**스킬:** 프로젝트 `.github/skills/`·`.claude/skills/`·`.agents/skills/`, 나 `~/.copilot/skills/`·`~/.claude/skills/`·`~/.agents/skills/`. `chat.useAgentSkills` 기본 켜짐.

**훅(VS Code는 미리 보기):** `.github/hooks/*.json`.

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [
      {
        "type": "command",
        "bash": "YOUR_BASH_COMMAND",
        "powershell": "YOUR_POWERSHELL_COMMAND",
        "timeoutSec": 30
      }
    ]
  }
}
```

Claude 형식 훅(`.claude/settings.json`)은 `chat.useClaudeHooks`를 켜야 읽는다(기본 꺼짐). 클라우드 에이전트는 리눅스라 `bash`만 쓴다.

**MCP:** 새 서버는 프로젝트 루트 `.mcp.json`(`mcpServers`, 이식용) 또는 `~/.copilot/mcp-config.json`. `.vscode/mcp.json`(`servers`)은 호환용으로 남았다. 명령 팔레트 **MCP: Add Server**.

**막히는 곳:** Windows 기본 PowerShell이 낮은 버전이라 CLI가 안 됨 [저장소 조건 + 기본 버전은 기억·미확인], github.com 채팅이 AGENTS.md를 모름, 무료판 한도.

### 3.5 Cursor — 모두 [검색 요약: cursor.com/docs/*]

- **누구에게:** AI가 들어간 편집기를 원하는 사람. VS Code와 비슷하게 생겼다.
- **비용 방식:** 무료 Hobby 요금제가 있다. Hobby의 정확한 한도는 공개되지 않았다는 직원 답변이 있다.
- **설치:** 편집기는 cursor.com/download. CLI는 Windows PowerShell `irm 'https://cursor.com/install?win32=true' | iex`, 실행은 `agent`, 업데이트는 `agent update`. macOS·Linux용 명령은 요약에 문장이 나오지 않았다. [기억·미확인] `curl https://cursor.com/install -fsS | bash`.
- **규칙:** 프로젝트 규칙은 `.cursor/rules/`의 **`.mdc` 파일**(머리말 `description`·`globs`·`alwaysApply`). `.md`는 무시된다는 설명이 여럿이다. 적용 방식 넷: 늘(alwaysApply: true) · 맞는 파일일 때(globs) · AI가 설명을 보고(description) · 직접 부를 때(@). 루트와 하위 폴더의 **AGENTS.md를 읽는다**(하위 폴더는 그 폴더 작업에만). 루트 `.cursorrules`는 옛 방식. 포럼에는 중첩 AGENTS.md가 안 읽힌다는 신고도 있다.
- **스킬:** `.agents/skills/`, `.cursor/skills/`, `~/.cursor/skills/`. `name`은 폴더 이름과 같아야 한다. 선택 `paths`, `disable-model-invocation`.
- **훅:** `.cursor/hooks.json`(프로젝트), `~/.cursor/hooks.json`(나), `"version": 1`, `beforeShellExecution` 같은 이벤트. 훅이 죽거나 시간 초과면 기본은 통과(fail open).
- **MCP:** `.cursor/mcp.json`(프로젝트), `~/.cursor/mcp.json`(전역), `mcpServers`. 값에 `${env:NAME}`.
- **막히는 곳:** `.mdc` 대신 `.md`로 만듦, 여러 루트 작업 공간에서 프로젝트 MCP가 안 보임(포럼).

### 3.6 Devin Desktop (옛 Windsurf) — 모두 [검색 요약]

- 2026-06-02에 이름이 바뀌었다. 편집기와 기능은 같다고 한다. 옛 Cascade 에이전트는 Devin Local로 바뀌었다는 제3자 글이 있다.
- 규칙: 전역 `~/.codeium/windsurf/memories/global_rules.md`(늘 켜짐, 6,000자 제한). 작업 공간 `.devin/rules/*.md`(권장) 또는 `.windsurf/rules/*.md`(대체), 파일마다 12,000자 제한, 머리말 `trigger:` 값 `always_on`·`model_decision`·`glob`·`manual`. 루트 **AGENTS.md는 늘 켜짐**, 하위 폴더 AGENTS.md는 그 폴더 글롭이 자동으로 붙는다. 옛 `.windsurfrules`도 읽는다.
- 스킬·훅 문서 페이지가 있지만 내용은 확인하지 못했다.
- 비용: 무료 등급이 있다는 제3자 글만 있다 → `unknown`.

### 3.7 Google Antigravity — 모두 [검색 요약: antigravity.google/docs]

- 규칙: `AGENTS.md`, `GEMINI.md`(머리말 없음, 늘 켜짐), `.agents/rules/*.md`(머리말 `trigger` 필수, 잘못되면 조용히 빠짐), 옛 `.agent/rules/`. 전역은 `~/.gemini/` 아래.
- 스킬: `.agents/skills/<이름>/SKILL.md`. **옛 워크플로(`.agents/workflows/`)는 2026-10-19에 멈춘다** → `/migrate-workflows`로 스킬로 옮긴다.
- 코드쇼퍼에서는 2순위 카드로만 싣는다(설치·가입 절차를 확인하지 못했다).

### 3.8 웹에서 만드는 도구 (설치 없음) — 모두 [검색 요약]

| 도구 | 규칙을 넣는 곳 | 무료 시작 | 참고 |
|---|---|---|---|
| Lovable | Project settings → **Knowledge**(프로젝트), Workspace settings → Knowledge(작업 공간). 각 1만 자. 같은 지시면 프로젝트 쪽이 이김 | 무료 요금제 있음(매일 크레딧, 월 상한. "임시 제공이며 바뀔 수 있음"이라 적힘) | 대화가 아주 길어지면 지시를 덜 따를 수 있다고 문서가 경고. 스킬 기능도 있음 |
| Bolt.new | 프로젝트 위 톱니 → All project settings → **Knowledge**(프로젝트), Account settings(내 모든 프로젝트), 팀 설정(팀) | 무료 요금제 있음(하루·한 달 토큰 상한, 이월 없음) | 프로젝트가 클수록 메시지마다 토큰을 더 쓴다. 스킬 기능 있음 |
| v0 | 입력창 **+** → Instructions 저장(계정 단위) → 대화마다 켜기 | 무료 크레딧 있음(문서·가격 페이지가 서로 다름) | Projects 기능은 '사용 중단'으로 표시됨 |
| Replit Agent | 프로젝트 맨 위 폴더의 **`replit.md`**(Agent가 만들고 요청마다 읽음) | 무료 Starter(매일 크레딧) | Plan Mode는 유료(Core) |
| Google AI Studio Build | 확인 못 함 → 첫 메시지에 붙여 넣기 | 무료로 쓸 수 있음. Pro·Ultra는 더 높은 한도 | 기본은 React 앞단 + Node.js 서버. GitHub에서 가져오기·동기화, Cloud Run 배포, 비밀 값은 Settings |

공통: 결과를 GitHub로 내보내는 기능이 있으면 꼭 켜라고 안내한다(나중에 다른 도구로 옮길 수 있게). 이 문장은 조언이라 사실 확인이 필요 없다.

### 3.9 채팅 AI (연습 단계 '내 AI 써 보기') — 모두 [검색 요약]

| 도구 | 무료 | 설계도를 넣는 곳 |
|---|---|---|
| Claude (claude.ai) | 무료 요금제 있음. 프로젝트 5개까지, 아티팩트 가능(설정 → Capabilities에서 코드 실행·파일 만들기 켜기) | 프로젝트 지시·파일, 또는 대화에 첨부 |
| ChatGPT | 무료 요금제 있음. 2025-09-03부터 프로젝트를 무료로 쓸 수 있음(프로젝트당 파일 5개) | 프로젝트 ••• → Project settings → 지시, 또는 첨부 |
| Gemini 앱 | 무료. Canvas는 모든 사용자, HTML·React 미리 보기 | 첨부. Gems의 무료 여부는 확인 못 함 |

### 3.10 공통 준비물

- **터미널:** Windows는 PowerShell, macOS는 터미널 앱. Claude Code 문서의 프롬프트 구별법(`PS C:\`면 PowerShell, `C:\`면 CMD)을 그대로 쓴다 [원문].
- **Node.js:** 24 LTS(2026-10-28부터 26 LTS) [레지스트리·저장소]. 설치 명령은 nodejs.org 공식 안내를 따른다(이번에 페이지는 못 읽음 → 링크만).
- **Git·GitHub 계정:** Copilot에 필요하고, 웹 빌더 결과를 옮길 때 쓴다.
- **브라우저 로그인:** Claude Code·Codex·Gemini CLI·Copilot 모두 CLI가 브라우저를 열어 로그인한다 [원문·저장소].

---

## 4. 한눈에 보는 위치 표

| 도구 | 프로젝트 규칙 | 경로별 규칙 | 스킬(프로젝트) | 훅 | MCP | 근거 |
|---|---|---|---|---|---|---|
| Claude Code | `CLAUDE.md`(없으면 `AGENTS.md`) | `.claude/rules/*.md` + `paths` | `.claude/skills/` | `.claude/settings.json`의 `hooks` | `.mcp.json` | 원문 |
| Codex | `AGENTS.md` | 하위 폴더 `AGENTS.md` | `.agents/skills/` | `hooks.json` / `[hooks]`(신뢰 필요) | `config.toml` `[mcp_servers.*]` | 검색 요약 |
| Gemini CLI | `GEMINI.md`(설정하면 `AGENTS.md`) | 하위 폴더 `GEMINI.md` | `.agents/skills/`, `.gemini/skills/` | `.gemini/settings.json`의 `hooks` | `.gemini/settings.json`의 `mcpServers` | 저장소 |
| Copilot(VS Code) | `.github/copilot-instructions.md`, `AGENTS.md` | `.github/instructions/*.instructions.md` + `applyTo` | `.github/skills/`, `.agents/skills/`, `.claude/skills/` | `.github/hooks/*.json`(미리 보기) | `.mcp.json` | 저장소 |
| Cursor | `AGENTS.md` | `.cursor/rules/*.mdc` + `globs` | `.agents/skills/`, `.cursor/skills/` | `.cursor/hooks.json` | `.cursor/mcp.json` | 검색 요약 |
| Devin Desktop | `AGENTS.md`(루트 늘 켜짐) | `.devin/rules/*.md` + `trigger` | 확인 못 함 | 확인 못 함 | 확인 못 함 | 검색 요약 |
| Antigravity | `AGENTS.md`, `GEMINI.md` | `.agents/rules/*.md` + `trigger` | `.agents/skills/` | 확인 못 함 | 확인 못 함 | 검색 요약 |
| Replit | `replit.md` | — | — | — | — | 검색 요약 |
| Lovable·Bolt·v0 | 설정 화면의 Knowledge·Instructions 칸 | — | 자체 스킬 기능 | — | — | 검색 요약 |

---

## 5. 규칙 파일 하나로 여러 도구 쓰기

원칙: **내용은 AGENTS.md에만 쓰고, 다른 파일은 AGENTS.md를 가리키기만 한다.** 내용이 두 곳에 있으면 한쪽만 고쳐져 AI가 서로 다른 말을 듣는다.

| 도구 | 더 만드는 파일 | 내용 | 근거 |
|---|---|---|---|
| Claude Code | `CLAUDE.md` | 첫 줄 `@AGENTS.md`, 둘째 줄 `@docs/codechauffeur-plan.md`, 아래에 Claude 전용 몇 줄 | 원문: 가져오기는 두 번 읽지 않고, 2.1.277 이전·AGENTS.md 지원이 꺼진 세션에서도 된다 |
| Gemini CLI | `GEMINI.md` | `@./AGENTS.md`, `@./docs/codechauffeur-plan.md` | 저장소: `@file.md` 가져오기 |
| Copilot | `.github/copilot-instructions.md` | 한 줄 소개 + 안전 다섯 줄 + "자세한 규칙은 AGENTS.md" | 저장소: github.com 채팅·코드 리뷰는 이 파일만 읽는다. 가져오기 문법이 없어서 꼭 필요한 줄만 겹쳐 쓴다 |
| Codex·Cursor·Devin·Antigravity | 없음 | AGENTS.md를 그대로 읽는다 | 검색 요약 |
| 웹 빌더 | 없음(붙여 넣을 글) | AGENTS.md를 줄인 '프로젝트 지식' 글 | 검색 요약 |

크기 기준: AGENTS.md는 **1만 자 이하**로 만든다. 가장 빡빡한 한도(Lovable 지식 칸 1만 자, Devin 규칙 파일 1만 2천 자, Codex 합계 32 KiB)를 모두 넘지 않고, Claude Code의 "200줄 이하" 권고에도 가깝다. 지금 설계도 예시는 3,900~5,900자(`docs/examples/*.md`)라 요약본은 넉넉히 들어간다. v3에서 디자인 지시가 길어져도 설계도 전문은 따로 파일로 가므로 AGENTS.md 한도에 걸리지 않는다.

Windows 주의: Claude 문서는 `ln -s AGENTS.md CLAUDE.md` 심볼릭 링크를 Windows에서 쓰지 말라고 한다(관리자 권한·개발자 모드 필요, Git이 한 줄짜리 파일로 꺼낼 수 있음) [원문]. 그래서 연결은 늘 **가져오기 줄**로 한다.

---

## 6. 제안 (a) 자료 모델: `data/guides.json`

### 6.1 모양

```ts
// schemas/guides.schema.json 으로 만든다. 날짜는 새 정의 isoDate("^20[0-9]{2}-[01][0-9]-[0-3][0-9]$").
type Guides = {
  version: 1;
  tools: Tool[];
  guides: Guide[];
};

type Tool = {
  id: string;                 // 'claude-code', 'codex', 'gemini-cli', 'copilot-vscode', 'cursor', 'devin-desktop', 'antigravity', 'lovable', 'bolt', 'v0', 'replit', 'ai-studio', 'claude-chat', 'chatgpt', 'gemini-app'
  name: string;               // 제품 이름 그대로
  vendor: string;
  family: 'chat' | 'builder' | 'editor' | 'terminal';   // 9.2절 첫 칸과 같다
  aiTag: 'ai.chat-free' | 'ai.chat-paid' | 'ai.agent' | 'ai.builder';  // 엔진 태그(ai.builder는 새로, 9.4절)
  tier: 1 | 2;                // 1: 단계 안내 전부, 2: 공식 링크 카드 + AGENTS.md
  surfaces: ('cli' | 'desktop' | 'ide-extension' | 'editor' | 'web' | 'mobile')[];
  os: ('windows' | 'mac' | 'linux' | 'wsl' | 'web')[];
  suits: string;              // "-요"체 한 줄. "돈을 내지 않고 터미널 에이전트를 써 보고 싶을 때"
  notFor?: string;
  price: {
    start: 'free' | 'free-limited' | 'paid-only' | 'unknown';
    note?: string;            // 숫자를 쓰려면 sources에 via page|repo인 출처가 있어야 한다
  };
  account: ('google' | 'github' | 'chatgpt' | 'claude' | 'email')[];
  instructionFiles: { path: string; scope: 'project' | 'user' | 'scoped' | 'ui'; format: 'md' | 'mdc' | 'instructions.md' | 'json' | 'toml' | 'text'; where?: string[] /* 메뉴 경로 */; limitChars?: number }[];
  skillDirs: string[];        // ['.agents/skills'] 등. 확인 못 했으면 []
  hookFormat: 'claude-settings' | 'copilot-v1' | 'gemini-settings' | 'codex' | 'cursor-v1' | 'none' | 'unknown';
  mcpConfig?: { path: string; key: 'mcpServers' | 'servers' | 'mcp_servers' };
  setupTarget: 'claude-code' | 'agents-md' | 'gemini-cli' | 'copilot' | 'builder-text' | 'replit' | 'chat';  // 7절 출력 틀
  latest?: { version: string; from: string /* 'npm:@google/gemini-cli' */; checkedAt: string };
  changelog?: string;         // 공식 변경 기록 주소
  officialDocs: string;       // 늘 보이는 '공식 안내 열기'
  guideIds: string[];
  checkedAt: string;          // YYYY-MM-DD
  reviewEveryDays: number;    // 터미널·편집기 30, 웹 빌더 45, 채팅 90
  needsReview: boolean;
  sources: SourceRef[];
};

type Guide = {
  id: string;                 // 'gemini-cli-install-windows'
  tool: string;
  task: 'signup' | 'install' | 'first-run' | 'rules' | 'skills' | 'hooks' | 'mcp' | 'update' | 'uninstall' | 'fix';
  os: 'windows' | 'mac' | 'linux' | 'wsl' | 'any';
  title: string;              // "윈도우에 Gemini CLI 설치하기"
  minutes: number;            // 준비물 시간(설계도 8번·영수증)
  needs: string[];            // 먼저 할 안내 id ('node-install-windows')
  steps: Step[];
  verify?: Step;              // 다 됐는지 보는 마지막 단계
  fixes: Fix[];
  testedVersion?: string;     // 이 순서를 확인한 도구 버전
  checkedAt: string;
  reviewEveryDays: number;
  needsReview: boolean;
  sources: SourceRef[];
};

type Step = {
  id: string;
  say: string;                // "-요"체, 한 문장 40자 안쪽
  where?: string[];           // 메뉴 경로. 화면 이름은 원문 그대로(영어면 영어) ['Project settings', 'Knowledge']
  command?: { shell: 'bash' | 'zsh' | 'powershell' | 'cmd' | 'any'; code: string };   // 원문 그대로. 줄바꿈·따옴표 바꾸지 않기
  file?: { path: string; from: string /* 7절 출력 파일 id */ };
  expect?: string;            // 무엇이 보이면 맞는지
  terms?: string[];           // 어려운 말 풀이 id
  admin?: boolean;            // 관리자 권한·sudo가 필요한 단계
  sourceRef: number;          // sources 배열의 몇 번째 출처에서 왔는지
};

type Fix = {
  match: string;              // 터미널에 보이는 문장(정규식). errors.json 형식과 같다
  errorId?: string;           // data/errors.json에 있으면 그 카드로 잇는다
  say: string;
  steps: Step[];
};

type SourceRef = {
  url: string;
  label: string;
  via: 'page' | 'repo' | 'registry' | 'search-summary';
  checkedAt: string;
};
```

### 6.2 예: Claude Code Windows 설치 (원문에서 옮긴 그대로)

```json
{
  "id": "claude-code-install-windows",
  "tool": "claude-code",
  "task": "install",
  "os": "windows",
  "title": "윈도우에 Claude Code 설치하기",
  "minutes": 10,
  "needs": [],
  "steps": [
    {
      "id": "open-ps",
      "say": "시작 메뉴에서 PowerShell을 열어요.",
      "expect": "줄 앞에 PS C:\\가 보이면 PowerShell이에요.",
      "terms": ["terminal", "powershell"],
      "sourceRef": 0
    },
    {
      "id": "install",
      "say": "아래 명령을 붙여 넣고 Enter를 눌러요. 받는 동안 아무것도 안 보일 수 있어요.",
      "command": { "shell": "powershell", "code": "irm https://claude.ai/install.ps1 | iex" },
      "sourceRef": 0
    }
  ],
  "verify": {
    "id": "version",
    "say": "PowerShell 창을 새로 열고 버전을 확인해요.",
    "command": { "shell": "powershell", "code": "claude --version" },
    "expect": "숫자로 된 버전 번호가 나오면 다 됐어요.",
    "sourceRef": 0
  },
  "fixes": [
    {
      "match": "The token '&&' is not a valid statement separator",
      "say": "PowerShell에 CMD용 명령을 넣었어요. 위의 PowerShell 명령을 써 주세요.",
      "steps": []
    },
    {
      "match": "'irm' is not recognized",
      "say": "CMD 창이에요. PowerShell을 열거나 CMD용 명령을 써 주세요.",
      "steps": [
        { "id": "cmd", "say": "CMD에서는 이 명령을 써요.", "command": { "shell": "cmd", "code": "curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd" }, "sourceRef": 0 }
      ]
    },
    {
      "match": "is not recognized as (an internal or external command|the name of a cmdlet)",
      "errorId": "command-not-found",
      "say": "설치 폴더를 아직 못 찾았어요. PowerShell을 닫고 새로 열어 주세요.",
      "steps": []
    }
  ],
  "testedVersion": "2.1.296",
  "checkedAt": "2026-10-14",
  "reviewEveryDays": 30,
  "needsReview": false,
  "sources": [
    { "url": "https://code.claude.com/docs/en/setup", "label": "Claude Code 공식 문서: Advanced setup", "via": "page", "checkedAt": "2026-10-14" }
  ]
}
```

### 6.3 검사 규칙 (`scripts/validate-data.ts`에 더함)

1. 아이디가 겹치지 않고, `guides[].tool`·`tools[].guideIds`·`needs`·`errorId`·`terms`가 실제로 있다.
2. **`command`가 있는 단계의 출처는 `via`가 `page`나 `repo`여야 한다.** 아니면 그 안내는 `needsReview: true`여야 한다.
3. `price.note`에 숫자가 있으면 `page`·`repo` 출처가 있어야 한다.
4. `checkedAt`이 오늘보다 뒤면 오류. `checkedAt + reviewEveryDays`가 지났으면 `npm run check`에서 경고, `npm run validate:release`에서 1순위(`tier: 1`) 도구는 오류.
5. `say`·`expect`는 쓰지 않는 말 검사(`npm run words`)에 넣는다. 한 문장 40자 넘으면 경고.
6. `command.code`는 원문 글자 그대로 둔다(따옴표·줄바꿈도). 바꿀 때는 손으로 고치지 않고, 새로 만들 `/add-guide` 스킬(`/add-product`와 같은 방식)이 출처 페이지를 다시 읽어 넣고 `checkedAt`을 올린다.

### 6.4 경계

- 안내 자료는 **사실**이라 `data/guides.json`에, 화면 고정 문구는 `src/copy/ko.ts`에, 설정 파일 문장 틀은 `data/templates.json`에 둔다 (CLAUDE.md 꼭 지킬 것 5).
- 어떤 안내를 보일지(도구·OS 고르기)와 AI 설정 파일 만들기는 엔진 함수로 둔다(`src/lib/engine/`, 순수 함수). 화면은 결과를 보여 주기만 한다 (꼭 지킬 것 3).
- 크기: 1순위 도구 6개 × OS 3 × 작업 4 ≈ 70개 안내, 약 80~120KB JSON. 페이지마다 그 도구 몫만 정적 HTML로 굽고, 섬은 OS 탭과 복사 버튼뿐이다. 첫 화면 JS에 들어가지 않는다.

---

## 7. 제안 (b) 'AI 설정 파일' 만들기 (rules pack)

### 7.1 들어가는 것과 나오는 것

엔진 함수 `renderAiSetup(evaluation, { toolId, os, customToolName?, notify? })` → `{ files: { id, path, content }[], agentMessage, pasteText?, notes }`. 순수 함수, 문장은 `data/templates.json`의 `aiSetup.*`, 파일 위치는 `data/guides.json`의 `tools[].instructionFiles`에서 가져온다(위치가 바뀌면 자료 한 곳만 고친다).

| `setupTarget` | 만드는 파일 |
|---|---|
| `claude-code` | `AGENTS.md`, `CLAUDE.md`(가져오기 연결), `docs/codechauffeur-plan.md`, `.claude/settings.json`(권한), `.claude/settings.local.json`(선택: 알림 훅), `.claude/skills/check-step/SKILL.md`, `.claude/skills/fix-error/SKILL.md`, `.gitignore` 추가 줄 |
| `agents-md` (Codex·Cursor·Devin·Antigravity·직접 입력) | `AGENTS.md`, `docs/codechauffeur-plan.md`, `.agents/skills/check-step/SKILL.md`, `.agents/skills/fix-error/SKILL.md`, `.gitignore` 추가 줄. Cursor만 선택으로 `.cursor/rules/design.mdc`(9.5절 확인 뒤) |
| `gemini-cli` | 위 `agents-md` + `GEMINI.md`(가져오기 연결) |
| `copilot` | 위 `agents-md` + `.github/copilot-instructions.md` + `.github/instructions/design.instructions.md` |
| `builder-text` (Lovable·Bolt·v0·AI Studio) | 파일 없음. '프로젝트 지식에 붙여 넣을 글'(1만 자 이하) + 넣는 곳 메뉴 경로 |
| `replit` | `replit.md` 내용(위 글과 같음) |
| `chat` (Claude·ChatGPT·Gemini 앱) | 프로젝트 지시 글(짧게) + 설계도 파일 첨부 안내 |

### 7.2 건네는 방법 (초심자 순서)

1. **에이전트에게 만들게 하기(첫 방법):** 파일 전부를 '경로 제목 + 코드 블록'으로 이은 메시지 하나를 복사해 에이전트에게 보낸다. 첫 줄: "아래 파일들을 이 프로젝트 폴더에 그대로 만들어 줘. 내용은 바꾸지 마. 다 만들면 만든 파일 목록만 보여 줘." 숨김 폴더를 손으로 만들 일이 없다.
2. **파일마다 복사·내려받기:** 화면에 파일 이름과 [복사] [내려받기]. 스크린 리더로도 하나씩 다룰 수 있다.
3. **zip 한 번에 받기:** 압축하지 않는 zip을 직접 만든다(CRC32 + 머리 몇 개, 약 80줄, 의존성 없음 → D 기록). 설계도 받기 페이지 JS가 이미 135.4/140KB라(W5 기록) **누를 때 불러오는 지연 묶음**으로 둔다.
4. **AI가 읽었는지 확인하는 첫 메시지:** "이 폴더의 규칙 파일을 읽었으면, 만들 것과 지킬 것을 다섯 줄로 요약해 줘." 도구별로 직접 확인하는 법도 함께: Claude Code `/memory`·`/context`, Gemini CLI `/memory show` [원문·저장소].

### 7.3 틀 (한국어. 도구가 요구하는 곳만 영어)

영어가 꼭 필요한 곳: 파일 이름, 머리말 키, 스킬 `name`(ASCII 소문자·하이픈), 글롭, JSON 키·값. 스킬 `description`은 한국어 문장 뒤에 영어 한 문장을 붙인다(도구가 설명을 보고 스킬을 고르므로 두 말 모두에 걸리게).

**`AGENTS.md`** (`{{…}}`는 엔진이 채운다. 목록은 "-ㄴ다"체)

```markdown
# {{project}} 작업 규칙

이 파일은 코드쇼퍼가 만든 작업 규칙이다. 이 폴더에서 일하는 AI 코딩 도구는 일을 시작하기 전에 이 파일을 읽는다.
설계도 전문은 `docs/codechauffeur-plan.md`에 있다. 새 단계를 시작할 때 설계도의 그 단계 부분을 먼저 읽는다.

## 만들 것
- {{oneLine}}
- 쓰는 사람: {{audience}}
- 먼저 만들 것: {{firstScope}}
- 만들지 않을 것: {{notBuild}}

## 쓰는 도구
{{toolLines}}

## 진행 순서
{{stepLines}}

## 안전
{{safetyLines}}
- 비밀 키와 비밀번호는 `.env`에만 두고, `.env`는 `.gitignore`에 넣는다. 예시 값은 `.env.example`에 쓴다.

## 일하는 방식
{{workStyleLines}}
- 나에게는 쉬운 한국어로 말한다. 낯선 낱말에는 한 줄 풀이를 붙인다.
- 단계를 마치면 `check-step` 스킬로 확인하고, 에러가 나면 `fix-error` 스킬을 따른다.
```

**`CLAUDE.md`**

```markdown
@AGENTS.md
@docs/codechauffeur-plan.md

## Claude Code에서
- 파일을 여러 개 바꾸는 일은 먼저 계획을 보여 주고 확인받는다.
- `.claude/settings.json`의 확인 규칙(지우기, 올리기, 설치)을 끄자고 하지 않는다.
```

**`GEMINI.md`**

```markdown
@./AGENTS.md
@./docs/codechauffeur-plan.md
```

**`.github/copilot-instructions.md`**

```markdown
# {{project}}

{{oneLine}}

- 자세한 작업 규칙은 `AGENTS.md`, 설계도는 `docs/codechauffeur-plan.md`에 있다.
- 비밀 키는 코드에 넣지 않는다. `.env`는 저장소에 올리지 않는다.
- 패키지 설치, 파일 지우기, 저장소에 올리기는 하기 전에 확인받는다.
- 쉬운 한국어로 설명한다.
```

**`.github/instructions/design.instructions.md`** (설계도 6번 디자인 지시를 그대로)

```markdown
---
name: '디자인 지시'
description: '화면(HTML·CSS·컴포넌트)을 만들거나 고칠 때 쓴다. Use when creating or editing UI files.'
applyTo: '**/*.{html,css,js,jsx,ts,tsx}'
---
{{designSection}}
```

중괄호 글롭(`{html,css}`)이 VS Code `applyTo`에서 되는지는 문서 예에 없다 [기억·미확인] → 9.5절 실측 전까지 `applyTo: '**'`로 낸다.

**`.claude/skills/check-step/SKILL.md`** (`.agents/skills/`에도 같은 내용)

```markdown
---
name: check-step
description: 한 단계를 마쳤을 때 설계도의 완성 확인 기준으로 결과를 확인하고, 내가 직접 눌러 볼 방법을 쉬운 한국어로 알려 준다. Use after finishing a build step, or when the user asks to check or verify the result.
---

# 단계 확인

1. `docs/codechauffeur-plan.md`의 4번(기능과 완성 확인 기준)과 10번(진행 순서)에서 지금 단계를 찾는다.
2. 이번 단계에서 바뀐 파일을 한 줄씩 적는다.
3. 실행할 수 있으면 앱을 실행하고, 기준마다 '된다'와 '안 된다'를 표로 적는다. 처음 쓰는 명령은 무엇을 하는지 한 줄로 먼저 말한다.
4. 내가 직접 해 볼 것 세 가지를 적는다: 열어 볼 주소, 눌러 볼 버튼, 보여야 하는 것.
5. 안 된 기준이 있으면 고칠 방법 하나만 제안하고 고칠지 묻는다. 범위에 없는 기능은 더하지 않는다.
```

**`.claude/skills/fix-error/SKILL.md`**

```markdown
---
name: fix-error
description: 터미널이나 브라우저에 에러가 나왔을 때 뜻을 쉬운 한국어로 풀고, 원인을 찾아 가장 작은 고침 하나를 제안한다. Use when the user pastes an error message or a command, build, or page fails.
---

# 에러 고치기

1. 에러 문장을 그대로 옮기고, 뜻을 두 문장 안으로 쉽게 푼다.
2. 관련 파일과 설정을 읽어 원인 후보를 셋 이하로 적고, 가장 그럴듯한 하나를 고른다.
3. 가장 작은 고침 하나를 제안한다. 패키지 설치, 파일 지우기, 설정 바꾸기는 하기 전에 확인받는다.
4. 고친 뒤 같은 에러가 사라졌는지 확인하는 방법을 알려 준다.
5. 비밀 키나 비밀번호는 다시 쓰지 않는다. 에러 문장에 키가 보이면 키를 새로 발급하라고 알려 준다.
6. 같은 에러가 세 번 이어지면 멈추고, 해 본 것과 공식 문서에서 찾아볼 낱말을 정리해 준다.
```

**`.claude/settings.json`** (권한만. 스크립트 없이 모든 OS에서 같다)

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "ask": [
      "Bash(rm *)",
      "Bash(git push *)",
      "Bash(npm install *)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.local)",
      "Edit(./.env)",
      "Edit(./.env.local)"
    ]
  }
}
```

- 근거 [원문]: 규칙 순서는 deny → ask → allow, ask 규칙은 auto 모드에서도 늘 묻는다, 파일 규칙은 `Read`·`Edit`만 본다(`Write` 규칙은 무시하고 경고), `Bash(npm run *)`는 인자 없는 `npm run`에도 맞는다.
- `.env.*` 대신 두 파일만 막는 까닭: `.env.example`은 AI가 읽어야 한다.
- 확인 필요: Git for Windows가 없는 Windows에서는 PowerShell 도구가 명령을 돌리는데, `Bash(...)` 규칙이 그 명령에 닿는지 문서에서 확인하지 못했다 → 9.5절 실측.

**`.claude/settings.local.json`** (선택: "AI가 기다릴 때 알려 줘"를 켠 사람만. 원문 예 그대로)

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude Code needs your attention\" with title \"Claude Code\"'"
          }
        ]
      }
    ]
  }
}
```

Windows는 같은 자리의 `command`를 원문 PowerShell 예(`powershell.exe -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show('Claude Code needs your attention', 'Claude Code')"`)로 바꾼다. 리눅스 예는 이번에 옮기지 못했다 → 리눅스는 이 선택지를 숨긴다. 훅은 `.local` 파일에 둬서 저장소에 올라가지 않게 한다.

**`.gitignore` 추가 줄**

```gitignore
.env
.env.local
CLAUDE.local.md
node_modules/
```

**웹 빌더에 붙여 넣을 글** (`builder-text`): AGENTS.md에서 '진행 순서'를 빼고 '화면 목록'과 '디자인 지시'를 넣은 것. 끝에 "한 번에 한 단계만 만들고, 단계마다 무엇을 바꿨는지 알려 줘."를 붙인다. 넣는 곳은 3.8절 표의 메뉴 경로를 `tools[].instructionFiles[].where`에서 읽어 보인다.

**직접 입력한 도구** (`agents-md` + 안내 한 줄): "규칙 파일을 어디서 읽는지는 그 도구의 공식 안내에서 확인해 주세요. 내가 쓰는 AI: {{customToolName}}" (자리 표시 바로 뒤에 조사를 붙이지 않는다, copy.md) 그리고 AI에게 할 말 카드: "너는 프로젝트 규칙을 어떤 파일에서 읽어? 이 AGENTS.md 내용을 네가 읽는 곳에 맞게 저장해 줘."

### 7.4 시험

- 엔진 단위 시험: 목표마다 나오는 파일 목록, AGENTS.md 1만 자 이하, 스킬 `name`이 `^[a-z0-9]+(-[a-z0-9]+)*$`이고 64자 이하, `description` 1024자 이하, 머리말은 첫 줄 `---`로 시작(Claude 문서: 그래야 읽는다), JSON은 `JSON.parse`가 되고 주석·끝 쉼표가 없다.
- `.claude/settings.json`을 schemastore 스키마로 검사한다. 스키마 사본은 `tests/fixtures/`에 확인한 날과 함께 둔다(시험 때 인터넷을 부르지 않는다).
- 예시: `npm run examples`가 `docs/examples/ai-setup/<코스>-<목표>/`에 파일을 만든다(손으로 고치지 않는다). 골든은 바꾸지 않는다. 단, 9.3절 '준비물'이 늘면 영수증 개수가 바뀌므로 그때 `골든: case-NN 준비물에 AI 설치 단계가 더해짐`으로 커밋한다.
- 실제 도구로 읽히는지: 9.5절 실측표.

---

## 8. 제안 (c) '최신'을 정직하게 지키기

### 8.1 화면에 보이는 표

| 상태 | 표 (화면 문구 초안, `src/copy/ko.ts`) |
|---|---|
| 기한 안 | "2026-10-14 공식 문서로 확인" · "확인한 버전 2.1.296" |
| 기한 지남 | "확인한 지 {n}일 지났어요. 화면이 다르면 공식 안내를 따라 주세요." |
| `needsReview` | 명령을 보이지 않는다. "이 안내는 아직 공식 문서로 다시 확인하지 못했어요." + [공식 안내 열기] |

- 날짜는 빌드 때 HTML에 박고, '며칠 지났는지'는 브라우저가 이용자 기기 날짜로 센다(외부 호출 없음). JS가 없으면 날짜만 보인다.
- 모든 안내 페이지 맨 아래: 공식 안내 링크와 "코드쇼퍼가 공식 문서를 읽고 정리했어요. 각 회사와 관계없어요." 제품 로고는 쓰지 않는다(꼭 지킬 것 12, 상표).
- 명령은 버전을 박지 않는 공식 설치 명령만 싣는다. `expect`도 "숫자로 된 버전 번호가 나오면"처럼 버전 없이 쓴다.

### 8.2 스크립트

1. **`scripts/check-guides.ts`** (`npm run guides`): 안내마다 `checkedAt`부터 오늘까지 날 수, 기한, `needsReview`, 검색 요약 출처 수를 표로 낸다. `--today=YYYY-MM-DD`(시험용), `--strict`(기한 지난 1순위나 `needsReview` 1순위가 있으면 실패). `npm run check`에는 경고로, `validate:release`에는 `--strict`로 넣는다.
2. **`scripts/check-guide-versions.ts`** (`npm run guides:versions`, CI 전용, 인터넷 씀): `latest.from`이 `npm:`인 도구마다 `npm view <패키지> version`을 돌려 기록과 다르면 목록에 올린다. 사이트 화면은 이 스크립트와 관계없다(꼭 지킬 것 1). Claude Code처럼 패치 번호로도 동작이 바뀌는 도구가 있어, 버전이 달라졌다고 바로 '틀렸다'로 보지 않고 **"변경 기록을 읽어 볼 것"**으로만 올린다.
3. **`.github/workflows/guides-watch.yml`**: 매주 월요일 `cron: '17 0 * * 1'`(한국 시각 09:17). 두 스크립트를 돌려 결과를 이슈 하나("AI 도구 안내 확인 필요 YYYY-MM-DD", 꼬리표 `guides`)로 만들거나 고친다. `permissions: issues: write`만 준다. 비밀 값은 쓰지 않는다.

### 8.3 다시 확인하는 사람과 차례

- **에이전트가 할 수 있는 것:** 원문을 읽을 수 있는 출처(code.claude.com, GitHub 저장소들, npm)는 `/next-task`가 이슈를 보고 다시 읽어 고치고 `checkedAt`을 올린다. `docs/TASKS.md`에 "G 안내 다시 확인" 줄을 매주 더한다.
- **사람이 할 것(HUMAN):** 이 환경에서 막힌 사이트의 원문 대조, 그리고 직접 깔아 보는 실측(9.5절). 결과를 적으면 에이전트가 `needsReview: false`로 바꾼다.
- 기한: 터미널·편집기 30일, 웹 빌더 45일, 채팅 90일. 이름이 바뀌거나 합쳐진 소식(Windsurf → Devin Desktop, Codex 앱 → ChatGPT 앱)이 들리면 기한과 관계없이 바로.

---

## 9. 화면 배치

### 9.1 어디에 무엇을

| 자리 | 더하는 것 |
|---|---|
| **내 AI 써 보기**(연습) | 맨 앞에 "어떤 AI 채팅을 쓰세요?" 칩: Claude · ChatGPT · Gemini · **다른 AI(직접 입력)** · 아직 없어요. '아직 없어요'면 가입 안내 세 줄(공식 가입 주소 링크, 무료로 시작할 수 있다는 것만). 고른 값은 1단계 질문의 기본값이 된다 |
| **1 만들 앱 정하기**의 '어떤 AI로 만드나요?' | 두 칸(9.2절). 터미널·편집기를 고르면 'OS' 질문이 뒤따른다 |
| **4 설계도 받기** | 새 칸 **'내 AI 준비'**: ① 설치·로그인 안내 바로 가기(`/guides/{tool}#{os}`) ② AI 설정 파일(7.2절 세 방법) ③ 첫 메시지(규칙을 읽었는지 확인). 영수증 '준비물'에 설치 단계가 잡힌다 |
| **둘러보는 곳** | `/guides` AI 도구 안내(도구 카드 목록, 종류별), `/guides/{tool}`(OS 탭, 설치 → 로그인 → 규칙 파일 → 막혔을 때), `/guides/agents-md`(규칙 파일 하나로 여러 도구 쓰기, 5절을 쉬운 말로) |
| **어려운 말 풀이** | 9.6절 새 말 |
| **에러 안내** | 9.7절 새 카드, `fixes[].errorId`로 잇는다 |

이름 주의: '길 안내서'는 쓰지 않는 말이다(CONCEPT 3.9). 페이지 이름은 **AI 도구 안내**, 묶음 이름은 **AI 설정 파일**로 한다('꾸러미'·'세트'도 쓰지 않는 말).

### 9.2 AI 고르기 두 칸과 직접 입력 (소유자 요청 5)

| 첫 칸: 종류 (`q.ai`, 엔진 태그) | 둘째 칸: 도구 (`q.aiTool`, 새 질문) |
|---|---|
| AI 채팅 (무료·유료는 둘째 칸 뒤 '유료 구독이 있나요?'로) → `ai.chat-free`/`ai.chat-paid` | Claude · ChatGPT · Gemini · **직접 입력** |
| 웹에서 만드는 도구 → `ai.builder`(새) | Lovable · Bolt.new · v0 · Replit · Google AI Studio · **직접 입력** |
| 편집기 안 AI → `ai.agent` | VS Code + Copilot · Cursor · Devin Desktop · Antigravity · **직접 입력** |
| 터미널·앱 에이전트 → `ai.agent` | Claude Code · Codex · Gemini CLI · Copilot CLI · **직접 입력** |
| 모르겠어요 → 지금처럼 `ai.chat-free` | (둘째 칸 없음. 설계도 받기에서 "처음이면 이것부터"로 Gemini 앱·ChatGPT·Claude를 보인다) |

- 직접 입력: 한 줄 40자, 줄바꿈 지움, 설계도 1번 '만드는 AI'와 AGENTS.md 머리에 들어간다(지금 앱 설명 자유 입력과 같은 처리, `docs/RECEIPT.md` 2절). 엔진 태그는 종류 칸이 정한다.
- 'OS' 질문: 윈도우 · 맥 · 리눅스 · **다른 컴퓨터(직접 입력)**. 브라우저가 알려 주는 값(`navigator.userAgentData?.platform`, 없으면 `navigator.platform`)으로 미리 눌러 두고 바꿀 수 있게 한다. 다른 컴퓨터(크롬북 등)면 웹 빌더·채팅을 먼저 보인다. 저장은 `src/lib/store.ts`.
- 접근성: 직접 입력은 라디오 묶음의 마지막 선택지 + 그 아래 글 칸(고르면 초점 이동, `aria-describedby`로 40자 안내). 360px에서 칩 줄바꿈.

### 9.3 준비물로 잇기

엔진이 고른 도구·OS에 맞는 `install`·`first-run` 안내를 설계도 8번 준비물에 더한다: "- [ ] Gemini CLI 설치하기 (약 15분) — /guides/gemini-cli#windows". 오래 걸리는 것 먼저(지금 규칙 그대로). 영수증 '준비물 n개'가 늘어난다 → 골든 바뀜(7.4절).

### 9.4 엔진에 생기는 것

- 새 태그 `ai.builder`: 웹 빌더는 화면·배포를 스스로 맡으므로 도구 고르기 점수가 달라진다(예: 배포 칸을 '빌더가 맡음'으로). `data/scoring.json`·`docs/ENGINE.md`·골든 사례를 함께 고친다. 이 문서는 방향만 정하고 점수는 엔진 작업에서 정한다(`engine-guardian` 검토).
- 새 함수: `selectGuides(state)`, `renderAiSetup(...)`. 둘 다 순수 함수.

### 9.5 사람이 직접 해 볼 실측표 (출시 전)

| 확인 | 방법 | 통과 기준 |
|---|---|---|
| Claude Code가 CLAUDE.md 가져오기로 AGENTS.md·설계도를 읽나 | 생성 파일을 둔 폴더에서 `claude` → `/memory` 또는 `/context` | Memory files에 둘 다 보인다 |
| 권한 규칙 | "`.env`를 읽어 줘", "`rm` 해 줘" | `.env`는 거절, `rm`은 묻는다. Windows(Git 없음)에서도 같은지 |
| Gemini CLI | `gemini` → `/memory show` | AGENTS.md·설계도 내용이 보인다 |
| Codex | `codex` → "규칙 요약해 줘" | AGENTS.md 내용으로 답한다 |
| Copilot(VS Code) | 채팅에서 CSS 파일 고치기 | 참고한 파일에 design.instructions.md가 잡힌다(`applyTo` 글롭 확인) |
| Cursor | `.mdc` 규칙과 AGENTS.md | 규칙이 붙는다 |
| 스킬 | 각 도구에서 `/check-step` | 스킬이 목록에 있고 실행된다 |
| 웹 빌더 | Lovable·Bolt Knowledge 칸에 글 붙이기 | 1만 자 안에 들어가고 저장된다 |

### 9.6 어려운 말 풀이에 더할 말 (지금 212개에 없는 것)

PATH, WSL, PowerShell, CMD(명령 프롬프트), Homebrew, WinGet, 설치 스크립트, AGENTS.md, CLAUDE.md, 규칙 파일, 스킬(Agent Skills), 권한 모드, 계획 모드, LTS, 숨김 폴더. (터미널·npm·Node.js·CLI·MCP·훅·환경 변수·.gitignore는 이미 있다.)

### 9.7 에러 안내에 더할 카드

| id | 보이는 문장 | 근거 |
|---|---|---|
| `ps-and-token` | `The token '&&' is not a valid statement separator` | 원문(Claude Code) |
| `irm-not-recognized` | `'irm' is not recognized as an internal or external command` | 원문(Claude Code) |
| `npm-ebadengine` | `EBADENGINE` 경고 | 원문(Claude Code npm 설치: 경고만, 설치는 됨) |
| `settings-json-error` | Settings Error (주석·끝 쉼표) | 원문(Claude Code 설정) |
| `ps-execution-policy` | 스크립트 실행이 막혔다는 PowerShell 오류 | 기억·미확인 → 문장 원문 확인 뒤 |

---

## 10. 작업 묶음과 기록

### 10.1 작업 묶음 (TASKS에 옮길 것)

| 묶음 | 하는 일 | 검토 |
|---|---|---|
| **X1 자료** | `schemas/guides.schema.json`, `data/guides.json`(1순위 도구: Gemini CLI, Copilot+VS Code, Claude Code, Codex, 채팅 셋), `validate-data` 규칙, `scripts/check-guides.ts`, 어려운 말·에러 카드 더하기 | engine-guardian, ko-copy-editor |
| **X2 엔진** | `ai.builder` 태그, `q.aiTool`·`q.os` 질문, `selectGuides`, `renderAiSetup`, `data/templates.json` `aiSetup.*`, 예시·단위 시험, 골든 고침 | engine-guardian |
| **X3 화면** | 1단계 두 칸 + 직접 입력, 연습 맨 앞 칩, 설계도 받기 '내 AI 준비', `/guides`·`/guides/[tool]`·`/guides/agents-md`, zip 지연 묶음 | game-ux-designer, a11y-perf-auditor, reader-tester |
| **X4 최신 지키기** | `check-guide-versions.ts`, `guides-watch.yml`, TASKS·HUMAN 연결 | — |
| **X5 2순위 카드** | Cursor·Devin·Antigravity·웹 빌더: 원문 확인 뒤 1순위로 올림 | ko-copy-editor |

### 10.2 결정 기록 후보 (`docs/DECISIONS.md`, D72부터)

- AGENTS.md를 원본, 나머지는 가져오기 연결 — 이유: 2026-10 주요 도구 대부분이 읽고, 내용이 한 곳에만 있어야 어긋나지 않는다 — 틀렸을 때 비용: 도구별 파일에 내용을 복사하는 출력으로 바꾸면 된다(엔진 틀만).
- 확인 전 안내는 명령 없이 링크만 — 이유: 틀린 명령이 초심자에게 가장 비싸다 — 비용: 2순위 도구 사용자는 한 번 더 누른다.
- 훅 대신 권한 규칙 — 이유: OS별 스크립트가 필요 없고 auto 모드에서도 ask가 지켜진다 — 비용: 알림 같은 편의는 선택으로만.
- zip은 직접 만든 비압축 형식 — 이유: 의존성 없이 1~2KB, 지연 묶음 — 비용: 파일이 조금 크다(설정 파일이라 수십 KB).
- `ai.builder` 태그 — 이유: 웹 빌더는 배포·화면을 스스로 맡아 추천이 달라야 한다 — 비용: 점수표·골든 손질.
- OS는 브라우저 값으로 미리 누르고 바꿀 수 있게 — 이유: 질문 하나를 줄인다. 외부 호출이 없다 — 비용: 잘못 읽으면 이용자가 한 번 고친다.

### 10.3 HUMAN.md 항목 제안

- [ ] **H12** 클라우드 환경 Network access의 Allowed domains에 `cursor.com`, `developers.openai.com`, `docs.devin.ai`, `docs.windsurf.com`, `docs.lovable.dev`, `support.bolt.new`, `v0.app`, `docs.replit.com`, `ai.google.dev`, `antigravity.google`, `help.openai.com`, `support.claude.com`, `nodejs.org`를 더하기 — 이번 조사는 이 사이트들을 검색 요약으로만 봤다 — X1·X5 — (2026-10-14)
- [ ] **G01** 내 컴퓨터에서 9.5절 실측표 해 보기(가진 도구만) — AI 설정 파일이 실제로 읽히는지 — X2 출시 — (2026-10-14)
- [ ] **G02** Claude·Copilot·Codex 등 제품 이름을 안내에 쓰는 것과 "각 회사와 관계없어요" 문구 확인(상표) — 정식 출시 전 — X3 — (2026-10-14)

### 10.4 다른 새 요청과 만나는 곳

- 저장소를 비공개로 돌리면 소개 페이지의 저장소 링크(H07)를 빼야 한다. 안내 페이지에도 저장소 링크를 두지 않는다.
- 공식 문서에서 옮기는 것은 설치 명령 몇 줄과 파일 위치 같은 사실이다. 문단을 통째로 옮기지 않고 출처 링크를 늘 둔다.
- v3 디자인 설계(요청 2)가 설계도 6번 '디자인 지시'를 키우면, 그 내용은 `design.instructions.md`·`.mdc`·웹 빌더 글로 그대로 흘러간다(7.3절). 디자인 쪽 문서와 틀 이름을 맞춘다.

---

## 11. 확인하지 못한 것 (needsReview)

1. Cursor 전부(설치 명령, `.mdc` 머리말 형식, 글롭 쓰는 법, AGENTS.md 중첩 동작, 훅·MCP·스킬 위치) — 검색 요약뿐.
2. Codex 문서 사이트 전부(AGENTS.md 탐색, 스킬 위치, 훅 신뢰, MCP), Windows 설치(WSL2 대 PowerShell), 무료 계정 범위, Windows 앱 설치 방법.
3. Devin Desktop의 스킬·훅·MCP, 무료 등급. 이름이 바뀐 뒤 Windsurf 문서 주소가 계속 살아 있을지.
4. Antigravity 설치·가입, 규칙 머리말 값.
5. 웹 빌더 다섯의 메뉴 경로(화면 이름이 영어인지 한국어인지 포함), AI Studio에서 규칙을 넣는 곳.
6. Gemini 앱 Gems 무료 여부, Claude·ChatGPT 프로젝트 지시 칸 이름.
7. Claude Code의 `Bash(...)` 권한 규칙이 Windows PowerShell 도구에도 걸리는지, 리눅스 알림 훅 원문.
8. VS Code `applyTo`가 중괄호 글롭을 받는지.
9. Windows 기본 PowerShell 버전(Copilot CLI는 6 이상 필요).
10. 가입 화면 순서(Claude·ChatGPT·구글·GitHub 계정 만들기) — 이번 조사 범위 밖. 화면 순서는 자주 바뀌므로 안내에는 '공식 가입 주소 + 무엇을 고르면 되는지'만 쓰는 것을 권한다.

---

## 12. 출처 (모두 2026-10-14 확인)

**[원문] Claude Code** — https://code.claude.com/docs/en/setup · https://code.claude.com/docs/en/overview · https://code.claude.com/docs/en/memory · https://code.claude.com/docs/en/permission-modes · https://code.claude.com/docs/en/permissions · https://code.claude.com/docs/en/settings · https://code.claude.com/docs/en/hooks-guide · https://code.claude.com/docs/en/hooks · https://code.claude.com/docs/en/skills · https://code.claude.com/docs/en/sub-agents · https://code.claude.com/docs/en/mcp · https://code.claude.com/docs/en/plugins

**[저장소] Codex** — https://github.com/openai/codex (README.md, docs/install.md, docs/config.md)

**[저장소] Gemini CLI** — https://github.com/google-gemini/gemini-cli (README.md, docs/get-started/installation.mdx, docs/cli/gemini-md.md, docs/cli/skills.md, docs/hooks/index.md, docs/tools/mcp-server.md, docs/cli/custom-commands.md, docs/resources/quota-and-pricing.md)

**[저장소] GitHub Copilot** — https://github.com/github/docs (content/copilot/get-started/plans.md, content/copilot/reference/custom-instructions-support.md, content/copilot/concepts/prompting/response-customization.md, content/copilot/reference/hooks-reference.md, content/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli.md, data/reusables/copilot/ci-support-*.md, data/variables/copilot.yml)

**[저장소] VS Code** — https://github.com/microsoft/vscode-docs (docs/agent-customization/custom-instructions.md, agent-skills.md, prompt-files.md, hooks.md, mcp-servers.md, docs/agents/overview.md, docs/agents/run/agent-harnesses.md, docs/setup/copilot.md; 모두 DateApproved 10/7/2026). 게시 주소: https://code.visualstudio.com/docs/agent-customization/custom-instructions

**[저장소] 표준** — https://github.com/agentskills/agentskills (docs/specification.mdx) · https://github.com/agentsmd/agents.md (README.md)

**[레지스트리]** — https://registry.npmjs.org (`npm view` 2026-10-14) · https://nodejs.org/dist/index.json · https://github.com/nodejs/Release (schedule.json)

**[검색 요약] Codex** — https://developers.openai.com/codex/guides/agents-md · https://developers.openai.com/codex/skills · https://developers.openai.com/codex/hooks · https://developers.openai.com/codex/mcp · https://developers.openai.com/codex/config-reference · https://chatgpt.com/codex/pricing/ · https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan · https://developers.openai.com/codex/windows · https://community.openai.com/t/official-codex-app-installation-command-resolves-to-an-unrelated-third-party-app/1386469 · https://help.openai.com/en/articles/6825453-chatgpt-release-notes

**[검색 요약] Cursor** — https://cursor.com/docs/rules · https://cursor.com/docs/skills · https://cursor.com/docs/hooks · https://cursor.com/docs/mcp · https://cursor.com/docs/cli/overview · https://cursor.com/download · https://cursor.com/help/account-and-billing/pricing.md · https://forum.cursor.com/t/nested-agents-md-files-not-being-loaded/138411

**[검색 요약] Devin Desktop(옛 Windsurf)** — https://docs.devin.ai/desktop/devin-desktop-faq · https://windsurf.com/changelog · https://devin.ai/blog/windsurf-is-now-devin-desktop · https://docs.windsurf.com/windsurf/cascade/agents-md · https://docs.windsurf.com/windsurf/cascade/memories

**[검색 요약] Antigravity** — https://antigravity.google/docs/rules/ · https://antigravity.google/docs/migration/workflows-to-skills/

**[검색 요약] 웹 빌더** — https://docs.lovable.dev/features/knowledge · https://docs.lovable.dev/introduction/subscription-plans · https://support.bolt.new/building/using-bolt/project-settings · https://support.bolt.new/account-and-subscription/tokens · https://v0.app/docs/instructions · https://v0.app/docs/pricing · https://docs.replit.com/replitai/replit-dot-md · https://docs.replit.com/billing/plans/starter-plan · https://ai.google.dev/gemini-api/docs/aistudio-build-mode

**[검색 요약] 채팅 AI·표준 단체** — https://claude.com/pricing · https://support.claude.com/en/articles/9517075-what-are-projects · https://help.openai.com/en/articles/10169521-projects-in-chatgpt · https://gemini.google/overview/canvas/ · https://openai.com/index/agentic-ai-foundation/
