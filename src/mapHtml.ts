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

      // Premium mascot palette: warm fur, creamy muzzle/belly and glossy facial details.
      const fur = material(0x9b5b32, 0.92);
      const furMid = material(0xb86f3c, 0.88);
      const furLight = material(0xcf8950, 0.84);
      const furDark = material(0x56321f, 0.94);
      const cream = material(0xf4c982, 0.82);
      const creamLight = material(0xffe5ae, 0.78);
      const pawMat = material(0x68402a, 0.92);
      const tailMat = material(0x65402c, 0.96);
      const tailLine = material(0x4b2d20, 0.98);
      const mouthMat = material(0x2c1110, 0.90);
      const tongueMat = material(0xe97f83, 0.70);
      const tooth = material(0xfffbef, 0.34);
      const white = material(0xffffff, 0.30);
      const iris = material(0x8b4d20, 0.35);
      const pupil = material(0x130d0a, 0.24);
      const blue = material(0x2f6bff, 0.50);

      const glossy = (color, roughness = 0.20) =>
        new THREE.MeshPhysicalMaterial({
          color,
          roughness,
          metalness: 0,
          clearcoat: 0.65,
          clearcoatRoughness: 0.18,
        });

      const noseMat = glossy(0x2a1711, 0.26);
      const eyeGloss = glossy(0x1a0f0b, 0.12);

      // Tail: broad paddle with a readable cross-hatched texture.
      const tail = mesh(
        new THREE.SphereGeometry(0.48, 28, 22),
        tailMat,
        [-0.52, 0.48, -0.30],
        [0.68, 1.28, 0.18],
        [0.08, 0.08, -0.52]
      );
      beaver.add(tail);

      [-0.16, 0.00, 0.16].forEach((offset) => {
        beaver.add(mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.62, 8),
          tailLine,
          [-0.52 + offset * 0.55, 0.49 + offset * 0.38, -0.206],
          [1, 1, 1],
          [Math.PI / 2, 0.28, -0.52]
        ));
        beaver.add(mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.62, 8),
          tailLine,
          [-0.52 + offset * 0.55, 0.49 - offset * 0.38, -0.207],
          [1, 1, 1],
          [Math.PI / 2, -0.28, -0.52]
        ));
      });

      // Feet: larger, softer and more mascot-like.
      const leftFoot = mesh(new THREE.SphereGeometry(0.25, 24, 18), pawMat, [-0.25, 0.16, 0.08], [1.18, 0.58, 1.42]);
      const rightFoot = mesh(new THREE.SphereGeometry(0.25, 24, 18), pawMat, [0.25, 0.16, 0.08], [1.18, 0.58, 1.42]);
      beaver.add(leftFoot);
      beaver.add(rightFoot);

      [-0.31, -0.24, -0.17, 0.17, 0.24, 0.31].forEach((x) => {
        beaver.add(mesh(new THREE.SphereGeometry(0.060, 14, 10), furDark, [x, 0.12, 0.29], [1.0, 0.56, 0.88]));
      });

      // Rounded body and soft belly.
      beaver.add(mesh(new THREE.SphereGeometry(0.56, 32, 26), fur, [0, 0.78, 0], [0.90, 1.20, 0.76]));
      beaver.add(mesh(new THREE.SphereGeometry(0.40, 30, 24), cream, [0, 0.78, 0.40], [0.82, 1.08, 0.20]));
      beaver.add(mesh(new THREE.SphereGeometry(0.30, 28, 22), furMid, [0, 1.07, 0.16], [0.92, 0.80, 0.42]));

      // Arms with rounded paws. References are kept for trot animation.
      const leftArm = mesh(new THREE.CapsuleGeometry(0.11, 0.30, 8, 16), fur, [-0.47, 0.89, 0.10], [1.0, 1.0, 1.0], [0, 0, -0.38]);
      const rightArm = mesh(new THREE.CapsuleGeometry(0.11, 0.30, 8, 16), fur, [0.47, 0.89, 0.10], [1.0, 1.0, 1.0], [0, 0, 0.38]);
      beaver.add(leftArm);
      beaver.add(rightArm);

      const leftPaw = mesh(new THREE.SphereGeometry(0.145, 20, 16), furLight, [-0.50, 0.68, 0.27], [0.92, 0.72, 1.00]);
      const rightPaw = mesh(new THREE.SphereGeometry(0.145, 20, 16), furLight, [0.50, 0.68, 0.27], [0.92, 0.72, 1.00]);
      beaver.add(leftPaw);
      beaver.add(rightPaw);
      beaver.userData.trotParts = { leftFoot, rightFoot, leftArm, rightArm };

      // Oversized mascot head with full cheeks.
      beaver.add(mesh(new THREE.SphereGeometry(0.52, 36, 30), furMid, [0, 1.58, 0.015], [1.08, 0.96, 0.93]));
      beaver.add(mesh(new THREE.SphereGeometry(0.34, 30, 24), furLight, [-0.25, 1.48, 0.21], [0.96, 0.90, 0.72]));
      beaver.add(mesh(new THREE.SphereGeometry(0.34, 30, 24), furLight, [0.25, 1.48, 0.21], [0.96, 0.90, 0.72]));

      // Rounded ears with warm inner-ear pads.
      beaver.add(mesh(new THREE.SphereGeometry(0.17, 24, 18), furDark, [-0.38, 1.82, -0.015], [1.02, 1.02, 0.82]));
      beaver.add(mesh(new THREE.SphereGeometry(0.17, 24, 18), furDark, [0.38, 1.82, -0.015], [1.02, 1.02, 0.82]));
      beaver.add(mesh(new THREE.SphereGeometry(0.098, 20, 16), cream, [-0.38, 1.82, 0.07], [1.0, 1.0, 0.50]));
      beaver.add(mesh(new THREE.SphereGeometry(0.098, 20, 16), cream, [0.38, 1.82, 0.07], [1.0, 1.0, 0.50]));

      // Big expressive eyes: sclera + iris + pupil + two highlights.
      const eyeY = 1.67;
      const eyeZ = 0.405;
      [-0.18, 0.18].forEach((x, index) => {
        beaver.add(mesh(new THREE.SphereGeometry(0.115, 28, 22), white, [x, eyeY, eyeZ], [0.92, 1.12, 0.64]));
        beaver.add(mesh(new THREE.SphereGeometry(0.070, 24, 18), iris, [x + (index === 0 ? 0.012 : -0.012), eyeY - 0.005, 0.476], [1, 1.08, 0.72]));
        beaver.add(mesh(new THREE.SphereGeometry(0.040, 20, 16), eyeGloss, [x + (index === 0 ? 0.016 : -0.016), eyeY - 0.008, 0.514], [1, 1.06, 0.75]));
        beaver.add(mesh(new THREE.SphereGeometry(0.016, 12, 10), white, [x - 0.018, eyeY + 0.034, 0.544]));
        beaver.add(mesh(new THREE.SphereGeometry(0.008, 10, 8), white, [x + 0.018, eyeY - 0.018, 0.546]));
      });

      // Soft expressive brows.
      const browMat = furDark;
      beaver.add(mesh(new THREE.TorusGeometry(0.105, 0.018, 8, 20, Math.PI * 0.72), browMat, [-0.18, 1.785, 0.405], [1, 0.70, 1], [0, 0, 0.30]));
      beaver.add(mesh(new THREE.TorusGeometry(0.105, 0.018, 8, 20, Math.PI * 0.72), browMat, [0.18, 1.785, 0.405], [1, 0.70, 1], [0, 0, 2.28]));

      // Plush muzzle with two full cheek pads.
      beaver.add(mesh(new THREE.SphereGeometry(0.235, 32, 26), creamLight, [-0.145, 1.48, 0.48], [1.02, 0.82, 0.66]));
      beaver.add(mesh(new THREE.SphereGeometry(0.235, 32, 26), creamLight, [0.145, 1.48, 0.48], [1.02, 0.82, 0.66]));

      // Large rounded nose.
      beaver.add(mesh(new THREE.SphereGeometry(0.108, 28, 22), noseMat, [0, 1.57, 0.64], [1.28, 0.88, 0.78]));
      beaver.add(mesh(new THREE.SphereGeometry(0.022, 12, 10), white, [-0.030, 1.605, 0.712], [1.0, 0.70, 0.40]));

      // Open happy mouth, tongue and two signature incisors.
      beaver.add(mesh(new THREE.SphereGeometry(0.205, 28, 22), mouthMat, [0, 1.34, 0.50], [1.05, 0.62, 0.34]));
      beaver.add(mesh(new THREE.SphereGeometry(0.125, 22, 18), tongueMat, [0, 1.285, 0.595], [1.02, 0.46, 0.28]));

      const leftTooth = mesh(new THREE.BoxGeometry(0.090, 0.205, 0.060), tooth, [-0.049, 1.405, 0.645], [1, 1, 1], [0, 0, 0.025]);
      const rightTooth = mesh(new THREE.BoxGeometry(0.090, 0.205, 0.060), tooth, [0.049, 1.405, 0.645], [1, 1, 1], [0, 0, -0.025]);
      beaver.add(leftTooth);
      beaver.add(rightTooth);

      // Smile corners and lower lip for a more readable grin.
      beaver.add(mesh(new THREE.TorusGeometry(0.185, 0.019, 10, 30, Math.PI), furDark, [0, 1.405, 0.592], [1, 0.74, 1], [0, 0, Math.PI]));
      beaver.add(mesh(new THREE.TorusGeometry(0.120, 0.015, 10, 26, Math.PI), tongueMat, [0, 1.295, 0.624], [1, 0.58, 1], [0, 0, 0]));

      // Rosy cheeks, subtle and low-saturation.
      const cheekMat = material(0xe69b7f, 0.84);
      beaver.add(mesh(new THREE.SphereGeometry(0.060, 16, 12), cheekMat, [-0.31, 1.45, 0.47], [1.25, 0.48, 0.28]));
      beaver.add(mesh(new THREE.SphereGeometry(0.060, 16, 12), cheekMat, [0.31, 1.45, 0.47], [1.25, 0.48, 0.28]));

      // Small chest badge only — no vest and no backpack.
      beaver.add(mesh(new THREE.CylinderGeometry(0.070, 0.070, 0.024, 24), blue, [0, 1.055, 0.525], [1, 1, 1], [Math.PI / 2, 0, 0]));
      beaver.add(mesh(new THREE.SphereGeometry(0.021, 12, 10), white, [0, 1.055, 0.542]));

      // Vertical player beacon.
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
      beacon.add(mesh(new THREE.CylinderGeometry(0.105, 0.040, 6.8, 20, 1, true), beamMat, [0, 5.28, -0.02]));
      beacon.add(mesh(new THREE.CylinderGeometry(0.024, 0.016, 7.2, 14), coreMat, [0, 5.43, -0.02]));
      [2.30, 3.25, 4.25].forEach((y, index) => {
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

        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x40526a, 1.65));

        const key = new THREE.DirectionalLight(0xffffff, 2.2);
        key.position.set(-3, 7, 5);
        this.scene.add(key);

        const rim = new THREE.DirectionalLight(0xa997ff, 1.15);
        rim.position.set(4, 3, -4);
        this.scene.add(rim);

        this.renderer = new THREE.WebGLRenderer({
          canvas: mapInstance.getCanvas(),
          context: gl,
          antialias: true
        });
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
