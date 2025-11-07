// app/(tabs)/index.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/providers/AuthProvider";

export default function HomeTab() {
  const { session } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text>Welcome, {session?.user?.email} 👋</Text>
      <Text style={styles.subtitle}>Bounties will appear here soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: "700" },
  subtitle: { opacity: 0.6 },
});
