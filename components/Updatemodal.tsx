// components/UpdateModal.tsx
import React, { useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UpdateStatus } from '@/hooks/useAppUpdate';
import { useTheme } from '@/providers/ThemeProvider';

interface UpdateModalProps {
  status: UpdateStatus;
  onUpdate: () => void;
  onDismiss: () => void;
}

export const UpdateModal = ({ status, onUpdate, onDismiss }: UpdateModalProps) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const visible = status === 'available' || status === 'downloading' || status === 'ready';
  const isDownloading = status === 'downloading' || status === 'ready';

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: visible ? 1 : 0.9,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="rocket-outline" size={32} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Update Available</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            A new version of the app is ready. Update now for the latest
            features and improvements.
          </Text>

          {isDownloading ? (
            <View style={styles.progressRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.progressText, { color: colors.primary }]}>
                {status === 'ready' ? 'Restarting…' : 'Downloading update…'}
              </Text>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.laterBtn, { borderColor: colors.border || '#e0e0e0' }]}
                onPress={onDismiss}
              >
                <Text style={[styles.laterText, { color: colors.textSecondary }]}>Later</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.updateBtn, { backgroundColor: colors.primary }]}
                onPress={onUpdate}
              >
                <Ionicons name="download-outline" size={16} color="#fff" />
                <Text style={styles.updateText}>Update Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: colors.card || colors.background,
      borderRadius: 24,
      padding: 28,
      width: '100%',
      maxWidth: 360,
      borderWidth: 1,
      borderColor: colors.border || '#e0e0e0',
      alignItems: 'center',
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 8,
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 10,
      textAlign: 'center',
    },
    body: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 24,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
    },
    progressText: {
      fontSize: 14,
      fontWeight: '500',
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    laterBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
    },
    laterText: {
      fontSize: 15,
      fontWeight: '600',
    },
    updateBtn: {
      flex: 2,
      flexDirection: 'row',
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    updateText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
    },
  });