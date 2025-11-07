// app/(tabs)/index.tsx
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { Bounty, fetchBounties } from "../../src/lib/bounties";
import { useAuth } from "../../src/providers/AuthProvider";

export default function HomeTab() {
  const { session } = useAuth();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const list = await fetchBounties();
      setBounties(list);
    } catch (e) {
      console.log("Error loading bounties:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Bounties</Text>

      {bounties.length === 0 ? (
        <Text>No bounties yet. Create one!</Text>
      ) : (
        <FlatList
          data={bounties}
          keyExtractor={b => b.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.trick}>{item.trick}</Text>
              <Text style={styles.reward}>Reward: ${item.reward}</Text>
              <Text style={styles.meta}>
                Posted by {item.user_id.slice(0, 6)}... | {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
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
});
