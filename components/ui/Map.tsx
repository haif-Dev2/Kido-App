import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

export interface MapLocation {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  photoUrl?: string;
  markerId?: string;
}

interface MapComponentProps {
  markers?: MapLocation[];
  center?: MapLocation;
  userLocationOverride?: MapLocation | null;
  onMarkerPress?: (marker: MapLocation) => void;
  onLocationPress?: (location: MapLocation) => void;
  showUserLocation?: boolean;
  zoom?: number;
  height?: number | string;
  style?: any;
}

const DEFAULT_CENTER = { latitude: 36.7372, longitude: 3.0869 };
const LAT_SPAN = 0.12;
const LNG_SPAN = 0.18;

let WebView: any = null;
try {
  WebView = require('react-native-webview').WebView;
} catch { /* web fallback */ }

// ─── Build Leaflet HTML (Simple stable zoom) ─────────────
function buildLeafletHTML(
  mapCenter: MapLocation,
  userDot: MapLocation | null,
  markers: MapLocation[],
  zoom: number,
): string {
  const mData = JSON.stringify(markers.map(m => ({
    lat: m.latitude,
    lon: m.longitude,
    title: m.title ?? '',
    photo: m.photoUrl ?? null,
    id: m.markerId ?? m.title ?? '',
  })));

  const uLat = userDot ? userDot.latitude : null;
  const uLon = userDot ? userDot.longitude : null;

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%;overflow:hidden;background:#e8f0f0}
#zoomIn,#zoomOut{
  position:fixed;right:12px;background:rgba(255,255,255,0.95);
  border:none;border-radius:8px;width:36px;height:36px;
  font-size:22px;font-weight:700;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 2px 6px rgba(0,0,0,0.2);color:#333;z-index:10;
  -webkit-tap-highlight-color:transparent;
}
#zoomIn{top:12px}#zoomOut{top:56px}
</style>
</head>
<body>
<div id="map"></div>
<button id="zoomIn">+</button>
<button id="zoomOut">−</button>
<script>
(function(){
var rnw=window.ReactNativeWebView||{postMessage:function(){}};
var W=window.innerWidth,H=window.innerHeight;
var canvas=document.createElement('canvas');
canvas.width=W;canvas.height=H;
canvas.style.position='absolute';canvas.style.top='0';canvas.style.left='0';
document.getElementById('map').appendChild(canvas);
var ctx=canvas.getContext('2d');

// ── State ──────────────────────────────────────────────────────────────────
var centerLat=${mapCenter.latitude};
var centerLng=${mapCenter.longitude};
var z=${zoom};
var zFrac=${zoom};
var tileSize=256;
var tileCache={};

// Touch state
var moved=false;
var touchStartX=0,touchStartY=0,touchStartLat=0,touchStartLng=0;
var pinchActive=false;
var pinchStartDist=0;
var pinchStartZFrac=${zoom};

// Redraw scheduler
var drawPending=false;
function scheduleDraw(){
  if(drawPending)return;
  drawPending=true;
  requestAnimationFrame(function(){drawPending=false;draw();});
}

// ── Projection helpers ─────────────────────────────────────────────────────
function lngToWorldX(lng,zz){return((lng+180)/360)*Math.pow(2,zz)*tileSize;}
function latToWorldY(lat,zz){
  var r=lat*Math.PI/180;
  return(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*Math.pow(2,zz)*tileSize;
}
function latLngToPixel(lat,lng){
  var cx=lngToWorldX(centerLng,zFrac);
  var cy=latToWorldY(centerLat,zFrac);
  var tx=lngToWorldX(lng,zFrac);
  var ty=latToWorldY(lat,zFrac);
  return{x:W/2+(tx-cx),y:H/2+(ty-cy)};
}
function pixelToLatLng(px,py){
  var cx=lngToWorldX(centerLng,zFrac);
  var cy=latToWorldY(centerLat,zFrac);
  var tx=cx+(px-W/2);
  var ty=cy+(py-H/2);
  var n=Math.pow(2,zFrac);
  var lng=tx/(n*tileSize)*360-180;
  var latR=Math.atan(Math.sinh(Math.PI*(1-2*ty/(n*tileSize))));
  return{lat:latR*180/Math.PI,lng:lng};
}

// ── Tile loading ───────────────────────────────────────────────────────────
function loadTile(key,url){
  if(tileCache[key]||tileCache[key+'_p'])return;
  tileCache[key+'_p']=true;
  var img=new Image();
  img.crossOrigin='anonymous';
  img.onload=function(){
    delete tileCache[key+'_p'];
    tileCache[key]=img;
    scheduleDraw();
  };
  img.onerror=function(){delete tileCache[key+'_p'];};
  img.src=url;
}

// ── Draw ───────────────────────────────────────────────────────────────────
function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#e8f0f0';
  ctx.fillRect(0,0,W,H);

  var renderZ=Math.max(0,Math.min(19,Math.round(zFrac)));
  var scale=Math.pow(2,zFrac-renderZ);
  var n=Math.pow(2,renderZ);

  var cx=lngToWorldX(centerLng,renderZ);
  var cy=latToWorldY(centerLat,renderZ);

  var pad=3;
  var startTX=Math.floor((cx-(W/2)/scale)/tileSize)-pad;
  var startTY=Math.floor((cy-(H/2)/scale)/tileSize)-pad;
  var endTX=Math.ceil((cx+(W/2)/scale)/tileSize)+pad;
  var endTY=Math.ceil((cy+(H/2)/scale)/tileSize)+pad;

  ctx.save();
  ctx.translate(W/2,H/2);
  ctx.scale(scale,scale);
  ctx.translate(-W/2,-H/2);

  for(var tx=startTX;tx<=endTX;tx++){
    for(var ty=startTY;ty<=endTY;ty++){
      if(ty<0||ty>=n)continue;
      var wtx=((tx%n)+n)%n;
      var key=renderZ+'/'+wtx+'/'+ty;
      var px=W/2+(tx*tileSize-cx);
      var py=H/2+(ty*tileSize-cy);
      if(tileCache[key]){
        ctx.drawImage(tileCache[key],px,py,tileSize,tileSize);
      } else {
        ctx.fillStyle='#dde8e6';
        ctx.fillRect(px,py,tileSize,tileSize);
        loadTile(key,'https://tile.openstreetmap.org/'+renderZ+'/'+wtx+'/'+ty+'.png');
      }
    }
  }
  ctx.restore();

  drawMarkers();
}

var mData=${mData};

function drawMarkers(){
  mData.forEach(function(m){
    var p=latLngToPixel(m.lat,m.lon);
    ctx.beginPath();ctx.arc(p.x,p.y+2,20,0,2*Math.PI);
    ctx.fillStyle='rgba(0,0,0,0.12)';ctx.fill();
    ctx.beginPath();ctx.arc(p.x,p.y,18,0,2*Math.PI);
    ctx.fillStyle='#0F766E';ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle='#fff';
    ctx.font='bold 14px sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText((m.title||'?').charAt(0).toUpperCase(),p.x,p.y);
  });
  ${uLat !== null ? `
  var up=latLngToPixel(${uLat},${uLon});
  ctx.beginPath();ctx.arc(up.x,up.y+2,13,0,2*Math.PI);
  ctx.fillStyle='rgba(0,0,0,0.12)';ctx.fill();
  ctx.beginPath();ctx.arc(up.x,up.y,11,0,2*Math.PI);
  ctx.fillStyle='#EC4899';ctx.fill();
  ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();
  ` : ''}
}

// ── Touch helpers ──────────────────────────────────────────────────────────
function getTouchDist(e){
  var dx=e.touches[0].clientX-e.touches[1].clientX;
  var dy=e.touches[0].clientY-e.touches[1].clientY;
  return Math.sqrt(dx*dx+dy*dy);
}

// ── Touch handling ─────────────────────────────────────────────────────────
canvas.addEventListener('touchstart',function(e){
  e.preventDefault();
  if(e.touches.length===2){
    pinchActive=true;
    moved=true;
    pinchStartDist=getTouchDist(e);
    pinchStartZFrac=zFrac;
  } else if(e.touches.length===1){
    pinchActive=false;
    moved=false;
    touchStartX=e.touches[0].clientX;
    touchStartY=e.touches[0].clientY;
    touchStartLat=centerLat;
    touchStartLng=centerLng;
  }
},{passive:false});

canvas.addEventListener('touchmove',function(e){
  e.preventDefault();
  if(e.touches.length===2&&pinchActive){
    var dist=getTouchDist(e);
    var ratio=dist/pinchStartDist;
    var newZFrac=Math.max(1,Math.min(18,pinchStartZFrac+Math.log2(ratio)));
    if(Math.abs(newZFrac-zFrac)>0.01){
      zFrac=newZFrac;
      z=Math.round(zFrac);
      scheduleDraw();
    }
  } else if(e.touches.length===1&&!pinchActive){
    var dx=e.touches[0].clientX-touchStartX;
    var dy=e.touches[0].clientY-touchStartY;
    if(Math.abs(dx)>4||Math.abs(dy)>4)moved=true;
    if(!moved)return;
    var n=Math.pow(2,zFrac);
    var startCX=lngToWorldX(touchStartLng,zFrac);
    var startCY=latToWorldY(touchStartLat,zFrac);
    var newCX=startCX-dx;
    var newCY=startCY-dy;
    centerLng=newCX/(n*tileSize)*360-180;
    var lr=Math.atan(Math.sinh(Math.PI*(1-2*newCY/(n*tileSize))));
    centerLat=lr*180/Math.PI;
    scheduleDraw();
  }
},{passive:false});

canvas.addEventListener('touchend',function(e){
  e.preventDefault();
  if(e.touches.length<2&&pinchActive){
    zFrac=Math.round(zFrac);
    z=zFrac;
    tileCache={};
    pinchActive=false;
    draw();
    return;
  }
  if(!moved&&!pinchActive){
    var t=e.changedTouches[0];
    var cx=t.clientX,cy=t.clientY;
    var hit=null;
    mData.forEach(function(m){
      var p=latLngToPixel(m.lat,m.lon);
      var d=Math.sqrt((cx-p.x)*(cx-p.x)+(cy-p.y)*(cy-p.y));
      if(d<24)hit=m;
    });
    if(hit){rnw.postMessage(JSON.stringify({type:'markerPress',id:hit.id,title:hit.title}));}
    else{var ll=pixelToLatLng(cx,cy);rnw.postMessage(JSON.stringify({type:'mapPress',lat:ll.lat,lng:ll.lng}));}
  }
},{passive:false});

// ── Zoom buttons ───────────────────────────────────────────────────────────
document.getElementById('zoomIn').addEventListener('click',function(){
  if(zFrac<18){zFrac=Math.round(zFrac)+1;z=zFrac;tileCache={};scheduleDraw();}
});
document.getElementById('zoomOut').addEventListener('click',function(){
  if(zFrac>1){zFrac=Math.round(zFrac)-1;z=zFrac;tileCache={};scheduleDraw();}
});

draw();
})();
</script>
</body>
</html>`;
}

// ─── Visual placeholder ────────────────────────────────────────────────────
function MapPlaceholder({
  markers = [],
  center = DEFAULT_CENTER,
  showUserLocation,
  height,
  style,
}: MapComponentProps) {
  const { width: screenW } = useWindowDimensions();
  const mapW = screenW;
  const mapH = typeof height === 'number' ? height : 160;

  const toXY = (lat: number, lng: number) => {
    const x = ((lng - (center.longitude - LNG_SPAN / 2)) / LNG_SPAN) * mapW;
    const y = ((center.latitude + LAT_SPAN / 2 - lat) / LAT_SPAN) * mapH;
    return { x, y };
  };

  const roads = [
    { x1: 0, y1: mapH * 0.35, x2: mapW, y2: mapH * 0.4 },
    { x1: 0, y1: mapH * 0.65, x2: mapW, y2: mapH * 0.6 },
    { x1: mapW * 0.3, y1: 0, x2: mapW * 0.35, y2: mapH },
    { x1: mapW * 0.6, y1: 0, x2: mapW * 0.65, y2: mapH },
  ];

  const userPos = toXY(center.latitude, center.longitude);

  return (
    <View style={[{ height: mapH, width: '100%', backgroundColor: '#d4ecea', overflow: 'hidden' }, style]}>
      {roads.map((r, i) => {
        const dx = r.x2 - r.x1;
        const dy = r.y2 - r.y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View key={i} style={{
            position: 'absolute', left: r.x1, top: r.y1,
            width: len, height: 6, backgroundColor: '#b2d8d6',
            borderRadius: 3,
            transform: [{ rotate: `${angle}deg` }],
          }} />
        );
      })}
      {markers.map((m, i) => {
        const { x, y } = toXY(m.latitude, m.longitude);
        return <View key={i} style={[p.dot, p.dotTeal, { left: x - 7, top: y - 7 }]} />;
      })}
      {showUserLocation && (
        <View style={[p.dot, p.dotPink, { left: userPos.x - 9, top: userPos.y - 9, width: 18, height: 18, borderRadius: 9 }]} />
      )}
    </View>
  );
}

// ─── Main Map component ────────────────────────────────────────────────────
export function Map({
  markers = [],
  center,
  userLocationOverride,
  onMarkerPress,
  onLocationPress,
  showUserLocation = true,
  zoom = 13,
  height = 300,
  style,
}: MapComponentProps) {
  const effectiveCenter = center ?? DEFAULT_CENTER;
  const [deviceLocation, setDeviceLocation] = useState<MapLocation | null>(null);
  const webViewRef = useRef<any>(null);

  useEffect(() => {
    if (!WebView) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setDeviceLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch { /* location unavailable */ }
    })();
  }, []);

  if (!WebView) {
    return (
      <MapPlaceholder
        markers={markers}
        center={effectiveCenter}
        showUserLocation={showUserLocation}
        height={height}
        style={style}
      />
    );
  }

  const userDot = showUserLocation
    ? (userLocationOverride ?? deviceLocation ?? null)
    : null;

  const html = buildLeafletHTML(effectiveCenter, userDot, markers, zoom);

  return (
    <View style={[{ height }, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://tile.openstreetmap.org' }}
        style={StyleSheet.absoluteFill}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        allowUniversalAccessFromFileURLs={true}
        allowFileAccessFromFileURLs={true}
        allowFileAccess={true}
        onMessage={(event: any) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'markerPress') {
              const marker = markers.find(
                m => m.markerId === data.id || m.title === data.title
              );
              if (marker) onMarkerPress?.(marker);
            } else if (data.type === 'mapPress') {
              onLocationPress?.({ latitude: data.lat, longitude: data.lng });
            }
          } catch { }
        }}
      />
    </View>
  );
}

const p = StyleSheet.create({
  dot: {
    position: 'absolute', width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  dotTeal: { backgroundColor: '#0F766E' },
  dotPink: { backgroundColor: '#EC4899' },
});