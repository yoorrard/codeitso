// Cloudflare Workers Builds의 빌드 명령 (docs/DEPLOY.md, D72): `npm run build:cf`.
// v5: 진열대 자료는 가져오기 때 스키마 시험(tests/import)을 거쳐 커밋되므로 빌드만 한다 (옛 자료 검사 validate는 없앴다, D102).
// 배포 명령(npx wrangler deploy)은 Workers Builds가 이어서 돌린다. 이 스크립트는 배포·원격 명령을 쓰지 않는다.
import { execSync } from 'node:child_process';
import { resolveStage } from '../../src/lib/site-config.ts';

// 빌드 변수나 저장소 설정(src/lib/site-config.ts) 중 하나라도 release면 정식 (D136)
const release = resolveStage(process.env['PUBLIC_STAGE']) === 'release';
console.log(`단계: ${release ? '정식(release)' : '미리 보기(preview)'}`);
execSync('npm run build', { stdio: 'inherit' });
