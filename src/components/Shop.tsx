// 2단계 도구 고르기 섬 (brief 6.6, D70): H1 + 한 줄 → 기능 칩 한 줄(가로로 밀기) → 지금 여는 칸(제목 19/600 + 꼬리표 + 설명 한 줄)
// → 도구 줄 72(타일 40 + 이름 + '추천' 꼬리표 + 오른쪽 비용, 둘째 줄 '0원으로 시작 · 보통', 추천 줄만 셋째 줄 '추천 이유: …')
// → 접기 '원문만 있는 도구 n개'. 줄은 <button aria-pressed>이고, 눌린 줄 아래에만 따로 글 버튼 '자세히 ⌄'(버튼 안에 버튼을 두지 않는다).
// 고르는 방식: 꼭 고를 것은 추천 줄이 '고를 예정'으로 미리 눌려 있고(저장 안 함), 다른 줄을 누르면 옮겨 간다.
// 아래 막대의 [{도구}로 정하기](WaypointsAction)를 눌러야 저장된다. 있으면 좋은 것은 미리 누르지 않는다.
// 점수·추천·이유·비교·꼬리표는 모두 엔진 결과(evaluate, badges)다. 눌린 줄·여는 칸은 pick-nav.ts의 화면 상태다.
import { useStore } from '@nanostores/preact';
import { useEffect, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { catalog } from '../lib/data.ts';
import type { EngineResult, Scored, SlotRanking } from '../lib/engine/index.ts';
import { badges, evaluate, fill, toolDifficultyWord } from '../lib/engine/index.ts';
import type { Product } from '../lib/engine/types.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { josa } from '../lib/josa.ts';
import { $mapFocus } from '../lib/map/focus.ts';
import { reduced } from '../lib/motion.ts';
import { slotArt } from '../lib/option-art.ts';
import { $openSlot, $pending, $slotMoves, clearPending, initialSlot, plainName, pressedFor, rankingOf, savedFor, slotTitle } from '../lib/pick-nav.ts';
import { $result } from '../lib/result.ts';
import { termPath } from '../lib/routes.ts';
import { EMPTY_SESSION } from '../lib/saved.ts';
import { gate } from '../lib/stages.ts';
import { ArtTile, Glyph } from './Glyph.tsx';
import { Icon } from './Icon.tsx';
import { Lead } from './Lead.tsx';
import { useTermMarks } from './TermMarks.tsx';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);
const T = catalog.data.templates;
/** 지도 마디 모양이 있는 기능 (중간 서버는 마디가 아니라 굴이라 기능 그림을 쓴다) */
const NODE_SHAPES = new Set(['screen', 'store', 'auth', 'data', 'notify', 'host']);

/** 추천이 2위보다 앞선 점을 한 줄로 (엔진의 compare를 글로 옮김) */
function compareLine(ranking: SlotRanking): string | null {
  const { runnerUp, compare } = ranking;
  if (!runnerUp || !compare) return null;
  // 점수가 같으면 엔진이 무엇으로 갈렸는지 알려 준다 (공식 → 맡는 칸 수 → 난이도 → 이름)
  if (compare.tieBy) return fill(ko.shop.compareTie, { name: runnerUp.product.name, why: ko.shop.tieWhy[compare.tieBy] });
  if (compare.ahead.length === 0) return fill(ko.shop.compareNotRecommended, { name: runnerUp.product.name });
  const labels = compare.ahead.map((k) => {
    const theirs = runnerUp.parts[k] ?? 0;
    const con = (T.conLabels as Record<string, string | undefined>)[k];
    return theirs < 0 && con ? fill(ko.shop.compareCon, { label: T.reasonLabels[k], con }) : T.reasonLabels[k];
  });
  return fill(ko.shop.compare, { name: runnerUp.product.name, labels: labels.join(', ') });
}

/** 이 칸을 채운 상품 중 앞선 칸을 먼저 맡은 상품 (여러 칸을 맡는 상품: '이미 고른 Supabase가 이 기능도 맡아요.') */
function alsoFills(r: EngineResult, ranking: SlotRanking): Product[] {
  const before = r.slots.filter((s) => s.slot.order < ranking.slot.order || (s.slot.order === ranking.slot.order && s.slot.id < ranking.slot.id));
  return r.cart.filter((p) => ranking.filledBy.includes(p.id) && before.some((b) => p.capabilities.includes(b.slot.capability)));
}

