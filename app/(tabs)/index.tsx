// app/(tabs)/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Bounty, fetchBounties, subscribeBounties } from "../../src/lib/bounties";
import { useAuth } from "../../src/providers/AuthProvider";

export default function HomeTab() {
  const { session } = useAuth();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMine, setFilterMine] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchBounties();
        setBounties(list);
      } catch (e) {
        console.log("Error loading bounties:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Realtime subscribe
  useEffect(() => {
    const unsubscribe = subscribeBounties(
      (row) => setBounties((prev) => [row, ...prev]), // insert on top
      (row) =>
        setBounties((prev) => prev.map((b) => (b.id === row.id ? row : b))),
      (row) => setBounties((prev) => prev.filter((b) => b.id !== row.id))
    );
    return unsubscribe;
  }, []);

  const filtered = useMemo(() => {
    if (!filterMine || !session) return bounties;
    return bounties.filter((b) => b.user_id === session.user.id);
  }, [bounties, filterMine, session]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Recent Bounties</Text>
        <Pressable
          onPress={() => setFilterMine((v) => !v)}
          style={[styles.toggle, filterMine && styles.toggleOn]}
        >
          <Text style={styles.toggleText}>{filterMine ? "My Bounties" : "All"}</Text>
        </Pressable>
      </View>

      {filtered.length === 0 ? (
        <Text>No bounties yet. Create one!</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.trick}>{item.trick}</Text>
              <Text style={styles.reward}>Reward: ${item.reward}</Text>
              <Text style={styles.meta}>
                by {item.user_id.slice(0, 6)}… •{" "}
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12, flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700" },
  card: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
  },
  trick: { fontSize: 20, fontWeight: "700" },
  reward: { fontSize: 16, marginTop: 4 },
  meta: { fontSize: 12, opacity: 0.6, marginTop: 6 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  toggleOn: { backgroundColor: "#efefef" },
  toggleText: { fontWeight: "600" },
});
