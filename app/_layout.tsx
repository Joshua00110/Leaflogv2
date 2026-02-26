import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

// ✅ FIX: Handler moved OUTSIDE and updated with non-deprecated properties
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // Using newer properties to satisfy TypeScript
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    async function requestPermissions() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
      }
    }
    requestPermissions();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" /> 
      <Stack.Screen name="auth" /> 
      <Stack.Screen name="(tabs)" />
      {/* Dynamic route for the detail page */}
      <Stack.Screen name="plant/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="add" options={{ presentation: 'modal' }} />
    </Stack>
  );
}