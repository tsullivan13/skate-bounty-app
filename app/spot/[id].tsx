// app/spot/[id].tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Linking, Platform, StyleSheet, Text, View } from "react-native";
import { palette, radius, space, type } from "../../constants/theme";
import { Bounty, fetchBountiesBySpot } from "../../src/lib/bounties";
import { fetchSpotById, Spot } from "../../src/lib/spots";
import { Badge, Button, Card, H2, Muted, Pill, Row, Screen, Title } from "../../src/ui/primitives";

function mapUrl(lat: number, lng: number) {
    if (Platform.OS === "ios") {
        return `http://maps.apple.com/?ll=${lat},${lng}`;
    }
    const query = `${lat},${lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function SpotDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const spotId = useMemo(() => (Array.isArray(id) ? id[0] : id), [id]);

    const [spot, setSpot] = useState<Spot | null>(null);
    const [loading, setLoading] = useState(true);
    const [bounties, setBounties] = useState<Bounty[]>([]);

    useEffect(() => {
        if (!spotId) return;
        (async () => {
            try {
                setLoading(true);
                const [s, b] = await Promise.all([fetchSpotById(spotId), fetchBountiesBySpot(spotId)]);
                setSpot(s);
                setBounties(b);
            } catch (e) {
                console.log("load spot error", e);
            } finally {
                setLoading(false);
            }
        })();
    }, [spotId]);

    if (!spotId) {
        return (
            <Screen>
                <Card elevated>
                    <H2>Missing spot</H2>
                    <Muted>No spot id provided.</Muted>
                    <Button kind="ghost" onPress={() => router.back()}>
                        Go back
                    </Button>
                </Card>
            </Screen>
        );
    }

    if (loading) {
        return (
            <Screen>
                <Card elevated>
                    <Muted>Loading spot…</Muted>
                </Card>
            </Screen>
        );
    }

    if (!spot) {
        return (
            <Screen>
                <Card elevated>
                    <H2>Spot not found</H2>
                    <Muted>This spot may have been removed.</Muted>
                    <Button kind="ghost" onPress={() => router.back()}>
                        Go back
                    </Button>
                </Card>
            </Screen>
        );
    }

    const hasCoords = (spot.lat ?? null) !== null && (spot.lng ?? null) !== null;

    return (
        <Screen scrollable>
            <View style={{ gap: space.md }}>
                <Title>{spot.title}</Title>
                <Muted>Shared by the crew. Attach this spot to bounties so everyone rallies at the right place.</Muted>

                {spot.image_url ? (
                    <Card elevated style={styles.media}>
                        <Image source={{ uri: spot.image_url }} style={styles.mediaImage} resizeMode="cover" />
                        <Muted>{spot.image_url}</Muted>
                    </Card>
                ) : null}

                <Card elevated style={{ gap: space.xs }}>
                    <H2>Details</H2>
                    {hasCoords ? (
                        <Row style={{ justifyContent: "space-between" }}>
                            <View>
                                <TextRow label="Latitude" value={spot.lat?.toFixed(5) ?? "—"} />
                                <TextRow label="Longitude" value={spot.lng?.toFixed(5) ?? "—"} />
                            </View>
                            <Button kind="ghost" onPress={() => Linking.openURL(mapUrl(spot.lat!, spot.lng!))}>
                                Open in maps
                            </Button>
                        </Row>
                    ) : (
                        <Muted>No coordinates provided.</Muted>
                    )}
                    <Muted>Added {new Date(spot.created_at).toLocaleString()}</Muted>
                </Card>

                <Card style={{ gap: space.sm }}>
                    <H2>Bounties at this spot</H2>
                    {bounties.length === 0 ? (
                        <Muted>No bounties linked to this spot yet.</Muted>
                    ) : (
                        <View style={{ gap: space.sm }}>
                            {bounties.map((b) => (
                                <Card key={b.id} elevated style={styles.bountyCard}>
                                    <Row style={{ justifyContent: "space-between" }}>
                                        <Pill>{b.reward ? `$${b.reward}` : "No reward"}</Pill>
                                        {b.status ? <Badge tone="accent">{b.status}</Badge> : null}
                                    </Row>
                                    <H2>{b.trick}</H2>
                                    <Muted>
                                        Posted {new Date(b.created_at).toLocaleDateString()} • {b.expires_at ? `Expires ${new Date(b.expires_at).toLocaleDateString()}` : "No expiry"}
                                    </Muted>
                                    <Button kind="ghost" onPress={() => router.push(`/bounty/${b.id}`)}>
                                        View bounty
                                    </Button>
                                </Card>
                            ))}
                        </View>
                    )}
                </Card>
            </View>
        </Screen>
    );
}

function TextRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={{ marginBottom: 6 }}>
            <Text style={styles.metaLabel}>{label}</Text>
            <Text style={styles.metaValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    media: {
        gap: space.xs,
    },
    mediaImage: {
        width: "100%",
        aspectRatio: 4 / 3,
        borderRadius: radius.md,
        backgroundColor: palette.subtle,
    },
    metaLabel: {
        ...type.small,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    metaValue: {
        color: palette.text,
        fontWeight: "700",
    },
    bountyCard: {
        gap: space.xs,
    },
});
