// 오픈소스·데이터셋·템플릿 진열대의 목차(data/catalog/<대분류>/index.json)를 자료 파일에서 다시 만든다. 네트워크를 쓰지 않는다.
//   node scripts/import/oss-index.ts
import { type CategoryId, main, writeIndex } from './oss-lib.ts';

const CATEGORIES: CategoryId[] = ['opensource', 'datasets', 'templates'];

main(async () => {
  for (const c of CATEGORIES) writeIndex(c);
});
