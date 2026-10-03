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
    .marker{position:relative;width:62px;height:88px;display:flex;flex-direction:column;align-items:center;cursor:pointer;transform-origin:50% 100%}
    .marker-beam{position:absolute;top:43px;width:5px;height:27px;border-radius:999px;background:linear-gradient(180deg,currentColor,rgba(255,255,255,.35));box-shadow:0 4px 10px rgba(16,24,40,.16)}
    .marker-dot{position:relative;width:54px;height:54px;border:4px solid white;border-radius:50%;display:grid;place-items:center;color:white;font-weight:900;font-size:18px;box-shadow:0 0 0 3px currentColor,0 9px 20px rgba(16,24,40,.22)}
    .marker-dot:after{content:"";position:absolute;inset:-8px;border:2px solid currentColor;border-radius:50%;opacity:.2;animation:markerPulse 2.6s ease-out infinite}
    .marker-label{position:absolute;top:76px;white-space:nowrap;padding:6px 10px;border:1px solid #DDE3EA;border-radius:999px;background:rgba(255,255,255,.96);color:#101828;font-size:10px;font-weight:700;box-shadow:0 6px 18px rgba(16,24,40,.11)}
    @keyframes markerPulse{0%{transform:scale(.78);opacity:.24}70%,100%{transform:scale(1.3);opacity:0}}
    .maplibregl-ctrl-attrib{font-size:8px!important;background:rgba(255,255,255,.88)!important;color:#667085!important}
    .maplibregl-ctrl-logo{display:none!important}
    ${compact ? '.marker-label{display:none}.maplibregl-ctrl-bottom-right{display:none}' : ''}
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
    let playerTransform = null;
    let playerTargetTransform = null;
    let playerHasFix = false;
    let playerAnchored = false;
    let targetMapBearing = -24;
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

    function createBeaver3D() {
      const beaver = new THREE.Group();
      beaver.name = 'SiteQuest Beaver';

      // Warm cinematic mascot palette inspired by the approved reference.
      const fur = material(0x9a552b, 0.92);
      const furWarm = material(0xb96b35, 0.86);
      const furLight = material(0xd08a4d, 0.82);
      const furDark = material(0x53301f, 0.95);
      const cream = material(0xf2c982, 0.80);
      const creamLight = material(0xffe4b5, 0.72);
      const pawMat = material(0x663b25, 0.94);
      const tailMat = material(0x6a422c, 0.96);
      const tailLine = material(0x4b2c1e, 0.99);
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
      });
      const jacketDark = new THREE.MeshPhysicalMaterial({
        color: 0x1053bd,
        roughness: 0.62,
        metalness: 0,
        clearcoat: 0.12,
        clearcoatRoughness: 0.52,
      });
      const zipperBlue = material(0x0e4fb9, 0.45);
      const zipperMetal = material(0xd8e4ff, 0.34, 0.22);

      const backpackPurple = new THREE.MeshPhysicalMaterial({
        color: 0x7657ff,
        roughness: 0.60,
        metalness: 0,
        clearcoat: 0.12,
        clearcoatRoughness: 0.55,
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

      // Broad beaver paddle tail. It sits low enough to remain visible behind the backpack.
      const tail = mesh(
        new THREE.SphereGeometry(0.49, 30, 24),
        tailMat,
        [-0.49, 0.48, -0.36],
        [0.70, 1.30, 0.18],
        [0.08, 0.08, -0.50]
      );
      beaver.add(tail);

      [-0.18, 0.00, 0.18].forEach((offset) => {
        beaver.add(mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.66, 8),
          tailLine,
          [-0.49 + offset * 0.52, 0.49 + offset * 0.40, -0.266],
          [1, 1, 1],
          [Math.PI / 2, 0.30, -0.50]
        ));
        beaver.add(mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.66, 8),
          tailLine,
          [-0.49 + offset * 0.52, 0.49 - offset * 0.40, -0.267],
          [1, 1, 1],
          [Math.PI / 2, -0.30, -0.50]
        ));
      });

      // Big soft feet and toes.
      const leftFoot = mesh(new THREE.SphereGeometry(0.255, 26, 20), pawMat, [-0.26, 0.16, 0.08], [1.22, 0.58, 1.45]);
      const rightFoot = mesh(new THREE.SphereGeometry(0.255, 26, 20), pawMat, [0.26, 0.16, 0.08], [1.22, 0.58, 1.45]);
      beaver.add(leftFoot);
      beaver.add(rightFoot);

      [-0.33, -0.26, -0.19, 0.19, 0.26, 0.33].forEach((x) => {
        beaver.add(mesh(new THREE.SphereGeometry(0.060, 16, 12), furDark, [x, 0.115, 0.30], [1.0, 0.58, 0.90]));
      });

      // Stocky body underneath the clothes.
      beaver.add(mesh(new THREE.SphereGeometry(0.56, 34, 28), fur, [0, 0.80, 0], [0.92, 1.20, 0.78]));
      beaver.add(mesh(new THREE.SphereGeometry(0.39, 30, 24), cream, [0, 0.74, 0.41], [0.82, 1.04, 0.20]));

      // Puffer jacket shell: rounded body, collar and visible quilting.
      const jacketBody = mesh(
        new THREE.SphereGeometry(0.555, 34, 28),
        jacketBlue,
        [0, 0.88, 0.015],
        [0.95, 0.97, 0.80]
      );
      beaver.add(jacketBody);

      // Open V around the neck exposing a small warm chest patch.
      beaver.add(mesh(new THREE.SphereGeometry(0.23, 24, 18), cream, [0, 1.18, 0.425], [0.72, 0.58, 0.18]));

      // Raised puffer collar.
      beaver.add(mesh(new THREE.TorusGeometry(0.35, 0.075, 12, 36, Math.PI * 1.24), jacketBlue, [0, 1.19, 0.04], [1.0, 0.72, 1.0], [Math.PI / 2, 0, -0.38]));
      beaver.add(mesh(new THREE.TorusGeometry(0.35, 0.075, 12, 36, Math.PI * 1.24), jacketBlue, [0, 1.19, 0.04], [1.0, 0.72, 1.0], [Math.PI / 2, 0, Math.PI + 0.38]));

      // Puffer quilting — full rings read from front and from the rear.
      [0.58, 0.80, 1.02].forEach((y, index) => {
        const ring = mesh(
          new THREE.TorusGeometry(0.445 - index * 0.012, 0.015, 8, 34),
          jacketDark,
          [0, y, 0.005],
          [1.0, 1.0, 0.82],
          [Math.PI / 2, 0, 0]
        );
        beaver.add(ring);
      });

      // Front zipper with a metallic pull.
      beaver.add(mesh(new THREE.BoxGeometry(0.030, 0.72, 0.036), zipperBlue, [0, 0.87, 0.455]));
      beaver.add(mesh(new THREE.BoxGeometry(0.060, 0.045, 0.030), zipperMetal, [0.030, 1.105, 0.478], [1, 1, 1], [0, 0, -0.18]));

      // Puffy side pockets.
      beaver.add(mesh(new THREE.SphereGeometry(0.17, 20, 16), jacketDark, [-0.25, 0.63, 0.405], [1.00, 0.55, 0.22], [0, 0, -0.25]));
      beaver.add(mesh(new THREE.SphereGeometry(0.17, 20, 16), jacketDark, [0.25, 0.63, 0.405], [1.00, 0.55, 0.22], [0, 0, 0.25]));

      // Large purple backpack inspired by the reference, with rounded body and front pocket.
      const backpackBody = mesh(
        new THREE.SphereGeometry(0.42, 30, 24),
        backpackPurple,
        [0, 0.92, -0.49],
        [0.82, 1.06, 0.34]
      );
      beaver.add(backpackBody);
      beaver.add(mesh(
        new THREE.SphereGeometry(0.29, 26, 20),
        backpackDark,
        [0, 0.73, -0.585],
        [0.84, 0.70, 0.20]
      ));

      // Backpack top seam and small handle.
      beaver.add(mesh(new THREE.TorusGeometry(0.19, 0.022, 8, 24, Math.PI), backpackTrim, [0, 1.30, -0.51], [1, 1, 1], [Math.PI / 2, 0, 0]));
      beaver.add(mesh(new THREE.TorusGeometry(0.105, 0.025, 8, 20, Math.PI), backpackTrim, [0, 1.34, -0.51], [1, 1.15, 1], [Math.PI / 2, 0, 0]));

      // Wide padded backpack straps over the shoulders, visible from the front and rear.
      const leftStrap = mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.62, 12), backpackPurple, [-0.29, 1.02, 0.01], [1.0, 1.0, 0.72], [0.08, 0, -0.22]);
      const rightStrap = mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.62, 12), backpackPurple, [0.29, 1.02, 0.01], [1.0, 1.0, 0.72], [0.08, 0, 0.22]);
      beaver.add(leftStrap);
      beaver.add(rightStrap);
      beaver.add(mesh(new THREE.BoxGeometry(0.075, 0.070, 0.030), backpackTrim, [-0.30, 0.88, 0.22]));
      beaver.add(mesh(new THREE.BoxGeometry(0.075, 0.070, 0.030), backpackTrim, [0.30, 0.88, 0.22]));

      // Arms: chunky cylinders + round paws, compatible with trot animation.
      const leftArm = mesh(new THREE.CylinderGeometry(0.105, 0.125, 0.40, 16), fur, [-0.50, 0.88, 0.08], [1, 1, 1], [0, 0, -0.34]);
      const rightArm = mesh(new THREE.CylinderGeometry(0.105, 0.125, 0.40, 16), fur, [0.50, 0.88, 0.08], [1, 1, 1], [0, 0, 0.34]);
      beaver.add(leftArm);
      beaver.add(rightArm);

      const leftPaw = mesh(new THREE.SphereGeometry(0.15, 22, 18), furLight, [-0.53, 0.67, 0.26], [0.94, 0.74, 1.00]);
      const rightPaw = mesh(new THREE.SphereGeometry(0.15, 22, 18), furLight, [0.53, 0.67, 0.26], [0.94, 0.74, 1.00]);
      beaver.add(leftPaw);
      beaver.add(rightPaw);

      beaver.userData.trotParts = { leftFoot, rightFoot, leftArm, rightArm };

      // Large rounded head with cheek volume closer to the reference.
      beaver.add(mesh(new THREE.SphereGeometry(0.53, 40, 32), furWarm, [0, 1.59, 0.015], [1.10, 0.98, 0.95]));
      beaver.add(mesh(new THREE.SphereGeometry(0.32, 30, 24), furLight, [-0.28, 1.48, 0.22], [0.98, 0.92, 0.75]));
      beaver.add(mesh(new THREE.SphereGeometry(0.32, 30, 24), furLight, [0.28, 1.48, 0.22], [0.98, 0.92, 0.75]));

      // Small crown tufts to break the perfect sphere silhouette.
      [-0.10, 0.00, 0.10].forEach((x, index) => {
        beaver.add(mesh(
          new THREE.ConeGeometry(0.055 - index * 0.006, 0.16 + index * 0.02, 10),
          furWarm,
          [x, 2.045 + index * 0.006, -0.01],
          [1, 1, 1],
          [0, 0, x * -1.8]
        ));
      });

      // Rounded ears with lighter inner pads.
      beaver.add(mesh(new THREE.SphereGeometry(0.175, 26, 20), furDark, [-0.39, 1.83, -0.015], [1.02, 1.02, 0.82]));
      beaver.add(mesh(new THREE.SphereGeometry(0.175, 26, 20), furDark, [0.39, 1.83, -0.015], [1.02, 1.02, 0.82]));
      beaver.add(mesh(new THREE.SphereGeometry(0.10, 20, 16), cream, [-0.39, 1.83, 0.07], [1.0, 1.0, 0.50]));
      beaver.add(mesh(new THREE.SphereGeometry(0.10, 20, 16), cream, [0.39, 1.83, 0.07], [1.0, 1.0, 0.50]));

      // Large expressive eyes: white sclera, amber iris, dark pupil and dual catchlights.
      const eyeY = 1.69;
      const eyeZ = 0.415;
      [-0.18, 0.18].forEach((x, index) => {
        beaver.add(mesh(new THREE.SphereGeometry(0.118, 30, 24), white, [x, eyeY, eyeZ], [0.94, 1.16, 0.66]));
        beaver.add(mesh(new THREE.SphereGeometry(0.073, 26, 20), iris, [x + (index === 0 ? 0.012 : -0.012), eyeY - 0.008, 0.489], [1, 1.08, 0.72]));
        beaver.add(mesh(new THREE.SphereGeometry(0.043, 22, 18), eyeGloss, [x + (index === 0 ? 0.016 : -0.016), eyeY - 0.010, 0.529], [1, 1.06, 0.76]));
        beaver.add(mesh(new THREE.SphereGeometry(0.017, 12, 10), white, [x - 0.018, eyeY + 0.038, 0.559]));
        beaver.add(mesh(new THREE.SphereGeometry(0.008, 10, 8), white, [x + 0.020, eyeY - 0.020, 0.561]));
      });

      // Thick friendly eyebrows.
      beaver.add(mesh(new THREE.TorusGeometry(0.110, 0.022, 8, 22, Math.PI * 0.74), furDark, [-0.18, 1.81, 0.405], [1, 0.72, 1], [0, 0, 0.28]));
      beaver.add(mesh(new THREE.TorusGeometry(0.110, 0.022, 8, 22, Math.PI * 0.74), furDark, [0.18, 1.81, 0.405], [1, 0.72, 1], [0, 0, 2.30]));

      // Plush two-part muzzle.
      beaver.add(mesh(new THREE.SphereGeometry(0.24, 34, 28), creamLight, [-0.145, 1.49, 0.50], [1.05, 0.84, 0.68]));
      beaver.add(mesh(new THREE.SphereGeometry(0.24, 34, 28), creamLight, [0.145, 1.49, 0.50], [1.05, 0.84, 0.68]));

      // Large glossy nose with subtle specular highlight.
      beaver.add(mesh(new THREE.SphereGeometry(0.112, 30, 24), noseMat, [0, 1.585, 0.665], [1.30, 0.90, 0.80]));
      beaver.add(mesh(new THREE.SphereGeometry(0.023, 12, 10), white, [-0.030, 1.620, 0.740], [1.0, 0.70, 0.40]));

      // Open happy grin with tongue and iconic incisors.
      beaver.add(mesh(new THREE.SphereGeometry(0.215, 30, 24), mouthMat, [0, 1.345, 0.515], [1.06, 0.64, 0.36]));
      beaver.add(mesh(new THREE.SphereGeometry(0.128, 24, 20), tongueMat, [0, 1.285, 0.610], [1.02, 0.48, 0.28]));
      beaver.add(mesh(new THREE.BoxGeometry(0.094, 0.210, 0.064), tooth, [-0.050, 1.415, 0.662], [1, 1, 1], [0, 0, 0.024]));
      beaver.add(mesh(new THREE.BoxGeometry(0.094, 0.210, 0.064), tooth, [0.050, 1.415, 0.662], [1, 1, 1], [0, 0, -0.024]));
      beaver.add(mesh(new THREE.TorusGeometry(0.190, 0.020, 10, 32, Math.PI), furDark, [0, 1.415, 0.605], [1, 0.75, 1], [0, 0, Math.PI]));

      // Rosy cheek pads.
      beaver.add(mesh(new THREE.SphereGeometry(0.062, 18, 14), cheekMat, [-0.315, 1.455, 0.485], [1.28, 0.48, 0.28]));
      beaver.add(mesh(new THREE.SphereGeometry(0.062, 18, 14), cheekMat, [0.315, 1.455, 0.485], [1.28, 0.48, 0.28]));

      // Small SiteQuest-style white chest emblem on the jacket.
      beaver.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.016, 18), white, [0.205, 1.005, 0.477], [1, 1, 1], [Math.PI / 2, 0, 0]));
      beaver.add(mesh(new THREE.BoxGeometry(0.018, 0.070, 0.012), white, [0.205, 1.005, 0.488]));
      beaver.add(mesh(new THREE.BoxGeometry(0.070, 0.018, 0.012), white, [0.205, 1.005, 0.488]));

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
        this.renderer.toneMappingExposure = 1.12;
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

        // Counter-rotate the avatar against the map so it keeps a stable screen-facing direction.
        this.beaver.rotation.y = -map.getBearing() * Math.PI / 180;

        if (playerIsMoving) {
          this.beaver.position.y = 0.025 + trotLift * 0.075;
          this.beaver.userData.trotParts.leftArm.rotation.z = -0.36 + stride * 0.22;
          this.beaver.userData.trotParts.rightArm.rotation.z = 0.36 - stride * 0.22;
          this.beaver.userData.trotParts.leftFoot.position.z = 0.04 + stride * 0.09;
          this.beaver.userData.trotParts.rightFoot.position.z = 0.04 - stride * 0.09;
          this.beaver.userData.trotParts.leftFoot.rotation.x = stride * 0.34;
          this.beaver.userData.trotParts.rightFoot.rotation.x = -stride * 0.34;
        } else {
          this.beaver.position.y = 0.018 + Math.sin(time * 2.2) * 0.012;
          this.beaver.userData.trotParts.leftArm.rotation.z += (-0.36 - this.beaver.userData.trotParts.leftArm.rotation.z) * 0.18;
          this.beaver.userData.trotParts.rightArm.rotation.z += (0.36 - this.beaver.userData.trotParts.rightArm.rotation.z) * 0.18;
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

    markers.forEach((item) => {
      const element = document.createElement('div');
      element.className = 'marker';
      element.style.color = item.color;
      element.innerHTML = '<span class="marker-dot" style="background:'+item.color+'">'+item.marker+'</span><span class="marker-beam"></span><span class="marker-label">'+item.title+'</span>';
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        send('initiative', { id: item.id });
        map.easeTo({ center: item.coordinates, duration: 650, zoom: 16.8, pitch: 68, bearing: map.getBearing() });
      });
      new maplibregl.Marker({ element, anchor: 'bottom' }).setLngLat(item.coordinates).addTo(map);
    });

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
      if (playerAnchored) {
        playerAnchored = false;
        send('anchor', { active: false });
      }
      map.stop();
      map.easeTo({ center:item.coordinates, zoom:16.8, pitch:${compact ? 52 : 68}, duration:700 });
    };
    // Tapping the map never changes the Player's GPS position.
  </script>
</body>
</html>`;
}
