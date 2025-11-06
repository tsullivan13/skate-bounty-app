// app/_layout.tsx
import { Slot } from 'expo-router';
import React from 'react';
import { AuthProvider } from '../src/providers/AuthProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}
