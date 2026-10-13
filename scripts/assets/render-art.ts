// 렌더 장치 (docs/CONCEPT.md 5.6·9절, T33): 소유자가 준 GLB를 모두 같은 빛·같은 카메라로 구워 투명 PNG를 만든다.
//   npm run art                 assets-src/art/<id>.glb(없으면 .png)를 굽는다 → src/assets/art/<name>.png
//   npm run art -- --only L01   하나만
//   npm run art -- --self-test  절차로 만든 시험용 차를 GLB로 내보내고 다시 구워 본다 (.cache/art-selftest/)
//   npm run art:sheet           구운 그림을 한 장에 나란히 놓은 견본 → .qa/art-sheet.png (빛·색이 맞는지 눈으로 본다)
// 그리기는 컨테이너의 Playwright Chromium(SwiftShader WebGL)과 개발용 three로 한다. 화면에는 three가 실리지 않는다 (floor-guard no-three).
// 그림마다 빛이 다르면 싸 보이므로 조명·카메라·톤은 이 파일과 art-manifest.ts 한 곳에서만 정한다.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import sharp from 'sharp';
import { ROOT } from '../lib/load-data.ts';
import type { ArtItem, ArtOutput } from './art-manifest.ts';
import { ART, AVIF_BUDGET_KB, CAMERA, KEY_LIGHT } from './art-manifest.ts';

const SRC = join(ROOT, 'assets-src', 'art');
const OUT = join(ROOT, 'src', 'assets', 'art');
const SELFTEST = join(ROOT, '.cache', 'art-selftest');
const HOST = 'http://art.local';
const SCALE = 2;

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : undefined;

const TYPES: Record<string, string> = { '.js': 'text/javascript', '.html': 'text/html', '.glb': 'model/gltf-binary', '.png': 'image/png' };

// 브라우저 쪽: 모형을 바닥에 세우고 가운데 맞춘 뒤, 직교 카메라로 틀의 fill만큼 차게 그린다.
const PAGE = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:transparent">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const rad = (d) => (d * Math.PI) / 180;

window.renderArt = async ({ url, width, height, fill, azimuth, elevation, top, key }) => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;

  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;
  model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // 위에서 본 차: glTF의 앞(+Z)이 화면 오른쪽(+X)으로 오게 돌린다
  if (top) model.rotation.y = Math.PI / 2;
  const holder = new THREE.Group();
  holder.add(model);
  scene.add(holder);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
  holder.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(holder);
  const size = fitted.getSize(new THREE.Vector3());
  const radius = size.length() / 2;
  const target = fitted.getCenter(new THREE.Vector3());

  // 카메라: 방위는 앞(+Z)에서 왼쪽(-X)으로 잰다
  const az = rad(azimuth), el = rad(elevation);
  const dir = new THREE.Vector3(-Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, radius * 20);
  cam.position.copy(target).addScaledVector(dir, radius * 6);
  if (top) cam.up.set(0, 0, -1);
  cam.lookAt(target);
  cam.updateMatrixWorld(true);

  // 틀 맞추기: 상자의 여덟 꼭짓점을 카메라 좌표로 옮겨 폭·높이를 잰다
  const inv = cam.matrixWorldInverse;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const x of [fitted.min.x, fitted.max.x]) for (const y of [fitted.min.y, fitted.max.y]) for (const z of [fitted.min.z, fitted.max.z]) {
    const p = new THREE.Vector3(x, y, z).applyMatrix4(inv);
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const aspect = width / height;
  let w = (maxX - minX) / fill, h = (maxY - minY) / fill;
  if (w / h > aspect) h = w / aspect; else w = h * aspect;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  cam.left = cx - w / 2; cam.right = cx + w / 2; cam.top = cy + h / 2; cam.bottom = cy - h / 2;
  cam.updateProjectionMatrix();

  // 열쇠 빛: 화면 왼쪽 위에서, 카메라 쪽으로 조금 기울여. 채움 빛은 약하게
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
  const sa = rad(key.screenAzimuth);
  const keyDir = new THREE.Vector3()
    .addScaledVector(right, Math.sin(sa))
    .addScaledVector(up, Math.cos(sa) * -1 * -1)
    .addScaledVector(dir, Math.cos(rad(key.elevation)))
    .add(new THREE.Vector3(0, Math.sin(rad(key.elevation)), 0))
    .normalize();
  const sun = new THREE.DirectionalLight(0xfff6ea, key.intensity);
  sun.position.copy(target).addScaledVector(keyDir, radius * 6);
  sun.target.position.copy(target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -radius * 2; sc.right = radius * 2; sc.top = radius * 2; sc.bottom = -radius * 2; sc.near = 0.01; sc.far = radius * 20;
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xe8eefc, 0x2a3560, 0.35));

  // 접지 그림자만 받는 바닥 (바닥 자체는 투명)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(radius * 12, radius * 12), new THREE.ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = fitted.min.y - radius * 0.001;
  ground.receiveShadow = true;
  scene.add(ground);

  renderer.render(scene, cam);
  const data = renderer.domElement.toDataURL('image/png');
  renderer.dispose();
  pmrem.dispose();
  return data;
};

