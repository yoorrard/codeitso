// 지금 여는 칸 (docs/MAP.md 5절, D68). 도구 고르기 섬(Shop)이 펼친 칸 id를 넣고, 지도 섬(MapBoard)이 읽어 그 마디에 --you 고리를 그린다.
// 두 섬은 따로 붙지만 같은 모듈을 나눠 쓰므로 이 atom 하나로 이어진다. 저장하지 않는다 (페이지를 떠나면 잊는다).
import { atom } from 'nanostores';

export const $mapFocus = atom<string | null>(null);
