// app/(tabs)/profile.tsx
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette, space } from "../../constants/theme";
import { getMyProfile, Profile, upsertMyHandle } from "../../src/lib/profiles";
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

    useEffect(() => {
        if (!session) {
            setProfile(null);
            setHandle("");
            setLoading(false);
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

    return (
        <Screen>
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
                            {profile?.handle ? <Text style={{ color: palette.textMuted }}>Handle: @{profile.handle}</Text> : null}
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
                    </>
                )}
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    error: { color: palette.danger },
    success: { color: palette.primary },
});
