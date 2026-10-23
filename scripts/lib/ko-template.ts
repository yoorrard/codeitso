// 자료로 만드는 한국어 설명 (v5.1 P4, D128). 글꼴·색·그라디언트·패턴·아이콘·로고·3D·게임 에셋·차트 색처럼
// 모양이 정해진 상품은 출처 자료(preview·tags·metrics·summary 속 숫자)만으로 한 줄을 만든다. 지어내지 않는다:
// 자료에 없는 칸은 문장에서 뺀다. 부작용 없는 순수 함수라 시험이 그대로 부른다 (진열대 빌드가 ko-rule.ts koLineFor로 부른다, D143).
import type { CatalogItem } from '../../src/lib/catalog/types.ts';

/** 이 스크립트가 맡는 소분류 */
export const TEMPLATE_KINDS = [
  'fonts', 'fonts-ko', 'palettes', 'gradients', 'patterns', 'icons', 'logos', '3d', 'game-assets', 'chart-palettes', 'color-systems',
] as const;

export const KO_MAX = 100;

type Preview = CatalogItem['preview'];

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []);
const nums = (v: unknown): number[] => (Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : []);

/** 1234567 → 1,234,567 (로캘과 무관) */
export function commas(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 마지막 글자가 받침 있는 한글인지 (조사 고르기) */
export function hasBatchim(word: string): boolean {
  const c = word.trim().slice(-1).charCodeAt(0);
  if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 !== 0;
  return /[0-9]$/.test(word) ? /[013678]$/.test(word) : false;
}

/** 문장을 차례로 붙이되 KO_MAX를 넘는 선택 문장은 뺀다. 첫 문장은 늘 둔다 */
export function joinSentences(first: string, ...optional: (string | undefined)[]): string {
  let out = first;
  for (const s of optional) {
    if (!s) continue;
    const next = `${out} ${s}`;
    if ([...next].length <= KO_MAX) out = next;
  }
  return out;
}

/** 이름·저자 칸의 주소·전자 우편·괄호 덧말을 걷어 낸다 */
export function cleanName(s: string): string {
  return s
    .replace(/\([^)]*\)|<[^>]*>/g, '')
    .replace(/https?:\/\/\S+|\S+@\S+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[,;\s]+$/, '')
    .trim();
}

const NUM_KO = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];

// ---------- 글꼴 ----------
const SCRIPT_KO: Record<string, string> = {
  korean: '한글', latin: '라틴', cyrillic: '키릴', greek: '그리스', vietnamese: '베트남어', japanese: '일본어',
  'chinese-simplified': '중국어 간체', 'chinese-traditional': '중국어 번체', 'chinese-hongkong': '중국어(홍콩)',
  arabic: '아랍', hebrew: '히브리', devanagari: '데바나가리', thai: '태국어', khmer: '크메르', bengali: '벵골',
  tamil: '타밀', telugu: '텔루구', gujarati: '구자라트', gurmukhi: '구르무키', kannada: '칸나다', malayalam: '말라얄람',
  sinhala: '싱할라', georgian: '조지아', armenian: '아르메니아', ethiopic: '에티오피아', lao: '라오', tibetan: '티베트',
  myanmar: '미얀마', oriya: '오리야', math: '수식 기호', symbols: '기호',
};

function fontRole(tags: readonly string[], generic: string | undefined, ko: boolean): string {
  const has = (t: string) => tags.some((x) => x === t || x.split('-').includes(t));
  if (has('pixel') || has('bitmap')) return '픽셀';
  if (has('handwriting')) return '손글씨';
  if (has('monospace') || generic === 'monospace') return ko ? '고정폭(코딩용)' : '고정폭';
  if (has('display')) return ko ? '제목용' : '제목용(디스플레이)';
  const sans = ko ? '고딕' : '산세리프';
  const serif = ko ? '명조' : '세리프';
  if (generic === 'sans-serif') return sans;
  if (generic === 'serif') return serif;
  if (generic === 'cursive') return '손글씨';
  // 'sans-serif' 꼬리표를 쪼개면 serif도 나오므로 sans를 먼저 본다
  if (has('sans')) return sans;
  if (has('serif')) return serif;
  return '';
}

