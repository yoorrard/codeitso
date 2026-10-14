// 디자인 > 색 체계·테마 팔레트·차트 색 가져오기.
//   node scripts/import/design-colors.ts                   전부
//   node scripts/import/design-colors.ts --only=systems    하나만 (systems, themes, tinted, charts)
// 출처는 모두 공식 npm 꾸러미나 공식 저장소의 자료 파일이다 (아래 SYSTEMS 표). 코드를 실행하지 않고 글자로 읽어 색만 뽑는다.
// 뺀 것: Shopify Polaris 토큰(라이선스가 Shopify 연동 앱 개발에만 쓰도록 제한), Atlassian 토큰(자체 라이선스).
import {
  type Item, type Preview, fetchJson, fetchText, main, makeItem, mapLimit, normHex, npmFile, npmLatest, npmMonthlyDownloads,
  oklchToHex, progress, rgbToHex, siteMeta, siteSummary, slugify, to2, writeCatalog,
} from './design-lib.ts';

const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const want = (k: string) => !only || only.includes(k);

function anyToHex(v: string): string | undefined {
  const t = v.trim();
  if (t.startsWith('#')) return normHex(t);
  if (/^rgba?\(/i.test(t)) return rgbToHex(t);
  if (/^oklch\(/i.test(t)) return oklchToHex(t);
  if (/^[0-9a-f]{6}$/i.test(t)) return normHex(t);
  return undefined;
}

// ---------- 글자 속 색 뽑기 (코드를 실행하지 않는다) ----------

type Pairs = [string, string][];

// 가장 안쪽 { } 묶음과 그 앞의 이름. 예: const gray = { gray1: "#fcfcfc" }, red: { 50: "#fff" }
function parseObjects(text: string): Map<string, Pairs> {
  const out = new Map<string, Pairs>();
  const block = /(?:^|[\s,{(])['"]?([A-Za-z_$][\w$-]*)['"]?\s*[:=]\s*\{([^{}]*)\}/g;
  for (const m of text.matchAll(block)) {
    const name = m[1] as string;
    const body = m[2] as string;
    const pairs: Pairs = [];
    for (const e of body.matchAll(/['"]?([\w$-]+)['"]?\s*:\s*['"]([^'"]+)['"]/g)) {
      const hex = anyToHex(e[2] as string);
      if (hex) pairs.push([e[1] as string, hex]);
    }
    if (pairs.length) out.set(name, pairs);
  }
  return out;
}

function parseArrays(text: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const m of text.matchAll(/['"]?([A-Za-z_$][\w$]*)['"]?\s*[:=]\s*\[([^[\]]*)\]/g)) {
    const colors = [...(m[2] as string).matchAll(/['"]([^'"]+)['"]/g)].map((x) => anyToHex(x[1] as string)).filter((x): x is string => !!x);
    if (colors.length >= 3) out.set(m[1] as string, colors);
  }
  return out;
}

function parseCssVars(text: string): [string, string][] {
  return [...text.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1] as string, (m[2] as string).trim()]);
}

// ---------- 미리 보기 모양 ----------

interface Step { step: string; hex: string; value?: string }
interface Scale { name: string; steps: Step[] }

function scalePreview(light: Scale[], dark?: Scale[]): Preview {
  // 목록 카드용 대표 색: 각 색상 띠의 가운데쯤 한 칸씩, 최대 12개
  const pick = (s: Scale) => s.steps[Math.min(s.steps.length - 1, Math.floor(s.steps.length * 0.55))]?.hex;
  const swatch = light.filter((s) => s.name !== 'base' && !/gray|grey|neutral|slate|zinc|stone|mauve|sage|olive|sand|black|white|dark/i.test(s.name)).map(pick);
  const neutrals = light.filter((s) => /gray|grey|neutral/i.test(s.name)).map(pick);
  const base = light.find((s) => s.name === 'base')?.steps.map((x) => x.hex) ?? [];
  return {
    type: 'palette',
    mode: 'scales',
    colors: [...base, ...swatch, ...neutrals].filter((x): x is string => !!x).slice(0, 12),
    scales: light,
    ...(dark?.length ? { darkScales: dark } : {}),
  };
}

const byStepNum = (a: Step, b: Step) => {
  const na = Number(a.step.replace(/\D/g, ''));
  const nb = Number(b.step.replace(/\D/g, ''));
  return Number.isFinite(na) && Number.isFinite(nb) ? na - nb : 0;
};

function groupByHue(pairs: [string, string, string?][], re: RegExp): Scale[] {
  const map = new Map<string, Step[]>();
  for (const [key, hex, value] of pairs) {
    const m = key.match(re);
    if (!m?.[1] || !m[2]) continue;
    const list = map.get(m[1]) ?? [];
    if (!list.some((s) => s.step === m[2])) list.push({ step: m[2], hex, ...(value ? { value } : {}) });
    map.set(m[1], list);
  }
  return [...map.entries()].filter(([, s]) => s.length >= 3).map(([name, steps]) => ({ name, steps: steps.sort(byStepNum) }));
}

// ---------- 색 체계 (UI 디자인 시스템의 색 단계표) ----------

interface SystemDef {
  slug: string; name: string; pkg: string; docs: string; summaryKo: string; tags: string[];
  load: (version: string) => Promise<{ light: Scale[]; dark?: Scale[] }>;
  install?: string; snippet?: string;
}

const SYSTEMS: SystemDef[] = [
  {
    slug: 'tailwind', name: 'Tailwind CSS colors', pkg: 'tailwindcss', docs: 'https://tailwindcss.com/docs/colors',
    summaryKo: 'Tailwind CSS에 들어 있는 기본 색 단계표(50~950). 클래스 이름으로 바로 쓴다.', tags: ['tailwind', 'oklch'],
    snippet: '<div class="bg-sky-500 text-white">…</div>',
    load: async (v) => {
      const css = await npmFile('tailwindcss', v, 'theme.css');
      const pairs = parseCssVars(css)
        .filter(([k]) => k.startsWith('color-'))
        .map(([k, val]) => [k.slice(6), anyToHex(val) ?? '', val] as [string, string, string])
        .filter(([, h]) => h);
      return { light: groupByHue(pairs, /^([a-z]+)-(\d+)$/) };
    },
  },
  {
    slug: 'radix', name: 'Radix Colors', pkg: '@radix-ui/colors', docs: 'https://www.radix-ui.com/colors',
    summaryKo: '접근성을 맞춰 설계한 12단계 색 체계. 밝은·어두운 모드 짝이 함께 있다.', tags: ['radix', 'dark-mode', 'accessible'],
    install: 'npm install @radix-ui/colors', snippet: "@import '@radix-ui/colors/blue.css';\n@import '@radix-ui/colors/blue-dark.css';",
    load: async (v) => {
      const objs = parseObjects(await npmFile('@radix-ui/colors', v, 'index.mjs'));
      const light: Scale[] = [];
      const dark: Scale[] = [];
      for (const [name, pairs] of objs) {
        if (/A$|P3|P3A$|Alpha/.test(name)) continue;
        const isDark = name.endsWith('Dark');
        const hue = isDark ? name.slice(0, -4) : name;
        const steps = pairs.map(([k, hex]) => ({ step: k.replace(/^\D+/, ''), hex })).sort(byStepNum);
        (isDark ? dark : light).push({ name: hue, steps });
      }
      return { light, dark };
    },
  },
  {
    slug: 'open-color', name: 'Open Color', pkg: 'open-color', docs: 'https://yeun.github.io/open-color/',
    summaryKo: '화면 디자인용으로 고른 13가지 색 × 10단계. 한국 개발자(heeyeun)가 만들었다.', tags: ['open-source'],
    install: 'npm install open-color', snippet: "@import 'open-color/open-color.css';\ncolor: var(--oc-blue-6);",
    load: async (v) => {
      const json = JSON.parse(await npmFile('open-color', v, 'open-color.json')) as Record<string, string | string[]>;
      const light: Scale[] = [];
      for (const [name, val] of Object.entries(json)) {
        if (!Array.isArray(val)) continue;
        light.push({ name, steps: val.map((h, i) => ({ step: String(i), hex: normHex(h) ?? h })) });
      }
      return { light };
    },
  },
  {
    slug: 'material-2014', name: 'Material Design color palette (2014)', pkg: 'material-colors', docs: 'https://m2.material.io/design/color/the-color-system.html',
    summaryKo: '구글 머티리얼 디자인 초판의 색 단계표(50~900, A100~A700).', tags: ['material', 'google'],
    install: 'npm install material-colors',
    load: async (v) => {
      const json = JSON.parse(await npmFile('material-colors', v, 'dist/colors.json')) as Record<string, Record<string, string> | string>;
      const light: Scale[] = [];
      for (const [name, val] of Object.entries(json)) {
        if (typeof val !== 'object') continue;
        light.push({ name, steps: Object.entries(val).map(([k, h]) => ({ step: k, hex: normHex(h) ?? h })) });
      }
      return { light };
    },
  },
  {
    slug: 'primer', name: 'Primer color scales (GitHub)', pkg: '@primer/primitives', docs: 'https://primer.style/foundations/color',
    summaryKo: 'GitHub 화면에 쓰는 Primer 디자인 시스템의 기본 색 단계표.', tags: ['github', 'dark-mode'],
    install: 'npm install @primer/primitives',
    load: async (v) => {
      const read = async (mode: string) => {
        const rows = JSON.parse(await npmFile('@primer/primitives', v, `dist/figma/scales/${mode}.json`)) as { name: string; value: { r: number; g: number; b: number; a: number } }[];
        const pairs = rows
          .map((r) => [r.name.replace('base/color/', '').replace('/', '-'), `#${to2(r.value.r * 255)}${to2(r.value.g * 255)}${to2(r.value.b * 255)}`] as [string, string])
          .filter(([k]) => /^[a-z]+-\d+$/.test(k));
        return groupByHue(pairs, /^([a-z]+)-(\d+)$/);
      };
      return { light: await read('light'), dark: await read('dark') };
    },
  },
  {
    slug: 'carbon', name: 'IBM Carbon colors', pkg: '@carbon/colors', docs: 'https://carbondesignsystem.com/elements/color/overview/',
    summaryKo: 'IBM Carbon 디자인 시스템의 색 단계표(10~100).', tags: ['ibm', 'carbon'],
    install: 'npm install @carbon/colors',
    load: async (v) => {
      const js = await npmFile('@carbon/colors', v, 'es/index.js');
      const pairs = [...js.matchAll(/const ([a-z]+)(\d+) = "(#[0-9a-f]{6})"/gi)].map((m) => [`${m[1]}-${m[2]}`, m[3] as string] as [string, string]);
      return { light: groupByHue(pairs, /^([a-z]+)-(\d+)$/) };
    },
  },
  {
    slug: 'ant-design', name: 'Ant Design colors', pkg: '@ant-design/colors', docs: 'https://ant.design/docs/spec/colors',
    summaryKo: 'Ant Design의 기본 색 단계표(1~10). 기업용 관리 화면에서 많이 쓴다.', tags: ['ant-design', 'dark-mode'],
    install: 'npm install @ant-design/colors',
    load: async (v) => {
      const arrs = parseArrays(await npmFile('@ant-design/colors', v, 'es/presets.js'));
      const light: Scale[] = [];
      const dark: Scale[] = [];
      for (const [name, colors] of arrs) {
        if (/^(presetPalettes|presetDarkPalettes|gray)$/.test(name)) continue;
        const isDark = name.endsWith('Dark');
        (isDark ? dark : light).push({ name: isDark ? name.slice(0, -4) : name, steps: colors.map((h, i) => ({ step: String(i + 1), hex: h })) });
      }
      return { light, dark };
    },
  },
  {
    slug: 'chakra', name: 'Chakra UI colors', pkg: '@chakra-ui/react', docs: 'https://chakra-ui.com/docs/theming/colors',
    summaryKo: 'Chakra UI v3의 기본 색 단계표(50~950).', tags: ['chakra', 'react'],
    load: async (v) => {
      const js = (await npmFile('@chakra-ui/react', v, 'dist/esm/theme/tokens/colors.js')).replace(/(\d+):\s*\{\s*value:\s*("[^"]+")\s*\}/g, '$1: $2');
      const light: Scale[] = [];
      for (const [name, pairs] of parseObjects(js)) {
        if (/Alpha$/.test(name) || pairs.length < 5) continue;
        light.push({ name, steps: pairs.map(([k, hex]) => ({ step: k, hex })).sort(byStepNum) });
      }
      return { light };
    },
  },
  {
    slug: 'mantine', name: 'Mantine colors', pkg: '@mantine/core', docs: 'https://mantine.dev/theming/colors/',
    summaryKo: 'Mantine의 기본 색 단계표(0~9). Open Color를 바탕으로 한다.', tags: ['mantine', 'react'],
    load: async (v) => {
      const arrs = parseArrays(await npmFile('@mantine/core', v, 'esm/core/MantineProvider/default-colors.mjs'));
      return { light: [...arrs].map(([name, colors]) => ({ name, steps: colors.map((h, i) => ({ step: String(i), hex: h })) })) };
    },
  },
  {
    slug: 'bootstrap', name: 'Bootstrap 5 colors', pkg: 'bootstrap', docs: 'https://getbootstrap.com/docs/5.3/customize/color/',
    summaryKo: 'Bootstrap 5의 기본 색과 회색 단계. 나머지 단계는 Sass 함수로 섞어 만든다.', tags: ['bootstrap', 'sass'],
    install: 'npm install bootstrap',
    load: async (v) => {
      const scss = await npmFile('bootstrap', v, 'scss/_variables.scss');
      const base = [...scss.matchAll(/^\$([a-z]+):\s*(#[0-9a-f]{3,6})\s*!default;/gim)].map((m) => ({ step: m[1] as string, hex: normHex(m[2] as string) as string }));
      const gray = [...scss.matchAll(/^\$gray-(\d+):\s*(#[0-9a-f]{3,6})\s*!default;/gim)].map((m) => ({ step: m[1] as string, hex: normHex(m[2] as string) as string }));
      return { light: [{ name: 'base', steps: base }, { name: 'gray', steps: gray }].filter((s) => s.steps.length) };
    },
  },
  {
    slug: 'open-props', name: 'Open Props colors', pkg: 'open-props', docs: 'https://open-props.style/#colors',
    summaryKo: 'CSS 변수로 바로 쓰는 색 단계표(Open Color 바탕, 0~12).', tags: ['css-variables'],
    install: 'npm install open-props', snippet: "@import 'open-props/colors';\ncolor: var(--blue-6);",
    load: async (v) => {
      const pairs = parseCssVars(await npmFile('open-props', v, 'src/props.colors.css')).map(([k, val]) => [k, anyToHex(val) ?? ''] as [string, string]).filter(([, h]) => h);
      return { light: groupByHue(pairs, /^([a-z]+)-(\d+)$/) };
    },
  },
  {
    slug: 'spectrum', name: 'Adobe Spectrum color palette', pkg: '@adobe/spectrum-tokens', docs: 'https://spectrum.adobe.com/page/color-palette/',
    summaryKo: 'Adobe Spectrum 디자인 시스템의 색 단계표. 밝은·어두운 모드 값이 따로 있다.', tags: ['adobe', 'dark-mode'],
    install: 'npm install @adobe/spectrum-tokens',
    load: async (v) => {
      const json = JSON.parse(await npmFile('@adobe/spectrum-tokens', v, 'src/color-palette.json')) as Record<string, { value?: string; sets?: Record<string, { value: string }> }>;
      const light: [string, string][] = [];
      const dark: [string, string][] = [];
      for (const [k, t] of Object.entries(json)) {
        if (!/^[a-z]+-\d+$/.test(k) || /transparent/.test(k)) continue;
        const l = t.sets?.light?.value ?? t.value;
        const d = t.sets?.dark?.value;
        const lh = l ? anyToHex(l) : undefined;
        const dh = d ? anyToHex(d) : undefined;
        if (lh) light.push([k, lh]);
        if (dh) dark.push([k, dh]);
      }
      return { light: groupByHue(light, /^([a-z]+)-(\d+)$/), dark: groupByHue(dark, /^([a-z]+)-(\d+)$/) };
    },
  },
  {
    slug: 'fluent', name: 'Microsoft Fluent 2 colors', pkg: '@fluentui/tokens', docs: 'https://fluent2.microsoft.design/color',
    summaryKo: '마이크로소프트 Fluent 2의 회색 단계와 공용 색(shade·tint).', tags: ['microsoft', 'fluent'],
    install: 'npm install @fluentui/tokens',
    load: async (v) => {
      const light: Scale[] = [];
      for (const [name, pairs] of parseObjects(await npmFile('@fluentui/tokens', v, 'lib/global/colors.js'))) {
        if (/Alpha$|^hc/.test(name) || pairs.length < 5) continue;
        light.push({ name, steps: pairs.map(([k, hex]) => ({ step: k, hex })) });
      }
      return { light };
    },
  },
];

async function importSystems(): Promise<void> {
  console.log('색 체계');
  let done = 0;
  const items = await mapLimit(SYSTEMS, 4, async (d) => {
    const latest = await npmLatest(d.pkg);
    const [{ light, dark }, downloads, meta] = await Promise.all([d.load(latest.version), npmMonthlyDownloads(d.pkg), siteMeta(d.docs)]);
    if (!light.length) throw new Error(`${d.slug}: 색을 하나도 못 읽었다`);
    if (!meta.ok) console.log(`  ! 문서 주소 확인 실패 ${meta.status} ${d.docs}`);
    progress(`${d.slug} (${light.length}색)`, ++done, SYSTEMS.length);
    return makeItem({
      id: `color-systems:${d.slug}`,
      name: d.name,
      kind: 'color-systems',
      summary: siteSummary(d.name, d.docs, meta),
      summaryKo: d.summaryKo,
      written: 'codeshopper',
      url: d.docs,
      source: { name: `${d.pkg} (npm ${latest.version})`, url: `https://www.npmjs.com/package/${d.pkg}` },
      license: latest.license,
      metrics: { downloads },
      tags: ['color-system', ...d.tags, ...(dark?.length ? ['dark-mode'] : [])],
      preview: scalePreview(light, dark),
      use: { install: d.install ?? `npm install ${d.pkg}`, snippet: d.snippet, docs: d.docs },
    });
  });
  writeCatalog(
    {
      id: 'color-systems',
      name: 'Design-system color scales (official npm packages)',
      url: 'https://www.npmjs.com',
      license: 'Color values read from each design system\'s published npm package (license per item, all permissive). Values are facts; summary is the docs page\'s own meta description.',
      note: 'metrics.downloads = npm downloads last month of the package (for big UI kits this counts the whole kit, not just colors). Tailwind v4 values are OKLCH (kept in value) with an sRGB hex approximation.',
    },
    items,
  );
}

// ---------- 테마 팔레트 (Catppuccin, Rosé Pine) ----------

async function importThemes(): Promise<void> {
  console.log('테마 팔레트');
  const items: Item[] = [];
  type Cat = Record<string, { name: string; dark: boolean; colors: Record<string, { name: string; hex: string; accent: boolean }> } | string>;
  const cat = await fetchJson<Cat>('https://raw.githubusercontent.com/catppuccin/palette/main/palette.json');
  const catMeta = await siteMeta('https://catppuccin.com/palette/');
  for (const [flavor, f] of Object.entries(cat)) {
    if (typeof f === 'string') continue;
    items.push(makeItem({
      id: `themes:catppuccin-${flavor}`,
      name: `Catppuccin ${f.name}`,
      kind: 'palettes',
      summary: siteSummary('Catppuccin', 'https://catppuccin.com/palette/', catMeta),
      summaryKo: `파스텔 톤 인기 테마 Catppuccin의 ${f.dark ? '어두운' : '밝은'} 맛(${f.name}). 26가지 이름 붙은 색.`,
      written: 'codeshopper',
      url: 'https://catppuccin.com/palette/',
      source: { name: 'catppuccin/palette (GitHub)', url: 'https://github.com/catppuccin/palette' },
      license: 'MIT',
      tags: ['theme', 'pastel', f.dark ? 'dark' : 'light', 'catppuccin'],
      preview: { type: 'palette', mode: 'named', variant: f.dark ? 'dark' : 'light', colors: Object.entries(f.colors).map(([k, c]) => ({ name: k, hex: normHex(c.hex) ?? c.hex })) },
      use: { install: 'npm install @catppuccin/palette', docs: 'https://github.com/catppuccin/palette' },
    }));
  }
  const rp = await npmLatest('@rose-pine/palette');
  const js = await npmFile('@rose-pine/palette', rp.version, 'dist/index.js');
  const rpMeta = await siteMeta('https://rosepinetheme.com/palette/');
  for (const variant of ['main', 'moon', 'dawn']) {
    const body = js.match(new RegExp(`const ${variant} = \\{([\\s\\S]*?)\\n\\};`))?.[1] ?? '';
    const colors = [...body.matchAll(/(\w+): \{ hex: "([0-9a-f]{6})"/g)].map((m) => ({ name: m[1] as string, hex: `#${m[2]}` }));
    if (!colors.length) continue;
    items.push(makeItem({
      id: `themes:rose-pine-${variant}`,
      name: `Rosé Pine${variant === 'main' ? '' : ` ${variant[0]?.toUpperCase()}${variant.slice(1)}`}`,
      kind: 'palettes',
      summary: siteSummary('Rosé Pine', 'https://rosepinetheme.com/palette/', rpMeta),
      summaryKo: `차분한 장밋빛 테마 Rosé Pine의 ${variant === 'dawn' ? '밝은' : '어두운'} 변형(${variant}).`,
      written: 'codeshopper',
      url: 'https://rosepinetheme.com/palette/',
      source: { name: '@rose-pine/palette (npm)', url: 'https://www.npmjs.com/package/@rose-pine/palette' },
      license: rp.license,
      tags: ['theme', variant === 'dawn' ? 'light' : 'dark', 'rose-pine'],
      preview: { type: 'palette', mode: 'named', variant: variant === 'dawn' ? 'light' : 'dark', colors },
      use: { install: 'npm install @rose-pine/palette', docs: 'https://rosepinetheme.com/palette/' },
    }));
  }
  writeCatalog(
    {
      id: 'theme-palettes',
      name: 'Theme palettes (Catppuccin, Rosé Pine)',
      url: 'https://catppuccin.com',
      license: 'MIT (catppuccin/palette, @rose-pine/palette).',
    },
    items,
  );
}

// ---------- Tinted Theming (Base16·Base24 테마 전체) ----------

interface TintedScheme { system: string; name: string; author: string; variant?: string; palette: Record<string, string> }

function parseTintedYaml(text: string): TintedScheme | undefined {
  const get = (k: string) => text.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?\\s*$`, 'm'))?.[1]?.trim();
  const palette: Record<string, string> = {};
  for (const m of text.matchAll(/^\s+(base[0-9A-F]{2}):\s*"?#?([0-9a-fA-F]{6})"?/gm)) palette[m[1] as string] = `#${(m[2] as string).toLowerCase()}`;
  const name = get('name');
  if (!name || Object.keys(palette).length < 16) return undefined;
  return { system: get('system') ?? 'base16', name, author: get('author') ?? '', variant: get('variant'), palette };
}

async function importTinted(): Promise<void> {
  console.log('Tinted Theming (Base16·Base24)');
  const REF = 'spec-0.11';
  const listing = await fetchJson<{ files: { name: string }[] }>(`https://data.jsdelivr.com/v1/packages/gh/tinted-theming/schemes@${REF}?structure=flat`, { timeoutMs: 120_000 });
  const files = listing.files.map((f) => f.name).filter((n) => /^\/base(16|24)\/[^/]+\.ya?ml$/.test(n)).sort();
  let done = 0;
  const rows = await mapLimit(files, 8, async (path) => {
    const text = await fetchText(`https://raw.githubusercontent.com/tinted-theming/schemes/${REF}${path}`).catch(() => '');
    progress('스킴', ++done, files.length);
    return { path, scheme: parseTintedYaml(text) };
  });
  const items: Item[] = [];
  for (const { path, scheme } of rows) {
    if (!scheme) continue;
    const system = path.split('/')[1] as string;
    const file = (path.split('/')[2] as string).replace(/\.ya?ml$/, '');
    const keys = Object.keys(scheme.palette).sort();
    items.push(makeItem({
      id: `tinted:${system}-${file}`,
      name: `${scheme.name} (${system})`,
      kind: 'palettes',
      summary: `${scheme.name}: ${system} color scheme${scheme.author ? ` by ${scheme.author}` : ''}${scheme.variant ? ` (${scheme.variant})` : ''}. ${keys.length} colors for editors, terminals and UIs.`,
      url: `https://github.com/tinted-theming/schemes/blob/${REF}${path}`,
      source: { name: 'Tinted Theming schemes', url: 'https://github.com/tinted-theming/schemes' },
      license: 'MIT',
      tags: ['theme', system, ...(scheme.variant ? [scheme.variant] : []), 'editor'],
      preview: {
        type: 'palette', mode: 'base16', variant: scheme.variant ?? 'dark', author: scheme.author,
        colors: keys.map((k) => ({ name: k, hex: scheme.palette[k] as string })),
      },
      use: { docs: 'https://github.com/tinted-theming/home' },
    }));
  }
  writeCatalog(
    {
      id: 'tinted-schemes',
      name: 'Tinted Theming — Base16 & Base24 schemes',
      url: 'https://github.com/tinted-theming/schemes',
      license: 'MIT (tinted-theming/schemes). Scheme names and authors as declared in each YAML file.',
      note: `All ${files.length} scheme files on branch ${REF}; parsed ${items.length}.`,
    },
    items,
  );
}

// ---------- 차트 색 (ColorBrewer, d3-scale-chromatic) ----------

async function importCharts(): Promise<void> {
  console.log('차트 색');
  const items: Item[] = [];
  const cb = await npmLatest('colorbrewer');
  const js = await npmFile('colorbrewer', cb.version, 'index.js');
  const groups: Record<string, string> = {};
  for (const m of js.matchAll(/(sequential|singlehue|diverging|qualitative):\s*\[([^\]]*)\]/g)) {
    for (const n of (m[2] as string).matchAll(/"(\w+)"/g)) groups[n[1] as string] = m[1] as string;
  }
  const cbMeta = await siteMeta('https://colorbrewer2.org/');
  for (const [name, group] of Object.entries(groups)) {
    const block = js.match(new RegExp(`\\b${name}: \\{([^{}]*)\\}`))?.[1] ?? '';
    const classes = [...block.matchAll(/(\d+): \[([^\]]*)\]/g)].map((m) => ({ n: Number(m[1]), colors: [...(m[2] as string).matchAll(/"(#[0-9a-f]{6})"/gi)].map((c) => (c[1] as string).toLowerCase()) }));
    const biggest = classes.sort((a, b) => b.n - a.n)[0];
    if (!biggest) continue;
    items.push(makeItem({
      id: `chart-colors:colorbrewer-${slugify(name)}`,
      name: `ColorBrewer ${name}`,
      kind: 'chart-palettes',
      summary: siteSummary('ColorBrewer', 'https://colorbrewer2.org/', cbMeta),
      url: 'https://colorbrewer2.org/',
      source: { name: 'colorbrewer (npm)', url: 'https://www.npmjs.com/package/colorbrewer' },
      license: 'Apache-2.0',
      tags: ['chart', 'colorbrewer', group === 'singlehue' ? 'sequential' : group],
      preview: { type: 'palette', mode: 'chart', scheme: group === 'singlehue' ? 'sequential' : group, colors: biggest.colors, classes: classes.map((c) => c.n).sort((a, b) => a - b) },
      use: { install: 'npm install d3-scale-chromatic', snippet: `import { scheme${name} } from 'd3-scale-chromatic';`, docs: 'https://d3js.org/d3-scale-chromatic' },
    }));
  }
  const d3 = await npmLatest('d3-scale-chromatic');
  const d3Meta = await siteMeta('https://d3js.org/d3-scale-chromatic');
  for (const name of ['category10', 'Tableau10', 'observable10']) {
    const src = await npmFile('d3-scale-chromatic', d3.version, `src/categorical/${name}.js`).catch(() => '');
    const hex = src.match(/colors\("([0-9a-f]+)"\)/i)?.[1];
    if (!hex) continue;
    items.push(makeItem({
      id: `chart-colors:d3-${slugify(name)}`,
      name: `d3 ${name}`,
      kind: 'chart-palettes',
      summary: siteSummary('d3-scale-chromatic', 'https://d3js.org/d3-scale-chromatic', d3Meta),
      url: 'https://d3js.org/d3-scale-chromatic/categorical',
      source: { name: 'd3-scale-chromatic (npm)', url: 'https://www.npmjs.com/package/d3-scale-chromatic' },
      license: d3.license,
      tags: ['chart', 'd3', 'qualitative'],
      preview: { type: 'palette', mode: 'chart', scheme: 'qualitative', colors: (hex.match(/.{6}/g) ?? []).map((c) => `#${c}`) },
      use: { install: 'npm install d3-scale-chromatic', snippet: `import { scheme${name[0]?.toUpperCase()}${name.slice(1)} } from 'd3-scale-chromatic';`, docs: 'https://d3js.org/d3-scale-chromatic/categorical' },
    }));
  }
  const viridis = await npmFile('d3-scale-chromatic', d3.version, 'src/sequential-multi/viridis.js');
  const ramps: [string, string][] = [];
  const first = viridis.match(/export default ramp\(colors\("([0-9a-f]+)"\)\)/i)?.[1];
  if (first) ramps.push(['viridis', first]);
  for (const m of viridis.matchAll(/export var (\w+) = ramp\(colors\("([0-9a-f]+)"\)\)/gi)) ramps.push([m[1] as string, m[2] as string]);
  for (const [name, hex] of ramps) {
    const all = (hex.match(/.{6}/g) ?? []).map((c) => `#${c}`);
    const stops = Array.from({ length: 11 }, (_, i) => all[Math.round((i * (all.length - 1)) / 10)] as string);
    items.push(makeItem({
      id: `chart-colors:d3-${name}`,
      name: `${name[0]?.toUpperCase()}${name.slice(1)} (perceptually uniform)`,
      kind: 'chart-palettes',
      summary: siteSummary('d3-scale-chromatic', 'https://d3js.org/d3-scale-chromatic', d3Meta),
      url: 'https://d3js.org/d3-scale-chromatic/sequential',
      source: { name: 'd3-scale-chromatic (npm)', url: 'https://www.npmjs.com/package/d3-scale-chromatic' },
      license: d3.license,
      tags: ['chart', 'd3', 'sequential', 'colorblind-friendly'],
      preview: { type: 'palette', mode: 'chart', scheme: 'sequential', colors: stops },
      use: { install: 'npm install d3-scale-chromatic', snippet: `import { interpolate${name[0]?.toUpperCase()}${name.slice(1)} } from 'd3-scale-chromatic';`, docs: 'https://d3js.org/d3-scale-chromatic/sequential' },
    }));
  }
  writeCatalog(
    {
      id: 'chart-palettes',
      name: 'Chart color schemes (ColorBrewer, d3-scale-chromatic)',
      url: 'https://colorbrewer2.org',
      license: 'ColorBrewer schemes: Apache-2.0 style license (Cynthia Brewer, Penn State); d3-scale-chromatic: ISC. Viridis family: CC0 (matplotlib), sampled to 11 stops.',
    },
    items,
  );
}

await main('design-colors', async () => {
  if (want('systems')) await importSystems();
  if (want('themes')) await importThemes();
  if (want('tinted')) await importTinted();
  if (want('charts')) await importCharts();
});
