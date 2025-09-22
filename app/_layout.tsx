import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { UserProvider } from './contexts/UserContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
        <UserProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#fff' },
              headerTintColor: '#000',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: 'modal', title: '' }} // <-- empty string is safer
            />
          </Stack>
          <StatusBar style="dark" />
        </UserProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
