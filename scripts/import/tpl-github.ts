// GitHub의 스타터·보일러플레이트·템플릿 저장소를 받아 템플릿 진열대에 쓴다.
//   node scripts/import/tpl-github.ts
// 1) awesome 목록(awesome.ecosyste.ms 색인)에서 '보일러플레이트·스타터·템플릿' 칸만 골라 저장소를 모은다 → github-lists.json
// 2) 무료 템플릿을 공개하는 조직(Start Bootstrap, Creative Tim 무료판 등)의 저장소 → github-orgs.json
// 3) GitHub 주제 검색(별 순, 주제마다 최대 1,000개)은 토큰이 되는 곳에서만 더한다 (이 작업 환경에서는 막혀 있다).
// 저장소 정보(설명·별·라이선스·주제)는 repos.ecosyste.ms(GitHub 공개 거울, CC BY-SA 4.0). 포크·보관된 저장소는 뺀다.
// 다른 템플릿 출처(공식 갤러리 등)에 이미 있는 저장소는 뺀다 (그 스크립트들 다음에 돈다).
import {
  type Item, type ListPick, type RepoCandidate, type RepoMeta, type TplKind, candidatesFromLists, githubTopicRepos, main,
  knownRepos, makeId, makeItem, ownerRepos, repoItems, repoPreview, summaryOf, tagify, templateKindByText, writeCatalog,
} from './oss-lib.ts';

export const MIN_STARS = 20;

const k = (fallback: TplKind) => (text: string): TplKind => templateKindByText(text, text.split(' ').slice(0, 4).join(' ')) ?? fallback;

// 칸 이름으로 정하는 소분류 (모바일·데스크톱·확장처럼 칸이 더 정확한 경우).
const bySection = (fallback: TplKind) => (text: string, section: string): TplKind => {
  if (/android|ios|mobile|react native|flutter|ionic|hybrid/i.test(section)) return 'mobile';
  if (/browser|extension/i.test(section)) return 'extension';
  if (/tauri|electron|desktop/i.test(section)) return 'desktop';
  return templateKindByText(text, text.split(' ').slice(0, 4).join(' ')) ?? fallback;
};

const PICKS: ListPick[] = [
  { list: 'xcomptek/awesome-saas-boilerplates', kind: k('saas'), tags: ['saas'] },
  { list: 'einguterwaran/awesome-opensource-boilerplates', kind: bySection('saas') },
  { list: 'melvin0008/awesome-projects-boilerplates', kind: bySection('web-starter') },
  { list: 'unicodeveloper/awesome-nextjs', section: /^Boilerplates/i, kind: k('web-starter'), tags: ['nextjs'] },
  { list: 'vitejs/awesome-vite', section: /> (Templates|Tauri)$/i, kind: bySection('web-starter'), tags: ['vite'] },
  { list: 'vuejs/awesome-vue', section: /> Scaffold$/i, kind: k('web-starter'), tags: ['vue'] },
  { list: 'TheComputerM/awesome-svelte', section: /^Scaffold/i, kind: k('web-starter'), tags: ['svelte'] },
  { list: 'one-aalam/awesome-astro', section: /Starter Kits/i, kind: k('blog-portfolio'), tags: ['astro'] },
  { list: 'one-aalam/awesome-solid-js', section: /Starter Kits/i, kind: k('web-starter'), tags: ['solid'] },
  { list: 'birobirobiro/awesome-shadcn-ui', section: /^Boilerplates/i, kind: k('web-starter'), tags: ['shadcn-ui'] },
  { list: 'Solido/awesome-flutter', section: /^Templates/i, kind: () => 'mobile', tags: ['flutter'] },
  { list: 'jondot/awesome-react-native', section: /^Seeds/i, kind: () => 'mobile', tags: ['react-native'] },
  { list: 'Alexintosh/Awesome-Ionic', section: /Boilerplate/i, kind: () => 'mobile', tags: ['ionic'] },
  { list: 'sindresorhus/awesome-electron', section: /^Boilerplates/i, kind: () => 'desktop', tags: ['electron'] },
  { list: 'tauri-apps/awesome-tauri', section: /^Templates/i, kind: () => 'desktop', tags: ['tauri'] },
  { list: 'fregante/Awesome-WebExtensions', section: /^(Boilerplates|Sample Extensions)/i, kind: () => 'extension', tags: ['browser-extension'] },
  { list: 'telegram-mini-apps-dev/awesome-telegram-mini-apps', section: /^Templates/i, kind: () => 'bot', tags: ['telegram'] },
  { list: 'DenisIzmaylov/awesome-telegram-bots', section: /^(Examples|Starter Kits)/i, kind: () => 'bot', tags: ['telegram'] },
  { list: 'mjhea0/awesome-fastapi', section: /> Boilerplate$/i, kind: k('backend'), tags: ['fastapi', 'python'] },
  { list: 'wsvincent/awesome-django', section: /> Boilerplate$/i, kind: k('web-starter'), tags: ['django', 'python'] },
  { list: 'humiaozuzu/awesome-flask', section: /Boilerplate/i, kind: k('web-starter'), tags: ['flask', 'python'] },
  { list: 'chiraggude/awesome-laravel', section: /^Starter Projects/i, kind: k('web-starter'), tags: ['laravel', 'php'] },
  { list: 'nestjs/awesome-nestjs', section: /Boilerplates/i, kind: k('backend'), tags: ['nestjs'] },
  { list: 'gofiber/awesome-fiber', section: /Boilerplates/i, kind: k('backend'), tags: ['go', 'fiber'] },
  { list: 'oven-sh/awesome-bun', section: /^Boilerplates/i, kind: k('web-starter'), tags: ['bun'] },
  { list: 'lyqht/awesome-supabase', section: /Starters/i, kind: k('web-starter'), tags: ['supabase'] },
  { list: 'BrodyYoung/awesome-admin', kind: () => 'admin', tags: ['admin'] },
  { list: 'jaywcjlove/awesome-uikit', section: /^Admin Template/i, kind: () => 'admin', tags: ['admin'] },
  { list: 'nordicgiant2/awesome-landing-page', kind: () => 'landing', tags: ['landing-page'] },
  { list: 'guilyx/awesome-github-pages-portfolios', section: /^Templates/i, kind: () => 'blog-portfolio', tags: ['portfolio', 'github-pages'] },
  { list: 'planetjekyll/awesome-jekyll-themes', kind: k('blog-portfolio'), tags: ['jekyll'] },
  { list: 'Ailln/awesome-hexo-theme', kind: () => 'blog-portfolio', tags: ['hexo'] },
];

