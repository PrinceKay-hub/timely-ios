import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { PresenceDot } from './presencedot';

interface ChatAvatarProps {
  uri?: string;
  name?: string; 
  size?: number;
  online?: boolean;
  colors: any;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '');
  return initials.join('') || '?';
}

export function ChatAvatar({ uri, name, size = 40, online, colors }: ChatAvatarProps) {
  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.surface || '#f3f4f6',
          }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.primaryLight || `${colors.primary}22`,
            },
          ]}
        >
          <Text style={[styles.initials, { color: colors.primary, fontSize: size * 0.38 }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
      {online !== undefined && (
        <PresenceDot online={online} size={Math.max(10, Math.round(size * 0.3))} ringColor={colors.background || '#fff'} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '700' },
});