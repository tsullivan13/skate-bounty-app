// app/modal.tsx
import { useRouter } from "expo-router";
import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";

export default function ModalScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modal</Text>
      <Text style={styles.body}>
        This is a simple modal screen. Replace this with any quick actions or
        context details you want to show.
      </Text>

      <View style={{ marginTop: 16 }}>
        <Button title="Close" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12, flex: 1, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700" },
  body: { fontSize: 16, opacity: 0.75 },
});