// GitHub 주제 → 소분류 (검색이 되는 곳에서만 쓴다).
const TOPICS: [string, TplKind][] = [
  ['nextjs-template', 'web-starter'], ['nextjs-starter', 'web-starter'], ['nextjs-boilerplate', 'web-starter'],
  ['react-template', 'web-starter'], ['react-boilerplate', 'web-starter'], ['vue-template', 'web-starter'],
  ['vite-template', 'web-starter'], ['svelte-template', 'web-starter'], ['sveltekit-template', 'web-starter'],
  ['astro-template', 'blog-portfolio'], ['astro-theme', 'blog-portfolio'], ['nuxt-template', 'web-starter'],
  ['remix-stack', 'web-starter'], ['t3-stack', 'web-starter'], ['django-template', 'web-starter'],
  ['fastapi-template', 'backend'], ['express-boilerplate', 'backend'], ['nestjs-boilerplate', 'backend'],
  ['flutter-template', 'mobile'], ['react-native-template', 'mobile'], ['react-native-boilerplate', 'mobile'], ['expo-template', 'mobile'],
  ['electron-boilerplate', 'desktop'], ['tauri-template', 'desktop'],
  ['saas-boilerplate', 'saas'], ['saas-starter-kit', 'saas'], ['saas-template', 'saas'],
  ['admin-dashboard', 'admin'], ['admin-template', 'admin'], ['dashboard-template', 'admin'],
  ['landing-page-template', 'landing'], ['portfolio-template', 'blog-portfolio'], ['blog-template', 'blog-portfolio'],
  ['ecommerce-template', 'ecommerce'], ['chatbot-template', 'ai-app'], ['ai-template', 'ai-app'],
  ['chrome-extension-boilerplate', 'extension'], ['chrome-extension-template', 'extension'],
  ['discord-bot-template', 'bot'], ['telegram-bot-template', 'bot'], ['slack-bot-template', 'bot'],
  ['game-template', 'game'], ['phaser3-template', 'game'], ['html-template', 'html'], ['bootstrap-template', 'html'],
];

// 무료 템플릿을 오픈소스로 공개하는 조직. 템플릿이 아닌 저장소(도구·문서)는 이름·설명 낱말로 거른다.
const ORGS = [
  'StartBootstrap', 'creativetimofficial', 'themesberg', 'cruip', 'ColorlibHQ', 'puikinsh', 'BootstrapDash',
  'app-generator', 'codedthemes', 'themeselection', 'coreui', 'tailwindtoolbox', 'horizon-ui', 'themewagon', 'devias-io',
  'tabler', 'minimal-ui-kit', 'Kamona-WD', 'flatlogic', 'phaserjs',
];
const TEMPLATE_WORDS = /\b(templates?|themes?|dashboards?|admin|landing|starters?|kits?|boilerplates?|ui kit|website|portfolio|one[- ]page|resume)\b/i;

