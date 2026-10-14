// 4단계 설계도 받기 섬 (brief 6.8, D70, v4 D96·D98: 두 칸 격자의 왼쪽 칸, docs/RECEIPT.md).
//   (영수증 링크로 열면 꼬리표 '받은 영수증 보기') → H1 + 한 줄 → 건네드릴 것 카드 → (링크로 열면 [이 영수증으로 이어서 가기])
//   → 칸 고르개 4칸 (영수증 · 설계도 · 용어 · AI에게 할 말, 처음은 영수증) → 맺음 한 줄. 주 버튼 [설계도 내려받기 (.md)]는 왼쪽 칸 아래(ArrivalAction).
// 영수증·설계도·AI에게 할 말은 모두 엔진(receiptModel·renderPack·conversationCards)이 만든다. 화면은 그리고 복사만 한다.
// 영수증 밖의 칸 셋(설계도·용어·AI에게 할 말)의 안은 첫 묶음 밖(ReceiptTabs.tsx, D82, 설계서 L-08)이고, 영수증을 그린 뒤 쉬는 시간에
// import()로 미리 받는다(칸 이름에 초점·포인터가 가도). 칸 틀(role="tabpanel"·칸 이름 잇기·초점)은 여기서 늘 그린다.
// 못 받으면(망 끊김, 배포로 묶음 주소가 바뀜) 브라우저가 실패를 기억해 같은 주소로 다시 받을 수 없으므로, 열린 칸에 한 줄 + [새로 고치기]를 낸다.
// 영수증 링크(#r=)로 열면 읽자마자 주소에서 지우고 읽기 전용으로 보인다. '이어서 가기'를 누를 때만 저장한다.
// 잠김(만들 앱을 정하기 전·막힌 곳이 남음)은 빈 상태 하나: 까닭은 상태 한 줄, 행동은 주 버튼 하나와 같다.
// 영수증 출력·도장 연출과 도착 장면·소리는 걷어 냈다 (v4 D96): 영수증은 처음부터 다 보인다. 처음 받은 설계도는 낭독 알림 한 번만.
import { useStore } from '@nanostores/preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { $arrivalView, $issuedAt, resultFor, viewOf } from '../lib/arrival-view.ts';
import { issuedNow } from '../lib/clock.ts';
import { catalog } from '../lib/data.ts';
import type { EngineResult } from '../lib/engine/index.ts';
import { conversationCards, evaluate, fill, receiptModel, renderReceiptText } from '../lib/engine/index.ts';
import { elapsedBucket } from '../lib/event-spec.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { LOGO_MONO_MARK } from '../lib/logo-paths.ts';
import { receiptNo } from '../lib/receipt-no.ts';
import { $result, commitSession } from '../lib/result.ts';
import { siteRoot } from '../lib/routes.ts';
import { EMPTY_SESSION } from '../lib/saved.ts';
import { SHARE_PREFIX, consumeShareHash, shareHash, shareUrl } from '../lib/share.ts';
import { gate, hasProgress, sameSession } from '../lib/stages.ts';
import { stateKey, track } from '../lib/track.ts';
import { $meta, $seen, $session, markSceneSeen, patchMeta, rememberReceipt } from '../lib/store.ts';
import CopyButton from './CopyButton.tsx';
import { ArtTile } from './Glyph.tsx';
import { Lead } from './Lead.tsx';
import { Logo } from './Logo.tsx';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);
const T = catalog.data.templates;
/** 처음 받은 설계도의 알림은 한 번만 (본 기록 id는 옛 장면 이름 그대로 둔다: 다시 온 사람에게 또 알리지 않게) */
const ARRIVED = 'arrival';

/** 내 영수증을 처음 받는 때인가 (영수증 링크로 연 것은 아님) */
function firstArrival(): boolean {
  return $arrivalView.get().kind === 'own' && $meta.get().issued === true && !$seen.get().scenes.includes(ARRIVED);
}

type Tab = 'receipt' | 'pack' | 'study' | 'cards';
const TABS: Tab[] = ['receipt', 'pack', 'study', 'cards'];
type TabParts = typeof import('./ReceiptTabs.tsx');
let tabParts: Promise<TabParts> | null = null;
/** 영수증 밖 칸의 안을 한 번만 불러온다. 실패하면 다음에 칸을 누를 때 다시 해 본다
 *  (Chromium처럼 실패한 import()를 기억하는 브라우저에서는 다시 해도 실패한다: 화면은 새로 고치는 길을 준다) */
