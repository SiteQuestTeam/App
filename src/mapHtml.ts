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

    function makeRadiusPolygon(lng, lat, radiusMeters) {
      const points = [];
      const earth = 6378137;
      const latRad = lat * Math.PI / 180;
      for (let i = 0; i <= 64; i += 1) {
        const angle = i / 64 * Math.PI * 2;
        const dx = Math.cos(angle) * radiusMeters;
        const dy = Math.sin(angle) * radiusMeters;
        const dLat = dy / earth * 180 / Math.PI;
        const dLng = dx / (earth * Math.cos(latRad)) * 180 / Math.PI;
        points.push([lng + dLng, lat + dLat]);
      }
      return {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [points] }
      };
    }

    function updatePlayerRadius(lng, lat) {
      const source = map.getSource('sitequest-player-radius');
      if (source && source.setData) source.setData(makeRadiusPolygon(lng, lat, 50));
    }

    const BEAVER_METERS_PER_UNIT = ${compact ? 12 : 15};
    const BEAVER_GROUND_CLEARANCE_METERS = 1.2;
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
    let playerMovement = null;

    function geographicDistanceMeters(fromLng, fromLat, toLng, toLat) {
      const earthRadius = 6371000;
      const toRadians = (value) => value * Math.PI / 180;
      const lat1 = toRadians(fromLat);
      const lat2 = toRadians(toLat);
      const dLat = toRadians(toLat - fromLat);
      const dLng = toRadians(toLng - fromLng);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(lat1) * Math.cos(lat2)
        * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

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

    function updatePlayerTransform(lng, lat, immediate = false, duration = 0) {
      playerTargetTransform = createPlayerTransform(lng, lat);

      if (!playerTransform || immediate) {
        playerTransform = { ...playerTargetTransform };
        playerMovement = null;
        playerIsMoving = false;
        return;
      }

      playerMovement = {
        from: { ...playerTransform },
        to: { ...playerTargetTransform },
        startedAt: performance.now(),
        duration: Math.max(360, duration || 900),
      };
      playerIsMoving = true;
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

    function createBeaver3D() {
      const beaver = new THREE.Group();
      beaver.name = 'SiteQuest Beaver';
      // Smooth toy materials stay readable at the small on-map avatar size.
      const fur = material(0xbc783e, 0.90, 0);
      const furWarm = material(0xd89551, 0.86, 0);
      const furDark = material(0x86502e, 0.90, 0);
      const cream = material(0xf2ce8c, 0.88, 0);
      const creamLight = material(0xffdfaa, 0.86, 0);
      const pawMat = material(0x94603e, 0.88, 0);
      const jacketBlue = material(0x3981df, 0.78, 0);
      const jacketDark = material(0x2c67ba, 0.84, 0);
      const tooth = material(0xfff5dd, 0.65, 0);
      const white = material(0xfff9ea, 0.60, 0);
      const eyeMat = material(0x39281e, 0.35, 0);
      const noseMat = material(0x513525, 0.52, 0);
      const cheekMat = material(0xe4a27b, 0.92, 0);
      const sphere = new THREE.SphereGeometry(1, 24, 18);
      const soft = (mat, position, scale, parent = beaver) => {
        const part = mesh(sphere, mat, position, scale);
        parent.add(part);
        return part;
      };
      const tube = (points, radius, mat, parent = beaver) => {
        const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
        const part = new THREE.Mesh(new THREE.TubeGeometry(path, 16, radius, 6, false), mat);
        parent.add(part);
        return part;
      };
      const roundedBox = (width, height, depth, radius) => {
        const shape = new THREE.Shape();
        const x = -width / 2;
        const y = -height / 2;
        shape.moveTo(x + radius, y);
        shape.lineTo(x + width - radius, y);
        shape.quadraticCurveTo(x + width, y, x + width, y + radius);
        shape.lineTo(x + width, y + height - radius);
        shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        shape.lineTo(x + radius, y + height);
        shape.quadraticCurveTo(x, y + height, x, y + height - radius);
        shape.lineTo(x, y + radius);
        shape.quadraticCurveTo(x, y, x + radius, y);
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: depth - 2 * radius, bevelEnabled: true,
          bevelSize: radius, bevelThickness: radius, bevelSegments: 3, curveSegments: 4,
        });
        geometry.translate(0, 0, -depth / 2 + radius);
        return geometry;
      };

      // Low rounded paddle; no loose crosshatch pieces.
      const tail = soft(furDark, [-0.47, 0.30, -0.27], [0.43, 0.25, 0.095]);
      tail.rotation.z = -0.18;
      soft(fur, [0, 0.74, 0], [0.49, 0.61, 0.385]);
      soft(cream, [0, 0.53, 0.344], [0.28, 0.27, 0.080]);

      // Feet carry their toes so all of the paw follows each trot step.
      const makeFoot = (side) => {
        const foot = new THREE.Group();
        foot.name = side < 0 ? 'Left foot' : 'Right foot';
        foot.position.set(side * 0.24, 0.145, 0.04);
        soft(pawMat, [0, 0, 0.035], [0.245, 0.13, 0.30], foot);
        [-0.075, 0.075].forEach((x) => soft(pawMat, [x, -0.015, 0.255], [0.062, 0.075, 0.072], foot));
        beaver.add(foot);
        return foot;
      };
      const leftFoot = makeFoot(-1);
      const rightFoot = makeFoot(1);

      // A single curved shell hugs the body, with a continuous front and back.
      const vestProfile = new THREE.SplineCurve([
        [0.510, 0.72], [0.515, 0.76], [0.520, 0.88],
        [0.510, 1.00], [0.470, 1.14], [0.340, 1.24], [0.260, 1.27],
      ].map(([radius, y]) => new THREE.Vector2(radius, y)));
      const vestGeometry = new THREE.LatheGeometry(
        vestProfile.getPoints(36).map((point) => new THREE.Vector2(Math.max(0, point.x), point.y)), 32
      );
      beaver.add(mesh(vestGeometry, jacketBlue, [0, 0, 0], [1, 1, 0.82]));
      tube([[0, 0.735, 0.427], [0, 0.96, 0.432], [0, 1.17, 0.372]], 0.009, jacketDark);
      [-1, 1].forEach((side) => {
        const collar = soft(jacketBlue, [side * 0.16, 1.24, 0.16], [0.17, 0.050, 0.11]);
        collar.rotation.z = side * 0.18;
        tube([[side * 0.20, 0.80, 0.401], [side * 0.29, 0.84, 0.364]], 0.011, jacketDark);
      });

      // Shoulder pivots move complete rounded arms, including the mittens.
      const makeArm = (side) => {
        const arm = new THREE.Group();
        arm.name = side < 0 ? 'Left arm' : 'Right arm';
        arm.position.set(side * 0.45, 1.06, 0.035);
        arm.rotation.z = side * 0.32;
        soft(fur, [0, -0.16, 0], [0.11, 0.245, 0.11], arm);
        soft(cream, [0, -0.36, 0.07], [0.145, 0.12, 0.135], arm);
        beaver.add(arm);
        return arm;
      };
      const leftArm = makeArm(-1);
      const rightArm = makeArm(1);
      beaver.userData.trotParts = { leftFoot, rightFoot, leftArm, rightArm };

      // One clear head silhouette, with small integrated ears and a gentle face.
      soft(furWarm, [0, 1.58, 0], [0.565, 0.525, 0.445]);
      [-1, 1].forEach((side) => {
        soft(furWarm, [side * 0.40, 1.94, -0.025], [0.125, 0.135, 0.095]);
        soft(furDark, [side * 0.40, 1.945, 0.060], [0.070, 0.080, 0.018]);
        // Mostly dark eyes with narrow ivory rims, seated against the head.
        soft(white, [side * 0.18, 1.745, 0.401], [0.083, 0.109, 0.040]);
        soft(eyeMat, [side * 0.18, 1.744, 0.435], [0.065, 0.084, 0.027]);
        soft(white, [side * 0.18 - 0.020, 1.772, 0.461], [0.017, 0.022, 0.006]);
        soft(creamLight, [side * 0.12, 1.535, 0.435], [0.210, 0.145, 0.125]);
        soft(cheekMat, [side * 0.337, 1.512, 0.348], [0.048, 0.025, 0.010]);
      });
      soft(noseMat, [0, 1.632, 0.546], [0.105, 0.074, 0.068]);
      tube([[-0.16, 1.415, 0.514], [0, 1.379, 0.535], [0.16, 1.415, 0.514]], 0.010, furDark);
      [-1, 1].forEach((side) => {
        beaver.add(mesh(roundedBox(0.065, 0.079, 0.032, 0.007), tooth, [side * 0.034, 1.422, 0.540]));
      });

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
        return buildingHeight + 1.2;
      } catch {
        return 1.2;
      }
    }

    function drawInitiativeGlyph(ctx, marker, cx, cy) {
      ctx.save();
      ctx.strokeStyle = '#FFFFFF';
      ctx.fillStyle = '#FFFFFF';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (marker === 'R') {
        ctx.beginPath();
        ctx.arc(cx - 26, cy - 10, 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + 30, cy - 16, 19, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 70, cy + 62);
        ctx.quadraticCurveTo(cx - 62, cy + 18, cx - 24, cy + 18);
        ctx.quadraticCurveTo(cx + 18, cy + 18, cx + 27, cy + 62);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 22, cy + 29);
        ctx.quadraticCurveTo(cx + 63, cy + 29, cx + 72, cy + 62);
        ctx.stroke();
      } else if (marker === 'Z') {
        ctx.beginPath();
        ctx.arc(cx - 38, cy + 28, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + 38, cy + 28, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 18, cy + 28);
        ctx.lineTo(cx + 18, cy + 28);
        ctx.moveTo(cx - 48, cy - 46);
        ctx.lineTo(cx - 63, cy + 4);
        ctx.moveTo(cx + 48, cy - 46);
        ctx.lineTo(cx + 63, cy + 4);
        ctx.moveTo(cx - 18, cy - 34);
        ctx.lineTo(cx + 18, cy - 34);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(cx - 40, cy + 68);
        ctx.lineTo(cx - 40, cy - 58);
        ctx.moveTo(cx - 31, cy - 50);
        ctx.lineTo(cx + 48, cy - 50);
        ctx.lineTo(cx + 28, cy - 12);
        ctx.lineTo(cx + 48, cy + 22);
        ctx.lineTo(cx - 31, cy + 22);
        ctx.stroke();
      }
      ctx.restore();
    }

    function createInitiativeTexture(item, selected = false) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 768;
      const ctx = canvas.getContext('2d');
      const color = item.color;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Soft footprint shadow.
      ctx.save();
      ctx.globalAlpha = selected ? 0.28 : 0.18;
      ctx.fillStyle = '#101828';
      ctx.beginPath();
      ctx.ellipse(256, 702, selected ? 104 : 92, selected ? 30 : 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Ground ring.
      ctx.save();
      ctx.globalAlpha = selected ? 0.34 : 0.20;
      ctx.strokeStyle = color;
      ctx.lineWidth = selected ? 18 : 14;
      ctx.beginPath();
      ctx.ellipse(256, 672, selected ? 126 : 112, selected ? 40 : 34, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Flat stem.
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(230, 390, 52, 250, 26);
      ctx.fill();

      // Base foot.
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(256, 635, 83, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(256, 635, 67, 25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head outer halo.
      ctx.save();
      ctx.globalAlpha = selected ? 0.30 : 0.15;
      ctx.strokeStyle = color;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(256, 270, selected ? 182 : 170, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // White outer plate.
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(256, 270, 150, 0, Math.PI * 2);
      ctx.fill();

      // Colored core.
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(256, 270, 126, 0, Math.PI * 2);
      ctx.fill();

      // Subtle flat highlight.
      const gradient = ctx.createLinearGradient(170, 150, 340, 390);
      gradient.addColorStop(0, 'rgba(255,255,255,0.26)');
      gradient.addColorStop(0.45, 'rgba(255,255,255,0.02)');
      gradient.addColorStop(1, 'rgba(16,24,40,0.10)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(256, 270, 126, 0, Math.PI * 2);
      ctx.fill();

      drawInitiativeGlyph(ctx, item.marker, 256, 270);

      if (selected) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(256, 270, 138, 0, Math.PI * 2);
        ctx.stroke();
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      return texture;
    }

    const initiativeFlatLayer = {
      id: 'sitequest-initiatives-flat',
      type: 'custom',
      renderingMode: '3d',
      onAdd(mapInstance, gl) {
        this.map = mapInstance;
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();

        this.entries = markers.map((item, index) => {
          const mercator = maplibregl.MercatorCoordinate.fromLngLat(
            item.coordinates,
            getInitiativeElevation(item.coordinates[0], item.coordinates[1]),
          );
          const meterScale = mercator.meterInMercatorCoordinateUnits();
          const normalTexture = createInitiativeTexture(item, false);
          const selectedTexture = createInitiativeTexture(item, true);

          const material = new THREE.MeshBasicMaterial({
            map: normalTexture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide,
            toneMapped: false,
          });

          // A real flat model: one textured plane, no volume/depth.
          // Geometry uses local XY so after the MapLibre X rotation it stands upright.
          const geometry = new THREE.PlaneGeometry(1, 1.50);
          // Anchor the flat model at its bottom edge so its geographic point stays on the ground.
          geometry.translate(0, 0.75, 0);
          const plane = new THREE.Mesh(geometry, material);
          plane.matrixAutoUpdate = false;
          plane.frustumCulled = false;
          plane.renderOrder = 80 + index;

          plane.userData.itemId = item.id;
          plane.userData.normalTexture = normalTexture;
          plane.userData.selectedTexture = selectedTexture;
          plane.userData.mercator = mercator;
          plane.userData.meterScale = meterScale;
          plane.userData.baseSizeMeters = 34;

          this.scene.add(plane);
          return { item, plane };
        });

        this.renderer = new THREE.WebGLRenderer({
          canvas: mapInstance.getCanvas(),
          context: gl,
          antialias: true,
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.autoClear = false;
      },
      render(gl, args) {
        const projectionMatrix = args?.defaultProjectionData?.mainMatrix || args;
        if (!projectionMatrix || projectionMatrix.length !== 16) return;

        const mapMatrix = new THREE.Matrix4().fromArray(projectionMatrix);
        this.camera.projectionMatrix.copy(mapMatrix);

        const selectedId = window.__selectedInitiativeId;
        const bearingRadians = THREE.MathUtils.degToRad(this.map.getBearing());

        this.entries.forEach(({ item, plane }) => {
          const selected = item.id === selectedId;
          const texture = selected ? plane.userData.selectedTexture : plane.userData.normalTexture;
          if (plane.material.map !== texture) {
            plane.material.map = texture;
            plane.material.needsUpdate = true;
          }

          const selectedScale = selected ? 1.16 : 1;
          const mercator = plane.userData.mercator;
          const meterScale = plane.userData.meterScale;

          // Same world-space transform pattern as the previously visible 3D points:
          // fixed Mercator position + meter-based scale + MapLibre axis conversion.
          // The local Y rotation counteracts map bearing so the flat model faces the camera.
          const rotationX = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(1, 0, 0),
            Math.PI / 2,
          );
          const faceCamera = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 1, 0),
            -bearingRadians,
          );

          const modelMatrix = new THREE.Matrix4()
            .makeTranslation(mercator.x, mercator.y, mercator.z)
            .scale(new THREE.Vector3(
              meterScale * plane.userData.baseSizeMeters * selectedScale,
              -meterScale * plane.userData.baseSizeMeters * selectedScale,
              meterScale * plane.userData.baseSizeMeters * selectedScale,
            ))
            .multiply(rotationX)
            .multiply(faceCamera);

          plane.matrix.copy(modelMatrix);
          plane.material.opacity = selected ? 1 : 0.98;
        });

        // POIs are UI-like world objects: draw them over building depth so they cannot disappear
        // inside 3D extrusions while still remaining fixed to geographic coordinates.
        gl.clear(gl.DEPTH_BUFFER_BIT);
        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);
      },
    };

    window.__selectedInitiativeId = markers[0]?.id || null;

    function setSelectedInitiative(id) {
      window.__selectedInitiativeId = id;
      map.triggerRepaint();
    }

    function activateInitiative(item) {
      if (!item) return;
      setSelectedInitiative(item.id);
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
      let winnerDistance = 110;
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

        if (playerMovement) {
          const elapsed = performance.now() - playerMovement.startedAt;
          const linearProgress = Math.min(1, elapsed / playerMovement.duration);
          const progress = linearProgress < 0.5
            ? 4 * linearProgress * linearProgress * linearProgress
            : 1 - Math.pow(-2 * linearProgress + 2, 3) / 2;

          playerTransform.translateX = playerMovement.from.translateX
            + (playerMovement.to.translateX - playerMovement.from.translateX) * progress;
          playerTransform.translateY = playerMovement.from.translateY
            + (playerMovement.to.translateY - playerMovement.from.translateY) * progress;
          playerTransform.translateZ = playerMovement.from.translateZ
            + (playerMovement.to.translateZ - playerMovement.from.translateZ) * progress;
          playerTransform.scale = playerMovement.from.scale
            + (playerMovement.to.scale - playerMovement.from.scale) * progress;

          if (linearProgress >= 1) {
            playerTransform = { ...playerMovement.to };
            playerMovement = null;
            playerIsMoving = false;
          }
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
      if (!map.getSource('sitequest-player-radius')) {
        map.addSource('sitequest-player-radius', {
          type: 'geojson',
          data: makeRadiusPolygon(playerPosition[0], playerPosition[1], 50)
        });
        map.addLayer({
          id: 'sitequest-player-radius-fill',
          type: 'fill',
          source: 'sitequest-player-radius',
          paint: { 'fill-color': '#2F6BFF', 'fill-opacity': 0.08 }
        });
        map.addLayer({
          id: 'sitequest-player-radius-line',
          type: 'line',
          source: 'sitequest-player-radius',
          paint: { 'line-color': '#2F6BFF', 'line-width': 2, 'line-opacity': 0.52 }
        });
      }
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
      if (!map.getLayer(initiativeFlatLayer.id)) map.addLayer(initiativeFlatLayer);
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
      const isFirstFix = !playerHasFix;
      const previousPosition = playerPosition;
      const distance = isFirstFix
        ? Infinity
        : geographicDistanceMeters(previousPosition[0], previousPosition[1], lng, lat);

      playerPosition = [lng, lat];
      playerHasFix = true;

      if (isFirstFix || distance > 500) {
        updatePlayerTransform(lng, lat, true);
      } else {
        const walkDuration = Math.min(4200, Math.max(650, 650 + distance * 7));
        updatePlayerTransform(lng, lat, false, walkDuration);
      }

      updatePlayerRadius(lng, lat);
      map.triggerRepaint();

      if (isFirstFix || centerMap) {
        playerAnchored = true;
        userInteractingWithMap = false;
        headingResumeAt = 0;
        send('anchor', { active: true });
      }

      if (playerAnchored) {
        const cameraDuration = isFirstFix || distance > 500
          ? 700
          : Math.min(1600, Math.max(420, 420 + distance * 2));
        syncAnchoredCamera(cameraDuration, isFirstFix);
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
      setSelectedInitiative(item.id);
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
