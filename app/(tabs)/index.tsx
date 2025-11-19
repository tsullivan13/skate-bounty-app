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
import { palette, radius, space } from "../../constants/theme";
import { Bounty, fetchBounties, subscribeBounties } from "../../src/lib/bounties";
import { fetchProfilesByIds, Profile } from "../../src/lib/profiles";
import { fetchSpots, Spot } from "../../src/lib/spots";
import { useAuth } from "../../src/providers/AuthProvider";
import { Badge, Card, H2, Muted, Pill, Row, Screen, Title } from "../../src/ui/primitives";

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

  const goToSpot = useCallback(
    (spotId?: string | null) => {
      if (!spotId) return;
      router.push(`/spot/${spotId}`);
    },
    [router]
  );

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
      <Screen>
        <Card elevated style={{ alignItems: "center", gap: space.sm }}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Muted>Loading the latest challenges…</Muted>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm, paddingBottom: space.xl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.primary}
            titleColor={palette.text}
          />
        }
        ListHeaderComponent={(
          <View style={{ gap: space.md }}>
            <Title>Active bounties</Title>
            <Muted>Discover fresh challenges from the crew and share your own.</Muted>

            <Row style={styles.statRow}>
              <Card elevated style={styles.statCard}>
                <Muted>Live</Muted>
                <H2>{bounties.length}</H2>
                <Text style={styles.statLabel}>Challenges posted</Text>
              </Card>
              <Card elevated style={styles.statCard}>
                <Muted>{filterMine ? "Personal" : "Open"}</Muted>
                <H2>{filterMine && session ? filtered.length : bounties.filter((b) => b.status !== "closed").length}</H2>
                <Text style={styles.statLabel}>{filterMine ? "Mine" : "Accepting"}</Text>
              </Card>
            </Row>

            <View style={styles.filterRow}>
              <Text style={styles.sectionLabel}>Feed</Text>
              <View style={styles.segment}>
                <Pressable
                  onPress={() => setFilterMine(false)}
                  style={[styles.segmentItem, !filterMine && styles.segmentItemActive]}
                >
                  <Text style={[styles.segmentLabel, !filterMine && styles.segmentLabelActive]}>All</Text>
                </Pressable>
                <Pressable
                  onPress={() => setFilterMine(true)}
                  style={[styles.segmentItem, filterMine && styles.segmentItemActive]}
                >
                  <Text style={[styles.segmentLabel, filterMine && styles.segmentLabelActive]}>Mine</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Card elevated>
            <H2>Nothing here yet</H2>
            <Muted>Post the first bounty so everyone has something to chase.</Muted>
          </Card>
        }
        renderItem={({ item }) => {
          const s = (item as any).spot_id ? spotById.get((item as any).spot_id as string) : undefined;

          const rewardLabel = (() => {
            if (item.reward === null || item.reward === undefined) {
              return "—";
            }
            const base = typeof item.reward === "number" ? `$${item.reward}` : String(item.reward);
            if (item.reward_type) return `${item.reward_type} · ${base}`;
            return base;
          })();

          return (
            <Pressable onPress={() => router.push(`/bounty/${item.id}`)} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
              <Card elevated style={styles.card}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Pill>{rewardLabel === "—" ? "No reward" : rewardLabel}</Pill>
                  {item.status ? <Badge tone="accent">{item.status}</Badge> : null}
                </Row>
                <H2>{item.trick}</H2>
                <View style={styles.metaRow}>
                  {s ? (
                    <Pressable onPress={() => goToSpot(item.spot_id)} style={styles.spotChip}>
                      <Text style={styles.spotChipLabel}>@ {s.title}</Text>
                    </Pressable>
                  ) : null}
                  <Muted>{new Date(item.created_at).toLocaleString()}</Muted>
                </View>
                <Row>
                  <Pill>{displayName(item.user_id)}</Pill>
                  {item.expires_at ? <Badge tone="warning">Expires {new Date(item.expires_at).toLocaleDateString()}</Badge> : null}
                </Row>
              </Card>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.xs,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: palette.outline,
    borderRadius: 999,
    backgroundColor: palette.subtle,
  },
  segmentItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  segmentItemActive: {
    backgroundColor: palette.cardElevated,
  },
  segmentLabel: { color: palette.textMuted, fontWeight: "700" },
  segmentLabelActive: { color: palette.text },
  sectionLabel: { color: palette.textMuted, fontWeight: "700", letterSpacing: 0.2 },
  statRow: { flex: 1, flexWrap: "nowrap" },
  statCard: { flex: 1, gap: 2 },
  statLabel: { color: palette.textMuted, fontSize: 13 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  spotChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.outline,
    backgroundColor: palette.subtle,
  },
  spotChipLabel: {
    color: palette.accent,
    fontWeight: "700",
  },
});
