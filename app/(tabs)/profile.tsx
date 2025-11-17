// app/(tabs)/profile.tsx
import React, { useEffect, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { palette } from "../../constants/theme";
import { getMyProfile, Profile, upsertMyHandle } from "../../src/lib/profiles";
import { useAuth } from "../../src/providers/AuthProvider";

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
        <View style={styles.container}>
            <Text style={styles.title}>Profile</Text>

            {!session ? (
                <Text style={{ color: palette.textMuted }}>You are not signed in.</Text>
            ) : loading ? (
                <Text style={{ color: palette.textMuted }}>Loading profile…</Text>
            ) : (
                <>
                    <Text style={{ color: palette.text }}>Email: {session?.user?.email}</Text>
                    <Text style={{ color: palette.text }}>User ID: {session?.user?.id}</Text>
                    {profile?.handle ? (
                        <Text style={{ color: palette.textMuted }}>Current handle: {profile.handle}</Text>
                    ) : null}

                    <View style={{ height: 16 }} />

                    <Text style={{ fontWeight: "600", color: palette.text }}>Handle</Text>
                    <TextInput
                        placeholder="e.g., tim_skates"
                        placeholderTextColor={palette.textMuted}
                        value={handle}
                        onChangeText={setHandle}
                        style={styles.input}
                    />

                    <View style={{ height: 8 }} />

                    <Button title={saving ? "Saving…" : "Save"} onPress={saveHandle} disabled={saving} />

                    {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
                    {saveMsg ? <Text style={styles.success}>{saveMsg}</Text> : null}

                    <View style={{ height: 24 }} />
                    <Button title="Sign Out" onPress={signOut} />
                </>
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
    error: { color: palette.danger, marginTop: 8 },
    success: { color: palette.primary, marginTop: 8 },
});
