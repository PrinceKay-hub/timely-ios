import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'expo-router';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

// ─── Constants ────────────────────────────────────────────────────────────────
const PURPLE = '#8B5CF6';
const BG = '#f5f5f5';
const SURFACE = '#ffffff';
const BORDER = '#e0e0e0';
const TEXT_PRIMARY = '#333333';
const TEXT_MUTED = '#6b7280';
const ERROR = '#ef4444';

interface Props { onToggle: () => void }

// ─── Snackbar ─────────────────────────────────────────────────────────────────
const Snackbar = ({ message, visible }: { message: string; visible: boolean }) => {
  const translateY = React.useRef(new Animated.Value(100)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: visible ? 0 : 100, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  return (
    <Animated.View style={[styles.snackbar, { transform: [{ translateY }], opacity }]}>
      <Ionicons name="alert-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
      <Text style={styles.snackbarText}>{message}</Text>
    </Animated.View>
  );
};

// ─── Field ────────────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  error?: string | null;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words';
  autoComplete?: 'email' | 'password' | 'name' | 'off';
  rightIcon?: React.ReactNode;
}

const Field = ({
  label, value, onChangeText, placeholder, error,
  icon, secureTextEntry = false, keyboardType = 'default',
  autoCapitalize = 'none', autoComplete = 'off', rightIcon,
}: FieldProps) => (
  <View style={fieldStyles.wrap}>
    <Text style={fieldStyles.label}>{label}</Text>
    <View style={[fieldStyles.container, !!error && fieldStyles.errored]}>
      <Ionicons name={icon} size={18} color="#b0a8c8" style={fieldStyles.icon} />
      <TextInput
        style={fieldStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#c0b8d8"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={false}
      />
      {rightIcon && <View style={fieldStyles.right}>{rightIcon}</View>}
    </View>
    {!!error && (
      <View style={fieldStyles.errorRow}>
        <Ionicons name="alert-circle-outline" size={12} color={ERROR} />
        <Text style={fieldStyles.errorText}>{error}</Text>
      </View>
    )}
  </View>
);

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 6, letterSpacing: 0.2 },
  container: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAF9FC', borderRadius: 12,
    borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 14,
  },
  errored: { borderColor: ERROR, backgroundColor: '#FFF8F8' },
  icon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 11, fontSize: 14, color: TEXT_PRIMARY },
  right: { paddingLeft: 8 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  errorText: { fontSize: 12, color: ERROR },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SignUpScreen({ onToggle }: Props) {
  const router = useRouter();
  const { promptAsync } = useGoogleAuth();
  const { signUpWithEmail, signInWithGoogle, signInWithApple, isLoading, error, user } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [appleAvailable, setAppleAvailable] = useState(false);

  // ── Check Apple availability ───────────────────────────────────────────────
  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  // ── Auth store errors → snackbar ───────────────────────────────────────────
  useEffect(() => {
    if (error) showSnack(error);
  }, [error]);

  // ── Redirect on Signup ──────────────────────────────────────────────────────
    useEffect(() => {
      if (user) router.replace('/(tabs)/home');
    }, [user, router]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const showSnack = (msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarVisible(true);
    setTimeout(() => setSnackbarVisible(false), 3500);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Please enter your full name';
    if (!email.trim()) errors.email = 'Please enter your email';
    else if (!email.includes('@')) errors.email = 'Please enter a valid email';
    if (!password) errors.password = 'Please enter a password';
    else if (password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Email sign-up ──────────────────────────────────────────────────────────
  const handleSignUp = async () => {
    if (!validate()) return;
    if (!agreeToTerms) {
      showSnack('Please agree to the Terms & Conditions to continue');
      return;
    }
    await signUpWithEmail(email, password, name, 'client');
  };

  // ── Google sign-up ─────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    const result = await promptAsync();
    if (result.type === 'cancelled') return;
    if (result.type === 'error') {
      showSnack(result.message);
      return;
    }
    await signInWithGoogle(result.idToken);
  };

  // ── Apple sign-up ──────────────────────────────────────────────────────────
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
      if (e.code !== 'ERR_CANCELED') {
        showSnack('Apple sign-in failed. Please try again.');
      }
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={PURPLE} />
        <Text style={styles.loadingText}>Creating your account…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Logo ── */}
        <View style={styles.logoWrap}>
          <Text style={styles.logoIcon}>✂</Text>
        </View>

        {/* ── Heading ── */}
        <Text style={styles.heading}>Create Account</Text>
        <Text style={styles.subheading}>
          Sign up to start booking your favorite services
        </Text>

        {/* ── Form card ── */}
        <View style={styles.card}>
          <Field
            label="Full Name"
            value={name}
            onChangeText={(v) => { setName(v); if (formErrors.name) setFormErrors(e => ({ ...e, name: '' })); }}
            placeholder="John Doe"
            icon="person-outline"
            autoCapitalize="words"
            autoComplete="name"
            error={formErrors.name}
          />
          <Field
            label="Email Address"
            value={email}
            onChangeText={(v) => { setEmail(v); if (formErrors.email) setFormErrors(e => ({ ...e, email: '' })); }}
            placeholder="your.email@example.com"
            icon="mail-outline"
            keyboardType="email-address"
            autoComplete="email"
            error={formErrors.email}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={(v) => { setPassword(v); if (formErrors.password) setFormErrors(e => ({ ...e, password: '' })); }}
            placeholder="••••••••"
            icon="lock-closed-outline"
            secureTextEntry={!showPassword}
            autoComplete="password"
            error={formErrors.password}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            }
          />
          <Field
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); if (formErrors.confirmPassword) setFormErrors(e => ({ ...e, confirmPassword: '' })); }}
            placeholder="••••••••"
            icon="lock-closed-outline"
            secureTextEntry={!showConfirmPassword}
            autoComplete="password"
            error={formErrors.confirmPassword}
            rightIcon={
              <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            }
          />

          {/* ── Terms ── */}
          <TouchableOpacity style={styles.termsRow} onPress={() => setAgreeToTerms(v => !v)} activeOpacity={0.7}>
            <View style={[styles.checkbox, agreeToTerms && styles.checkboxActive]}>
              {agreeToTerms && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/terms')}>Terms & Conditions</Text>
              {' '}and{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/privacy')}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* ── Sign Up button ── */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSignUp} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Create Account</Text>
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

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={onToggle}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Snackbar message={snackbarMsg} visible={snackbarVisible} />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 48, paddingBottom: 32 },
  loading: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', gap: 12 },
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
  eyeIcon: { fontSize: 16, color: TEXT_MUTED },

  heading: { fontSize: 30, fontWeight: '700', color: TEXT_PRIMARY, textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 },
  subheading: { fontSize: 15, color: TEXT_MUTED, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 8 },

  card: {
    backgroundColor: SURFACE, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#9b8bb4', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 4,
  },

  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4, marginBottom: 20 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5,
    borderColor: BORDER, alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0, backgroundColor: '#FAF9FC',
  },
  checkboxActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  termsText: { flex: 1, fontSize: 13, color: TEXT_MUTED, lineHeight: 20 },
  termsLink: { color: PURPLE, fontWeight: '600' },

  primaryBtn: {
    backgroundColor: PURPLE, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3,
    shadowRadius: 12, elevation: 5,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 28, gap: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { fontSize: 11, color: TEXT_MUTED, fontWeight: '600', letterSpacing: 1 },

  socialButtons: { gap: 12 },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: SURFACE, borderRadius: 12,
    paddingVertical: 14, borderWidth: 1.5, borderColor: BORDER,
    shadowColor: '#9b8bb4', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  googleBtnIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  socialBtnText: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },

  appleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#000', borderRadius: 12,
    paddingVertical: 14, borderWidth: 1, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  appleBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  footerText: { fontSize: 14, color: TEXT_MUTED },
  footerLink: { fontSize: 14, color: PURPLE, fontWeight: '700' },

  snackbar: {
    position: 'absolute', bottom: 24, left: 20, right: 20,
    backgroundColor: ERROR, borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: ERROR, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  snackbarText: { color: '#fff', fontSize: 14, fontWeight: '500', flex: 1 },
});