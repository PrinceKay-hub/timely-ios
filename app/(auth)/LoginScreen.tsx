import React, { useState, useEffect, useRef } from 'react';
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

// ─── Snackbar ─────────────────────────────────────────────────────────────────
interface SnackbarProps {
  message: string;
  visible: boolean;
  type?: 'error' | 'success';
}

const Snackbar = ({ message, visible, type = 'error' }: SnackbarProps) => {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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
    <Animated.View
      style={[
        styles.snackbar,
        { backgroundColor: type === 'error' ? '#ef4444' : PURPLE },
        { transform: [{ translateY }], opacity },
      ]}
    >
      <Text style={styles.snackbarText}>{message}</Text>
    </Animated.View>
  );
};

// ─── Forgot Password Modal ────────────────────────────────────────────────────
interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (email: string) => Promise<void>;
}

const ForgotPasswordModal = ({ visible, onClose, onSend }: ForgotPasswordModalProps) => {
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
              style={[styles.modalCard, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
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
                      placeholderTextColor="#8a84a3"
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

// ─── Field ────────────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  error?: string | null;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  autoComplete?: 'email' | 'password' | 'off';
  rightIcon?: React.ReactNode;
}

const Field = ({
  label, value, onChangeText, placeholder, error,
  secureTextEntry = false, keyboardType = 'default',
  autoCapitalize = 'none', autoComplete = 'off', rightIcon,
}: FieldProps) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={[styles.fieldContainer, !!error && styles.fieldError]}>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8a84a3"
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LoginScreen({ onToggle }: LoginScreenProps) {
  const router = useRouter();
  const { promptAsync } = useGoogleAuth();
  const { signIn, signInWithGoogle, signInWithApple, isLoading, error, user } = useAuthStore();

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

  // ── Check Apple availability (iOS 13+ only) ────────────────────────────────
  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  // ── Auth store errors → snackbar ───────────────────────────────────────────
  useEffect(() => {
    if (error) showSnackbar(error, 'error');
  }, [error]);

  // ── Redirect on login ──────────────────────────────────────────────────────
  useEffect(() => {
    if (user) router.replace('/(tabs)/home');
  }, [user, router]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const showSnackbar = (message: string, type: 'error' | 'success' = 'error') => {
    setSnackbar({ message, type });
    setSnackbarVisible(true);
    setTimeout(() => setSnackbarVisible(false), 3500);
  };

  // ── Email / password login ─────────────────────────────────────────────────
  const handleLogin = async () => {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;
    await signIn(email, password);
  };

  // ── Google login ───────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    const result = await promptAsync();
    if (result.type === 'cancelled') return;
    if (result.type === 'error') {
      showSnackbar(result.message, 'error');
      return;
    }
    await signInWithGoogle(result.idToken);
  };

  // ── Apple login ────────────────────────────────────────────────────────────
  const handleAppleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(' ')
        : null;

      await signInWithApple(
        credential.identityToken!,
        fullName,
        credential.email,
      );
    } catch (e: any) {
      // ERR_CANCELED means user dismissed — don't show an error
      if (e.code !== 'ERR_CANCELED') {
        showSnackbar('Apple sign-in failed. Please try again.', 'error');
      }
    }
  };

  // ── Password reset ─────────────────────────────────────────────────────────
  const handlePasswordReset = async (resetEmail: string) => {
    const { getAuth, sendPasswordResetEmail } = await import('@firebase/auth');
    await sendPasswordResetEmail(getAuth(), resetEmail);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PURPLE} />
        <Text style={styles.loadingText}>Signing in…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.dismissArea} />
        </TouchableWithoutFeedback>

        {/* ── Logo ── */}
        <View style={styles.logoWrap}>
          <Text style={styles.logoIcon}>✂</Text>
        </View>

        {/* ── Heading ── */}
        <Text style={styles.heading}>Welcome Back!</Text>
        <Text style={styles.subheading}>
          Sign in to continue booking your favorite services
        </Text>

        {/* ── Form card ── */}
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

          {/* ── Remember me + Forgot password ── */}
          <View style={styles.rowBetween}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe(v => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowForgotModal(true)}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* ── Sign In button ── */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* ── OR divider ── */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Social buttons ── */}
        <View style={styles.socialButtons}>
          {/* Apple — iOS only */}
          {appleAvailable && (
            <TouchableOpacity style={styles.appleBtn} onPress={handleAppleLogin} activeOpacity={0.85}>
              <Ionicons name="logo-apple" size={20} color="#fff" />
              <Text style={styles.appleBtnText}>Continue with Apple</Text>
            </TouchableOpacity>
          )}
          
          {/* Google */}
          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} activeOpacity={0.85}>
            <Text style={styles.googleBtnIcon}>G</Text>
            <Text style={styles.socialBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* ── Sign Up link ── */}
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={onToggle}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Forgot Password Modal ── */}
      <ForgotPasswordModal
        visible={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        onSend={handlePasswordReset}
      />

      {/* ── Snackbar ── */}
      {snackbar && (
        <Snackbar message={snackbar.message} type={snackbar.type} visible={snackbarVisible} />
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PURPLE = '#8B5CF6';
const BG = '#f5f5f5';
const SURFACE = '#ffffff';
const SURFACE2 = '#f0f0f0';
const BORDER = '#e0e0e0';
const TEXT_PRIMARY = '#333333';
const TEXT_MUTED = '#6b7280';
const ERROR = '#ef4444';

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 48, paddingBottom: 32 },
  dismissArea: { height: 0 },

  loadingContainer: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: TEXT_MUTED, fontSize: 14, marginTop: 8 },

  logoWrap: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: SURFACE, borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 28,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 14, elevation: 4,
  },
  logoIcon: { fontSize: 36, color: PURPLE },

  heading: { fontSize: 30, fontWeight: '700', color: TEXT_PRIMARY, textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 },
  subheading: { fontSize: 15, color: TEXT_MUTED, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 8 },

  card: {
    backgroundColor: SURFACE, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, gap: 16,
  },

  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY, letterSpacing: 0.3, marginBottom: 2 },
  fieldContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9f9f9', borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14,
  },
  fieldError: { borderColor: ERROR },
  fieldInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 11, fontSize: 14, color: TEXT_PRIMARY },
  fieldRightIcon: { paddingLeft: 8 },
  fieldErrorText: { fontSize: 12, color: ERROR, marginTop: 2 },
  eyeIcon: { fontSize: 16, color: TEXT_MUTED },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  checkmark: { color: '#fff', fontSize: 11, fontWeight: '700' },
  rememberText: { fontSize: 13, color: TEXT_MUTED },
  forgotText: { fontSize: 13, color: PURPLE, fontWeight: '600' },

  primaryBtn: {
    backgroundColor: PURPLE, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 4,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 28, gap: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { fontSize: 11, color: TEXT_MUTED, fontWeight: '600', letterSpacing: 1 },

  socialButtons: { gap: 12 },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: SURFACE2, borderRadius: 12,
    paddingVertical: 14, borderWidth: 1, borderColor: BORDER,
  },
  googleBtnIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  socialBtnText: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },

  appleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#000', borderRadius: 12,
    paddingVertical: 14, borderWidth: 1, borderColor: '#000',
  },
  appleBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  signupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  signupText: { fontSize: 14, color: TEXT_MUTED },
  signupLink: { fontSize: 14, color: PURPLE, fontWeight: '700' },

  snackbar: {
    position: 'absolute', bottom: 24, left: 20, right: 20,
    borderRadius: 12, paddingVertical: 13, paddingHorizontal: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
  },
  snackbarText: { color: '#fff', fontSize: 14, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: {
    backgroundColor: SURFACE, borderRadius: 20, padding: 28,
    width: '100%', maxWidth: 400, borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  modalIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.1)', alignItems: 'center', justifyContent: 'center' },
  modalIcon: { fontSize: 18 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: TEXT_PRIMARY },
  modalSubtext: { fontSize: 14, color: TEXT_MUTED, lineHeight: 21, marginBottom: 20 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9f9f9', borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14,
  },
  inputIcon: { fontSize: 14, color: PURPLE, marginRight: 8 },
  modalInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 11, fontSize: 14, color: TEXT_PRIMARY },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: BORDER },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  sendBtn: {
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10,
    backgroundColor: PURPLE, shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2,
    shadowRadius: 6, elevation: 3, minWidth: 90, alignItems: 'center',
  },
  sendBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  disabledBtn: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  successBanner: { backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', borderRadius: 12, padding: 14 },
  successBannerText: { color: PURPLE, fontSize: 14, fontWeight: '500' },
});