// 상세의 큰 미리 보기 (S3): 상품 종류마다 다르게 보인다. 값은 출처 자료 그대로(src/lib/catalog/preview.ts가 고른다).
//  폰트 = 견본 글꼴(보일 때 출처 CDN에서 받는다) 여러 크기 + 굵기·가변 축·글자 · 색 = 견본 띠 + 흰·검은 바탕 대비 등급, 색 단계표
//  아이콘 = 저장해 둔 견본 SVG · 스타일 = 그 스타일 값으로 칠한 작은 화면 · API = 인증·HTTPS·CORS·무료 한도 배지와 주소
//  MCP = 연결 방식·원격 주소·패키지 · 프롬프트 = 앞부분 · 저장소·모델·데이터셋·템플릿 = 큰 그림(있으면) + 한눈에 칸
import { useEffect } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { paletteColors, safeSvg, thumbOf } from '../lib/catalog/core.ts';
import { apiInfo, colorScales, fontInfo, mcpInfo, statsOf, styleSample, wcagGrade } from '../lib/catalog/preview.ts';
import type { DetailRecord } from '../lib/catalog/types.ts';
import { contrast, isHex, ratio2 } from '../lib/color.ts';
import { watchFonts } from '../lib/font-preview.ts';
import { factLabel } from '../lib/labels.ts';
import { fill } from '../lib/text.ts';
import { Thumb } from './Thumb.tsx';

const WHITE = '#FFFFFF'; // floor-guard-ignore: 색 견본의 대비를 재는 기준 흰색(자료 계산), 화면 색이 아니다
const BLACK = '#000000'; // floor-guard-ignore: 색 견본의 대비를 재는 기준 검은색(자료 계산), 화면 색이 아니다

function Ratio({ hex }: { hex: string }) {
  if (!isHex(hex)) return null;
  const w = ratio2(contrast(hex, WHITE));
  const b = ratio2(contrast(hex, BLACK));
  const g = (r: number): string => ko.pv.color.grade[wcagGrade(r)];
  return (
    <span class="swatch-ratio">
      <span class={`grade is-${wcagGrade(w)}`}>{fill(ko.pv.color.onWhite, { r: w.toFixed(2), g: g(w) })}</span>
      <span class={`grade is-${wcagGrade(b)}`}>{fill(ko.pv.color.onBlack, { r: b.toFixed(2), g: g(b) })}</span>
    </span>
  );
}

