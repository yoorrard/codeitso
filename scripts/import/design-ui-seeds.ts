// UI 라이브러리·CSS 프레임워크·애니메이션·차트 라이브러리 씨앗 목록 (손으로 고름).
// 저장소 이름만 적는다. 설명·별·라이선스는 가져올 때 저장소 정보에서 읽고, 없는 저장소는 버린다.
// install은 공식 문서의 설치 명령을 그대로 옮긴 것만 적는다. 나머지는 패키지 등록소에서 찾는다.

export type UiKind = 'ui-libraries' | 'css-frameworks' | 'animation' | 'charts';

export interface Seed { repo: string; kind: UiKind; tags: string[]; install?: string }

const s = (kind: UiKind, tags: string[], repos: (string | [string, string])[]): Seed[] =>
  repos.map((r) => (Array.isArray(r) ? { repo: r[0], kind, tags, install: r[1] } : { repo: r, kind, tags }));

export const SEEDS: Seed[] = [
  // React
  ...s('ui-libraries', ['react', 'tailwind', 'shadcn'], [
    ['shadcn-ui/ui', 'npx shadcn@latest init'], 'magicuidesign/magicui',
    'ibelick/motion-primitives', 'DavidHDev/react-bits', 'tremorlabs/tremor',
  ]),
  ...s('ui-libraries', ['react', 'headless'], [
    'radix-ui/primitives', 'adobe/react-spectrum', 'mui/base-ui', 'ariakit/ariakit', 'tailwindlabs/headlessui', 'chakra-ui/ark',
  ]),
  ...s('ui-libraries', ['react'], [
    'radix-ui/themes', ['mui/material-ui', 'npm install @mui/material @emotion/react @emotion/styled'],
    ['chakra-ui/chakra-ui', 'npm i @chakra-ui/react @emotion/react'], ['mantinedev/mantine', 'npm install @mantine/core @mantine/hooks'],
    'heroui-inc/heroui', ['ant-design/ant-design', 'npm install antd'], 'arco-design/arco-design', 'DouyinFE/semi-design',
    'palantir/blueprint', 'microsoft/fluentui', 'grommet/grommet', 'segmentio/evergreen', 'pinterest/gestalt',
    'react-bootstrap/react-bootstrap', 'reactstrap/reactstrap', 'primefaces/primereact', 'chakra-ui/park-ui', 'rsuite/rsuite',
    'geist-org/geist-ui', 'dip/cmdk', 'emilkowalski/sonner', 'emilkowalski/vaul',
  ]),
  // Tailwind 컴포넌트 묶음
  ...s('ui-libraries', ['tailwind'], [
    ['saadeghi/daisyui', 'npm i -D daisyui@latest'], 'themesberg/flowbite', 'htmlstreamofficial/preline', 'mdbootstrap/TW-Elements',
    'merakiuilabs/merakiui', 'markmead/hyperui', 'franken-ui/ui', 'hunvreus/basecoat',
  ]),
  // Vue
  ...s('ui-libraries', ['vue'], [
    'element-plus/element-plus', 'vuetifyjs/vuetify', 'quasarframework/quasar', 'primefaces/primevue', 'tusen-ai/naive-ui',
    'arco-design/arco-design-vue', 'unovue/reka-ui', 'unovue/shadcn-vue', 'vueComponent/ant-design-vue', 'nuxt/ui',
    'youzan/vant', 'Tencent/tdesign-vue-next', 'buefy/buefy', 'bootstrap-vue/bootstrap-vue',
  ]),
  // Svelte
  ...s('ui-libraries', ['svelte'], [
    'huntabyte/shadcn-svelte', 'huntabyte/bits-ui', 'melt-ui/melt-ui', 'skeletonlabs/skeleton', 'themesberg/flowbite-svelte',
    'carbon-design-system/carbon-components-svelte', 'hperrin/svelte-material-ui',
  ]),
  // Angular
  ...s('ui-libraries', ['angular'], [
    'angular/components', 'NG-ZORRO/ng-zorro-antd', 'taiga-family/taiga-ui', 'spartan-ng/spartan', 'primefaces/primeng',
    'ng-bootstrap/ng-bootstrap', 'valor-software/ngx-bootstrap',
  ]),
  // Solid · Qwik · 웹 컴포넌트
  ...s('ui-libraries', ['solid'], ['kobaltedev/kobalte']),
  ...s('ui-libraries', ['qwik'], ['qwikifiers/qwik-ui']),
  ...s('ui-libraries', ['web-components'], [
    'shoelace-style/shoelace', 'shoelace-style/webawesome', 'ionic-team/ionic-framework', 'material-components/material-web',
    'microsoft/fast', 'carbon-design-system/carbon', 'adobe/spectrum-web-components', 'lit/lit',
  ]),
  // 앱 (React Native · Flutter)
  ...s('ui-libraries', ['react-native'], [
    'GeekyAnts/NativeBase', 'gluestack/gluestack-ui', 'tamagui/tamagui', 'callstack/react-native-paper',
    'react-native-elements/react-native-elements', 'akveo/react-native-ui-kitten', 'founded-labs/react-native-reusables',
    'wix/react-native-ui-lib',
  ]),
  ...s('ui-libraries', ['flutter'], ['nank1ro/flutter-shadcn-ui', 'duobaseio/forui', 'ionicfirebaseapp/getwidget']),

  // CSS 프레임워크와 스타일 도구
  ...s('css-frameworks', ['css'], [
    'tailwindlabs/tailwindcss', 'twbs/bootstrap', 'jgthms/bulma', 'foundation/foundation-sites', 'picocss/pico', 'unocss/unocss',
    'argyleink/open-props', 'kognise/water.css', 'andybrewer/mvp', 'kevquirk/simple.css', 'xz/new.css', 'tachyons-css/tachyons',
    'pure-css/pure', 'milligram/milligram', 'dhg/Skeleton', 'picturepan2/spectre', 'uikit/uikit', 'materializecss/materialize',
    'fomantic/Fomantic-UI', 'nostalgic-css/NES.css', 'jdan/98.css', 'botoxparty/XP.css', 'khang-nd/7.css', 'propjockey/augmented-ui',
    'necolas/normalize.css', 'sindresorhus/modern-normalize', 'tailwindlabs/tailwindcss-typography',
  ]),
  ...s('css-frameworks', ['css-in-js'], [
    'chakra-ui/panda', 'vanilla-extract-css/vanilla-extract', 'styled-components/styled-components', 'emotion-js/emotion',
    'facebook/stylex', 'callstack/linaria', 'nativewind/nativewind',
  ]),

  // 애니메이션
  ...s('animation', ['css'], [
    'animate-css/animate.css', 'IanLunn/Hover', 'miniMAC/magic', 'Wombosch/tw-animate-css', 'jamiebuilds/tailwindcss-animate',
    'ingram-projects/animxyz',
  ]),
  ...s('animation', ['javascript'], [
    'greensock/GSAP', 'motiondivision/motion', 'juliangarnier/anime', 'formkit/auto-animate', 'theatre-js/theatre',
    'darkroomengineering/lenis', 'barbajs/barba', 'michalsnik/aos', 'mattboldt/typed.js', 'maxwellito/vivus', 'mojs/mojs',
    'julianshapiro/velocity', 'Popmotion/popmotion', 'jlmakes/scrollreveal', 'locomotivemtl/locomotive-scroll', 'swup/swup',
    'tengbao/vanta', 'tsparticles/tsparticles', 'VincentGarreau/particles.js', 'shshaw/Splitting', 'lukePeavey/SplitType',
    'metafizzy/zdog', 'graingert/WOW',
  ]),
  ...s('animation', ['lottie'], ['airbnb/lottie-web', 'LottieFiles/dotlottie-web', 'LottieFiles/lottie-react', 'lottie-react-native/lottie-react-native', 'xvrh/lottie-flutter']),
  ...s('animation', ['rive'], ['rive-app/rive-wasm', 'rive-app/rive-react']),
  ...s('animation', ['react'], ['pmndrs/react-spring', 'software-mansion/react-native-reanimated']),
  ...s('animation', ['3d'], ['mrdoob/three.js', 'pmndrs/react-three-fiber', 'pmndrs/drei', 'splinetool/react-spline', 'BabylonJS/Babylon.js']),

  // 차트
  ...s('charts', ['charts'], [
    'recharts/recharts', 'apache/echarts', 'chartjs/Chart.js', 'plouc/nivo', 'airbnb/visx', 'd3/d3', 'apexcharts/apexcharts.js',
    'observablehq/plot', 'vega/vega-lite', 'leeoniya/uPlot', 'FormidableLabs/victory', 'antvis/G2', 'chartist-js/chartist',
    'tremorlabs/tremor', 'mui/mui-x', 'tradingview/lightweight-charts', 'imaNNeo/fl_chart',
  ]),
];

