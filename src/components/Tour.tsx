// 처음 방문 가이드 (O1, D138): 모달 <dialog> 여덟 걸음. src/lib/tour.ts가 열 때만 이 묶음(과 tour.css)을 받는다.
// 걸음: 코드잇소가 무엇인지 → 카테고리 → 검색 → 스타터 키트 → 담기·메모·찜 → 프롬프트 뽑기 → 꼭 알아 둘 바이브코딩 말 → 드래그 풀이 해 보기.
// 언제든 끝: [건너뛰기]·닫기(X)·Esc·바탕 누르기. 열자마자 store.ts에 '연 적 있음'을 적어 다시 저절로 열지 않는다.
// 키보드: Tab으로 단추, ←·→로 걸음. 걸음이 바뀌어도 초점은 [다음]에 남고(없어진 단추에 있었으면 [다음]으로), 바뀐 걸음은 aria-live로 알린다.
// 넓은 화면은 가운데 창, 휴대폰은 아래에서 올라오는 시트. 동작 줄이기면 움직이지 않는다(토큰 길이 0).
// 용어 풀이는 지어내지 않고 용어 자료(/glossary.json, 풀이 섬과 같은 묶음)에서 그대로 가져온다. 드래그 걸음의 문장은 풀이 섬이 이 창 안에서 풀이를 띄운다.
import { render } from 'preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import type { CategoryId } from '../lib/catalog/types.ts';
import type { GlossaryEntry } from '../lib/glossary.ts';
import { TOUR_STEPS, TOUR_TERMS, clampStep } from '../lib/guide.ts';
import { SkLine, SkSet } from './Skeleton.tsx';
import type { TourStep } from '../lib/guide.ts';
import { CATEGORY_ICON } from '../lib/icons.ts';
import type { IconName } from '../lib/icons.ts';
import { backdropPress } from '../lib/overlay.ts';
import { ROUTES } from '../lib/routes.ts';
import { markTourSeen } from '../lib/store.ts';
import { termEngine } from '../lib/term-load.ts';
import { fill } from '../lib/text.ts';
import { Icon } from './Icon.tsx';
// 스타일은 주소로만 받아 열 때 붙인다: 그냥 import하면 Astro가 모든 쪽의 첫 CSS에 링크를 넣는다 (첫 화면 CSS 30KB 예산)
import tourCss from '../styles/tour.css?url';

interface Cat {
  id: CategoryId;
  name: string;
  /** 천 단위 쉼표를 넣은 상품 수 (빌드 때 만든 글) */
  total: string;
}
interface Data {
  cats: Cat[];
  total: string;
}

/** 기본 틀이 빌드 때 넣어 둔 진열대 요약 (<template id="tour-data">): 대분류 이름·상품 수, 전체 상품 수 */
function readData(): Data {
  const el = document.getElementById('tour-data');
  let cats: Cat[] = [];
  try {
    const raw: unknown = JSON.parse(el?.dataset['cats'] ?? '[]');
    if (Array.isArray(raw)) cats = raw.filter((c): c is Cat => !!c && typeof c === 'object' && typeof c.id === 'string' && c.id in CATEGORY_ICON);
  } catch {
    cats = [];
  }
  return { cats, total: el?.dataset['total'] ?? '' };
}

