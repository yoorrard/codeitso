// 4단계 설계도 받기 섬 (brief 6.8, D70, docs/RECEIPT.md). 지도 띠 아래 내용 시트 안에서:
//   (영수증 링크로 열면 꼬리표 '받은 영수증 보기') → 사건 메시지 '도착했습니다. 요금은 0원입니다.' → H1 + 한 줄
//   → 건네드릴 것 카드(화면에 단 하나의 카드) → (링크로 열면 [이 영수증으로 이어서 가기]) → 칸 고르개 4칸
//   (영수증 · 설계도 · 용어 · AI에게 할 말, 처음은 영수증) → 맺음 한 줄. 주 버튼 [설계도 내려받기 (.md)]는 아래 막대(ArrivalAction).
// 영수증·설계도·AI에게 할 말은 모두 엔진(receiptModel·renderPack·conversationCards)이 만든다. 화면은 그리고 복사만 한다.
// 영수증 링크(#r=)로 열면 읽자마자 주소에서 지우고 읽기 전용으로 보인다. '이어서 가기'를 누를 때만 저장한다.
// 잠김(만들 앱을 정하기 전·막힌 곳이 남음)은 빈 상태 하나: 까닭은 상태 한 줄, 행동은 아래 막대 주 버튼 하나와 같다.
import { useStore } from '@nanostores/preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { $arrivalView, $issuedAt, resultFor, viewOf } from '../lib/arrival-view.ts';
import { issuedNow } from '../lib/clock.ts';
import { catalog } from '../lib/data.ts';
import type { EngineResult } from '../lib/engine/index.ts';
import { conversationCards, evaluate, fill, receiptModel, renderPack, renderReceiptText } from '../lib/engine/index.ts';
import { elapsedBucket, isBucket } from '../lib/event-spec.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { LOGO_MONO_MARK } from '../lib/logo-paths.ts';
import { reduced, skipAll, skippable } from '../lib/motion.ts';
import { receiptNo } from '../lib/receipt-no.ts';
import { $result, commitSession } from '../lib/result.ts';
import { ROUTES, termPath } from '../lib/routes.ts';
import { EMPTY_SESSION } from '../lib/saved.ts';
import { sfx } from '../lib/sfx.ts';
import { SHARE_PREFIX, consumeShareHash, shareHash, shareUrl } from '../lib/share.ts';
import { gate, hasProgress, sameSession } from '../lib/stages.ts';
import { stateKey, track } from '../lib/track.ts';
import { $meta, $seen, $session, markSceneSeen, patchMeta, rememberReceipt } from '../lib/store.ts';
import CopyButton from './CopyButton.tsx';
import { DispatchNote } from './DispatchNote.tsx';
import { ArtTile } from './Glyph.tsx';
import { Lead } from './Lead.tsx';
import { Logo } from './Logo.tsx';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);
const T = catalog.data.templates;
/** 처음 받은 영수증의 도착 알림은 한 번만 (CONCEPT 7절 S6) */
const ARRIVED = 'arrival';

/** 출력이 끝난 뒤(동작 줄이기면 바로) 도착 알림과 소리 하나: 내 영수증을 처음 받았을 때만 (영수증 링크로 연 것은 아님).
 *  색종이·축하 팡파르는 없다 (D56). 0ms 애니메이션은 animationend가 오지 않는 브라우저가 있어 장면 끝에서 부른다 */
function announceArrival(): void {
  if ($arrivalView.get().kind !== 'own' || $meta.get().issued !== true || $seen.get().scenes.includes(ARRIVED)) return;
  markSceneSeen(ARRIVED);
  announce(`${ko.dispatch.arrival} ${ko.dispatch.arrivalNext}`);
  void sfx('stamp');
}
type Tab = 'receipt' | 'pack' | 'study' | 'cards';
const TABS: Tab[] = ['receipt', 'pack', 'study', 'cards'];
/** 칸 고르개의 화살표 키: 가로(←→)와 세로 줄 목록으로 바뀐 때(↑↓) 모두 */
const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** 인앱 브라우저(카카오톡·네이버·인스타그램 등)는 공유 창이 불안정해 링크 복사로 대신한다 */
function canWebShare(): boolean {
  if (typeof navigator.share !== 'function') return false;
  return !/KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent);
}

