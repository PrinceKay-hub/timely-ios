import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Linking,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '@/firebase';
import { sendEmailVerification, reload } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { useTheme } from '@/providers/ThemeProvider';
import { ThemeMode } from '@/stores/useThemeStore';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProfileScreenProps {
  user: Record<string, any>;
}

interface MenuItemConfig {
  icon: string;
  title: string;
  onPress: () => void;
  trailing?: React.ReactNode;
}

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 44;

// ─── Theme Picker (themed) ──────────────────────────────────────────────────
const ThemePicker: React.FC<{ colors: any }> = ({ colors }) => {
  const { themeMode, setThemeMode } = useTheme();
  const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'light', label: 'Light', icon: '☀️' },
    { mode: 'system', label: 'System', icon: '📱' },
    { mode: 'dark', label: 'Dark', icon: '🌙' },
  ];

  // Inline styles using the provided colors
  const pickerStyles = useMemo(() => ({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    option: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border || '#E5E7EB',
      backgroundColor: colors.surface || '#F9FAFB',
      gap: 4,
    },
    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight || `${colors.primary}18`,
    },
    icon: { fontSize: 20 },
    label: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary || '#6B7280',
    },
    labelSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
  }), [colors]);

  return (
    <View style={pickerStyles.row}>
      {THEME_OPTIONS.map(({ mode, label, icon }) => {
        const isSelected = themeMode === mode;
        return (
          <TouchableOpacity
            key={mode}
            onPress={() => setThemeMode(mode)}
            style={[pickerStyles.option, isSelected && pickerStyles.optionSelected]}
            activeOpacity={0.75}
          >
            <Text style={pickerStyles.icon}>{icon}</Text>
            <Text style={[pickerStyles.label, isSelected && pickerStyles.labelSelected]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Logout Dialog (themed) ─────────────────────────────────────────────────
const LogoutDialog: React.FC<{
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  colors: any;
}> = ({ visible, onCancel, onConfirm, colors }) => {
  const dialogStyles = useMemo(() => ({
    dialogOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    dialogCard: {
      backgroundColor: colors.card || colors.background,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 360,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 12,
    },
    dialogTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    dialogBody: {
      fontSize: 14,
      color: colors.textSecondary || '#6b7280',
      lineHeight: 20,
      marginBottom: 24,
    },
    dialogActions: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'flex-end',
    },
    dialogCancelBtn: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border || '#e5e7eb',
      alignItems: 'center',
    },
    dialogCancelText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary || '#6b7280',
    },
    dialogLogoutBtn: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: colors.error || '#ef4444',
      alignItems: 'center',
      shadowColor: colors.error || '#ef4444',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 4,
    },
    dialogLogoutText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
  }), [colors]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={dialogStyles.dialogOverlay}>
        <View style={dialogStyles.dialogCard}>
          <Text style={dialogStyles.dialogTitle}>Confirm Logout</Text>
          <Text style={dialogStyles.dialogBody}>Are you sure you want to logout?</Text>
          <View style={dialogStyles.dialogActions}>
            <TouchableOpacity style={dialogStyles.dialogCancelBtn} onPress={onCancel} activeOpacity={0.75}>
              <Text style={dialogStyles.dialogCancelText}>No, Stay Logged In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={dialogStyles.dialogLogoutBtn} onPress={onConfirm} activeOpacity={0.85}>
              <Text style={dialogStyles.dialogLogoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Delete Account Dialog (themed) ─────────────────────────────────────────
const DeleteAccountDialog: React.FC<{
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  colors: any;
}> = ({ visible, onCancel, onConfirm, colors }) => {
  const dialogStyles = useMemo(() => ({
    dialogOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    dialogCard: {
      backgroundColor: colors.card || colors.background,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 360,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 12,
    },
    deleteIconWrap: {
      alignSelf: 'center',
      marginBottom: 12,
    },
    deleteIconEmoji: {
      fontSize: 36,
    },
    dialogTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    dialogBody: {
      fontSize: 14,
      color: colors.textSecondary || '#6b7280',
      lineHeight: 20,
      marginBottom: 24,
    },
    deleteEmphasis: {
      fontWeight: '700',
      color: colors.error || '#ef4444',
    },
    dialogActions: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'flex-end',
    },
    dialogCancelBtn: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border || '#e5e7eb',
      alignItems: 'center',
    },
    dialogCancelText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary || '#6b7280',
    },
    dialogDeleteBtn: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: colors.errorDark || '#7f1d1d',
      alignItems: 'center',
      shadowColor: colors.errorDark || '#7f1d1d',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 4,
    },
    dialogDeleteText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
  }), [colors]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={dialogStyles.dialogOverlay}>
        <View style={dialogStyles.dialogCard}>
          <View style={dialogStyles.deleteIconWrap}>
            <Text style={dialogStyles.deleteIconEmoji}>⚠️</Text>
          </View>
          <Text style={dialogStyles.dialogTitle}>Delete Account</Text>
          <Text style={dialogStyles.dialogBody}>
            This action is <Text style={dialogStyles.deleteEmphasis}>permanent and cannot be undone.</Text>{' '}
            All your data will be erased immediately.
          </Text>
          <View style={dialogStyles.dialogActions}>
            <TouchableOpacity style={dialogStyles.dialogCancelBtn} onPress={onCancel} activeOpacity={0.75}>
              <Text style={dialogStyles.dialogCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={dialogStyles.dialogDeleteBtn} onPress={onConfirm} activeOpacity={0.85}>
              <Text style={dialogStyles.dialogDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Menu Section (themed) ──────────────────────────────────────────────────
const MenuSection: React.FC<{
  title: string;
  items: MenuItemConfig[];
  colors: any;
  styles: any;
}> = ({ title, items, colors, styles }) => (
  <View style={styles.menuSection}>
    <Text style={styles.menuSectionTitle}>{title}</Text>
    {items.map((item, index) => (
      <TouchableOpacity
        key={item.title}
        style={[
          styles.menuItem,
          index < items.length - 1 && styles.menuItemBorder,
        ]}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.menuIconBox, { backgroundColor: `${colors.primary}18` }]}>
          <Text style={styles.menuIconText}>{item.icon}</Text>
        </View>
        <Text style={styles.menuItemTitle}>{item.title}</Text>
        {item.trailing ?? (
          <Text style={styles.menuChevron}>›</Text>
        )}
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Main Profile Screen ──────────────────────────────────────────────────────
export default function Profile({ user }: ProfileScreenProps) {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const { logout, profile } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  // ── User Profile state ────────────────────────────────────────────────
  const userInfo = {
    ...user,
    id: profile?.id || user?.id,
    displayName: profile?.displayName || user?.displayName,
    photoURL: profile?.photoURL || user?.photoURL,
    email: profile?.email || user?.email,
    fcmToken: profile?.fcmToken || user?.fcmToken,
    expoPushToken: profile?.expoPushToken || user?.expoPushToken,
    isEmailVerified: profile?.isEmailVerified || user?.isEmailVerified
  };

  // ── Email verification state ────────────────────────────────────────────────
  const [isEmailVerified, setIsEmailVerified] = useState(
    () => auth.currentUser?.emailVerified ?? false
  );
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const verificationTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for email verification every 3 seconds
  useEffect(() => {
    if (!isEmailVerified) {
      verificationTimer.current = setInterval(checkEmailVerification, 3000);
    }
    return () => {
      if (verificationTimer.current) clearInterval(verificationTimer.current);
    };
  }, [isEmailVerified]);

  // ── Send verification email ─────────────────────────────────────────────────
  const sendVerificationEmail = useCallback(async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        Alert.alert('Verification email sent', 'Check your inbox.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    }
  }, []);

  // ── Check verification status and update Firestore ─────────────────────────
  const checkEmailVerification = useCallback(async () => {
    if (!auth.currentUser) return;
    await reload(auth.currentUser);
    const verified = auth.currentUser.emailVerified;
    if (verified) {
      setIsEmailVerified(true);
      if (verificationTimer.current) clearInterval(verificationTimer.current);
      try {
        const userRef = doc(db, 'users', user?.uid);
        await updateDoc(userRef, { isEmailVerified: true });
        Alert.alert('✓ Success', 'Email verified!');
      } catch (err) {
        console.log('Firestore update failed', err);
      }
    }
  }, [user?.uid]);

  // ── WhatsApp helper ─────────────────────────────────────────────────────────
  const launchWhatsApp = useCallback(async (phone: string, message?: string) => {
    const trimmedNumber = phone.replace(/[^0-9]/g, '');
    const url = `whatsapp://send?phone=${trimmedNumber}&text=${message}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('WhatsApp not installed', 'Please install WhatsApp to use this feature.');
    }
  }, []);

  // ── Logout handler ──────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    setLogoutDialogVisible(false);
    await logout();
    router.replace('/AuthWrapper');
  }, [logout, router]);

  // ── Delete account handler ──────────────────────────────────────────────────
  const handleDeleteAccount = useCallback(async () => {
    setIsDeleting(true);
    try {
      const deleteUserFn = httpsCallable(functions, 'deleteUser');
      await deleteUserFn();
      await logout();
      router.replace('/AuthWrapper');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsDeleting(false);
    }
    setDeleteDialogVisible(false);
  }, [logout, router]);

  // ── Menu definitions ────────────────────────────────────────────────────────
  const accountItems = [
    {
      icon: '📦',
      title: 'Manage Service',
      onPress: () => {
        if (!isEmailVerified) {
          Alert.alert('Unverified', 'Please verify your email first.');
        } else {
          navigation.navigate('manage/registration/index', { userId: user?.uid });
        }
      },
    },
    {
      icon: '❤️',
      title: 'My Favorites',
      onPress: () => navigation.navigate('favorites'),
    },
  ];

  const supportItems = [
    {
      icon: '💬',
      title: 'Help & Support',
      onPress: async () => {
        try {
          await launchWhatsApp(
            '+233244032237',
            'Hello Support team. I need assistance with my account'
          );
        } catch (_) {
          Alert.alert('Error', 'Could not open WhatsApp.');
        }
      },
    },
    {
      icon: 'ℹ️',
      title: 'About',
      onPress: () => navigation.navigate('about'),
    },
  ];

  const legalItems = [
    {
      icon: '🔒',
      title: 'Privacy Policy',
      onPress: () => navigation.navigate('privacy'),
    },
    {
      icon: '📄',
      title: 'Terms & Conditions',
      onPress: () => navigation.navigate('terms'),
    },
  ];

  if (isDeleting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Deleting Account</Text>
      </View>
    );
  }

  const initial = (userInfo?.displayName as string)?.[0]?.toUpperCase() ?? 'U';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: colors.background }]}>
              <Text style={[styles.avatarInitial, { color: colors.primary }]}>{initial}</Text>
            </View>
          </View>
          <Text style={styles.displayName}>{userInfo?.displayName ?? ''}</Text>
          <Text style={styles.email}>{userInfo?.email ?? ''}</Text>
        </View>

        {/* Email not verified banner */}
        {!isEmailVerified && (
          <View style={[styles.verifyBanner, { backgroundColor: colors.error }]}>
            <View style={styles.verifyBannerRow}>
              <Text style={styles.verifyBannerLabel}>Email not verified!</Text>
              <TouchableOpacity onPress={sendVerificationEmail}>
                <Text style={styles.verifyBannerLink}>Send e-mail</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.verifyBannerBox, { backgroundColor: colors.text }]}>
              <Text style={[styles.verifyBannerMsg, { color: colors.background }]} numberOfLines={2}>
                A verification email has been sent to {userInfo?.email}. Check your inbox or spam
              </Text>
            </View>
          </View>
        )}

        {/* Menu sections */}
        <View style={styles.menuWrap}>
          {/* Appearance */}
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Appearance</Text>
            <View style={[styles.menuItem, { paddingVertical: 14 }]}>
              <ThemePicker colors={colors} />
            </View>
          </View>
          <View style={styles.sectionGap} />
          <MenuSection title="Account Settings" items={accountItems} colors={colors} styles={styles} />
          <View style={styles.sectionGap} />
          <MenuSection title="Support" items={supportItems} colors={colors} styles={styles} />
          <View style={styles.sectionGap} />
          <MenuSection title="Legal" items={legalItems} colors={colors} styles={styles} />
          <View style={styles.sectionGap} />

          {/* Logout button */}
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: `${colors.error}4D` }]}
            onPress={() => setLogoutDialogVisible(true)}
          >
            <Text style={[styles.logoutIcon, { color: colors.error }]}>⎋</Text>
            <Text style={[styles.logoutText, { color: colors.error }]}>Logout</Text>
          </TouchableOpacity>

          {/* Divider with label */}
          <View style={styles.dangerDividerRow}>
            <View style={[styles.dangerDividerLine, { backgroundColor: colors.error }]} />
            <Text style={[styles.dangerDividerLabel, { color: colors.error }]}>Danger Zone</Text>
            <View style={[styles.dangerDividerLine, { backgroundColor: colors.error }]} />
          </View>

          {/* Delete Account button */}
          <TouchableOpacity
            style={[
              styles.deleteAccountBtn,
              {
                backgroundColor: `${colors.error}0D`,
                borderColor: `${colors.error}40`,
              }
            ]}
            onPress={() => setDeleteDialogVisible(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.deleteAccountIconWrap, { backgroundColor: `${colors.error}20` }]}>
              <Text style={styles.deleteAccountIcon}>🗑️</Text>
            </View>
            <View style={styles.deleteAccountTextWrap}>
              <Text style={[styles.deleteAccountTitle, { color: colors.error }]}>
                Delete Account
              </Text>
              <Text style={[styles.deleteAccountSubtitle, { color: colors.errorLight || '#f87171' }]}>
                Permanently remove your account & data
              </Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <LogoutDialog
        visible={logoutDialogVisible}
        onCancel={() => setLogoutDialogVisible(false)}
        onConfirm={handleLogout}
        colors={colors}
      />

      <DeleteAccountDialog
        visible={deleteDialogVisible}
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={handleDeleteAccount}
        colors={colors}
      />
    </View>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.surface || '#f3f4f6',
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 36,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: colors.textSecondary || '#6b7280',
      fontSize: 15,
    },

    // ── Header ──
    header: {
      paddingTop: STATUS_BAR_HEIGHT + 16,
      paddingBottom: 28,
      paddingHorizontal: 20,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      alignItems: 'center',
    },
    headerTitle: {
      alignSelf: 'flex-start',
      color: '#fff',
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 24,
    },
    avatarWrap: {
      marginBottom: 14,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    avatarInitial: {
      fontSize: 32,
      fontWeight: '700',
    },
    displayName: {
      color: '#fff',
      fontSize: 22,
      fontWeight: '700',
      marginBottom: 4,
    },
    email: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 14,
    },

    // ── Email verification banner ──
    verifyBanner: {
      marginHorizontal: 20,
      marginTop: 20,
      borderRadius: 10,
      padding: 10,
      gap: 8,
    },
    verifyBannerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    verifyBannerLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#000',
    },
    verifyBannerLink: {
      fontSize: 12,
      fontWeight: '700',
      color: '#fff',
    },
    verifyBannerBox: {
      borderRadius: 5,
      padding: 8,
      minHeight: 44,
      justifyContent: 'center',
    },
    verifyBannerMsg: {
      fontSize: 11,
      fontWeight: '600',
      lineHeight: 16,
    },

    // ── Menu wrap ──
    menuWrap: {
      paddingHorizontal: 20,
      marginTop: 24,
    },
    sectionGap: {
      height: 16,
    },

    // ── Menu section ──
    menuSection: {
      backgroundColor: colors.card || colors.background,
      borderRadius: 15,
      overflow: 'hidden',
    },
    menuSectionTitle: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 6,
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary || '#9ca3af',
      letterSpacing: 0.3,
    },

    // ── Menu item ──
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    menuItemBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border || 'rgba(0,0,0,0.07)',
    },
    menuIconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    menuIconText: {
      fontSize: 18,
    },
    menuItemTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    menuChevron: {
      fontSize: 22,
      color: colors.textSecondary || '#9ca3af',
      lineHeight: 24,
    },

    // ── Logout button ──
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: colors.card || colors.background,
      borderWidth: 1,
    },
    logoutIcon: {
      fontSize: 18,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '700',
    },

    // ── Danger divider ──
    dangerDividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 12,
      gap: 10,
    },
    dangerDividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
    },
    dangerDividerLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },

    // ── Delete Account button ──
    deleteAccountBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    deleteAccountIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    deleteAccountIcon: {
      fontSize: 18,
    },
    deleteAccountTextWrap: {
      flex: 1,
    },
    deleteAccountTitle: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 2,
    },
    deleteAccountSubtitle: {
      fontSize: 12,
    },
  });