function fontKo(item: CatalogItem, p: Preview): string | undefined {
  const ko = item.kind === 'fonts-ko';
  const role = fontRole(item.tags, str(p['generic']), ko);
  const variable = item.tags.includes('variable');
  const head = `${ko ? '한글 ' : ''}${variable ? '가변 ' : ''}${role ? `${role} ` : ''}글꼴`;
  const weights = [...new Set(nums(p['weights']))].sort((a, b) => a - b);
  const italic = p['italic'] === true;
  let first: string;
  const last = weights[weights.length - 1];
  if (weights.length === 0 || last === undefined || last % 100 !== 0) first = `${head}이다.`;
  else if (weights.length === 1) first = `${head}로, 굵기는 ${last} 한 가지${italic ? '이고 기울임꼴이 있다' : '다'}.`;
  else {
    const range = weights.length <= 3 ? weights.join('·') : `${weights[0]}~${last}`;
    first = `${head}로, 굵기 ${range}${italic ? '과 기울임꼴' : ''}을 지원한다.`;
  }
  const subsets = (strs(p['subsets']).length ? strs(p['subsets']) : item.tags).filter((s) => !s.endsWith('-ext') && SCRIPT_KO[s] !== undefined);
  const names = [...new Set(subsets.map((s) => SCRIPT_KO[s] as string))];
  // 한글(한글 글꼴만)·라틴을 앞에, 나머지는 출처 순서대로
  const order = (n: string) => (ko && n === '한글' ? 0 : n === '라틴' ? 1 : 2);
  names.sort((a, b) => order(a) - order(b));
  let scripts: string | undefined;
  if (names.length > 4) scripts = `${names.slice(0, 3).join('·')} 등 ${names.length}가지 문자를 쓸 수 있다.`;
  else if (names.length > 0) {
    const tail = names[names.length - 1] as string;
    scripts = `지원 문자는 ${names.join('·')}${hasBatchim(tail) ? '이다' : '다'}.`;
  }
  const designers = strs(p['designers']).map(cleanName).filter(Boolean);
  const by = designers.length ? `${designers.slice(0, 2).join(', ')}${designers.length > 2 ? ' 외' : ''}의 디자인이다.` : undefined;
  return joinSentences(first, scripts, by);
}

// ---------- 색 ----------
function paletteKo(item: CatalogItem, p: Preview): string | undefined {
  if (str(p['mode']) !== 'base16') return undefined;
  const scheme = item.tags.includes('base24') ? 'base24' : 'base16';
  const m = /(\d+) colors/.exec(item.summary);
  const count = m ? Number(m[1]) : Array.isArray(p['colors']) ? p['colors'].length : 0;
  const dark = p['variant'] === 'dark' ? '어두운' : p['variant'] === 'light' ? '밝은' : '';
  const first = `에디터·터미널·UI에 입히는 ${dark ? `${dark} ` : ''}${scheme} 색 테마로, ${count ? `${count}가지 색으로 이뤄져 있다` : '색 이름이 정해져 있다'}.`;
  const author = cleanName(str(p['author']) ?? '');
  return joinSentences(first, author ? `${author}의 테마다.` : undefined);
}

function direction(angle: number): string {
  const a = ((Math.round(angle) % 360) + 360) % 360;
  const named: Record<number, string> = {
    0: '아래에서 위로', 45: '왼쪽 아래에서 오른쪽 위로', 90: '왼쪽에서 오른쪽으로', 135: '왼쪽 위에서 오른쪽 아래로',
    180: '위에서 아래로', 225: '오른쪽 위에서 왼쪽 아래로', 270: '오른쪽에서 왼쪽으로', 315: '오른쪽 아래에서 왼쪽 위로',
  };
  return named[a] ?? `${a}도 방향으로`;
}

function gradientKo(item: CatalogItem, p: Preview): string | undefined {
  const colors = strs(p['colors']);
  if (colors.length < 2) return undefined;
  const n = NUM_KO[colors.length] ?? String(colors.length);
  const what = colors.length <= 3 ? `${n} 색(${colors.join(' → ')})이` : `${n} 색이`;
  const angle = num(p['angle']);
  const first = `${what} ${angle === undefined ? '' : `${direction(angle)} `}이어지는 선형 그라디언트다.`;
  const css = str(item.use?.snippet) ?? str(p['css']);
  return joinSentences(first, css ? 'CSS 한 줄로 배경에 바로 쓴다.' : undefined);
}

