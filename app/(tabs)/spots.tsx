// app/(tabs)/spots.tsx
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { palette, radius, space, type } from "../../constants/theme";
import { createSpot, fetchSpots, Spot } from "../../src/lib/spots";
import { useAuth } from "../../src/providers/AuthProvider";
import { Button, Card, H2, Input, Muted, Pill, Row, Screen, Title } from "../../src/ui/primitives";

export default function SpotsTab() {
    const router = useRouter();
    const { session } = useAuth();
    const [spots, setSpots] = useState<Spot[]>([]);
    const [loading, setLoading] = useState(true);

    const [title, setTitle] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const list = await fetchSpots();
                setSpots(list);
            } catch (e) {
                console.log("fetch spots error", e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleCreateSpot = async () => {
        if (!session) {
            Alert.alert("Auth required", "You must be signed in to create spots.");
            return;
        }
        if (!title.trim()) {
            Alert.alert("Missing title", "Please enter a title for the spot.");
            return;
        }

        const latVal = lat.trim() ? Number(lat.trim()) : null;
        const lngVal = lng.trim() ? Number(lng.trim()) : null;
        if (lat.trim() && Number.isNaN(latVal)) {
            Alert.alert("Invalid latitude", "Latitude must be a number.");
            return;
        }
        if (lng.trim() && Number.isNaN(lngVal)) {
            Alert.alert("Invalid longitude", "Longitude must be a number.");
            return;
        }

        setCreating(true);
        try {
            const spot = await createSpot(session, {
                title: title.trim(),
                image_url: imageUrl.trim() || null,
                lat: latVal,
                lng: lngVal,
            });

            setSpots((prev) => [spot, ...prev]);
            setTitle("");
            setImageUrl("");
            setLat("");
            setLng("");
        } catch (e: any) {
            console.log("create spot error", e);
            Alert.alert("Error", e?.message ?? "Failed to create spot");
        } finally {
            setCreating(false);
        }
    };

    const hasAnyCoords = useMemo(() => spots.some((s) => (s.lat ?? null) !== null && (s.lng ?? null) !== null), [spots]);

    return (
        <Screen>
            <View style={{ gap: space.md }}>
                <Title>Spots</Title>

                <Card elevated style={{ gap: space.sm }}>
                    <H2>Share a spot</H2>
                    <Input
                        style={styles.input}
                        placeholder="Spot title"
                        placeholderTextColor={palette.textMuted}
                        value={title}
                        onChangeText={setTitle}
                    />
                    <Input
                        style={styles.input}
                        placeholder="Image URL (optional)"
                        placeholderTextColor={palette.textMuted}
                        value={imageUrl}
                        onChangeText={setImageUrl}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <Row style={{ gap: space.sm }}>
                        <Input
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Lat (optional)"
                            placeholderTextColor={palette.textMuted}
                            value={lat}
                            onChangeText={setLat}
                            keyboardType="numeric"
                        />
                        <Input
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Lng (optional)"
                            placeholderTextColor={palette.textMuted}
                            value={lng}
                            onChangeText={setLng}
                            keyboardType="numeric"
                        />
                    </Row>
                    <Muted>
                        Spots now support optional imagery and coordinates to help skaters find the location.
                    </Muted>
                    <Row style={{ justifyContent: "flex-end" }}>
                        <Button onPress={handleCreateSpot} loading={creating}>
                            Create spot
                        </Button>
                    </Row>
                </Card>

                <Card style={{ gap: space.sm }}>
                    <H2>Community spots</H2>
                    {loading ? (
                        <Muted>Loading spots…</Muted>
                    ) : spots.length === 0 ? (
                        <Muted>No spots yet. Be the first to share one.</Muted>
                    ) : (
                        <>
                            {hasAnyCoords ? <Muted>Tap a spot to open full details and linked bounties.</Muted> : null}
                            <FlatList
                                data={spots}
                                keyExtractor={(s) => s.id}
                                renderItem={({ item }) => (
                                    <Pressable
                                        onPress={() => router.push(`/spot/${item.id}`)}
                                        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                                    >
                                        <Card elevated style={styles.spotCard}>
                                            <View style={{ flex: 1, gap: space.xs }}>
                                                <Text style={styles.spotTitle}>{item.title}</Text>
                                                {item.image_url ? <Text style={styles.meta}>{item.image_url}</Text> : null}
                                                {(item.lat ?? null) !== null && (item.lng ?? null) !== null ? (
                                                    <Text style={styles.meta}>
                                                        Coords: {item.lat?.toFixed(4)}, {item.lng?.toFixed(4)}
                                                    </Text>
                                                ) : null}
                                                <Text style={styles.meta}>
                                                    Added {new Date(item.created_at).toLocaleString()}
                                                </Text>
                                            </View>
                                            <Pill>Open</Pill>
                                        </Card>
                                    </Pressable>
                                )}
                                ItemSeparatorComponent={() => <View style={{ height: space.xs }} />}
                                scrollEnabled={false}
                            />
                        </>
                    )}
                </Card>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    input: {
        borderWidth: 1,
        borderRadius: radius.md,
        padding: space.md,
        borderColor: palette.outline,
        backgroundColor: palette.subtle,
        color: palette.text,
    },
    spotCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        marginBottom: space.xs,
    },
    spotTitle: { ...type.h2 },
    meta: { color: palette.textMuted },
});
