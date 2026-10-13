// 홈의 주 버튼과 묶음 목록 (brief 6.3, D70). 빌드 때는 처음 온 사람 기준([만들 앱 정하기])으로 그리고,
// 붙은 뒤 저장된 진행이 있으면 주 버튼을 [이어서 가기] + 둘째 줄 '2/4 · 도구 고르기'로 바꾸고, 묶음 목록 맨 위에
// '새로 만들 앱 정하기' 줄을 더한다(확인 대화 상자를 거쳐 답·고른 도구를 비운다).
// 이어 갈 곳은 엔진이 정하므로(continueTarget) 자료 묶음이 필요하다: 저장된 진행이 있을 때만 src/lib/continue.ts를 늦게 불러온다.
// 그래서 처음 온 사람의 첫 화면 JS에는 엔진·자료가 없다. 줄의 그림은 Astro가 빌드 때 SVG 글로 넘긴다.
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import type { ContinueInfo } from '../lib/continue.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { ROUTES } from '../lib/routes.ts';
import { EMPTY_SESSION, hasProgress } from '../lib/saved.ts';
import { $session, patchMeta } from '../lib/store.ts';

interface Props {
  /** 줄 타일 그림 (SVG 글, 장식) */
  icons: { practice: string; tools: string; fresh: string };
  /** '도구 둘러보기' 둘째 줄 (도구 수를 채운 글) */
  toolsSub: string;
}

const H = ko.home;

function Tile({ svg }: { svg: string }) {
  return <span class="list-tile" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function HomeStart({ icons, toolsSub }: Props) {
  const ready = useHydrated();
  const session = useStore($session);
  const confirm = useRef<HTMLDialogElement>(null);
  const freshRow = useRef<HTMLButtonElement>(null);
  const back = ready && hasProgress(session);
  const [info, setInfo] = useState<ContinueInfo | null>(null);

  useEffect(() => {
    if (!back) {
      setInfo(null);
      return;
    }
    let live = true;
    void import('../lib/continue.ts').then((m) => {
      if (live) setInfo(m.continueInfo(session));
    });
    return () => {
      live = false;
    };
  }, [back, session]);

  // 다시 온 손님은 갈 곳을 알 때까지 주 버튼을 감춘다(home.css). 처음 온 사람은 붙자마자 그대로 보인다
  const settled = ready && (!back || info !== null);
  const t = back ? info : null;

  const fresh = (): void => {
    // 빈 상태는 evaluate()를 거쳐도 그대로라 바로 저장한다 (저장한 기록 지우기와 같다)
    $session.set(EMPTY_SESSION);
    // 새로 시작하면 걸린 시간도 새로 잰다. 영수증을 받은 표시도 지금 만드는 앱 기준으로 다시
    patchMeta({ interviewStartedAt: undefined, issued: false });
    window.location.assign(ROUTES.destination);
  };

  /** 대화 상자 뒤 어두운 막을 누르면 닫는다 (그만두기·Esc와 같다) */
  const backdrop = (e: MouseEvent): void => {
    const d = confirm.current;
    if (!d || e.target !== d) return;
    const box = d.getBoundingClientRect();
    if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) d.close();
  };

  return (
    <div class="home-start" data-live={ready ? '' : undefined} data-ready={settled ? '' : undefined}>
      <a class={t ? 'btn btn-primary btn-lg btn-block home-go is-back' : 'btn btn-primary btn-lg btn-block home-go'} href={t ? t.path : ROUTES.destination}>
        {t ? (
          <>
            <span class="home-go-name">{H.continueGo}</span>
            <span class="home-go-sub">{t.where}</span>
          </>
        ) : (
          H.build
        )}
      </a>
      <ul class="list home-links">
        {back && (
          <li>
            <button ref={freshRow} type="button" class="list-row is-tall" aria-haspopup="dialog" onClick={() => confirm.current?.showModal()}>
              <Tile svg={icons.fresh} />
              <span class="list-text">
                <span class="list-name">{H.fresh}</span>
                <span class="list-sub">{H.freshSub}</span>
              </span>
              <span class="list-chev" aria-hidden="true" />
            </button>
          </li>
        )}
        <li>
          <a class="list-row is-tall" href={ROUTES.testDrive}>
            <Tile svg={icons.practice} />
            <span class="list-text">
              <span class="list-name">{H.practice}</span>
              <span class="list-sub">{H.practiceSub}</span>
            </span>
            <span class="list-chev" aria-hidden="true" />
          </a>
        </li>
        <li>
          <a class="list-row is-tall" href={ROUTES.tools}>
            <Tile svg={icons.tools} />
            <span class="list-text">
              <span class="list-name">{H.browse}</span>
              <span class="list-sub">{toolsSub}</span>
            </span>
            <span class="list-chev" aria-hidden="true" />
          </a>
        </li>
      </ul>
      {back && (
        <dialog ref={confirm} class="sheet" aria-labelledby="home-fresh-title" aria-describedby="home-fresh-body" onClose={() => freshRow.current?.focus()} onClick={backdrop}>
          <h2 id="home-fresh-title">{H.freshTitle}</h2>
          <p id="home-fresh-body">{H.freshBody}</p>
          <form method="dialog" class="sheet-actions">
            <button class="btn">{H.freshNo}</button>
            <button class="btn btn-danger" value="fresh" onClick={fresh}>
              {H.freshYes}
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}
