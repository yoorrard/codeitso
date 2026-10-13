// 도착 섬 (T11, docs/CONCEPT.md 6.6, docs/RECEIPT.md): 영수증 출력 장면(S6) → 탭 네 개(영수증·설계도·읽어 둘 용어·AI에게 할 말).
// 영수증·설계도·AI에게 할 말은 모두 엔진(receiptModel·renderPack·conversationCards)이 만든다. 화면은 그리고 복사·내려받기만 한다.
// 영수증 링크(#r=)로 열면 읽자마자 주소에서 지우고, 읽기 전용으로 보여 준다. '이어서 가기'를 누를 때만 저장한다.
import { useStore } from '@nanostores/preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { issuedNow } from '../lib/clock.ts';
import { catalog } from '../lib/data.ts';
import type { EngineResult } from '../lib/engine/index.ts';
import { conversationCards, evaluate, fill, packFileName, receiptModel, renderPack, renderReceiptText } from '../lib/engine/index.ts';
import type { Session } from '../lib/engine/types.ts';
import { elapsedBucket, isBucket } from '../lib/event-spec.ts';
import { stateKey, track } from '../lib/track.ts';
import { reduced, skipAll, skippable } from '../lib/motion.ts';
import { $result, commitSession } from '../lib/result.ts';
import { sfx } from '../lib/sfx.ts';
import { consumeShareHash, shareUrl } from '../lib/share.ts';
import { ROUTES, termPath } from '../lib/routes.ts';
import { hasProgress, sameSession } from '../lib/stages.ts';
import { $meta, $seen, $session, markSceneSeen, patchMeta } from '../lib/store.ts';
import CopyButton from './CopyButton.tsx';
import { Icon } from './Icon.tsx';

const T = catalog.data.templates;
/** 처음 받은 영수증의 도착 알림은 한 번만 (CONCEPT 7절 S6) */
const ARRIVED = 'arrival';
type Tab = 'receipt' | 'pack' | 'study' | 'cards';
const TABS: Tab[] = ['receipt', 'pack', 'study', 'cards'];

type Mode = { kind: 'loading' } | { kind: 'own' } | { kind: 'shared'; session: Partial<Session> } | { kind: 'broken' };

/** 인앱 브라우저(카카오톡·네이버·인스타그램 등)는 공유 창이 불안정해 링크 복사로 대신한다 */
function canWebShare(): boolean {
  if (typeof navigator.share !== 'function') return false;
  return !/KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent);
}

function Paper({ r, issuedAt, onPrinted }: { r: EngineResult; issuedAt: string; onPrinted: () => void }) {
  const m = receiptModel(catalog, r, issuedAt);
  return (
    <div class="printer">
      <div class="paper" role="group" aria-label={ko.receipt.paperLabel}>
        <p class="r-title r-fixed">{m.title}</p>
        <p class="r-center r-fixed">{m.issuedAt}</p>
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
        <p class="r-row r-fixed">
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
        <p class="r-row r-fixed r-counts">
          <span>
            {m.countLabels.prep} {fill(m.countFormat, { n: m.counts.prep })}
          </span>
          <span>
            {m.countLabels.study} {fill(m.countFormat, { n: m.counts.study })}
          </span>
          <span>
            {m.countLabels.research} {fill(m.countFormat, { n: m.counts.research })}
          </span>
        </p>
        <hr class="r-rule" />
        <p class="r-stamp r-fixed" onAnimationEnd={onPrinted}>
          {m.stamp}
        </p>
        <p class="r-center r-fixed r-footer">{m.footer}</p>
      </div>
    </div>
  );
}

function Tabs({ active, onChange, children }: { active: Tab; onChange: (t: Tab) => void; children: ComponentChildren }) {
  const list = useRef<HTMLDivElement>(null);
  const move = (e: KeyboardEvent): void => {
    const i = TABS.indexOf(active);
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
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
    <>
      <div class="tabs" role="tablist" aria-label={ko.receipt.tabsLabel} ref={list} onKeyDown={move}>
        {TABS.map((t) => (
          <button type="button" role="tab" id={`tab-${t}`} aria-selected={active === t} aria-controls={`panel-${t}`} tabIndex={active === t ? 0 : -1} onClick={() => onChange(t)}>
            {ko.receipt.tabs[t]}
          </button>
        ))}
      </div>
      {children}
    </>
  );
}

function Panel({ id, active, children }: { id: Tab; active: Tab; children: ComponentChildren }) {
  return (
    <section role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} hidden={active !== id} tabIndex={0} class="tab-panel">
      {children}
    </section>
  );
}

