// app/(tabs)/profile.tsx
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette, space } from "../../constants/theme";
import { fetchBountiesByUser, type Bounty } from "../../src/lib/bounties";
import { getMyProfile, Profile, upsertMyHandle } from "../../src/lib/profiles";
import { fetchSubmissionsByUser, SubmissionWithVotes } from "../../src/lib/submissions";
import { useAuth } from "../../src/providers/AuthProvider";
import { Button, Card, H2, Input, Muted, Pill, Row, Screen, Title } from "../../src/ui/primitives";

export default function ProfileTab() {
    const { session, signOut } = useAuth();
    const [handle, setHandle] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [activityLoading, setActivityLoading] = useState(false);
    const [myBounties, setMyBounties] = useState<Bounty[]>([]);
    const [mySubmissions, setMySubmissions] = useState<SubmissionWithVotes[]>([]);

    useEffect(() => {
        if (!session) {
            setProfile(null);
            setHandle("");
            setLoading(false);
            setMyBounties([]);
            setMySubmissions([]);
            return;
        }
        (async () => {
            setLoading(true);
            try {
                const p = await getMyProfile(session);
                setProfile(p);
                setHandle(p?.handle ?? "");
            } catch (e) {
                console.log("getMyProfile error:", e);
            } finally {
                setLoading(false);
            }
        })();
    }, [session]);

    useEffect(() => {
        if (!session) return;
        setActivityLoading(true);
        (async () => {
            try {
                const [bounties, submissions] = await Promise.all([
                    fetchBountiesByUser(session.user.id),
                    fetchSubmissionsByUser(session.user.id),
                ]);
                setMyBounties(bounties);
                setMySubmissions(submissions);
            } catch (e) {
                console.log("load activity error", e);
            } finally {
                setActivityLoading(false);
            }
        })();
    }, [session]);

    const saveHandle = async () => {
        if (!session) return;
        setSaving(true);
        setErrorMsg(null);
        setSaveMsg(null);

        try {
            const trimmed = handle.trim();
            if (!trimmed) {
                setErrorMsg("Handle cannot be empty.");
                return;
            }

            const updated = await upsertMyHandle(session, trimmed);
            setProfile(updated);
            setSaveMsg("Saved!");
        } catch (e: any) {
            console.log("save handle error", e);
            setErrorMsg(e?.message ?? "Failed to save handle");
        } finally {
            setSaving(false);
        }
    };

    const rewardLabel = useMemo(
        () =>
            (b: Bounty) => {
                if (b.reward === null || b.reward === undefined) return "—";
                const base = typeof b.reward === "number" ? `$${b.reward}` : String(b.reward);
                return b.reward_type ? `${b.reward_type} · ${base}` : base;
            },
        [],
    );

    return (
        <Screen scrollable>
            <View style={{ gap: space.md }}>
                <Title>Profile</Title>
                <Muted>Update your handle and keep your access info handy.</Muted>

                {!session ? (
                    <Card elevated>
                        <H2>Signed out</H2>
                        <Muted>Log in to manage your profile.</Muted>
                    </Card>
                ) : loading ? (
                    <Card elevated>
                        <Muted>Loading profile…</Muted>
                    </Card>
                ) : (
                    <>
                        <Card elevated style={{ gap: space.xs }}>
                            <H2>Account</H2>
                            <Text style={{ color: palette.text }}>Email: {session?.user?.email}</Text>
                            <Text style={{ color: palette.textMuted }}>User ID: {session?.user?.id}</Text>
                            {profile?.handle ? (
                                <Text style={{ color: palette.textMuted }}>Handle: @{profile.handle}</Text>
                            ) : null}
                            <Row>
                                <Pill>Authenticated</Pill>
                                <Pill>Supabase linked</Pill>
                            </Row>
                        </Card>

                        <Card style={{ gap: space.sm }}>
                            <H2>Handle</H2>
                            <Input
                                placeholder="e.g., tim_skates"
                                placeholderTextColor={palette.textMuted}
                                value={handle}
                                onChangeText={setHandle}
                            />
                            <Row style={{ justifyContent: "space-between" }}>
                                {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : <Muted>Used in submissions.</Muted>}
                                {saveMsg ? <Text style={styles.success}>{saveMsg}</Text> : null}
                            </Row>
                            <Button onPress={saveHandle} loading={saving}>
                                Save handle
                            </Button>
                        </Card>

                        <Card>
                            <H2>Session</H2>
                            <Muted>Signed in with Supabase auth.</Muted>
                            <Button kind="ghost" onPress={signOut}>
                                Sign out
                            </Button>
                        </Card>

                        <Card style={{ gap: space.sm }}>
                            <H2>My bounties</H2>
                            {activityLoading ? (
                                <Muted>Loading your bounties…</Muted>
                            ) : myBounties.length === 0 ? (
                                <Muted>You have not posted any bounties yet.</Muted>
                            ) : (
                                myBounties.slice(0, 5).map((b) => (
                                    <Card key={b.id} elevated style={styles.activityCard}>
                                        <Text style={styles.itemTitle}>{b.trick}</Text>
                                        <Row style={{ justifyContent: "space-between" }}>
                                            <Muted>{new Date(b.created_at).toLocaleString()}</Muted>
                                            <Pill>{b.status ?? "open"}</Pill>
                                        </Row>
                                        <Muted>Reward: {rewardLabel(b)}</Muted>
                                    </Card>
                                ))
                            )}
                            {myBounties.length > 5 ? (
                                <Muted>Showing latest 5 of {myBounties.length}.</Muted>
                            ) : null}
                        </Card>

                        <Card style={{ gap: space.sm }}>
                            <H2>My submissions</H2>
                            {activityLoading ? (
                                <Muted>Loading your submissions…</Muted>
                            ) : mySubmissions.length === 0 ? (
                                <Muted>Submit proof on a bounty to see it here.</Muted>
                            ) : (
                                mySubmissions.slice(0, 5).map((s) => (
                                    <Card key={s.id} elevated style={styles.activityCard}>
                                        <Text style={styles.itemTitle}>{s.media_url ?? "No link"}</Text>
                                        <Muted>
                                            Posted {s.external_posted_at ? new Date(s.external_posted_at).toLocaleString() : "—"}
                                        </Muted>
                                        <Row style={{ justifyContent: "space-between" }}>
                                            <Muted>Submitted {new Date(s.created_at).toLocaleString()}</Muted>
                                            <Pill>{(s.vote_count ?? 0) + " votes"}</Pill>
                                        </Row>
                                    </Card>
                                ))
                            )}
                            {mySubmissions.length > 5 ? (
                                <Muted>Showing latest 5 of {mySubmissions.length}.</Muted>
                            ) : null}
                        </Card>
                    </>
                )}
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    error: { color: palette.danger },
    success: { color: palette.primary },
    itemTitle: { color: palette.text, fontWeight: "700" },
    activityCard: { gap: space.xs },
});