function chartKo(item: CatalogItem, p: Preview): string | undefined {
  const scheme = str(p['scheme']);
  const classes = nums(p['classes']);
  const colors = Array.isArray(p['colors']) ? p['colors'].length : 0;
  const steps = classes.length ? `${Math.min(...classes)}~${Math.max(...classes)}단계로 고를 수 있다.` : colors ? `색 ${colors}가지다.` : undefined;
  let first: string;
  if (scheme === 'qualitative') first = `서로 다른 항목을 색으로 나누는 차트용 구분 색 묶음이다.`;
  else if (scheme === 'sequential') first = `값이 커질수록 짙어지는 차트용 연속 색 단계다.`;
  else if (scheme === 'diverging') first = `가운데 값을 기준으로 양쪽으로 갈라지는 차트용 색 단계다.`;
  else return undefined;
  const pkg = /npm install (\S+)/.exec(item.use?.install ?? '')?.[1];
  return joinSentences(
    first,
    steps,
    item.tags.includes('colorblind-friendly') ? '색각 이상이 있어도 구분하기 쉽게 고른 색이다.' : undefined,
    pkg ? `${pkg} 패키지로 불러 쓴다.` : undefined,
  );
}

function colorSystemKo(item: CatalogItem, p: Preview): string | undefined {
  const scales = p['scales'];
  const families = scales && typeof scales === 'object' ? Object.keys(scales).length : 0;
  if (!families) return undefined;
  return joinSentences(
    `UI에 쓰는 색 체계로, 색 ${families}가지마다 명암 단계가 정해져 있다.`,
    p['darkScales'] ? '어두운 화면용 단계도 따로 있다.' : undefined,
  );
}

// ---------- 패턴 ----------
const SHAPE_KO: Record<string, string> = {
  triangle: '삼각형', triangles: '삼각형', line: '선', lines: '선', circle: '원', circles: '원', square: '사각형', squares: '사각형',
  curve: '곡선', curves: '곡선', diamond: '다이아몬드', diamonds: '다이아몬드', wave: '물결', waves: '물결', wavy: '물결',
  rhombus: '마름모', hexagon: '육각형', hexagons: '육각형', leaf: '잎', leaves: '잎', floral: '꽃', flower: '꽃', flowers: '꽃',
  cloud: '구름', clouds: '구름', fish: '물고기', scales: '비늘', tree: '나무', trees: '나무', herringbone: '헤링본', cross: '십자',
  crosses: '십자', star: '별', stars: '별', dots: '점', dot: '점', polka: '물방울', zigzag: '지그재그', chevron: '갈매기',
  stripes: '줄무늬', plaid: '격자', checkerboard: '체크', checks: '체크', grid: '격자', heart: '하트', hearts: '하트',
  bubbles: '거품', brick: '벽돌', bricks: '벽돌', anchors: '닻', anchor: '닻', octagon: '팔각형', octagons: '팔각형',
  pentagon: '오각형', spiral: '나선', honeycomb: '벌집', tiles: '타일', christmas: '크리스마스', halloween: '핼러윈',
  geometric: '기하학', memphis: '멤피스', tribal: '민속', ethnic: '민속', bamboo: '대나무', feathers: '깃털', snow: '눈송이',
};

function shapesOf(item: CatalogItem): string[] {
  const words = [...item.name.toLowerCase().split(/[^a-z]+/), ...item.tags.flatMap((t) => t.split('-'))];
  return [...new Set(words.map((w) => SHAPE_KO[w]).filter((x): x is string => !!x))].slice(0, 2);
}

function patternKo(item: CatalogItem, p: Preview): string | undefined {
  const shapes = shapesOf(item);
  const first = `${shapes.length ? `${shapes.join('·')} 무늬가 ` : ''}끊김 없이 반복되는 SVG 배경 패턴이다.`;
  const mode = str(p['mode']);
  const how = mode === 'fill' ? '면을 채워 그렸' : mode?.startsWith('stroke') ? '선으로 그렸' : '';
  const up = /up to (\d+) colors?/.exec(item.summary)?.[1];
  const style = how && up ? `${how}고 색은 최대 ${up}가지를 쓴다.` : how ? `${how}다.` : up ? `색은 최대 ${up}가지를 쓴다.` : undefined;
  const by = /pattern by ([^.]+)\./.exec(item.summary)?.[1];
  return joinSentences(first, style, by ? `${cleanName(by)}의 디자인이다.` : undefined);
}