function loadTabParts(): Promise<TabParts> {
  tabParts ??= import('./ReceiptTabs.tsx').catch((e: unknown) => {
    tabParts = null;
    throw e;
  });
  return tabParts;
}
/** 칸 고르개의 화살표 키: 가로(←→)와 세로 줄 목록으로 바뀐 때(↑↓) 모두 */
const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** 인앱 브라우저(카카오톡·네이버·인스타그램 등)는 공유 창이 불안정해 링크 복사로 대신한다 */
function canWebShare(): boolean {
  if (typeof navigator.share !== 'function') return false;
  return !/KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent);
}

/** 영수증 종이 (brief 6.8): 흰 감열지(낮·밤 같음), CC Receipt 14/20, 36칸, 최대 폭 360.
 *  머리: 단색 모자 마크 24 + '코드쇼퍼 영수증' + 받은 날 + 영수증 번호 4자리(지난 영수증 줄과 같은 번호) */
function Paper({ r, issuedAt }: { r: EngineResult; issuedAt: string }) {
  const m = receiptModel(catalog, r, issuedAt);
  const no = receiptNo(shareHash(r.session).slice(SHARE_PREFIX.length));
  return (
    <div class="printer">
      <div class="paper" role="group" aria-label={ko.receipt.paperLabel}>
        {/* 감열 영수증 머리의 로고처럼 한 가지 잉크로 찍은 모자 마크 (단색판 E, D65) */}
        <Logo variant="monoMark" art={LOGO_MONO_MARK} height={24} class="r-mark" />
        <p class="r-title r-fixed">{m.title}</p>
        <p class="r-row r-fixed r-meta">
          <span>{m.issuedAt}</span>
          <span>{fill(ko.receipt.paperNo, { no })}</span>
        </p>
        <hr class="r-rule" />
        <p class="r-row">
          <span class="r-fixed">{m.destinationLabel}</span> <span class="r-var">{m.destination}</span>
        </p>
        <hr class="r-rule" />
        <ul class="r-items">
          {m.items.map((it) => (
            <li>
              <span class="r-slot r-var">
                {it.slot}
                {it.later && <span class="r-fixed"> {m.laterMark}</span>}
              </span>
              <span class="r-name r-var">{it.name}</span>
              <span class="r-price r-fixed">{it.price}</span>
            </li>
          ))}
        </ul>
        <hr class="r-rule" />
        <p class="r-row r-fixed r-total">
          <span>{m.totalLabel}</span>
          <span>{m.total}</span>
        </p>
        <p class="r-row r-fixed">
          <span>{m.timeLabel}</span>
          <span>{m.timeText}</span>
        </p>
        <p class="r-row r-fixed">
          <span>{m.difficultyLabel}</span>
          <span>{m.difficultyText}</span>
        </p>
        {(['prep', 'study', 'research'] as const).map((k) => (
          <p class="r-row r-fixed">
            <span>{m.countLabels[k]}</span>
            <span>{fill(m.countFormat, { n: m.counts[k] })}</span>
          </p>
        ))}
        <hr class="r-rule" />
        <p class="r-stamp r-fixed">
          <Logo variant="monoMark" art={LOGO_MONO_MARK} height={20} />
          {m.stamp}
        </p>
        <p class="r-center r-fixed r-footer">{m.footer}</p>
      </div>
    </div>
  );
}

