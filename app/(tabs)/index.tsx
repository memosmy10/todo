import { useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '../../src/lib/errors';
import { openPolicyPage } from '../../src/lib/policies';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/providers/AuthProvider';
import { useTasks } from '../../src/providers/TaskProvider';
import { colors, radii } from '../../src/theme';

export default function HomeScreen() {
  const { session, signOut } = useAuth();
  const { tasks, loading, loadError, refresh, addTask } = useTasks();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);

  const completedCount = tasks.filter((task) => task.completed).length;
  const remainingCount = tasks.length - completedCount;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const firstName = getFirstName(session?.user.user_metadata.full_name, session?.user.email);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  async function submitQuickTask() {
    if (!draft.trim()) {
      setActionError('Write a task first, then tap add.');
      return;
    }

    setBusy(true);
    setActionError(null);
    try {
      await addTask(draft);
      setDraft('');
    } catch (error) {
      setActionError(getErrorMessage(error, 'Your task could not be added.'));
    } finally {
      setBusy(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and all of your tasks. This can’t be undone.',
      [
        { text: 'Keep account', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => void deleteAccount(),
        },
      ],
    );
  }

  async function deleteAccount() {
    if (!supabase) {
      return;
    }

    setAccountBusy(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) {
        throw error;
      }
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) {
        throw signOutError;
      }
      Alert.alert('Account deleted', 'Your account and tasks have been permanently removed.');
    } catch (error) {
      setActionError(
        `${getErrorMessage(error, 'Your account could not be deleted.')} Make sure the delete-account function is deployed.`,
      );
    } finally {
      setAccountBusy(false);
    }
  }

  async function handleSignOut() {
    setAccountBusy(true);
    setActionError(null);
    try {
      await signOut();
    } catch (error) {
      setActionError(getErrorMessage(error, 'You could not be signed out.'));
    } finally {
      setAccountBusy(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>DAYLIST</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName.slice(0, 1).toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.greeting}>{greeting}, {firstName}.</Text>
        <Text style={styles.subheading}>A clearer day starts with one small step.</Text>

        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <Text style={styles.progressEyebrow}>YOUR PROGRESS</Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.progressBottom}>
            <Text style={styles.progressCaption}>{completedCount} of {tasks.length} done</Text>
            <Text style={styles.progressCaption}>
              {remainingCount === 1 ? '1 task left' : `${remainingCount} tasks left`}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>A task on your mind?</Text>
        </View>
        <View style={styles.quickAdd}>
          <TextInput
            accessibilityLabel="New task"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => void submitQuickTask()}
            placeholder="Add a quick task..."
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            maxLength={160}
            style={styles.quickInput}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add task"
            disabled={busy}
            onPress={() => void submitQuickTask()}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed, busy && styles.disabled]}
          >
            {busy ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.addButtonText}>+</Text>}
          </Pressable>
        </View>

        {(actionError || loadError) && (
          <View style={styles.errorBanner}>
            <Text accessibilityRole="alert" style={styles.errorText}>{actionError ?? loadError}</Text>
            {loadError && (
              <Pressable accessibilityRole="button" onPress={() => void refresh()}>
                <Text style={styles.retry}>Retry</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Up next</Text>
          <Pressable accessibilityRole="button" onPress={() => router.navigate('/(tabs)/tasks')}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        <View style={styles.previewCard}>
          {loading && tasks.length === 0 ? (
            <ActivityIndicator color={colors.accent} style={styles.empty} />
          ) : tasks.filter((task) => !task.completed).length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nothing waiting on you.</Text>
              <Text style={styles.emptyText}>Add one small task whenever you’re ready.</Text>
            </View>
          ) : (
            tasks.filter((task) => !task.completed).slice(0, 3).map((task, index) => (
              <Pressable
                accessibilityRole="button"
                key={task.id}
                onPress={() => router.navigate('/(tabs)/tasks')}
                style={[styles.previewRow, index > 0 && styles.previewDivider]}
              >
                <View style={styles.previewDot} />
                <Text numberOfLines={1} style={styles.previewText}>{task.title}</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.accountCard}>
          <View style={styles.accountText}>
            <Text style={styles.accountTitle}>Your account</Text>
            <Text numberOfLines={1} style={styles.accountEmail}>{session?.user.email}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={accountBusy}
            onPress={() => void handleSignOut()}
            style={styles.signOutButton}
          >
            {accountBusy ? (
              <ActivityIndicator color={colors.accentDark} size="small" />
            ) : (
              <Text style={styles.signOutText}>Sign out</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => void openPolicyPage('privacy-policy.html')}
            style={styles.policyButton}
          >
            <Text style={styles.policyText}>Privacy policy</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => void openPolicyPage('account-deletion.html')}
            style={styles.policyButton}
          >
            <Text style={styles.policyText}>Deletion help</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Permanently remove your account and all tasks"
            disabled={accountBusy}
            onPress={confirmDeleteAccount}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>Delete account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getFirstName(name: unknown, email: string | undefined): string {
  if (typeof name === 'string' && name.trim()) {
    return name.trim().split(/\s+/)[0];
  }
  return email?.split('@')[0] || 'there';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 22, paddingTop: 15, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: colors.accentDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  date: { marginTop: 5, color: colors.muted, fontSize: 13 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  avatarText: { color: colors.accentDark, fontSize: 17, fontWeight: '700' },
  greeting: { marginTop: 29, color: colors.ink, fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  subheading: { marginTop: 7, color: colors.muted, fontSize: 14, lineHeight: 21 },
  progressCard: { marginTop: 24, padding: 20, borderRadius: radii.card, backgroundColor: colors.accentDark },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressEyebrow: { color: '#D8E7E0', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  progressPercent: { color: colors.white, fontSize: 26, fontWeight: '700' },
  progressTrack: { height: 7, marginTop: 15, overflow: 'hidden', borderRadius: 8, backgroundColor: '#62877C' },
  progressFill: { height: '100%', borderRadius: 8, backgroundColor: '#E4C795' },
  progressBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 11 },
  progressCaption: { color: '#E0EBE5', fontSize: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 27,
    marginBottom: 12,
  },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  quickAdd: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 7,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  quickInput: { flex: 1, paddingHorizontal: 12, color: colors.ink, fontSize: 14 },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  addButtonText: { marginTop: -3, color: colors.white, fontSize: 27, fontWeight: '400' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.7 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
    padding: 13,
    borderRadius: radii.control,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 12, lineHeight: 18 },
  retry: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  seeAll: { color: colors.accentDark, fontSize: 13, fontWeight: '700' },
  previewCard: { overflow: 'hidden', borderRadius: radii.card, backgroundColor: colors.surface },
  previewRow: { minHeight: 57, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17 },
  previewDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  previewDot: { width: 9, height: 9, borderWidth: 1.5, borderColor: colors.accent, borderRadius: 5 },
  previewText: { flex: 1, marginLeft: 12, color: colors.ink, fontSize: 14 },
  chevron: { marginLeft: 10, color: colors.muted, fontSize: 23 },
  empty: { minHeight: 108, alignItems: 'center', justifyContent: 'center', padding: 16 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  emptyText: { marginTop: 5, color: colors.muted, fontSize: 12, textAlign: 'center' },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
  },
  accountText: { flex: 1, minWidth: 160 },
  accountTitle: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  accountEmail: { marginTop: 4, color: colors.muted, fontSize: 11 },
  signOutButton: { paddingHorizontal: 8, paddingVertical: 8 },
  signOutText: { color: colors.accentDark, fontSize: 12, fontWeight: '700' },
  deleteButton: { width: '100%', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  policyButton: { paddingHorizontal: 8, paddingVertical: 8 },
  policyText: { color: colors.accentDark, fontSize: 12, fontWeight: '600' },
  deleteText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
});
