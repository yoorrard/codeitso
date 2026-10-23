// GitHub 오픈소스 프로젝트(AI 앱·봇·명령줄 도구·게임·인증·CMS·쇼핑몰·브라우저 확장, 프레임워크별 오픈소스 앱)를
// 주제별 awesome 목록에서 모아 오픈소스 진열대에 쓴다.
//   node scripts/import/oss-github.ts
// 목록 항목은 awesome.ecosyste.ms 색인, 저장소 정보(설명·별·라이선스·주제)는 repos.ecosyste.ms(CC BY-SA 4.0).
// GitHub 주제 검색(별 순, 주제마다 최대 1,000개)은 GitHub 검색 API가 되는 곳에서만 더한다 (이 작업 환경에서는 막혀 있다).
// awesome-selfhosted·어썸 리스트·GitLab·Codeberg 파일에 이미 있는 저장소는 뺀다 (그 스크립트들 다음에 돈다). 라이브러리 진열대와는 쓰임이 달라 겹쳐도 둔다.
import {
  type ListPick, type OssKind, type RepoCandidate, type RepoMeta, candidatesFromLists, githubTopicRepos, knownRepos, main,
  repoItems, writeCatalog,
} from './oss-lib.ts';

export const MIN_STARS = 50;

const fixed = (kind: OssKind) => (): OssKind => kind;

