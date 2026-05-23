import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { useLocationStore } from '../store/location-store';
import { getCurrentLocation, calculateDistance } from '../lib/location-service';

const TEAL = '#0F766E';
const GREEN = '#10B981';

interface SitterDistanceTrackerProps {
  sitterId: number;
  sitterName: string;
  style?: any;
}

export function SitterDistanceTracker({ sitterId, sitterName, style }: SitterDistanceTrackerProps) {
  const sitterLocation = useLocationStore(s => {
    const tracked = s.trackedSitters[sitterId];
    return tracked && tracked.currentLocation ? tracked.currentLocation : null;
  });

  const [parentLocation, setParentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isNearby, setIsNearby] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;
    let locationSubscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const loc = await getCurrentLocation();
        if (loc && mounted) {
          setParentLocation({ latitude: loc.latitude, longitude: loc.longitude });
        }

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 50,
          },
          (location) => {
            if (mounted) {
              setParentLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              });
            }
          }
        );
      } catch (error) {
        console.warn('Error getting parent location:', error);
      }
    })();

    return () => {
      mounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (parentLocation && sitterLocation) {
      const dist = calculateDistance(
        parentLocation.latitude,
        parentLocation.longitude,
        sitterLocation.latitude,
        sitterLocation.longitude
      );
      setDistance(dist);
      setIsNearby(dist < 0.5);
      setLastUpdate(new Date());
    }
  }, [parentLocation, sitterLocation]);

  if (!sitterLocation) {
    return (
      <View style={[s.container, s.containerDisabled, style]}>
        <Text style={s.title}>{sitterName}</Text>
        <Text style={s.statusText}>Location sharing disabled</Text>
      </View>
    );
  }

  if (distance === null) {
    return (
      <View style={[s.container, style]}>
        <Text style={s.title}>{sitterName}</Text>
        <Text style={s.statusText}>Calculating distance...</Text>
      </View>
    );
  }

  let distanceText: string;
  if (distance < 0.1) {
    distanceText = 'Arriving now';
  } else if (distance < 0.5) {
    distanceText = `${(distance * 1000).toFixed(0)}m away`;
  } else {
    distanceText = `${distance.toFixed(1)}km away`;
  }

  return (
    <View style={[s.container, isNearby && s.containerNearby, style]}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{sitterName}</Text>
          <Text style={[s.distance, isNearby && s.distanceNearby]}>{distanceText}</Text>
        </View>
        {isNearby ? (
          <View style={s.nearbyBadge}>
            <View style={s.pulseDot} />
            <Text style={s.nearbyText}>Arriving</Text>
          </View>
        ) : null}
      </View>

      {lastUpdate ? (
        <Text style={s.lastUpdate}>
          Last updated: {lastUpdate.toLocaleTimeString()}
        </Text>
      ) : null}

      {distance < 0.1 ? (
        <View style={s.alertBox}>
          <Text style={s.alertText}>Babysitter has arrived!</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  containerDisabled: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  containerNearby: {
    borderColor: GREEN,
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  distance: {
    fontSize: 14,
    fontWeight: '600',
    color: TEAL,
  },
  distanceNearby: {
    color: GREEN,
  },
  nearbyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GREEN + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  nearbyText: {
    fontSize: 12,
    fontWeight: '700',
    color: GREEN,
  },
  lastUpdate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  alertBox: {
    backgroundColor: GREEN + '10',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
    color: GREEN,
  },
});
