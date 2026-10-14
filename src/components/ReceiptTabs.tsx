// 4단계 칸 셋(설계도 · 용어 · AI에게 할 말)의 내용 (D82, 설계서 L-08). 단계 화면의 첫 묶음에 싣지 않고,
// 영수증을 그린 뒤 쉬는 시간에(또는 칸 이름에 초점·포인터가 갈 때) Receipt 섬이 import()로 미리 받는다. 처음 보이는 영수증 칸은 Receipt.tsx에 있다.
// 칸 틀(role="tabpanel", 칸 이름과 잇기, 초점)은 Receipt가 늘 그리고, 여기는 칸 안만 그린다. 내용은 모두 엔진이 만든다.
import { ko } from '../copy/ko.ts';
import { catalog } from '../lib/data.ts';
import type { EngineResult } from '../lib/engine/index.ts';
import { conversationCards, fill } from '../lib/engine/index.ts';
import { isBucket } from '../lib/event-spec.ts';
import { packText } from '../lib/pack-file.ts';
import { ROUTES, termPath } from '../lib/routes.ts';
import { track } from '../lib/track.ts';
import CopyButton from './CopyButton.tsx';

const T = catalog.data.templates;
const conceptTitle = (id: string): string => catalog.concept.get(id)?.title ?? id;

/** 설계도 칸: 고른 AI에 맞는 저장 안내 + [설계도 복사] + 미리 보기 */
export function PackTab({ r, issuedAt }: { r: EngineResult; issuedAt: string }) {
  const pack = packText(catalog, r, issuedAt);
  const aiTag = Object.keys(r.interview.tags).find((t) => t.startsWith('ai.'));
  const saveAs = (aiTag ? T.aiTools[aiTag] : undefined)?.saveAs ?? T.aiTools['ai.chat-free']?.saveAs ?? '';
  return (
    <>
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
    </>
  );
}

/** 용어 칸: 먼저 읽어 둘 용어 + 단계마다 볼 용어 ('먼저 읽어 둘 용어'에 이미 있는 것은 되풀이하지 않는다) */
export function StudyTab({ r }: { r: EngineResult }) {
  if (r.study.all.length === 0) return <p>{ko.receipt.studyNone}</p>;
  const steps = r.steps.map((s) => ({ ...s, concepts: s.concepts.filter((id) => !r.study.required.includes(id)) })).filter((s) => s.concepts.length > 0);
  return (
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
  );
}

/** AI에게 할 말 칸: 장마다 언제 쓰는지 + 붙여 넣을 말 + [복사] (복사 집계는 card_copy 구간만, D84) */
export function CardsTab({ r, stateId }: { r: EngineResult; stateId: string }) {
  return (
    <>
      <p class="ar-sub">{ko.receipt.cardsLead}</p>
      <ul class="ar-talks">
        {conversationCards(catalog, r).map((c) => (
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
    </>
  );
}
