// 자료 검사: 스키마 검사 + 파일끼리 맞물리는지 검사. 하나라도 틀리면 배포하지 않는다.
//   node scripts/validate-data.ts            개발용 (확인 필요 상품은 경고만)
//   node scripts/validate-data.ts --release  배포용 (진열 상품에 needsReview가 남아 있으면 실패)
// 검사 내용은 scripts/lib/validate.ts (Vitest도 같은 것을 부른다).
import { loadValidationInput } from './lib/load-data.ts';
import { validateAll } from './lib/validate.ts';

const release = process.argv.includes('--release');
const { errors, warnings } = validateAll(loadValidationInput(release));

for (const w of warnings) console.log(`경고  ${w}`);
for (const e of errors) console.log(`오류  ${e}`);
if (errors.length > 0) {
  console.log(`\n자료 검사 실패: 오류 ${errors.length}개, 경고 ${warnings.length}개`);
  process.exit(1);
}
console.log(`\n자료 검사 통과${release ? ' (배포용)' : ''}: 경고 ${warnings.length}개`);
