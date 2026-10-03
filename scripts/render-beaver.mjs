import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const sourcePath = path.join(root, 'src', 'mapHtml.ts');
const outDir = path.join(root, 'artifacts', 'beaver-validation');

await fs.mkdir(outDir, { recursive: true });

const source = await fs.readFile(sourcePath, 'utf8');
const startMarker = '// BEAVER_MODEL_START';
const endMarker = '// BEAVER_MODEL_END';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker);

if (start < 0 || end < 0 || end <= start) {
  throw new Error('Could not find BEAVER_MODEL_START / BEAVER_MODEL_END in src/mapHtml.ts');
}

const modelSource = source.slice(start + startMarker.length, end);

const html =
'<!doctype html>\n' +
'<html><head><meta charset="utf-8" />' +
'<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#f4f1ec}#stage{width:720px;height:720px}</style>' +
'</head><body><div id="stage"></div>' +
'<script src="https://unpkg.com/three@0.160.0/build/three.min.js"><' + '/script>' +
'<script>\n' +
modelSource +
'\nconst WIDTH=720,HEIGHT=720;' +
'\nconst scene=new THREE.Scene(); scene.background=new THREE.Color(0xf4f1ec);' +
'\nconst camera=new THREE.PerspectiveCamera(32,WIDTH/HEIGHT,0.01,100); camera.position.set(0,1.25,4.8); camera.lookAt(0,1.05,0);' +
'\nconst renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});' +
'\nrenderer.setPixelRatio(1.5); renderer.setSize(WIDTH,HEIGHT); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.02; renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;' +
'\ndocument.getElementById("stage").appendChild(renderer.domElement);' +
'\nconst hemi=new THREE.HemisphereLight(0xfff7ec,0x576376,1.75); scene.add(hemi);' +
'\nconst key=new THREE.DirectionalLight(0xfff0dc,2.8); key.position.set(-3.5,6.5,5.0); key.castShadow=true; key.shadow.mapSize.set(2048,2048); scene.add(key);' +
'\nconst fill=new THREE.DirectionalLight(0xd8e8ff,1.25); fill.position.set(4.0,3.5,4.5); scene.add(fill);' +
'\nconst rim=new THREE.DirectionalLight(0xc8b8ff,1.35); rim.position.set(3.0,4.0,-4.5); scene.add(rim);' +
'\nconst floor=new THREE.Mesh(new THREE.CircleGeometry(2.1,64),new THREE.MeshStandardMaterial({color:0xebe5dc,roughness:1})); floor.rotation.x=-Math.PI/2; floor.position.y=0.02; floor.receiveShadow=true; scene.add(floor);' +
'\nconst beaver=createBeaver3D(); if(beaver.userData.beacon) beaver.userData.beacon.visible=false;' +
'\nbeaver.traverse((node)=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}}); scene.add(beaver);' +
'\nconst box=new THREE.Box3().setFromObject(beaver); const size=new THREE.Vector3(); const center=new THREE.Vector3(); box.getSize(size); box.getCenter(center);' +
'\nbeaver.position.x-=center.x; beaver.position.z-=center.z;' +
'\nconst fitHeight=Math.max(size.y,2.15); camera.position.z=4.65*(fitHeight/2.15); camera.lookAt(0,Math.min(1.08,size.y*0.50),0);' +
'\nwindow.__beaverValidation={' +
' setAngle(degrees){beaver.rotation.y=THREE.MathUtils.degToRad(degrees);renderer.render(scene,camera);},' +
' metrics(){let meshes=0,triangles=0;beaver.traverse((node)=>{if(!node.isMesh)return;meshes+=1;const p=node.geometry&&node.geometry.getAttribute&&node.geometry.getAttribute("position");const i=node.geometry&&node.geometry.index;if(i)triangles+=i.count/3;else if(p)triangles+=p.count/3;});const b=new THREE.Box3().setFromObject(beaver);const z=new THREE.Vector3();b.getSize(z);return{meshes,triangles:Math.round(triangles),width:Number(z.x.toFixed(3)),height:Number(z.y.toFixed(3)),depth:Number(z.z.toFixed(3))};}' +
'};' +
'\nrenderer.render(scene,camera);' +
'\n<' + '/script></body></html>';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 720 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForFunction(() => Boolean(window.__beaverValidation));

const views = [
  ['front', 0],
  ['front-3q', 35],
  ['side', 90],
  ['rear-3q', 145],
  ['rear', 180],
  ['other-3q', 325],
];

for (const view of views) {
  const name = view[0];
  const angle = view[1];
  await page.evaluate((value) => window.__beaverValidation.setAngle(value), angle);
  await page.screenshot({ path: path.join(outDir, name + '.png') });
}

const metrics = await page.evaluate(() => window.__beaverValidation.metrics());
await fs.writeFile(
  path.join(outDir, 'report.json'),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: 'src/mapHtml.ts::createBeaver3D',
    views: views.map((view) => ({ name: view[0], angle: view[1] })),
    metrics,
  }, null, 2),
);

const imageData = [];
for (const view of views) {
  const name = view[0];
  const bytes = await fs.readFile(path.join(outDir, name + '.png'));
  imageData.push({ name, src: 'data:image/png;base64,' + bytes.toString('base64') });
}

const overview = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
const cells = imageData.map((item) =>
  '<div class="cell"><img src="' + item.src + '"/><span>' + item.name + '</span></div>'
).join('');
const overviewHtml =
'<!doctype html><html><head><style>' +
'*{box-sizing:border-box}body{margin:0;background:#e9e5df;font-family:Arial,sans-serif}' +
'.grid{display:grid;grid-template-columns:repeat(3,480px);grid-template-rows:repeat(2,480px)}' +
'.cell{position:relative;width:480px;height:480px;overflow:hidden;border:1px solid #d2cbc2;background:#f4f1ec}' +
'img{width:100%;height:100%;object-fit:cover}' +
'span{position:absolute;left:16px;bottom:14px;background:rgba(255,255,255,.88);padding:7px 11px;border-radius:999px;font-size:16px;font-weight:700;color:#302923}' +
'</style></head><body><div class="grid">' + cells + '</div></body></html>';

await overview.setContent(overviewHtml, { waitUntil: 'load' });
await overview.screenshot({ path: path.join(outDir, 'overview.png'), fullPage: true });

await browser.close();
console.log(JSON.stringify({ outDir, metrics, views }, null, 2));