/** 그림 줄 (꾸밈: 글이 같은 것을 말하므로 화면 낭독기에서 감춘다) */
function Fig({ children }: { children: ComponentChildren }) {
  return (
    <div class="tour-fig" aria-hidden="true">
      {children}
    </div>
  );
}
function Node({ icon, label }: { icon: IconName; label: string }) {
  return (
    <span class="tour-node">
      <span class="tour-node-dot">
        <Icon name={icon} size="22px" />
      </span>
      <span class="tour-node-label">{label}</span>
    </span>
  );
}
function Arrow() {
  return (
    <span class="tour-arrow">
      <Icon name="chevron" size="18px" />
    </span>
  );
}
function MockBtn({ icon, label, primary = false }: { icon?: IconName; label?: string; primary?: boolean }) {
  return (
    <span class={primary ? 'tour-mock tour-mock-btn is-primary' : 'tour-mock tour-mock-btn'}>
      {icon && <Icon name={icon} size="18px" />}
      {label}
    </span>
  );
}
function Points({ items }: { items: readonly string[] }) {
  return (
    <ul class="tour-points">
      {items.map((t) => (
        <li>
          <Icon name="check" size="18px" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

const S = ko.tour.steps;

function Words({ terms }: { terms: GlossaryEntry[] | null | 'failed' }) {
  return (
    <>
      <p class="tour-lead">{S.words.body}</p>
      {terms === 'failed' && <p class="tour-note">{S.words.failed}</p>}
      {terms === null && (
        <SkSet label={S.words.loading}>
          <div class="tour-words" aria-hidden="true">
            {TOUR_TERMS.map((_, i) => (
              <div class="tour-word">
                <SkLine w={`${[30, 22, 36, 26][i % 4]}%`} />
                <SkLine w="88%" />
              </div>
            ))}
          </div>
        </SkSet>
      )}
      {Array.isArray(terms) && (
        <dl class="tour-words">
          {terms.map((t) => (
            <div class="tour-word">
              <dt>{t.term}</dt>
              <dd>{t.plain}</dd>
            </div>
          ))}
        </dl>
      )}
      <p class="tour-more">
        <a class="btn btn-soft" href={ROUTES.terms}>
          <Icon name="book" size="18px" />
          {S.words.link}
        </a>
      </p>
    </>
  );
}

function Body({ step, data, terms }: { step: TourStep; data: Data; terms: GlossaryEntry[] | null | 'failed' }) {
  switch (step) {
    case 'welcome':
      return (
        <>
          <Fig>
            <Node icon="search" label={S.welcome.flow[0] ?? ''} />
            <Arrow />
            <Node icon="cart" label={S.welcome.flow[1] ?? ''} />
            <Arrow />
            <Node icon="sparkle" label={S.welcome.flow[2] ?? ''} />
          </Fig>
          <h2 id="tour-title" class="tour-title">
            {S.welcome.title}
          </h2>
          <p id="tour-desc" class="tour-lead">
            {fill(S.welcome.body, { n: data.total })}
          </p>
          <Points items={S.welcome.points} />
        </>
      );
    case 'categories':
      return (
        <>
          <h2 id="tour-title" class="tour-title">
            {S.categories.title}
          </h2>
          <ul class="tour-cats">
            {data.cats.map((c) => (
              <li data-cat={c.id}>
                <span class="cat-dot" aria-hidden="true">
                  <Icon name={CATEGORY_ICON[c.id]} size="18px" />
                </span>
                <span class="tour-cat-name">{c.name}</span>
                <span class="tour-cat-n">{fill(ko.home.count, { n: c.total })}</span>
                <span class="tour-cat-desc">{ko.categories[c.id]}</span>
              </li>
            ))}
          </ul>
          <p class="tour-note tour-with-icon">
            <Icon name="menu" size="18px" />
            <span>{S.categories.body}</span>
          </p>
        </>
      );
    case 'search':
      return (
        <>
          <Fig>
            <span class="tour-mock tour-mock-field">
              <Icon name="search" size="18px" />
              {S.search.sample}
            </span>
            <Arrow />
            <span class="tour-mock tour-mock-chip">{S.search.sampleHit}</span>
          </Fig>
          <h2 id="tour-title" class="tour-title">
            {S.search.title}
          </h2>
          <Points items={S.search.points} />
        </>
      );
    case 'kits':
      return (
        <>
          <Fig>
            <Node icon="layout" label={ko.kits.pageTitle} />
            <Arrow />
            <MockBtn icon="cart" label={ko.kits.add} primary />
          </Fig>
          <h2 id="tour-title" class="tour-title">
            {S.kits.title}
          </h2>
          <p class="tour-lead">{S.kits.body}</p>
          <p class="tour-more">
            <a class="btn btn-soft" href={ROUTES.kits}>
              {S.kits.link}
              <Icon name="chevron" size="16px" />
            </a>
          </p>
        </>
      );
    case 'add':
      return (
        <>
          <Fig>
            <MockBtn icon="cart" label={ko.card.add} primary />
            <Arrow />
            <span class="tour-mock tour-mock-field">{ko.sheet.memoLabel}</span>
            <MockBtn icon="heart" />
          </Fig>
          <h2 id="tour-title" class="tour-title">
            {S.add.title}
          </h2>
          <Points items={S.add.points} />
        </>
      );
    case 'prompt':
      return (
        <>
          <Fig>
            <MockBtn label={ko.cart.checkout} primary />
            <Arrow />
            <MockBtn icon="copy" label={S.prompt.copy} />
            <Arrow />
            <Node icon="sparkle" label={S.prompt.ai} />
          </Fig>
          <h2 id="tour-title" class="tour-title">
            {S.prompt.title}
          </h2>
          <Points items={S.prompt.points} />
        </>
      );
    case 'words':
      return (
        <>
          <h2 id="tour-title" class="tour-title">
            {S.words.title}
          </h2>
          <Words terms={terms} />
        </>
      );
    case 'drag':
      return (
        <>
          <h2 id="tour-title" class="tour-title">
            {S.drag.title}
          </h2>
          <figure class="tour-try">
            <figcaption class="tour-try-label">
              <Icon name="sparkle" size="16px" />
              {S.drag.tryLabel}
            </figcaption>
            <p class="tour-try-text">
              {S.drag.tryBefore}
              <button type="button" class="term-mark" data-term="json">
                {S.drag.tryMark}
              </button>
              {S.drag.tryAfter}
            </p>
          </figure>
          <Points items={[S.drag.mouse, S.drag.touch, S.drag.mark]} />
          <p class="tour-note">{S.drag.replay}</p>
          <p class="tour-more">
            <a class="btn btn-soft" href={ROUTES.terms}>
              <Icon name="book" size="18px" />
              {S.drag.link}
            </a>
          </p>
        </>
      );
  }
}

/** 걸음마다 제목 (aria-live 알림) */
function titleOf(step: TourStep): string {
  return S[step].title;
}

function Tour({ data, onClose }: { data: Data; onClose: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const [at, setAt] = useState(0);
  const [live, setLive] = useState('');
  const [terms, setTerms] = useState<GlossaryEntry[] | null | 'failed'>(null);
  const backdrop = useMemo(() => backdropPress(() => dlg.current?.close()), []);
  const step = TOUR_STEPS[at] ?? 'welcome';
  const last = at === TOUR_STEPS.length - 1;
  const total = TOUR_STEPS.length;
  const wordsAt = TOUR_STEPS.indexOf('words');

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    markTourSeen();
    if (!d.open) d.showModal();
    nextBtn.current?.focus();
  }, []);

  // 용어 풀이는 그 걸음 하나 앞에서 미리 받는다 (건너뛴 사람은 받지 않는다)
  useEffect(() => {
    if (terms !== null || at < wordsAt - 1) return;
    let live = true;
    termEngine().then(
      (eng) => {
        if (!live) return;
        const list = TOUR_TERMS.map((id) => eng.get(id)).filter((e): e is GlossaryEntry => !!e);
        setTerms(list.length > 0 ? list : 'failed');
      },
      () => live && setTerms('failed'),
    );
    return () => {
      live = false;
    };
  }, [at, terms, wordsAt]);

  const go = (n: number): void => {
    const next = clampStep(n);
    if (next === at) return;
    // 고른 글(드래그 연습)을 풀어 풀이 상자를 닫는다. 걸음 글을 맨 위부터 보이고, 바뀐 걸음을 알린다
    document.getSelection()?.removeAllRanges();
    setAt(next);
    setLive(
      fill(ko.tour.live, {
        n: next + 1,
        total,
        title: titleOf(TOUR_STEPS[next] ?? 'welcome'),
      }),
    );
    dlg.current?.querySelector('.tour-body')?.scrollTo({ top: 0 });
    // 누른 단추가 사라지면([이전]이 첫 걸음에서) 초점을 [다음]으로
    requestAnimationFrame(() => {
      const a = document.activeElement;
      if (!a || a === document.body || !dlg.current?.contains(a)) nextBtn.current?.focus();
    });
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const t = e.target;
    if (t instanceof HTMLElement && t.closest('input,textarea,select,[contenteditable]')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(at + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(at - 1);
    }
  };

  return (
    <dialog
      ref={dlg}
      class="tour"
      aria-labelledby="tour-title"
      aria-describedby={step === 'welcome' ? 'tour-desc' : undefined}
      onClose={onClose}
      onClick={backdrop.click}
      onPointerDown={backdrop.down}
      onKeyDown={onKey}
    >
      <div class="tour-head">
        <p class="tour-kicker">
          <Icon name="help" size="18px" />
          <span>{ko.tour.label}</span>
          <span class="tour-count">{fill(ko.tour.count, { n: at + 1, total })}</span>
        </p>
        <button type="button" class="icon-btn tour-x" aria-label={ko.tour.close} onClick={() => dlg.current?.close()}>
          <Icon name="close" size="20px" />
        </button>
      </div>
      <div class="tour-body" key={step} data-step={step}>
        <Body step={step} data={data} terms={terms} />
      </div>
      <div class="tour-foot">
        <ol class="tour-dots" aria-hidden="true">
          {TOUR_STEPS.map((s, i) => (
            <li key={s} data-on={i === at ? '' : undefined} data-done={i < at ? '' : undefined} />
          ))}
        </ol>
        <div class="tour-acts">
          {!last && (
            <button type="button" class="btn btn-text tour-skip" onClick={() => dlg.current?.close()}>
              {ko.tour.skip}
            </button>
          )}
          {at > 0 && (
            <button type="button" class="btn tour-prev" onClick={() => go(at - 1)}>
              {ko.tour.prev}
            </button>
          )}
          <button ref={nextBtn} type="button" class="btn btn-primary tour-next" onClick={() => (last ? dlg.current?.close() : go(at + 1))}>
            {at === 0 ? ko.tour.begin : last ? ko.tour.finish : ko.tour.next}
            {!last && <Icon name="next" size="18px" />}
          </button>
        </div>
      </div>
      <p class="visually-hidden" aria-live="polite">
        {live}
      </p>
    </dialog>
  );
}

/** 가이드 스타일을 한 번만 붙이고 받을 때까지 기다린다 (스타일 없이 깜빡 그려지지 않게. 못 받아도 연다) */
function loadStyle(): Promise<void> {
  if (document.querySelector('link[data-tour-css]')) return Promise.resolve();
  return new Promise((ok) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = tourCss;
    link.dataset['tourCss'] = '';
    link.onload = () => ok();
    link.onerror = () => ok();
    document.head.append(link);
  });
}

/** 가이드를 연다. 닫히면 그림을 거두고 연 단추로 초점을 돌린다(저절로 열렸으면 그대로) */
export async function showTour(opener: HTMLElement | null, done: () => void): Promise<void> {
  await loadStyle();
  const host = document.createElement('div');
  host.className = 'tour-host';
  document.body.append(host);
  const close = (): void => {
    render(null, host);
    host.remove();
    done();
    if (opener?.isConnected) opener.focus();
  };
  render(<Tour data={readData()} onClose={close} />, host);
}