// ---------- 아이콘·로고 ----------
function iconsKo(item: CatalogItem, p: Preview): string | undefined {
  const total = num(p['total']);
  if (total === undefined) return undefined;
  const t = item.tags;
  const kind = t.includes('logos') ? '로고 아이콘' : t.includes('emoji') ? '이모지' : t.includes('flags-maps') ? '국기·지도 아이콘'
    : t.includes('programming') ? '개발 도구 아이콘' : t.some((x) => x.startsWith('ui-')) ? 'UI 아이콘' : '아이콘';
  const color = p['palette'] === true ? '여러 색' : p['palette'] === false ? '단색' : '';
  const author = cleanName(str(p['author']) ?? '');
  const first = `${author ? `${author}의 ` : ''}${color ? `${color} ` : ''}${kind} ${commas(total)}개 묶음이다.`;
  const grid = t.includes('ui-24px') ? '24px' : t.includes('ui-16px-32px') ? '16·32px' : '';
  const stroke = t.includes('uses-stroke');
  const look = grid && stroke ? `${grid} 격자에 맞춰 선(stroke)으로 그렸다` : grid ? `${grid} 격자에 맞췄다` : stroke ? '선(stroke)으로 그렸다' : '';
  return joinSentences(
    first,
    t.includes('archived') || t.includes('archive-unmaintained') ? '더 이상 관리되지 않는 묶음이다.' : undefined,
    look ? `${look}.` : undefined,
    item.source.name === 'Iconify' ? 'Iconify로 바로 불러 쓴다.' : undefined,
  );
}

const LOGO_CAT_KO: Record<string, string> = {
  software: '소프트웨어', library: '라이브러리', ai: 'AI', design: '디자인 도구', framework: '프레임워크', language: '프로그래밍 언어',
  entertainment: '엔터테인먼트', social: '소셜 서비스', platform: '플랫폼', devtool: '개발 도구', database: '데이터베이스',
  crypto: '암호화폐', hosting: '호스팅', browser: '브라우저', community: '커뮤니티', cms: 'CMS', education: '교육',
  marketplace: '마켓플레이스', authentication: '인증', compiler: '컴파일러', payment: '결제', analytics: '분석', music: '음악',
  communications: '커뮤니케이션', automation: '자동화', hardware: '하드웨어', monorepo: '모노레포', privacy: '개인정보 보호',
  cybersecurity: '보안', config: '설정', secrets: '비밀 값 관리', themes: '테마', iot: 'IoT', 'sync-engine': '동기화 엔진',
};

function logoKo(item: CatalogItem, p: Preview): string | undefined {
  const cat = item.tags.map((t) => LOGO_CAT_KO[t]).find((x): x is string => !!x);
  const first = `${cat ? `${cat} ` : ''}${item.name}의 로고 SVG다.`;
  const img = p['images'];
  const twoModes = !!img && typeof img === 'object' && 'light' in img && 'dark' in img && (img as { light: unknown }).light !== (img as { dark: unknown }).dark;
  return joinSentences(
    first,
    twoModes ? '밝은 화면용과 어두운 화면용이 따로 있다.' : undefined,
    p['wordmark'] ? '글자까지 들어간 워드마크도 있다.' : undefined,
    item.use?.snippet ? 'img 태그 한 줄로 바로 붙인다.' : undefined,
  );
}

// ---------- 3D·게임 에셋 ----------
const SUBJECT_KO: Record<string, string> = {
  wood: '나무', 'raw-wood': '나무', planks: '나무 판자', plywood: '합판', bark: '나무껍질', metal: '금속', rust: '녹슨 금속',
  rock: '바위', rocks: '바위', stone: '돌', stones: '돌', cobblestone: '자갈길', gravel: '자갈', pebbles: '조약돌',
  tiles: '타일', concrete: '콘크리트', asphalt: '아스팔트', road: '도로', brick: '벽돌', bricks: '벽돌', plaster: '회반죽',
  marble: '대리석', granite: '화강암', grass: '풀', moss: '이끼', soil: '흙', dirt: '흙', mud: '진흙', sand: '모래',
  snow: '눈', ice: '얼음', water: '물', fabric: '천', leather: '가죽', carpet: '카펫', paper: '종이', cardboard: '골판지',
  plastic: '플라스틱', glass: '유리', paint: '페인트', roof: '지붕', floor: '바닥', wall: '벽', ground: '땅', foliage: '잎',
  leaves: '잎', leaf: '잎', plant: '식물', plants: '식물', tree: '나무', trees: '나무', forest: '숲', mountain: '산',
  terrain: '지형', field: '들판', meadow: '풀밭', beach: '해변', city: '도시', street: '거리', building: '건물',
  furniture: '가구', chair: '의자', table: '탁자', food: '음식', rug: '깔개', sky: '하늘', skies: '하늘', 'pure-skies': '하늘',
  night: '밤', stars: '별', sunset: '해 질 녘', sunrise: '해 뜰 녘', 'sunrise-sunset': '해 뜰 녘·해 질 녘',
  studio: '스튜디오', room: '방', park: '공원', river: '강', lake: '호수', sea: '바다', ocean: '바다', desert: '사막',
  church: '성당', factory: '공장', parking: '주차장', 'partly-cloudy': '구름 낀 하늘', cloudy: '흐린 하늘', overcast: '흐린 하늘',
  wrinkles: '주름', folds: '주름', rocky: '바위', shrub: '덤불', flowers: '꽃', flower: '꽃',
};

