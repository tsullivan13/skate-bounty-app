// app/(tabs)/spots.tsx
import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { palette, radius, space, type } from "../../constants/theme";
import { createSpot, fetchSpots, Spot } from "../../src/lib/spots";
import { useAuth } from "../../src/providers/AuthProvider";
import { Button, Card, H2, Input, Muted, Pill, Row, Screen, Title } from "../../src/ui/primitives";

export default function SpotsTab() {
    const { session } = useAuth();
    const [spots, setSpots] = useState<Spot[]>([]);
    const [loading, setLoading] = useState(true);

    const [title, setTitle] = useState("");
    const [locationHint, setLocationHint] = useState("");
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

        setCreating(true);
        try {
            const spot = await createSpot(session, {
                title: title.trim(),
                location_hint: locationHint.trim() || null,
            });

            setSpots((prev) => [spot, ...prev]);
            setTitle("");
            setLocationHint("");
        } catch (e: any) {
            console.log("create spot error", e);
            Alert.alert("Error", e?.message ?? "Failed to create spot");
        } finally {
            setCreating(false);
        }
    };

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
                        placeholder="Location hint (optional)"
                        placeholderTextColor={palette.textMuted}
                        value={locationHint}
                        onChangeText={setLocationHint}
                    />
                    <Muted>
                        Images aren&apos;t supported yet, but you can still share a title and optional location hint.
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
                        <FlatList
                            data={spots}
                            keyExtractor={(s) => s.id}
                            renderItem={({ item }) => (
                                <View style={styles.spotCard}>
                                    <View style={{ flex: 1, gap: space.xs }}>
                                        <Text style={styles.spotTitle}>{item.title}</Text>
                                        {item.location_hint ? <Text style={styles.meta}>{item.location_hint}</Text> : null}
                                        <Text style={styles.meta}>
                                            Added {new Date(item.created_at).toLocaleString()}
                                        </Text>
                                    </View>
                                    <Pill>Spot</Pill>
                                </View>
                            )}
                        />
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
        padding: space.md,
        borderWidth: 1,
        borderRadius: radius.lg,
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        backgroundColor: palette.card,
        borderColor: palette.outline,
        marginBottom: space.xs,
    },
    spotTitle: { ...type.h2 },
    meta: { color: palette.textMuted },
});