const clone = (m: RepoMeta) => `git clone https://github.com/${m.fullName}.git`;

main(async () => {
  // 1) awesome 목록 + 주제 검색
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
    category: 'templates',
    source: { name: 'GitHub (awesome 목록에서 고른 템플릿)', url: 'https://awesome.ecosyste.ms/' },
    minStars: MIN_STARS,
    dropArchived: true,
    install: clone,
    skip: knownRepos('templates', ['github-lists', 'github-orgs']),
    rekind: (c: RepoCandidate, m: RepoMeta) => {
      // 목록 칸이 정한 모바일·데스크톱·확장·봇·관리자·랜딩·포트폴리오는 그대로, 나머지는 저장소 설명으로 다시 고른다.
      if (['mobile', 'desktop', 'extension', 'bot', 'admin', 'landing'].includes(c.kind)) return c.kind;
      return templateKindByText(`${m.fullName.split('/')[1]?.replace(/[-_]/g, ' ')} ${m.description} ${m.topics.join(' ')}`, m.fullName.split('/')[1]?.replace(/[-_]/g, ' ')) ?? c.kind;
    },
  });
  console.log(`  뺀 것: ${JSON.stringify(dropped)}`);
  writeCatalog('templates', {
    id: 'github-lists',
    name: 'GitHub 스타터·보일러플레이트 (awesome 목록)',
    url: 'https://awesome.ecosyste.ms/',
    license: 'Repository choice from community awesome lists (indexed by awesome.ecosyste.ms, CC BY-SA 4.0); repository metadata from repos.ecosyste.ms (CC BY-SA 4.0); each repository keeps its own license (field license).',
    cut: `별 ${MIN_STARS}개 이상, 포크·보관된 저장소 제외. 목록: ${PICKS.map((p) => p.list).join(', ')}`,
    note: 'GitHub 주제 검색(별 순)은 GitHub 검색 API가 되는 곳에서만 더해진다. 이 판은 awesome 목록만으로 만들었다.',
  }, items);

  // 2) 조직 저장소
  const already = new Set([...knownRepos('templates', ['github-orgs']), ...items.map((i) => (i.url.replace('https://github.com/', '')).toLowerCase())]);
  const orgItems: Item[] = [];
  for (const org of ORGS) {
    const repos = await ownerRepos(org);
    const picked = repos.filter((r) => !r.fork && !r.archived && r.stars >= MIN_STARS && (r.template || TEMPLATE_WORDS.test(`${r.fullName} ${r.description}`))
      && !/\b(pro|premium)\b/i.test(r.fullName.split('/')[1]?.replace(/[-_]/g, ' ') ?? '') && !/\b(premium version|pro version)\b.*\bonly\b/i.test(r.description));
    console.log(`  ${org}: ${picked.length}/${repos.length}`);
    for (const r of picked) {
      if (already.has(r.fullName.toLowerCase())) continue;
      const text = `${r.fullName.split('/')[1]?.replace(/[-_]/g, ' ')} ${r.description} ${r.topics.join(' ')}`;
      orgItems.push(makeItem({
        id: makeId('github-orgs', r.fullName),
        name: r.fullName.split('/')[1] ?? r.fullName,
        kind: templateKindByText(text, r.fullName.split('/')[1]?.replace(/[-_]/g, ' ')) ?? 'html',
        category: 'templates',
        summary: summaryOf(r.description) ?? r.fullName,
        url: `https://github.com/${r.fullName}`,
        source: { name: `GitHub · ${org}`, url: `https://github.com/${org}` },
        license: r.license,
        metrics: { stars: r.stars, updatedAt: r.pushedAt },
        tags: tagify([org.toLowerCase(), r.language, ...r.topics.slice(0, 8)]),
        preview: { ...repoPreview(r), ...(r.homepage ? { homepage: r.homepage } : {}) },
        use: { install: clone(r) },
      }));
    }
  }
  writeCatalog('templates', {
    id: 'github-orgs',
    name: '무료 템플릿 공개 조직 (GitHub)',
    url: 'https://github.com/StartBootstrap',
    license: 'Repository metadata of free-template organizations via repos.ecosyste.ms (CC BY-SA 4.0); each template keeps its own license (field license).',
    cut: `별 ${MIN_STARS}개 이상, 포크·보관·유료판(pro·premium) 저장소 제외, 이름·설명에 템플릿 낱말이 있거나 GitHub 템플릿 저장소인 것. 조직: ${ORGS.join(', ')}`,
  }, orgItems);
});