/** 줄 둘째 줄: 엔진 꼬리표('0원으로 시작 · 공식 · 실시간')를 글로 잇고 끝에 '난이도 보통'. '처음 쓰기 쉬움'은 난이도와 겹쳐 뺀다 */
function secondLine(p: Product): string {
  return [...badges(catalog, p).filter((b) => b !== T.badges.easy), fill(ko.shop.levelLine, { level: toolDifficultyWord(catalog, p.difficulty) })].join(' · ');
}

/** 추천 줄 셋째 줄의 이유: 둘째 줄이 이미 말한 것('0원으로 시작', '공식', '자주 갱신')은 되풀이하지 않는다 (보여 주기만 거른다) */
function reasonsLine(s: Scored, second: string): string | null {
  const labels = s.reasons.filter((k) => k !== 'official').map((k) => T.reasonLabels[k]).filter((l) => !second.includes(l));
  return labels.length > 0 ? fill(ko.shop.reasonsLine, { labels: labels.join(' · ') }) : null;
}

/** 기능 칩 앞 모양 16: 지도 마디와 같은 모양(표지 묶음의 mk-node-*). 중간 서버는 기능 그림 */
function ChipShape({ capability }: { capability: string }) {
  const href = NODE_SHAPES.has(capability) ? `#mk-node-${capability}` : `#mk-fn-${capability}`;
  return (
    <svg class={NODE_SHAPES.has(capability) ? 'w-shape' : 'w-shape is-line'} viewBox={NODE_SHAPES.has(capability) ? '0 0 28 28' : '0 0 24 24'} aria-hidden="true" focusable="false">
      <use href={href} />
    </svg>
  );
}

