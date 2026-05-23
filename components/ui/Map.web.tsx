import React from 'react';
import { View, StyleSheet } from 'react-native';

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

export function Map({
  markers = [],
  center = DEFAULT_CENTER,
  showUserLocation = true,
  height = 300,
  style,
}: MapComponentProps) {
  const mapH = typeof height === 'number' ? height : 300;

  const toPercent = (lat: number, lng: number) => {
    const x = ((lng - (center.longitude - LNG_SPAN / 2)) / LNG_SPAN) * 100;
    const y = ((center.latitude + LAT_SPAN / 2 - lat) / LAT_SPAN) * 100;
    return { x: Math.min(Math.max(x, 2), 97), y: Math.min(Math.max(y, 2), 97) };
  };

  const userPos = toPercent(center.latitude, center.longitude);

  const roads = [
    { x1: 0, y1: 35, x2: 100, y2: 40, w: 0.6 },
    { x1: 0, y1: 65, x2: 100, y2: 60, w: 0.6 },
    { x1: 30, y1: 0, x2: 35, y2: 100, w: 0.5 },
    { x1: 60, y1: 0, x2: 65, y2: 100, w: 0.5 },
    { x1: 15, y1: 0, x2: 10, y2: 100, w: 0.4 },
    { x1: 80, y1: 0, x2: 85, y2: 100, w: 0.4 },
  ];

  return (
    <View style={[{ height: mapH, width: '100%', backgroundColor: '#d4ecea', overflow: 'hidden' }, style]}>
      {/* Road lines using thin Views */}
      {roads.map((r, i) => {
        const dx = r.x2 - r.x1;
        const dy = r.y2 - r.y1;
        const lenPx = Math.sqrt(dx * dx + dy * dy) * (mapH / 100);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: `${r.x1}%` as any,
              top: `${r.y1}%` as any,
              width: lenPx,
              height: 5,
              backgroundColor: '#b2d8d6',
              borderRadius: 3,
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}

      {/* Sitter dots — teal */}
      {markers.map((m, i) => {
        const { x, y } = toPercent(m.latitude, m.longitude);
        return (
          <View
            key={i}
            style={[s.dot, s.dotTeal, {
              left: `${x}%` as any,
              top: `${y}%` as any,
              transform: [{ translateX: -7 }, { translateY: -7 }],
            }]}
          />
        );
      })}

      {/* User location dot — pink */}
      {showUserLocation && (
        <View
          style={[s.dot, s.dotPink, {
            width: 18, height: 18, borderRadius: 9,
            left: `${userPos.x}%` as any,
            top: `${userPos.y}%` as any,
            transform: [{ translateX: -9 }, { translateY: -9 }],
          }]}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  dot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  dotTeal: { backgroundColor: '#0F766E' },
  dotPink: { backgroundColor: '#EC4899' },
});
