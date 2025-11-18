// app/(tabs)/create.tsx
import React, { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { palette, radius, space, type } from "../../constants/theme";
import { createBounty } from "../../src/lib/bounties";
import { fetchSpots, Spot } from "../../src/lib/spots";
import { useAuth } from "../../src/providers/AuthProvider";
import { Button, Card, H2, Input, Muted, Pill, Screen, Title } from "../../src/ui/primitives";

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
        <Screen>
            <View style={{ gap: space.md }}>
                <Title>Create Bounty</Title>

                <Card elevated style={{ gap: space.sm }}>
                    <H2>Details</H2>
                    <Input
                        style={styles.input}
                        placeholder="Trick (e.g. kickflip over the rail)"
                        placeholderTextColor={palette.textMuted}
                        value={trick}
                        onChangeText={setTrick}
                    />
                    <Input
                        style={styles.input}
                        placeholder="Reward (e.g. $20, pizza, etc.)"
                        placeholderTextColor={palette.textMuted}
                        value={reward}
                        onChangeText={setReward}
                    />
                    <Muted>Share what trick you want to see and what you are offering.</Muted>
                </Card>

                <Card style={{ gap: space.sm }}>
                    <H2>Attach a spot</H2>
                    {loadingSpots ? (
                        <Muted>Loading spots…</Muted>
                    ) : spots.length === 0 ? (
                        <Muted>No spots yet. Create one in the Spots tab first.</Muted>
                    ) : (
                        <FlatList
                            data={spots}
                            keyExtractor={(s) => s.id}
                            renderItem={({ item }) => (
                                <Pressable
                                    onPress={() =>
                                        setSelectedSpotId((prev) => (prev === item.id ? null : item.id))
                                    }
                                    style={[styles.spotRow, selectedSpotId === item.id && styles.spotRowSelected]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.spotTitle}>{item.title}</Text>
                                        {item.location_hint ? (
                                            <Text style={styles.meta}>{item.location_hint}</Text>
                                        ) : null}
                                    </View>
                                    {selectedSpotId === item.id ? <Pill>Attached</Pill> : null}
                                </Pressable>
                            )}
                        />
                    )}
                    <Muted>Select a spot to help skaters find the challenge location.</Muted>
                </Card>

                <Button onPress={submit} loading={loading}>
                    Create bounty
                </Button>
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
    spotRow: {
        padding: space.md,
        borderWidth: 1,
        borderRadius: radius.lg,
        marginVertical: space.xs,
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        backgroundColor: palette.card,
        borderColor: palette.outline,
    },
    spotRowSelected: {
        backgroundColor: palette.subtle,
        borderColor: palette.primary,
    },
    spotTitle: { ...type.h2 },
    meta: { color: palette.textMuted },
});
