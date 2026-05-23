import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import * as Location from 'expo-location';

export interface MapLocation {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
}

interface MapComponentProps {
  markers?: MapLocation[];
  center?: MapLocation;
  onMarkerPress?: (marker: MapLocation) => void;
  onLocationPress?: (location: MapLocation) => void;
  showUserLocation?: boolean;
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

// ─── Build Leaflet HTML map ────────────────────────────────────────────────

function buildLeafletHTML(
  center: MapLocation,
  markers: MapLocation[],
  showUserLocation: boolean,
): string {
  const markersJS = markers
    .map(
      (m) => `
      L.circleMarker([${m.latitude}, ${m.longitude}], {
        radius: 8, color: '#FFFFFF', weight: 2,
        fillColor: '#0F766E', fillOpacity: 1
      }).addTo(map).bindPopup(${JSON.stringify(m.title ?? '')});`,
    )
    .join('\n');

  const userLocationJS = showUserLocation
    ? `L.circleMarker([${center.latitude}, ${center.longitude}], {
        radius: 10, color: '#FFFFFF', weight: 2,
        fillColor: '#EC4899', fillOpacity: 1
      }).addTo(map);`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false })
      .setView([${center.latitude}, ${center.longitude}], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    ${markersJS}
    ${userLocationJS}

    map.on('click', function(e) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
        JSON.stringify({ lat: e.latlng.lat, lng: e.latlng.lng })
      );
    });
  </script>
</body>
</html>`;
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
          <View key={i} style={{
            position: 'absolute', left: r.x1, top: r.y1,
            width: len, height: 6, backgroundColor: '#b2d8d6',
            borderRadius: 3, transform: [{ rotate: `${angle}deg` }],
            transformOrigin: 'left center',
          }} />
        );
      })}
      {markers.map((m, i) => {
        const { x, y } = toXY(m.latitude, m.longitude);
        return <View key={i} style={[p.dot, p.dotTeal, { left: x - 7, top: y - 7 }]} />;
      })}
      {showUserLocation && (
        <View style={[p.dot, p.dotPink, {
          left: userPos.x - 9, top: userPos.y - 9, width: 18, height: 18, borderRadius: 9,
        }]} />
      )}
    </View>
  );
}

// ─── Main Map component ────────────────────────────────────────────────────

export function Map({
  markers = [],
  center,
  onMarkerPress,
  onLocationPress,
  showUserLocation = true,
  height = 300,
  style,
}: MapComponentProps) {
  const effectiveCenter = center ?? DEFAULT_CENTER;
  const [userLocation, setUserLocation] = useState<MapLocation | null>(null);
  const webViewRef = useRef<any>(null);

  useEffect(() => {
    if (!WebView) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    })();
  }, []);

  // No WebView (web platform) → show placeholder
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

  const mapCenter = userLocation && showUserLocation ? userLocation : effectiveCenter;
  const html = buildLeafletHTML(mapCenter, markers, showUserLocation);

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
            const { lat, lng } = JSON.parse(event.nativeEvent.data);
            onLocationPress?.({ latitude: lat, longitude: lng });
          } catch { /* ignore */ }
        }}
      />
    </View>
  );
}

const p = StyleSheet.create({
  dot: {
    position: 'absolute',
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  dotTeal: { backgroundColor: '#0F766E' },
  dotPink: { backgroundColor: '#EC4899' },
});
