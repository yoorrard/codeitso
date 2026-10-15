// 카드·상세에 붙는 이름표 글 (자료 값 → 화면 말). 순수 함수, 문구는 ko.ts.
import { ko } from '../copy/ko.ts';
import { formatCount } from './catalog/core.ts';
import type { FacetKey } from './catalog/facets.ts';
import type { Fact, Metric } from './catalog/types.ts';
import type { IconName } from './icons.ts';

/** 사실 하나를 짧은 글로 (인증 방식은 아는 꼴만 바꾸고 나머지는 원문) */
export function factLabel(f: Fact): string {
  const v = f.v ?? '';
  switch (f.k) {
    case 'auth':
      if (/^(none|no)$/i.test(v)) return ko.facts.authNone;
      if (/oauth/i.test(v)) return ko.facts.authOAuth;
      if (/^(apikey|api key|key|x-mashape-key|user-agent)$/i.test(v)) return ko.facts.authKey;
      return v.length > 18 ? `${v.slice(0, 17)}…` : v;
    case 'https':
      return ko.facts.https;
    case 'cors':
      return ko.facts.cors;
    case 'free':
      return ko.facts.free;
    case 'transport':
      return v === 'stdio' ? ko.facts.stdio : ko.facts.remote;
    default:
      return v.length > 22 ? `${v.slice(0, 21)}…` : v;
  }
}

export const METRIC_ICON: Record<Metric['kind'], IconName> = { stars: 'star', downloads: 'download', likes: 'heart' };

/** '스타 1.2만' 같은 글 (화면 낭독기용 전체 이름) */
export function metricText(m: Metric): string {
  return `${ko.card.metric[m.kind]} ${formatCount(m.value)}`;
}

/** 거르기 값 이름표: 아는 값(인증·CORS·글꼴 모양…)만 바꾸고 나머지는 출처 자료 그대로 */
export function facetValueLabel(k: FacetKey, v: string): string {
  return ko.facets.values[k]?.[v] ?? v;
}
