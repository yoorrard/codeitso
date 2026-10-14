// 설계도 받기 아래 막대의 주 버튼 하나 (brief 2.1·6.8, D70). 상태 한 줄과 같은 까닭을 말한다:
//   받을 수 있음(내 것·영수증 링크로 연 것): [설계도 내려받기 (.md)] (설계도는 누를 때 엔진 renderPack으로 만든다)
//   만들 앱을 정하기 전: [만들 앱 정하러 가기] · 막힌 곳이 남음: [도구끼리 맞춰 보러 가기] · 깨진 링크: [처음 화면으로]
// 섬의 맨 바깥이 버튼 하나여야 아래 막대 폭을 채운다 (astro-island는 display: contents).
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { $arrivalView, $issuedAt, resultFor } from '../lib/arrival-view.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data.ts';
import { fill, packFileName, renderPack } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $result } from '../lib/result.ts';
import { ROUTES } from '../lib/routes.ts';
import { gate } from '../lib/stages.ts';
import { Icon } from './Icon.tsx';

export default function ArrivalAction() {
  const ready = useHydrated();
  const live = useStore($result);
  const view = useStore($arrivalView);
  const loaded = ready && view.kind !== 'loading';

  const link = (href: string, text: string) => (
    <a class="btn btn-primary ar-go" href={href} data-ready={loaded ? '' : undefined}>
      {text}
    </a>
  );

  // 빌드 때(처음 온 사람)와 영수증 섬이 링크를 읽기 전에는 처음 온 사람의 잠김 (다시 온 손님·영수증 링크는 arrival.css가 감춘다)
  if (!loaded) return link(ROUTES.destination, ko.receipt.toInterview);
  if (view.kind === 'broken') return link(ROUTES.home, ko.receipt.home);
  const r = resultFor(catalog, view, live);
  if (view.kind === 'own' && !gate('arrival', r).open) return r.done ? link(ROUTES.check, ko.receipt.toCheck) : link(ROUTES.destination, ko.receipt.toInterview);

  const download = (): void => {
    const pack = renderPack(catalog, r, { siteUrl: window.location.origin, issuedAt: $issuedAt.get() });
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

  return (
    <button type="button" class="btn btn-primary ar-go" data-ready="" onClick={download}>
      <Icon name="download" />
      <span>{ko.receipt.download}</span>
    </button>
  );
}