// 시험용 차: 남색 몸체, 어두운 유리, 바퀴 넷, 금색 지붕등. 앞은 +Z (glTF 약속)
window.makeSampleGlb = async () => {
  const g = new THREE.Group();
  const navy = new THREE.MeshStandardMaterial({ color: 0x1e2c58, roughness: 0.45, metalness: 0.1 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a2234, roughness: 0.2, metalness: 0.3 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.8 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xf5b700, roughness: 0.35, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 3.2), navy); body.position.y = 0.55; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 1.6), glass); cabin.position.set(0, 1.0, -0.2); g.add(cabin);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 24), gold); lamp.position.set(0, 1.28, -0.2); g.add(lamp);
  for (const [x, z] of [[-0.8, 1.05], [0.8, 1.05], [-0.8, -1.05], [0.8, -1.05]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.25, 32), tire);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.32, z); g.add(w);
  }
  const buf = await new GLTFExporter().parseAsync(g, { binary: true });
  let s = ''; const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};
window.ready = true;
</script></body></html>`;

/** 같은 출처 가짜 주소로 three와 모형 파일을 내준다 (외부 요청 없음) */
async function openPage(models: Map<string, string>): Promise<{ page: Page; close: () => Promise<void> }> {
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error(`브라우저 오류: ${e.message}`));
  await page.route(`${HOST}/**`, async (route: Route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/page.html') return route.fulfill({ body: PAGE, contentType: 'text/html' });
    if (path.startsWith('/three/')) {
      const file = join(ROOT, 'node_modules', path.slice(1));
      if (existsSync(file)) return route.fulfill({ body: readFileSync(file), contentType: TYPES[extname(file)] ?? 'application/octet-stream' });
    }
    const model = models.get(path);
    if (model) return route.fulfill({ body: readFileSync(model), contentType: TYPES['.glb'] });
    return route.fulfill({ status: 404, body: '' });
  });
  await page.goto(`${HOST}/page.html`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true, null, { timeout: 60_000 });
  return { page, close: () => browser.close() };
}

async function renderGlb(page: Page, url: string, o: ArtOutput): Promise<Buffer> {
  const cam = CAMERA[o.view];
  const dataUrl = await page.evaluate(
    (p) => (window as unknown as { renderArt: (x: typeof p) => Promise<string> }).renderArt(p),
    { url, width: o.width * SCALE, height: o.height * SCALE, fill: o.fill, azimuth: cam.azimuth, elevation: cam.elevation, top: o.view === 'top', key: KEY_LIGHT },
  );
  const raw = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  return sharp(raw).resize(o.width, o.height, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer();
}

/** 참고 그림 PNG만 있을 때: 흰 바탕을 가장자리부터 지우고(이미 투명하면 그대로), 잘라서 틀에 맞춘다 */
async function fromPng(file: string, o: ArtOutput): Promise<Buffer> {
  const img = sharp(file).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const opaque = (i: number): boolean => (data[i * 4 + 3] ?? 0) > 250;
  const whiteish = (i: number): boolean => (data[i * 4] ?? 0) >= 245 && (data[i * 4 + 1] ?? 0) >= 245 && (data[i * 4 + 2] ?? 0) >= 245;
  const corners = [0, w - 1, (h - 1) * w, h * w - 1];
  if (corners.every((i) => opaque(i) && whiteish(i))) {
    // 가장자리에서 이어진 흰 칸만 투명하게 (물체 안의 흰색은 남긴다)
    const seen = new Uint8Array(w * h);
    const stack = [...corners];
    while (stack.length > 0) {
      const i = stack.pop() ?? 0;
      if (seen[i] || !whiteish(i)) continue;
      seen[i] = 1;
      data[i * 4 + 3] = 0;
      const x = i % w, y = (i - x) / w;
      if (x > 0) stack.push(i - 1);
      if (x < w - 1) stack.push(i + 1);
      if (y > 0) stack.push(i - w);
      if (y < h - 1) stack.push(i + w);
    }
  }
  const cleaned = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  const trimmed = await sharp(cleaned).trim({ threshold: 1 }).toBuffer();
  const inner = await sharp(trimmed)
    .resize(Math.round(o.width * o.fill), Math.round(o.height * o.fill), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .toBuffer();
  return sharp({ create: { width: o.width, height: o.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: inner, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function bake(items: ArtItem[]): Promise<number> {
  mkdirSync(OUT, { recursive: true });
  const models = new Map<string, string>();
  for (const it of items) {
    const glb = join(SRC, `${it.id}.glb`);
    if (existsSync(glb)) models.set(`/model/${it.id}.glb`, glb);
  }
  const session = models.size > 0 ? await openPage(models) : null;
  let made = 0;
  try {
    for (const it of items) {
      const hasGlb = models.has(`/model/${it.id}.glb`);
      for (const o of it.outputs) {
        let png: Buffer | null = null;
        if (hasGlb && session) png = await renderGlb(session.page, `${HOST}/model/${it.id}.glb`, o);
        else {
          const ref = o.view === 'top' && it.topFallback ? join(SRC, `${it.topFallback}.png`) : join(SRC, `${it.id}.png`);
          if (existsSync(ref)) png = await fromPng(ref, o);
        }
        if (!png) continue;
        writeFileSync(join(OUT, `${o.name}.png`), png);
        made++;
        const avif = await sharp(png).avif({ quality: 60 }).toBuffer();
        const kb = avif.length / 1024;
        const budget = AVIF_BUDGET_KB[o.name] ?? Infinity;
        console.log(`${o.name}.png  ${o.width}×${o.height}  ${hasGlb ? 'GLB' : 'PNG'}  AVIF 약 ${kb.toFixed(1)}KB / ${budget}KB${kb > budget ? '  ← 예산 넘음' : ''}`);
      }
    }
  } finally {
    await session?.close();
  }
  return made;
}

async function selfTest(): Promise<boolean> {
  mkdirSync(SELFTEST, { recursive: true });
  const glbPath = join(SELFTEST, 'S00.glb');
  {
    const s = await openPage(new Map());
    const b64 = await s.page.evaluate(() => (window as unknown as { makeSampleGlb: () => Promise<string> }).makeSampleGlb());
    writeFileSync(glbPath, Buffer.from(b64, 'base64'));
    await s.close();
  }
  const s = await openPage(new Map([['/model/S00.glb', glbPath]]));
  let ok = true;
  try {
    for (const o of [
      { name: 'S00-hero', view: 'hero' as const, width: 288, height: 288, fill: 0.76 },
      { name: 'S00-top', view: 'top' as const, width: 192, height: 192, fill: 0.8 },
    ]) {
      const png = await renderGlb(s.page, `${HOST}/model/S00.glb`, o);
      writeFileSync(join(SELFTEST, `${o.name}.png`), png);
      const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const alpha = (x: number, y: number): number => data[(y * info.width + x) * 4 + 3] ?? 0;
      const cornerClear = alpha(0, 0) === 0 && alpha(info.width - 1, info.height - 1) === 0;
      const centerSolid = alpha(Math.floor(info.width / 2), Math.floor(info.height / 2)) > 200;
      console.log(`${o.name}: 모서리 투명 ${cornerClear ? '예' : '아니요'}, 가운데 물체 ${centerSolid ? '예' : '아니요'}`);
      ok = ok && cornerClear && centerSolid;
    }
  } finally {
    await s.close();
  }
  console.log(ok ? `렌더 장치 시험 통과 (${SELFTEST})` : '렌더 장치 시험 실패');
  return ok;
}

async function sheet(): Promise<void> {
  const files = existsSync(OUT) ? readdirSync(OUT).filter((f) => f.endsWith('.png')) : [];
  const extra = existsSync(SELFTEST) ? readdirSync(SELFTEST).filter((f) => f.endsWith('.png')).map((f) => join(SELFTEST, f)) : [];
  const all = [...files.map((f) => join(OUT, f)), ...extra];
  const cell = (p: string): string => {
    const b64 = readFileSync(p).toString('base64');
    const name = p.slice(p.lastIndexOf('/') + 1);
    return `<figure><img src="data:image/png;base64,${b64}" alt=""><figcaption>${name}</figcaption></figure>`;
  };
  const body = all.length > 0 ? all.map(cell).join('') : '<p>구운 그림이 없다. assets-src/art/에 GLB나 PNG를 넣고 npm run art, 또는 npm run art -- --self-test</p>';
  const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;font:13px sans-serif}.band{display:flex;flex-wrap:wrap;gap:16px;padding:16px;align-items:flex-end}
.day{background:#f4f6f9;color:#111830}.night{background:#0b1020;color:#eef1f7}figure{margin:0}img{display:block;max-width:300px;height:auto}
</style><div class="band day">${body}</div><div class="band night">${body}</div>`;
  mkdirSync(join(ROOT, '.qa'), { recursive: true });
  writeFileSync(join(ROOT, '.qa', 'art-sheet.html'), html);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.setContent(html);
  await page.screenshot({ path: join(ROOT, '.qa', 'art-sheet.png'), fullPage: true });
  await browser.close();
  console.log(`견본: .qa/art-sheet.png (그림 ${all.length}장)`);
}

if (args.includes('--self-test')) {
  process.exit((await selfTest()) ? 0 : 1);
} else if (args.includes('--sheet')) {
  await sheet();
} else {
  const items = only ? ART.filter((a) => a.id === only) : ART;
  if (items.length === 0) {
    console.log(`그림 id '${only}'가 art-manifest.ts에 없다`);
    process.exit(1);
  }
  const made = await bake(items);
  if (made === 0) console.log(`구울 원본이 없다: ${SRC}/<id>.glb 또는 .png (docs/CONCEPT.md 9절 (c)). 화면은 청사진 자리 표시를 쓴다.`);
  else console.log(`그림 ${made}장을 구웠다 → src/assets/art/. 견본은 npm run art:sheet`);
}