function Swatches({ item }: { item: DetailRecord }) {
  const colors = paletteColors(item);
  const scales = colorScales(item);
  if (colors.length === 0) return null;
  return (
    <>
      <ul class="swatches" aria-label={fill(ko.item.colors, { n: colors.length })}>
        {colors.map((c) => (
          <li>
            <span class="swatch" style={{ background: c.hex }} aria-hidden="true" />
            <span class="swatch-text">
              <code>{c.hex.toUpperCase()}</code>
              {c.name && <span>{c.name}</span>}
              <Ratio hex={c.hex} />
            </span>
          </li>
        ))}
      </ul>
      {scales.length > 0 && (
        <div class="scales">
          <h3 class="pv-h">{ko.pv.color.scales}</h3>
          {scales.map((s) => (
            <div class="scale-row">
              <span class="scale-name">{s.name}</span>
              <ul class="scale-steps" aria-label={s.name}>
                {s.steps.map((x) => (
                  <li style={{ background: x.hex }} title={`${s.name} ${x.step} ${x.hex}`}>
                    <span class="visually-hidden">
                      {x.step} {x.hex}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <p class="field-hint">{ko.pv.color.note}</p>
    </>
  );
}

function FontSpecimen({ item }: { item: DetailRecord }) {
  const thumb = thumbOf(item);
  const info = fontInfo(item);
  useEffect(() => watchFonts(), [item.id]);
  if (thumb.t !== 'font' || !info) return null;
  const data = {
    'data-font-family': thumb.family,
    'data-font-generic': thumb.generic,
    'data-font-css': thumb.css,
    'data-font-file': thumb.file,
    'data-font-full': 'true',
  };
  const g = thumb.generic === 'serif' ? 'is-serif' : thumb.generic === 'monospace' ? 'is-mono' : 'is-sans';
  const ko2 = thumb.ko || info.subsets.includes('korean');
  return (
    <>
      <div class={`specimen ${g}`} aria-hidden="true">
        {ko2 && (
          <p class="spec-xl" {...data}>
            {ko.item.fontSampleKo}
          </p>
        )}
        <p class={ko2 ? 'spec-lg' : 'spec-xl'} {...data}>
          {ko.item.fontSampleEn}
        </p>
        <p class="spec-md" {...data}>
          {ko.pv.font.digits}
        </p>
      </div>
      <dl class="pv-facts">
        {info.weights.length > 0 && (
          <>
            <dt>{ko.pv.font.weights}</dt>
            <dd>{info.weights.join(' · ')}</dd>
          </>
        )}
        {info.axes.length > 0 && (
          <>
            <dt>{ko.pv.font.axes}</dt>
            <dd>{info.axes.map((a) => `${a.tag} ${a.min}–${a.max}`).join(' · ')}</dd>
          </>
        )}
        {info.italic && (
          <>
            <dt>{ko.pv.font.italic}</dt>
            <dd>{ko.pv.font.italicYes}</dd>
          </>
        )}
        {info.subsets.length > 0 && (
          <>
            <dt>{ko.pv.font.subsets}</dt>
            <dd>{info.subsets.join(', ')}</dd>
          </>
        )}
        {info.designers.length > 0 && (
          <>
            <dt>{ko.pv.font.designers}</dt>
            <dd>{info.designers.join(', ')}</dd>
          </>
        )}
      </dl>
      {(thumb.css || thumb.file) && <p class="field-hint">{ko.pv.font.note}</p>}
    </>
  );
}

function IconSheet({ item }: { item: DetailRecord }) {
  const p = item.preview;
  const icons = Array.isArray(p['icons']) ? (p['icons'] as unknown[]) : [];
  const w = typeof p['width'] === 'number' ? p['width'] : 24;
  const h = typeof p['height'] === 'number' ? p['height'] : 24;
  const list = icons
    .map((x) => (typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {}))
    .map((x) => ({ name: typeof x['name'] === 'string' ? x['name'] : '', body: safeSvg(x['body'], 3000), w: typeof x['width'] === 'number' ? x['width'] : w }))
    .filter((x): x is { name: string; body: string; w: number } => x.body !== null)
    .slice(0, 24);
  if (list.length === 0) return <Thumb thumb={thumbOf(item, 8)} uid={`detail:${item.id}`} large />;
  const total = typeof p['total'] === 'number' ? p['total'] : list.length;
  return (
    <>
      <ul class="icon-sheet" aria-label={fill(ko.pv.icons.sample, { total, n: list.length })}>
        {list.map((x) => (
          <li title={x.name}>
            <svg viewBox={`0 0 ${x.w} ${h}`} width="32" height="32" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: x.body }} />
            <span class="icon-name">{x.name}</span>
          </li>
        ))}
      </ul>
      <p class="field-hint">{fill(ko.pv.icons.sample, { total, n: list.length })}</p>
    </>
  );
}

function StyleScreen({ item }: { item: DetailRecord }) {
  const s = styleSample(item);
  if (!s) return <Thumb thumb={thumbOf(item)} uid={`detail:${item.id}`} large />;
  const p = item.preview;
  const keywords = Array.isArray(p['keywords']) ? (p['keywords'] as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 8) : [];
  const goodFor = typeof p['goodFor'] === 'string' ? p['goodFor'] : '';
  const box = { borderRadius: s.radius, border: `${s.borderWidth} solid ${s.border}`, boxShadow: s.shadow };
  return (
    <>
      <div class="style-screen" role="img" aria-label={ko.pv.style.label} style={{ background: s.background ?? s.bg, color: s.text, fontFamily: s.font }}>
        <div class="style-card" style={{ ...box, background: s.surface }}>
          <p class="style-title" style={{ fontWeight: s.headingWeight }}>
            {ko.pv.style.title}
          </p>
          <p class="style-body">{ko.pv.style.body}</p>
          <p class="style-muted" style={{ color: s.muted }}>
            {ko.pv.style.muted}
          </p>
          <div class="style-acts">
            <span class="style-btn" style={{ background: s.primary, color: s.onPrimary, borderRadius: s.radius }}>
              {ko.pv.style.button}
            </span>
            <span class="style-chip" style={{ border: `${s.borderWidth} solid ${s.accent}`, color: s.accent, borderRadius: s.radius }}>
              {ko.pv.style.chip}
            </span>
          </div>
        </div>
      </div>
      <dl class="pv-facts">
        {goodFor && (
          <>
            <dt>{ko.pv.style.goodFor}</dt>
            <dd>{goodFor}</dd>
          </>
        )}
        {keywords.length > 0 && (
          <>
            <dt>{ko.pv.style.keywords}</dt>
            <dd>{keywords.join(', ')}</dd>
          </>
        )}
      </dl>
      <p class="field-hint">{ko.pv.style.note}</p>
    </>
  );
}

function ApiPanel({ item }: { item: DetailRecord }) {
  const a = apiInfo(item);
  if (!a) return null;
  return (
    <div class="api-panel">
      <h3 class="pv-h">{ko.pv.api.title}</h3>
      <ul class="badges">
        {a.auth && (
          <li class="badge">
            <span class="badge-k">{ko.pv.api.auth}</span>
            {factLabel({ k: 'auth', v: a.auth })}
          </li>
        )}
        {a.https !== undefined && (
          <li class={`badge${a.https ? ' is-good' : ''}`}>
            <span class="badge-k">{ko.pv.api.https}</span>
            {a.https ? ko.pv.api.yes : ko.pv.api.no}
          </li>
        )}
        {(a.cors === 'yes' || a.cors === 'no') && (
          <li class={`badge${a.cors === 'yes' ? ' is-good' : ''}`}>
            <span class="badge-k">{ko.pv.api.cors}</span>
            {a.cors === 'yes' ? ko.pv.api.yes : ko.pv.api.no}
          </li>
        )}
        {a.freeQuote && <li class="badge is-good">{ko.pv.api.freeBadge}</li>}
      </ul>
      {a.freeQuote && (
        <figure class="free-quote">
          <blockquote lang="en">{a.freeQuote}</blockquote>
          <figcaption>
            {a.freeCheckedAt && fill(ko.pv.api.freeChecked, { date: a.freeCheckedAt })}{' '}
            {a.pricingUrl && (
              <a href={a.pricingUrl} target="_blank" rel="noopener noreferrer">
                {ko.pv.api.pricing}
              </a>
            )}
          </figcaption>
        </figure>
      )}
      {a.keyServerSide && <p class="notice">{ko.pv.api.keyServer}</p>}
      <dl class="pv-facts">
        {a.provider && (
          <>
            <dt>{ko.pv.api.provider}</dt>
            <dd>{a.provider}</dd>
          </>
        )}
        {a.category && (
          <>
            <dt>{ko.pv.api.category}</dt>
            <dd>{a.category}</dd>
          </>
        )}
        {a.apiBase && (
          <>
            <dt>{ko.pv.api.base}</dt>
            <dd>
              <code>{a.apiBase}</code>
            </dd>
          </>
        )}
        {a.env.length > 0 && (
          <>
            <dt>{ko.pv.api.env}</dt>
            <dd>
              <code>{a.env.join(', ')}</code>
            </dd>
          </>
        )}
        {(a.modelCount !== undefined || a.models.length > 0) && (
          <>
            <dt>{ko.pv.api.models}</dt>
            <dd>{[a.modelCount !== undefined ? fill(ko.pv.api.modelsN, { n: a.modelCount }) : '', a.models.join(', ')].filter(Boolean).join(' · ')}</dd>
          </>
        )}
        {a.formats.length > 0 && (
          <>
            <dt>{ko.pv.api.formats}</dt>
            <dd>{a.formats.join(', ')}</dd>
          </>
        )}
        {a.sdk && (
          <>
            <dt>{ko.pv.api.sdk}</dt>
            <dd>
              <code>{a.sdk}</code>
            </dd>
          </>
        )}
        {a.openapi && (
          <>
            <dt>{ko.pv.api.spec}</dt>
            <dd>
              <a href={a.openapi} target="_blank" rel="noopener noreferrer">
                {a.openapi.replace(/^https:\/\//, '')}
              </a>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

function McpPanel({ item }: { item: DetailRecord }) {
  const m = mcpInfo(item);
  if (!m) return null;
  const facts = [...new Set(m.transports.map((t) => (t === 'stdio' ? factLabel({ k: 'transport', v: 'stdio' }) : t)))];
  return (
    <div class="api-panel">
      <h3 class="pv-h">{ko.pv.mcp.title}</h3>
      {facts.length > 0 && (
        <ul class="badges">
          {facts.map((f) => (
            <li class="badge">
              <span class="badge-k">{ko.pv.mcp.transports}</span>
              {f}
            </li>
          ))}
        </ul>
      )}
      {m.requiresKey && <p class="notice">{ko.pv.mcp.key}</p>}
      <dl class="pv-facts">
        {m.registry && (
          <>
            <dt>{ko.pv.mcp.registry}</dt>
            <dd>
              <code>{m.registry}</code>
            </dd>
          </>
        )}
        {m.remotes.length > 0 && (
          <>
            <dt>{ko.pv.mcp.remote}</dt>
            <dd>
              {m.remotes.map((u) => (
                <code class="pv-line">{u}</code>
              ))}
            </dd>
          </>
        )}
        {m.packages.length > 0 && (
          <>
            <dt>{ko.pv.mcp.packages}</dt>
            <dd>
              {m.packages.map((u) => (
                <code class="pv-line">{u}</code>
              ))}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

function PromptPanel({ item }: { item: DetailRecord }) {
  const p = item.preview;
  const excerpt = typeof p['excerpt'] === 'string' ? p['excerpt'] : item.summary;
  const author = typeof p['author'] === 'string' ? p['author'] : '';
  const file = typeof p['file'] === 'string' ? p['file'] : '';
  return (
    <div class="prompt-panel">
      <h3 class="pv-h">{ko.pv.prompt.excerpt}</h3>
      <blockquote class="prompt-quote">{excerpt}</blockquote>
      <dl class="pv-facts">
        {author && (
          <>
            <dt>{ko.pv.prompt.author}</dt>
            <dd>{author}</dd>
          </>
        )}
        {file && (
          <>
            <dt>{ko.pv.prompt.file}</dt>
            <dd>
              <code>{file}</code>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

function Stats({ item }: { item: DetailRecord }) {
  const stats = statsOf(item);
  if (stats.length === 0) return null;
  return (
    <dl class="stat-tiles">
      {stats.map(([k, v]) => (
        <div class="stat">
          <dt>{ko.pv.stats[k]}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DetailPreview({ item }: { item: DetailRecord }) {
  const type = item.preview.type;
  const thumb = thumbOf(item, 8, true);
  const fromReadme = thumb.t === 'img' && thumb.src === item.preview['readmeImage'];
  let body;
  switch (type) {
    case 'font':
      body = <FontSpecimen item={item} />;
      break;
    case 'palette':
      body = (
        <>
          <Thumb thumb={thumb} uid={`detail:${item.id}`} large />
          <Swatches item={item} />
        </>
      );
      break;
    case 'icons':
      body = thumb.t === 'img' ? <Thumb thumb={thumb} uid={`detail:${item.id}`} large /> : <IconSheet item={item} />;
      break;
    case 'style':
      body = <StyleScreen item={item} />;
      break;
    case 'api':
      body = (
        <>
          {thumb.t === 'img' && <Thumb thumb={thumb} uid={`detail:${item.id}`} large />}
          <ApiPanel item={item} />
        </>
      );
      break;
    case 'mcp':
      body = (
        <>
          {thumb.t === 'img' && <Thumb thumb={thumb} uid={`detail:${item.id}`} large />}
          <McpPanel item={item} />
        </>
      );
      break;
    case 'prompt':
      body = <PromptPanel item={item} />;
      break;
    default:
      body = (
        <>
          <Thumb thumb={thumb} uid={`detail:${item.id}`} large />
          <Stats item={item} />
        </>
      );
  }
  return (
    <section class={`detail-preview pv-${type}`} aria-labelledby="pv-title" data-cat={item.category}>
      <h2 id="pv-title" class="visually-hidden">
        {ko.item.preview}
      </h2>
      {body}
      {thumb.t === 'scene' && <p class="field-hint">{ko.pv.sceneNote}</p>}
      {thumb.t === 'img' && <p class="field-hint">{fromReadme ? `${ko.pv.readmeNote} ${ko.item.externalNote}` : ko.item.externalNote}</p>}
    </section>
  );
}
