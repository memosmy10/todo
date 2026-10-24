import { Redirect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../src/providers/AuthProvider';
import { colors, radii } from '../src/theme';
import { isSupabaseConfigured } from '../src/lib/supabase';

export default function IndexRoute() {
  const { session, loading, error, refreshSession } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>d</Text>
          </View>
          <Text style={styles.brand}>daylist</Text>
          <Text style={styles.title}>One quick setup</Text>
          <Text style={styles.body}>
            Connect a Supabase project to enable secure accounts and keep your tasks synced.
          </Text>
          <View style={styles.steps}>
            <Text style={styles.step}>1. Copy .env.example to .env.</Text>
            <Text style={styles.step}>2. Add your Supabase URL and publishable key.</Text>
            <Text style={styles.step}>3. Run supabase/schema.sql in the SQL Editor.</Text>
            <Text style={styles.step}>4. Restart the app with npm start.</Text>
          </View>
          <Text style={styles.note}>
            Your publishable key is safe to include in the app when row-level security is enabled.
            Never add a service-role key here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>Getting your day ready…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <Text style={styles.title}>Couldn’t restore your session</Text>
          <Text style={styles.body}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void refreshSession()} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return <Redirect href={session ? '/(tabs)' : '/create-account'} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: 26,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
  },
  brandMark: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  brandMarkText: { color: colors.white, fontSize: 30, fontWeight: '700', lineHeight: 34 },
  brand: { marginTop: 12, color: colors.accentDark, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  title: { marginTop: 22, color: colors.ink, fontSize: 26, fontWeight: '700' },
  body: { marginTop: 10, color: colors.muted, fontSize: 15, lineHeight: 23 },
  steps: { gap: 12, marginTop: 24 },
  step: { color: colors.ink, fontSize: 14, lineHeight: 21 },
  note: { marginTop: 22, color: colors.muted, fontSize: 12, lineHeight: 18 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: 14, color: colors.muted, fontSize: 14 },
  button: {
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: radii.control,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
