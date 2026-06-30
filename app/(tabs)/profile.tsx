import React, { useState, useEffect, useRef, useCallback } from 'react';
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

// ─── Constants ────────────────────────────────────────────────────────────────
const PURPLE = '#8B5CF6';
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 44;

// ─── Logout Dialog ────────────────────────────────────────────────────────────
const LogoutDialog: React.FC<{
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ visible, onCancel, onConfirm }) => (
  <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
    <View style={styles.dialogOverlay}>
      <View style={styles.dialogCard}>
        <Text style={styles.dialogTitle}>Confirm Logout</Text>
        <Text style={styles.dialogBody}>Are you sure you want to logout?</Text>
        <View style={styles.dialogActions}>
          <TouchableOpacity style={styles.dialogCancelBtn} onPress={onCancel} activeOpacity={0.75}>
            <Text style={styles.dialogCancelText}>No, Stay Logged In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dialogLogoutBtn} onPress={onConfirm} activeOpacity={0.85}>
            <Text style={styles.dialogLogoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ─── Delete Account Dialog ────────────────────────────────────────────────────
const DeleteAccountDialog: React.FC<{
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ visible, onCancel, onConfirm }) => (
  <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
    <View style={styles.dialogOverlay}>
      <View style={styles.dialogCard}>
        {/* Warning icon */}
        <View style={styles.deleteIconWrap}>
          <Text style={styles.deleteIconEmoji}>⚠️</Text>
        </View>
        <Text style={styles.dialogTitle}>Delete Account</Text>
        <Text style={styles.dialogBody}>
          This action is <Text style={styles.deleteEmphasis}>permanent and cannot be undone.</Text>{' '}
          All your data will be erased immediately.
        </Text>
        <View style={styles.dialogActions}>
          <TouchableOpacity style={styles.dialogCancelBtn} onPress={onCancel} activeOpacity={0.75}>
            <Text style={styles.dialogCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dialogDeleteBtn} onPress={onConfirm} activeOpacity={0.85}>
            <Text style={styles.dialogDeleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ─── Menu section ─────────────────────────────────────────────────────────────
const MenuSection: React.FC<{ title: string; items: MenuItemConfig[] }> = ({ title, items }) => (
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
        {/* Icon box */}
        <View style={styles.menuIconBox}>
          <Text style={styles.menuIconText}>{item.icon}</Text>
        </View>

        <Text style={styles.menuItemTitle}>{item.title}</Text>

        {/* Trailing: custom widget or default chevron */}
        {item.trailing ?? (
          <Text style={styles.menuChevron}>›</Text>
        )}
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Profile({ user }: ProfileScreenProps) {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const { logout, profile  } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);


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
      // Update Firestore
      try {
        const userRef = doc(db, 'users', user?.uid); // use uid, not id
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
    // TODO: wire up your delete-account logic here
    // e.g. delete Firestore doc, call auth.currentUser.delete(), then redirect
  }, []);

  // ── Menu definitions (unchanged) ────────────────────────────────────────────
  const accountItems = [
    {
      icon: '📦',
      title: 'Manage Service',
      onPress: () => {
        //navigation.navigate('manage/registration/index', { userId: user?.uid });
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
      onPress: () => navigation.navigate('favorites',),
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
          <ActivityIndicator size="large" color={PURPLE} />
          <Text style={styles.loadingText}>Deleting Account</Text>
        </View>
      );
    }

  const initial = (userInfo?.displayName as string)?.[0]?.toUpperCase() ?? 'U';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          </View>
          <Text style={styles.displayName}>{userInfo?.displayName ?? ''}</Text>
          <Text style={styles.email}>{userInfo?.email ?? ''}</Text>
        </View>

        {/* Email not verified banner */}
        {!isEmailVerified && (
          <View style={styles.verifyBanner}>
            <View style={styles.verifyBannerRow}>
              <Text style={styles.verifyBannerLabel}>Email not verified!</Text>
              <TouchableOpacity onPress={sendVerificationEmail}>
                <Text style={styles.verifyBannerLink}>Send e-mail</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.verifyBannerBox}>
              <Text style={styles.verifyBannerMsg} numberOfLines={2}>
                A verification email has been sent to {userInfo?.email}. Check your inbox or spam
              </Text>
            </View>
          </View>
        )}

        {/* Menu sections */}
        <View style={styles.menuWrap}>
          <MenuSection title="Account Settings" items={accountItems} />
          <View style={styles.sectionGap} />
          <MenuSection title="Support" items={supportItems} />
          <View style={styles.sectionGap} />
          <MenuSection title="Legal" items={legalItems} />
          <View style={styles.sectionGap} />

          {/* Logout button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={() => setLogoutDialogVisible(true)}>
            <Text style={styles.logoutIcon}>⎋</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          {/* Divider with label */}
          <View style={styles.dangerDividerRow}>
            <View style={styles.dangerDividerLine} />
            <Text style={styles.dangerDividerLabel}>Danger Zone</Text>
            <View style={styles.dangerDividerLine} />
          </View>

          {/* Delete Account button */}
          <TouchableOpacity
            style={styles.deleteAccountBtn}
            onPress={() => setDeleteDialogVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.deleteAccountIconWrap}>
              <Text style={styles.deleteAccountIcon}>🗑️</Text>
            </View>
            <View style={styles.deleteAccountTextWrap}>
              <Text style={styles.deleteAccountTitle}>Delete Account</Text>
              <Text style={styles.deleteAccountSubtitle}>Permanently remove your account & data</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      <LogoutDialog
        visible={logoutDialogVisible}
        onCancel={() => setLogoutDialogVisible(false)}
        onConfirm={handleLogout}
      />

      <DeleteAccountDialog
        visible={deleteDialogVisible}
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={handleDeleteAccount}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 36,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    color: '#6b7280',
    fontSize: 15,
  },

  // ── Header ──
  header: {
    paddingTop: STATUS_BAR_HEIGHT + 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    backgroundColor: PURPLE,
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
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarInitial: {
    color: PURPLE,
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
    backgroundColor: '#ef4444',
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
    backgroundColor: '#000',
    borderRadius: 5,
    padding: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  verifyBannerMsg: {
    color: '#fff',
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
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
  },
  menuSectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#9ca3af',
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
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f3f0ff',
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
    color: '#111827',
  },
  menuChevron: {
    fontSize: 22,
    color: '#9ca3af',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  logoutIcon: {
    fontSize: 18,
    color: '#ef4444',
  },
  logoutText: {
    color: '#ef4444',
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
    backgroundColor: '#fca5a5',
  },
  dangerDividerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
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
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  deleteAccountIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
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
    color: '#ef4444',
    marginBottom: 2,
  },
  deleteAccountSubtitle: {
    fontSize: 12,
    color: '#f87171',
  },

  // ── Logout dialog ──
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialogCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  dialogBody: {
    fontSize: 14,
    color: '#6b7280',
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
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  dialogCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  dialogLogoutBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    shadowColor: '#ef4444',
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

  // ── Delete dialog extras ──
  deleteIconWrap: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  deleteIconEmoji: {
    fontSize: 36,
  },
  deleteEmphasis: {
    fontWeight: '700',
    color: '#ef4444',
  },
  dialogDeleteBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#7f1d1d',
    alignItems: 'center',
    shadowColor: '#7f1d1d',
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
});