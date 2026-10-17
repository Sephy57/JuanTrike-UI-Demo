import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DemoProvider } from '../booking/DemoContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DemoProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="passenger" />
          <Stack.Screen name="driver" />
          <Stack.Screen
            name="demo-panel"
            options={{ presentation: 'transparentModal', animation: 'fade' }}
          />
        </Stack>
      </DemoProvider>
    </SafeAreaProvider>
  );
}
