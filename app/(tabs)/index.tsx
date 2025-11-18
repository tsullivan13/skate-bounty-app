// app/(tabs)/index.tsx
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { palette } from "../../constants/theme";
import { Bounty, fetchBounties, subscribeBounties } from "../../src/lib/bounties";
import { fetchProfilesByIds, Profile } from "../../src/lib/profiles";
import { fetchSpots, Spot } from "../../src/lib/spots";
import { useAuth } from "../../src/providers/AuthProvider";

export default function HomeTab() {
  const router = useRouter();
  const { session } = useAuth();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMine, setFilterMine] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [spots, setSpots] = useState<Spot[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  const upsertProfiles = useCallback((list: Profile[]) => {
    if (!list.length) return;
    setProfiles((prev) => {
      const next = { ...prev };
      list.forEach((p) => {
        next[p.id] = p;
      });
      return next;
    });
  }, []);

  const loadProfilesForIds = useCallback(
    async (ids: string[]) => {
      try {
        const fetched = await fetchProfilesByIds(ids);
        upsertProfiles(fetched);
      } catch (e) {
        console.log("Error loading profiles:", e);
      }
    },
    [upsertProfiles]
  );

  useEffect(() => {
    (async () => {
      try {
        const [list, s] = await Promise.all([fetchBounties(), fetchSpots()]);
        setBounties(list);
        setSpots(s);
        await loadProfilesForIds(list.map((b) => b.user_id));
      } catch (e) {
        console.log("Error loading feed:", e);
      } finally {
        setLoading(false);
        // spot loading state is implicit via the array length
      }
    })();
  }, [loadProfilesForIds]);

  useEffect(() => {
    const unsubscribe = subscribeBounties(
      (row) => {
        setBounties((prev) => [row, ...prev]);
        loadProfilesForIds([row.user_id]);
      },
      (row) => setBounties((prev) => prev.map((b) => (b.id === row.id ? row : b))),
      (row) => setBounties((prev) => prev.filter((b) => b.id !== row.id))
    );
    return unsubscribe;
  }, [loadProfilesForIds]);

  const spotById = useMemo(() => {
    const m = new Map<string, Spot>();
    spots.forEach((s) => m.set(s.id, s));
    return m;
  }, [spots]);

  const filtered = useMemo(() => {
    if (!filterMine || !session) return bounties;
    return bounties.filter((b) => b.user_id === session.user.id);
  }, [bounties, filterMine, session]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [list, s] = await Promise.all([fetchBounties(), fetchSpots()]);
      setBounties(list);
      setSpots(s);
      await loadProfilesForIds(list.map((b) => b.user_id));
    } catch (e) {
      console.log("Refresh error:", e);
    } finally {
      setRefreshing(false);
    }
  }, [loadProfilesForIds]);

  const displayName = useCallback(
    (userId: string) => {
      const handle = profiles[userId]?.handle;
      if (handle) return `@${handle}`;
      return `${userId.slice(0, 6)}…`;
    },
    [profiles]
  );

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
        <Text style={styles.emptyText}>No bounties yet. Create one!</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.text}
              titleColor={palette.text}
            />
          }
          renderItem={({ item }) => {
            const s =
              (item as any).spot_id
                ? spotById.get((item as any).spot_id as string)
                : undefined;

            const rewardLabel = (() => {
              if (item.reward === null || item.reward === undefined || item.reward === "") {
                return "—";
              }
              return typeof item.reward === "number" ? `$${item.reward}` : String(item.reward);
            })();

            return (
              <Pressable
                onPress={() => router.push(`/bounty/${item.id}`)}
                style={styles.card}
              >
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trick}>{item.trick}</Text>
                    <Text style={styles.reward}>Reward: {rewardLabel}</Text>
                    <Text style={styles.meta}>
                      {s ? `@ ${s.title}${s.location_hint ? ` (${s.location_hint})` : ""} • ` : ""}
                      by {displayName(item.user_id)} • {new Date(item.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12, flex: 1, backgroundColor: palette.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.bg,
  },
  title: { fontSize: 24, fontWeight: "700", color: palette.text },
  card: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: palette.card,
    borderColor: palette.outline,
  },
  trick: { fontSize: 18, fontWeight: "700", color: palette.text },
  reward: { fontSize: 16, marginTop: 4, color: palette.text },
  meta: { fontSize: 12, marginTop: 6, color: palette.textMuted },
  emptyText: { fontSize: 14, color: palette.textMuted },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  toggleOn: { backgroundColor: palette.subtle },
  toggleText: { fontWeight: "600", color: palette.text },
});
