import { KRAKOW_CENTER } from './data';

const escapeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

export function createMapHtml(initiatives, options = {}) {
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
    .player{width:70px;height:92px;position:relative;filter:drop-shadow(0 10px 10px rgba(16,24,40,.22));transform-origin:50% 100%}
    .player-shadow{position:absolute;left:15px;bottom:2px;width:40px;height:13px;border-radius:50%;background:rgba(16,24,40,.18);filter:blur(2px)}
    .player-ring{position:absolute;left:4px;bottom:-8px;width:62px;height:28px;border:3px solid rgba(47,107,255,.5);border-radius:50%;animation:playerPulse 2.8s ease-out infinite}
    .player-head{position:absolute;left:23px;top:9px;width:24px;height:24px;border:4px solid white;border-radius:50%;background:#7657FF;box-shadow:0 3px 8px rgba(16,24,40,.16)}
    .player-body{position:absolute;left:18px;top:31px;width:34px;height:34px;border:4px solid white;border-radius:15px 15px 11px 11px;background:linear-gradient(180deg,#2F6BFF,#1746B7)}
    .player-pack{position:absolute;left:10px;top:36px;width:15px;height:25px;border:3px solid white;border-radius:9px;background:#7657FF}
    .player-leg{position:absolute;top:61px;width:11px;height:24px;border:3px solid white;border-radius:8px;background:#1746B7}
    .player-leg.one{left:20px;transform:rotate(7deg)}.player-leg.two{right:20px;transform:rotate(-7deg)}
    .player-you{position:absolute;left:16px;top:-17px;width:38px;padding:4px 0;border-radius:999px;background:#101828;color:white;text-align:center;font-size:9px;font-weight:900;letter-spacing:.08em;box-shadow:0 4px 10px rgba(16,24,40,.18)}
    @keyframes playerPulse{0%{transform:scale(.75);opacity:.5}75%,100%{transform:scale(1.35);opacity:0}}
    .maplibregl-ctrl-attrib{font-size:8px!important;background:rgba(255,255,255,.88)!important;color:#667085!important}
    .maplibregl-ctrl-logo{display:none!important}
    ${compact ? '.marker-label{display:none}.maplibregl-ctrl-bottom-right{display:none}' : ''}
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
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

    const playerElement = document.createElement('div');
    playerElement.className = 'player';
    playerElement.innerHTML = '<span class="player-you">TY</span><span class="player-ring"></span><span class="player-shadow"></span><span class="player-pack"></span><span class="player-head"></span><span class="player-body"></span><span class="player-leg one"></span><span class="player-leg two"></span>';
    const playerMarker = new maplibregl.Marker({ element: playerElement, anchor: 'bottom' }).setLngLat(playerPosition).addTo(map);

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
      map.addSource('interaction-zone', {
        type: 'geojson',
        data: { type:'Feature', geometry:{ type:'Point', coordinates:playerPosition } }
      });
      map.addLayer({
        id:'interaction-zone-fill', type:'circle', source:'interaction-zone',
        paint:{ 'circle-radius':96, 'circle-color':'#2F6BFF', 'circle-opacity':0.10, 'circle-stroke-color':'#2F6BFF', 'circle-stroke-width':2.5, 'circle-stroke-opacity':0.78, 'circle-blur':0.08 }
      });
      send('ready');
    });

    function movePlayer(lng, lat, centerMap = true) {
      playerPosition = [lng, lat];
      playerMarker.setLngLat(playerPosition);
      const source = map.getSource('interaction-zone');
      source?.setData({ type:'Feature', geometry:{ type:'Point', coordinates:playerPosition } });
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
