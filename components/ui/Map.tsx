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

// Lazy-load WebView — not available on web platform
let WebView: any = null;
try {
  WebView = require('react-native-webview').WebView;
} catch { /* web fallback */ }

// ─── Build Leaflet HTML ─────────────────────────────────────────────────────
function buildLeafletHTML(
  mapCenter: MapLocation,
  userDot: MapLocation | null,
  markers: MapLocation[],
  zoom: number,
): string {
  // Serialize everything to JSON — no escaping nightmares
  const mData = JSON.stringify(markers.map(m => ({
    lat: m.latitude,
    lon: m.longitude,
    title: m.title ?? '',
    photo: m.photoUrl ?? null,
    id: m.markerId ?? m.title ?? '',
  })));

  const uLat = userDot ? userDot.latitude : null;
  const uLon = userDot ? userDot.longitude : null;

  // Build HTML with string concatenation — no backticks, no TypeScript parsing issues
  return [
    '<!DOCTYPE html><html><head>',
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">',
    '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>',
    '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>',
    '<style>',
    '* { margin:0; padding:0; box-sizing:border-box; }',
    'html,body,#map { width:100%; height:100%; }',
    '.sm { width:44px;height:44px;border-radius:50%;border:2.5px solid #fff;overflow:hidden;',
    '       box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer;background:#0F766E; }',
    '.sm img { width:100%;height:100%;object-fit:cover; }',
    '.si { width:100%;height:100%;display:flex;align-items:center;justify-content:center;',
    '      color:#fff;font-size:16px;font-weight:700; }',
    '.leaflet-control-zoom { border:none!important;border-radius:8px!important;overflow:hidden; }',
    '.leaflet-control-zoom a { border:none!important;background:rgba(255,255,255,.95)!important; }',
    '</style></head><body><div id="map"></div><script>',
    'var rnw = window.ReactNativeWebView || { postMessage: function(){} };',
    'var map = L.map("map", { zoomControl:true, attributionControl:false })',
    '  .setView([' + mapCenter.latitude + ',' + mapCenter.longitude + '], ' + zoom + ');',
    'L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom:19 }).addTo(map);',
    'var markers = ' + mData + ';',
    'markers.forEach(function(m) {',
    '  var init = (m.title || "?").charAt(0).toUpperCase();',
    '  var inner = m.photo',
    '    ? \'<img src="\' + m.photo + \'" onerror="this.outerHTML=\'<div class=si>\'+init+\'</div>">\'',
    '    : \'<div class="si">\' + init + \'</div>\';',
    '  var icon = L.divIcon({',
    '    className: "",',
    '    html: \'<div class="sm">\' + inner + \'</div>\',',
    '    iconSize: [44,44], iconAnchor: [22,22]',
    '  });',
    '  L.marker([m.lat, m.lon], { icon: icon }).addTo(map).on("click", function() {',
    '    rnw.postMessage(JSON.stringify({ type:"markerPress", id:m.id, title:m.title }));',
    '  });',
    '});',
    uLat !== null
      ? 'L.circleMarker([' + uLat + ',' + uLon + '], { radius:10, color:"#fff", weight:2.5, fillColor:"#EC4899", fillOpacity:1 }).addTo(map).bindTooltip("You");'
      : '',
    'map.on("click", function(e) {',
    '  rnw.postMessage(JSON.stringify({ type:"mapPress", lat:e.latlng.lat, lng:e.latlng.lng }));',
    '});',
    '</script></body></html>',
  ].join('\n');
}

// ─── Visual placeholder (web platform) ────────────────────────────────────
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
    { x1: mapW * 0.15, y1: 0, x2: mapW * 0.1, y2: mapH },
    { x1: mapW * 0.8, y1: 0, x2: mapW * 0.85, y2: mapH },
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
          <View
            key={i}
            style={{
              position: 'absolute',
              left: r.x1,
              top: r.y1,
              width: len,
              height: 6,
              backgroundColor: '#b2d8d6',
              borderRadius: 3,
              transform: [{ rotate: `${angle}deg` }],
              transformOrigin: 'left center',
            }}
          />
        );
      })}
      {markers.map((m, i) => {
        const { x, y } = toXY(m.latitude, m.longitude);
        return <View key={i} style={[p.dot, p.dotTeal, { left: x - 7, top: y - 7 }]} />;
      })}
      {showUserLocation && (
        <View
          style={[
            p.dot,
            p.dotPink,
            {
              left: userPos.x - 9,
              top: userPos.y - 9,
              width: 18,
              height: 18,
              borderRadius: 9,
            },
          ]}
        />
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

  const mapViewCenter = effectiveCenter;
  const userDot = showUserLocation
    ? (userLocationOverride ?? deviceLocation ?? null)
    : null;

  const html = buildLeafletHTML(mapViewCenter, userDot, markers, zoom);

  return (
    <View style={[{ height }, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={StyleSheet.absoluteFill}
        scrollEnabled={false}
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
          } catch {}
        }}
      />
    </View>
  );
}

const p = StyleSheet.create({
  dot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  dotTeal: { backgroundColor: '#0F766E' },
  dotPink: { backgroundColor: '#EC4899' },
});