// app/(tabs)/create.tsx
import React, { useEffect, useState } from "react";
import {
    Alert,
    Button,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { palette } from "../../constants/theme";
import { createBounty } from "../../src/lib/bounties";
import { fetchSpots, Spot } from "../../src/lib/spots";
import { useAuth } from "../../src/providers/AuthProvider";

export default function CreateBounty() {
    const { session } = useAuth();
    const [trick, setTrick] = useState("");
    const [reward, setReward] = useState("");
    const [loading, setLoading] = useState(false);

    const [spots, setSpots] = useState<Spot[]>([]);
    const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
    const [loadingSpots, setLoadingSpots] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const all = await fetchSpots();
                setSpots(all);
                if (all.length) setSelectedSpotId(all[0].id);
            } catch (e) {
                console.log("Error loading spots:", e);
            } finally {
                setLoadingSpots(false);
            }
        })();
    }, []);

    const submit = async () => {
        if (!session) {
            Alert.alert("Auth required", "You must be signed in to create bounties.");
            return;
        }

        if (!trick.trim() || !reward.trim()) {
            Alert.alert("Missing fields", "Please enter both a trick and reward.");
            return;
        }

        setLoading(true);
        try {
            const trickText = trick.trim();
            const rewardText = reward.trim();

            await createBounty(session, {
                trick: trickText,
                reward: rewardText,
                spot_id: selectedSpotId,
            });

            setTrick("");
            setReward("");
            Alert.alert("Created", "Bounty created successfully.");
        } catch (e: any) {
            console.log("create bounty error", e);
            Alert.alert("Error", e?.message ?? "Failed to create bounty");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create Bounty</Text>

            <TextInput
                style={styles.input}
                placeholder="Trick (e.g. kickflip over the rail)"
                placeholderTextColor={palette.textMuted}
                value={trick}
                onChangeText={setTrick}
            />
            <TextInput
                style={styles.input}
                placeholder="Reward (e.g. $20, pizza, etc.)"
                placeholderTextColor={palette.textMuted}
                value={reward}
                onChangeText={setReward}
                keyboardType="numeric"
            />

            <View>
                <Text style={styles.title}>Spot</Text>
                {loadingSpots ? (
                    <Text style={{ color: palette.textMuted }}>Loading spots…</Text>
                ) : (
                    <FlatList
                        data={spots}
                        keyExtractor={(s) => s.id}
                        renderItem={({ item }) => (
                            <Pressable
                                onPress={() => setSelectedSpotId(item.id)}
                                style={[
                                    styles.spotRow,
                                    selectedSpotId === item.id && styles.spotRowSelected,
                                ]}
                            >
                                <Text style={{ color: palette.text }}>{item.title}</Text>
                            </Pressable>
                        )}
                    />
                )}
            </View>

            <Button title={loading ? "Creating…" : "Create Bounty"} onPress={submit} disabled={loading} />
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
    spotRow: {
        padding: 10,
        borderWidth: 1,
        borderRadius: 10,
        marginVertical: 6,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: palette.card,
        borderColor: palette.outline,
    },
    spotRowSelected: {
        backgroundColor: palette.subtle,
    },
});
