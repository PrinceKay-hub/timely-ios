// app/login.tsx (or wherever LoginScreen is located)
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  Animated,
  StatusBar,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'expo-router';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useTheme } from '@/providers/ThemeProvider';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LoginScreenProps {
  onToggle: () => void;
  from?: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────
const validateEmail = (v: string): string | null => {
  if (!v.trim()) return 'Please enter your email';
  if (!v.includes('@')) return 'Please enter a valid email';
  return null;
};

const validatePassword = (v: string): string | null => {
  if (!v) return 'Please enter your password';
  if (v.length < 6) return 'Password must be at least 6 characters';
  return null;
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LoginScreen({ onToggle }: LoginScreenProps) {
  const router = useRouter();
  const { promptAsync } = useGoogleAuth();
  const { signIn, signInWithGoogle, signInWithApple, isLoading, error, user } = useAuthStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  // ─── State ──────────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // ── Snackbar (nested to access styles) ──────────────────────────────────
  const Snackbar = ({ message, visible, type = 'error' }: { message: string; visible: boolean; type?: 'error' | 'success' }) => {
    const translateY = useRef(new Animated.Value(100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const bgColor = type === 'error' ? colors.error || '#ef4444' : colors.primary;

    useEffect(() => {
      if (visible) {
        Animated.parallel([
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(translateY, { toValue: 100, duration: 200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
      }
    }, [visible]);

    return (
      <Animated.View style={[styles.snackbar, { backgroundColor: bgColor, transform: [{ translateY }], opacity }]}>
        <Text style={styles.snackbarText}>{message}</Text>
      </Animated.View>
    );
  };

  // ─── Forgot Password Modal (nested) ─────────────────────────────────────
  const ForgotPasswordModal = ({ visible, onClose, onSend }: { visible: boolean; onClose: () => void; onSend: (email: string) => Promise<void> }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (visible) {
        setSent(false);
        setEmail('');
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start();
      }
    }, [visible]);

    const handleSend = async () => {
      if (!email.trim()) return;
      setLoading(true);
      await onSend(email.trim());
      setLoading(false);
      setSent(true);
      setTimeout(onClose, 1800);
    };

    return (
      <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.modalCard,
                  { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
                ]}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconWrap}>
                    <Text style={styles.modalIcon}>✉️</Text>
                  </View>
                  <Text style={styles.modalTitle}>Reset Password</Text>
                </View>
                <Text style={styles.modalSubtext}>
                  Enter your email address and we'll send you a link to reset your password.
                </Text>
                {sent ? (
                  <View style={styles.successBanner}>
                    <Text style={styles.successBannerText}>✓  Password reset link sent!</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputIcon}>✉</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="your.email@example.com"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.sendBtn, !email.trim() && styles.disabledBtn]}
                        onPress={handleSend}
                        disabled={!email.trim() || loading}
                      >
                        {loading
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={styles.sendBtnText}>Send Link</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  // ─── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  useEffect(() => {
    if (error) showSnackbar(error, 'error');
  }, [error]);

  useEffect(() => {
    if (user) router.replace('/(tabs)/home');
  }, [user, router]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const showSnackbar = (message: string, type: 'error' | 'success' = 'error') => {
    setSnackbar({ message, type });
    setSnackbarVisible(true);
    setTimeout(() => setSnackbarVisible(false), 3500);
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;
    await signIn(email, password);
  };

  const handleGoogleLogin = async () => {
    const result = await promptAsync();
    if (result.type === 'cancelled') return;
    if (result.type === 'error') {
      showSnackbar(result.message, 'error');
      return;
    }
    await signInWithGoogle(result.idToken);
  };

  const handleAppleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
        : null;
      await signInWithApple(credential.identityToken!, fullName, credential.email);
    } catch (e: any) {
      if (e.code !== 'ERR_CANCELED') {
        showSnackbar('Apple sign-in failed. Please try again.', 'error');
      }
    }
  };

  const handlePasswordReset = async (resetEmail: string) => {
    const { getAuth, sendPasswordResetEmail } = await import('@firebase/auth');
    await sendPasswordResetEmail(getAuth(), resetEmail);
  };

  // ─── Field Component (nested) ──────────────────────────────────────────
  const Field = ({
    label, value, onChangeText, placeholder, error,
    secureTextEntry = false, keyboardType = 'default',
    autoCapitalize = 'none', autoComplete = 'off', rightIcon,
  }: any) => (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldContainer, !!error && styles.fieldError]}>
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
        />
        {rightIcon && <View style={styles.fieldRightIcon}>{rightIcon}</View>}
      </View>
      {!!error && <Text style={styles.fieldErrorText}>{error}</Text>}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Signing in…</Text>
      </View>
    );
  }

  const isDark = theme.dark;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.dismissArea} />
        </TouchableWithoutFeedback>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logoIcon}>✂</Text>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Welcome Back!</Text>
        <Text style={styles.subheading}>
          Sign in to continue booking your favorite services
        </Text>

        {/* Form card */}
        <View style={styles.card}>
          <Field
            label="Email Address"
            value={email}
            onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(validateEmail(v)); }}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoComplete="email"
            error={emailError}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(validatePassword(v)); }}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            autoComplete="password"
            error={passwordError}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            }
          />

          {/* Remember me + Forgot password */}
          <View style={styles.rowBetween}>
            <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(v => !v)} activeOpacity={0.7}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowForgotModal(true)}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* OR divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social buttons */}
        <View style={styles.socialButtons}>
          {appleAvailable && (
            <TouchableOpacity style={styles.appleBtn} onPress={handleAppleLogin} activeOpacity={0.85}>
              <Ionicons name="logo-apple" size={20} color="#fff" />
              <Text style={styles.appleBtnText}>Continue with Apple</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} activeOpacity={0.85}>
            <Text style={styles.googleBtnIcon}>G</Text>
            <Text style={styles.socialBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Up link */}
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={onToggle}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <ForgotPasswordModal
        visible={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        onSend={handlePasswordReset}
      />

      {snackbar && (
        <Snackbar message={snackbar.message} visible={snackbarVisible} type={snackbar.type} />
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 48, paddingBottom: 32 },
    dismissArea: { height: 0 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, marginTop: 8 },
    logoWrap: {
      width: 80,
      height: 80,
      borderRadius: 22,
      backgroundColor: colors.card || colors.background,
      borderWidth: 1,
      borderColor: 'rgba(139,92,246,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 28,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 14,
      elevation: 4,
    },
    logoIcon: { fontSize: 36, color: colors.primary },
    heading: { fontSize: 30, fontWeight: '700', color: colors.text, textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 },
    subheading: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 8 },
    card: {
      backgroundColor: colors.card || colors.background,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border || '#e0e0e0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
      gap: 16,
    },
    fieldWrap: { gap: 6 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text, letterSpacing: 0.3, marginBottom: 2 },
    fieldContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border || '#e0e0e0',
      paddingHorizontal: 14,
    },
    fieldError: { borderColor: colors.error || '#ef4444' },
    fieldInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 11, fontSize: 14, color: colors.text },
    fieldRightIcon: { paddingLeft: 8 },
    fieldErrorText: { fontSize: 12, color: colors.error || '#ef4444', marginTop: 2 },
    eyeIcon: { fontSize: 16, color: colors.textSecondary },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
    rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.border || '#e0e0e0', alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkmark: { color: '#fff', fontSize: 11, fontWeight: '700' },
    rememberText: { fontSize: 13, color: colors.textSecondary },
    forgotText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 4,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 28, gap: 14 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border || '#e0e0e0' },
    dividerText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', letterSpacing: 1 },
    socialButtons: { gap: 12 },
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.border || '#e0e0e0',
    },
    googleBtnIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
    socialBtnText: { fontSize: 15, fontWeight: '600', color: colors.text },
    appleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: '#000',
      borderRadius: 12,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: '#000',
    },
    appleBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
    signupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 28 },
    signupText: { fontSize: 14, color: colors.textSecondary },
    signupLink: { fontSize: 14, color: colors.primary, fontWeight: '700' },
    snackbar: {
      position: 'absolute',
      bottom: 24,
      left: 20,
      right: 20,
      borderRadius: 12,
      paddingVertical: 13,
      paddingHorizontal: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    },
    snackbarText: { color: '#fff', fontSize: 14, fontWeight: '500' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modalCard: {
      backgroundColor: colors.card || colors.background,
      borderRadius: 20,
      padding: 28,
      width: '100%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: colors.border || '#e0e0e0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    modalIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' },
    modalIcon: { fontSize: 18 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    modalSubtext: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: 20 },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border || '#e0e0e0',
      paddingHorizontal: 14,
    },
    inputIcon: { fontSize: 14, color: colors.primary, marginRight: 8 },
    modalInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 11, fontSize: 14, color: colors.text },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: colors.border || '#e0e0e0' },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    sendBtn: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 3,
      minWidth: 90,
      alignItems: 'center',
    },
    sendBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    disabledBtn: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
    successBanner: { backgroundColor: `${colors.primary}14`, borderWidth: 1, borderColor: `${colors.primary}33`, borderRadius: 12, padding: 14 },
    successBannerText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  });