function subjectsOf(item: CatalogItem, n: number): string[] {
  const words = [...item.name.toLowerCase().split(/[^a-z]+/), ...item.tags];
  return [...new Set(words.map((t) => SUBJECT_KO[t]).filter((x): x is string => !!x))].slice(0, n);
}

function resolution(p: Preview): string | undefined {
  const r = nums(p['maxResolution']);
  const w = r[0];
  return w && w >= 1024 ? `최대 ${Math.round(w / 1024)}K 해상도다.` : undefined;
}

function asset3dKo(item: CatalogItem, p: Preview): string | undefined {
  const format = str(p['format']);
  const subj = subjectsOf(item, 2).join('·');
  const s = subj ? `${subj} ` : '';
  const res = resolution(p);
  const photo = /photo texture/i.test(item.summary);
  switch (format) {
    case 'hdri': {
      const place = item.tags.includes('indoor') ? '실내 ' : item.tags.includes('outdoor') ? '실외 ' : '';
      return joinSentences(`${place}${s}장면을 360도로 담은 HDRI 환경 맵으로, 3D 장면의 배경과 빛에 쓴다.`, res);
    }
    case 'material':
    case 'texture':
      return joinSentences(`${s || (photo ? '사진으로 찍은 ' : '')}표면을 담은 PBR ${format === 'material' ? '재질' : '텍스처'}로, 3D 모델 겉면에 입힌다.`, res);
    case 'substance':
      return `${s}표면을 만드는 Substance 재질 파일이다.`;
    case 'model': {
      const poly = num(p['polycount']);
      return joinSentences(`${s}3D 모델이다.`, poly ? `폴리곤 ${commas(poly)}개로 이뤄져 있다.` : undefined, res);
    }
    case 'decal':
      return `${s}무늬를 장면 위에 덧붙이는 데칼 텍스처다.`;
    case 'atlas':
      return `${s}그림 여러 장을 한 장에 모은 아틀라스 텍스처다.`;
    case 'terrain':
      return `${s}지형을 만드는 텍스처다.`;
    case 'brush':
      return `${s}모양을 3D 조각에 찍어 넣는 브러시다.`;
    default:
      return undefined;
  }
}

function gameAssetKo(item: CatalogItem): string | undefined {
  const t = item.tags;
  const dim = t.includes('audio') ? '게임 오디오' : t.includes('textures') ? '게임 텍스처' : t.includes('3d') ? '3D 게임 에셋' : t.includes('2d') ? '2D 게임 에셋' : '게임 에셋';
  const n = /\((\d+) assets?\)/.exec(item.summary)?.[1];
  const by = item.source.name === 'Kenney' ? 'Kenney의 ' : '';
  return n ? `${by}${dim} 묶음으로, 에셋 ${commas(Number(n))}개가 들어 있다.` : `${by}${dim} 묶음이다.`;
}

/** 모양이 정해진 상품의 한국어 한 줄. 맡지 않는 소분류이거나 자료가 모자라면 undefined */
export function templateKo(item: CatalogItem): string | undefined {
  const p = item.preview;
  let out: string | undefined;
  switch (item.kind) {
    case 'fonts':
    case 'fonts-ko':
      out = p.type === 'font' ? fontKo(item, p) : undefined;
      break;
    case 'palettes':
      out = paletteKo(item, p);
      break;
    case 'gradients':
      out = gradientKo(item, p);
      break;
    case 'chart-palettes':
      out = chartKo(item, p);
      break;
    case 'color-systems':
      out = colorSystemKo(item, p);
      break;
    case 'patterns':
      out = patternKo(item, p);
      break;
    case 'icons':
      out = iconsKo(item, p);
      break;
    case 'logos':
      out = logoKo(item, p);
      break;
    case '3d':
      out = asset3dKo(item, p);
      break;
    case 'game-assets':
      out = gameAssetKo(item);
      break;
    default:
      out = undefined;
  }
  return out?.replace(/\s+/g, ' ').trim() || undefined;
}
