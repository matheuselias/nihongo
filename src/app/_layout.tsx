import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { db } from '@/db/client';
import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { success, error } = useMigrations(db, migrations);
  const ready = success || !!error;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {error ? (
        <EmptyState title="Erro ao abrir o app" message={`Não foi possível preparar seus dados: ${error.message}`} />
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ statusBarStyle: 'light' }} />
          <Stack.Screen name="lesson/[id]" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="review-session" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="card-session" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      )}
    </ThemeProvider>
  );
}
