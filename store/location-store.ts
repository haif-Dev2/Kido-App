import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocationUpdate {
  sitterId: number;
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
}

export interface LocationShare {
  sitterId: number;
  isSharing: boolean;
  currentLocation?: LocationUpdate;
}

interface LocationStore {
  sharingEnabled: boolean;
  currentLocation: LocationUpdate | null;
  trackedSitters: Record<number, LocationShare>;

  setSharingEnabled: (enabled: boolean) => void;
  updateLocation: (location: LocationUpdate) => void;
  addTrackedSitter: (sitterId: number) => void;
  removeTrackedSitter: (sitterId: number) => void;
  updateSitterLocation: (update: LocationUpdate) => void;
  getSitterDistance: (sitterId: number, parentLat: number, parentLng: number) => number | null;
  isSitterNearby: (sitterId: number, parentLat: number, parentLng: number, radiusKm: number) => boolean;
}

function calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export const useLocationStore = create<LocationStore>()(
  persist(
    (set, get) => ({
      sharingEnabled: false,
      currentLocation: null,
      trackedSitters: {},

      setSharingEnabled: (enabled: boolean) => {
        set({ sharingEnabled: enabled });
      },

      updateLocation: (location: LocationUpdate) => {
        set({ currentLocation: location });
        const tracked = get().trackedSitters;
        const existing = tracked[location.sitterId];
        set({
          trackedSitters: {
            ...tracked,
            [location.sitterId]: {
              sitterId: location.sitterId,
              isSharing: true,
              currentLocation: location,
            },
          },
        });
      },

      addTrackedSitter: (sitterId: number) => {
        const tracked = get().trackedSitters;
        if (tracked[sitterId]) return;
        set({
          trackedSitters: {
            ...tracked,
            [sitterId]: { sitterId, isSharing: false },
          },
        });
      },

      removeTrackedSitter: (sitterId: number) => {
        const tracked = { ...get().trackedSitters };
        delete tracked[sitterId];
        set({ trackedSitters: tracked });
      },

      updateSitterLocation: (update: LocationUpdate) => {
        const tracked = get().trackedSitters;
        set({
          trackedSitters: {
            ...tracked,
            [update.sitterId]: {
              sitterId: update.sitterId,
              isSharing: true,
              currentLocation: update,
            },
          },
        });
      },

      getSitterDistance: (sitterId: number, parentLat: number, parentLng: number) => {
        const sitter = get().trackedSitters[sitterId];
        if (!sitter || !sitter.currentLocation) return null;
        return calculateHaversine(
          parentLat,
          parentLng,
          sitter.currentLocation.latitude,
          sitter.currentLocation.longitude
        );
      },

      isSitterNearby: (sitterId: number, parentLat: number, parentLng: number, radiusKm: number) => {
        const distance = get().getSitterDistance(sitterId, parentLat, parentLng);
        return distance !== null && distance <= radiusKm;
      },
    }),
    {
      name: 'location-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        sharingEnabled: state.sharingEnabled,
        currentLocation: state.currentLocation,
      }),
    }
  )
);
