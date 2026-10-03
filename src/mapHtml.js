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
    html,body,#map{width:100%;height:100%;margin:0;overflow:hidden;background:#e8edf5}
    *{box-sizing:border-box;font-family:Arial,sans-serif}
    .marker{position:relative;width:58px;height:76px;display:flex;flex-direction:column;align-items:center;cursor:pointer}
    .marker-dot{width:52px;height:52px;border:4px solid white;border-radius:50%;display:grid;place-items:center;color:white;font-weight:900;font-size:18px;box-shadow:0 0 0 3px currentColor,0 8px 18px rgba(16,24,40,.22)}
    .marker-tail{width:7px;height:18px;margin-top:-2px;border-radius:0 0 6px 6px;background:#fff;box-shadow:0 5px 10px rgba(16,24,40,.15)}
    .marker-label{position:absolute;top:73px;white-space:nowrap;padding:5px 9px;border:1px solid #DDE3EA;border-radius:999px;background:rgba(255,255,255,.96);color:#101828;font-size:10px;font-weight:700;box-shadow:0 5px 16px rgba(16,24,40,.1)}
    .player{width:58px;height:72px;position:relative;filter:drop-shadow(0 8px 8px rgba(16,24,40,.25))}
    .player-head{position:absolute;left:19px;top:2px;width:20px;height:20px;border:4px solid white;border-radius:50%;background:#7657FF}
    .player-body{position:absolute;left:14px;top:21px;width:30px;height:31px;border:4px solid white;border-radius:14px 14px 10px 10px;background:#2F6BFF}
    .player-leg{position:absolute;top:48px;width:10px;height:21px;border:3px solid white;border-radius:7px;background:#1746B7}
    .player-leg.one{left:16px;transform:rotate(8deg)}.player-leg.two{right:16px;transform:rotate(-8deg)}
    .player-you{position:absolute;left:13px;top:-22px;width:34px;padding:3px 0;border-radius:999px;background:#101828;color:white;text-align:center;font-size:9px;font-weight:900;letter-spacing:.08em}
    .maplibregl-ctrl-attrib{font-size:8px!important;background:rgba(255,255,255,.78)!important}
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
      zoom: ${compact ? 15.4 : 15.8},
      pitch: ${compact ? 48 : 61},
      bearing: -18,
      attributionControl: false,
      dragRotate: true,
      touchPitch: true
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: '© OpenStreetMap' }), 'bottom-right');

    const playerElement = document.createElement('div');
    playerElement.className = 'player';
    playerElement.innerHTML = '<span class="player-you">TY</span><span class="player-head"></span><span class="player-body"></span><span class="player-leg one"></span><span class="player-leg two"></span>';
    const playerMarker = new maplibregl.Marker({ element: playerElement, anchor: 'bottom' }).setLngLat(playerPosition).addTo(map);

    markers.forEach((item) => {
      const element = document.createElement('div');
      element.className = 'marker';
      element.style.color = item.color;
      element.innerHTML = '<span class="marker-dot" style="background:'+item.color+'">'+item.marker+'</span><span class="marker-tail"></span><span class="marker-label">'+item.title+'</span>';
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        send('initiative', { id: item.id });
        map.easeTo({ center: item.coordinates, duration: 650, zoom: 16.2 });
      });
      new maplibregl.Marker({ element, anchor: 'bottom' }).setLngLat(item.coordinates).addTo(map);
    });

    map.on('load', () => {
      const sourceId = map.getSource('openmaptiles') ? 'openmaptiles' : null;
      if (sourceId && !map.getLayer('sitequest-3d-buildings')) {
        const firstSymbol = map.getStyle().layers.find((layer) => layer.type === 'symbol');
        map.addLayer({
          id: 'sitequest-3d-buildings',
          source: sourceId,
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': ['interpolate',['linear'],['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],8],0,'#DDE3EA',60,'#B8C5D9'],
            'fill-extrusion-height': ['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],8],
            'fill-extrusion-base': ['coalesce',['to-number',['get','render_min_height']],0],
            'fill-extrusion-opacity': 0.78
          }
        }, firstSymbol?.id);
      }
      map.addSource('interaction-zone', {
        type: 'geojson',
        data: { type:'Feature', geometry:{ type:'Point', coordinates:playerPosition } }
      });
      map.addLayer({
        id:'interaction-zone-fill', type:'circle', source:'interaction-zone',
        paint:{ 'circle-radius':86, 'circle-color':'#2F6BFF', 'circle-opacity':0.12, 'circle-stroke-color':'#2F6BFF', 'circle-stroke-width':2, 'circle-stroke-opacity':0.8 }
      });
      send('ready');
    });

    function movePlayer(lng, lat, centerMap = true) {
      playerPosition = [lng, lat];
      playerMarker.setLngLat(playerPosition);
      const source = map.getSource('interaction-zone');
      source?.setData({ type:'Feature', geometry:{ type:'Point', coordinates:playerPosition } });
      if (centerMap) map.easeTo({ center: playerPosition, duration: 900, pitch: ${compact ? 48 : 61} });
    }
    window.movePlayer = movePlayer;
    window.focusPlayer = () => map.easeTo({ center:playerPosition, zoom:16.1, pitch:${compact ? 48 : 61}, duration:700 });
    window.focusInitiative = (id) => {
      const item = markers.find((marker) => marker.id === id);
      if (item) map.easeTo({ center:item.coordinates, zoom:16.3, pitch:${compact ? 48 : 61}, duration:700 });
    };
    map.on('click', (event) => {
      ${compact ? '' : "movePlayer(event.lngLat.lng,event.lngLat.lat,false);send('position',{longitude:event.lngLat.lng,latitude:event.lngLat.lat});"}
    });
  </script>
</body>
</html>`;
}
