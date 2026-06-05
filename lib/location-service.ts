import * as Location from 'expo-location';
import { useLocationStore } from '../store/location-store';

let updateInterval: ReturnType<typeof setInterval> | null = null;
let watchSubscription: Location.LocationSubscription | null = null;

export async function startLocationSharing(sitterId: number, updateIntervalSeconds = 10) {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    const locationStore = useLocationStore.getState();

    const updateLocation = async () => {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        locationStore.updateLocation({
          sitterId,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now(),
          accuracy: location.coords.accuracy || undefined,
        });
      } catch (error) {
        // Permission was revoked / lost while sharing — stop polling so we
        // don't flood the console with warnings on every interval tick.
        const msg = (error as Error)?.message || '';
        if (msg.toLowerCase().includes('permission')) {
          console.warn('Location permission lost, stopping location sharing.');
          if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
          }
          locationStore.setSharingEnabled(false);
          return;
        }
        console.warn('Location update error:', error);
      }
    };

    await updateLocation();

    if (updateInterval) {
      clearInterval(updateInterval);
    }
    updateInterval = setInterval(updateLocation, updateIntervalSeconds * 1000);

    locationStore.setSharingEnabled(true);
  } catch (error) {
    console.error('Failed to start location sharing:', error);
    throw error;
  }
}

export async function stopLocationSharing() {
  try {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }

    if (watchSubscription) {
      watchSubscription.remove();
      watchSubscription = null;
    }

    const locationStore = useLocationStore.getState();
    locationStore.setSharingEnabled(false);
  } catch (error) {
    console.warn('Error stopping location sharing:', error);
  }
}

export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    // Try precise location first
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };
    } catch {
      // Falls here on emulator when GPS unavailable — try last known position
      // (works after setting location in Android Studio Extended Controls)
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        return {
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
          accuracy: last.coords.accuracy,
        };
      }
      return null;
    }
  } catch (error) {
    console.warn('Error getting current location:', error);
    return null;
  }
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}