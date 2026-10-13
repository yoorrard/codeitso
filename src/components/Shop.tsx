// 경유지 섬 (T09, docs/CONCEPT.md 6.4): 고를 것 목록 → 하나씩 펼쳐 추천·다른 도구·원문만 있는 도구를 보고 고른다.
// 점수·추천·이유·다른 후보 비교·꼬리표는 모두 엔진 결과(evaluate, badges). 화면은 글로 옮겨 보여 주기만 한다.
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data.ts';
import type { EngineResult, Scored, SlotRanking } from '../lib/engine/index.ts';
import { badges, evaluate, fill } from '../lib/engine/index.ts';
import type { Product } from '../lib/engine/types.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { josa } from '../lib/josa.ts';
import { flip } from '../lib/motion.ts';
import { SLOT_ART } from '../lib/option-art.ts';
import { $result, updateSession } from '../lib/result.ts';
import { EMPTY_SESSION } from '../lib/saved.ts';
import { sfx } from '../lib/sfx.ts';
import { ROUTES, termPath } from '../lib/routes.ts';
import { gate } from '../lib/stages.ts';
import { Icon } from './Icon.tsx';
import { DispatchNote } from './DispatchNote.tsx';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);
const T = catalog.data.templates;

/** 칸 그림은 칸의 기능으로 고른다 (칸 id는 'slot.screen'처럼 점이 들어 있다) */
function slotArt(capability: string): string {
  return SLOT_ART[capability] ?? 'tools';
}

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

/** 이 칸을 채운 상품 중 앞선 칸을 먼저 맡은 상품 (여러 칸을 맡는 상품 표시) */
function alsoFills(r: EngineResult, ranking: SlotRanking): Product[] {
  const before = r.slots.filter((s) => s.slot.order < ranking.slot.order || (s.slot.order === ranking.slot.order && s.slot.id < ranking.slot.id));
  return r.cart.filter((p) => ranking.filledBy.includes(p.id) && before.some((b) => p.capabilities.includes(b.slot.capability)));
}

interface CardProps {
  s: Scored;
  slotId: string;
  capability: string;
  inCart: boolean;
  recommended: boolean;
  compare: string | null;
  onToggle: (p: Product, from: HTMLElement | null) => void;
}

function ProductCard({ s, slotId, capability, inCart, recommended, compare, onToggle }: CardProps) {
  const p = s.product;
  const thumb = useRef<HTMLImageElement>(null);
  const concepts = (p.needsConcepts ?? []).map((id) => catalog.concept.get(id)).filter((c) => c !== undefined);
  const stars = ko.shop.stars.repeat(p.difficulty) + ko.shop.starsOff.repeat(3 - p.difficulty);
  return (
    <article class={`product${recommended ? ' product-top' : ''}${inCart ? ' in-cart' : ''}`} aria-labelledby={`p-${slotId}-${p.id}`}>
      <header class="product-head">
        <img ref={thumb} class="product-thumb" src={`/emoji/${slotArt(capability)}.webp`} width={40} height={40} alt="" />
        <div>
          {recommended && <span class="badge badge-top">{ko.shop.recommended}</span>}
          <h3 id={`p-${slotId}-${p.id}`}>{p.name}</h3>
          <p class="product-summary">{p.summary}</p>
        </div>
      </header>
      <ul class="badge-row">
        {badges(catalog, p).map((b) => (
          <li class="badge">{b}</li>
        ))}
      </ul>
      <dl class="product-facts">
        {p.useWhen && (
          <>
            <dt>{ko.shop.useWhen}</dt>
            <dd>{p.useWhen}</dd>
          </>
        )}
        <dt>{ko.shop.cost}</dt>
        <dd>{p.cost.note}</dd>
        <dt>{ko.shop.difficulty}</dt>
        <dd>
          <span aria-hidden="true" class="stars">
            {stars}
          </span>
          <span class="visually-hidden">{fill(ko.shop.difficultyText, { n: p.difficulty })}</span>
        </dd>
        {s.reasons.length > 0 && (
          <>
            <dt>{ko.shop.reasons}</dt>
            <dd>
              <ul class="chips">
                {s.reasons.map((k) => (
                  <li class="chip">{T.reasonLabels[k]}</li>
                ))}
              </ul>
            </dd>
          </>
        )}
      </dl>
      {compare && <p class="compare-line">{compare}</p>}
      <details class="product-more">
        <summary>{ko.shop.details}</summary>
        <dl class="product-facts">
          <dt>{ko.shop.provider}</dt>
          <dd>
            {p.provider.name} ({ko.shop.providerWords[p.provider.type]})
          </dd>
          <dt>{ko.shop.access}</dt>
          <dd>{T.accessLabels[p.access]}</dd>
          {p.freeLimit && (
            <>
              <dt>{ko.shop.freeLimit}</dt>
              <dd>{p.freeLimit}</dd>
            </>
          )}
          {p.realtime && (
            <>
              <dt>{ko.shop.realtime}</dt>
              <dd>{ko.shop.realtimeWords[p.realtime]}</dd>
            </>
          )}
          <dt>{ko.shop.keyRisk}</dt>
          <dd>{p.keyExposureRisk ? ko.shop.keyRiskYes : ko.shop.keyRiskNo}</dd>
          {p.license && (
            <>
              <dt>{ko.shop.license}</dt>
              <dd>
                {p.license.name}: {p.license.plain}
              </dd>
            </>
          )}
          {concepts.length > 0 && (
            <>
              <dt>{ko.shop.concepts}</dt>
              <dd>
                {concepts.map((c, i) => (
                  <>
                    {i > 0 && ', '}
                    <a href={termPath(c.id)}>{c.title}</a>
                  </>
                ))}
              </dd>
            </>
          )}
          {p.promptFragment && (
            <>
              <dt>{ko.shop.fragment}</dt>
              <dd class="fragment">{p.promptFragment}</dd>
            </>
          )}
          {p.stuck && p.stuck.length > 0 && (
            <>
              <dt>{ko.shop.stuck}</dt>
              <dd>
                <ul>
                  {p.stuck.map((t) => (
                    <li>{t}</li>
                  ))}
                </ul>
              </dd>
            </>
          )}
          <dt>{ko.shop.checked}</dt>
          <dd>{p.checkedAt}</dd>
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
        </dl>
      </details>
      <button
        type="button"
        class={inCart ? 'btn' : 'btn btn-primary'}
        aria-label={fill(inCart ? ko.shop.removeLabel : ko.shop.addLabel, { name: p.name })}
        onClick={() => onToggle(p, thumb.current)}
      >
        <Icon name={inCart ? 'close' : 'download'} />
        <span>{inCart ? ko.shop.remove : ko.shop.add}</span>
      </button>
    </article>
  );
}

