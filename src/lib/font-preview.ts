// 폰트 견본 지연 로드 (S3, brief 5절, D116): 폰트 카드·상세의 견본 글자가 화면에 보일 때만 출처의 공식 CDN에서 글꼴을 받는다.
// - CSS를 주는 곳(Google Fonts·Fontshare·jsDelivr·네이버·Spoqa): <link rel="stylesheet">. Google Fonts 카드는 견본 글자만 담은
//   작은 글꼴(text= 매개변수)을 받는다. 상세(data-font-full)는 전체 CSS를 받는다(유니코드 범위별로 필요한 조각만 내려온다).
// - 파일만 주는 곳(Fontsource): FontFace로 별명(cc-pv-…)을 붙여 싣는다(사이트 글꼴과 이름이 겹치지 않게).
// 받은 뒤 견본 글자에 글꼴을 입히고, 못 받으면 일반 모양(고딕·명조·고정폭)으로 둔다. 호스트는 CSP(astro.config.mjs)가 허락한 곳만 온다(hosts.ts).
// Base.astro가 쪽마다 한 번 부르고, 목록·검색 섬이 카드를 새로 그리면(CARDS_EVENT) 다시 훑는다.
import { ko } from '../copy/ko.ts';
import { fnv1a } from './catalog/core.ts';

const sheets = new Map<string, Promise<void>>();
const faces = new Map<string, Promise<string>>();
let io: IntersectionObserver | null = null;

/** 카드 견본에 쓰는 글자 (Google Fonts text= 로 이 글자만 담은 글꼴을 받는다) */
function cardText(): string {
  return [...new Set([...`${ko.card.sampleKo}${ko.card.sampleEn}`])].join('');
}

function withText(css: string, text: string | null): string {
  if (!text || !css.startsWith('https://fonts.googleapis.com/')) return css;
  return `${css}${css.includes('?') ? '&' : '?'}text=${encodeURIComponent(text)}`;
}

function loadSheet(href: string): Promise<void> {
  let p = sheets.get(href);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.referrerPolicy = 'no-referrer';
      link.dataset['fontPreview'] = '';
      link.onload = () => resolve();
      link.onerror = () => reject(new Error('font css'));
      document.head.append(link);
    });
    sheets.set(href, p);
  }
  return p;
}

function loadFace(file: string): Promise<string> {
  let p = faces.get(file);
  if (!p) {
    const alias = `cc-pv-${fnv1a(file).toString(36)}`;
    p = new FontFace(alias, `url("${file}")`, { display: 'swap' }).load().then((face) => {
      document.fonts.add(face);
      return alias;
    });
    faces.set(file, p);
  }
  return p;
}

async function apply(el: HTMLElement): Promise<void> {
  const family = el.dataset['fontFamily'] ?? '';
  const css = el.dataset['fontCss'];
  const file = el.dataset['fontFile'];
  const full = el.dataset['fontFull'] === 'true';
  try {
    let name = family;
    if (css) await loadSheet(withText(css, full ? null : cardText()));
    else if (file) name = await loadFace(file);
    else return;
    // 견본 글자에 맞는 글꼴 면이 하나라도 실리면 입힌다 (없는 이름이면 빈 목록)
    const got = await document.fonts.load(`1em "${name}"`, el.textContent ?? '');
    if (got.length === 0) throw new Error('font not found');
    el.style.fontFamily = `"${name}", ${el.dataset['fontGeneric'] ?? 'sans-serif'}`;
    el.dataset['fontState'] = 'ok';
  } catch {
    el.dataset['fontState'] = 'fail';
  }
}

/** 아직 안 본 견본 글자를 지켜보다가 화면 가까이 오면 글꼴을 받는다 */
export function watchFonts(root: ParentNode = document): void {
  if (typeof IntersectionObserver === 'undefined' || typeof FontFace === 'undefined') return;
  io ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io?.unobserve(e.target);
        void apply(e.target as HTMLElement);
      }
    },
    { rootMargin: '200px 0px' },
  );
  for (const el of root.querySelectorAll<HTMLElement>('[data-font-family]:not([data-font-state])')) {
    if (!el.dataset['fontCss'] && !el.dataset['fontFile']) continue;
    el.dataset['fontState'] = 'wait';
    io.observe(el);
  }
}
