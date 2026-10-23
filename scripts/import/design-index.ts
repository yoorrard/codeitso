// 디자인 진열대 목차(data/catalog/design/index.json) 만들기. 네트워크 없이 이미 받은 파일만 읽는다.
//   node scripts/import/design-index.ts
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type CatalogFile, CATEGORY, OUT_DIR, cmp } from './design-lib.ts';

// 소분류 순서와 이름. 새 kind가 생기면 여기에 더한다 (없으면 목차 만들기가 실패한다).
export const SUBCATEGORIES: { id: string; nameKo: string }[] = [
  { id: 'fonts-ko', nameKo: '한글 폰트' },
  { id: 'fonts', nameKo: '폰트' },
  { id: 'color-systems', nameKo: '색 체계' },
  { id: 'palettes', nameKo: '테마 팔레트' },
  { id: 'chart-palettes', nameKo: '차트 색' },
  { id: 'gradients', nameKo: '그라디언트' },
  { id: 'patterns', nameKo: '배경 패턴' },
  { id: 'icons', nameKo: '아이콘 묶음' },
  { id: 'logos', nameKo: '브랜드 로고' },
  { id: 'ui-libraries', nameKo: 'UI 컴포넌트 라이브러리' },
  { id: 'ui-registries', nameKo: 'shadcn 레지스트리' },
  { id: 'ui-blocks', nameKo: '복사해 쓰는 컴포넌트' },
  { id: 'css-frameworks', nameKo: 'CSS 프레임워크' },
  { id: 'animation', nameKo: '애니메이션 라이브러리' },
  { id: 'charts', nameKo: '차트 라이브러리' },
  { id: 'design-systems', nameKo: '디자인 시스템' },
  { id: 'design-md', nameKo: 'DESIGN.md (AI용 디자인 설명서)' },
  { id: 'styles', nameKo: '디자인 스타일' },
  { id: 'references', nameKo: 'UI/UX 레퍼런스' },
  { id: 'design-tools', nameKo: '디자인 도구' },
  { id: 'illustrations', nameKo: '일러스트' },
  { id: 'photos', nameKo: '사진·영상' },
  { id: '3d', nameKo: '3D·재질·HDRI' },
  { id: 'game-assets', nameKo: '게임 에셋' },
  { id: 'motion', nameKo: '로티·움직임' },
  { id: 'mockups', nameKo: '목업' },
  { id: 'sounds', nameKo: '소리·음악' },
];

