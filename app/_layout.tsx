// app/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';
import { StatusBar } from 'react-native';
import { palette } from '../constants/theme';
import { AuthProvider } from '../src/providers/AuthProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: palette.bg },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bounty/[id]" options={{ headerShown: true, title: 'Bounty' }} />
        <Stack.Screen name="login" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}
