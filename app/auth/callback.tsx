import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '../../src/lib/errors';
import { supabase } from '../../src/lib/supabase';
import { colors, radii } from '../../src/theme';

export default function AuthCallbackScreen() {
  const { code, error, error_description: errorDescription } = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const processedCode = useRef<string | null>(null);
  const message =
    errorMessage ??
    (!code ? errorDescription || error || 'This confirmation link is incomplete or has expired.' : null);
  const busy = Boolean(code) && message === null;

  useEffect(() => {
    if (!code || processedCode.current === code) {
      return;
    }

    processedCode.current = code;
    let active = true;

    async function confirmEmail(authCode: string) {
      if (!supabase) {
        if (active) {
          setErrorMessage('Daylist could not connect to its sign-in service. Please try again later.');
        }
        return;
      }

      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
        if (exchangeError) {
          throw exchangeError;
        }
        if (active) {
          router.replace('/(tabs)');
        }
      } catch (exchangeError) {
        if (active) {
          setErrorMessage(
            `${getErrorMessage(exchangeError, 'We could not confirm your email.')} Request a new confirmation email and open its link on the device where you created your account.`,
          );
        }
      }
    }

    void confirmEmail(code);
    return () => {
      active = false;
    };
  }, [code, error, errorDescription]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>d</Text></View>
        <Text style={styles.brand}>daylist</Text>
        <Text style={styles.title}>{message ? 'We couldn’t finish signing you in.' : 'Confirming your email…'}</Text>
        <Text accessibilityRole={message ? 'alert' : undefined} style={styles.body}>
          {message ?? 'Just a moment while we securely confirm your address and open your task list.'}
        </Text>
        {busy ? (
          <ActivityIndicator color={colors.accent} size="large" style={styles.spinner} />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace({ pathname: '/login', params: { mode: 'signIn' } })}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Go to sign in</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  card: {
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
  title: { marginTop: 23, color: colors.ink, fontSize: 24, fontWeight: '700' },
  body: { marginTop: 10, color: colors.muted, fontSize: 14, lineHeight: 22 },
  spinner: { marginTop: 24 },
  button: {
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: radii.control,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
