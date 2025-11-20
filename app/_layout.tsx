// app/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';
import { StatusBar } from 'react-native';
import { palette } from '../constants/theme';
import { HeaderLogo } from '../src/components/HeaderLogo';
import { AuthProvider } from '../src/providers/AuthProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: palette.bg },
          headerShown: false,
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
          headerTitleAlign: 'center',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="bounty/[id]"
          options={{
            headerShown: true,
            title: 'Bounty',
            headerTitle: () => <HeaderLogo title="Bounty" centered />,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="spot/[id]"
          options={{
            headerShown: true,
            title: 'Spot',
            headerTitle: () => <HeaderLogo title="Spot" centered />,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen name="login" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}
