// app/bounty/[id].tsx
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Button, FlatList, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
    acceptBounty,
    getBounty,
    getSpot,
    listSubmissions,
    Submission,
    submitProofUrl,
    voteSubmission,
} from "../../src/lib/bountyDetail";
import { useAuth } from "../../src/providers/AuthProvider";

export default function BountyDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { session } = useAuth();

    const [bounty, setBounty] = useState<any>(null);
    const [spot, setSpot] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // URL-based proof inputs
    const [externalUrl, setExternalUrl] = useState("");
    const [postedAt, setPostedAt] = useState(""); // ISO string like 2025-11-08T19:30:00Z
    const [caption, setCaption] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [subs, setSubs] = useState<Submission[]>([]);
    const [loadingSubs, setLoadingSubs] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const b = await getBounty(id);
                setBounty(b);
                const s = (b as any).spot_id ? await getSpot((b as any).spot_id) : null;
                setSpot(s);
            } catch (e) {
                console.log("load bounty error:", e);
                Alert.alert("Error", "Failed to load bounty.");
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    useEffect(() => {
        (async () => {
            try {
                const l = await listSubmissions(id);
                setSubs(l);
            } catch (e) {
                console.log("load submissions error:", e);
            } finally {
                setLoadingSubs(false);
            }
        })();
    }, [id]);

    const onAccept = async () => {
        try {
            if (!session) return Alert.alert("Sign in required");
            await acceptBounty(session, id);
            Alert.alert("Accepted", "Go land it! 🎯");
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Could not accept.");
        }
    };

    const onSubmit = async () => {
        try {
            if (!session) return Alert.alert("Sign in required");
            const url = externalUrl.trim();
            const cap = caption.trim();

            if (!url) return Alert.alert("Missing URL", "Paste your Instagram post URL.");
            if (!/^https?:\/\//i.test(url)) return Alert.alert("Invalid URL", "Start with https://");

            // postedAt is optional, but recommended to pass ISO (DB enforces when provided)
            const iso = postedAt.trim() || null;
            if (iso && isNaN(Date.parse(iso))) {
                return Alert.alert("Invalid date", "Use ISO format like 2025-11-08T19:30:00Z");
            }

            setSubmitting(true);
            const created = await submitProofUrl(session, id, url, iso, cap);
            setSubs((prev) => [{ ...created, votes: 0 }, ...prev]);
            setExternalUrl("");
            setPostedAt("");
            setCaption("");
            Alert.alert("Submitted", "Your proof link was posted.");
        } catch (e: any) {
            console.log("submit url error:", e);
            Alert.alert("Error", e?.message ?? "Could not submit proof.");
        } finally {
            setSubmitting(false);
        }
    };

    const onVote = async (submissionId: string) => {
        try {
            if (!session) return Alert.alert("Sign in required");
            await voteSubmission(session, submissionId);
            setSubs((prev) =>
                prev.map((s) => (s.id === submissionId ? { ...s, votes: (s.votes ?? 0) + 1 } : s))
            );
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Could not vote.");
        }
    };

    if (loading) return <View style={styles.center}><Text>Loading…</Text></View>;
    if (!bounty) return <View style={styles.center}><Text>Not found</Text></View>;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{bounty.trick}</Text>
            <Text style={styles.meta}>
                Reward ${bounty.reward}
                {spot ? ` • @ ${spot.title}` : ""} • {new Date(bounty.created_at).toLocaleString()}
            </Text>

            <View style={{ height: 10 }} />
            <Button title="Accept Bounty" onPress={onAccept} />

            <View style={{ height: 20 }} />
            <Text style={styles.section}>Submit Proof (Instagram URL)</Text>
            <TextInput
                placeholder="https://www.instagram.com/p/…"
                value={externalUrl}
                onChangeText={setExternalUrl}
                autoCapitalize="none"
                style={styles.input}
            />
            <TextInput
                placeholder="Post date (ISO, e.g. 2025-11-08T19:30:00Z)"
                value={postedAt}
                onChangeText={setPostedAt}
                autoCapitalize="none"
                style={styles.input}
            />
            <TextInput
                placeholder="Caption"
                value={caption}
                onChangeText={setCaption}
                style={styles.input}
            />
            <Button title={submitting ? "Submitting…" : "Submit"} onPress={onSubmit} disabled={submitting} />

            <View style={{ height: 20 }} />
            <Text style={styles.section}>Submissions</Text>
            {loadingSubs ? (
                <Text>Loading submissions…</Text>
            ) : subs.length === 0 ? (
                <Text>No submissions yet.</Text>
            ) : (
                <FlatList
                    data={subs}
                    keyExtractor={(s) => s.id}
                    renderItem={({ item }) => (
                        <View style={styles.subCard}>
                            <View style={{ flex: 1 }}>
                                {item.external_url ? (
                                    <Pressable onPress={() => Linking.openURL(item.external_url!)}>
                                        <Text style={styles.link} numberOfLines={1}>{item.external_url}</Text>
                                    </Pressable>
                                ) : (
                                    <Text style={{ opacity: 0.6 }}>No URL</Text>
                                )}
                                <Text style={styles.subMeta}>
                                    {item.external_posted_at ? `Posted ${new Date(item.external_posted_at).toLocaleString()} • ` : ""}
                                    by {item.user_id.slice(0, 6)}… • {new Date(item.created_at).toLocaleString()}
                                </Text>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 }}>
                                    <Pressable onPress={() => onVote(item.id)} style={styles.voteBtn}>
                                        <Text>👍 Vote</Text>
                                    </Pressable>
                                    <Text>{item.votes ?? 0} votes</Text>
                                    {(item.votes ?? 0) >= 3 ? <Text style={{ color: "#0a7" }}>Verified</Text> : null}
                                </View>
                            </View>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, gap: 12, flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 22, fontWeight: "800" },
    meta: { opacity: 0.7 },
    section: { marginTop: 8, fontWeight: "800", fontSize: 16 },
    input: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 6 },
    subCard: { borderWidth: 1, borderRadius: 10, padding: 10, marginVertical: 6 },
    voteBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    link: { color: "#0a7", textDecorationLine: "underline" },
    subMeta: { fontSize: 12, opacity: 0.6, marginTop: 4 },
});
