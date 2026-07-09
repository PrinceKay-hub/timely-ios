import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { useTheme } from '@/providers/ThemeProvider';

interface Props { onToggle: () => void }

export default function SignUpScreen({ onToggle }: Props) {
  const router = useRouter();
  const { promptAsync } = useGoogleAuth();
  const { signUpWithEmail, signInWithGoogle, signInWithApple, isLoading, error, user } = useAuthStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // ─── Dynamic styles ──────────────────────────────────────────────────────
  const styles = useMemo(() => createStyles(colors), [colors]);

  // ─── State ──────────────────────────────────────────────────────────────
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

  // ─── Snackbar (nested) ──────────────────────────────────────────────────
  const Snackbar = ({ message, visible }: { message: string; visible: boolean }) => {
    const translateY = useRef(new Animated.Value(100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.spring(translateY, { toValue: visible ? 0 : 100, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }, [visible]);

    return (
      <Animated.View style={[styles.snackbar, { backgroundColor: colors.error || '#ef4444', transform: [{ translateY }], opacity }]}>
        <Ionicons name="alert-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.snackbarText}>{message}</Text>
      </Animated.View>
    );
  };

  // ─── Field (nested) ──────────────────────────────────────────────────────
  const Field = ({
    label, value, onChangeText, placeholder, error,
    icon, secureTextEntry = false, keyboardType = 'default',
    autoCapitalize = 'none', autoComplete = 'off', rightIcon,
  }: any) => (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldContainer, !!error && styles.fieldError]}>
        <Ionicons name={icon} size={18} color={colors.textSecondary || '#b0a8c8'} style={styles.fieldIcon} />
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary || '#c0b8d8'}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
        />
        {rightIcon && <View style={styles.fieldRight}>{rightIcon}</View>}
      </View>
      {!!error && (
        <View style={styles.fieldErrorRow}>
          <Ionicons name="alert-circle-outline" size={12} color={colors.error || '#ef4444'} />
          <Text style={[styles.fieldErrorText, { color: colors.error || '#ef4444' }]}>{error}</Text>
        </View>
      )}
    </View>
  );

  // ─── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  useEffect(() => {
    if (error) showSnack(error);
  }, [error]);

  useEffect(() => {
    if (user) router.replace('/(tabs)/home');
  }, [user, router]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
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

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSignUp = async () => {
    if (!validate()) return;
    if (!agreeToTerms) {
      showSnack('Please agree to the Terms & Conditions to continue');
      return;
    }
    await signUpWithEmail(email, password, name, 'client');
  };

  const handleGoogleLogin = async () => {
    const result = await promptAsync();
    if (result.type === 'cancelled') return;
    if (result.type === 'error') {
      showSnack(result.message);
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
        showSnack('Apple sign-in failed. Please try again.');
      }
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Creating your account…</Text>
      </View>
    );
  }

  const isDark = theme.dark;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={[styles.logoWrap, { backgroundColor: colors.card || colors.background }]}>
          <Text style={[styles.logoIcon, { color: colors.primary }]}>✂</Text>
        </View>

        {/* Heading */}
        <Text style={[styles.heading, { color: colors.text }]}>Create Account</Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          Sign up to start booking your favorite services
        </Text>

        {/* Form card */}
        <View style={[styles.card, { backgroundColor: colors.card || colors.background, borderColor: colors.border || '#e0e0e0' }]}>
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
                <Text style={[styles.eyeIcon, { color: colors.textSecondary }]}>{showPassword ? '🙈' : '👁'}</Text>
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
                <Text style={[styles.eyeIcon, { color: colors.textSecondary }]}>{showConfirmPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            }
          />

          {/* Terms */}
          <TouchableOpacity style={styles.termsRow} onPress={() => setAgreeToTerms(v => !v)} activeOpacity={0.7}>
            <View style={[styles.checkbox, agreeToTerms && styles.checkboxActive]}>
              {agreeToTerms && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
              I agree to the{' '}
              <Text style={[styles.termsLink, { color: colors.primary }]} onPress={() => router.push('/terms')}>Terms & Conditions</Text>
              {' '}and{' '}
              <Text style={[styles.termsLink, { color: colors.primary }]} onPress={() => router.push('/privacy')}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* Sign Up button */}
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleSignUp} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* OR divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border || '#e0e0e0' }]} />
          <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border || '#e0e0e0' }]} />
        </View>

        {/* Social buttons */}
        <View style={styles.socialButtons}>
          {appleAvailable && (
            <TouchableOpacity style={styles.appleBtn} onPress={handleAppleLogin} activeOpacity={0.85}>
              <Ionicons name="logo-apple" size={20} color="#fff" />
              <Text style={styles.appleBtnText}>Continue with Apple</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.googleBtn, { backgroundColor: colors.card || colors.background, borderColor: colors.border || '#e0e0e0' }]} onPress={handleGoogleLogin} activeOpacity={0.85}>
            <Text style={styles.googleBtnIcon}>G</Text>
            <Text style={[styles.socialBtnText, { color: colors.text }]}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
          <TouchableOpacity onPress={onToggle}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Snackbar message={snackbarMsg} visible={snackbarVisible} />
    </KeyboardAvoidingView>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 48, paddingBottom: 32 },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, marginTop: 8 },
    logoWrap: {
      width: 80,
      height: 80,
      borderRadius: 22,
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
    logoIcon: { fontSize: 36 },
    eyeIcon: { fontSize: 16 },
    heading: { fontSize: 30, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 },
    subheading: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 8 },
    card: {
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      shadowColor: '#9b8bb4',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 4,
    },
    fieldWrap: { marginBottom: 16 },
    fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, letterSpacing: 0.2, color: colors.text },
    fieldContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border || '#e0e0e0',
      paddingHorizontal: 14,
    },
    fieldError: { borderColor: colors.error || '#ef4444', backgroundColor: `${colors.error}10` },
    fieldIcon: { marginRight: 10 },
    fieldInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 11, fontSize: 14, color: colors.text },
    fieldRight: { paddingLeft: 8 },
    fieldErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
    fieldErrorText: { fontSize: 12 },
    termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4, marginBottom: 20 },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: colors.border || '#e0e0e0',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
      flexShrink: 0,
      backgroundColor: colors.surface,
    },
    checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    termsText: { flex: 1, fontSize: 13, lineHeight: 20 },
    termsLink: { fontWeight: '600' },
    primaryBtn: {
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 5,
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 28, gap: 14 },
    dividerLine: { flex: 1, height: 1 },
    dividerText: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
    socialButtons: { gap: 12 },
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 12,
      paddingVertical: 14,
      borderWidth: 1.5,
      shadowColor: '#9b8bb4',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
      elevation: 2,
    },
    googleBtnIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
    socialBtnText: { fontSize: 15, fontWeight: '600' },
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 3,
    },
    appleBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 28 },
    footerText: { fontSize: 14 },
    footerLink: { fontSize: 14, fontWeight: '700' },
    snackbar: {
      position: 'absolute',
      bottom: 24,
      left: 20,
      right: 20,
      borderRadius: 12,
      paddingVertical: 13,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    snackbarText: { color: '#fff', fontSize: 14, fontWeight: '500', flex: 1 },
  });