import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { getErrorMessage } from '../src/lib/errors';
import { supabase } from '../src/lib/supabase';
import { colors, radii } from '../src/theme';

type AuthMode = 'signIn' | 'signUp';

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('signUp');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSignUp = mode === 'signUp';

  async function submit() {
    setErrorMessage(null);
    setMessage(null);

    if (!supabase) {
      setErrorMessage('Add your Supabase settings to .env before creating an account.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (isSignUp && !name.trim()) {
      setErrorMessage('Enter your name to create an account.');
      return;
    }
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Use a password with at least 8 characters.');
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setErrorMessage('Those passwords don’t match yet.');
      return;
    }

    setBusy(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) {
          throw error;
        }
        if (!data.session) {
          setMessage('Check your inbox for a confirmation link, then come back and sign in.');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) {
          throw error;
        }
        router.replace('/(tabs)');
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'We couldn’t complete that request. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage(null);
    setErrorMessage(null);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>d</Text>
            </View>
            <Text style={styles.brand}>daylist</Text>
            <Text style={styles.title}>{isSignUp ? 'A little more room to focus.' : 'Welcome back.'}</Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? 'Create your account and make today feel lighter.'
                : 'Sign in to pick up right where you left off.'}
            </Text>

            {isSignUp && (
              <Field
                label="Your name"
                value={name}
                onChangeText={setName}
                placeholder="Alex Morgan"
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
              />
            )}
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              returnKeyType={isSignUp ? 'next' : 'done'}
              onSubmitEditing={() => {
                if (!isSignUp) {
                  void submit();
                }
              }}
            />
            {isSignUp && (
              <Field
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Type your password again"
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={() => void submit()}
              />
            )}

            {errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
            {message && <Text accessibilityRole="alert" style={styles.success}>{message}</Text>}

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !busy && styles.buttonPressed,
                busy && styles.buttonDisabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
              )}
            </Pressable>

            <View style={styles.modeSwitch}>
              <Text style={styles.modeText}>
                {isSignUp ? 'Already have an account?' : 'New to Daylist?'}
              </Text>
              <Pressable onPress={() => changeMode(isSignUp ? 'signIn' : 'signUp')}>
                <Text style={styles.modeLink}>{isSignUp ? ' Sign in' : ' Create account'}</Text>
              </Pressable>
            </View>
            <Text style={styles.footnote}>Your account and tasks stay synced to your private workspace.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'name' | 'new-password' | 'current-password';
  keyboardType?: 'default' | 'email-address';
  returnKeyType?: 'done' | 'next';
  secureTextEntry?: boolean;
  onSubmitEditing?: () => void;
};

function Field({ label, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        autoCorrect={false}
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  form: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    padding: 26,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  brandMarkText: { color: colors.white, fontSize: 29, fontWeight: '700', lineHeight: 32 },
  brand: { marginTop: 10, color: colors.accentDark, fontSize: 14, fontWeight: '700', letterSpacing: 1.4 },
  title: { marginTop: 23, color: colors.ink, fontSize: 27, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { marginTop: 8, marginBottom: 20, color: colors.muted, fontSize: 14, lineHeight: 21 },
  field: { marginTop: 13 },
  label: { marginBottom: 7, color: colors.ink, fontSize: 13, fontWeight: '600' },
  input: {
    height: 52,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.control,
    color: colors.ink,
    backgroundColor: colors.background,
    fontSize: 15,
  },
  error: { marginTop: 14, color: colors.danger, fontSize: 13, lineHeight: 19 },
  success: { marginTop: 14, color: colors.accentDark, fontSize: 13, lineHeight: 19 },
  primaryButton: {
    height: 54,
    marginTop: 22,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  buttonPressed: { backgroundColor: colors.accentDark },
  buttonDisabled: { opacity: 0.7 },
  modeSwitch: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  modeText: { color: colors.muted, fontSize: 13 },
  modeLink: { color: colors.accentDark, fontSize: 13, fontWeight: '700' },
  footnote: { marginTop: 23, color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
