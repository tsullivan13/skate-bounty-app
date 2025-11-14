// app/_layout.tsx
import { Slot } from 'expo-router';
import React from 'react';
import { StatusBar, View } from 'react-native';
import { palette } from '../constants/theme';
import { AuthProvider } from '../src/providers/AuthProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        <StatusBar barStyle="light-content" />
        <Slot />
      </View>
    </AuthProvider>
  );
}
