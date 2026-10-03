import { KRAKOW_CENTER } from './data';
import type { Initiative, MapHtmlOptions } from './types';

const escapeJson = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c');

export function createMapHtml(initiatives: Initiative[], options: MapHtmlOptions = {}): string {
  const center = options.center || KRAKOW_CENTER;
  const compact = Boolean(options.compact);
  const markers = initiatives.map((item) => ({
    id: item.id,
    title: item.shortTitle,
    marker: item.marker,
    color: item.color,
    coordinates: [item.longitude, item.latitude],
  }));

  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    html,body,#map{width:100%;height:100%;margin:0;overflow:hidden;background:#EAF0F7}
    *{box-sizing:border-box;font-family:Arial,sans-serif}
    #map:after{content:"";pointer-events:none;position:absolute;inset:0;background:linear-gradient(180deg,rgba(247,249,252,.06),rgba(23,70,183,.025) 55%,rgba(16,24,40,.05))}
    .maplibregl-ctrl-attrib{font-size:8px!important;background:rgba(255,255,255,.88)!important;color:#667085!important}
    .maplibregl-ctrl-logo{display:none!important}
    ${compact ? '.maplibregl-ctrl-bottom-right{display:none}' : ''}
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
  <script>
    const markers = ${escapeJson(markers)};
    let playerPosition = [${center.longitude}, ${center.latitude}];
    const send = (type, payload = {}) => window.ReactNativeWebView?.postMessage(JSON.stringify({ type, ...payload }));
    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: playerPosition,
      zoom: ${compact ? 15.7 : 16.2},
      pitch: ${compact ? 52 : 66},
      bearing: -24,
      attributionControl: false,
      dragRotate: true,
      touchPitch: true,
      maxPitch: 78,
      antialias: true
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: '© OpenStreetMap contributors · OpenFreeMap' }), 'bottom-right');
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.touchZoomRotate.enable();

    const BEAVER_METERS_PER_UNIT = ${compact ? 12 : 15};
    const BEAVER_GROUND_CLEARANCE_METERS = 1.2;
    const INITIATIVE_METERS_PER_UNIT = ${compact ? 5.5 : 7.0};
    let playerTransform = null;
    let playerTargetTransform = null;
    let playerHasFix = false;
    let playerAnchored = false;
    let targetMapBearing = -24;
    let displayedBeaverRotation = Math.PI + 24 * Math.PI / 180;
    let lastAppliedMapBearing = -24;
    let userInteractingWithMap = false;
    let headingResumeAt = 0;
    let playerIsMoving = false;

    function getPlayerElevation(lng, lat) {
      try {
        const point = map.project([lng, lat]);
        const buildings = map.queryRenderedFeatures(point, { layers: ['sitequest-3d-buildings'] });
        const buildingHeight = Math.max(0, ...buildings.map((feature) => Number(feature.properties?.render_height || feature.properties?.height || 0)));
        return buildingHeight + BEAVER_GROUND_CLEARANCE_METERS;
      } catch {
        return 0;
      }
    }

    function createPlayerTransform(lng, lat) {
      const mercator = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], getPlayerElevation(lng, lat));
      return {
        translateX: mercator.x,
        translateY: mercator.y,
        translateZ: mercator.z,
        scale: mercator.meterInMercatorCoordinateUnits() * BEAVER_METERS_PER_UNIT,
        rotateX: Math.PI / 2,
        rotateY: 0,
        rotateZ: 0
      };
    }

    function updatePlayerTransform(lng, lat, immediate = false) {
      playerTargetTransform = createPlayerTransform(lng, lat);
      if (!playerTransform || immediate) {
        playerTransform = { ...playerTargetTransform };
      }
    }

    // BEAVER_MODEL_START
    function material(color, roughness = 0.72, metalness = 0.02) {
      return new THREE.MeshStandardMaterial({ color, roughness, metalness });
    }

    function mesh(geometry, mat, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
      const part = new THREE.Mesh(geometry, mat);
      part.position.set(position[0], position[1], position[2]);
      part.scale.set(scale[0], scale[1], scale[2]);
      part.rotation.set(rotation[0], rotation[1], rotation[2]);
      return part;
    }

    function createMicroBumpTexture(kind = 'fur') {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 96, 96);

      let seed = kind === 'fur' ? 918273 : 192837;
      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };

      if (kind === 'fur') {
        for (let i = 0; i < 760; i += 1) {
          const x = random() * 96;
          const y = random() * 96;
          const length = 2 + random() * 5;
          const shade = 88 + Math.floor(random() * 78);
          ctx.strokeStyle = 'rgb(' + shade + ',' + shade + ',' + shade + ')';
          ctx.globalAlpha = 0.28 + random() * 0.32;
          ctx.lineWidth = 0.55 + random() * 0.65;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (random() - 0.5) * 1.5, y + length);
          ctx.stroke();
        }
      } else {
        for (let y = 0; y < 96; y += 3) {
          const shade = y % 6 === 0 ? 112 : 142;
          ctx.globalAlpha = 0.24;
          ctx.strokeStyle = 'rgb(' + shade + ',' + shade + ',' + shade + ')';
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(96, y + 1);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(kind === 'fur' ? 5 : 4, kind === 'fur' ? 5 : 4);
      texture.colorSpace = THREE.NoColorSpace;
      texture.needsUpdate = true;
      return texture;
    }

    function createBeaver3D() {
      const beaver = new THREE.Group();
      beaver.name = 'SiteQuest Beaver';

      // Warm cinematic mascot palette with shared procedural micro-fur texture.
      const furBump = createMicroBumpTexture('fur');
      const fabricBump = createMicroBumpTexture('fabric');
      const furry = (color, roughness = 0.88, bumpScale = 0.020) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness,
          metalness: 0,
          bumpMap: furBump,
          bumpScale,
        });

      const fur = furry(0x9a552b, 0.90, 0.022);
      const furWarm = furry(0xb96b35, 0.86, 0.020);
      const furLight = furry(0xd08a4d, 0.84, 0.018);
      const furDark = furry(0x53301f, 0.93, 0.016);
      const cream = furry(0xf2c982, 0.80, 0.014);
      const creamLight = furry(0xffe4b5, 0.76, 0.013);
      const pawMat = furry(0x663b25, 0.92, 0.017);
      const tailMat = material(0x6a422c, 0.96);
      const mouthMat = material(0x2b1010, 0.90);
      const tongueMat = material(0xe77b80, 0.68);
      const tooth = material(0xfffbef, 0.30);
      const white = material(0xffffff, 0.28);
      const iris = material(0x95531f, 0.34);
      const cheekMat = material(0xe89d83, 0.82);

      const jacketBlue = new THREE.MeshPhysicalMaterial({
        color: 0x1768e7,
        roughness: 0.55,
        metalness: 0,
        clearcoat: 0.18,
        clearcoatRoughness: 0.48,
        bumpMap: fabricBump,
        bumpScale: 0.010,
      });
      const jacketDark = new THREE.MeshPhysicalMaterial({
        color: 0x1053bd,
        roughness: 0.62,
        metalness: 0,
        clearcoat: 0.12,
        clearcoatRoughness: 0.52,
        bumpMap: fabricBump,
        bumpScale: 0.009,
      });
      const zipperBlue = material(0x0e4fb9, 0.45);

      const backpackPurple = new THREE.MeshPhysicalMaterial({
        color: 0x7657ff,
        roughness: 0.60,
        metalness: 0,
        clearcoat: 0.12,
        clearcoatRoughness: 0.55,
        bumpMap: fabricBump,
        bumpScale: 0.010,
      });
      const backpackDark = material(0x573bc7, 0.72);
      const backpackTrim = material(0x482aaf, 0.76);

      const glossy = (color, roughness = 0.18) =>
        new THREE.MeshPhysicalMaterial({
          color,
          roughness,
          metalness: 0,
          clearcoat: 0.72,
          clearcoatRoughness: 0.14,
        });

      const noseMat = glossy(0x2b1812, 0.24);
      const eyeGloss = glossy(0x130d0a, 0.10);

      // Broad low paddle tail, close to the reference silhouette and without protruding hatch artifacts.
      const tail = mesh(
        new THREE.SphereGeometry(0.50, 34, 26),
        tailMat,
        [-0.50, 0.34, -0.34],
        [1.18, 0.58, 0.18],
        [0.05, 0.12, -0.16]
      );
      beaver.add(tail);

      // Big soft feet and toes.
      const leftFoot = mesh(new THREE.SphereGeometry(0.235, 26, 20), pawMat, [-0.24, 0.15, 0.08], [1.18, 0.56, 1.36]);
      const rightFoot = mesh(new THREE.SphereGeometry(0.235, 26, 20), pawMat, [0.24, 0.15, 0.08], [1.18, 0.56, 1.36]);
      beaver.add(leftFoot);
      beaver.add(rightFoot);

      [-0.295, -0.24, -0.185, 0.185, 0.24, 0.295].forEach((x) => {
        beaver.add(mesh(new THREE.SphereGeometry(0.060, 16, 12), furDark, [x, 0.115, 0.30], [1.0, 0.58, 0.90]));
      });

      // Stocky body underneath the clothes.
      beaver.add(mesh(new THREE.SphereGeometry(0.58, 34, 28), fur, [0, 0.78, 0], [0.94, 1.20, 0.80]));
      beaver.add(mesh(new THREE.SphereGeometry(0.34, 30, 24), cream, [0, 0.60, 0.405], [0.80, 0.90, 0.12]));

      // Beveled puffer vest panels. Extruded rounded shapes read much closer to a real jacket than spheres.
      const makeVestPanel = (side) => {
        const shape = new THREE.Shape();
        const inner = side * 0.018;
        const outer = side * 0.43;
        shape.moveTo(inner, 1.27);
        shape.quadraticCurveTo(side * 0.20, 1.31, outer, 1.16);
        shape.quadraticCurveTo(side * 0.47, 0.98, side * 0.40, 0.75);
        shape.quadraticCurveTo(side * 0.31, 0.68, inner, 0.71);
        shape.lineTo(inner, 1.27);
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: 0.14,
          steps: 1,
          bevelEnabled: true,
          bevelSegments: 4,
          bevelSize: 0.030,
          bevelThickness: 0.025,
          curveSegments: 14,
        });
        const panel = mesh(geometry, jacketBlue, [0, 0, 0.315]);
        panel.rotation.x = 0;
        return panel;
      };
      beaver.add(makeVestPanel(-1));
      beaver.add(makeVestPanel(1));

      // Rear padded section, mostly visible around the backpack.
      beaver.add(mesh(new THREE.SphereGeometry(0.43, 28, 22), jacketBlue, [0, 0.98, -0.17], [0.92, 0.78, 0.34]));

      // Raised collar lobes create the same open-V read as the reference.
      beaver.add(mesh(new THREE.SphereGeometry(0.15, 22, 18), jacketBlue, [-0.16, 1.25, 0.24], [1.10, 0.48, 0.42], [0, 0, -0.42]));
      beaver.add(mesh(new THREE.SphereGeometry(0.15, 22, 18), jacketBlue, [0.16, 1.25, 0.24], [1.10, 0.48, 0.42], [0, 0, 0.42]));

      // Clean center zipper and pull.
      beaver.add(mesh(new THREE.BoxGeometry(0.022, 0.56, 0.026), zipperBlue, [0, 0.99, 0.478]));

      // Two simple slanted pocket openings; no fake quilting bars.
      beaver.add(mesh(new THREE.BoxGeometry(0.17, 0.035, 0.022), jacketDark, [-0.225, 0.80, 0.486], [1, 1, 1], [0, 0, -0.38]));
      beaver.add(mesh(new THREE.BoxGeometry(0.17, 0.035, 0.022), jacketDark, [0.225, 0.80, 0.486], [1, 1, 1], [0, 0, 0.38]));


      // Rounded rectangular backpack shell, beveled for a softer reference-like profile.
      const backpackShape = new THREE.Shape();
      backpackShape.moveTo(-0.31, 0.64);
      backpackShape.quadraticCurveTo(-0.38, 0.67, -0.38, 0.80);
      backpackShape.lineTo(-0.38, 1.20);
      backpackShape.quadraticCurveTo(-0.36, 1.32, -0.23, 1.35);
      backpackShape.quadraticCurveTo(0, 1.40, 0.23, 1.35);
      backpackShape.quadraticCurveTo(0.36, 1.32, 0.38, 1.20);
      backpackShape.lineTo(0.38, 0.80);
      backpackShape.quadraticCurveTo(0.38, 0.67, 0.31, 0.64);
      backpackShape.closePath();
      const backpackGeometry = new THREE.ExtrudeGeometry(backpackShape, {
        depth: 0.18,
        steps: 1,
        bevelEnabled: true,
        bevelSegments: 5,
        bevelSize: 0.045,
        bevelThickness: 0.032,
        curveSegments: 16,
      });
      const backpackBody = mesh(backpackGeometry, backpackPurple, [0, 0, -0.69]);
      beaver.add(backpackBody);

      // Rounded external pocket on the rear face.
      const pocketShape = new THREE.Shape();
      pocketShape.moveTo(-0.24, 0.66);
      pocketShape.quadraticCurveTo(-0.27, 0.67, -0.27, 0.72);
      pocketShape.lineTo(-0.27, 0.88);
      pocketShape.quadraticCurveTo(-0.26, 0.94, -0.19, 0.95);
      pocketShape.lineTo(0.19, 0.95);
      pocketShape.quadraticCurveTo(0.26, 0.94, 0.27, 0.88);
      pocketShape.lineTo(0.27, 0.72);
      pocketShape.quadraticCurveTo(0.27, 0.67, 0.24, 0.66);
      pocketShape.closePath();
      const pocketGeometry = new THREE.ExtrudeGeometry(pocketShape, {
        depth: 0.035,
        steps: 1,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: 0.020,
        bevelThickness: 0.015,
        curveSegments: 12,
      });
      beaver.add(mesh(pocketGeometry, backpackDark, [0, 0, -0.735]));
      beaver.add(mesh(new THREE.BoxGeometry(0.34, 0.018, 0.016), backpackTrim, [0, 0.88, -0.755]));

      // Visible fabric handle above the backpack.
      beaver.add(mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.15, 10), backpackTrim, [-0.075, 1.40, -0.695]));
      beaver.add(mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.15, 10), backpackTrim, [0.075, 1.40, -0.695]));
      beaver.add(mesh(new THREE.BoxGeometry(0.17, 0.035, 0.035), backpackTrim, [0, 1.47, -0.695]));

      // Curved padded backpack straps following the shoulders like the reference.
      const addFrontStrap = (side) => {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 0.29, 1.28, 0.425),
          new THREE.Vector3(side * 0.335, 1.15, 0.515),
          new THREE.Vector3(side * 0.325, 0.99, 0.540),
          new THREE.Vector3(side * 0.30, 0.86, 0.525),
        ]);
        const strap = new THREE.Mesh(new THREE.TubeGeometry(curve, 22, 0.040, 10, false), backpackPurple);
        beaver.add(strap);
        beaver.add(mesh(new THREE.BoxGeometry(0.070, 0.055, 0.032), backpackTrim, [side * 0.305, 0.92, 0.565]));
      };
      addFrontStrap(-1);
      addFrontStrap(1);

      // Rear vest shoulder pad smooths the neck-to-back transition under the backpack.
      beaver.add(mesh(new THREE.SphereGeometry(0.28, 24, 18), jacketBlue, [0, 1.18, -0.20], [1.05, 0.44, 0.28]));

      // Rear-visible padded shoulder straps hugging the jacket.
      beaver.add(mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.48, 12), backpackTrim, [-0.34, 1.08, -0.735], [1.0, 1.0, 0.72], [0.08, 0, -0.12]));
      beaver.add(mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.48, 12), backpackTrim, [0.34, 1.08, -0.735], [1.0, 1.0, 0.72], [0.08, 0, 0.12]));

      // Arms: chunky cylinders + round paws, compatible with trot animation.
      const leftArm = mesh(new THREE.CylinderGeometry(0.105, 0.125, 0.40, 16), fur, [-0.50, 0.88, 0.08], [1, 1, 1], [0, 0, -0.34]);
      const rightArm = mesh(new THREE.CylinderGeometry(0.105, 0.125, 0.40, 16), fur, [0.50, 0.88, 0.08], [1, 1, 1], [0, 0, 0.34]);
      beaver.add(leftArm);
      beaver.add(rightArm);

      const leftPaw = mesh(new THREE.SphereGeometry(0.145, 22, 18), pawMat, [-0.53, 0.67, 0.26], [0.94, 0.74, 1.00]);
      const rightPaw = mesh(new THREE.SphereGeometry(0.145, 22, 18), pawMat, [0.53, 0.67, 0.26], [0.94, 0.74, 1.00]);
      beaver.add(leftPaw);
      beaver.add(rightPaw);
      [-1, 0, 1].forEach((finger) => {
        beaver.add(mesh(new THREE.SphereGeometry(0.030, 12, 10), furDark, [-0.53 + finger * 0.038, 0.635, 0.365], [0.85, 0.55, 0.80]));
        beaver.add(mesh(new THREE.SphereGeometry(0.030, 12, 10), furDark, [0.53 + finger * 0.038, 0.635, 0.365], [0.85, 0.55, 0.80]));
      });

      beaver.userData.trotParts = { leftFoot, rightFoot, leftArm, rightArm };

      // Large rounded head with cheek volume closer to the reference.
      beaver.add(mesh(new THREE.SphereGeometry(0.52, 40, 32), furWarm, [0, 1.585, 0.000], [1.10, 0.98, 0.94]));
      beaver.add(mesh(new THREE.SphereGeometry(0.31, 30, 24), fur, [0, 1.82, -0.02], [1.18, 0.48, 0.70]));
      // Three soft rounded crown tufts; no sharp geometry.
      beaver.add(mesh(new THREE.SphereGeometry(0.070, 16, 12), furWarm, [-0.085, 2.055, 0.02], [0.68, 1.30, 0.52], [0, 0, -0.22]));
      beaver.add(mesh(new THREE.SphereGeometry(0.075, 16, 12), furWarm, [0, 2.075, 0.025], [0.72, 1.35, 0.54]));
      beaver.add(mesh(new THREE.SphereGeometry(0.070, 16, 12), furWarm, [0.085, 2.055, 0.02], [0.68, 1.30, 0.52], [0, 0, 0.22]));
      beaver.add(mesh(new THREE.SphereGeometry(0.25, 30, 24), furWarm, [-0.285, 1.46, 0.15], [0.92, 0.86, 0.66]));
      beaver.add(mesh(new THREE.SphereGeometry(0.25, 30, 24), furWarm, [0.285, 1.46, 0.15], [0.92, 0.86, 0.66]));

      // Soft rear neck fur peeking between the head, jacket collar and backpack.
      beaver.add(mesh(new THREE.SphereGeometry(0.25, 24, 18), furWarm, [0, 1.34, -0.23], [1.10, 0.54, 0.38]));

      // Rounded ears with lighter inner pads.
      beaver.add(mesh(new THREE.SphereGeometry(0.17, 26, 20), furDark, [-0.39, 1.835, -0.020], [1.02, 1.02, 0.84]));
      beaver.add(mesh(new THREE.SphereGeometry(0.17, 26, 20), furDark, [0.39, 1.835, -0.020], [1.02, 1.02, 0.84]));
      beaver.add(mesh(new THREE.SphereGeometry(0.092, 20, 16), cream, [-0.39, 1.835, 0.060], [1.0, 1.0, 0.52]));
      beaver.add(mesh(new THREE.SphereGeometry(0.092, 20, 16), cream, [0.39, 1.835, 0.060], [1.0, 1.0, 0.52]));

      // Open expressive eyes: large white area and warm iris, without heavy socket rings.
      const eyeY = 1.705;
      const eyeZ = 0.435;
      [-0.185, 0.185].forEach((x) => {
        beaver.add(mesh(new THREE.SphereGeometry(0.120, 32, 26), white, [x, eyeY, eyeZ], [0.98, 1.28, 0.72]));
        beaver.add(mesh(new THREE.SphereGeometry(0.076, 28, 22), iris, [x, eyeY - 0.006, 0.515], [1, 1.12, 0.78]));
        beaver.add(mesh(new THREE.SphereGeometry(0.045, 22, 18), eyeGloss, [x, eyeY - 0.008, 0.560], [1, 1.06, 0.82]));
        beaver.add(mesh(new THREE.SphereGeometry(0.018, 12, 10), white, [x - 0.021, eyeY + 0.045, 0.591]));
        beaver.add(mesh(new THREE.SphereGeometry(0.008, 10, 8), white, [x + 0.019, eyeY - 0.022, 0.594]));
      });

      // Smooth curved brows using TubeGeometry; raised outer ends keep the expression friendly.
      const addBrow = (side) => {
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(side * 0.105, 1.835, 0.470),
          new THREE.Vector3(side * 0.190, 1.895, 0.488),
          new THREE.Vector3(side * 0.285, 1.865, 0.458)
        );
        beaver.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.018, 8, false), furDark));
      };
      addBrow(-1);
      addBrow(1);

      // Compact plush muzzle: symmetrical and slightly higher to avoid a heavy lower face.
      beaver.add(mesh(new THREE.SphereGeometry(0.214, 34, 28), creamLight, [-0.136, 1.495, 0.520], [1.06, 0.76, 0.66]));
      beaver.add(mesh(new THREE.SphereGeometry(0.214, 34, 28), creamLight, [0.136, 1.495, 0.520], [1.06, 0.76, 0.66]));

      // Rounded glossy nose, centered tightly above the muzzle.
      beaver.add(mesh(new THREE.SphereGeometry(0.102, 30, 24), noseMat, [0, 1.588, 0.665], [1.18, 0.94, 0.80]));
      beaver.add(mesh(new THREE.SphereGeometry(0.020, 12, 10), white, [-0.030, 1.624, 0.750], [1.0, 0.68, 0.38]));

      // Clean open smile with smaller teeth and tongue so the expression stays friendly rather than exaggerated.
      beaver.add(mesh(new THREE.SphereGeometry(0.196, 30, 24), mouthMat, [0, 1.355, 0.485], [1.12, 0.62, 0.34]));
      beaver.add(mesh(new THREE.SphereGeometry(0.090, 24, 20), tongueMat, [0, 1.300, 0.565], [1.00, 0.34, 0.20]));
      beaver.add(mesh(new THREE.BoxGeometry(0.068, 0.118, 0.050), tooth, [-0.037, 1.405, 0.655], [1, 1, 1], [0, 0, 0.012]));
      beaver.add(mesh(new THREE.BoxGeometry(0.068, 0.118, 0.050), tooth, [0.037, 1.405, 0.655], [1, 1, 1], [0, 0, -0.012]));
      beaver.add(mesh(new THREE.SphereGeometry(0.18, 24, 18), furWarm, [0, 1.275, 0.355], [1.05, 0.54, 0.42]));

      // Very subtle cheek warmth rather than strong pink spots.
      beaver.add(mesh(new THREE.SphereGeometry(0.050, 18, 14), cheekMat, [-0.300, 1.465, 0.475], [1.20, 0.42, 0.24]));
      beaver.add(mesh(new THREE.SphereGeometry(0.050, 18, 14), cheekMat, [0.300, 1.465, 0.475], [1.20, 0.42, 0.24]));

      // Vertical player beacon kept from the previous implementation.
      const beacon = new THREE.Group();
      beacon.name = 'Player Beacon';
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x2f6bff,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xa997ff,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      beacon.add(mesh(new THREE.CylinderGeometry(0.105, 0.040, 6.8, 20, 1, true), beamMat, [0, 5.32, -0.02]));
      beacon.add(mesh(new THREE.CylinderGeometry(0.024, 0.016, 7.2, 14), coreMat, [0, 5.47, -0.02]));
      [2.35, 3.30, 4.30].forEach((y, index) => {
        const ringMat = new THREE.MeshBasicMaterial({
          color: index % 2 === 0 ? 0x2f6bff : 0x7657ff,
          transparent: true,
          opacity: 0.32,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const ring = mesh(new THREE.TorusGeometry(0.29 + index * 0.05, 0.017, 8, 30), ringMat, [0, y, -0.02], [1, 1, 1], [Math.PI / 2, 0, 0]);
        ring.userData.beaconRing = true;
        ring.userData.phase = index * 0.8;
        beacon.add(ring);
      });
      beaver.add(beacon);
      beaver.userData.beacon = beacon;

      beaver.rotation.y = 0;
      return beaver;
    }
    // BEAVER_MODEL_END

    function getInitiativeElevation(lng, lat) {
      try {
        const point = map.project([lng, lat]);
        const buildings = map.queryRenderedFeatures(point, { layers: ['sitequest-3d-buildings'] });
        const buildingHeight = Math.max(
          0,
          ...buildings.map((feature) => Number(feature.properties?.render_height || feature.properties?.height || 0)),
        );
        return buildingHeight + 0.8;
      } catch {
        return 0.8;
      }
    }

    function createInitiativeLabelTexture(text) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, 256, 256);
      ctx.fillStyle = 'rgba(255,255,255,0.98)';
      ctx.beginPath();
      ctx.arc(128, 128, 104, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 12;
      ctx.strokeStyle = 'rgba(16,24,40,0.12)';
      ctx.stroke();

      ctx.fillStyle = '#101828';
      ctx.font = '900 118px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(text || '•').slice(0, 2), 128, 136);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      return texture;
    }

    function createInitiative3D(item) {
      const group = new THREE.Group();
      group.name = 'Initiative ' + item.id;

      const color = new THREE.Color(item.color);
      const baseMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.42,
        metalness: 0.04,
      });
      const darkColor = color.clone().multiplyScalar(0.72);
      const darkMat = new THREE.MeshStandardMaterial({
        color: darkColor,
        roughness: 0.58,
        metalness: 0.02,
      });
      const whiteMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.30,
        metalness: 0.01,
      });
      const glowMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      // Ground plinth gives the marker actual contact with the 3D map.
      group.add(mesh(
        new THREE.CylinderGeometry(0.42, 0.50, 0.14, 28),
        darkMat,
        [0, 0.08, 0],
      ));
      group.add(mesh(
        new THREE.CylinderGeometry(0.34, 0.40, 0.08, 28),
        baseMat,
        [0, 0.18, 0],
      ));

      // Slender pin stem.
      group.add(mesh(
        new THREE.CylinderGeometry(0.065, 0.095, 1.05, 18),
        baseMat,
        [0, 0.74, 0],
      ));

      // White rim + colored orb makes the point readable from any map bearing.
      group.add(mesh(
        new THREE.SphereGeometry(0.37, 30, 24),
        whiteMat,
        [0, 1.45, 0],
      ));
      group.add(mesh(
        new THREE.SphereGeometry(0.305, 30, 24),
        baseMat,
        [0, 1.45, 0],
      ));

      // Floating letter/icon always faces the camera.
      const labelMat = new THREE.SpriteMaterial({
        map: createInitiativeLabelTexture(item.marker),
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const label = new THREE.Sprite(labelMat);
      label.position.set(0, 1.45, 0.34);
      label.scale.set(0.48, 0.48, 0.48);
      label.renderOrder = 20;
      group.add(label);

      // Horizontal orbit ring around the orb.
      const halo = mesh(
        new THREE.TorusGeometry(0.46, 0.025, 10, 36),
        glowMat.clone(),
        [0, 1.45, 0],
        [1, 1, 1],
        [Math.PI / 2, 0, 0],
      );
      halo.userData.initiativeHalo = true;
      group.add(halo);

      // Ground pulse makes locations easy to spot without reverting to a flat DOM marker.
      const groundPulse = mesh(
        new THREE.TorusGeometry(0.58, 0.028, 10, 40),
        glowMat.clone(),
        [0, 0.12, 0],
        [1, 1, 1],
        [Math.PI / 2, 0, 0],
      );
      groundPulse.userData.initiativeGroundPulse = true;
      group.add(groundPulse);

      // Vertical beacon connects the 3D location to the visual language of the Player beacon.
      const beam = mesh(
        new THREE.CylinderGeometry(0.032, 0.075, 3.8, 16, 1, true),
        glowMat.clone(),
        [0, 3.42, 0],
      );
      beam.userData.initiativeBeam = true;
      group.add(beam);

      group.userData.itemId = item.id;
      group.userData.baseY = 0;
      return group;
    }

    const initiative3DLayer = {
      id: 'sitequest-initiatives-3d',
      type: 'custom',
      renderingMode: '3d',
      onAdd(mapInstance, gl) {
        this.map = mapInstance;
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();
        this.entries = markers.map((item, index) => {
          const model = createInitiative3D(item);
          const mercator = maplibregl.MercatorCoordinate.fromLngLat(
            item.coordinates,
            getInitiativeElevation(item.coordinates[0], item.coordinates[1]),
          );
          const modelScale = mercator.meterInMercatorCoordinateUnits() * INITIATIVE_METERS_PER_UNIT;
          const rotationX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
          const modelMatrix = new THREE.Matrix4()
            .makeTranslation(mercator.x, mercator.y, mercator.z)
            .scale(new THREE.Vector3(modelScale, -modelScale, modelScale))
            .multiply(rotationX);

          model.matrixAutoUpdate = false;
          model.matrix.copy(modelMatrix);
          model.userData.phase = index * 0.77;
          this.scene.add(model);
          return { item, model };
        });

        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x40526a, 1.65));
        const key = new THREE.DirectionalLight(0xffffff, 2.0);
        key.position.set(-3, 6, 5);
        this.scene.add(key);
        const rim = new THREE.DirectionalLight(0x9fb8ff, 0.9);
        rim.position.set(4, 3, -4);
        this.scene.add(rim);

        this.renderer = new THREE.WebGLRenderer({
          canvas: mapInstance.getCanvas(),
          context: gl,
          antialias: true,
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.04;
        this.renderer.autoClear = false;
      },
      render(gl, args) {
        const projectionMatrix = args?.defaultProjectionData?.mainMatrix || args;
        if (!projectionMatrix || projectionMatrix.length !== 16) return;

        this.camera.projectionMatrix = new THREE.Matrix4().fromArray(projectionMatrix);
        const time = performance.now() * 0.001;

        this.entries.forEach(({ item, model }) => {
          const selected = window.__selectedInitiativeId === item.id;
          const bob = Math.sin(time * 2.15 + model.userData.phase) * 0.035;

          model.children.forEach((part) => {
            if (part.userData.initiativeHalo) {
              part.rotation.z = time * 0.55 + model.userData.phase;
              const pulse = 0.92 + Math.sin(time * 2.2 + model.userData.phase) * 0.08;
              part.scale.set(pulse, pulse, pulse);
              part.material.opacity = selected ? 0.52 : 0.30;
            }
            if (part.userData.initiativeGroundPulse) {
              const pulse = (Math.sin(time * 1.85 + model.userData.phase) + 1) * 0.5;
              const scale = 0.86 + pulse * 0.42;
              part.scale.set(scale, scale, scale);
              part.material.opacity = 0.10 + (1 - pulse) * (selected ? 0.46 : 0.26);
            }
            if (part.userData.initiativeBeam) {
              part.material.opacity = selected ? 0.44 : 0.22;
            }
          });

          // Matrix is in Mercator coordinates; offset only the local marker meshes for animation.
          model.children.forEach((part) => {
            if (!part.isSprite && !part.userData.initiativeHalo && !part.userData.initiativeGroundPulse && !part.userData.initiativeBeam) {
              part.position.y += bob - (part.userData.lastInitiativeBob || 0);
              part.userData.lastInitiativeBob = bob;
            }
          });
        });

        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);
        this.map.triggerRepaint();
      },
    };

    window.__selectedInitiativeId = null;

    function activateInitiative(item) {
      if (!item) return;
      window.__selectedInitiativeId = item.id;
      if (playerAnchored) {
        playerAnchored = false;
        send('anchor', { active: false });
      }
      map.stop();
      send('initiative', { id: item.id });
      map.easeTo({
        center: item.coordinates,
        duration: 650,
        zoom: 16.8,
        pitch: 68,
        bearing: map.getBearing(),
      });
      map.triggerRepaint();
    }

    function findInitiativeAtPoint(point) {
      let winner = null;
      let winnerDistance = 64;
      markers.forEach((item) => {
        const projected = map.project(item.coordinates);
        const dx = projected.x - point.x;
        const dy = projected.y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < winnerDistance) {
          winner = item;
          winnerDistance = distance;
        }
      });
      return winner;
    }

    map.on('click', (event) => {
      const item = findInitiativeAtPoint(event.point);
      if (item) activateInitiative(item);
    });

    const player3DLayer = {
      id: 'sitequest-player-beaver-3d',
      type: 'custom',
      renderingMode: '3d',
      onAdd(mapInstance, gl) {
        this.map = mapInstance;
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();
        this.beaver = createBeaver3D();
        this.scene.add(this.beaver);

        this.scene.add(new THREE.HemisphereLight(0xfff7ea, 0x40526a, 1.80));

        const key = new THREE.DirectionalLight(0xfff4df, 2.55);
        key.position.set(-3.5, 7.5, 5.5);
        this.scene.add(key);

        const fill = new THREE.DirectionalLight(0xcfe3ff, 1.05);
        fill.position.set(4.5, 4.0, 4.5);
        this.scene.add(fill);

        const rim = new THREE.DirectionalLight(0xa997ff, 1.25);
        rim.position.set(4.0, 3.5, -4.5);
        this.scene.add(rim);

        this.renderer = new THREE.WebGLRenderer({
          canvas: mapInstance.getCanvas(),
          context: gl,
          antialias: true
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.06;
        this.renderer.autoClear = false;
      },
      render(gl, args) {
        if (!playerTransform) return;

        const rotationX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), playerTransform.rotateX);
        const rotationY = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), playerTransform.rotateY);
        const rotationZ = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 0, 1), playerTransform.rotateZ);

        // MapLibre 4.x passes the matrix directly; newer releases expose it in render args.
        const projectionMatrix = args?.defaultProjectionData?.mainMatrix || args;
        if (!projectionMatrix || projectionMatrix.length !== 16) return;
        const mapMatrix = new THREE.Matrix4().fromArray(projectionMatrix);
        const modelMatrix = new THREE.Matrix4()
          .makeTranslation(playerTransform.translateX, playerTransform.translateY, playerTransform.translateZ)
          .scale(new THREE.Vector3(playerTransform.scale, -playerTransform.scale, playerTransform.scale))
          .multiply(rotationX)
          .multiply(rotationY)
          .multiply(rotationZ);

        this.camera.projectionMatrix = mapMatrix.multiply(modelMatrix);

        if (playerTargetTransform) {
          const follow = playerIsMoving ? 0.14 : 0.22;
          playerTransform.translateX += (playerTargetTransform.translateX - playerTransform.translateX) * follow;
          playerTransform.translateY += (playerTargetTransform.translateY - playerTransform.translateY) * follow;
          playerTransform.translateZ += (playerTargetTransform.translateZ - playerTransform.translateZ) * follow;
          playerTransform.scale += (playerTargetTransform.scale - playerTransform.scale) * follow;
        }

        const time = performance.now() * 0.001;
        const stride = Math.sin(time * 9.2);
        const trotLift = Math.abs(Math.sin(time * 9.2));

        // Avatar direction is driven by the phone heading, independently of anchor mode.
        // Map bearing only changes the camera. After unanchoring, the beaver still keeps
        // pointing in the direction the user is holding the phone.
        const desiredBeaverRotation = Math.PI - targetMapBearing * Math.PI / 180;
        const beaverRotationDelta = Math.atan2(
          Math.sin(desiredBeaverRotation - displayedBeaverRotation),
          Math.cos(desiredBeaverRotation - displayedBeaverRotation),
        );
        displayedBeaverRotation += beaverRotationDelta * 0.16;
        this.beaver.rotation.y = displayedBeaverRotation;

        if (playerIsMoving) {
          this.beaver.position.y = 0.025 + trotLift * 0.075;
          this.beaver.userData.trotParts.leftArm.rotation.z = -0.32 + stride * 0.14;
          this.beaver.userData.trotParts.rightArm.rotation.z = 0.32 - stride * 0.14;
          this.beaver.userData.trotParts.leftFoot.position.z = 0.04 + stride * 0.09;
          this.beaver.userData.trotParts.rightFoot.position.z = 0.04 - stride * 0.09;
          this.beaver.userData.trotParts.leftFoot.rotation.x = stride * 0.34;
          this.beaver.userData.trotParts.rightFoot.rotation.x = -stride * 0.34;
        } else {
          this.beaver.position.y = 0.018 + Math.sin(time * 2.2) * 0.012;
          this.beaver.userData.trotParts.leftArm.rotation.z += (-0.32 - this.beaver.userData.trotParts.leftArm.rotation.z) * 0.16;
          this.beaver.userData.trotParts.rightArm.rotation.z += (0.32 - this.beaver.userData.trotParts.rightArm.rotation.z) * 0.16;
          this.beaver.userData.trotParts.leftFoot.position.z += (0.04 - this.beaver.userData.trotParts.leftFoot.position.z) * 0.18;
          this.beaver.userData.trotParts.rightFoot.position.z += (0.04 - this.beaver.userData.trotParts.rightFoot.position.z) * 0.18;
          this.beaver.userData.trotParts.leftFoot.rotation.x *= 0.82;
          this.beaver.userData.trotParts.rightFoot.rotation.x *= 0.82;
        }

        this.beaver.userData.beacon?.children.forEach((part) => {
          if (!part.userData.beaconRing) return;
          const pulse = (Math.sin(time * 2.4 + part.userData.phase) + 1) * 0.5;
          const scale = 0.82 + pulse * 0.50;
          part.scale.set(scale, scale, scale);
          part.material.opacity = 0.18 + (1 - pulse) * 0.28;
        });

        // Keep the player avatar visible even when its coordinate falls inside a 3D building.
        gl.clear(gl.DEPTH_BUFFER_BIT);
        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);
        this.map.triggerRepaint();
      }
    };

    function tuneBaseStyle() {
      const layers = map.getStyle()?.layers || [];
      layers.forEach((layer) => {
        try {
          const sourceLayer = String(layer['source-layer'] || '').toLowerCase();
          const id = String(layer.id || '').toLowerCase();

          if (layer.type === 'background') {
            map.setPaintProperty(layer.id, 'background-color', '#EAF0F7');
          }
          if (layer.type === 'fill' && (sourceLayer.includes('water') || id.includes('water'))) {
            map.setPaintProperty(layer.id, 'fill-color', '#CFE5FA');
            map.setPaintProperty(layer.id, 'fill-opacity', 0.96);
          }
          if (layer.type === 'fill' && (sourceLayer.includes('park') || id.includes('park'))) {
            map.setPaintProperty(layer.id, 'fill-color', '#DCEFE5');
          }
          if (layer.type === 'line' && (sourceLayer.includes('transportation') || sourceLayer.includes('road') || id.includes('road'))) {
            map.setPaintProperty(layer.id, 'line-color', '#FFFFFF');
            map.setPaintProperty(layer.id, 'line-opacity', 0.94);
          }
          if (layer.type === 'symbol' && layer.layout?.['text-field']) {
            map.setPaintProperty(layer.id, 'text-color', '#40526A');
            map.setPaintProperty(layer.id, 'text-halo-color', '#F7F9FC');
            map.setPaintProperty(layer.id, 'text-halo-width', 1.1);
          }
        } catch {
          // Not every layer exposes every paint property.
        }
      });
    }

    map.on('load', () => {
      tuneBaseStyle();
      const sourceId = map.getSource('openmaptiles')
        ? 'openmaptiles'
        : Object.keys(map.getStyle().sources || {}).find((id) => map.getSource(id)?.type === 'vector');
      if (sourceId && !map.getLayer('sitequest-3d-buildings')) {
        const firstSymbol = map.getStyle().layers.find((layer) => layer.type === 'symbol');
        map.addLayer({
          id: 'sitequest-3d-buildings',
          source: sourceId,
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': ['interpolate',['linear'],['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],8],0,'#E4EAF1',18,'#D5DFEA',45,'#C7D3E2',80,'#B6C5D8'],
            'fill-extrusion-height': ['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],8],
            'fill-extrusion-base': ['coalesce',['to-number',['get','render_min_height']],0],
            'fill-extrusion-opacity': 0.88
          }
        }, firstSymbol?.id);
      }
      if (!map.getLayer(initiative3DLayer.id)) map.addLayer(initiative3DLayer);
      if (!map.getLayer(player3DLayer.id)) map.addLayer(player3DLayer);
      send('ready');
    });

    function syncAnchoredCamera(duration = 420, forceZoom = false) {
      if (!playerAnchored || !playerHasFix) return;
      map.stop();
      map.easeTo({
        center: playerPosition,
        bearing: targetMapBearing,
        pitch: ${compact ? 52 : 66},
        zoom: forceZoom ? 16.5 : Math.max(map.getZoom(), 16.3),
        duration,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });
    }

    function movePlayer(lng, lat, centerMap = true) {
      playerPosition = [lng, lat];
      const isFirstFix = !playerHasFix;
      playerHasFix = true;
      updatePlayerTransform(lng, lat, isFirstFix);
      map.triggerRepaint();

      if (isFirstFix || centerMap) {
        playerAnchored = true;
        userInteractingWithMap = false;
        headingResumeAt = 0;
        send('anchor', { active: true });
      }

      if (playerAnchored) {
        syncAnchoredCamera(isFirstFix ? 700 : 420, isFirstFix);
      }
    }
    window.movePlayer = movePlayer;
    function shortestBearingDelta(from, to) {
      return ((to - from + 540) % 360) - 180;
    }

    const suspendHeadingForGesture = () => {
      userInteractingWithMap = true;
      headingResumeAt = Date.now() + 1800;
      if (playerAnchored) {
        playerAnchored = false;
        map.stop();
        send('anchor', { active: false });
      }
    };
    const resumeHeadingAfterGesture = () => {
      userInteractingWithMap = false;
      headingResumeAt = Date.now() + 1200;
    };

    map.on('dragstart', suspendHeadingForGesture);
    map.on('dragend', resumeHeadingAfterGesture);

    window.setPlayerHeading = (headingDegrees) => {
      if (!Number.isFinite(headingDegrees)) return;
      targetMapBearing = ((headingDegrees % 360) + 360) % 360;

      if (!playerAnchored || userInteractingWithMap || Date.now() < headingResumeAt) return;

      const deltaFromApplied = Math.abs(shortestBearingDelta(lastAppliedMapBearing, targetMapBearing));
      if (deltaFromApplied < 10) return;

      lastAppliedMapBearing = targetMapBearing;
      syncAnchoredCamera(520, false);
    };
    window.setPlayerMoving = (moving) => {
      playerIsMoving = Boolean(moving);
      map.triggerRepaint();
    };
    window.focusPlayer = () => {
      if (!playerHasFix) {
        send('anchor', { active: false, unavailable: true });
        return;
      }
      playerAnchored = true;
      userInteractingWithMap = false;
      headingResumeAt = 0;
      lastAppliedMapBearing = targetMapBearing;
      send('anchor', { active: true });
      syncAnchoredCamera(700, true);
    };
    window.focusInitiative = (id) => {
      const item = markers.find((marker) => marker.id === id);
      if (!item) return;
      window.__selectedInitiativeId = item.id;
      if (playerAnchored) {
        playerAnchored = false;
        send('anchor', { active: false });
      }
      map.stop();
      map.easeTo({ center:item.coordinates, zoom:16.8, pitch:${compact ? 52 : 68}, duration:700 });
      map.triggerRepaint();
    };
    // Tapping the map never changes the Player's GPS position.
  </script>
</body>
</html>`;
}
