import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { BadgeCheck } from 'lucide-react-native';
import { cn } from './cn';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
  verified?: boolean;
  online?: boolean;
  className?: string;
}

const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');

export function Avatar({ uri, name, size = 48, verified, online, className }: AvatarProps) {
  return (
    <View style={{ width: size, height: size }} className={cn('relative', className)}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 4 }}
          contentFit="cover"
          transition={180}
          accessibilityLabel={name}
        />
      ) : (
        <View
          style={{ width: size, height: size, borderRadius: size / 4 }}
          className="bg-primary-soft items-center justify-center"
        >
          <Text className="text-title font-display-bold text-primary">{initials(name)}</Text>
        </View>
      )}

      {verified ? (
        <View
          style={{
            position: 'absolute', top: -4, right: -4,
            backgroundColor: '#FFFFFF', borderRadius: 999, padding: 1,
          }}
          accessibilityLabel="Verified"
        >
          <BadgeCheck size={size * 0.38} color="#10B981" fill="#ECFDF5" strokeWidth={2.5} />
        </View>
      ) : null}

      {online ? (
        <View
          style={{
            position: 'absolute', bottom: 2, left: 2,
            width: size * 0.22, height: size * 0.22, borderRadius: 999,
            backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF',
          }}
          accessibilityLabel="Online"
        />
      ) : null}
    </View>
  );
}