const PICKS: ListPick[] = [
  // AI 앱·에이전트
  { list: 'e2b-dev/awesome-ai-agents', kind: fixed('ai-apps'), tags: ['ai-agent'] },
  { list: 'kyrolabs/awesome-agents', section: /^(Conversational|Software Development|Automation|Knowledge|Research|Game|Memory)/i, kind: fixed('ai-apps'), tags: ['ai-agent'] },
  { list: 'Jenqyang/Awesome-AI-Agents', kind: fixed('ai-apps'), tags: ['ai-agent'] },
  { list: 'steel-dev/awesome-web-agents', kind: fixed('ai-apps'), tags: ['web-agent'] },
  { list: 'sindresorhus/awesome-chatgpt', section: /^(Apps|Web apps|CLI tools|Bots|Browser extensions)/i, kind: (_t, s) => (/Bots/i.test(s) ? 'bots' : /Browser/i.test(s) ? 'extensions' : /CLI/i.test(s) ? 'cli' : 'ai-apps'), tags: ['chatgpt'] },
  { list: 'Danielskry/Awesome-RAG', section: /Frameworks/i, kind: fixed('ai-apps'), tags: ['rag'] },
  { list: 'bradagi/awesome-cli-coding-agents', kind: fixed('ai-apps'), tags: ['coding-agent'] },
  // 로그인·인증
  { list: 'casdoor/awesome-auth', kind: fixed('auth') },
  { list: 'yackermann/awesome-webauthn', section: /(Server Libraries|Client Libraries|Demos)/i, kind: fixed('auth'), tags: ['webauthn', 'passkey'] },
  { list: 'mjhea0/awesome-fastapi', section: /> Auth$/i, kind: fixed('auth'), tags: ['fastapi'] },
  { list: 'humiaozuzu/awesome-flask', section: /> Auth$/i, kind: fixed('auth'), tags: ['flask'] },
  { list: 'Solido/awesome-flutter', section: /> Auth$/i, kind: fixed('auth'), tags: ['flutter'] },
  { list: 'PatrickJS/awesome-angular', section: /Authentication/i, kind: fixed('auth'), tags: ['angular'] },
  // CMS·블로그 엔진·정적 사이트 생성기
  { list: 'myles/awesome-static-generators', kind: fixed('cms'), tags: ['static-site-generator'] },
  { list: 'sindresorhus/awesome-nodejs', section: /Content management systems/i, kind: fixed('cms'), tags: ['nodejs'] },
  { list: 'chiraggude/awesome-laravel', section: /^Content Management Systems/i, kind: fixed('cms'), tags: ['laravel'] },
  { list: 'wsvincent/awesome-django', section: /Content Management Systems/i, kind: fixed('cms'), tags: ['django'] },
  // 쇼핑몰
  { list: 'wsvincent/awesome-django', section: /ECommerce/i, kind: fixed('ecommerce'), tags: ['django'] },
  // 봇
  { list: 'DenisIzmaylov/awesome-telegram-bots', kind: fixed('bots'), tags: ['telegram'] },
  { list: 'ebertti/awesome-telegram', section: /Bot Libs|^Bots/i, kind: fixed('bots'), tags: ['telegram'] },
  { list: 'jacc/awesome-discord', section: /API Libraries/i, kind: fixed('bots'), tags: ['discord'] },
  { list: 'matiassingers/awesome-slack', section: /(Libraries and SDKs|Open-Source Slack Apps)/i, kind: fixed('bots'), tags: ['slack'] },
  { list: 'telegram-mini-apps-dev/awesome-telegram-mini-apps', section: /^(Libraries|Projects|UI Kits)/i, kind: fixed('bots'), tags: ['telegram', 'mini-app'] },
  // 브라우저 확장
  { list: 'fregante/Awesome-WebExtensions', section: /^(Libraries and Frameworks|Tools|Testing)/i, kind: fixed('extensions'), tags: ['browser-extension'] },
  { list: 'linsa-io/chrome-extensions', kind: fixed('extensions'), tags: ['chrome'] },
  // 명령줄 도구
  { list: 'agarrharr/awesome-cli-apps', section: /^(?!Other Awesome Lists)/, kind: fixed('cli') },
  { list: 'sindresorhus/awesome-nodejs', section: /Command-line (apps|utilities)/i, kind: fixed('cli'), tags: ['nodejs'] },
  { list: 'shadawck/awesome-cli-frameworks', kind: fixed('cli'), tags: ['cli-framework'] },
  // 게임·게임 엔진
  { list: 'michelpereira/awesome-open-source-games', kind: fixed('games') },
  { list: 'bobeff/open-source-games', kind: fixed('games') },
  { list: 'proyecto26/awesome-jsgames', kind: fixed('games'), tags: ['javascript'] },
  { list: 'stevinz/awesome-game-engine-dev', section: /^Libraries > (JavaScript|C#|Python|Rust|Go|Lua|Dart|Haxe|Kotlin|Swift)/i, kind: fixed('games'), tags: ['game-engine'] },
  { list: 'Solido/awesome-flutter', section: /^Engines > Game/i, kind: fixed('games'), tags: ['flutter'] },
  // 프레임워크별 오픈소스 앱 (참고용 실제 앱)
  { list: 'sindresorhus/awesome-electron', section: /^Apps > Open Source/i, kind: fixed('projects'), tags: ['electron'] },
  { list: 'tauri-apps/awesome-tauri', section: /^Applications/i, kind: fixed('projects'), tags: ['tauri'] },
  { list: 'Solido/awesome-flutter', section: /^Open Source Apps/i, kind: fixed('projects'), tags: ['flutter'] },
  { list: 'jondot/awesome-react-native', section: /^Open Source Apps/i, kind: fixed('projects'), tags: ['react-native'] },
  { list: 'vuejs/awesome-vue', section: /Projects Using Vue\.js > Open Source/i, kind: fixed('projects'), tags: ['vue'] },
  { list: 'unicodeveloper/awesome-nextjs', section: /^Apps/i, kind: fixed('projects'), tags: ['nextjs'] },
  { list: 'nestjs/awesome-nestjs', section: /^Projects using NestJS/i, kind: fixed('projects'), tags: ['nestjs'] },
  { list: 'mjhea0/awesome-fastapi', section: /Open Source Projects/i, kind: fixed('projects'), tags: ['fastapi'] },
  { list: 'wsvincent/awesome-django', section: /Open Source Projects/i, kind: fixed('projects'), tags: ['django'] },
  { list: 'humiaozuzu/awesome-flask', section: /(Open Source Projects|Built with Flask)/i, kind: fixed('projects'), tags: ['flask'] },
  { list: 'chiraggude/awesome-laravel', section: /^Codebases for Reference/i, kind: fixed('projects'), tags: ['laravel'] },
  { list: 'vitejs/awesome-vite', section: /^Projects Using Vite/i, kind: fixed('projects'), tags: ['vite'] },
  { list: 'Alexintosh/Awesome-Ionic', section: /Open source apps/i, kind: fixed('projects'), tags: ['ionic'] },
  { list: 'TheComputerM/awesome-svelte', section: /^Application Examples/i, kind: fixed('projects'), tags: ['svelte'] },
];

const TOPICS: [string, OssKind][] = [
  ['ai-agents', 'ai-apps'], ['llm-app', 'ai-apps'], ['rag', 'ai-apps'], ['chatbot', 'ai-apps'],
  ['authentication', 'auth'], ['oauth2', 'auth'], ['headless-cms', 'cms'], ['static-site-generator', 'cms'],
  ['ecommerce', 'ecommerce'], ['discord-bot', 'bots'], ['telegram-bot', 'bots'], ['slack-bot', 'bots'],
  ['browser-extension', 'extensions'], ['chrome-extension', 'extensions'], ['cli', 'cli'], ['game-engine', 'games'], ['game', 'games'],
  ['self-hosted', 'apps'],
];

main(async () => {
  const cands = await candidatesFromLists(PICKS);
  let topicHits = 0;
  for (const [topic, kind] of TOPICS) {
    for (const m of await githubTopicRepos(topic, MIN_STARS)) {
      const key = m.fullName.toLowerCase();
      if (cands.has(key)) continue;
      cands.set(key, { slug: m.fullName, listName: '', listDescription: m.description, kind, tags: [topic], lists: [`topic:${topic}`] });
      topicHits++;
    }
  }
  console.log(`  후보 ${cands.size} (주제 검색 ${topicHits})`);
  const { items, dropped } = await repoItems([...cands.values()], {
    sourceId: 'github-lists',
    category: 'opensource',
    source: { name: 'GitHub (awesome 목록에서 고른 저장소)', url: 'https://awesome.ecosyste.ms/' },
    minStars: MIN_STARS,
    dropArchived: false,
    rekind: (c: RepoCandidate, _m: RepoMeta) => c.kind,
    skip: knownRepos('opensource', ['github-lists', 'npm', 'pypi', 'pub-dev']),
  });
  console.log(`  뺀 것: ${JSON.stringify(dropped)}`);
  writeCatalog('opensource', {
    id: 'github-lists',
    name: 'GitHub 오픈소스 (주제별 awesome 목록)',
    url: 'https://awesome.ecosyste.ms/',
    license: 'Repository choice from community awesome lists (indexed by awesome.ecosyste.ms, CC BY-SA 4.0); repository metadata from repos.ecosyste.ms (CC BY-SA 4.0); each repository keeps its own license (field license).',
    cut: `별 ${MIN_STARS}개 이상, 포크 제외 (보관된 저장소는 archived 꼬리표). 목록: ${[...new Set(PICKS.map((p) => p.list))].join(', ')}`,
    note: 'GitHub 주제 검색(별 순)은 GitHub 검색 API가 되는 곳에서만 더해진다. 이 판은 awesome 목록만으로 만들었다.',
  }, items);
});
