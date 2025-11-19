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
import { Badge, Card, H2, Input, Muted, Pill, Row, Screen, Title } from "../../src/ui/primitives";

export default function HomeTab() {
  const router = useRouter();
  const { session } = useAuth();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMine, setFilterMine] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [search, setSearch] = useState("");
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
    const mineFiltered = !filterMine || !session ? bounties : bounties.filter((b) => b.user_id === session.user.id);

    const statusFiltered = mineFiltered.filter((b) => {
      const status = (b.status ?? "open").toLowerCase();
      if (statusFilter === "open") {
        return status !== "closed";
      }
      if (statusFilter === "closed") {
        return status === "closed";
      }
      return true;
    });

    const query = search.trim().toLowerCase();
    if (!query) return statusFiltered;

    return statusFiltered.filter((b) => {
      const trickText = b.trick?.toLowerCase() ?? "";
      const rewardText = b.reward ? String(b.reward).toLowerCase() : "";
      const rewardType = b.reward_type?.toLowerCase() ?? "";
      const spotTitle = b.spot_id ? spotById.get(b.spot_id)?.title?.toLowerCase() ?? "" : "";
      const handle = profiles[b.user_id]?.handle ? `@${profiles[b.user_id]?.handle}`.toLowerCase() : "";
      const fallback = b.user_id.slice(0, 6).toLowerCase();
      return [trickText, rewardText, rewardType, spotTitle, handle, fallback].some((field) =>
        field.includes(query)
      );
    });
  }, [bounties, filterMine, profiles, search, session, spotById, statusFilter]);

  const clearSearch = useCallback(() => setSearch(""), []);

  const statusLabel = useMemo(() => {
    switch (statusFilter) {
      case "open":
        return "Open only";
      case "closed":
        return "Closed only";
      default:
        return "All statuses";
    }
  }, [statusFilter]);

  const feedDescriptor = useMemo(() => {
    if (filterMine) {
      return `Mine • ${statusLabel.toLowerCase()}`;
    }
    return statusLabel;
  }, [filterMine, statusLabel]);

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
                <Muted>{filterMine ? "Personal feed" : "Results"}</Muted>
                <H2>{filtered.length}</H2>
                <Text style={styles.statLabel}>{feedDescriptor}</Text>
              </Card>
            </Row>

            <View style={styles.searchRow}>
              <Input
                placeholder="Search trick, spot, or handle"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.searchInput}
              />
              {search ? (
                <Pressable onPress={clearSearch} style={styles.clearButton}>
                  <Text style={styles.clearButtonLabel}>Clear</Text>
                </Pressable>
              ) : null}
            </View>

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

            <View style={styles.filterRow}>
              <Text style={styles.sectionLabel}>Status</Text>
              <View style={styles.segment}>
                {["all", "open", "closed"].map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setStatusFilter(option as "all" | "open" | "closed")}
                    style={[styles.segmentItem, statusFilter === option && styles.segmentItemActive]}
                  >
                    <Text
                      style={[styles.segmentLabel, statusFilter === option && styles.segmentLabelActive]}
                    >
                      {option === "all" ? "All" : option === "open" ? "Open" : "Closed"}
                    </Text>
                  </Pressable>
                ))}
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  searchInput: {
    flex: 1,
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearButtonLabel: {
    color: palette.accent,
    fontWeight: "700",
  },
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
