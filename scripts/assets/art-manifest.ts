// 미리 구운 그림 목록 (docs/CONCEPT.md 9절 (c)). 소유자가 assets-src/art/<id>.glb(또는 .png)를 주면
// npm run art가 이 표대로 같은 조명·같은 카메라로 구워 src/assets/art/<name>.png를 만든다.
// 부작용 없는 자료만 둔다 (시험이 그대로 읽는다).

/** hero = 3/4 시점(방위 45° 앞 왼쪽, 고도 35°), top = 위에서 본 모습(고도 90°, 앞이 오른쪽) */
export type ArtView = 'hero' | 'top';

export interface ArtOutput {
  /** src/assets/art/<name>.png */
  name: string;
  view: ArtView;
  /** 실을 그림의 픽셀 크기 (굽기는 2배로 그린 뒤 줄인다) */
  width: number;
  height: number;
  /** 틀 안에서 물체가 차지할 몫 (CONCEPT: 약 76%) */
  fill: number;
}

export interface ArtItem {
  id: string;
  outputs: ArtOutput[];
  /** GLB가 없을 때 위에서 본 그림을 대신할 참고 그림 id (V01 → V01b) */
  topFallback?: string;
}

const building = (id: string): ArtItem => ({ id, outputs: [{ name: id, view: 'hero', width: 288, height: 288, fill: 0.76 }] });

export const ART: ArtItem[] = [
  {
    id: 'V01',
    outputs: [
      { name: 'V01-top', view: 'top', width: 192, height: 192, fill: 0.8 },
      { name: 'V01-hero', view: 'hero', width: 960, height: 540, fill: 0.7 },
    ],
    topFallback: 'V01b',
  },
  building('L01'),
  building('L02'),
  building('L03'),
  building('L04'),
  building('L05'),
  building('L06'),
  {
    id: 'P01',
    outputs: [
      { name: 'P01', view: 'hero', width: 960, height: 540, fill: 0.7 },
      { name: 'P01-square', view: 'hero', width: 240, height: 240, fill: 0.8 },
    ],
  },
];

/** 그림 크기 예산 (KB, 굽고 줄인 PNG가 아니라 Astro가 만든 AVIF 기준. art:sheet가 함께 보인다) */
export const AVIF_BUDGET_KB: Record<string, number> = {
  'V01-top': 8,
  'V01-hero': 45,
  L01: 12,
  L02: 12,
  L03: 12,
  L04: 12,
  L05: 12,
  L06: 12,
  P01: 40,
  'P01-square': 10,
};

/** 카메라 방향 (도). 방위는 물체 앞(+Z)에서 시계 반대로 잰다: 45 = 앞 왼쪽 */
export const CAMERA: Record<ArtView, { azimuth: number; elevation: number }> = {
  hero: { azimuth: 45, elevation: 35 },
  top: { azimuth: 0, elevation: 90 },
};

/** 열쇠 빛: 화면 왼쪽 위(방위 315°), 고도 50°. 그림자가 오른쪽 아래로 떨어져 지도 그림자와 방향이 같다 */
export const KEY_LIGHT = { screenAzimuth: 315, elevation: 50, intensity: 2.4 };
