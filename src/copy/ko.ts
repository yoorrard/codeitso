// 화면 고정 문구. 화면 코드에 한국어 문장을 쓰지 않고 여기서 가져다 쓴다 (CLAUDE.md 꼭 지킬 것 5).
// 엔진이 쓰는 문장은 data/templates.json에 있다.
export const ko = {
  site: {
    name: '코드쇼퍼',
    slogan: '어디로 모실까요? 요금은 0원입니다.',
    intro: '코드는 몰라도 됩니다. 목적지만 말하세요.',
  },
  dev: {
    engineCheck: '엔진 점검',
    engineCheckNote: '빌드할 때 판단 엔진이 레시피 하나로 끝까지 도는지 확인하는 임시 화면이에요 (T07에서 지워요).',
    recipe: '레시피',
    slots: '칸',
    conflicts: '충돌',
    canIssue: '영수증 발행 가능',
    yes: '네',
    no: '아니요',
    assetCheck: '그림 자산 점검',
    assetCheckNote: '기사님 그림, 3D 그림 문자, UI 아이콘이 이 사이트 안에서만 불러와지는지 보는 임시 칸이에요.',
  },
  mascot: {
    waveAlt: '남색 제복을 입은 기사님이 태블릿을 들고 손을 흔드는 그림',
  },
} as const;
