// app/(tabs)/profile.tsx
import React, { useEffect, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { getMyProfile, upsertMyHandle } from "../../src/lib/profiles";
import { useAuth } from "../../src/providers/AuthProvider";

export default function ProfileTab() {
    const { session, signOut } = useAuth();
    const [handle, setHandle] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!session) return;
        (async () => {
            setErrorMsg(null);
            setSaveMsg(null);
            setLoading(true);
            try {
                const p = await getMyProfile(session);
                setHandle(p?.handle ?? "");
            } catch (e: any) {
                console.log("Load profile error:", e);
                setErrorMsg(e?.message ?? "Failed to load profile. Did you create the 'profiles' table and refresh API schema?");
            } finally {
                setLoading(false);
            }
        })();
    }, [session]);

    const save = async () => {
        setErrorMsg(null);
        setSaveMsg(null);
        try {
            if (!session) {
                setErrorMsg("Not signed in.");
                return;
            }
            const trimmed = handle.trim();
            if (!trimmed) {
                setErrorMsg("Please enter a handle.");
                return;
            }
            if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) {
                setErrorMsg("Use 3–20 letters, numbers, or underscore.");
                return;
            }
            setSaving(true);
            await upsertMyHandle(session, trimmed);
            setSaveMsg("Saved.");
        } catch (e: any) {
            console.log("Save profile error:", e);
            setErrorMsg(e?.message ?? "Failed to save handle.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>My Profile</Text>

            {loading ? (
                <Text>Loading profile…</Text>
            ) : (
                <>
                    <Text>Email: {session?.user?.email}</Text>
                    <Text>User ID: {session?.user?.id}</Text>

                    <View style={{ height: 16 }} />

                    <Text style={{ fontWeight: "600" }}>Handle</Text>
                    <TextInput
                        placeholder="e.g., tim_skates"
                        value={handle}
                        onChangeText={setHandle}
                        autoCapitalize="none"
                        style={styles.input}
                    />

                    <Button title={saving ? "Saving..." : "Save"} onPress={save} disabled={saving} />

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
    container: { padding: 24, gap: 12, flex: 1 },
    title: { fontSize: 24, fontWeight: "700" },
    input: { borderWidth: 1, borderRadius: 8, padding: 12 },
    error: { color: "#b00020", marginTop: 8 },
    success: { color: "#0a7", marginTop: 8 },
});
