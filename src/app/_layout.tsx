import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/ui';
import { DataProvider } from '@/context/data-context';
import { SessionProvider, useSession } from '@/context/session-context';
import { theme } from '@/theme';

function RootNavigator() {
  const { operator, restoring } = useSession();
  const isSignedIn = operator !== null;

  if (restoring) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <LoadingState message="Abrindo…" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
      }}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="part/[id]" options={{ headerShown: true, title: 'Detalhes da peça' }} />
        <Stack.Screen name="notification/[id]" options={{ headerShown: true, title: 'Notificação' }} />
        <Stack.Screen name="dossier/[partId]" options={{ headerShown: true, title: 'Dossiê da peça' }} />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <DataProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </DataProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
