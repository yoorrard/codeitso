// 미리 보기에서 부르는 출처의 공식 CDN (brief 5절, D116). 폰트 견본만 이 호스트에서 지연 로드한다.
// astro.config.mjs의 CSP(style-src·font-src)가 이 목록을 그대로 쓰고, core.ts thumbOf가 이 호스트의 주소만 카드에 싣는다.
// 호스트를 더하면 두 곳이 같이 바뀐다. 추적·광고 호스트는 넣지 않는다.

/** 글꼴 CSS를 주는 곳 (Google Fonts, Fontshare, jsDelivr, 네이버 한글한글 아름답게, Spoqa) */
export const FONT_CSS_HOSTS = ['fonts.googleapis.com', 'api.fontshare.com', 'cdn.jsdelivr.net', 'hangeul.pstatic.net', 'spoqa.github.io'] as const;
/** 글꼴 파일을 주는 곳 (위 CSS가 가리키는 곳 + Fontsource 파일) */
export const FONT_FILE_HOSTS = ['fonts.gstatic.com', 'cdn.fontshare.com', 'cdn.jsdelivr.net', 'hangeul.pstatic.net', 'spoqa.github.io'] as const;

/**
 * 상품 그림 (v5.1 D126): 출처 자료의 그림과 저장소 README의 첫 그림(data/catalog-media, scripts/import/media-readme.ts)은
 * 프로젝트가 올려 둔 곳(raw.githubusercontent.com, github.com/user-attachments, 프로젝트 누리집…)에서 지연 로드한다.
 * 호스트가 저장소마다 달라 CSP img-src는 https: 전체를 연다(그림은 스크립트를 돌리지 못한다, D107). 대신 아래 호스트는 부르지 않는다:
 * 주인 아바타·저장소 소개 카드(무엇을 만드는지 보이지 않는다), 배지·방문 수 세기(추적), 후원 단추, 검색 엔진 파비콘(출처가 아니다).
 */
export const BLOCKED_IMAGE_HOSTS = [
  // 아바타·소개 카드
  'avatars.githubusercontent.com', 'avatars0.githubusercontent.com', 'avatars1.githubusercontent.com', 'avatars2.githubusercontent.com', 'avatars3.githubusercontent.com',
  'opengraph.githubassets.com', 'contributors-img.web.app', 'repository-images.githubusercontent.com', 'gravatar.com', 'www.gravatar.com', 'secure.gravatar.com',
  // 배지·통계 그림
  'img.shields.io', 'shields.io', 'badgen.net', 'flat.badgen.net', 'badge.fury.io', 'travis-ci.org', 'travis-ci.com', 'api.travis-ci.com', 'circleci.com', 'dl.circleci.com', 'codecov.io',
  'coveralls.io', 'ci.appveyor.com', 'app.codacy.com', 'api.codacy.com', 'sonarcloud.io', 'snyk.io', 'img.badgesize.io', 'deepscan.io', 'api.codeclimate.com', 'codeclimate.com',
  'bestpractices.coreinfrastructure.org', 'www.bestpractices.dev', 'app.fossa.com', 'app.fossa.io', 'goreportcard.com', 'pkg.go.dev', 'deps.rs', 'david-dm.org', 'pepy.tech', 'static.pepy.tech',
  'api.securityscorecards.dev', 'forthebadge.com', 'awesome.re', 'cdn.rawgit.com', 'trendshift.io', 'api.producthunt.com', 'readthedocs.org', 'mybinder.org', 'colab.research.google.com',
  'github-readme-stats.vercel.app', 'contrib.rocks', 'api.star-history.com', 'star-history.com', 'starchart.cc', 'repobeats.axiom.co', 'dcbadge.vercel.app', 'dcbadge.limes.pink',
  'invidget.switchblade.xyz', 'discordapp.com', 'discord.com', 'gitter.im', 'badges.gitter.im', 'api.netlify.com', 'www.netlify.com', 'vercel.com', 'deploy.workers.cloudflare.com',
  'railway.app', 'railway.com', 'render.com', 'gitpod.io', 'app.codesee.io', 'wakatime.com', 'www.codefactor.io', 'app.deepsource.com',
  'mirrors.creativecommons.org', 'i.creativecommons.org', 'licensebuttons.net', 'badges.crowdin.net', 'hosted.weblate.org', 'godoc.org', 'saucelabs.com', 'badges.frapsoft.com',
  'api.travis-ci.org', 'secure.travis-ci.org', 'ci.testling.com', 'inch-ci.org', 'dev.azure.com', 'styleci.io', 'jitpack.io', 'npm.packagequality.com', 'tokei.rs', 'run.pstmn.io',
  'caniuse.bitsofco.de', 'ghcr-badge.egpl.dev', 'shieldcn.dev', 'www.herokucdn.com', 'api.hellogithub.com', 'abroad.hellogithub.com', 'www.pikapods.com', 'joss.theoj.org',
  'www.codetriage.com', 'nlnet.nl', 'cdn.worldvectorlogo.com', 'resources.jetbrains.com', 'bit.ly', 'tinyurl.com', 'img.youtube.com',
  // 방문 수 세기 (추적)
  'static.scarf.sh', 'us-central1-trackgit-analytics.cloudfunctions.net', 'komarev.com', 'visitor-badge.laobi.icu', 'visitor-badge.glitch.me', 'hits.seeyoufarm.com', 'hits.sh', 'hits.dwyl.com', 'profile-counter.glitch.me', 'count.getloli.com', 'visitcount.itsvg.in',
  // 후원
  'opencollective.com', 'images.opencollective.com', 'cdn.buymeacoffee.com', 'img.buymeacoffee.com', 'www.buymeacoffee.com', 'ko-fi.com', 'storage.ko-fi.com', 'www.paypalobjects.com',
  'liberapay.com', 'c5.patreon.com', 'polar.sh',
  // 출처가 아닌 파비콘 서비스
  'www.google.com', 'google.com', 't0.gstatic.com', 't1.gstatic.com', 't2.gstatic.com', 't3.gstatic.com', 'icons.duckduckgo.com',
] as const;

/** https 주소의 호스트 (없으면 빈 글자) */
export function hostOf(url: string): string {
  return /^https:\/\//.test(url) ? (url.slice(8).split(/[/?#]/)[0] ?? '').toLowerCase() : '';
}

/** 부르지 않는 그림 주소인가: 막은 호스트, GitHub 배지 경로(…/workflows/…/badge.svg) */
export function blockedImage(url: string): boolean {
  const host = hostOf(url);
  if ((BLOCKED_IMAGE_HOSTS as readonly string[]).includes(host)) return true;
  // 검색 엔진·동영상·SNS 쪽 그림 서버 (출처가 아니고 추적에 쓰인다)
  if (/(^|\.)(google\.com|gstatic\.com|googleusercontent\.com|youtube\.com|ytimg\.com|twimg\.com|doubleclick\.net)$/.test(host)) return true;
  if (host === 'github.com' || host === 'gitlab.com') return /\/(workflows|actions)\/[^?#]*badge|\/badges?\/|badge\.svg/i.test(url);
  return false;
}

/** https 주소의 호스트가 목록에 있으면 그 주소, 아니면 null */
export function allowedUrl(v: unknown, hosts: readonly string[]): string | null {
  if (typeof v !== 'string' || !/^https:\/\/[^\s"'<>()]+$/.test(v)) return null;
  const host = v.slice(8).split(/[/?#]/)[0] ?? '';
  return hosts.includes(host) ? v : null;
}
