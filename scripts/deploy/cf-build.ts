// Cloudflare Workers Builds의 빌드 명령 (docs/DEPLOY.md, D72): `npm run build:cf`.
// 단계(PUBLIC_STAGE)에 맞는 자료 검사를 먼저 돌리고 빌드한다. 정식(release)이면 사람 확인이 남은 진열 상품이 없어야 통과한다.
// 배포 명령(npx wrangler deploy)은 Workers Builds가 이어서 돌린다. 이 스크립트는 배포·원격 명령을 쓰지 않는다.
import { execSync } from 'node:child_process';

const release = process.env['PUBLIC_STAGE'] === 'release';
console.log(`단계: ${release ? '정식(release)' : '미리 보기(preview)'}`);
execSync(release ? 'npm run validate:release' : 'npm run validate', { stdio: 'inherit' });
execSync('npm run build', { stdio: 'inherit' });
