import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import { useLocationStore } from '../store/location-store';
import { startLocationSharing, stopLocationSharing } from '../lib/location-service';

const TEAL = '#0F766E';

interface LocationSharingToggleProps {
  sitterId: number;
  style?: any;
}

export function LocationSharingToggle({ sitterId, style }: LocationSharingToggleProps) {
  const sharingEnabled = useLocationStore(s => s.sharingEnabled);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (newValue: boolean) => {
    setIsLoading(true);
    try {
      if (newValue) {
        await startLocationSharing(sitterId);
        Alert.alert(
          'Location Sharing Enabled',
          'The family will now see your location in real-time as you travel to them.',
          [{ text: 'OK' }]
        );
      } else {
        await stopLocationSharing();
        Alert.alert(
          'Location Sharing Disabled',
          'The family will no longer see your location.',
          [{ text: 'OK' }]
        );
      }
    } catch {
      Alert.alert(
        'Error',
        'Failed to enable location sharing. Make sure location is enabled in your settings.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const subtitleText = sharingEnabled
    ? 'Family can track your arrival in real-time'
    : 'Tap to enable so family can track your arrival';

  return (
    <View style={[s.container, style]}>
      <View style={s.content}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={s.title}>Share Your Location</Text>
          <Text style={s.subtitle}>{subtitleText}</Text>
        </View>
        <Switch
          value={sharingEnabled}
          onValueChange={handleToggle}
          disabled={isLoading}
          trackColor={{ false: '#D1D5DB', true: TEAL + '40' }}
          thumbColor={sharingEnabled ? TEAL : '#9CA3AF'}
        />
      </View>
      {sharingEnabled ? (
        <View style={s.liveIndicator}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>Live - Family can see your location</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#F0FDFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: TEAL + '20',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
});