/** 한눈에 보기 (brief 6.6): 하는 일·비용·제공·무료 한도·자격·갱신·키 노출 위험·라이선스·용어·막히기 쉬운 곳·확인한 때·공식 문서 */
function Facts({ p, id, hidden, compare }: { p: Product; id: string; hidden: boolean; compare: string | null }) {
  const concepts = (p.needsConcepts ?? []).map((c) => catalog.concept.get(c)).filter((c) => c !== undefined);
  return (
    <dl class="w-facts" id={id} hidden={hidden}>
      <div>
        <dt>{ko.shop.summary}</dt>
        <dd>{p.summary}</dd>
      </div>
      {compare && (
        <div>
          <dt>{ko.shop.compareTitle}</dt>
          <dd>{compare}</dd>
        </div>
      )}
      <div>
        <dt>{ko.shop.cost}</dt>
        <dd>{p.cost.note}</dd>
      </div>
      <div>
        <dt>{ko.shop.provider}</dt>
        <dd>
          {p.provider.name} ({ko.shop.providerWords[p.provider.type]})
        </dd>
      </div>
      {p.freeLimit && (
        <div>
          <dt>{ko.shop.freeLimit}</dt>
          <dd>{p.freeLimit}</dd>
        </div>
      )}
      <div>
        <dt>{ko.shop.access}</dt>
        <dd>{T.accessLabels[p.access]}</dd>
      </div>
      {p.realtime && (
        <div>
          <dt>{ko.shop.realtime}</dt>
          <dd>{ko.shop.realtimeWords[p.realtime]}</dd>
        </div>
      )}
      <div>
        <dt>{ko.shop.keyRisk}</dt>
        <dd>{p.keyExposureRisk ? ko.shop.keyRiskYes : ko.shop.keyRiskNo}</dd>
      </div>
      {p.license && (
        <div>
          <dt>{ko.shop.license}</dt>
          <dd>
            {p.license.name}: {p.license.plain}
          </dd>
        </div>
      )}
      {concepts.length > 0 && (
        <div>
          <dt>{ko.shop.concepts}</dt>
          <dd>
            {concepts.map((c, i) => (
              <>
                {i > 0 && ', '}
                <a href={termPath(c.id)}>{c.title}</a>
              </>
            ))}
          </dd>
        </div>
      )}
      {p.stuck && p.stuck.length > 0 && (
        <div>
          <dt>{ko.shop.stuck}</dt>
          <dd>
            <ul>
              {p.stuck.map((t) => (
                <li>{t}</li>
              ))}
            </ul>
          </dd>
        </div>
      )}
      <div>
        <dt>{ko.shop.checked}</dt>
        <dd class="tabular">{p.checkedAt}</dd>
      </div>
      <div>
        <dt>{ko.shop.links}</dt>
        <dd>
          <ul>
            {p.links.map((l) => (
              <li>
                <a href={l.url} rel="noopener noreferrer" target="_blank">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </dd>
      </div>
    </dl>
  );
}

interface RowProps {
  s: Scored;
  ranking: SlotRanking;
  pressed: boolean;
  saved: boolean;
  more: boolean;
  onPress: (id: string) => void;
  onMore: () => void;
}

/** 도구 줄 72: 눌린 줄은 줄 + '자세히' + 펼친 목록을 한 고름 면(--selected + 안쪽 2px --chosen 고리)으로 감싼다 */
function ToolRow({ s, ranking, pressed, saved, more, onPress, onMore }: RowProps) {
  const p = s.product;
  const isReco = ranking.recommended === s;
  const factsId = `w-facts-${p.id}`;
  const second = secondLine(p);
  const why = isReco ? reasonsLine(s, second) : null;
  return (
    <li class={pressed ? 'w-item is-pressed' : 'w-item'}>
      <button type="button" class="list-row w-row" aria-pressed={pressed} data-product={p.id} onClick={() => onPress(p.id)}>
        <span class="list-tile">
          <Glyph name={slotArt(ranking.slot.capability)} />
        </span>
        <span class="list-text">
          <span class="w-name">
            <span class="list-name">{p.name}</span>
            {isReco && <span class="tag tag-reco">{ko.shop.recommended}</span>}
          </span>
          <span class="list-sub">{second}</span>
          {why && <span class="list-sub">{why}</span>}
        </span>
        {/* 눌림(aria-pressed)만으로는 '고를 예정'과 '정한 도구'가 같게 들린다: 숨은 글로 가르고, ✓는 정한 줄에만 */}
        {saved && <span class="visually-hidden">, {ko.shop.savedMark}</span>}
        {pressed && !saved && <span class="visually-hidden">, {ko.shop.pendingMark}</span>}
        <span class="list-value">{p.cost.free ? ko.shop.costFree : ko.shop.costPaid}</span>
        {saved && <span class="list-check" aria-hidden="true" />}
      </button>
      {pressed && (
        <>
          <button type="button" class="btn btn-text w-more" aria-expanded={more} aria-controls={factsId} onClick={onMore}>
            <span class="visually-hidden">{p.name} </span>
            {ko.shop.details}
            <span class="i-mask i-caret-down w-more-caret" aria-hidden="true" />
          </button>
          <Facts p={p} id={factsId} hidden={!more} compare={isReco ? compareLine(ranking) : null} />
        </>
      )}
    </li>
  );
}

export default function Shop() {
  const ready = useHydrated();
  const live = useStore($result);
  const r = ready ? live : FIRST_VISIT;
  const open = useStore($openSlot);
  const pending = useStore($pending);
  const moves = useStore($slotMoves);
  // 눌린 줄의 '자세히'를 펼쳐 두었는지: 펼친 채 다른 줄을 누르면 그 줄의 목록이 펼쳐져 견주기 쉽다
  const [more, setMore] = useState(false);
  // 칸 설명 글의 어려운 말에 점선 밑줄 (D69, 쉬는 시간에 더한다)
  const mark = useTermMarks();

  // 처음 열 칸: 주소의 ?slot=(도구끼리 맞춰 보기의 '도구 바꾸기') → 고를 수 있는 첫 꼭 고를 것 → 첫 칸
  useEffect(() => {
    if (!ready || $openSlot.get() !== null) return;
    $openSlot.set(initialSlot(r, new URLSearchParams(window.location.search).get('slot')));
  }, [ready]);

  // 여는 칸이 사라지면(다른 탭에서 답을 바꿈) 처음 열 칸으로 다시 정한다
  useEffect(() => {
    if (ready && open !== null && r.done && !rankingOf(r, open)) $openSlot.set(initialSlot(r, null));
  }, [ready, open, r]);

  // 지도에 지금 여는 칸을 알린다 (MapBoard가 그 마디에 --you 고리를 그린다, D68)
  useEffect(() => $mapFocus.set(open), [open]);

  // 주 버튼·건너뛰기로 칸을 옮기면 새 칩과 칸 제목이 보이게 굴린다 (이미 보이면 그대로)
  useEffect(() => {
    if (moves === 0) return;
    const chip = document.querySelector<HTMLElement>('.w-chip[aria-current="true"]');
    chip?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
  }, [moves]);

  const g = gate('waypoints', r);
  // 빌드 때(처음 온 사람)도 잠김을 그린다: 만들 앱을 정하지 않은 사람에게 빈 도구 고르기를 보이지 않게.
  // 빈 상태 하나(빈 터 그림 96 + 한 줄). 주 버튼 [만들 앱 정하러 가기]는 아래 막대 하나뿐이다
  if (!g.open) {
    return (
      <div class="shop" data-ready={ready ? '' : undefined}>
        <div class="empty-state w-locked">
          <ArtTile name="P01" size="hero" class="empty-state-art" />
          <h1 class="empty-state-title">{ko.shop.locked}</h1>
          <p class="empty-state-text">{ko.shop.lockedText}</p>
        </div>
      </div>
    );
  }

  const ranking = rankingOf(r, open);
  const pressed = ranking ? pressedFor(r, ranking, pending) : null;
  const saved = ranking ? savedFor(r, ranking) : null;
  const press = (id: string): void => {
    if (!ranking) return;
    const key = ranking.slot.id;
    // 눌린 줄을 다시 누르면: 있으면 좋은 것은 '고를 예정'을 거둔다(정한 도구가 있으면 그것으로 돌아간다). 꼭 고를 것은 그대로
    if (id === pressed) {
      if (!ranking.slot.required && id !== saved) clearPending(key);
      return;
    }
    if (id === saved) clearPending(key);
    else $pending.set({ ...$pending.get(), [key]: id });
  };
  const sharing = ranking ? alsoFills(r, ranking) : [];
  const row = (s: Scored) =>
    ranking && (
      <ToolRow
        key={s.product.id}
        s={s}
        ranking={ranking}
        pressed={pressed === s.product.id}
        saved={saved === s.product.id}
        more={more}
        onPress={press}
        onMore={() => setMore(!more)}
      />
    );
  const indexPressed = ranking?.index.some((s) => s.product.id === pressed) ?? false;

  return (
    <div class="shop" data-ready={ready ? '' : undefined}>
      <h1>{ko.shop.title}</h1>
      <Lead text={ko.shop.lead} />
      <nav class="w-chips-nav" aria-label={ko.shop.inventory}>
        <ul class="chip-row w-chips">
          {r.slots.map((s) => {
            const filled = s.filledBy.length > 0;
            const here = s.slot.id === open;
            return (
              <li key={s.slot.id}>
                <button
                  type="button"
                  class={`chip w-chip${filled ? ' is-chosen' : ''}`}
                  aria-current={here ? 'true' : undefined}
                  aria-controls="w-slot"
                  onClick={() => $openSlot.set(s.slot.id)}
                >
                  <ChipShape capability={s.slot.capability} />
                  {s.slot.label}
                  <span class="visually-hidden">
                    , {s.slot.required ? ko.shop.required : ko.shop.optional}, {filled ? ko.shop.filled : ko.shop.empty}
                  </span>
                  {here && <span class="w-chip-now" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {ranking && (
        <section class="w-slot" id="w-slot" key={ranking.slot.id} aria-labelledby="w-slot-title">
          <div class="w-slot-head">
            <h2 id="w-slot-title">{slotTitle(ranking.slot.label)}</h2>
            <span class="tag">{ranking.slot.required ? ko.shop.required : ko.shop.optional}</span>
          </div>
          {ranking.slot.help && <p class="w-help">{mark(ranking.slot.help)}</p>}
          {sharing.map((p) => (
            <p class="w-help" key={p.id}>
              {fill(ko.shop.alsoFills, { subj: josa(plainName(p.name), 'subj') })}
            </p>
          ))}
          {/* 눌린 줄이 없으면(있으면 좋은 것, 추천이 없는 칸) 아래 막대의 꺼진 주 버튼이 이 줄을 까닭으로 읽는다. 맞는 도구가 없으면 알림 상자 글이 까닭 */}
          {pressed === null && ranking.shelf.length > 0 && (
            <p class="w-help" id="w-why">
              {ko.shop.pickFirst}
            </p>
          )}
          {ranking.shelf.length === 0 && (
            <p class="alert w-alert">
              <span class="alert-icon">
                <Icon name="help" size="20px" />
              </span>
              <span id="w-why">{ko.shop.noProduct}</span>
            </p>
          )}
          {ranking.shelf.length > 0 && <ul class="list w-list">{ranking.shelf.map(row)}</ul>}
          {ranking.index.length > 0 && (
            <details class="fold w-index" open={indexPressed || undefined}>
              <summary>{fill(ko.shop.indexTitle, { n: ranking.index.length })}</summary>
              <p class="w-index-note">{ko.shop.indexNote}</p>
              <ul class="list w-list">{ranking.index.map(row)}</ul>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
