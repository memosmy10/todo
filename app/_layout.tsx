import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../src/providers/AuthProvider';
import { TaskProvider } from '../src/providers/TaskProvider';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TaskProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="create-account" />
            <Stack.Screen name="auth/callback" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </TaskProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
