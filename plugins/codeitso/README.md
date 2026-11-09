# codeitso plugin (코드잇소)

Adds two things to Claude Code:

- **MCP server** `codeitso` (`https://codeitso.yoorrard.workers.dev/mcp`, read-only, no sign-in): search and browse 150,000+ public materials for building apps — fonts, colors, icons, UI kits, public APIs (incl. Korean public data), MCP servers, agent skills, open-source libraries, templates, datasets — with licenses and install commands; compare current AI models by price and context; and turn the picks into a cart link for the website.
- **Skill** `codeitso`: a workflow for picking materials per feature, comparing licenses and auth, and confirming before installing anything.

```
/plugin marketplace add yoorrard/codeitso
/plugin install codeitso@codeitso
```

Other AI apps (claude.ai, ChatGPT, Cursor, VS Code, Codex, Gemini CLI, Windsurf): see https://codeitso.yoorrard.workers.dev/connect. The skill folder `skills/codeitso` follows the [Agent Skills](https://agentskills.io) format and can be copied into any compatible agent.

코드잇소 MCP는 읽기 전용이고, 검색어·재료 id는 답을 만드는 데만 쓰고 저장하지 않아요. 재료 설명과 설치 명령은 각 출처가 쓴 글이에요.
