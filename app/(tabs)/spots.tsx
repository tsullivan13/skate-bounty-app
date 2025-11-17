// app/(tabs)/spots.tsx
import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { palette } from "../../constants/theme";
import { createSpot, fetchSpots, Spot } from "../../src/lib/spots";
import { useAuth } from "../../src/providers/AuthProvider";

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
        <View style={styles.container}>
            <Text style={styles.title}>Spots</Text>

            <View style={{ gap: 8 }}>
                <TextInput
                    style={styles.input}
                    placeholder="Spot title"
                    placeholderTextColor={palette.textMuted}
                    value={title}
                    onChangeText={setTitle}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Location hint"
                    placeholderTextColor={palette.textMuted}
                    value={locationHint}
                    onChangeText={setLocationHint}
                />
                <Text
                    style={{
                        color: palette.textMuted,
                        fontSize: 12,
                    }}
                >
                    {"Images aren't supported yet, but you can still share a title and optional location hint."}
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                    <Text
                        style={{
                            color: creating ? palette.textMuted : palette.link,
                            fontWeight: "600",
                        }}
                        onPress={creating ? undefined : handleCreateSpot}
                    >
                        {creating ? "Creating…" : "Create Spot"}
                    </Text>
                </View>
            </View>

            <View style={{ height: 24 }} />

            {loading ? (
                <Text style={{ color: palette.textMuted }}>Loading spots…</Text>
            ) : (
                <FlatList
                    data={spots}
                    keyExtractor={(s) => s.id}
                    renderItem={({ item }) => {
                        const locHint = item.location_hint ?? undefined;
                        return (
                            <View style={styles.card}>
                                <Text style={styles.spotTitle}>{item.title}</Text>
                                <Text style={styles.meta}>
                                    {locHint ? locHint + " • " : ""}
                                    {new Date(item.created_at).toLocaleString()}
                                </Text>
                            </View>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 24, gap: 12, flex: 1, backgroundColor: palette.bg },
    title: { fontSize: 24, fontWeight: "700", color: palette.text },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        borderColor: palette.outline,
        backgroundColor: palette.subtle,
        color: palette.text,
    },
    card: {
        padding: 12,
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 12,
        backgroundColor: palette.card,
        borderColor: palette.outline,
    },
    spotTitle: { fontSize: 18, fontWeight: "700", color: palette.text },
    meta: { fontSize: 12, marginTop: 6, color: palette.textMuted },
});
