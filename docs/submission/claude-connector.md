# Claude 커넥터 목록 제출 답안지 (H33, D158)

claude.ai의 '커넥터 목록(Connectors Directory)'에 코드잇소를 올리는 일은 소유자 계정으로만 할 수 있다.
유료 Claude 요금제로 로그인하고, 정책 동의 7개를 직접 눌러야 한다.
아래 답을 개발자 포털 칸에 순서대로 붙여 넣으면 된다(약 10분).
공식 안내: https://claude.com/docs/connectors/building/submission

준비물: 유료 Claude 계정(Pro 이상). 아이콘은 포털이 주소(URL)로 받는다: `https://codeitso.yoorrard.workers.dev/brand/icon-512.5c045f3a.png`(512×512 PNG, 사이트 로고와 같다).

1. https://claude.ai/directory/manage 에 들어가 **Submit new** → **MCP connector**를 고른다.
2. 아래 단계마다 답을 붙여 넣는다. 영어 칸은 그대로 복사한다.

## 1. Connection

- Server URL: `https://codeitso.yoorrard.workers.dev/mcp`
- Users connect to different URLs: 고르지 않는다(모두 같은 주소)

## 2. Tools

서버에서 저절로 불러온다. 도구 7개와 프롬프트 1개가 모두 '읽기 전용(read-only)'으로 나와야 한다.
제목이나 주석이 빠졌다는 경고는 없어야 한다(모든 도구에 `title`·`readOnlyHint: true`·`destructiveHint: false`가 있다).

## 3. Listing

- **Server name** (100자 안):
  `codeitso (코드잇소)`
- **One-liner** (200자 안):
  `Pick app-building materials (fonts, icons, UI kits, public APIs incl. Korean public data, MCP servers, AI models, templates, datasets) from a free catalog refreshed daily.`
- **Description** (2,000자 안):

```text
codeitso (코드잇소) is a free, read-only catalog of 150,000+ public materials for building apps, refreshed daily from public sources such as GitHub, npm, Google Fonts, public API lists, the Official MCP Registry, Hugging Face, models.dev and Korea's data.go.kr.

Ask Claude to pick materials for what you are building, and it can:
- Search the catalog in Korean or English (e.g. "급식 API", "chart library", "Korean font") and browse categories by popularity, name or recent update.
- Get details for chosen materials: official URL, license, install command and snippet from the source, required API key or OAuth, and type-specific facts: remote URLs and packages for MCP servers, base URL, env var names and free tier for APIs, weights and Korean support for fonts.
- Compare current AI models by price per 1M tokens, context window and input types (models.dev data refreshed daily).
- Open starter kits: curated material sets with a build outline for school apps, games, office tools and more.
- Read a cart link made on the codeitso website, or turn Claude's picks into a cart link you can open to see previews and licenses.

All tools are read-only. No sign-in, no account, no cookies. Search words, material ids and links are used only to answer and are not stored; only anonymous daily counts of tool names and client app types are kept. Descriptions and install commands are third-party text from each source; codeitso has not run or reviewed them, and the server labels them as such.
```

- **Categories** (1~5개): `Developer tools`, `Productivity`(목록에 있는 이름 중 가장 가까운 것을 고른다)
- **Documentation URL**: `https://codeitso.yoorrard.workers.dev/connect`
- **Privacy policy URL**: `https://codeitso.yoorrard.workers.dev/legal/privacy#mcp`
- **Support contact**: `yyj19962004@gmail.com` (사이트 바닥글에 공개된 운영자 메일)
- **Icon** (주소로 넣는다): `https://codeitso.yoorrard.workers.dev/brand/icon-512.5c045f3a.png`
  - 로고를 다시 만들면(`npm run logo`) 파일 이름의 해시가 바뀐다. 그때는 포털의 아이콘 주소도 새 주소로 고친다.
  - 등록한 뒤에도 포털의 목록 편집에서 아이콘·설명·링크를 고칠 수 있다(고친 것은 검토 뒤 반영).
- **URL slug**: `codeitso` (한 번 정하면 바꿀 수 없다)

## 4. Use cases

- **Primary use cases**:

```text
1. Choose fonts, icons, UI kits, APIs and libraries for an app, comparing licenses and auth requirements before installing.
2. Find Korean public data APIs (school meals, weather, transport) and how to call them.
3. Find an MCP server for a service and get its remote URL or package to connect it.
4. Pick an AI model API by price, context window and input types.
5. Hand picks between the codeitso website cart and Claude (cart links both ways).
```

- **What users need before connecting**: `Nothing. No account, plan or API key is needed.`
- **Reads or writes data**: `Reads only`

## 5. Company

- Company name: `코드잇소 (codeitso)`, 개인이면 운영자 이름 `유영재`
- Website: `https://codeitso.yoorrard.workers.dev`
- Primary contact: 소유자 이름과 위 메일

## 6. Authentication

- Authentication requirement: **None / Not required**
- 서버가 로그인 없이 동작한다(공개 자료만 읽는다). OAuth 칸은 비워 둔다.

## 7. Data handling

- Underlying API: **Your own** (코드잇소가 직접 만든 정적 자료를 읽는다. 바깥 API를 대신 부르지 않는다)
- Personal health data: **No**
- Sponsored content: **No** (광고·제휴 링크 없음)

## 8. Test & launch

- **Test account**: `No account needed. The server is public and read-only.`
- **Reviewer instructions**:

```text
Add https://codeitso.yoorrard.workers.dev/mcp as a custom connector (no authentication) and try:
1. "Use codeitso to find a free weather API and a Korean font for a school app." (codeitso_search, codeitso_get_materials)
2. "Compare the cheapest AI models that accept images with codeitso." (codeitso_find_models)
3. "Show codeitso starter kits and open the school kit." (codeitso_get_kits)
4. "List MCP servers in codeitso and show how to connect the Notion one." (codeitso_browse, codeitso_search, codeitso_get_materials)
5. "Make a codeitso cart link with google-fonts:roboto." then "Open that cart link." (codeitso_make_cart_link, codeitso_open_cart)
The prompt "plan_app" (앱 재료 고르기) is also available from the prompts menu.
```

- 'I have run every tool' 확인: MCP Inspector와 Claude Code로 7개 도구를 모두 불러 보았다(2026-11-09, D154~D157의 검증 기록).

## 9. Compliance

정책 동의 7개(디렉터리 지침, 1차 API 사용, 금융 거래, AI 미디어 생성, 프롬프트 주입, 대화 자료 수집, 공개 문서)를 읽고 모두 체크한다.

- 코드잇소는 돈을 다루지 않는다.
- 그림·소리를 만들지 않는다.
- 대화 내용을 모으지 않는다.
- 출처 글은 '제3자 글'로 표시해 프롬프트 주입에 대비한다.

## 10. Review and submit

마지막 화면에서 경고(짧은 답 등)가 없는지 보고 제출한다.
제출 뒤 상태는 같은 포털(https://claude.ai/directory/manage)에서 본다.
기본으로 'Community' 커넥터로 올라가고, 일부는 사람이 검토한다.

## 함께 낼 수 있는 것 (선택)

Claude Code 플러그인(`plugins/codeitso`, 장터 `.claude-plugin/marketplace.json`)도 플러그인 목록에 낼 수 있다: https://claude.com/docs/plugins/submit
같은 포털에서 **Submit new → Plugin**을 고르고 저장소 주소 `https://github.com/yoorrard/codeitso`를 넣는다.
