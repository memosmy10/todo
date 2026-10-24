import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '../../src/lib/errors';
import { useTasks } from '../../src/providers/TaskProvider';
import { colors, radii } from '../../src/theme';
import type { TodoRow } from '../../src/lib/supabase';

type Filter = 'all' | 'open' | 'done';

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'To do' },
  { key: 'done', label: 'Done' },
];

export default function TasksScreen() {
  const { tasks, loading, loadError, refresh, addTask, toggleTask, deleteTask } = useTasks();
  const [filter, setFilter] = useState<Filter>('all');
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => filter === 'all' || task.completed === (filter === 'done')),
    [tasks, filter],
  );

  async function submitTask() {
    if (!draft.trim()) {
      setActionError('Enter a task name before adding it.');
      return;
    }

    setAdding(true);
    setActionError(null);
    try {
      await addTask(draft);
      setDraft('');
      setFilter('all');
    } catch (error) {
      setActionError(getErrorMessage(error, 'Your task could not be added.'));
    } finally {
      setAdding(false);
    }
  }

  async function changeTask(task: TodoRow, operation: 'toggle' | 'delete') {
    setActionError(null);
    setBusyIds((current) => new Set(current).add(task.id));
    try {
      if (operation === 'toggle') {
        await toggleTask(task);
      } else {
        await deleteTask(task.id);
      }
    } catch (error) {
      setActionError(getErrorMessage(error, 'Your task could not be updated.'));
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });
    }
  }

  function confirmDelete(task: TodoRow) {
    Alert.alert('Delete this task?', task.title, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void changeTask(task, 'delete'),
      },
    ]);
  }

  function renderTask({ item }: { item: TodoRow }) {
    const isBusy = busyIds.has(item.id);
    return (
      <View style={styles.taskRow}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.completed, disabled: isBusy }}
          accessibilityLabel={`${item.completed ? 'Mark incomplete' : 'Mark complete'}: ${item.title}`}
          disabled={isBusy}
          onPress={() => void changeTask(item, 'toggle')}
          style={[styles.checkbox, item.completed && styles.checkboxDone, isBusy && styles.checkboxBusy]}
        >
          {isBusy ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : item.completed ? (
            <Text style={styles.checkmark}>✓</Text>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => void changeTask(item, 'toggle')}
          style={styles.taskCopy}
        >
          <Text style={[styles.taskTitle, item.completed && styles.taskTitleDone]}>{item.title}</Text>
          <Text style={styles.taskStatus}>{item.completed ? 'Completed' : 'Tap the circle when done'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.title}`}
          disabled={isBusy}
          onPress={() => confirmDelete(item)}
          style={styles.removeButton}
        >
          <Text style={styles.removeText}>×</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.brand}>DAYLIST</Text>
        <Text style={styles.title}>Your tasks</Text>
        <Text style={styles.subtitle}>One thing at a time is plenty.</Text>

        <View style={styles.addRow}>
          <TextInput
            accessibilityLabel="New task"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => void submitTask()}
            placeholder="What would you like to do?"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            maxLength={160}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add task"
            disabled={adding}
            onPress={() => void submitTask()}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed, adding && styles.disabled]}
          >
            {adding ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.addText}>+</Text>}
          </Pressable>
        </View>

        <View style={styles.filters}>
          {filters.map((item) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: filter === item.key }}
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[styles.filterChip, filter === item.key && styles.filterChipSelected]}
            >
              <Text style={[styles.filterText, filter === item.key && styles.filterTextSelected]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
          <Text style={styles.count}>{visibleTasks.length} {visibleTasks.length === 1 ? 'task' : 'tasks'}</Text>
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

        {loading && tasks.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
          <FlatList
            data={visibleTasks}
            keyExtractor={(task) => task.id}
            renderItem={renderTask}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={visibleTasks.length === 0 ? styles.emptyList : styles.list}
            refreshControl={
              <RefreshControl
                refreshing={loading && tasks.length > 0}
                onRefresh={() => void refresh()}
                tintColor={colors.accent}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyMark}><Text style={styles.emptyCheck}>✓</Text></View>
                <Text style={styles.emptyTitle}>{emptyTitle(filter, tasks.length)}</Text>
                <Text style={styles.emptyText}>
                  {filter === 'all'
                    ? 'Add a task above and give your day a gentle start.'
                    : 'There’s nothing in this section right now.'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function emptyTitle(filter: Filter, taskCount: number): string {
  if (filter === 'done') {
    return taskCount === 0 ? 'Your list is ready.' : 'Nothing completed yet.';
  }
  if (filter === 'open') {
    return taskCount === 0 ? 'Your list is ready.' : 'All caught up.';
  }
  return 'A fresh page.';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 15 },
  brand: { color: colors.accentDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { marginTop: 13, color: colors.ink, fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { marginTop: 5, color: colors.muted, fontSize: 14 },
  addRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 7,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, paddingHorizontal: 12, color: colors.ink, fontSize: 14 },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  addText: { marginTop: -3, color: colors.white, fontSize: 27 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.7 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 14 },
  filterChip: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: radii.pill, backgroundColor: colors.warm },
  filterChipSelected: { backgroundColor: colors.accentDark },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  filterTextSelected: { color: colors.white },
  count: { flex: 1, color: colors.muted, fontSize: 12, textAlign: 'right' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
    padding: 13,
    borderRadius: radii.control,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 12, lineHeight: 18 },
  retry: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  list: { paddingBottom: 22 },
  emptyList: { flexGrow: 1, justifyContent: 'center', paddingBottom: 30 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: 24 },
  emptyMark: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  emptyCheck: { color: colors.accentDark, fontSize: 26, fontWeight: '700' },
  emptyTitle: { marginTop: 16, color: colors.ink, fontSize: 17, fontWeight: '700' },
  emptyText: { marginTop: 7, color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  taskRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
  },
  checkbox: {
    width: 25,
    height: 25,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { borderColor: colors.accent, backgroundColor: colors.accent },
  checkboxBusy: { opacity: 0.75 },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: '700' },
  taskCopy: { flex: 1, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  taskTitle: { color: colors.ink, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  taskTitleDone: { color: colors.muted, textDecorationLine: 'line-through' },
  taskStatus: { marginTop: 4, color: colors.muted, fontSize: 10 },
  removeButton: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.muted, fontSize: 22 },
});