export default function Receipt() {
  const [mode, setMode] = useState<Mode>({ kind: 'loading' });
  const [issuedAt, setIssuedAt] = useState('');
  const [tab, setTab] = useState<Tab>('receipt');
  const [scene, setScene] = useState(false);
  const live = useStore($result);
  const meta = useStore($meta);
  const sceneRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLDialogElement>(null);
  const continueBtn = useRef<HTMLButtonElement>(null);

  // 브라우저에서만: 공유 링크를 읽고 바로 지운다. 발행 시각은 열 때마다 새로 찍는다 (RECEIPT.md 5절)
  useEffect(() => {
    setIssuedAt(issuedNow());
    const read = consumeShareHash(window);
    if (read.status === 'broken') setMode({ kind: 'broken' });
    else if (read.status === 'ok') {
      setMode({ kind: 'shared', session: read.session });
    } else setMode({ kind: 'own' });
  }, []);

  const r = mode.kind === 'shared' ? evaluate(catalog, mode.session) : live;
  const shared = mode.kind === 'shared';

  // 출력 장면: 누르기·Esc·건너뛰기로 끝. 동작 줄이기면 장면 없이 끝 상태
  useEffect(() => {
    const el = sceneRef.current;
    if (mode.kind === 'loading' || !el || reduced()) return;
    const running = el.getAnimations({ subtree: true });
    if (running.length === 0) return;
    setScene(true);
    const release = skippable(el);
    void Promise.allSettled(running.map((a) => a.finished)).then(() => {
      if (document.activeElement === skipRef.current) document.getElementById('receipt-title')?.focus();
      setScene(false);
      release();
    });
    return release;
  }, [mode.kind, r.canIssue]);

  // 집계(R-60): 처음 보는 상태의 내 영수증이 화면에 나오면 한 번. 구간은 목적지 첫 답부터 걸린 시간
  const stateId = stateKey(r.session);
  useEffect(() => {
    if (mode.kind !== 'own' || !meta.issued || !r.canIssue) return;
    track('receipt_issued', elapsedBucket(meta.interviewStartedAt, Date.now()), stateId);
  }, [mode.kind, meta.issued, r.canIssue, stateId]);

  if (mode.kind === 'loading') {
    return <p class="q-card">{ko.receipt.loading}</p>;
  }
  if (mode.kind === 'broken' || (shared && !r.canIssue)) {
    return (
      <section class="q-card" aria-labelledby="receipt-title">
        <h1 id="receipt-title">{ko.receipt.broken}</h1>
        <a class="btn btn-primary" href={ROUTES.home}>
          {ko.receipt.home}
        </a>
      </section>
    );
  }
  if (!r.canIssue) {
    return (
      <section class="q-card" aria-labelledby="receipt-title">
        <h1 id="receipt-title">{ko.receipt.blocked}</h1>
        <a class="btn btn-primary" href={ROUTES.check}>
          {ko.receipt.toCheck}
        </a>
      </section>
    );
  }

  const url = shareUrl(window.location.origin, r.session);
  const pack = renderPack(catalog, r, { siteUrl: window.location.origin, issuedAt });
  const cards = conversationCards(catalog, r);
  const aiTag = Object.keys(r.interview.tags).find((t) => t.startsWith('ai.'));
  const saveAs = (aiTag ? T.aiTools[aiTag] : undefined)?.saveAs ?? T.aiTools['ai.chat-free']?.saveAs ?? '';
  const prep = [...r.prep].sort((a, b) => ['days', 'hours', 'instant'].indexOf(a.lead) - ['days', 'hours', 'instant'].indexOf(b.lead));
  const conceptTitle = (id: string): string => catalog.concept.get(id)?.title ?? id;

  // 처음 받은 영수증이면 출력이 끝난 뒤 도착 알림과 소리 하나 (영수증 링크로 연 것은 아님). 색종이·축하 팡파르는 없다 (D56)
  const printed = (): void => {
    if (shared || !meta.issued || $seen.get().scenes.includes(ARRIVED)) return;
    markSceneSeen(ARRIVED);
    announce(`${ko.dispatch.arrival} ${ko.dispatch.arrivalNext}`);
    void sfx('stamp');
  };

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

  const download = (): void => {
    const file = packFileName(new Date());
    const blob = new Blob([pack], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    announce(fill(ko.receipt.downloaded, { file }));
  };

  const continueHere = (): void => {
    if (mode.kind !== 'shared') return;
    const now = $session.get();
    if (hasProgress(now) && !sameSession(catalog, now, mode.session)) confirm.current?.showModal();
    else adopt();
  };
  const adopt = (): void => {
    if (mode.kind !== 'shared') return;
    commitSession(mode.session);
    // 공유 링크로 이어 한 상태는 인터뷰 시작 시각이 없다 (발행 집계 구간 none)
    patchMeta({ interviewStartedAt: undefined });
    setMode({ kind: 'own' });
    announce(ko.receipt.continued);
  };

  return (
    <div class="receipt">
      <h1 id="receipt-title" tabIndex={-1}>
        {shared ? ko.receipt.pageTitle : ko.dispatch.arrival}
      </h1>
      {!shared && <p class="lead">{ko.dispatch.arrivalNext}</p>}
      {shared && (
        <div class="shared-note">
          <p>{ko.receipt.sharedNote}</p>
          <button ref={continueBtn} type="button" class="btn btn-primary" onClick={continueHere}>
            {ko.receipt.continueHere}
          </button>
          <dialog ref={confirm} class="sheet" aria-labelledby="continue-title" onClose={() => continueBtn.current?.focus()}>
            <h2 id="continue-title">{ko.receipt.continueTitle}</h2>
            <p>{ko.receipt.continueBody}</p>
            <form method="dialog" class="sheet-actions">
              <button class="btn">{ko.receipt.continueNo}</button>
              <button class="btn btn-primary" value="go" onClick={adopt}>
                {ko.receipt.continueYes}
              </button>
            </form>
          </dialog>
        </div>
      )}

      <div class="receipt-scene" ref={sceneRef}>
        <Paper r={r} issuedAt={issuedAt} onPrinted={printed} />
        {scene && (
          <button ref={skipRef} type="button" class="btn scene-skip-btn" onClick={() => sceneRef.current && skipAll(sceneRef.current)}>
            {ko.receipt.skip}
          </button>
        )}
      </div>

      <Tabs active={tab} onChange={setTab}>
        <Panel id="receipt" active={tab}>
          <div class="action-row">
            <CopyButton text={renderReceiptText(receiptModel(catalog, r, issuedAt))} label={ko.receipt.copyReceipt} />
            <CopyButton text={url} label={ko.receipt.copyLink} done={ko.receipt.linkCopied} />
            <button type="button" class="btn" onClick={() => void sendPc()}>
              <Icon name="share" />
              <span>{ko.receipt.sendPc}</span>
            </button>
            <a class="btn btn-quiet" href={`mailto:?subject=${encodeURIComponent(ko.receipt.shareTitle)}&body=${encodeURIComponent(url)}`}>
              {ko.receipt.mail}
            </a>
          </div>
          <details class="stuck">
            <summary>
              <Icon name="help" />
              <span>{ko.receipt.prepTitle}</span>
            </summary>
            <ul>
              {prep.map((x) => (
                <li>
                  {x.label} ({T.leadLabels[x.lead]})
                </li>
              ))}
            </ul>
          </details>
          {r.stuck.length > 0 && (
            <details class="stuck">
              <summary>
                <Icon name="warning" />
                <span>{ko.receipt.stuckTitle}</span>
              </summary>
              <ul>
                {r.stuck.map((x) => (
                  <li>{x.text}</li>
                ))}
              </ul>
            </details>
          )}
        </Panel>

        <Panel id="pack" active={tab}>
          <p>{ko.receipt.packLead}</p>
          <p class="q-help">{saveAs}</p>
          <div class="action-row">
            <CopyButton text={pack} label={ko.receipt.copyPack} primary />
            <button type="button" class="btn" onClick={download}>
              <Icon name="download" />
              <span>{ko.receipt.download}</span>
            </button>
          </div>
          <details class="pack-preview">
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
              <h2>{ko.receipt.studyRequired}</h2>
              <p class="q-help">{ko.receipt.studyMinutes}</p>
              <ul class="concept-links">
                {r.study.required.map((id) => (
                  <li>
                    <a href={termPath(id)}>{conceptTitle(id)}</a>
                  </li>
                ))}
              </ul>
              <h2>{ko.receipt.studySteps}</h2>
              <ol class="step-concepts">
                {r.steps
                  .filter((s) => s.concepts.length > 0)
                  .map((s) => (
                    <li>
                      <strong>{s.title}</strong>:{' '}
                      {s.concepts.map((id, i) => (
                        <>
                          {i > 0 && ', '}
                          <a href={termPath(id)}>{conceptTitle(id)}</a>
                        </>
                      ))}
                    </li>
                  ))}
              </ol>
              <a class="btn" href={ROUTES.terms}>
                {ko.receipt.studyGo}
              </a>
            </>
          )}
        </Panel>

        <Panel id="cards" active={tab}>
          <p class="q-help">{ko.receipt.cardsLead}</p>
          <ul class="talk-cards">
            {cards.map((c) => (
              <li class="card">
                <h3>{c.title}</h3>
                <p class="meta">
                  {ko.receipt.cardWhen}: {c.when}
                </p>
                <p class="prompt-box">{c.text}</p>
                <CopyButton text={c.text} srLabel={`${c.title}: ${ko.common.copy}`} onCopied={() => isBucket('card_copy', c.id) && track('card_copy', c.id, `${c.id}:${stateId}`)} />
              </li>
            ))}
          </ul>
        </Panel>
      </Tabs>

      <p class="q-help">{T.disclaimer}</p>
      <p class="receipt-end">{ko.common.receiptEnd}</p>
    </div>
  );
}