/** 영수증 종이 (brief 6.8): 흰 감열지(낮·밤 같음), CC Receipt 14/20, 36칸, 최대 폭 360, 아래 톱니 8.
 *  머리: 단색 모자 마크 24 + '코드쇼퍼 영수증' + 받은 날 + 영수증 번호 4자리(지난 영수증 줄과 같은 번호). 끝에 남색 도장 */
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
function Tabs({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
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
          >
            {ko.receipt.tabs[t]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Panel({ id, active, children }: { id: Tab; active: Tab; children: ComponentChildren }) {
  return (
    <section role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} hidden={active !== id} tabIndex={0} class="ar-panel">
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
  const seen = useStore($seen);
  const [tab, setTab] = useState<Tab>('receipt');
  const [scene, setScene] = useState(false);
  // 출력은 한 번만: 도착 장면을 이미 봤거나 이 화면에서 한 번 뽑았으면, 영수증 칸으로 돌아오거나 다시 열어도 다시 뽑지 않는다 (arrival.css)
  const [printedHere, setPrintedHere] = useState(false);
  const printed = printedHere || seen.scenes.includes(ARRIVED);
  const sceneRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
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

  // 출력 장면: 누르기·Esc·건너뛰기로 끝. 동작 줄이기거나 돌 애니메이션이 없으면 장면 없이 끝 상태로 바로 도착 알림
  useEffect(() => {
    const el = sceneRef.current;
    if (!loaded || !el) return;
    const running = reduced() ? [] : el.getAnimations({ subtree: true });
    if (running.length === 0) {
      setPrintedHere(true);
      announceArrival();
      return;
    }
    setScene(true);
    const release = skippable(el);
    void Promise.allSettled(running.map((a) => a.finished)).then(() => {
      if (document.activeElement === skipRef.current) document.getElementById('receipt-title')?.focus();
      setScene(false);
      setPrintedHere(true);
      release();
      announceArrival();
    });
    return release;
  }, [loaded, view.kind, open]);

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

  const url = shareUrl(window.location.origin, r.session);
  const pack = renderPack(catalog, r, { siteUrl: window.location.origin, issuedAt });
  const cards = conversationCards(catalog, r);
  const aiTag = Object.keys(r.interview.tags).find((t) => t.startsWith('ai.'));
  const saveAs = (aiTag ? T.aiTools[aiTag] : undefined)?.saveAs ?? T.aiTools['ai.chat-free']?.saveAs ?? '';
  const prep = [...r.prep].sort((a, b) => ['days', 'hours', 'instant'].indexOf(a.lead) - ['days', 'hours', 'instant'].indexOf(b.lead));
  const conceptTitle = (id: string): string => catalog.concept.get(id)?.title ?? id;
  // 만들면서 볼 용어: '먼저 읽어 둘 용어'에 이미 있는 것은 되풀이하지 않는다 (보여 주기만 거른다)
  const steps = r.steps.map((s) => ({ ...s, concepts: s.concepts.filter((id) => !r.study.required.includes(id)) })).filter((s) => s.concepts.length > 0);
  const arrived = view.kind === 'own' && meta.issued === true;

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
      {/* 도착은 사건이라 기사 메시지로 알리고, H1은 이 단계의 할 일을 말한다 (D64, brief 6.1) */}
      {arrived && <DispatchNote title={ko.dispatch.arrival} text={ko.dispatch.arrivalNext} class="ar-note" />}
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

      <Tabs active={tab} onChange={setTab} />

      <Panel id="receipt" active={tab}>
        <div class="receipt-scene" ref={sceneRef} data-printed={printed ? '' : undefined}>
          <Paper r={r} issuedAt={issuedAt} />
          {scene && (
            <button ref={skipRef} type="button" class="btn btn-sm scene-skip-btn" onClick={() => sceneRef.current && skipAll(sceneRef.current)}>
              {ko.receipt.skip}
            </button>
          )}
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

      <Panel id="pack" active={tab}>
        <p>{ko.receipt.packLead}</p>
        {saveAs && <p class="ar-sub">{saveAs}</p>}
        <div class="ar-pair">
          <CopyButton text={pack} label={ko.receipt.copyPack} />
        </div>
        <details class="fold pack-preview">
          <summary>{ko.receipt.packPreview}</summary>
          <pre class="pack-pre" tabIndex={0}>
            {pack}
          </pre>
        </details>
      </Panel>

      <Panel id="study" active={tab}>
        {r.study.all.length === 0 ? (
          <p>{ko.receipt.studyNone}</p>
        ) : (
          <>
            {r.study.required.length > 0 && (
              <>
                <h2 class="ar-h2">{ko.receipt.studyRequired}</h2>
                <p class="ar-sub">{ko.receipt.studyMinutes}</p>
                <ul class="list ar-list">
                  {r.study.required.map((id) => (
                    <li>
                      <a class="list-row" href={termPath(id)}>
                        <span class="list-name ar-row-name">{conceptTitle(id)}</span>
                        <span class="list-chev" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {steps.length > 0 && (
              <>
                <h2 class="ar-h2">{ko.receipt.studySteps}</h2>
                {steps.map((s) => (
                  <>
                    <h3 class="ar-h3">{s.title}</h3>
                    <ul class="list ar-list">
                      {s.concepts.map((id) => (
                        <li>
                          <a class="list-row" href={termPath(id)}>
                            <span class="list-name ar-row-name">{conceptTitle(id)}</span>
                            <span class="list-chev" aria-hidden="true" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                ))}
              </>
            )}
            <a class="btn btn-text ar-terms" href={ROUTES.terms}>
              {ko.receipt.studyGo}
            </a>
          </>
        )}
      </Panel>

      <Panel id="cards" active={tab}>
        <p class="ar-sub">{ko.receipt.cardsLead}</p>
        <ul class="ar-talks">
          {cards.map((c) => (
            <li class="ar-talk">
              <h3 class="ar-talk-title">{c.title}</h3>
              <p class="ar-sub">{fill(ko.receipt.cardWhen, { when: c.when })}</p>
              <div class="paste">
                <div class="paste-head">
                  <span class="paste-label">{ko.receipt.pasteLabel}</span>
                  <CopyButton
                    text={c.text}
                    srLabel={`${c.title}: ${ko.common.copy}`}
                    onCopied={() => isBucket('card_copy', c.id) && track('card_copy', c.id, `${c.id}:${stateId}`)}
                  />
                </div>
                <p class="paste-body">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <p class="ar-end">{ko.receipt.end}</p>
      {/* 설계도(.md) 끝의 면책(templates.disclaimer, 문서라 '-습니다'체)을 화면 말(해요체)로 */}
      <p class="ar-fine">{ko.receipt.fine}</p>
    </div>
  );
}
