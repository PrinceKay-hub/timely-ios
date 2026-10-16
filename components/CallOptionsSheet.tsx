import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
//import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatAvatar } from '@/components/chat/chatavatar';
import { useTheme } from '@/providers/ThemeProvider';

interface CallOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  providerName: string;
  /** The number the provider registered. */
  phone?: string | null;
  photoUrl?: string | null;
  /** Greys the in-app option out and shows this instead of its description. */
  inAppDisabledReason?: string;
  /** Called after the sheet closes. */
  onInAppCall: () => void;
}

/** Keeps a leading "+", strips spaces/dashes/brackets. Null if implausible. */
function cleanPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 6) return null;
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

const OptionTile = ({
  icon,
  title,
  subtitle,
  enabled,
  primary,
  colors,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  primary: boolean;
  colors: any;
  onPress: () => void;
}) => {
  const fg = primary ? '#fff' : colors.text;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={!enabled}
      onPress={onPress}
      style={[
        styles.tile,
        { backgroundColor: primary ? colors.primary : colors.text + '10' },
        !enabled && { opacity: 0.45 },
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: fg + '26' }]}>
        <Ionicons name={icon as any} size={22} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.tileTitle, { color: fg }]}>{title}</Text>
        <Text style={[styles.tileSub, { color: fg, opacity: 0.75 }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={fg} style={{ opacity: 0.6 }} />
    </TouchableOpacity>
  );
};

export function CallOptionsSheet({
  visible,
  onClose,
  providerName,
  phone,
  photoUrl,
  inAppDisabledReason,
  onInAppCall,
}: CallOptionsSheetProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const number = cleanPhone(phone);
  const inAppEnabled = !inAppDisabledReason;

  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  const handleInApp = () => {
    onClose();
    onInAppCall();
  };

  const handleDial = async () => {
    onClose();
    try {
      await Linking.openURL(`tel:${number}`);
    } catch {
      Alert.alert("Couldn't open the phone app", `Number: ${number}`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.gray100, paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.text + '33' }]} />

          <ChatAvatar
            uri={photoUrl ?? undefined}
            name={providerName}
            size={68}
            online={false}
            colors={colors}
          />
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            Contact {providerName}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choose how you'd like to call
          </Text>

          <View style={styles.tiles}>
            <OptionTile
              icon="wifi"
              title="Call in app"
              subtitle={inAppEnabled ? 'Uses your internet connection' : inAppDisabledReason!}
              enabled={inAppEnabled}
              primary
              colors={colors}
              onPress={handleInApp}
            />
            <OptionTile
              icon="call"
              title="Phone call"
              subtitle={number ? phone!.trim() : 'No phone number provided'}
              enabled={!!number}
              primary={false}
              colors={colors}
              onPress={handleDial}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'center',
  },
  handle: { width: 40, height: 4, borderRadius: 2, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', marginTop: 12 },
  subtitle: { fontSize: 14, marginTop: 4 },
  tiles: { alignSelf: 'stretch', gap: 12, marginTop: 20 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tileIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 16, fontWeight: '700' },
  tileSub: { fontSize: 13, marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 14 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  footerText: { fontSize: 15, fontWeight: '600' },
});