export default function Shop() {
  const ready = useHydrated();
  const live = useStore($result);
  const r = ready ? live : FIRST_VISIT;
  const [open, setOpen] = useState<string | null>(null);
  const inventory = useRef<HTMLUListElement>(null);

  const required = r.slots.filter((s) => s.slot.required);
  const allRequired = required.length > 0 && required.every((s) => s.filledBy.length > 0);

  // 처음 펼칠 것: 주소의 ?slot=(점검의 '도구 바꾸기'), 아직 고르지 않은 첫 꼭 고를 것, 첫 것 순
  useEffect(() => {
    if (!ready || open !== null) return;
    const asked = new URLSearchParams(window.location.search).get('slot');
    const first = r.slots.find((s) => s.slot.id === asked) ?? r.slots.find((s) => s.slot.required && s.filledBy.length === 0) ?? r.slots[0];
    if (first) setOpen(first.slot.id);
  }, [ready]);

  const g = gate('waypoints', r);
  // 빌드 때(처음 온 사람)도 못 가는 안내를 그린다: 목적지를 정하지 않은 사람에게 빈 경유지를 보이지 않게
  if (!g.open) {
    return (
      <section class="q-card" aria-labelledby="shop-locked">
        <h1 id="shop-locked">{ko.shop.locked}</h1>
        <a class="btn btn-primary" href={ROUTES.destination}>
          {ko.shop.toInterview}
        </a>
      </section>
    );
  }

  const toggle = (ranking: SlotRanking) => (p: Product, from: HTMLElement | null): void => {
    const inCart = r.session.cart.includes(p.id);
    if (inCart) {
      updateSession((s) => ({ cart: s.cart.filter((id) => id !== p.id) }));
      announce(fill(ko.shop.removed, { obj: josa(p.name, 'obj') }));
      return;
    }
    const target = inventory.current?.querySelector<HTMLElement>(`[data-slot="${CSS.escape(ranking.slot.id)}"] .inv-icon`);
    // M3: 상자가 칸으로 날아가(--dur-fly) 닿으면 칸이 한 번 통통
    if (from && target)
      void flip(from, target, { dur: '--dur-fly' }).then(() => {
        const slot = target.closest('li');
        slot?.classList.remove('bump');
        void slot?.getBoundingClientRect();
        slot?.classList.add('bump');
      });
    updateSession((s) => ({ cart: [...s.cart, p.id] }));
    void sfx('add');
    const after = $result.get();
    // 남은 일을 바로 말한다 (CONCEPT 3.2): '○○ 골랐어요. 꼭 고를 것이 n개 남았어요.' 다 골랐으면 점검으로
    const left = after.slots.filter((s) => s.slot.required && s.filledBy.length === 0).length;
    const next = left > 0 ? fill(ko.shop.requiredLeft, { n: left }) : ko.shop.allRequired;
    announce(`${fill(ko.shop.added, { obj: josa(p.name, 'obj') })} ${next}`);
  };

  return (
    <div class="shop">
      <h1>{ko.shop.title}</h1>
      <DispatchNote text={ko.dispatch.waypoints} />
      <nav aria-label={ko.shop.inventory}>
        <ul class="inventory" ref={inventory}>
          {r.slots.map((s) => {
            const filled = s.filledBy.length > 0;
            return (
              <li data-slot={s.slot.id} class={filled ? 'filled' : ''}>
                <button type="button" aria-expanded={open === s.slot.id} aria-controls={`slot-${s.slot.id}`} onClick={() => setOpen(open === s.slot.id ? null : s.slot.id)}>
                  <span class="inv-icon">
                    <img src={`/emoji/${slotArt(s.slot.capability)}.webp`} width={36} height={36} alt="" />
                    {filled && (
                      <span class="done-mark" aria-hidden="true">
                        <Icon name="check" size="14px" />
                      </span>
                    )}
                  </span>
                  <span class="inv-label">{s.slot.label}</span>
                  <span class="visually-hidden">
                    ({s.slot.required ? ko.shop.required : ko.shop.optional}, {filled ? ko.shop.filled : ko.shop.empty})
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {r.slots.map((ranking) => {
        const id = ranking.slot.id;
        const isOpen = open === id;
        const others = ranking.shelf.filter((s) => s !== ranking.recommended);
        const sharing = alsoFills(r, ranking);
        const compare = compareLine(ranking);
        return (
          <section class={`slot-panel${isOpen ? ' open' : ''}`} id={`slot-${id}`} aria-labelledby={`slot-title-${id}`} hidden={!isOpen}>
            <header class="slot-head">
              <img src={`/emoji/${slotArt(ranking.slot.capability)}.webp`} width={48} height={48} alt="" />
              <div>
                <h2 id={`slot-title-${id}`}>
                  {ranking.slot.label} <span class={ranking.slot.required ? 'badge' : 'badge badge-soft'}>{ranking.slot.required ? ko.shop.required : ko.shop.optional}</span>
                </h2>
                {ranking.slot.help && <p class="q-help">{ranking.slot.help}</p>}
              </div>
            </header>
            {ranking.filledBy.length > 0 && (
              <p class="in-cart-line">
                <Icon name="check" /> {ko.shop.inCart}: {ranking.filledBy.map((pid) => catalog.product.get(pid)?.name ?? pid).join(', ')}
              </p>
            )}
            {sharing.map((p) => (
              <p class="share-line">{fill(ko.shop.alsoFills, { name: p.name })}</p>
            ))}
            {ranking.shelf.length === 0 && <p class="empty-line">{ko.shop.noProduct}</p>}
            {ranking.recommended && (
              <ProductCard
                s={ranking.recommended}
                slotId={id}
                capability={ranking.slot.capability}
                inCart={r.session.cart.includes(ranking.recommended.product.id)}
                recommended
                compare={compare}
                onToggle={toggle(ranking)}
              />
            )}
            {others.map((s) => (
              <ProductCard s={s} slotId={id} capability={ranking.slot.capability} inCart={r.session.cart.includes(s.product.id)} recommended={false} compare={null} onToggle={toggle(ranking)} />
            ))}
            {ranking.index.length > 0 && (
              <details class="index-list">
                <summary>
                  <Icon name="warning" /> {fill(ko.shop.indexTitle, { n: ranking.index.length })}
                </summary>
                <p class="q-help">{ko.shop.indexNote}</p>
                {ranking.index.map((s) => (
                  <ProductCard s={s} slotId={id} capability={ranking.slot.capability} inCart={r.session.cart.includes(s.product.id)} recommended={false} compare={null} onToggle={toggle(ranking)} />
                ))}
              </details>
            )}
          </section>
        );
      })}
      {ready && allRequired && <p class="all-required">{ko.shop.allRequired}</p>}
    </div>
  );
}
