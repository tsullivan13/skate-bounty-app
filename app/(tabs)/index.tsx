// app/(tabs)/index.tsx
import React from 'react';
import { Button, Text, View } from 'react-native';
import { useAuth } from '../../src/providers/AuthProvider';

export default function HomeTab() {
  const { signOut } = useAuth();
  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Home</Text>
      <Text>Welcome to Skate Bounty 👋</Text>
      <Button title="Sign out" onPress={signOut} />
    </View>
  );
}