/** 칸 고르개 4칸 (brief 5.6 .seg): role="tablist", 화살표·Home·End. 좁거나 글자 200%면 세로 줄 목록 (parts.css)이고 그때는 aria-orientation도 세로 */
function Tabs({ active, onChange, onWarm }: { active: Tab; onChange: (t: Tab) => void; onWarm: () => void }) {
  const list = useRef<HTMLDivElement>(null);
  const [vertical, setVertical] = useState(false);
  useEffect(() => {
    const el = list.current;
    if (!el || typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(() => setVertical(getComputedStyle(el).gridAutoFlow.startsWith('row')));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const move = (e: KeyboardEvent): void => {
    const i = TABS.indexOf(active);
    const step = STEP[e.key];
    let next: number;
    if (step !== undefined) next = (i + step + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    else return;
    e.preventDefault();
    const t = TABS[next];
    if (!t) return;
    onChange(t);
    list.current?.querySelector<HTMLButtonElement>(`#tab-${t}`)?.focus();
  };
  return (
    <div class="seg ar-seg">
      <div class="seg-list" role="tablist" aria-label={ko.receipt.tabsLabel} aria-orientation={vertical ? 'vertical' : undefined} ref={list} onKeyDown={move}>
        {TABS.map((t) => (
          <button
            type="button"
            role="tab"
            class="seg-opt"
            id={`tab-${t}`}
            aria-selected={active === t}
            aria-controls={`panel-${t}`}
            tabIndex={active === t ? 0 : -1}
            onClick={() => onChange(t)}
            onFocus={onWarm}
            onPointerEnter={onWarm}
          >
            {ko.receipt.tabs[t]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Panel({ id, active, busy = false, children }: { id: Tab; active: Tab; busy?: boolean; children: ComponentChildren }) {
  return (
    <section role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} aria-busy={busy || undefined} hidden={active !== id} tabIndex={0} class="ar-panel">
      {children}
    </section>
  );
}

/** 잠김·깨진 링크: 빈 상태 하나 (빈 터 청사진 96 + 제목 22/700 + 한 줄). 행동은 아래 막대 주 버튼 하나 */
function Empty({ title, text, ready }: { title: string; text: string; ready: boolean }) {
  return (
    <div class="arrival" data-ready={ready ? '' : undefined}>
      <div class="empty-state ar-empty">
        <ArtTile name="P01" size="hero" class="empty-state-art" />
        <h1 id="receipt-title" class="empty-state-title" tabIndex={-1}>
          {title}
        </h1>
        <p class="empty-state-text">{text}</p>
      </div>
    </div>
  );
}

export default function Receipt() {
  const ready = useHydrated();
  const view = useStore($arrivalView);
  const issuedAt = useStore($issuedAt);
  const live = useStore($result);
  const meta = useStore($meta);
  const [tab, setTab] = useState<Tab>('receipt');
  /** 영수증 밖 칸의 안 (불러오기 전 null, 못 불러오면 'failed') */
  const [parts, setParts] = useState<TabParts | 'failed' | null>(null);
  /** 미리 받기(칸 이름에 초점·포인터)는 조용히, 칸을 열었는데 못 불러오면 알린다 */
  const warm = (opened = false): void => {
    if (parts !== null && parts !== 'failed') return;
    if (parts === 'failed') setParts(null);
    void loadTabParts().then(
      (m) => setParts(() => m),
      () => {
        setParts('failed');
        if (opened) announce(ko.receipt.tabFailed);
      },
    );
  };
  const changeTab = (t: Tab): void => {
    setTab(t);
    if (t !== 'receipt') warm(true);
  };
  /** 다시 불러오기: 영수증 링크로 연 것이면 읽자마자 지운 링크(#r=)를 주소에 되돌려 놓고 새로 고친다 (같은 영수증이 다시 열리게) */
  const reload = (url: string): void => {
    if (view.kind === 'shared') history.replaceState(history.state, '', url);
    location.reload();
  };
  const confirm = useRef<HTMLDialogElement>(null);
  const continueBtn = useRef<HTMLButtonElement>(null);

  // 브라우저에서만: 영수증 링크를 읽고 바로 지운다. 발행 시각은 열 때마다 새로 찍는다 (RECEIPT.md 5절)
  useEffect(() => {
    $issuedAt.set(issuedNow());
    $arrivalView.set(viewOf(catalog, consumeShareHash(window)));
  }, []);

  const loaded = ready && view.kind !== 'loading';
  const shared = view.kind === 'shared';
  const r = loaded ? resultFor(catalog, view, live) : FIRST_VISIT;
  const open = shared || gate('arrival', r).open;

  // 처음 받은 내 설계도면 낭독 알림 한 번 (소리·장면 없음, v4 D96)
  useEffect(() => {
    if (!loaded || !open || !firstArrival()) return;
    markSceneSeen(ARRIVED);
    announce(ko.receipt.arrived);
  }, [loaded, view.kind, open]);

  // 영수증을 그린 뒤 쉬는 시간에 칸 셋의 안을 미리 받는다 (1KB. 열 때 기다리지 않고, 실패할 틈을 줄인다)
  useEffect(() => {
    if (!loaded || !open) return;
    const idle = 'requestIdleCallback' in window;
    const id = idle ? window.requestIdleCallback(() => warm(), { timeout: 2000 }) : window.setTimeout(() => warm(), 200);
    return () => {
      if (idle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [loaded, open]);

  // 집계(R-60): 처음 보는 상태의 내 영수증이 화면에 나오면 한 번. 구간은 목적지 첫 답부터 걸린 시간
  const stateId = stateKey(r.session);
  useEffect(() => {
    if (!loaded || view.kind !== 'own' || !meta.issued || !open) return;
    track('receipt_issued', elapsedBucket(meta.interviewStartedAt, Date.now()), stateId);
    // 지난 영수증에 한 장 (같은 상태면 앞으로 옮기기만). 넘쳐서 가장 오래된 것을 뺐으면 알린다
    const type = r.session.answers['q.type'];
    const entry = { r: shareHash(r.session).slice(SHARE_PREFIX.length), at: issuedNow(), ...(type ? { type } : {}) };
    if (rememberReceipt(entry)) announce(ko.receipts.dropped);
  }, [loaded, view.kind, meta.issued, open, stateId]);

  // 빌드 때(처음 온 사람)와 섬이 링크를 읽기 전에는 처음 온 사람의 잠김을 그린다 (다시 온 손님·영수증 링크는 arrival.css가 감춘다)
  if (view.kind === 'broken') return <Empty title={ko.receipt.broken} text={ko.receipt.brokenText} ready={loaded} />;
  if (!open) {
    return r.done ? (
      <Empty title={ko.receipt.blocked} text={ko.receipt.blockedText} ready={loaded} />
    ) : (
      <Empty title={ko.receipt.lockedDestination} text={ko.receipt.lockedDestinationText} ready={loaded} />
    );
  }

  // 사이트 첫 주소 = origin + 주소 바탕 (설계서 9.4절): 영수증 링크가 바탕을 품는다 (설계도 속 용어 주소는 src/lib/pack-file.ts)
  const url = shareUrl(siteRoot(), r.session);
  const cards = conversationCards(catalog, r);
  const prep = [...r.prep].sort((a, b) => ['unknown', 'days', 'hours', 'instant'].indexOf(a.lead) - ['unknown', 'days', 'hours', 'instant'].indexOf(b.lead));
  const got = parts !== null && parts !== 'failed' ? parts : null;
  /** 영수증 밖 칸: 불러왔으면 안을, 아니면 열린 칸에만 기다림 한 줄, 또는 실패 한 줄 + [새로 고치기] (알림과 같은 말) */
  const later = (id: Tab, body: (m: TabParts) => ComponentChildren) => (
    <Panel id={id} active={tab} busy={tab === id && parts === null}>
      {got
        ? body(got)
        : tab === id &&
          (parts === 'failed' ? (
            <div class="ar-failed">
              <p class="ar-sub">{ko.receipt.tabFailed}</p>
              <button type="button" class="btn btn-neutral" onClick={() => reload(url)}>
                {ko.receipt.tabReload}
              </button>
            </div>
          ) : (
            <p class="ar-sub">{ko.receipt.tabLoading}</p>
          ))}
    </Panel>
  );

  const sendPc = async (): Promise<void> => {
    if (canWebShare()) {
      try {
        await navigator.share({ title: ko.receipt.shareTitle, url });
        return;
      } catch {
        // 취소하거나 실패하면 링크 복사로
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      announce(ko.receipt.linkCopied);
    } catch {
      announce(ko.common.copyFailed);
    }
  };

  const continueHere = (): void => {
    if (view.kind !== 'shared') return;
    const now = $session.get();
    if (hasProgress(now) && !sameSession(catalog, now, view.session)) confirm.current?.showModal();
    else adopt();
  };
  const adopt = (): void => {
    if (view.kind !== 'shared') return;
    commitSession(view.session);
    // 공유 링크로 이어 한 상태는 인터뷰 시작 시각이 없다 (발행 집계 구간 none)
    patchMeta({ interviewStartedAt: undefined });
    $arrivalView.set({ kind: 'own' });
    announce(ko.receipt.continued);
    // 누른 버튼(과 대화 상자)이 함께 사라지므로 초점을 H1로 옮긴다 (WCAG 2.4.3)
    requestAnimationFrame(() => document.getElementById('receipt-title')?.focus());
  };
  /** 대화 상자를 닫으면 누른 버튼으로. 이어서 가기로 버튼이 사라졌으면 H1로 */
  const backFromConfirm = (): void => {
    const b = continueBtn.current;
    (b?.isConnected ? b : document.getElementById('receipt-title'))?.focus();
  };

  return (
    <div class="arrival" data-ready={loaded ? '' : undefined}>
      {shared && <span class="tag ar-shared-tag">{ko.receipt.sharedTag}</span>}
      <h1 id="receipt-title" tabIndex={-1}>
        {ko.receipt.title}
      </h1>
      <Lead text={ko.receipt.lead} />

      {/* 건네드릴 것 (화면에 단 하나의 카드): 빈 터 그림(렌더가 오기 전에는 청사진 판) + 받는 것 한 줄 */}
      <section class="ar-handover" aria-labelledby="ar-handover-title">
        <ArtTile name="P01" size="hero" class="ar-handover-art" />
        <div class="ar-handover-text">
          <h2 id="ar-handover-title" class="ar-handover-title">
            {ko.receipt.handoverTitle}
          </h2>
          {/* 받는 것 넷: 휴대폰은 가운뎃점으로 이은 한 묶음, 768px부터 한 줄에 하나 (arrival.css) */}
          <ul class="ar-handover-list">
            {fill(ko.receipt.handoverList, { cards: cards.length, study: r.study.all.length })
              .split(' · ')
              .map((x) => (
                <li>{x}</li>
              ))}
          </ul>
        </div>
      </section>

      {shared && (
        <div class="ar-shared">
          <p class="ar-sub">{ko.receipt.sharedNote}</p>
          <button ref={continueBtn} type="button" class="btn btn-neutral" onClick={continueHere}>
            {ko.receipt.continueHere}
          </button>
          <dialog ref={confirm} class="sheet" aria-labelledby="continue-title" aria-describedby="continue-body" onClose={backFromConfirm}>
            <h2 id="continue-title">{ko.receipt.continueTitle}</h2>
            <p id="continue-body">{ko.receipt.continueBody}</p>
            <form method="dialog" class="sheet-actions">
              <button class="btn btn-neutral" value="no">
                {ko.receipt.continueNo}
              </button>
              <button class="btn btn-primary" value="go" onClick={adopt}>
                {ko.receipt.continueYes}
              </button>
            </form>
          </dialog>
        </div>
      )}

      <Tabs active={tab} onChange={changeTab} onWarm={() => warm()} />

      <Panel id="receipt" active={tab}>
        <div class="receipt-scene">
          <Paper r={r} issuedAt={issuedAt} />
        </div>
        <div class="ar-pair">
          <CopyButton text={url} label={ko.receipt.copyLink} done={ko.receipt.linkCopied} />
          <button type="button" class="btn btn-neutral" onClick={() => void sendPc()}>
            {ko.receipt.sendPc}
          </button>
        </div>
        <div class="ar-more">
          <CopyButton text={renderReceiptText(receiptModel(catalog, r, issuedAt))} label={ko.receipt.copyReceipt} />
          <a class="btn btn-text" href={`mailto:?subject=${encodeURIComponent(ko.receipt.shareTitle)}&body=${encodeURIComponent(url)}`}>
            {ko.receipt.mail}
          </a>
        </div>
        <div class="ar-folds">
          <details class="fold">
            <summary>{ko.receipt.prepTitle}</summary>
            <ul class="ar-bullets">
              {prep.map((x) => (
                <li>
                  {x.label} ({T.leadLabels[x.lead]})
                </li>
              ))}
            </ul>
          </details>
          {r.stuck.length > 0 && (
            <details class="fold">
              <summary>{ko.receipt.stuckTitle}</summary>
              <ul class="ar-bullets">
                {r.stuck.map((x) => (
                  <li>{x.text}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </Panel>

      {later('pack', (m) => (
        <m.PackTab r={r} issuedAt={issuedAt} />
      ))}
      {later('study', (m) => (
        <m.StudyTab r={r} />
      ))}
      {later('cards', (m) => (
        <m.CardsTab r={r} stateId={stateId} />
      ))}

      <p class="ar-end">{ko.receipt.end}</p>
      {/* 설계도(.md) 끝의 면책(templates.disclaimer, 문서라 '-습니다'체)을 화면 말(해요체)로 */}
      <p class="ar-fine">{ko.receipt.fine}</p>
    </div>
  );
}
