// app/(tabs)/create.tsx
import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { palette, radius, space, type } from "../../constants/theme";
import { createBounty } from "../../src/lib/bounties";
import { fetchSpots, Spot } from "../../src/lib/spots";
import { useAuth } from "../../src/providers/AuthProvider";
import { Button, Card, H2, Input, Muted, Pill, Row, Screen, Title } from "../../src/ui/primitives";

export default function CreateBounty() {
    const { session } = useAuth();
    const [trick, setTrick] = useState("");
    const [reward, setReward] = useState("");
    const [rewardType, setRewardType] = useState("cash");
    const [expiresAt, setExpiresAt] = useState("");
    const [status, setStatus] = useState("open");
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

        if (!trick.trim()) {
            Alert.alert("Missing fields", "Please enter a trick.");
            return;
        }

        setLoading(true);
        try {
            const trickText = trick.trim();
            const rewardVal = reward.trim() ? Number(reward.trim()) : null;
            if (reward.trim() && Number.isNaN(rewardVal)) {
                Alert.alert("Invalid reward", "Reward must be a number if provided.");
                setLoading(false);
                return;
            }

            await createBounty(session, {
                trick: trickText,
                reward: rewardVal,
                reward_type: rewardType,
                status,
                spot_id: selectedSpotId,
                expires_at: expiresAt.trim() || null,
            });

            setTrick("");
            setReward("");
            setExpiresAt("");
            setRewardType("cash");
            setStatus("open");
            Alert.alert("Created", "Bounty created successfully.");
        } catch (e: any) {
            console.log("create bounty error", e);
            Alert.alert("Error", e?.message ?? "Failed to create bounty");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.select({ ios: "padding", android: "height" })}
            style={{ flex: 1 }}
        >
            <Screen scrollable>
                <View style={styles.content}>
                    <Title>Create Bounty</Title>
                    <Muted>Draft a clear challenge, attach a reward, and point skaters to the right spot.</Muted>

                    <Card elevated style={{ gap: space.xs }}>
                        <H2>Make it compelling</H2>
                        <Muted>
                            Add context for the trick, pick a reward type, and include an expiration so it feels
                            official.
                        </Muted>
                        <Row>
                            <Pill>Rewards guide buy-in</Pill>
                            <Pill>Attach a spot</Pill>
                            <Pill>Set a lifecycle</Pill>
                        </Row>
                    </Card>

                    <Card elevated style={{ gap: space.sm }}>
                        <H2>Details</H2>
                        <Input
                            placeholder="Trick (e.g. kickflip over the rail)"
                            placeholderTextColor={palette.textMuted}
                            value={trick}
                            onChangeText={setTrick}
                            autoCapitalize="sentences"
                        />
                        <Input
                            placeholder="Reward amount (numeric)"
                            placeholderTextColor={palette.textMuted}
                            value={reward}
                            onChangeText={setReward}
                            keyboardType="numeric"
                        />
                        <Muted>
                            Add a clear description of the challenge and what you are offering to make it feel
                            official.
                        </Muted>
                    </Card>

                    <Card elevated style={{ gap: space.sm }}>
                        <H2>Reward details</H2>
                        <Row style={{ justifyContent: "space-between" }}>
                            {["cash", "gear", "other"].map((option) => (
                                <Pressable
                                    key={option}
                                    onPress={() => setRewardType(option)}
                                    style={[styles.chip, rewardType === option && styles.chipSelected]}
                                >
                                    <Text style={styles.chipLabel}>{option}</Text>
                                </Pressable>
                            ))}
                        </Row>
                        <Muted>Let skaters know what kind of reward to expect.</Muted>
                    </Card>

                    <Card style={{ gap: space.sm }}>
                        <H2>Attach a spot</H2>
                        {loadingSpots ? (
                            <Muted>Loading spots…</Muted>
                        ) : spots.length === 0 ? (
                            <Muted>No spots yet. Create one in the Spots tab first.</Muted>
                        ) : (
                            <View style={styles.spotList}>
                                {spots.map((item) => (
                                    <Pressable
                                        key={item.id}
                                        onPress={() => setSelectedSpotId((prev) => (prev === item.id ? null : item.id))}
                                        style={[styles.spotRow, selectedSpotId === item.id && styles.spotRowSelected]}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.spotTitle}>{item.title}</Text>
                                            {item.image_url ? <Text style={styles.meta}>{item.image_url}</Text> : null}
                                            {(item.lat ?? null) !== null && (item.lng ?? null) !== null ? (
                                                <Text style={styles.meta}>
                                                    Coords: {item.lat?.toFixed(4)}, {item.lng?.toFixed(4)}
                                                </Text>
                                            ) : null}
                                        </View>
                                        {selectedSpotId === item.id ? <Pill>Attached</Pill> : null}
                                    </Pressable>
                                ))}
                            </View>
                        )}
                        <Muted>Select a spot to help skaters find the challenge location.</Muted>
                    </Card>

                    <Card style={{ gap: space.sm }}>
                        <H2>Lifecycle</H2>
                        <Row style={{ justifyContent: "space-between" }}>
                            {["open", "closed"].map((option) => (
                                <Pressable
                                    key={option}
                                    onPress={() => setStatus(option)}
                                    style={[styles.chip, status === option && styles.chipSelected]}
                                >
                                    <Text style={styles.chipLabel}>{option}</Text>
                                </Pressable>
                            ))}
                        </Row>
                        <Input
                            placeholder="Expires at (ISO, optional)"
                            placeholderTextColor={palette.textMuted}
                            value={expiresAt}
                            onChangeText={setExpiresAt}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Muted>Set status and optional expiration to communicate availability.</Muted>
                    </Card>

                    <Button onPress={submit} loading={loading}>
                        Create bounty
                    </Button>
                </View>
            </Screen>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    content: {
        gap: space.md,
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
    spotList: {
        gap: space.xs,
    },
    spotRowSelected: {
        backgroundColor: palette.subtle,
        borderColor: palette.primary,
    },
    spotTitle: { ...type.h2 },
    meta: { color: palette.textMuted },
    chip: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: palette.outline,
        backgroundColor: palette.card,
        flex: 1,
        alignItems: "center",
    },
    chipSelected: {
        backgroundColor: palette.subtle,
        borderColor: palette.primary,
    },
    chipLabel: { color: palette.text, fontWeight: "700", textTransform: "capitalize" },
});
