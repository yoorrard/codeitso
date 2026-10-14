// 설계도 6번 묶음 (T38, 설계서 4.8절): 설계도 6번 '디자인 지시'·디자인 값(CSS)·DESIGN.md를 그리는 지연 모듈.
// 디자인 정하기 묶음(look-data.ts)의 값에 부품 규칙(virtual:cc-data/looks-render)과 6번 문장(virtual:cc-data/templates-look)을 더한다.
// 설계도 받기(src/lib/pack-file.ts)가 섬이 깨어날 때 미리 받는다. 단계 화면 첫 묶음에는 싣지 않는다.
import looksRender from 'virtual:cc-data/looks-render';
import templatesLook from 'virtual:cc-data/templates-look';
import type { Catalog, EngineResult } from './engine/index.ts';
import { projectName } from './engine/index.ts';
import { lookSpec } from './engine/look.ts';
import { renderDesignMd, renderLookCss, renderLookSection } from './engine/look-render.ts';
import type { Looks } from './engine/types.ts';
import { LOOK_FILE_NAME, looks as screenLooks } from './look-data.ts';

// 시트 묶음의 값(부품 규칙은 열거하지 않는 칸이라 펼치기에 끼지 않는다)에 부품 규칙과 글꼴 받는 법을 붙인다
const looks: Looks = { ...screenLooks, components: looksRender.components, families: looksRender.families };
export { LOOK_FILE_NAME };

const withLook = new WeakMap<Catalog, Catalog>();
/**
 * 단계 화면의 문장 틀(src/lib/data.ts)에는 설계도 6번 문장이 없다: 이 묶음이 받은 문장(templates.look)을 붙인 카탈로그.
 * 원래 카탈로그는 고치지 않는다 (같은 카탈로그면 한 번만 만든다)
 */
function lookCatalog(cat: Catalog): Catalog {
  let c = withLook.get(cat);
  if (!c) {
    c = { ...cat, data: { ...cat.data, templates: { ...cat.data.templates, look: templatesLook.look } } };
    withLook.set(cat, c);
  }
  return c;
}

/** 설계도 6번 본문 (renderPack의 design) */
export function designLines(cat: Catalog, r: EngineResult): string[] {
  const c = lookCatalog(cat);
  return renderLookSection(c, looks, lookSpec(c, looks, r));
}

/** DESIGN.md 글 (파일 이름은 늘 DESIGN.md, 발행 시각은 YAML description에) */
export function designMd(cat: Catalog, r: EngineResult, issuedAt: string): string {
  const c = lookCatalog(cat);
  return renderDesignMd(c, looks, lookSpec(c, looks, r), { project: projectName(cat, r), issuedAt });
}

/** 디자인 값(CSS) 묶음 */
export function designCss(cat: Catalog, r: EngineResult): string {
  const c = lookCatalog(cat);
  return renderLookCss(c, lookSpec(c, looks, r));
}