// awesome 목록에서 읽을 부분 (제목 → 종류). 제목 아래 하위 제목까지 포함한다.
export interface AwesomeSource { repo: string; branch: string; tags: string[]; sections: Record<string, UiKind> }

export const AWESOME: AwesomeSource[] = [
  { repo: 'brillout/awesome-react-components', branch: 'master', tags: ['react'], sections: { 'UI Frameworks': 'ui-libraries', 'UI Animation': 'animation', Chart: 'charts' } },
  { repo: 'vuejs/awesome-vue', branch: 'master', tags: ['vue'], sections: { Responsive: 'ui-libraries', Mobile: 'ui-libraries', 'Component Collections': 'ui-libraries' } },
  { repo: 'birobirobiro/awesome-shadcn-ui', branch: 'main', tags: ['shadcn', 'react'], sections: { 'Libs and Components': 'ui-libraries', Animations: 'animation', Ports: 'ui-libraries', 'Design System': 'ui-libraries' } },
  { repo: 'jondot/awesome-react-native', branch: 'master', tags: ['react-native'], sections: { UI: 'ui-libraries', 'Styling & Design Systems': 'ui-libraries', 'Animation & Gestures': 'animation', Charts: 'charts' } },
  { repo: 'Solido/awesome-flutter', branch: 'master', tags: ['flutter'], sections: { Libraries: 'ui-libraries', 'Material Design': 'ui-libraries', Effect: 'animation', Charts: 'charts' } },
  {
    repo: 'PatrickJS/awesome-angular', branch: 'gh-pages', tags: ['angular'],
    sections: { 'UI Libraries': 'ui-libraries', 'UI Libraries built on Bootstrap': 'ui-libraries', 'UI Libraries built on Material': 'ui-libraries', 'UI Libraries built on Tailwind CSS': 'ui-libraries', 'UI Primitives': 'ui-libraries' },
  },
  { repo: 'web-padawan/awesome-web-components', branch: 'main', tags: ['web-components'], sections: { 'Component Libraries': 'ui-libraries' } },
  { repo: 'aniftyco/awesome-tailwindcss', branch: 'master', tags: ['tailwind'], sections: { 'UI libraries, components & templates': 'ui-libraries' } },
];

// GitHub 주제 검색 (gh나 GITHUB_TOKEN이 있을 때만). 별 1000개 이상, 주제마다 별 순 상위 100개.
export const TOPICS: Record<string, { kind: UiKind; tags: string[] }> = {
  'ui-components': { kind: 'ui-libraries', tags: [] },
  'component-library': { kind: 'ui-libraries', tags: [] },
  'ui-library': { kind: 'ui-libraries', tags: [] },
  'ui-kit': { kind: 'ui-libraries', tags: [] },
  'react-components': { kind: 'ui-libraries', tags: ['react'] },
  'vue-components': { kind: 'ui-libraries', tags: ['vue'] },
  'svelte-components': { kind: 'ui-libraries', tags: ['svelte'] },
  'tailwindcss-components': { kind: 'ui-libraries', tags: ['tailwind'] },
  'shadcn-ui': { kind: 'ui-libraries', tags: ['shadcn'] },
  'react-native-ui': { kind: 'ui-libraries', tags: ['react-native'] },
  'css-framework': { kind: 'css-frameworks', tags: ['css'] },
  'animation-library': { kind: 'animation', tags: [] },
  'css-animations': { kind: 'animation', tags: ['css'] },
  'charting-library': { kind: 'charts', tags: [] },
};
