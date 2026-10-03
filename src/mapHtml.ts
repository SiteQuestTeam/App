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

    const BEAVER_METERS_PER_UNIT = ${compact ? 3.4 : 4.2};
    let playerTransform = null;

    function updatePlayerTransform(lng, lat) {
      const mercator = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
      playerTransform = {
        translateX: mercator.x,
        translateY: mercator.y,
        translateZ: mercator.z,
        scale: mercator.meterInMercatorCoordinateUnits() * BEAVER_METERS_PER_UNIT,
        rotateX: Math.PI / 2,
        rotateY: 0,
        rotateZ: Math.PI
      };
    }

    updatePlayerTransform(playerPosition[0], playerPosition[1]);

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

      const fur = material(0x9a5f3c, 0.88);
      const furLight = material(0xc98757, 0.80);
      const furDark = material(0x563321, 0.92);
      const cream = material(0xffefd4, 0.76);
      const ink = material(0x101828, 0.40);
      const white = material(0xffffff, 0.50);
      const blue = material(0x2f6bff, 0.54);
      const deep = material(0x1746b7, 0.58);
      const violet = material(0x7657ff, 0.52);
      const tailMat = material(0x75452c, 0.92);

      // Flat paddle tail behind the body.
      beaver.add(mesh(
        new THREE.SphereGeometry(0.42, 18, 14),
        tailMat,
        [-0.48, 0.52, -0.28],
        [0.62, 1.18, 0.20],
        [0.05, 0.10, -0.48]
      ));

      // Feet.
      beaver.add(mesh(new THREE.SphereGeometry(0.22, 16, 12), furDark, [-0.23, 0.17, 0.04], [1.15, 0.55, 1.35]));
      beaver.add(mesh(new THREE.SphereGeometry(0.22, 16, 12), furDark, [0.23, 0.17, 0.04], [1.15, 0.55, 1.35]));

      // Body and belly.
      beaver.add(mesh(new THREE.SphereGeometry(0.52, 22, 18), fur, [0, 0.73, 0], [0.88, 1.18, 0.72]));
      beaver.add(mesh(new THREE.SphereGeometry(0.34, 20, 16), cream, [0, 0.76, 0.38], [0.78, 1.04, 0.22]));

      // Brand vest as an actual 3D shell.
      beaver.add(mesh(new THREE.SphereGeometry(0.54, 22, 18, 0, Math.PI * 2, 0.42, 1.45), blue, [0, 0.73, 0.03], [0.91, 1.08, 0.76]));
      beaver.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.035, 20), white, [0, 0.82, 0.47], [1, 1, 1], [Math.PI / 2, 0, 0]));
      beaver.add(mesh(new THREE.BoxGeometry(0.10, 0.025, 0.025), blue, [0, 0.82, 0.493]));
      beaver.add(mesh(new THREE.BoxGeometry(0.025, 0.10, 0.025), blue, [0, 0.82, 0.493]));

      // Arms.
      beaver.add(mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.40, 12), furDark, [-0.44, 0.79, 0.08], [1, 1, 1], [0, 0, -0.36]));
      beaver.add(mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.40, 12), furDark, [0.44, 0.79, 0.08], [1, 1, 1], [0, 0, 0.36]));

      // Violet backpack.
      beaver.add(mesh(new THREE.BoxGeometry(0.34, 0.52, 0.20), violet, [0.36, 0.83, -0.31], [1, 1, 1], [0, -0.18, -0.08]));
      beaver.add(mesh(new THREE.BoxGeometry(0.23, 0.07, 0.04), material(0xa997ff, 0.58), [0.36, 0.97, -0.425]));

      // Head and ears.
      beaver.add(mesh(new THREE.SphereGeometry(0.47, 24, 20), furLight, [0, 1.53, 0.02], [1.02, 0.91, 0.88]));
      beaver.add(mesh(new THREE.SphereGeometry(0.16, 18, 14), furDark, [-0.33, 1.75, -0.02]));
      beaver.add(mesh(new THREE.SphereGeometry(0.16, 18, 14), furDark, [0.33, 1.75, -0.02]));
      beaver.add(mesh(new THREE.SphereGeometry(0.09, 16, 12), material(0xd99b70, 0.8), [-0.33, 1.75, 0.06]));
      beaver.add(mesh(new THREE.SphereGeometry(0.09, 16, 12), material(0xd99b70, 0.8), [0.33, 1.75, 0.06]));

      // Face.
      beaver.add(mesh(new THREE.SphereGeometry(0.30, 20, 16), cream, [0, 1.42, 0.37], [1.08, 0.70, 0.42]));
      beaver.add(mesh(new THREE.SphereGeometry(0.075, 16, 12), ink, [0, 1.52, 0.54], [1.15, 0.75, 0.65]));
      beaver.add(mesh(new THREE.SphereGeometry(0.061, 16, 12), ink, [-0.17, 1.62, 0.39]));
      beaver.add(mesh(new THREE.SphereGeometry(0.061, 16, 12), ink, [0.17, 1.62, 0.39]));
      beaver.add(mesh(new THREE.SphereGeometry(0.018, 10, 8), white, [-0.153, 1.642, 0.444]));
      beaver.add(mesh(new THREE.SphereGeometry(0.018, 10, 8), white, [0.187, 1.642, 0.444]));

      // Beaver teeth.
      beaver.add(mesh(new THREE.BoxGeometry(0.095, 0.17, 0.055), white, [-0.052, 1.31, 0.55], [1, 1, 1], [0, 0, 0.025]));
      beaver.add(mesh(new THREE.BoxGeometry(0.095, 0.17, 0.055), white, [0.052, 1.31, 0.55], [1, 1, 1], [0, 0, -0.025]));

      // SiteQuest neck accent.
      beaver.add(mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 28), deep, [0, 1.18, 0.02], [1, 1, 0.78], [Math.PI / 2, 0, 0]));
      beaver.add(mesh(new THREE.SphereGeometry(0.055, 12, 10), violet, [0.29, 1.20, 0.34]));

      beaver.rotation.y = -0.16;
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

        const time = performance.now() * 0.001;
        this.beaver.position.y = 0.018 + Math.sin(time * 2.2) * 0.012;
        this.beaver.rotation.y = -0.16 + Math.sin(time * 1.3) * 0.035;

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

    function movePlayer(lng, lat, centerMap = true) {
      playerPosition = [lng, lat];
      updatePlayerTransform(lng, lat);
      map.triggerRepaint();
      if (centerMap) map.easeTo({ center: playerPosition, duration: 900, pitch: ${compact ? 52 : 66}, zoom:16.3 });
    }
    window.movePlayer = movePlayer;
    window.focusPlayer = () => map.easeTo({ center:playerPosition, zoom:16.5, pitch:${compact ? 52 : 66}, bearing:-24, duration:700 });
    window.focusInitiative = (id) => {
      const item = markers.find((marker) => marker.id === id);
      if (item) map.easeTo({ center:item.coordinates, zoom:16.8, pitch:${compact ? 52 : 68}, duration:700 });
    };
    map.on('click', (event) => {
      ${compact ? '' : "movePlayer(event.lngLat.lng,event.lngLat.lat,false);send('position',{longitude:event.lngLat.lng,latitude:event.lngLat.lat});"}
    });
  </script>
</body>
</html>`;
}