// 살펴봤지만 넣지 않은 출처와 이유 (보고·다음 판 참고용).
export const REJECTED: { name: string; url: string; reason: string }[] = [
  { name: 'Shopify Polaris tokens', url: 'https://www.npmjs.com/package/@shopify/polaris-tokens', reason: 'License limits use to apps that integrate with Shopify.' },
  { name: 'Atlassian design tokens', url: 'https://www.npmjs.com/package/@atlaskit/tokens', reason: 'Atlassian\'s own license, not a permissive open-source license.' },
  { name: 'nice-color-palettes / COLOURlovers', url: 'https://github.com/Jam3/nice-color-palettes', reason: 'Palette data comes from COLOURlovers under CC BY-NC-SA (share-alike would bind the catalog).' },
  { name: 'Coolors, Color Hunt palette data', url: 'https://coolors.co', reason: 'No open data license for bulk palettes; listed as design tools instead.' },
  { name: 'Lospec palette list', url: 'https://lospec.com/palette-list', reason: 'User-submitted palettes without a stated redistribution license.' },
  { name: 'Font Squirrel', url: 'https://www.fontsquirrel.com', reason: 'Per-font custom EULAs; open-licensed families are already covered by Google Fonts, Fontsource and Fontshare.' },
  { name: 'Adobe Fonts', url: 'https://fonts.adobe.com', reason: 'Subscription service, not open fonts.' },
  { name: 'KoPub 서체', url: 'https://www.kopus.org/biz-electronic-font2/', reason: '웹 서비스에 넣어 쓰려면(임베딩) 따로 승인이 필요하다고 공식 안내에 적혀 있다.' },
  { name: '에스코어드림 (S-Core Dream)', url: 'https://www.s-core.co.kr', reason: '자체 라이선스가 파일 수정을 금지해 OFL이 아니다. 공식 페이지는 스크립트 접속이 막혀 원문을 확인하지 못했다.' },
  { name: '페이퍼로지, 프리젠테이션 등', url: 'https://noonnu.cc', reason: '공식 배포처의 라이선스 원문을 찾지 못했다. 확인되면 design-fonts-ko.ts에 더한다.' },
  { name: '배달의민족·카페24·넥슨·지자체 글꼴 등 자체 라이선스 한글 글꼴', url: 'https://noonnu.cc', reason: '상업용 무료지만 글꼴마다 자체 약관이다. 공식 원문을 하나씩 확인하기 전까지 보류.' },
  { name: '눈누 (글꼴 목록 자체)', url: 'https://noonnu.cc', reason: '글꼴 정보의 원출처가 아니어서 자료로 가져오지 않고, 디자인 도구에 사이트로만 넣었다.' },
  { name: 'unDraw (일러스트 하나하나)', url: 'https://undraw.co/license', reason: '라이선스가 비슷한 모음 서비스를 만드는 데 쓰는 것을 막는다. 사이트 하나로만 소개.' },
  { name: 'Storyset, Freepik, Icons8, Flaticon (하나하나)', url: 'https://www.freepik.com/legal/terms-of-use', reason: '독점 약관·출처 표기 조건. 공개 목록 API가 없어 사이트 단위로만 소개.' },
  { name: 'Unsplash, Pexels, Pixabay (사진 하나하나)', url: 'https://unsplash.com/developers', reason: 'API 키가 필요하고 약관이 사진 목록을 다른 곳에 옮겨 담는 것을 제한한다. 사이트 단위로 소개.' },
  { name: 'Openverse, Wikimedia Commons (하나하나)', url: 'https://openverse.org', reason: '수억 개 규모라 진열대에 맞지 않는다. 검색 사이트로 소개.' },
  { name: 'LottieFiles, IconScout (애니메이션 하나하나)', url: 'https://lottiefiles.com', reason: '공개 목록 API가 없고 작품마다 조건이 다르다. 사이트로 소개.' },
  { name: 'Sketchfab, Poly Pizza, Freesound (하나하나)', url: 'https://sketchfab.com/developers', reason: '목록 API에 키가 필요하고 작품마다 라이선스가 다르다. 사이트로 소개.' },
  { name: 'Dribbble, Behance, Figma Community (작품 하나하나)', url: 'https://dribbble.com', reason: '독점 약관, 공개 목록 API 없음. 레퍼런스 사이트로 소개.' },
  { name: 'Uiverse 요소 하나하나 (uiverse-io/galaxy, MIT)', url: 'https://github.com/uiverse-io/galaxy', reason: '요소 수천 개(HTML/CSS)라 미리 보기 비용이 크다. 이번 판은 사이트 하나로 소개하고 다음 판 후보로 둔다.' },
  { name: 'shadcn 커뮤니티 레지스트리의 컴포넌트 하나하나', url: 'https://ui.shadcn.com/docs/directory', reason: '컴포넌트별 인기 지표가 없다. 레지스트리를 상품 하나로 두고 preview.itemCount에 개수를 적었다.' },
  { name: 'Iconify 숨김 묶음 16개', url: 'https://api.iconify.design/collections?hidden=true', reason: 'Iconify가 목록에서 감춘 옛 묶음(다른 묶음으로 대체됨).' },
  { name: 'awesome-svelte, awesome-css-frameworks, awesome-web-animation', url: 'https://github.com/TheComeUpCode/awesome-svelte', reason: '저장소가 옮겨졌거나 README를 받을 수 없었다. 같은 범위는 씨앗 목록과 GitHub 주제 검색으로 채웠다.' },
  { name: 'Popsy, GraphicBurger', url: 'https://popsy.co', reason: '2026-10-14 접속 확인 실패(사이트 오류·이전).' },
];

function main(): void {
  const files = readdirSync(OUT_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'index.json' && f !== 'github-topics-snapshot.json')
    .sort(cmp);
  const catalogs = files.map((f) => JSON.parse(readFileSync(join(OUT_DIR, f), 'utf8')) as CatalogFile);
  const known = new Set(SUBCATEGORIES.map((s) => s.id));
  const seen = new Set<string>();
  const bySub = new Map<string, Map<string, number>>();
  let total = 0;
  for (const c of catalogs) {
    for (const it of c.items) {
      if (!known.has(it.kind)) throw new Error(`알 수 없는 kind "${it.kind}" (${c.source.id}: ${it.id}). SUBCATEGORIES에 더한다.`);
      if (seen.has(it.id)) throw new Error(`디자인 진열대 안에서 id가 겹친다: ${it.id}`);
      seen.add(it.id);
      const m = bySub.get(it.kind) ?? new Map<string, number>();
      m.set(c.source.id, (m.get(c.source.id) ?? 0) + 1);
      bySub.set(it.kind, m);
      total++;
    }
  }
  const nameOf = new Map(catalogs.map((c) => [c.source.id, c.source.name]));
  const index = {
    category: CATEGORY,
    nameKo: '디자인',
    fetchedAt: catalogs.map((c) => c.fetchedAt).sort(cmp).at(-1),
    total,
    subcategories: SUBCATEGORIES.filter((s) => bySub.has(s.id)).map((s) => {
      const m = bySub.get(s.id) as Map<string, number>;
      return {
        id: s.id,
        nameKo: s.nameKo,
        count: [...m.values()].reduce((a, b) => a + b, 0),
        sources: [...m.entries()].sort(([a], [b]) => cmp(a, b)).map(([id, count]) => ({ id, name: nameOf.get(id) ?? id, count })),
      };
    }),
    sources: catalogs.map((c) => ({ ...c.source, file: `${c.source.id}.json`, count: c.count, fetchedAt: c.fetchedAt })),
    rejected: REJECTED,
  };
  writeFileSync(join(OUT_DIR, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`디자인 목차: 상품 ${total}개, 소분류 ${index.subcategories.length}개, 출처 파일 ${catalogs.length}개`);
  for (const s of index.subcategories) console.log(`  ${s.id.padEnd(16)} ${String(s.count).padStart(5)}  ${s.nameKo}`);
}

main();
