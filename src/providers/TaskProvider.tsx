import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { getErrorMessage } from '../lib/errors';
import { supabase, type TodoRow } from '../lib/supabase';
import { useAuth } from './AuthProvider';

type TaskContextValue = {
  tasks: TodoRow[];
  loading: boolean;
  loadError: string | null;
  refresh: () => Promise<void>;
  addTask: (title: string) => Promise<void>;
  toggleTask: (task: TodoRow) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
};

const TaskContext = createContext<TaskContextValue | null>(null);

export function TaskProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [taskState, setTaskState] = useState<{ ownerId: string | null; items: TodoRow[] }>({
    ownerId: null,
    items: [],
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestId = useRef(0);
  const tasks = useMemo(
    () => (taskState.ownerId === (userId ?? null) ? taskState.items : []),
    [taskState, userId],
  );

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!supabase || !userId) {
      setLoadError(null);
      setLoading(false);
      return;
    }

    const client = supabase;
    setLoading(true);
    setLoadError(null);

    try {
      const { data, error } = await client
        .from('todos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      if (currentRequest === requestId.current) {
        setTaskState({ ownerId: userId, items: data });
      }
    } catch (error) {
      if (currentRequest === requestId.current) {
        setLoadError(getErrorMessage(error, 'Your tasks could not be loaded.'));
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        return refresh();
      }
    });
    return () => {
      active = false;
      requestId.current += 1;
    };
  }, [refresh]);

  const getClientAndUser = useCallback(() => {
    const client = supabase;
    if (!client || !userId) {
      throw new Error('Sign in before changing your tasks.');
    }
    return { client, userId };
  }, [userId]);

  const addTask = useCallback(
    async (title: string) => {
      const cleanedTitle = title.trim();
      if (!cleanedTitle) {
        throw new Error('Enter a task before adding it.');
      }
      if (cleanedTitle.length > 160) {
        throw new Error('Keep task names to 160 characters or fewer.');
      }

      const { client, userId: ownerId } = getClientAndUser();
      const { data, error } = await client
        .from('todos')
        .insert({ title: cleanedTitle, user_id: ownerId })
        .select('*')
        .single();

      if (error) {
        throw error;
      }
      setTaskState((current) => ({
        ownerId,
        items: [data, ...(current.ownerId === ownerId ? current.items : [])],
      }));
    },
    [getClientAndUser],
  );

  const toggleTask = useCallback(
    async (task: TodoRow) => {
      const { client, userId: ownerId } = getClientAndUser();
      const { error } = await client
        .from('todos')
        .update({ completed: !task.completed })
        .eq('id', task.id)
        .eq('user_id', ownerId);

      if (error) {
        throw error;
      }
      setTaskState((current) => ({
        ownerId,
        items:
          current.ownerId === ownerId
            ? current.items.map((currentTask) =>
                currentTask.id === task.id
                  ? { ...currentTask, completed: !task.completed }
                  : currentTask,
              )
            : current.items,
      }));
    },
    [getClientAndUser],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const { client, userId: ownerId } = getClientAndUser();
      const { error } = await client
        .from('todos')
        .delete()
        .eq('id', taskId)
        .eq('user_id', ownerId);

      if (error) {
        throw error;
      }
      setTaskState((current) => ({
        ownerId,
        items:
          current.ownerId === ownerId
            ? current.items.filter((task) => task.id !== taskId)
            : current.items,
      }));
    },
    [getClientAndUser],
  );

  const value = useMemo(
    () => ({ tasks, loading, loadError, refresh, addTask, toggleTask, deleteTask }),
    [tasks, loading, loadError, refresh, addTask, toggleTask, deleteTask],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const value = useContext(TaskContext);
  if (!value) {
    throw new Error('useTasks must be used inside TaskProvider.');
  }
  return value;
}
